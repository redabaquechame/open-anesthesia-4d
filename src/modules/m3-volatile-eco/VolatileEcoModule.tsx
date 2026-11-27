import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Leaf, RotateCcw, AlertTriangle, FastForward } from 'lucide-react';
import {
  createGlassChassisMaterial,
  createTieredRenderer,
  disposeSceneResources,
} from '../../engine/createTieredRenderer';
import {
  GWP_STANDARDS,
  VOLATILE_AGENTS,
  type GwpStandardId,
  type LocaleCode,
  type VolatileAgentId,
} from '../../standards/clinicalStandards';
import {
  VolatileKineticsKernel,
  type VolatileParams,
  type VolatileState,
} from '../../physics/volatileKineticsKernel';

const DEFAULT_VOLATILE: VolatileParams = {
  agent: 'sevoflurane',
  misfillVaporizerAs: null,
  weightKg: 70,
  fgfLpm: 1.0,
  vaporizerDialPct: 2.4,
  n2oPct: 0,
  cardiacOutputScale: 1.0,
  ventilationScale: 1.0,
  rightToLeftShuntFrac: 0.0,
  o2ConcentratorMode: false,
  gwpStandard: 'IPCC_AR6',
};

// ILLUSTRATIVE prices only (not sourced, not current market prices) — they exist to show how cost
// scales with fresh gas flow. Agents without a figure show "n/a".
const LIQUID_COST_PER_ML: Partial<Record<VolatileAgentId, { EUR: number; MAD: number; CAD: number; FCFA: number }>> = {
  sevoflurane: { EUR: 0.42, MAD: 4.5, CAD: 0.62, FCFA: 275 },
  desflurane: { EUR: 0.72, MAD: 7.8, CAD: 1.05, FCFA: 470 },
  isoflurane: { EUR: 0.18, MAD: 1.9, CAD: 0.26, FCFA: 120 },
  halothane: { EUR: 0.09, MAD: 1.0, CAD: 0.14, FCFA: 60 },
};

// Display-only French names / labels (the standards data keeps its English names).
const AGENT_NAME_FR: Partial<Record<VolatileAgentId, string>> = { sevoflurane: 'Sévoflurane' };
const GWP_LABEL_FR: Partial<Record<GwpStandardId, string>> = {
  IPCC_AR6: 'GIEC AR6 (selon le règl. UE 2024/573)',
  SULBAEK_ANDERSEN_2012: 'Sulbaek Andersen 2012 + N₂O AR4',
};
const WARNING_FR: Record<string, string> = {
  VAPORIZER_MISFILL_HEATED_DESFLURANE_VAPORIZER_NOT_MODELLED:
    'Erreur de remplissage : évaporateur chauffé à desflurane non modélisé',
  HYPOXIC_LOW_FLOW_FIO2: 'FiO₂ hypoxique en bas débit',
  CONCENTRATOR_ARGON_BUILDUP_FGF_UNDER_1L: 'Concentrateur d’O₂ : accumulation d’argon (DGF < 1 L/min)',
  EU_2024_573_DESFLURANE_RESTRICTED_FROM_JAN_2026: 'Règl. UE 2024/573 : desflurane restreint à partir de janv. 2026',
  SLOW_WASHOUT_TISSUE_RESERVOIR: 'Élimination lente : relargage par les réserves tissulaires',
};

/** Kernel warnings are English codes; in French, show a translation (the code stays in the tooltip). */
function warningText(w: string, fr: boolean): string {
  if (!fr) return w;
  if (WARNING_FR[w]) return WARNING_FR[w];
  const m = /^VAPORIZER_MISFILL: (.+) in (.+) vaporizer delivers ~([\d.]+)% = ([\d.]+) MAC \(dial implies ([\d.]+) MAC\)$/.exec(w);
  if (m) {
    return `Erreur de remplissage de l’évaporateur : ${m[1]} dans un évaporateur à ${m[2]} → ~${m[3]} % = ${m[4]} CAM (graduation : ${m[5]} CAM)`;
  }
  return w;
}

