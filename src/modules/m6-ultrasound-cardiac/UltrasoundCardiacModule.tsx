import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Activity, AlertOctagon, HeartPulse, ScanLine } from 'lucide-react';
import { createTieredRenderer, disposeSceneResources } from '../../engine/createTieredRenderer';
import type { LocaleCode } from '../../standards/clinicalStandards';

type ValvePathology = 'normal' | 'as' | 'ar' | 'ms' | 'mr';

// Simulator teaching sequence (not an official society framework)
const BLOCK_STEPS = [
  '1. Prise en main de la sonde (Profondeur / Gain / Compression)',
  '2. Repérage anatomique 3D → 2D (Artère sous-clavière, 1ère côte, plèvre)',
  '3. Alignement aiguille dans le plan (évite la perte par anisotropie)',
  '4. Hydrodissection périnerveuse sans ponction vasculaire/pleurale',
  '5. Vérification sécurité & conduite LAST (Émulsion lipidique 20%)',
];

const SHOCK_MATRIX = [
  { type: 'Anaphylactic Distributive', firstLine: 'Epinephrine (stabilizes mast cells + vasopressor/inotrope)', color: 'text-rose-300' },
  { type: 'Septic Distributive', firstLine: 'IV Fluids + Norepinephrine → add Vasopressin', color: 'text-amber-300' },
  { type: 'Cardiogenic Shock', firstLine: 'Context-dependent Inotrope (assess LV/RV/valvular)', color: 'text-cyan-300' },
  { type: 'Hemorrhagic / Hypovolemic', firstLine: 'Stop the bleeding + blood products; vasopressor only as a short bridge', color: 'text-emerald-300' },
];

