import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Brain, Layers, RotateCcw, Zap } from 'lucide-react';
import {
  createTieredRenderer,
  disposeSceneResources,
} from '../../engine/createTieredRenderer';
import type { LocaleCode } from '../../standards/clinicalStandards';
import {
  BisDisplaySmoother,
  computeMintoRemifentanilPk,
  computePropofolPk,
  SYNTHETIC_AVATARS,
  synthesizeEegSpectrum,
  ThreeCompartmentEngine,
  type CompartmentState,
  type PropofolModelId,
} from '../../physics/aivocEegKernel';

const DSA_COLS = 44; // time columns
const DSA_ROWS = 30; // 1..30 Hz

// French display text for the kernel's brain-state labels (keys must match aivocEegKernel output exactly;
// unknown labels fall back to the kernel's English text).
const BRAIN_STATE_FR: Record<string, string> = {
  AWAKE: 'ÉVEILLÉ',
  'BURST SUPPRESSION (Delirium Risk — Reduce Dose)': 'BURST SUPPRESSION (risque de delirium — réduire la dose)',
  'AWAKE & PARALYZED! (False-Low BIS Artifact from EMG Loss)': 'ÉVEILLÉ ET CURARISÉ ! (BIS faussement bas par perte de l’EMG)',
  'AWAKE (Beta / EMG Dominant)': 'ÉVEILLÉ (bêta / EMG prédominants)',
  'ALPHA DROPOUT (Untreated Nociception — Check Analgesia)': 'DISPARITION DE L’ALPHA (nociception non traitée — vérifier l’analgésie)',
  'SURGICAL GABAERGIC PLANE (Dual Slow-Delta + Frontal Alpha)': 'PLAN CHIRURGICAL GABAERGIQUE (ondes lentes-delta + alpha frontal)',
};

// French avatar descriptor by id; numbers are read from the avatar itself, never duplicated here.
const AVATAR_TAG_FR: Record<string, { who: string; tag: string }> = {
  'std-adult': { who: 'homme', tag: 'référence' },
  bariatric: { who: 'femme', tag: 'bariatrique' },
  elderly: { who: 'homme', tag: 'sujet âgé fragile' },
  pediatric: { who: 'enfant', tag: 'Eleveld pédiatrique' },
};