export function VolatileEcoModule({ locale }: { locale: LocaleCode }) {
  const fr = locale !== 'en-INT';
  const L = (f: string, e: string) => (fr ? f : e);
  const frRef = useRef(fr);
  frRef.current = fr;
  const agentName = (a: VolatileAgentId) => (fr ? AGENT_NAME_FR[a] ?? VOLATILE_AGENTS[a].name : VOLATILE_AGENTS[a].name);

  const [params, setParams] = useState<VolatileParams>(DEFAULT_VOLATILE);
  const [currency, setCurrency] = useState<'MAD' | 'EUR' | 'CAD' | 'FCFA'>('MAD');
  const [timeScale, setTimeScale] = useState<number>(12); // 12x speed => 1 min simulated every 5 s
  const [state, setState] = useState<VolatileState | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const kernelRef = useRef(new VolatileKineticsKernel());
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const timeScaleRef = useRef(timeScale);
  timeScaleRef.current = timeScale;
  const historyRef = useRef<{ t: number; fd: number; fi: number; fa: number; brain: number; muscle: number }[]>([]);

  useEffect(() => {
    if (!viewportRef.current) return;
    const container = viewportRef.current;
    const canvas = document.createElement('canvas');
    canvas.className = 'block w-full h-full outline-none';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080d16');
    const camera = new THREE.PerspectiveCamera(40, 16 / 10, 0.1, 80);
    camera.position.set(0, 1.4, 7.6);

    let disposed = false;
    let rafId: number | null = null;
    let controls: OrbitControls | null = null;
    let handleDispose: (() => void) | null = null;

    // 9-compartment sculptural 3D body meshes
    const compMats: Record<string, THREE.MeshStandardMaterial> = {};
    const makeCompMat = (baseHex: number) =>
      new THREE.MeshStandardMaterial({
        color: baseHex,
        emissive: 0xfacc15,
        emissiveIntensity: 0.05,
        roughness: 0.35,
        transparent: true,
        opacity: 0.82,
      });

    let heartMesh: THREE.Mesh;
    let lungL: THREE.Mesh;
    let lungR: THREE.Mesh;
    let ro: ResizeObserver | null = null;

    createTieredRenderer(canvas).then((handle) => {
      if (disposed) {
        handle.dispose();
        return;
      }
      handleDispose = handle.dispose;
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.target.set(0, 0.2, 0);

      scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.95));
      const key = new THREE.DirectionalLight(0xffffff, 1.25);
      key.position.set(4, 6, 5);
      scene.add(key);

      // Translucent outer body silhouette (fat / subcutaneous envelope)
      const bodyGlass = createGlassChassisMaterial(handle.budget, 0.18);
      const torsoShell = new THREE.Mesh(new THREE.CapsuleGeometry(0.95, 1.8, 10, 20), bodyGlass);
      torsoShell.position.set(0, 0.1, 0);
      scene.add(torsoShell);

      // Brain (VRG)
      compMats.brain = makeCompMat(0x64748b);
      const brain = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 16), compMats.brain);
      brain.position.set(0, 2.05, 0);
      scene.add(brain);

      // Lungs & Circuit
      compMats.lungBlood = makeCompMat(0x475569);
      lungL = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), compMats.lungBlood);
      lungL.scale.set(0.8, 1.35, 0.8);
      lungL.position.set(-0.42, 0.78, 0.05);
      lungR = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), compMats.lungBlood);
      lungR.scale.set(0.8, 1.35, 0.8);
      lungR.position.set(0.42, 0.78, 0.05);
      scene.add(lungL, lungR);

      compMats.circuit = makeCompMat(0x38bdf8);
      const circuitLoop = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 10, 28), compMats.circuit);
      circuitLoop.position.set(-1.95, 1.15, 0);
      scene.add(circuitLoop);

      // Heart
      compMats.heart = makeCompMat(0x9f1239);
      heartMesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), compMats.heart);
      heartMesh.position.set(0.08, 0.72, 0.25);
      scene.add(heartMesh);

      // Liver & Kidneys
      compMats.liver = makeCompMat(0x7c2d12);
      const liver = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.34, 0.42), compMats.liver);
      liver.position.set(-0.24, 0.05, 0.1);
      compMats.kidney = makeCompMat(0x6b21a8);
      const kidL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.16, 6, 10), compMats.kidney);
      kidL.position.set(-0.34, -0.25, -0.22);
      const kidR = kidL.clone();
      kidR.position.x = 0.34;
      scene.add(liver, kidL, kidR);

      // Skeletal Muscle (limbs — source of post-extubation re-anesthetization!)
      compMats.muscle = makeCompMat(0x991b1b);
      const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 1.3, 8, 12), compMats.muscle);
      legL.position.set(-0.42, -1.65, 0);
      const legR = legL.clone();
      legR.position.x = 0.42;
      scene.add(legL, legR);

      // Fat Compartment (outer abdominal adipose ring — slow equilibration)
      compMats.fat = makeCompMat(0xa16207);
      const fatRing = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.14, 10, 24), compMats.fat);
      fatRing.rotation.x = Math.PI / 2;
      fatRing.position.set(0, -0.42, 0);
      scene.add(fatRing);

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

      let last = performance.now();
      let uiTick = 0;

      const loop = () => {
        if (disposed) return;
        rafId = requestAnimationFrame(loop);
        const now = performance.now();
        const dtSec = Math.min((now - last) / 1000, 0.05);
        last = now;

        const p = paramsRef.current;
        const st = kernelRef.current.step(p, (dtSec / 60) * timeScaleRef.current);
        const spec = VOLATILE_AGENTS[p.agent];
        const agentCol = new THREE.Color(spec.iso5360ColorHex);

        // Glow each compartment proportionally to partial pressure / MAC
        const setGlow = (key: string, valPct: number) => {
          const mat = compMats[key];
          if (!mat) return;
          const norm = Math.min(valPct / (spec.macPct * 1.4), 1);
          mat.emissive.copy(agentCol);
          mat.emissiveIntensity = 0.06 + norm * 1.15;
        };
        setGlow('circuit', st.compartments.circuit);
        setGlow('lungBlood', st.compartments.lungBlood);
        setGlow('heart', st.compartments.heart);
        setGlow('brain', st.compartments.brain);
        setGlow('liver', st.compartments.liver);
        setGlow('kidney', st.compartments.kidney);
        setGlow('muscle', st.compartments.muscle);
        setGlow('fat', st.compartments.fat);

        // Animate heartbeat & breathing proportional to CO and Ventilation
        const beat = 1 + Math.sin(now * 0.007 * p.cardiacOutputScale) * 0.09;
        heartMesh.scale.setScalar(beat);
        const breath = 1 + Math.sin(now * 0.0022 * p.ventilationScale) * 0.08;
        lungL.scale.set(0.8 * breath, 1.35 * breath, 0.8 * breath);
        lungR.scale.set(0.8 * breath, 1.35 * breath, 0.8 * breath);

        uiTick += dtSec;
        if (uiTick > 0.12) {
          uiTick = 0;
          setState(st);
          const hist = historyRef.current;
          hist.push({
            t: st.timeMin,
            fd: st.fdPct,
            fi: st.fiPct,
            fa: st.faPct,
            brain: st.compartments.brain,
            muscle: st.compartments.muscle,
          });
          if (hist.length > 200) hist.shift();
          drawKineticsChart(chartRef.current, hist, spec.macPct, spec.iso5360ColorHex, frRef.current);
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

  const resetSim = (nextParams?: VolatileParams) => {
    kernelRef.current.reset();
    historyRef.current = [];
    if (nextParams) setParams(nextParams);
  };

  const unitCost = LIQUID_COST_PER_ML[params.agent];
  const estCost = unitCost ? (state?.liquidMlConsumed ?? 0) * unitCost[currency] : null;

  return (
    <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
      <section className="lg:col-span-8 flex flex-col gap-3">
        <div className="bg-oa-canvas border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-oa-surface2 border-b border-slate-800 flex flex-wrap justify-between items-center gap-2 text-xs">
            <span className="font-bold text-cyan-300">
              {L(
                'Captation et distribution multi-compartiments (modèle du simulateur, échelle W^0,75)',
                'Multi-compartment uptake & distribution (simulator model, W^0.75 scaling)'
              )}
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <FastForward className="w-3.5 h-3.5 text-amber-400" />
              {[4, 12, 30].map((s) => (
                <button
                  key={s}
                  onClick={() => setTimeScale(s)}
                  title={L(`Vitesse de simulation ×${s}`, `Simulation speed ×${s}`)}
                  className={`px-2 py-0.5 rounded border cursor-pointer ${
                    timeScale === s ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {s}x
                </button>
              ))}
              <button
                onClick={() => resetSim()}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> {L('Réinitialiser', 'Reset')}
              </button>
            </div>
          </div>

          <div ref={viewportRef} className="w-full h-[340px] sm:h-[390px] touch-none" />

          {/* Warnings Ribbon */}
          {state && state.warnings.length > 0 && (
            <div className="px-3 py-1.5 bg-rose-950/80 border-t border-rose-500/40 flex flex-wrap gap-1.5 items-center text-[11px] text-rose-100">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              {state.warnings.map((w) => (
                <span key={w} title={w} className="font-mono px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-400/30">
                  {warningText(w, fr)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Kinetics Plot & Live Climate Footprint Strip */}
        <div className="bg-oa-canvas border border-slate-800 rounded-xl p-3 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
            <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">
              <div className="text-[10px] text-slate-400">FD / FI / FA</div>
              <div className="font-bold text-yellow-300">
                {state ? `${state.fdPct.toFixed(1)} / ${state.fiPct.toFixed(1)} / ${state.faPct.toFixed(1)}%` : '--'}
              </div>
            </div>
            <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">
              <div className="text-[10px] text-slate-400">{L('CAM cérébrale / muscle', 'Brain MAC / Muscle')}</div>
              <div className="font-bold text-cyan-300">
                {state ? `${state.macBrain.toFixed(2)} ${L('CAM', 'MAC')}` : '--'}
                <span className="text-[10px] text-rose-300 ml-1">
                  (M:{state ? state.compartments.muscle.toFixed(2) : 0}%)
                </span>
              </div>
            </div>
            <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">
              <div className="text-[10px] text-slate-400">{L('FiO₂ / argon', 'FiO2 / Argon')}</div>
              <div className="font-bold text-sky-300">
                {state ? `${Math.round(state.circuitFiO2Pct)}%` : '--'}
                <span className="text-purple-300 text-[10px] ml-1">Ar:{state ? state.argonPct.toFixed(1) : 0}%</span>
              </div>
            </div>
            <div className="bg-slate-900 rounded-lg p-2 border border-emerald-500/30">
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <Leaf className="w-3 h-3" /> {L('Empreinte CO₂e', 'Climate CO2e')}
              </div>
              <div className="font-bold text-emerald-300">
                {state ? `${state.co2eKgCumulative.toFixed(2)} kg` : '--'}
                <span className="text-[10px] text-slate-400 ml-1">({state ? state.co2eKgPerHour.toFixed(1) : 0}/h)</span>
              </div>
              {state && !state.agentGwpAvailable && (
                <div className="text-[9px] text-amber-300">
                  {L(
                    `Pas de PRG pour le ${agentName(params.agent).toLowerCase()} dans cette source — N₂O seul`,
                    `No ${VOLATILE_AGENTS[params.agent].name} GWP in this source — N2O only`
                  )}
                </div>
              )}
              {GWP_STANDARDS[params.gwpStandard].unverified && (
                <div className="text-[9px] text-slate-500">{L('Valeurs de PRG non vérifiées', 'GWP values unverified')}</div>
              )}
            </div>
            <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">
              <div className="text-[10px] text-slate-400">{L('Coût illustratif', 'Illustrative cost')} ({currency})</div>
              <div className="font-bold text-amber-300">
                {estCost === null ? L('n.d.', 'n/a') : `${estCost.toFixed(1)} ${currency}`}
                <span className="text-[10px] text-slate-400 ml-1">({state ? state.liquidMlConsumed.toFixed(1) : 0} mL)</span>
              </div>
            </div>
          </div>

          <canvas ref={chartRef} className="w-full h-44 block rounded-lg bg-oa-canvas" />
        </div>
      </section>

      <aside className="lg:col-span-4 flex flex-col gap-3 text-xs">
        <div className="bg-oa-surface border border-slate-800 rounded-xl p-3 space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            {L('1. Halogéné, climat et coût', '1. Volatile Agent, Climate & Cost Controls')}
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-[10px] text-slate-400">{L('Halogéné (ISO 5360)', 'Agent (ISO 5360)')}</span>
              <select
                value={params.agent}
                onChange={(e) => {
                  const ag = e.target.value as VolatileAgentId;
                  setParams((p) => ({
                    ...p,
                    agent: ag,
                    misfillVaporizerAs: null,
                    vaporizerDialPct: ag === 'desflurane' ? 6.0 : ag === 'halothane' ? 1.0 : 2.2,
                  }));
                }}
                className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5"
              >
                {(Object.keys(VOLATILE_AGENTS) as VolatileAgentId[]).map((a) => (
                  <option key={a} value={a}>{agentName(a)}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-[10px] text-slate-400">{L('Référentiel PRG100', 'GWP100 Standard')}</span>
              <select
                value={params.gwpStandard}
                onChange={(e) => setParams((p) => ({ ...p, gwpStandard: e.target.value as GwpStandardId }))}
                className="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5"
              >
                {(Object.keys(GWP_STANDARDS) as GwpStandardId[]).map((g) => (
                  <option key={g} value={g}>{fr ? GWP_LABEL_FR[g] ?? GWP_STANDARDS[g].label : GWP_STANDARDS[g].label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between bg-slate-900 rounded-lg px-2.5 py-1.5 border border-slate-800">
            <span className="text-[11px] text-slate-300">{L('Devise affichée', 'Currency Display')}</span>
            <div className="flex gap-1">
              {(['MAD', 'EUR', 'CAD', 'FCFA'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                    currency === c ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block">
              <div className="flex justify-between text-[11px]">
                <span>{L('Débit de gaz frais (DGF)', 'Fresh Gas Flow (FGF)')}</span>
                <span className="font-mono text-cyan-300">{params.fgfLpm.toFixed(2)} L/min</span>
              </div>
              <input type="range" min={0.25} max={8} step={0.05} value={params.fgfLpm}
                onChange={(e) => setParams((p) => ({ ...p, fgfLpm: parseFloat(e.target.value) }))} className="w-full" />
            </label>
            <label className="block">
              <div className="flex justify-between text-[11px]">
                <span>{L('Graduation de l’évaporateur (FD)', 'Vaporizer Dial (FD)')}</span>
                <span className="font-mono text-yellow-300">{params.vaporizerDialPct.toFixed(1)}%</span>
              </div>
              <input type="range" min={0} max={params.agent === 'desflurane' ? 18 : 8} step={0.2} value={params.vaporizerDialPct}
                onChange={(e) => setParams((p) => ({ ...p, vaporizerDialPct: parseFloat(e.target.value) }))} className="w-full" />
            </label>
            <label className="block">
              <div className="flex justify-between text-[11px]">
                <span>{L('N₂O associé (effet second gaz)', 'N2O Co-Gas (Second Gas Effect)')}</span>
                <span className="font-mono text-blue-300">{params.n2oPct}%</span>
              </div>
              <input type="range" min={0} max={70} step={5} value={params.n2oPct}
                onChange={(e) => setParams((p) => ({ ...p, n2oPct: parseFloat(e.target.value) }))} className="w-full" />
            </label>
            <label className="block">
              <div className="flex justify-between text-[11px]">
                <span>{L('Shunt droit-gauche', 'Right-to-Left Cardiac Shunt')}</span>
                <span className="font-mono text-rose-300">{Math.round(params.rightToLeftShuntFrac * 100)}%</span>
              </div>
              <input type="range" min={0} max={0.45} step={0.05} value={params.rightToLeftShuntFrac}
                onChange={(e) => setParams((p) => ({ ...p, rightToLeftShuntFrac: parseFloat(e.target.value) }))} className="w-full" />
            </label>
            <label className="block">
              <div className="flex justify-between text-[11px]">
                <span>{L('Débit cardiaque / ventilation', 'Cardiac Output / Ventilation')}</span>
                <span className="font-mono text-slate-300">
                  {L('DC', 'CO')} {params.cardiacOutputScale.toFixed(1)}x • VA {params.ventilationScale.toFixed(1)}x
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="range" min={0.5} max={1.8} step={0.1} value={params.cardiacOutputScale}
                  aria-label={L('Débit cardiaque', 'Cardiac output')}
                  onChange={(e) => setParams((p) => ({ ...p, cardiacOutputScale: parseFloat(e.target.value) }))} />
                <input type="range" min={0.3} max={1.8} step={0.1} value={params.ventilationScale}
                  aria-label={L('Ventilation alvéolaire', 'Alveolar ventilation')}
                  onChange={(e) => setParams((p) => ({ ...p, ventilationScale: parseFloat(e.target.value) }))} />
              </div>
            </label>
          </div>
        </div>

        {/* High-Yield Clinical & Africa Transition Scenarios */}
        <div className="bg-oa-surface border border-slate-800 rounded-xl p-3 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            {L('2. Scénarios pédagogiques', '2. Teaching Presets')}
          </h2>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              onClick={() => resetSim({ ...DEFAULT_VOLATILE, agent: 'sevoflurane', fgfLpm: 0.6, vaporizerDialPct: 2.6 })}
              className="text-left px-2.5 py-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-400 cursor-pointer"
            >
              <div className="font-semibold text-emerald-200">
                {L('Sévoflurane en bas débit écoresponsable (0,6 L/min, sans N₂O)', 'Eco Low-Flow Sevoflurane (0.6 L/min, No N2O)')}
              </div>
              <div className="text-[10px] text-slate-400">
                {L(
                  'Observez la baisse du CO₂e et de la consommation de liquide par rapport au haut débit',
                  'Watch CO2e and liquid use fall compared with high flow'
                )}
              </div>
            </button>
            <button
              onClick={() => resetSim({ ...DEFAULT_VOLATILE, agent: 'desflurane', fgfLpm: 2.0, vaporizerDialPct: 6.5 })}
              className="text-left px-2.5 py-2 rounded-lg bg-rose-950/40 border border-rose-500/30 hover:border-rose-400 cursor-pointer"
            >
              <div className="font-semibold text-rose-200">
                {L(
                  'Impact climatique du desflurane (restreint dans l’UE à partir de janv. 2026)',
                  'Desflurane Climate Impact (EU-restricted from Jan 2026)'
                )}
              </div>
              <div className="text-[10px] text-slate-400">
                {L(
                  'Règl. UE 2024/573 : uniquement si strictement nécessaire pour raisons médicales. PRG100 AR6 ≈ 2 590 → ≈ 910 kg CO₂e par flacon de 240 mL (non vérifié)',
                  'EU 2024/573: only when strictly required on medical grounds. AR6 GWP100 ≈ 2,590 → ≈ 910 kg CO2e per 240 mL bottle (unverified)'
                )}
              </div>
            </button>
            <button
              onClick={() => resetSim({ ...DEFAULT_VOLATILE, agent: 'sevoflurane', weightKg: 15, fgfLpm: 4.5, vaporizerDialPct: 6.0, o2ConcentratorMode: true })}
              className="text-left px-2.5 py-2 rounded-lg bg-amber-950/40 border border-amber-500/30 hover:border-amber-400 cursor-pointer"
            >
              <div className="font-semibold text-amber-200">
                {L('Induction pédiatrique au sévoflurane sur concentrateur d’O₂', 'Paediatric Sevoflurane Induction on an O2 Concentrator')}
              </div>
              <div className="text-[10px] text-slate-400">
                {L(
                  'Enfant de 15 kg, wash-in à 4,5 L/min ; puis baissez le DGF et observez l’accumulation d’argon',
                  '15 kg child, 4.5 L/min wash-in; then lower FGF and watch argon build up'
                )}
              </div>
            </button>
            <button
              onClick={() => resetSim({ ...DEFAULT_VOLATILE, agent: 'halothane', misfillVaporizerAs: 'isoflurane', fgfLpm: 2.0, vaporizerDialPct: 2.0 })}
              className="text-left px-2.5 py-2 rounded-lg bg-purple-950/40 border border-purple-500/30 hover:border-purple-400 cursor-pointer"
            >
              <div className="font-semibold text-purple-200">
                {L(
                  'Erreur de remplissage de l’évaporateur (halothane dans un évaporateur à isoflurane)',
                  'Vaporizer Misfill Hazard (Halothane in Isoflurane)'
                )}
              </div>
              <div className="text-[10px] text-slate-400">
                {L(
                  'PVS voisines (243 vs 238 mmHg) : % délivré voisin, mais l’halothane est plus puissant (CAM 0,76 vs 1,15)',
                  'Similar SVP (243 vs 238 mmHg) gives a similar % but halothane is more potent (MAC 0.76 vs 1.15)'
                )}
              </div>
            </button>
            <button
              onClick={() => setParams((p) => ({ ...p, vaporizerDialPct: 0, fgfLpm: 1.5, ventilationScale: 0.35 }))}
              className="text-left px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 cursor-pointer"
            >
              <div className="font-semibold text-cyan-200">
                {L('Réveil avec hypoventilation (élimination lente)', 'Emergence With Hypoventilation (Slow Washout)')}
              </div>
              <div className="text-[10px] text-slate-400">
                {L(
                  'Évaporateur fermé, VA 0,35x après 15 min ou plus : les réserves tissulaires relarguent l’agent et ralentissent l’élimination cérébrale',
                  'Vaporizer off, VA 0.35x after 15+ min: tissue stores return agent and slow brain washout'
                )}
              </div>
            </button>
          </div>
        </div>
      </aside>
    </main>
  );
}

function drawKineticsChart(
  canvas: HTMLCanvasElement | null,
  hist: { t: number; fd: number; fi: number; fa: number; brain: number; muscle: number }[],
  macPct: number,
  agentHex: string,
  fr: boolean
) {
  if (!canvas || hist.length < 2) return;
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
  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, w, h);

  const maxVal = Math.max(macPct * 2.5, ...hist.map((d) => Math.max(d.fd, d.fa, d.brain, 1)));
  const yOf = (v: number) => h - 18 - (v / maxVal) * (h - 32);
  const xOf = (i: number) => 8 + (i / (hist.length - 1)) * (w - 16);

  // 1 MAC reference line
  ctx.strokeStyle = '#334155';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, yOf(macPct));
  ctx.lineTo(w, yOf(macPct));
  ctx.stroke();
  ctx.setLineDash([]);

  const plotLine = (key: 'fd' | 'fi' | 'fa' | 'brain' | 'muscle', color: string, width = 1.8) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    hist.forEach((pt, idx) => {
      const x = xOf(idx);
      const y = yOf(pt[key]);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  plotLine('fd', '#64748b', 1.2);
  plotLine('fi', agentHex, 1.5);
  plotLine('fa', '#38bdf8', 2.0);
  plotLine('brain', '#34d399', 2.2);
  plotLine('muscle', '#fb7185', 1.6);

  ctx.font = '600 10px ui-monospace, monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('FD', 10, 13);
  ctx.fillStyle = agentHex;
  ctx.fillText('FI', 34, 13);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('FA', 56, 13);
  ctx.fillStyle = '#34d399';
  ctx.fillText(fr ? 'Cerveau (GRV)' : 'Brain (VRG)', 80, 13);
  ctx.fillStyle = '#fb7185';
  ctx.fillText('Muscle', fr ? 172 : 162, 13);
  ctx.fillStyle = '#64748b';
  ctx.fillText(fr ? '1 CAM' : '1 MAC', w - 42, yOf(macPct) - 4);
  ctx.restore();
}

