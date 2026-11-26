import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AlertTriangle, Eye } from 'lucide-react';
import { createTieredRenderer, disposeSceneResources } from '../../engine/createTieredRenderer';
import type { LocaleCode } from '../../standards/clinicalStandards';

export function BronchoscopyDltModule({ locale }: { locale: LocaleCode }) {
  const [dltDepthCm, setDltDepthCm] = useState(29.0); // ideal ~29 cm
  const [scopeInsert, setScopeInsert] = useState(0.68); // 0 top trachea -> 1 carina/bronchus
  const [lateralRoll, setLateralRoll] = useState(false); // supine -> lateral decubitus shifts DLT!
  const [olvClamp, setOlvClamp] = useState<'BOTH' | 'LEFT_ONLY' | 'RIGHT_ONLY'>('LEFT_ONLY');

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stRef = useRef({ dltDepthCm, scopeInsert, lateralRoll, olvClamp });
  stRef.current = { dltDepthCm, scopeInsert, lateralRoll, olvClamp };

  // Simulator: lateral roll moves the DLT proximally by 1.5 cm (real displacement varies — value UNVERIFIED)
  const effectiveDepthCm = dltDepthCm - (lateralRoll ? 1.5 : 0);
  const status =
    effectiveDepthCm < 27.6
      ? { label: 'MALPOSITION: Blue Bronchial Cuff HERNIATING Across Carina! Advance DLT.', tone: 'text-rose-300 bg-rose-950/80 border-rose-500/40' }
      : effectiveDepthCm > 30.8
        ? { label: 'MALPOSITION: DLT Too Deep — Risk of Occluding Left Upper Lobe (LUL)! Withdraw.', tone: 'text-amber-300 bg-amber-950/80 border-amber-500/40' }
        : { label: 'OPTIMAL LEFT DLT POSITION: Blue Bronchial Cuff Rim Just Visible Below Carina in Left Mainstem (~5 cm).', tone: 'text-emerald-300 bg-emerald-950/70 border-emerald-500/40' };

  useEffect(() => {
    if (!viewportRef.current) return;
    const container = viewportRef.current;
    const canvas = document.createElement('canvas');
    canvas.className = 'block w-full h-full outline-none';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b14');

    const extCam = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    extCam.position.set(0, 0.3, 6.2);

    const scopeCam = new THREE.PerspectiveCamera(68, 1, 0.05, 25);
    const scopeLight = new THREE.PointLight(0xfffbeb, 2.2, 6);
    scopeCam.add(scopeLight);
    scene.add(scopeCam);

    let disposed = false;
    let rafId: number | null = null;
    let controls: OrbitControls | null = null;
    let handleDispose: (() => void) | null = null;
    let ro: ResizeObserver | null = null;

    // Translucent 3D Tracheobronchial Tree (DoubleSide so internal scope camera sees mucosa clearly!)
    const airwayMat = new THREE.MeshStandardMaterial({
      color: 0xfda4af,
      roughness: 0.45,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
    });

    const trachea = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.0, 20, 1, true), airwayMat);
    trachea.position.set(0, 1.35, 0);

    // Sharp Carina ridge at y = -0.15
    const carina = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.38, 0.78),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.35 })
    );
    carina.position.set(0, -0.22, 0);

    // Right Mainstem (short ~2.5 cm, steeper) + early Right Upper Lobe (RUL) take-off
    const rightMain = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.32, 1.35, 16, 1, true), airwayMat);
    rightMain.position.set(-0.52, -0.75, 0);
    rightMain.rotation.z = -0.45;
    const rulTakeoff = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.85, 12, 1, true), airwayMat);
    rulTakeoff.position.set(-0.98, -0.58, 0);
    rulTakeoff.rotation.z = Math.PI / 2;

    // Left Mainstem (long ~5.0 cm, more horizontal)
    const leftMain = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.28, 2.45, 16, 1, true), airwayMat);
    leftMain.position.set(0.85, -1.05, 0);
    leftMain.rotation.z = 0.72;

    // Left & Right Translucent Lungs (collapse selectively during OLV!)
    const leftLung = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 18, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25, depthWrite: false })
    );
    leftLung.position.set(1.75, -1.55, 0);

    const rightLung = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 18, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25, depthWrite: false })
    );
    rightLung.position.set(-1.65, -1.35, 0);

    // Left-Sided Double-Lumen Tube (DLT) + iconic bright BLUE bronchial cuff
    const dltGroup = new THREE.Group();
    const dltCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 2.8, 0),
      new THREE.Vector3(0, 0.15, 0),
      new THREE.Vector3(0.45, -0.58, 0),
      new THREE.Vector3(1.15, -1.25, 0),
    ]);
    const dltTube = new THREE.Mesh(
      new THREE.TubeGeometry(dltCurve, 28, 0.14, 10, false),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.55 })
    );
    const blueBronchialCuff = new THREE.Mesh(
      new THREE.SphereGeometry(0.31, 16, 14),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, emissive: 0x1d4ed8, emissiveIntensity: 0.55, transparent: true, opacity: 0.88 })
    );
    blueBronchialCuff.position.set(0.42, -0.58, 0);
    blueBronchialCuff.scale.set(1.0, 0.85, 1.0);
    dltGroup.add(dltTube, blueBronchialCuff);

    scene.add(trachea, carina, rightMain, rulTakeoff, leftMain, leftLung, rightLung, dltGroup);

    createTieredRenderer(canvas).then((handle) => {
      if (disposed) {
        handle.dispose();
        return;
      }
      handleDispose = handle.dispose;
      controls = new OrbitControls(cameraForControls(extCam), canvas);
      controls.enableDamping = true;
      controls.target.set(0, -0.25, 0);

      scene.add(new THREE.HemisphereLight(0xf8fafc, 0x0f172a, 1.0));
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(4, 5, 6);
      scene.add(key);

      const resize = () => {
        const w = Math.max(1, container.clientWidth);
        const h = Math.max(1, container.clientHeight);
        handle.renderer.setSize(w, h, false);
      };
      resize();
      ro = new ResizeObserver(resize);
      ro.observe(container);

      const loop = () => {
        if (disposed) return;
        rafId = requestAnimationFrame(loop);
        const t = performance.now() * 0.001;
        const s = stRef.current;

        // Shift DLT tube along axis based on depth + lateral roll migration
        const effDepth = s.dltDepthCm - (s.lateralRoll ? 1.5 : 0);
        const shiftY = (29.0 - effDepth) * 0.24;
        dltGroup.position.set(-shiftY * 0.35, shiftY, 0);

        // Selective One-Lung Ventilation (OLV) expansion vs collapse
        const breath = 1 + Math.sin(t * 2.1) * 0.14;
        const leftScale = s.olvClamp === 'RIGHT_ONLY' ? 0.58 : breath;
        const rightScale = s.olvClamp === 'LEFT_ONLY' ? 0.58 : breath;
        leftLung.scale.setScalar(leftScale);
        rightLung.scale.setScalar(rightScale);

        // Position internal first-person bronchoscope camera down the tracheal lumen looking at carina
        const scopeY = THREE.MathUtils.lerp(2.4, 0.28, s.scopeInsert);
        scopeCam.position.set(0, scopeY, 0.02);
        scopeCam.lookAt(0.14, -0.52, 0);

        // Render Split-Screen inside ONE WebGL Context using setScissor/setViewport (CSS px)
        const w = Math.max(2, container.clientWidth);
        const h = Math.max(2, container.clientHeight);
        const halfW = Math.floor(w / 2);

        handle.renderer.setScissorTest(true);

        // Left Half: External 3D Translucent Airway
        extCam.aspect = halfW / h;
        extCam.updateProjectionMatrix();
        handle.renderer.setViewport(0, 0, halfW, h);
        handle.renderer.setScissor(0, 0, halfW, h);
        controls?.update();
        handle.renderer.render(scene, extCam);

        // Right Half: Internal First-Person Bronchoscope Lens
        scopeCam.aspect = (w - halfW) / h;
        scopeCam.updateProjectionMatrix();
        handle.renderer.setViewport(halfW, 0, w - halfW, h);
        handle.renderer.setScissor(halfW, 0, w - halfW, h);
        handle.renderer.render(scene, scopeCam);

        handle.renderer.setScissorTest(false);
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
      <section className="lg:col-span-8 flex flex-col gap-3">
        <div className="bg-[#070b14] border border-slate-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-2 px-3 py-2 bg-[#0b1220] border-b border-slate-800 text-xs font-bold">
            <span className="text-cyan-300">
              {locale.startsWith('fr') ? 'Arbre Trachéo-Bronchique 3D (R 2,5 cm | L 5 cm)' : 'External 3D Airway (Right ~2.5 cm | Left ~5 cm)'}
            </span>
            <span className="text-amber-300 flex items-center gap-1.5 pl-3 border-l border-slate-700">
              <Eye className="w-3.5 h-3.5" /> First-Person Bronchoscope View (Tracheal Lumen)
            </span>
          </div>
          <div ref={viewportRef} className="w-full h-[380px] sm:h-[420px] touch-none" />
          <div className={`px-3 py-2 border-t text-xs font-semibold flex items-center gap-2 ${status.tone}`}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{status.label}</span>
          </div>
        </div>
      </section>

      <aside className="lg:col-span-4 flex flex-col gap-3 text-xs">
        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            1. DLT & Bronchoscope Controls
          </h2>
          <label className="block">
            <div className="flex justify-between"><span>Left DLT Depth (simulated 170 cm adult)</span><span className="font-mono text-cyan-300">{dltDepthCm.toFixed(1)} cm</span></div>
            <input type="range" min={25.5} max={32.5} step={0.2} value={dltDepthCm} onChange={(e) => setDltDepthCm(parseFloat(e.target.value))} className="w-full" />
          </label>
          <label className="block">
            <div className="flex justify-between"><span>Bronchoscope Insertion Depth</span><span className="font-mono text-amber-300">{Math.round(scopeInsert * 100)}%</span></div>
            <input type="range" min={0} max={1} step={0.02} value={scopeInsert} onChange={(e) => setScopeInsert(parseFloat(e.target.value))} className="w-full" />
          </label>
          <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer">
            <span>Roll patient supine → lateral decubitus (tube can move; simulated −1.5 cm)</span>
            <input type="checkbox" checked={lateralRoll} onChange={(e) => setLateralRoll(e.target.checked)} />
          </label>

          <div>
            <span className="text-[10px] text-slate-400 block mb-1">One-Lung Ventilation (OLV) Lumen Clamp</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['BOTH', 'LEFT_ONLY', 'RIGHT_ONLY'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setOlvClamp(mode)}
                  className={`py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                    olvClamp === mode ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                >
                  {mode === 'BOTH' ? 'Ventilate both' : mode === 'LEFT_ONLY' ? 'Ventilate L only' : 'Ventilate R only'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-300">
          <div className="font-bold text-cyan-300">Why Left-Sided DLTs Are Preferred</div>
          <p>
            The left mainstem bronchus averages ~4.5–5 cm before the left upper lobe take-off, providing a far wider margin of safety than the short right mainstem bronchus where the right upper lobe arises early near the carina. Always re-verify the blue bronchial cuff rim with a bronchoscope immediately after rolling into lateral decubitus.
          </p>
        </div>
      </aside>
    </main>
  );
}

function cameraForControls(cam: THREE.PerspectiveCamera): THREE.PerspectiveCamera {
  return cam;
}