export function UltrasoundCardiacModule({ locale }: { locale: LocaleCode }) {
  const [subTab, setSubTab] = useState<'ultrasound' | 'cardiac'>('ultrasound');

  // Ultrasound probe & needle controls
  const [probeSlideX, setProbeSlideX] = useState(0); // -1.2 .. 1.2
  const [probeTiltDeg, setProbeTiltDeg] = useState(0); // -15 .. +15° (triggers needle anisotropy!)
  const [compression, setCompression] = useState(0); // 0..1 collapses vein, keeps artery pulsatile
  const [needleDepth, setNeedleDepth] = useState(0.55); // 0..1
  const [needleAngleDeg, setNeedleAngleDeg] = useState(28);
  const [laVolumeMl, setLaVolumeMl] = useState(0); // 0..20 mL hydrodissection
  const [showLabels2D, setShowLabels2D] = useState(true);
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  // Cardiac P-V Loop state
  const [valve, setValve] = useState<ValvePathology>('normal');
  const [preloadScale, setPreloadScale] = useState(1.0);
  const [afterloadScale, setAfterloadScale] = useState(1.0);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const usCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pvCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const usStateRef = useRef({ probeSlideX, probeTiltDeg, compression, needleDepth, needleAngleDeg, laVolumeMl, showLabels2D });
  usStateRef.current = { probeSlideX, probeTiltDeg, compression, needleDepth, needleAngleDeg, laVolumeMl, showLabels2D };

  // 3D Gross Anatomy + Synchronized 2D Procedural Ultrasound Slicer
  useEffect(() => {
    if (subTab !== 'ultrasound' || !viewportRef.current) return;
    const container = viewportRef.current;
    const canvas = document.createElement('canvas');
    canvas.className = 'block w-full h-full outline-none';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b14');
    const camera = new THREE.PerspectiveCamera(40, 16 / 10, 0.1, 60);
    camera.position.set(2.4, 2.2, 5.4);

    let disposed = false;
    let rafId: number | null = null;
    let controls: OrbitControls | null = null;
    let handleDispose: (() => void) | null = null;
    let ro: ResizeObserver | null = null;

    // Translucent skin block
    const skin = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 2.4, 3.0),
      new THREE.MeshStandardMaterial({ color: 0xfdba74, transparent: true, opacity: 0.14, depthWrite: false })
    );
    skin.position.set(0, -0.3, 0);
    scene.add(skin);

    // Subclavian Artery (red, pulsatile) & Vein (blue, compressible)
    const artery = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 3.6, 18),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
    );
    artery.rotation.x = Math.PI / 2;
    artery.position.set(-0.45, -0.25, 0);

    const vein = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.27, 3.6, 18),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.35 })
    );
    vein.rotation.x = Math.PI / 2;
    vein.position.set(-1.15, -0.1, 0);

    // Brachial Plexus Cluster ("bunch of grapes" lateral/superficial to artery)
    const plexusGroup = new THREE.Group();
    const nerveMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.35 });
    const nerveOffsets = [
      [0.35, -0.05],
      [0.62, -0.22],
      [0.42, -0.38],
      [0.82, -0.05],
      [0.72, -0.42],
    ];
    nerveOffsets.forEach(([nx, ny]) => {
      const nerve = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 3.6, 10), nerveMat);
      nerve.rotation.x = Math.PI / 2;
      nerve.position.set(nx, ny, 0);
      plexusGroup.add(nerve);
    });

    // First Rib (bone — casts dark acoustic shadow!) & Lung Pleura (danger zone!)
    const firstRib = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 3.6, 14),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 })
    );
    firstRib.rotation.x = Math.PI / 2;
    firstRib.position.set(0.1, -0.95, 0);

    const pleura = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 3.4),
      new THREE.MeshStandardMaterial({ color: 0xf472b6, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    pleura.rotation.x = -Math.PI / 2;
    pleura.position.set(0.3, -1.25, 0);

    // Hydrodissection Local Anesthetic Halo around Brachial Plexus
    const laHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 16, 14),
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.45, depthWrite: false })
    );
    laHalo.position.set(0.55, -0.22, 0);

    // Virtual Linear Ultrasound Probe + Glowing 2D Slice Plane
    const probeGroup = new THREE.Group();
    const probeBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.55, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.3 })
    );
    probeBody.position.y = 1.18;
    const beamPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 2.5),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
    );
    beamPlane.position.y = -0.32;
    probeGroup.add(probeBody, beamPlane);

    // Block Needle (lateral-to-medial in-plane entry)
    const needle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.85, roughness: 0.15 })
    );

    scene.add(artery, vein, plexusGroup, firstRib, pleura, laHalo, probeGroup, needle);

    createTieredRenderer(canvas).then((handle) => {
      if (disposed) {
        handle.dispose();
        return;
      }
      handleDispose = handle.dispose;
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.target.set(0, -0.2, 0);

      scene.add(new THREE.HemisphereLight(0xf0f9ff, 0x0f172a, 1.0));
      const key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(3, 6, 4);
      scene.add(key);

      const resize = () => {
        const w = Math.max(1, container.clientWidth);
        const h = Math.max(1, container.clientHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        handle.renderer.setSize(w, h, false);
      };
      resize();
      ro = new ResizeObserver(resize);
      ro.observe(container);

      const loop = () => {
        if (disposed) return;
        rafId = requestAnimationFrame(loop);
        const t = performance.now() * 0.001;
        const u = usStateRef.current;

        // Pulsatile artery vs compressible vein
        const pulse = 1 + Math.pow(Math.max(0, Math.sin(t * 6.5)), 6) * 0.14;
        artery.scale.set(pulse, 1, pulse);
        vein.scale.set(1 + u.compression * 0.25, 1, Math.max(0.15, 1 - u.compression * 0.82));
        pleura.position.y = -1.25 + Math.sin(t * 1.6) * 0.05;

        // Probe & Beam Plane
        probeGroup.position.set(u.probeSlideX, -u.compression * 0.14, 0);
        probeGroup.rotation.x = THREE.MathUtils.degToRad(u.probeTiltDeg);

        // Needle geometry from skin entry (x = 1.85, y = 0.82)
        const rad = THREE.MathUtils.degToRad(u.needleAngleDeg);
        const len = 0.6 + u.needleDepth * 2.1;
        const tipX = 1.85 - Math.cos(rad) * len;
        const tipY = 0.82 - Math.sin(rad) * len;
        needle.position.set((1.85 + tipX) / 2, (0.82 + tipY) / 2, 0);
        needle.rotation.z = rad - Math.PI / 2; // align cylinder Y axis with the entry→tip direction
        needle.scale.y = len / 2.4;

        // Hydrodissection local anesthetic halo
        const haloScale = Math.max(0.001, u.laVolumeMl / 20);
        laHalo.scale.set(haloScale * 1.4, haloScale * 0.9, haloScale * 1.2);

        // Collision safety alerts (Pleura pneumothorax or Subclavian Artery puncture)
        if (tipY <= -1.18) {
          setLastAlert('PLEURAL VIOLATION RISK (Pneumothorax) — Withdraw needle immediately!');
        } else if (Math.hypot(tipX - -0.45, tipY - -0.25) < 0.28) {
          setLastAlert('VASCULAR PUNCTURE ALERT (Subclavian Artery) — Risk of LAST if injected!');
        } else {
          setLastAlert(null);
        }

        render2DUltrasoundSlice(usCanvasRef.current, u, pulse, tipX, tipY);

        controls?.update();
        handle.renderer.render(scene, camera);
      };
      loop();
    });

    return () => {
      disposed = true;
      ro?.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
      controls?.dispose();
      disposeSceneResources(scene);
      handleDispose?.();
      canvas.remove();
    };
  }, [subTab]);

  // Draw Interactive Cardiac Valvular Pressure-Volume Loop
  useEffect(() => {
    if (subTab !== 'cardiac') return;
    drawValvularPvLoop(pvCanvasRef.current, valve, preloadScale, afterloadScale);
  }, [subTab, valve, preloadScale, afterloadScale]);

  return (
    <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab('ultrasound')}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
            subTab === 'ultrasound' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}
        >
          <ScanLine className="w-4 h-4" /> 3D→2D Sonoanatomy Slicer
        </button>
        <button
          onClick={() => setSubTab('cardiac')}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
            subTab === 'cardiac' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}
        >
          <HeartPulse className="w-4 h-4" /> Cardiac Valvular P–V Loops & Shock Pressors
        </button>
      </div>

      {subTab === 'ultrasound' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <section className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#070b14] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="px-3 py-2 bg-[#0b1220] border-b border-slate-800 text-xs font-bold text-cyan-300">
                3D Gross Anatomy (Supraclavicular Brachial Plexus)
              </div>
              <div ref={viewportRef} className="w-full h-[350px] touch-none" />
              {lastAlert && (
                <div className="px-3 py-1.5 bg-rose-950/90 border-t border-rose-500 text-[11px] font-bold text-rose-200 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                  {lastAlert}
                </div>
              )}
            </div>

            <div className="bg-[#04070d] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="px-3 py-2 bg-[#0b1220] border-b border-slate-800 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-100">Live 2D Ultrasound Plane (Linear 12 MHz)</span>
                <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={showLabels2D} onChange={(e) => setShowLabels2D(e.target.checked)} />
                  Labels
                </label>
              </div>
              <canvas ref={usCanvasRef} className="w-full h-[350px] block" />
              <div className="px-3 py-1.5 bg-[#0b1220] border-t border-slate-800 text-[10px] text-slate-400">
                Tip: Tilt probe &gt;4° to see needle anisotropy vanish on 2D while 3D reveals exact hidden tip depth!
              </div>
            </div>
          </section>

          <aside className="lg:col-span-4 flex flex-col gap-3 text-xs">
            <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Probe & Needle Controls (In-Plane)
              </h3>
              <label className="block">
                <div className="flex justify-between text-[11px]"><span>Probe Slide (Medial ↔ Lateral)</span><span className="font-mono">{probeSlideX.toFixed(2)}</span></div>
                <input type="range" min={-0.9} max={0.9} step={0.05} value={probeSlideX} onChange={(e) => setProbeSlideX(parseFloat(e.target.value))} className="w-full" />
              </label>
              <label className="block">
                <div className="flex justify-between text-[11px]"><span>Probe Tilt (Anisotropy)</span><span className="font-mono text-amber-300">{probeTiltDeg}°</span></div>
                <input type="range" min={-12} max={12} step={1} value={probeTiltDeg} onChange={(e) => setProbeTiltDeg(Number(e.target.value))} className="w-full" />
              </label>
              <label className="block">
                <div className="flex justify-between text-[11px]"><span>Probe Compression (Vein Check)</span><span className="font-mono">{Math.round(compression * 100)}%</span></div>
                <input type="range" min={0} max={1} step={0.05} value={compression} onChange={(e) => setCompression(parseFloat(e.target.value))} className="w-full" />
              </label>
              <label className="block">
                <div className="flex justify-between text-[11px]"><span>Needle Advance Depth</span><span className="font-mono text-cyan-300">{Math.round(needleDepth * 100)}%</span></div>
                <input type="range" min={0.1} max={1} step={0.02} value={needleDepth} onChange={(e) => setNeedleDepth(parseFloat(e.target.value))} className="w-full" />
              </label>
              <label className="block">
                <div className="flex justify-between text-[11px]"><span>Needle Steepness Angle</span><span className="font-mono">{needleAngleDeg}°</span></div>
                <input type="range" min={12} max={52} step={1} value={needleAngleDeg} onChange={(e) => setNeedleAngleDeg(Number(e.target.value))} className="w-full" />
              </label>
              <label className="block">
                <div className="flex justify-between text-[11px]"><span>Hydrodissection (Local Anesthetic)</span><span className="font-mono text-cyan-300">{laVolumeMl} mL</span></div>
                <input type="range" min={0} max={20} step={1} value={laVolumeMl} onChange={(e) => setLaVolumeMl(Number(e.target.value))} className="w-full" />
              </label>
            </div>

            <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                5-Step Block Sequence & LAST Rescue
              </h3>
              <ul className="space-y-1 text-[11px] text-slate-300">
                {BLOCK_STEPS.map((st) => <li key={st}>{st}</li>)}
              </ul>
              <div className="mt-2 p-2 rounded-lg bg-rose-950/50 border border-rose-500/30 text-[11px] text-rose-200">
                <strong>LAST (ASRA checklist):</strong> stop injecting, call for help, airway + 100% O2, seizure control, and <strong>20% lipid emulsion</strong>: &gt;70 kg → 100 mL bolus over 2–3 min then 200–250 mL over 15–20 min; ≤70 kg → 1.5 mL/kg (ideal body weight) over 2–3 min then ~0.25 mL/kg/min. Check the current checklist before use.
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <section className="lg:col-span-8 bg-[#060a12] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-rose-400" /> Left Ventricular Pressure–Volume Loop
              </h2>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {(['normal', 'as', 'ar', 'ms', 'mr'] as ValvePathology[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setValve(v)}
                    className={`px-2.5 py-1 rounded-lg border uppercase font-mono cursor-pointer ${
                      valve === v ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <canvas ref={pvCanvasRef} className="w-full h-[360px] block rounded-lg bg-[#04070e]" />
          </section>

          <aside className="lg:col-span-4 flex flex-col gap-3 text-xs">
            <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Hemodynamic Modulators</h3>
              <label className="block">
                <div className="flex justify-between"><span>Preload (EDV)</span><span className="font-mono">{preloadScale.toFixed(2)}x</span></div>
                <input type="range" min={0.65} max={1.35} step={0.05} value={preloadScale} onChange={(e) => setPreloadScale(parseFloat(e.target.value))} className="w-full" />
              </label>
              <label className="block">
                <div className="flex justify-between"><span>Afterload (SVR / Ea)</span><span className="font-mono">{afterloadScale.toFixed(2)}x</span></div>
                <input type="range" min={0.65} max={1.5} step={0.05} value={afterloadScale} onChange={(e) => setAfterloadScale(parseFloat(e.target.value))} className="w-full" />
              </label>
              <p className="text-[11px] text-slate-400">
                {locale.startsWith('fr')
                  ? 'Note : pour les coupes ETO/ETT standard, voir aussi la ressource gratuite Virtual TEE (U of T PIE).'
                  : 'Note: for standard TEE/TTE views, the free Virtual TEE resource (U of T PIE) complements this loop.'}
              </p>
            </div>

            <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Shock-Etiology Vasopressor Framework
              </h3>
              {SHOCK_MATRIX.map((row) => (
                <div key={row.type} className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className={`font-bold ${row.color}`}>{row.type}</div>
                  <div className="text-[11px] text-slate-300">{row.firstLine}</div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function render2DUltrasoundSlice(
  canvas: HTMLCanvasElement | null,
  u: { probeSlideX: number; probeTiltDeg: number; compression: number; needleDepth: number; needleAngleDeg: number; laVolumeMl: number; showLabels2D: boolean },
  pulse: number,
  tipX: number,
  tipY: number
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  ctx.save();
  ctx.scale(dpr, dpr);

  // Subtle acoustic speckle background
  ctx.fillStyle = '#12161d';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 420; i++) {
    const gx = ((i * 73) % 1000) / 1000 * w;
    const gy = ((i * 197) % 1000) / 1000 * h;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(200,210,225,0.06)' : 'rgba(0,0,0,0.18)';
    ctx.fillRect(gx, gy, 3, 2);
  }

  // Coordinate mapping relative to probe position
  const sx = (worldX: number) => w * 0.5 + (worldX - u.probeSlideX) * (w * 0.28);
  const sy = (worldY: number) => h * 0.14 + (0.95 - worldY) * (h * 0.34);

  // Anechoic Local Anesthetic hydrodissection spread (black fluid halo)
  if (u.laVolumeMl > 0) {
    ctx.fillStyle = 'rgba(2, 6, 12, 0.85)';
    ctx.beginPath();
    ctx.ellipse(sx(0.55), sy(-0.22), u.laVolumeMl * 2.4, u.laVolumeMl * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // First Rib bright hyperechoic cortex + dark acoustic shadow beneath
  const ribX = sx(0.1);
  const ribY = sy(-0.95);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
  ctx.fillRect(ribX - 24, ribY, 48, h - ribY);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(ribX, ribY + 8, 24, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Bright sliding Pleura line
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, sy(-1.25));
  ctx.lineTo(w, sy(-1.25));
  ctx.stroke();

  // Subclavian Artery (anechoic dark pulsatile circle with bright wall)
  ctx.fillStyle = '#030508';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx(-0.45), sy(-0.25), 22 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Vein (flattens under probe compression!)
  ctx.beginPath();
  ctx.ellipse(sx(-1.15), sy(-0.1), 24, Math.max(4, 22 * (1 - u.compression * 0.85)), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Brachial Plexus Honeycomb ("bunch of grapes": hypoechoic cores + hyperechoic epineurium)
  [
    [0.35, -0.05],
    [0.62, -0.22],
    [0.42, -0.38],
    [0.82, -0.05],
    [0.72, -0.42],
  ].forEach(([nx, ny]) => {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(sx(nx), sy(ny), 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // Needle Visibility (Anisotropy physics: fades sharply when probe tilt > 4°!)
  const tiltFade = Math.max(0.04, 1 - Math.abs(u.probeTiltDeg) / 5.5);
  ctx.strokeStyle = `rgba(255, 255, 255, ${tiltFade.toFixed(2)})`;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(sx(1.85), sy(0.82));
  ctx.lineTo(sx(tipX), sy(tipY));
  ctx.stroke();

  if (u.showLabels2D) {
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.fillStyle = '#f87171';
    ctx.fillText('Subclavian A.', sx(-0.45) - 34, sy(-0.25) - 27);
    ctx.fillStyle = '#60a5fa';
    ctx.fillText('Vein', sx(-1.15) - 12, sy(-0.1) - 24);
    ctx.fillStyle = '#fde047';
    ctx.fillText('Brachial Plexus', sx(0.55) - 34, sy(0.2));
    ctx.fillStyle = '#f472b6';
    ctx.fillText('Pleura (Danger)', 10, sy(-1.25) - 6);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('1st Rib Shadow', ribX - 36, ribY + 34);
  }
  ctx.restore();
}

function drawValvularPvLoop(
  canvas: HTMLCanvasElement | null,
  valve: ValvePathology,
  preload: number,
  afterload: number
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#04070e';
  ctx.fillRect(0, 0, w, h);

  const xOf = (volMl: number) => 44 + (volMl / 240) * (w - 64);
  const yOf = (pMmHg: number) => h - 34 - (pMmHg / 220) * (h - 56);

  // Axes
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(44, 18);
  ctx.lineTo(44, h - 34);
  ctx.lineTo(w - 16, h - 34);
  ctx.stroke();

  const buildLoop = (type: ValvePathology, pre: number, aft: number): [number, number][] => {
    let edv = 120 * pre;
    let esv = 50 * aft;
    let pSys = 120 * aft;
    let edp = 10 * pre;
    if (type === 'as') { pSys = 185 * aft; esv = 56 * aft; edv = 122 * pre; edp = 16; }
    if (type === 'ar') { edv = 195 * pre; esv = 65; pSys = 145 * aft; edp = 22; }
    if (type === 'ms') { edv = 85 * pre; esv = 40; pSys = 102 * aft; edp = 6; }
    if (type === 'mr') { edv = 165 * pre; esv = 38; pSys = 110 * aft; edp = 14; }

    const pts: [number, number][] = [];
    // Bottom filling curve (mitral open -> EDV)
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const v = esv + (edv - esv) * u;
      const p = 5 + (edp - 5) * Math.pow(u, 2.2);
      pts.push([v, p]);
    }
    // Right isovolumic contraction (MR loses strict isovolumic vertical edge as blood regurgitates into LA)
    for (let i = 1; i <= 10; i++) {
      const u = i / 10;
      const mrLeak = type === 'mr' ? -22 * u : 0;
      pts.push([edv + mrLeak, edp + (pSys * 0.72 - edp) * u]);
    }
    // Top systolic ejection dome
    for (let i = 1; i <= 14; i++) {
      const u = i / 14;
      const startV = type === 'mr' ? edv - 22 : edv;
      const v = startV - (startV - esv) * u;
      const dome = Math.sin(u * Math.PI) * (type === 'as' ? 42 : 24);
      pts.push([v, pSys * 0.75 + dome]);
    }
    // Left isovolumic relaxation (AR loses vertical edge as regurgitant flow refills LV immediately)
    for (let i = 1; i <= 10; i++) {
      const u = i / 10;
      const arRefill = type === 'ar' ? 28 * u : 0;
      pts.push([esv + arRefill, pSys * 0.72 * (1 - u) + 5 * u]);
    }
    return pts;
  };

  // Ghost normal loop reference
  const normPts = buildLoop('normal', 1, 1);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  normPts.forEach(([v, p], i) => (i === 0 ? ctx.moveTo(xOf(v), yOf(p)) : ctx.lineTo(xOf(v), yOf(p))));
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Active pathology loop
  const activePts = buildLoop(valve, preload, afterload);
  ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
  ctx.strokeStyle = '#fb7185';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  activePts.forEach(([v, p], i) => (i === 0 ? ctx.moveTo(xOf(v), yOf(p)) : ctx.lineTo(xOf(v), yOf(p))));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 11px ui-monospace, monospace';
  ctx.fillText('LV Pressure (mmHg)', 52, 24);
  ctx.fillText('LV Volume (mL)  [Dashed = Normal Baseline]', w - 275, h - 10);
  ctx.restore();
}