export function AivocEegModule({ locale }: { locale: LocaleCode }) {
  const fr = locale !== 'en-INT';
  const L = (f: string, e: string) => (fr ? f : e);
  const frRef = useRef(fr);
  frRef.current = fr;
  const brainStateText = (label: string) => (fr ? BRAIN_STATE_FR[label] ?? label : label);
  const avatarText = (av: (typeof SYNTHETIC_AVATARS)[number], idx: number) => {
    const t = AVATAR_TAG_FR[av.id];
    if (!fr || !t) return av.label;
    return `Avatar virtuel n° ${idx + 1} — ${av.ageYears} ans, ${av.weightKg} kg, ${av.heightCm} cm, ${t.who} (${t.tag})`;
  };
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [primaryModel, setPrimaryModel] = useState<PropofolModelId>('eleveld');
  const [ghostModel, setGhostModel] = useState<PropofolModelId>('schnider');
  const [targetCe, setTargetCe] = useState(3.2);
  const [remiCeTarget, setRemiCeTarget] = useState(3.5);
  const [tiltDeg, setTiltDeg] = useState(35); // 0° = 3D Mountain, 90° = Flat 2D DSA Heatmap
  const [viewMode, setViewMode] = useState<'dsa_3d' | 'compartments_synapse'>('dsa_3d');
  const [bisFilterOn, setBisFilterOn] = useState(false);
  const [nmbTrap, setNmbTrap] = useState(false);
  const [painDropout, setPainDropout] = useState(false);

  const [primState, setPrimState] = useState<CompartmentState | null>(null);
  const [ghostState, setGhostState] = useState<CompartmentState | null>(null);
  const [remiState, setRemiState] = useState<CompartmentState | null>(null);
  const [eegMeta, setEegMeta] = useState({ bis: 93, sr: 0, label: 'AWAKE' });

  const avatar = SYNTHETIC_AVATARS[avatarIdx];
  const primaryPk = useMemo(() => computePropofolPk(primaryModel, avatar), [primaryModel, avatar]);
  const ghostPk = useMemo(() => computePropofolPk(ghostModel, avatar), [ghostModel, avatar]);
  const remiPk = useMemo(() => computeMintoRemifentanilPk(avatar), [avatar]);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const rawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const primEngRef = useRef(new ThreeCompartmentEngine());
  const ghostEngRef = useRef(new ThreeCompartmentEngine());
  const remiEngRef = useRef(new ThreeCompartmentEngine());
  const bisSmootherRef = useRef(new BisDisplaySmoother());
  const rawBufRef = useRef<number[]>([]);
  const dsaGridRef = useRef<Float32Array[]>(
    Array.from({ length: DSA_COLS }, () => new Float32Array(DSA_ROWS))
  );

  // Refs synced to RAF loop
  const cfgRef = useRef({
    primaryPk,
    ghostPk,
    remiPk,
    targetCe,
    remiCeTarget,
    tiltDeg,
    viewMode,
    bisFilterOn,
    nmbTrap,
    painDropout,
    ageYears: avatar.ageYears,
  });
  cfgRef.current = {
    primaryPk,
    ghostPk,
    remiPk,
    targetCe,
    remiCeTarget,
    tiltDeg,
    viewMode,
    bisFilterOn,
    nmbTrap,
    painDropout,
    ageYears: avatar.ageYears,
  };

  useEffect(() => {
    if (!viewportRef.current) return;
    const container = viewportRef.current;
    const canvas = document.createElement('canvas');
    canvas.className = 'block w-full h-full outline-none';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b14');
    const camera = new THREE.PerspectiveCamera(42, 16 / 10, 0.1, 80);
    camera.position.set(0, 4.2, 6.2);

    let disposed = false;
    let rafId: number | null = null;
    let controls: OrbitControls | null = null;
    let handleDispose: (() => void) | null = null;
    let ro: ResizeObserver | null = null;

    // Group A: 3D-to-2D Unfolding DSA Terrain
    const dsaGroup = new THREE.Group();
    const terrainGeo = new THREE.PlaneGeometry(7.2, 4.4, DSA_COLS - 1, DSA_ROWS - 1);
    terrainGeo.rotateX(-Math.PI / 2);
    const vertCount = terrainGeo.attributes.position.count;
    const colors = new Float32Array(vertCount * 3);
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.45,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    dsaGroup.add(terrainMesh);
    scene.add(dsaGroup);

    // Group B: 3-Compartment Fluid Chambers + Cellular GABA_A Synapse
    const compGroup = new THREE.Group();
    const makeTank = (x: number, color: number, radius: number) => {
      const fill = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 2.2, 18),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35 })
      );
      fill.position.set(x, 0, -0.5);
      compGroup.add(fill);
      return fill;
    };
    const v1Tank = makeTank(-2.6, 0x38bdf8, 0.55);
    const v2Tank = makeTank(-1.1, 0x818cf8, 0.72);
    const v3Tank = makeTank(0.7, 0xa855f7, 0.9);
    const ceTank = makeTank(2.5, 0x34d399, 0.48);

    // Cellular GABA_A pentameric receptor ring + instanced Cl- ions flooding pore
    const receptorRing = new THREE.Group();
    receptorRing.position.set(0, -1.75, 1.35);
    const subMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.25 });
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const sub = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.55, 6, 10), subMat);
      sub.position.set(Math.cos(ang) * 0.38, 0, Math.sin(ang) * 0.38);
      receptorRing.add(sub);
    }
    compGroup.add(receptorRing);

    const clCount = 48;
    const clMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x34d399 }),
      clCount
    );
    compGroup.add(clMesh);
    scene.add(compGroup);

    createTieredRenderer(canvas).then((handle) => {
      if (disposed) {
        handle.dispose();
        return;
      }
      handleDispose = handle.dispose;
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.target.set(0, 0, 0);

      scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 1.1));
      const dir = new THREE.DirectionalLight(0xffffff, 1.1);
      dir.position.set(4, 8, 4);
      scene.add(dir);

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

      const dummy = new THREE.Object3D();
      let last = performance.now();
      let simTimeSec = 0;
      let uiAcc = 0;
      let dsaAcc = 0;

      const loop = () => {
        if (disposed) return;
        rafId = requestAnimationFrame(loop);
        const now = performance.now();
        const dtSec = Math.min((now - last) / 1000, 0.05);
        last = now;
        simTimeSec += dtSec;

        const c = cfgRef.current;
        // Advance PK 15x faster than wall clock so bolus/redistribution/elimination are immediately observable
        const dtMin = (dtSec / 60) * 15;
        const pSt = primEngRef.current.stepTci(c.primaryPk, c.targetCe, dtMin);
        const gSt = ghostEngRef.current.stepTci(c.ghostPk, c.targetCe, dtMin);
        const rSt = remiEngRef.current.stepTci(c.remiPk, c.remiCeTarget, dtMin);

        const eeg = synthesizeEegSpectrum({
          propofolCe: pSt.ce,
          ce50: c.primaryPk.ce50,
          ageYears: c.ageYears,
          nmbParalyzedAwakeTrap: c.nmbTrap,
          untreatedPain: c.painDropout,
          bis2HzFilterOn: c.bisFilterOn,
          timeSec: simTimeSec,
        });

        // Displayed BIS lags the raw index (smoothing in simulated seconds; PK runs at 15x)
        const shownBis = bisSmootherRef.current.update(eeg.displayedBisLag, dtSec * 15);

        rawBufRef.current.push(eeg.rawSampleUv);
        if (rawBufRef.current.length > 220) rawBufRef.current.shift();

        dsaAcc += dtSec;
        if (dsaAcc > 0.12) {
          dsaAcc = 0;
          dsaGridRef.current.shift();
          dsaGridRef.current.push(eeg.spectrum30Hz);
        }

        // Toggle visible 4D lens
        dsaGroup.visible = c.viewMode === 'dsa_3d';
        compGroup.visible = c.viewMode === 'compartments_synapse';

        if (dsaGroup.visible) {
          // Perspective tilt slider flattens 3D topographic mountain (0°) -> 2D top-down DSA heatmap (90°)
          const flatScale = 1 - c.tiltDeg / 90;
          const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
          const colAttr = terrainGeo.attributes.color as THREE.BufferAttribute;
          for (let r = 0; r < DSA_ROWS; r++) {
            for (let col = 0; col < DSA_COLS; col++) {
              const idx = r * DSA_COLS + col;
              const pwr = dsaGridRef.current[col][r];
              posAttr.setY(idx, pwr * 1.9 * flatScale);
              // Blue (low power) -> Cyan -> Yellow -> Crimson Red (high power)
              const red = Math.min(1, Math.max(0, (pwr - 0.35) * 1.7));
              const grn = Math.min(1, pwr < 0.5 ? pwr * 1.8 : (1 - pwr) * 1.9);
              const blu = Math.max(0.12, 1 - pwr * 1.25);
              colAttr.setXYZ(idx, red, grn, blu);
            }
          }
          posAttr.needsUpdate = true;
          colAttr.needsUpdate = true;
          terrainGeo.computeVertexNormals();
          dsaGroup.rotation.x = THREE.MathUtils.degToRad(c.tiltDeg * 0.92);
        } else {
          // Update 3-compartment fill heights & Cl- influx through GABA_A receptor pore
          const scaleTank = (mesh: THREE.Mesh, norm: number) => {
            const s = Math.max(0.08, Math.min(1.4, norm));
            mesh.scale.y = s;
            mesh.position.y = -0.8 + s * 0.9;
          };
          scaleTank(v1Tank, pSt.cp / 6);
          scaleTank(v2Tank, pSt.a2 / (c.primaryPk.v2 * 4));
          scaleTank(v3Tank, pSt.a3 / (c.primaryPk.v3 * 1.2));
          scaleTank(ceTank, pSt.ce / 5);

          const poreOpen = Math.min(1, pSt.ce / Math.max(1, c.primaryPk.ce50));
          receptorRing.scale.set(1 + poreOpen * 0.28, 1, 1 + poreOpen * 0.28);
          for (let i = 0; i < clCount; i++) {
            const phase = ((simTimeSec * (0.4 + poreOpen * 2.2) + i / clCount) % 1);
            const r = 0.08 + (i % 4) * 0.05;
            const ang = i * 1.3;
            dummy.position.set(
              Math.cos(ang) * r,
              -1.15 - phase * 1.25,
              1.35 + Math.sin(ang) * r
            );
            dummy.scale.setScalar(0.5 + poreOpen * 0.8);
            dummy.updateMatrix();
            clMesh.setMatrixAt(i, dummy.matrix);
          }
          clMesh.instanceMatrix.needsUpdate = true;
        }

        uiAcc += dtSec;
        if (uiAcc > 0.14) {
          uiAcc = 0;
          setPrimState(pSt);
          setGhostState(gSt);
          setRemiState(rSt);
          setEegMeta({
            bis: Math.round(shownBis),
            sr: eeg.suppressionRatioPct,
            label: eeg.trueBrainStateLabel,
          });
          drawRawEeg(rawCanvasRef.current, rawBufRef.current, frRef.current);
        }

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

  const resetAll = () => {
    primEngRef.current.reset();
    ghostEngRef.current.reset();
    remiEngRef.current.reset();
    bisSmootherRef.current.reset();
  };

  // Synthetic manual-pump educational schedule (strictly fictional avatar exercise)
  const manualBolusMg = Math.round(targetCe * primaryPk.v1 * 0.85);
  const manualRate10MlH = Math.round((primaryPk.k10 * primaryPk.v1 * targetCe * 60) / 10 * 1.25);
  const manualRate30MlH = Math.round((primaryPk.k10 * primaryPk.v1 * targetCe * 60) / 10 * 1.05);

  return (
    <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
      <section className="lg:col-span-8 flex flex-col gap-3">
        <div className="bg-[#070b14] border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-[#0b1220] border-b border-slate-800 flex flex-wrap justify-between items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setViewMode('dsa_3d')}
                className={`px-2.5 py-1 rounded-lg border cursor-pointer flex items-center gap-1 ${
                  viewMode === 'dsa_3d' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                <Brain className="w-3.5 h-3.5" /> {L('Spectrogramme DSA 3D→2D', '3D→2D DSA Spectrogram')}
              </button>
              <button
                onClick={() => setViewMode('compartments_synapse')}
                className={`px-2.5 py-1 rounded-lg border cursor-pointer flex items-center gap-1 ${
                  viewMode === 'compartments_synapse' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> {L('Compartiments 3D + synapse GABA_A', '3D Compartments + GABA_A Synapse')}
              </button>
            </div>

            {viewMode === 'dsa_3d' && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-300">{L('Relief 3D ↔ DSA 2D', '3D Mountain ↔ 2D DSA')}</span>
                <input
                  type="range"
                  min={0}
                  max={90}
                  value={tiltDeg}
                  onChange={(e) => setTiltDeg(Number(e.target.value))}
                  aria-label={L('Inclinaison : relief 3D ↔ DSA 2D', 'Tilt: 3D mountain ↔ 2D DSA')}
                  className="w-28"
                />
                <span className="font-mono text-cyan-300">{tiltDeg}°</span>
              </div>
            )}
          </div>

          <div ref={viewportRef} className="w-full h-[330px] sm:h-[370px] touch-none" />

          <div className="px-3 py-2 bg-[#0b1220] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-amber-300">{brainStateText(eegMeta.label)}</span>
            <span className="font-mono text-slate-300">
              {L('BIS traité (lissage 15 s, simulé) :', 'Processed BIS (15 s smoothing, simulated):')} <strong className="text-cyan-300">{eegMeta.bis}</strong> • {L('Rapport de suppression :', 'SR:')} <strong className="text-rose-300">{eegMeta.sr}%</strong>
            </span>
          </div>
        </div>

        {/* Raw Frontal EEG + Dual-Model Ghost Telemetry */}
        <div className="bg-[#060a12] border border-slate-800 rounded-xl p-3 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            <div className="bg-slate-900 rounded-lg p-2 border border-cyan-500/30">
              <div className="text-[10px] text-cyan-400">{L('Principal', 'Primary')} ({primaryModel.toUpperCase()})</div>
              <div className="font-bold text-white">
                Ce {primState ? primState.ce.toFixed(2) : '0.00'} µg/mL
              </div>
              <div className="text-[10px] text-slate-400">
                Cp {primState ? primState.cp.toFixed(2) : '0'} • {(primState ? primState.infusionRateMgMin * 6 : 0).toFixed(0)} mL/h
              </div>
            </div>
            <div className="bg-slate-900 rounded-lg p-2 border border-amber-500/30">
              <div className="text-[10px] text-amber-400">{L('Fantôme', 'Ghost')} ({ghostModel.toUpperCase()})</div>
              <div className="font-bold text-amber-200">
                Ce {ghostState ? ghostState.ce.toFixed(2) : '0.00'} µg/mL
              </div>
              <div className="text-[10px] text-slate-400">
                {L('Débit', 'Rate')} {(ghostState ? ghostState.infusionRateMgMin * 6 : 0).toFixed(0)} mL/h • {L('Masse maigre', 'LBM')} {ghostPk.lbmJames.toFixed(0)} kg
              </div>
            </div>
            <div className="bg-slate-900 rounded-lg p-2 border border-purple-500/30">
              <div className="text-[10px] text-purple-400">{L('Rémifentanil (Minto)', 'Remifentanil (Minto)')}</div>
              <div className="font-bold text-purple-200">
                Ce {remiState ? remiState.ce.toFixed(2) : '0.00'} ng/mL
              </div>
              <div className="text-[10px] text-slate-400">ke0 {remiPk.ke0.toFixed(2)} min⁻¹</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-2 border border-emerald-500/30">
              <div className="text-[10px] text-emerald-400">{L('Ce50 du modèle', 'Model Ce50')} ({primaryModel})</div>
              <div className="font-bold text-emerald-200">
                Ce50 = {primaryPk.ce50.toFixed(2)} µg/mL
              </div>
              <div className="text-[10px] text-slate-400">{L('À la Ce50, le BIS du modèle vaut 93 / 2 ≈ 47', 'At Ce50 the model BIS is 93 / 2 ≈ 47')}</div>
            </div>
          </div>

          <canvas
            ref={rawCanvasRef}
            className="w-full h-28 block rounded-lg bg-[#04070e]"
            aria-label={L('EEG frontal brut, monovoie (µV)', 'Single-channel raw frontal EEG (µV)')}
          />
        </div>
      </section>

      <aside className="lg:col-span-4 flex flex-col gap-3 text-xs">
        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2.5">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              {L('1. Avatar synthétique et comparateur fantôme', '1. Synthetic Avatar & Dual-Model Ghost')}
            </h2>
            <button onClick={resetAll} className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer">
              <RotateCcw className="w-3 h-3" /> {L('Réinitialiser', 'Reset')}
            </button>
          </div>

          <select
            value={avatarIdx}
            onChange={(e) => {
              setAvatarIdx(Number(e.target.value));
              resetAll();
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs"
          >
            {SYNTHETIC_AVATARS.map((av, idx) => (
              <option key={av.id} value={idx}>{avatarText(av, idx)}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-[10px] text-cyan-300">{L('Modèle pharmacocinétique principal', 'Primary Model')}</span>
              <select
                value={primaryModel}
                onChange={(e) => setPrimaryModel(e.target.value as PropofolModelId)}
                className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1"
              >
                <option value="eleveld">Eleveld (2018)</option>
                <option value="schnider">Schnider (1998)</option>
                <option value="marsh">Marsh (1991)</option>
              </select>
            </label>
            <label>
              <span className="text-[10px] text-amber-300">{L('Comparateur fantôme', 'Ghost Comparator')}</span>
              <select
                value={ghostModel}
                onChange={(e) => setGhostModel(e.target.value as PropofolModelId)}
                className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1"
              >
                <option value="schnider">Schnider (1998)</option>
                <option value="marsh">Marsh (1991)</option>
                <option value="eleveld">Eleveld (2018)</option>
              </select>
            </label>
          </div>

          <label className="block">
            <div className="flex justify-between text-[11px]">
              <span>{L('Propofol — Ce cible (AIVOC)', 'Propofol Target Ce')}</span>
              <span className="font-mono text-cyan-300">{targetCe.toFixed(1)} µg/mL</span>
            </div>
            <input type="range" min={0} max={7.5} step={0.1} value={targetCe}
              onChange={(e) => setTargetCe(parseFloat(e.target.value))} className="w-full" />
          </label>

          <label className="block">
            <div className="flex justify-between text-[11px]">
              <span>{L('Rémifentanil — Ce cible (Minto)', 'Remifentanil Target Ce (Minto)')}</span>
              <span className="font-mono text-purple-300">{remiCeTarget.toFixed(1)} ng/mL</span>
            </div>
            <input type="range" min={0} max={8} step={0.2} value={remiCeTarget}
              onChange={(e) => setRemiCeTarget(parseFloat(e.target.value))} className="w-full" />
          </label>
        </div>

        {/* EEG / BIS Pitfalls Interactive Toggles */}
        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> {L('2. Pièges de l’EEG brut et du BIS traité', '2. Raw EEG & Processed BIS Pitfalls')}
          </h2>
          <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
            <span>{L('Filtre d’affichage passe-haut 2 Hz (masque les ondes lentes — illustration)', '2 Hz high-pass display filter (hides slow waves — illustration)')}</span>
            <input type="checkbox" checked={bisFilterOn} onChange={(e) => setBisFilterOn(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
            <span>{L('Curarisation seule, patient éveillé (BIS descendu à 44–47 chez des volontaires)', 'NMB alone, patient awake (BIS fell to 44–47 in volunteers)')}</span>
            <input type="checkbox" checked={nmbTrap} onChange={(e) => { setNmbTrap(e.target.checked); if (e.target.checked) setTargetCe(0); }} />
          </label>
          <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
            <span>{L('Nociception non traitée (disparition de l’alpha)', 'Untreated Nociception (Alpha Dropout)')}</span>
            <input type="checkbox" checked={painDropout} onChange={(e) => setPainDropout(e.target.checked)} />
          </label>
        </div>

        {/* Educational Manual Syringe Pump Exercise (Non-TCI Hospitals) */}
        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            {L('3. Exercice au pousse-seringue manuel (avatar synthétique uniquement)', '3. Manual Pump Exercise (Synthetic Avatar Only)')}
          </h2>
          <p className="text-[10px] text-slate-400">
            {L(
              'Exercice pédagogique de paliers décroissants au pousse-seringue (10 mg/mL, avatar fictif uniquement) pour les sites sans AIVOC :',
              'Educational syringe-pump step-down exercise (10 mg/mL, fictional avatar only) for non-TCI sites:'
            )}
          </p>
          <div className="font-mono text-[11px] bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1 text-emerald-300">
            <div>{L('Bolus d’induction :', 'Induction Bolus:')} ~{manualBolusMg} mg ({(manualBolusMg / 10).toFixed(1)} mL)</div>
            <div>{L('Débit 0–10 min :', '0–10 min Rate:')} ~{manualRate10MlH} mL/h → 10–30 min{L(' :', ':')} ~{manualRate30MlH} mL/h</div>
            <div className="text-amber-300/90 text-[10px]">
              CL1: {ghostModel} {(ghostPk.k10 * ghostPk.v1).toFixed(2)} L/min vs {primaryModel} {(primaryPk.k10 * primaryPk.v1).toFixed(2)} L/min
            </div>
            <div className="text-slate-500 text-[10px]">
              {L(
                'Heuristique du simulateur dérivée de la clairance du modèle — pas un schéma posologique.',
                'Simulator heuristic from model clearance — not a dosing regimen.'
              )}
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}

function drawRawEeg(canvas: HTMLCanvasElement | null, buf: number[], fr: boolean) {
  if (!canvas || buf.length < 2) return;
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

  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  buf.forEach((uv, i) => {
    const x = (i / (buf.length - 1)) * w;
    const y = h / 2 - (uv / 85) * (h * 0.44);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 10px ui-monospace, monospace';
  ctx.fillText(fr ? 'EEG frontal brut, monovoie (µV)' : 'Single-Channel Raw Frontal EEG (µV)', 8, 13);
  ctx.restore();
}

