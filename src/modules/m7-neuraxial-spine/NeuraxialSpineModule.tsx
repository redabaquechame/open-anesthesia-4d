import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AlertTriangle, Crosshair } from 'lucide-react';
import { createTieredRenderer, disposeSceneResources } from '../../engine/createTieredRenderer';
import type { LocaleCode } from '../../standards/clinicalStandards';

type SpineRegion = 'thoracic' | 'lumbar';
type ApproachType = 'midline' | 'paramedian';
type CarmView = 'AP' | 'OBLIQUE_SCOTTY' | 'LATERAL';

export function NeuraxialSpineModule({ locale }: { locale: LocaleCode }) {
  const [region, setRegion] = useState<SpineRegion>('thoracic');
  const [approach, setApproach] = useState<ApproachType>('paramedian');
  const [flexion, setFlexion] = useState(0.5); // 0 neutral -> 1 "angry cat" flexed
  const [scoliosisDeg, setScoliosisDeg] = useState(0);
  const [needleDepthMm, setNeedleDepthMm] = useState(28); // 0..85 mm
  const [cephaladDeg, setCephaladDeg] = useState(42);
  const [carmView, setCarmView] = useState<CarmView>('LATERAL');

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const fluoroRef = useRef<HTMLCanvasElement | null>(null);
  const stRef = useRef({ region, approach, flexion, scoliosisDeg, needleDepthMm, cephaladDeg, carmView });
  stRef.current = { region, approach, flexion, scoliosisDeg, needleDepthMm, cephaladDeg, carmView };

  // Compute real-time tissue layer & Loss-of-Resistance (LOR) physics
  const flavumStartMm = region === 'thoracic' ? 46 - flexion * 4 : 44 - flexion * 3;
  const epiduralStartMm = flavumStartMm + 6;
  const duraMm = epiduralStartMm + 5.5;
  const hitBoneMidlineThoracic =
    region === 'thoracic' &&
    approach === 'midline' &&
    cephaladDeg < 46 &&
    needleDepthMm >= 34 &&
    flexion < 0.75;

  let tissueLayer = 'Subcutaneous Tissue / Muscle';
  let lorPressure = 18;
  let statusColor = 'text-slate-300';

  if (hitBoneMidlineThoracic) {
    tissueLayer = 'BONE CONTACT — Shingled Thoracic Spinous Process! Switch to Paramedian or Increase Cephalad Angle';
    lorPressure = 100;
    statusColor = 'text-amber-300';
  } else if (needleDepthMm < flavumStartMm) {
    tissueLayer = approach === 'midline' ? 'Interspinous Ligament (Moderate Resistance)' : 'Paraspinal Muscle (Low Resistance)';
    lorPressure = approach === 'midline' ? 42 : 24;
  } else if (needleDepthMm < epiduralStartMm) {
    tissueLayer = 'LIGAMENTUM FLAVUM — High Syringe Resistance (Engage LOR Technique)';
    lorPressure = 92;
    statusColor = 'text-cyan-300';
  } else if (needleDepthMm < duraMm) {
    tissueLayer = 'EPIDURAL SPACE — Sudden Loss of Resistance (LOR)! Stop & Thread Catheter';
    lorPressure = 6;
    statusColor = 'text-emerald-300';
  } else {
    tissueLayer = 'DURAL PUNCTURE ("WET TAP") — CSF Flashback in Subarachnoid Space!';
    lorPressure = 4;
    statusColor = 'text-rose-400';
  }

  useEffect(() => {
    if (!viewportRef.current) return;
    const container = viewportRef.current;
    const canvas = document.createElement('canvas');
    canvas.className = 'block w-full h-full outline-none';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b14');
    const camera = new THREE.PerspectiveCamera(42, 16 / 10, 0.1, 60);
    camera.position.set(4.5, 0.8, 3.8);

    let disposed = false;
    let rafId: number | null = null;
    let controls: OrbitControls | null = null;
    let handleDispose: (() => void) | null = null;
    let ro: ResizeObserver | null = null;

    const spineGroup = new THREE.Group();
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5, transparent: true, opacity: 0.72 });
    const vertebrae: { root: THREE.Group; spinous: THREE.Mesh }[] = [];

    for (let i = 0; i < 5; i++) {
      const vg = new THREE.Group();
      vg.position.y = (2 - i) * 1.1;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.72, 16), boneMat);
      body.position.set(0, 0, -0.75);
      const lamina = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 0.3), boneMat);
      lamina.position.set(0, 0, 0.35);
      const spinous = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 1.15), boneMat);
      spinous.position.set(0, -0.1, 0.92);
      vg.add(body, lamina, spinous);
      spineGroup.add(vg);
      vertebrae.push({ root: vg, spinous });
    }

    // Translucent Ligamentum Flavum (amber), Epidural Space (emerald), Spinal Cord/Dura (sky)
    const flavum = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 5.2, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.42 })
    );
    flavum.position.set(0, 0, 0.25);

    const duraCord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 5.4, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 })
    );
    duraCord.position.set(0, 0, -0.12);

    const tuohyNeedle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 3.2, 10),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.45 })
    );

    scene.add(spineGroup, flavum, duraCord, tuohyNeedle);

    createTieredRenderer(canvas).then((handle) => {
      if (disposed) {
        handle.dispose();
        return;
      }
      handleDispose = handle.dispose;
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;

      scene.add(new THREE.HemisphereLight(0xf1f5f9, 0x0f172a, 1.0));
      const key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(5, 6, 5);
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
        const s = stRef.current;

        // Morph spinous shingle angle (Thoracic ~58° downward vs Lumbar ~12°) + Flexion + Scoliosis
        const baseShingle = s.region === 'thoracic' ? 0.92 : 0.18;
        vertebrae.forEach((v, idx) => {
          const offset = idx - 2;
          v.root.position.y = -offset * (1.02 + s.flexion * 0.22);
          v.root.rotation.x = offset * s.flexion * 0.08;
          v.root.rotation.z = THREE.MathUtils.degToRad(s.scoliosisDeg * offset * 0.35);
          v.spinous.rotation.x = baseShingle - s.flexion * 0.16;
        });

        // Position Tuohy needle along Midline vs Paramedian ("walk off lamina") path
        const entryX = s.approach === 'paramedian' ? 0.36 : 0;
        const depthWorld = (s.needleDepthMm / 85) * 2.45;
        const rad = THREE.MathUtils.degToRad(s.cephaladDeg);
        const startZ = 2.15;
        const startY = -0.85;
        const tipZ = startZ - Math.cos(rad) * depthWorld;
        const tipY = startY + Math.sin(rad) * depthWorld;
        const tipX = s.approach === 'paramedian' ? entryX * (1 - depthWorld / 2.6) : 0;

        tuohyNeedle.position.set((entryX + tipX) / 2, (startY + tipY) / 2, (startZ + tipZ) / 2);
        tuohyNeedle.lookAt(tipX, tipY, tipZ);
        tuohyNeedle.rotateX(Math.PI / 2);
        // Geometry is 3.2 units long: scale it to the actual entry→tip distance
        const segLen = Math.hypot(entryX - tipX, startY - tipY, startZ - tipZ);
        tuohyNeedle.scale.set(1, Math.max(segLen, 0.01) / 3.2, 1);

        drawVirtualCarm(fluoroRef.current, s);
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
  }, []);

  return (
    <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
      <section className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-[#070b14] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-[#0b1220] border-b border-slate-800 text-xs font-bold text-cyan-300">
            {locale.startsWith('fr')
              ? 'Rachis 4D Transparent (Épineuses Thoraciques vs Lombaires)'
              : '4D Translucent Spine (Shingled Thoracic vs Lumbar Laminae)'}
          </div>
          <div ref={viewportRef} className="w-full h-[360px] touch-none" />
          <div className={`px-3 py-2 bg-slate-950 border-t border-slate-800 text-xs font-semibold ${statusColor}`}>
            {tissueLayer}
          </div>
        </div>

        <div className="bg-[#05070c] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-[#0b1220] border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-100 flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-400" /> Virtual C-Arm Fluoroscopy
            </span>
            <div className="flex gap-1">
              {(['AP', 'OBLIQUE_SCOTTY', 'LATERAL'] as CarmView[]).map((cv) => (
                <button
                  key={cv}
                  onClick={() => setCarmView(cv)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                    carmView === cv ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {cv === 'OBLIQUE_SCOTTY' ? 'Oblique' : cv}
                </button>
              ))}
            </div>
          </div>
          <canvas ref={fluoroRef} className="w-full h-[360px] block" />
          {/* Live LOR Syringe Resistance Gauge */}
          <div className="px-3 py-2 bg-[#0b1220] border-t border-slate-800 flex items-center gap-3 text-xs">
            <span className="font-mono text-[11px] text-slate-300 shrink-0">LOR Syringe Resistance:</span>
            <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all ${lorPressure > 80 ? 'bg-amber-400' : lorPressure < 12 ? 'bg-emerald-400' : 'bg-cyan-500'}`}
                style={{ width: `${lorPressure}%` }}
              />
            </div>
            <span className="font-mono text-[11px] w-10 text-right">{lorPressure}%</span>
          </div>
        </div>
      </section>

      <aside className="lg:col-span-4 flex flex-col gap-3 text-xs">
        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            1. Level, Approach & Posture Morphing
          </h2>
          <div className="grid grid-cols-2 gap-1.5">
            {(['thoracic', 'lumbar'] as SpineRegion[]).map((r) => (
              <button key={r} onClick={() => setRegion(r)} className={`py-1.5 rounded-lg border font-semibold cursor-pointer ${region === r ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
                {r === 'thoracic' ? 'Mid-Thoracic (T4–T8)' : 'Lumbar (L2–L5)'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(['midline', 'paramedian'] as ApproachType[]).map((a) => (
              <button key={a} onClick={() => setApproach(a)} className={`py-1.5 rounded-lg border font-semibold cursor-pointer ${approach === a ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
                {a === 'midline' ? 'Midline' : 'Paramedian (Lamina)'}
              </button>
            ))}
          </div>

          <label className="block">
            <div className="flex justify-between"><span>Patient Flexion ("Angry Cat")</span><span className="font-mono">{Math.round(flexion * 100)}%</span></div>
            <input type="range" min={0} max={1} step={0.05} value={flexion} onChange={(e) => setFlexion(parseFloat(e.target.value))} className="w-full" />
          </label>
          <label className="block">
            <div className="flex justify-between"><span>Scoliosis Curvature</span><span className="font-mono">{scoliosisDeg}°</span></div>
            <input type="range" min={-20} max={20} step={2} value={scoliosisDeg} onChange={(e) => setScoliosisDeg(Number(e.target.value))} className="w-full" />
          </label>
          <label className="block">
            <div className="flex justify-between"><span>Tuohy Needle Depth</span><span className="font-mono text-rose-300">{needleDepthMm} mm</span></div>
            <input type="range" min={5} max={75} step={1} value={needleDepthMm} onChange={(e) => setNeedleDepthMm(Number(e.target.value))} className="w-full" />
          </label>
          <label className="block">
            <div className="flex justify-between"><span>Cephalad Angulation</span><span className="font-mono text-cyan-300">{cephaladDeg}°</span></div>
            <input type="range" min={5} max={65} step={1} value={cephaladDeg} onChange={(e) => setCephaladDeg(Number(e.target.value))} className="w-full" />
          </label>
        </div>

        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-300">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Spatial Clinical Pearl
          </div>
          <p>
            Mid-thoracic spinous processes (T4–T8) shingle steeply downward, blocking shallow midline trajectories. Flexing the spine and entering 1 cm lateral (paramedian) lets the Tuohy needle "walk off" the superior border of the lamina straight into the ligamentum flavum.
          </p>
        </div>
      </aside>
    </main>
  );
}

function drawVirtualCarm(
  canvas: HTMLCanvasElement | null,
  s: { region: SpineRegion; approach: ApproachType; flexion: number; scoliosisDeg: number; needleDepthMm: number; cephaladDeg: number; carmView: CarmView }
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

  // Circular fluoroscopy intensifier vignette
  ctx.fillStyle = '#030509';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const rad = Math.min(w, h) * 0.44;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fillStyle = '#1b222c';
  ctx.fill();
  ctx.clip();

  ctx.strokeStyle = 'rgba(226, 232, 240, 0.72)';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.16)';
  ctx.lineWidth = 2;

  for (let i = -2; i <= 2; i++) {
    const vy = cy + i * (52 + s.flexion * 10);
    const vx = cx + (s.carmView === 'LATERAL' ? -35 : i * s.scoliosisDeg * 0.7);
    if (s.carmView === 'LATERAL') {
      ctx.fillRect(vx - 30, vy - 18, 56, 36);
      ctx.strokeRect(vx - 30, vy - 18, 56, 36);
      // Spinous process silhouette
      ctx.beginPath();
      ctx.moveTo(vx + 26, vy - 6);
      ctx.lineTo(vx + 82, vy + (s.region === 'thoracic' ? 32 : 6));
      ctx.stroke();
    } else {
      // AP or Oblique Scotty Dog projection
      ctx.fillRect(vx - 36, vy - 18, 72, 36);
      ctx.strokeRect(vx - 36, vy - 18, 72, 36);
      const pedOffset = s.carmView === 'OBLIQUE_SCOTTY' ? 14 : 24;
      ctx.beginPath();
      ctx.arc(vx - pedOffset, vy, 7, 0, Math.PI * 2);
      ctx.arc(vx + pedOffset, vy, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Radiopaque Tuohy needle projection
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  const nLen = (s.needleDepthMm / 85) * 115;
  const ang = THREE.MathUtils.degToRad(s.cephaladDeg);
  if (s.carmView === 'LATERAL') {
    ctx.beginPath();
    ctx.moveTo(cx + 115, cy + 45);
    ctx.lineTo(cx + 115 - Math.cos(ang) * nLen, cy + 45 - Math.sin(ang) * nLen);
    ctx.stroke();
  } else {
    const lat = s.approach === 'paramedian' ? 18 : 0;
    ctx.beginPath();
    ctx.moveTo(cx + lat, cy + 36);
    ctx.lineTo(cx + lat * 0.2, cy + 36 - nLen * 0.35);
    ctx.stroke();
  }

  ctx.fillStyle = '#fde047';
  ctx.font = '600 10px ui-monospace, monospace';
  ctx.fillText(`FLUORO: ${s.carmView} | ${s.region.toUpperCase()}`, cx - rad + 22, cy - rad + 28);
  ctx.restore();
}

