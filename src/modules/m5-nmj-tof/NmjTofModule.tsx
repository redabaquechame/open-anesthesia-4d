import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AlertTriangle, RotateCcw, Syringe, Zap } from 'lucide-react';
import { createTieredRenderer, disposeSceneResources } from '../../engine/createTieredRenderer';
import type { LocaleCode } from '../../standards/clinicalStandards';

interface NmjState {
  elapsedSec: number;
  rocuroniumPlasmaNorm: number; // 0..2
  sugammadexConc: number;
  eyelidOcc: number; // corrugator supercilii receptor occupancy 0..1 (faster onset — Lee 2009 BJA)
  thumbOcc: number; // adductor pollicis receptor occupancy 0..1 (slower onset)
  eyelidTwitches: number[]; // 4 twitch heights 0..1
  thumbTwitches: number[];
  eyelidTofRatio: number;
  thumbTofRatio: number;
  ptcCount: number;
  ptcCooldownSec: number;
  feedbackBanner: string;
}

function occupancyToTwitches(occ: number): { twitches: number[]; ratio: number; count: number } {
  // Simulator mapping, after the classic receptor-occupancy teaching: fade begins near ~75% occupancy,
  // twitches disappear progressively as occupancy approaches ~90–95%
  const t1 = Math.max(0, Math.min(1, (0.95 - occ) / 0.25));
  const t2 = Math.max(0, Math.min(1, (0.89 - occ) / 0.24));
  const t3 = Math.max(0, Math.min(1, (0.84 - occ) / 0.24));
  const t4 = Math.max(0, Math.min(1, (0.79 - occ) / 0.24));
  const twitches = [t1, t2, t3, t4];
  const count = twitches.filter((t) => t > 0.06).length;
  const ratio = t1 > 0.08 ? Math.min(1, t4 / t1) : 0;
  return { twitches, ratio, count };
}

export function NmjTofModule({ locale }: { locale: LocaleCode }) {
  const fr = locale !== 'en-INT';
  const L = (f: string, e: string) => (fr ? f : e);
  // Display-only decimal separator for French text (values themselves are unchanged)
  const dec = (s: string) => (fr ? s.replace('.', ',') : s);
  const baselineBanner = L(
    'Transmission neuromusculaire de base intacte (rapport T4/T1 1,00).',
    'Baseline neuromuscular transmission intact (TOF Ratio 1.00).'
  );
  const [avatarWeightKg, setAvatarWeightKg] = useState(75);
  const [renalFailure, setRenalFailure] = useState(false);
  const [speedX, setSpeedX] = useState(10);
  const [state, setState] = useState<NmjState>({
    elapsedSec: 0,
    rocuroniumPlasmaNorm: 0,
    sugammadexConc: 0,
    eyelidOcc: 0,
    thumbOcc: 0,
    eyelidTwitches: [1, 1, 1, 1],
    thumbTwitches: [1, 1, 1, 1],
    eyelidTofRatio: 1.0,
    thumbTofRatio: 1.0,
    ptcCount: 15,
    ptcCooldownSec: 0,
    feedbackBanner: baselineBanner,
  });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef({
    tSec: 0,
    rocPlasma: 0,
    rocPeripheral: 0,
    sugaFree: 0,
    eyelidOcc: 0,
    thumbOcc: 0,
    ptcCooldown: 0,
    banner: baselineBanner,
  });
  const speedRef = useRef(speedX);
  speedRef.current = speedX;

  useEffect(() => {
    if (!viewportRef.current) return;
    const container = viewportRef.current;
    const canvas = document.createElement('canvas');
    canvas.className = 'block w-full h-full outline-none';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b14');
    const camera = new THREE.PerspectiveCamera(42, 16 / 10, 0.1, 80);
    camera.position.set(0, 2.2, 7.2);

    let disposed = false;
    let rafId: number | null = null;
    let controls: OrbitControls | null = null;
    let handleDispose: (() => void) | null = null;
    let ro: ResizeObserver | null = null;

    // 4D Cellular Neuromuscular Junction
    const preSyn = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 24, 16, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4, transparent: true, opacity: 0.78 })
    );
    preSyn.position.set(0, 2.55, 0);
    scene.add(preSyn);

    const postMembrane = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 0.42, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.55 })
    );
    postMembrane.position.set(0, -1.6, 0);
    scene.add(postMembrane);

    // Capillary = plasma compartment. Sugammadex captures rocuronium in plasma (the model binds rocPlasma);
    // the falling free plasma concentration then draws rocuronium out of the junction (Kleijn 2011, BRIDION label §12.1).
    const capillary = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 3.4, 20, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
    );
    capillary.rotation.x = Math.PI / 2;
    capillary.position.set(3.55, -0.6, 0);
    scene.add(capillary);

    // 10 Nicotinic AChR pentameric channels across the motor endplate
    const receptorMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < 10; i++) {
      const x = -2.25 + i * 0.5;
      const rec = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.17, 0.52, 12),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4 })
      );
      rec.position.set(x, -1.25, (i % 2 === 0 ? 0.35 : -0.35));
      scene.add(rec);
      receptorMeshes.push(rec);
    }

    // Instanced ACh (emerald), Rocuronium (crimson), and Sugammadex cyclodextrin rings (gold)
    const achCount = 60;
    const rocCount = 50;
    const sugaCount = 30;

    const achMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x34d399 }),
      achCount
    );
    const rocMesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.09, 0),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.5 }),
      rocCount
    );
    const sugaMesh = new THREE.InstancedMesh(
      new THREE.TorusGeometry(0.14, 0.04, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.55 }),
      sugaCount
    );
    scene.add(achMesh, rocMesh, sugaMesh);

    createTieredRenderer(canvas).then((handle) => {
      if (disposed) {
        handle.dispose();
        return;
      }
      handleDispose = handle.dispose;
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;

      scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 1.05));
      const key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(4, 7, 5);
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

      const dummy = new THREE.Object3D();
      let last = performance.now();
      let uiAcc = 0;

      const loop = () => {
        if (disposed) return;
        rafId = requestAnimationFrame(loop);
        const now = performance.now();
        const dtWall = Math.min((now - last) / 1000, 0.05);
        last = now;
        const dtSim = dtWall * speedRef.current;

        const s = simRef.current;
        s.tSec += dtSim;
        s.ptcCooldown = Math.max(0, s.ptcCooldown - dtSim);

        // Sugammadex rapid 1:1 encapsulation of plasma rocuronium (leaves peripheral reservoir if underdosed!)
        if (s.sugaFree > 0.001 && s.rocPlasma > 0.001) {
          const bind = Math.min(s.sugaFree, s.rocPlasma) * Math.min(1, dtSim * 0.14);
          s.sugaFree -= bind;
          s.rocPlasma -= bind;
        }
        // Redistribution between peripheral reservoir and plasma (causes recurarization if sugammadex underdosed!)
        const flux = (s.rocPeripheral - s.rocPlasma) * 0.0045 * dtSim;
        s.rocPlasma = Math.max(0, s.rocPlasma + flux - s.rocPlasma * 0.00055 * dtSim);
        s.rocPeripheral = Math.max(0, s.rocPeripheral - flux * 0.35);

        // Site-specific equilibration: Eyelid (corrugator) ~3x faster onset/recovery than Adductor Pollicis!
        const targetOccEyelid = Math.min(0.99, (s.rocPlasma * 1.15) / (s.rocPlasma * 1.15 + 0.28));
        const targetOccThumb = Math.min(0.99, (s.rocPlasma * 1.35) / (s.rocPlasma * 1.35 + 0.18));
        s.eyelidOcc += (targetOccEyelid - s.eyelidOcc) * Math.min(1, dtSim * 0.045);
        s.thumbOcc += (targetOccThumb - s.thumbOcc) * Math.min(1, dtSim * 0.015);

        // Update 3D Cellular Receptors & Molecules
        const blockedCount = Math.round(s.thumbOcc * receptorMeshes.length);
        receptorMeshes.forEach((m, idx) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (idx < blockedCount) {
            mat.color.set(0xf43f5e);
            mat.emissive.set(0xbe123c);
          } else {
            mat.color.set(0x38bdf8);
            mat.emissive.set(0x0284c7);
          }
        });

        for (let i = 0; i < achCount; i++) {
          const ph = ((now * 0.0008 + i / achCount) % 1);
          dummy.position.set(Math.sin(i * 1.7) * 2.1, 0.7 - ph * 1.9, Math.cos(i * 2.3) * 0.9);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          achMesh.setMatrixAt(i, dummy.matrix);
        }
        achMesh.instanceMatrix.needsUpdate = true;

        const visibleRoc = Math.round(Math.min(1, s.rocPlasma) * rocCount);
        for (let i = 0; i < rocCount; i++) {
          if (i < visibleRoc) {
            const targetRec = receptorMeshes[i % receptorMeshes.length];
            const hover = i < blockedCount * 3 ? 0 : Math.sin(now * 0.002 + i) * 0.6 + 0.7;
            dummy.position.set(
              targetRec.position.x + Math.sin(i) * 0.15,
              -0.95 + hover,
              targetRec.position.z + Math.cos(i) * 0.15
            );
            dummy.scale.setScalar(1);
          } else {
            dummy.scale.setScalar(0.0001);
          }
          dummy.updateMatrix();
          rocMesh.setMatrixAt(i, dummy.matrix);
        }
        rocMesh.instanceMatrix.needsUpdate = true;

        const visibleSuga = Math.round(Math.min(1, s.sugaFree * 1.6) * sugaCount);
        for (let i = 0; i < sugaCount; i++) {
          if (i < visibleSuga) {
            // Inside the capillary (plasma), not in the synaptic cleft.
            dummy.position.set(
              3.55 + Math.sin(now * 0.0015 + i * 0.9) * 0.3,
              -0.6 + Math.cos(now * 0.002 + i) * 0.3,
              ((i * 0.37 + now * 0.0004) % 3.0) - 1.5
            );
            dummy.rotation.set(now * 0.002 + i, now * 0.001, 0);
            dummy.scale.setScalar(1);
          } else {
            dummy.scale.setScalar(0.0001);
          }
          dummy.updateMatrix();
          sugaMesh.setMatrixAt(i, dummy.matrix);
        }
        sugaMesh.instanceMatrix.needsUpdate = true;

        uiAcc += dtWall;
        if (uiAcc > 0.15) {
          uiAcc = 0;
          const eye = occupancyToTwitches(s.eyelidOcc);
          const thm = occupancyToTwitches(s.thumbOcc);
          const ptc = thm.count > 0 ? 15 : Math.max(0, Math.round((0.99 - s.thumbOcc) * 240));
          setState({
            elapsedSec: s.tSec,
            rocuroniumPlasmaNorm: s.rocPlasma,
            sugammadexConc: s.sugaFree,
            eyelidOcc: s.eyelidOcc,
            thumbOcc: s.thumbOcc,
            eyelidTwitches: eye.twitches,
            thumbTwitches: thm.twitches,
            eyelidTofRatio: eye.ratio,
            thumbTofRatio: thm.ratio,
            ptcCount: ptc,
            ptcCooldownSec: s.ptcCooldown,
            feedbackBanner: s.banner,
          });
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

  const giveRocuronium = (doseMgKg: number) => {
    const s = simRef.current;
    s.rocPlasma += doseMgKg * 1.45;
    s.rocPeripheral += doseMgKg * 1.1;
    s.banner = L(
      `Rocuronium ${dec(String(doseMgKg))} mg/kg administré (avatar virtuel de ${avatarWeightKg} kg). Observez le muscle sourcilier (corrugator supercilii) atteindre le bloc avant l’adducteur du pouce (chronologie simulée).`,
      `Administered Rocuronium ${doseMgKg} mg/kg (virtual avatar ${avatarWeightKg} kg). Watch the corrugator supercilii reach block before the adductor pollicis (simulated timing).`
    );
  };

  const giveSugammadex = (doseMgKg: number, fixedVial200 = false) => {
    if (renalFailure) {
      simRef.current.banner = L(
        'Sugammadex NON RECOMMANDÉ en cas d’insuffisance rénale sévère (ClCr < 30 mL/min, selon le RCP). Le simulateur ne l’administre pas ici.',
        'Sugammadex is NOT RECOMMENDED in severe renal impairment (CrCl < 30 mL/min, per label). The simulator withholds it here.'
      );
      return;
    }
    const effectiveMgKg = fixedVial200 ? 200 / avatarWeightKg : doseMgKg;
    simRef.current.sugaFree += effectiveMgKg * 0.42;
    simRef.current.banner = fixedVial200
      ? L(
          `Flacon fixe de 200 mg chez un avatar de ${avatarWeightKg} kg (${dec(effectiveMgKg.toFixed(1))} mg/kg) — observez la récupération transitoire suivie d’une RECURARISATION par redistribution périphérique !`,
          `Fixed 200 mg vial in ${avatarWeightKg} kg avatar (${effectiveMgKg.toFixed(1)} mg/kg) — watch temporary recovery followed by REBOUND RECURARIZATION from peripheral redistribution!`
        )
      : L(
          `Sugammadex ${doseMgKg} mg/kg : il forme un complexe avec le rocuronium dans le plasma (anneaux dorés dans le capillaire). La baisse du rocuronium libre plasmatique attire le rocuronium hors de la jonction, qui se libère des récepteurs. Objectif : rapport T4/T1 ≥ 0,90 à l’adducteur du pouce — condition nécessaire, pas suffisante, pour extuber.`,
          `Sugammadex ${doseMgKg} mg/kg forms a complex with rocuronium in plasma (gold rings in the capillary). The fall in free plasma rocuronium draws rocuronium out of the junction, freeing the receptors. Target: adductor pollicis TOF ratio ≥ 0.90 — necessary, not sufficient, before extubation.`
        );
  };

  const firePtc = () => {
    const s = simRef.current;
    const thumbCount = occupancyToTwitches(s.thumbOcc).count;
    if (thumbCount > 0) {
      s.banner = L(
        'Le compte post-tétanique (PTC) n’est utile que si le compte du train-de-quatre (TOF) est à 0. Si le compte TOF > 0, lisez plutôt le TOF.',
        'PTC is only needed when the TOF count is 0. With TOF count > 0, read the TOF instead.'
      );
      return;
    }
    if (s.ptcCooldown > 0) {
      s.banner = L(
        `La stimulation tétanique potentialise les réponses suivantes : les PTC doivent être espacés. Le standard de recherche GCRP 2023 les sépare d’au moins 2 min ; le simulateur utilise 2 min : ${Math.ceil(s.ptcCooldown)} s restantes.`,
        `Tetanic stimulation potentiates later responses, so PTCs need spacing. The GCRP 2023 research standard spaces them by at least 2 min; the simulator uses 2 min: ${Math.ceil(s.ptcCooldown)} s remaining.`
      );
      return;
    }
    s.ptcCooldown = 120; // GCRP 2023 Geneva revision, Table 4: ≥ 2 min between PTCs (claim m5-ptc-spacing)
    s.banner = L(
      `PTC réalisé. Posologie du RCP : bloc profond (PTC 1–2) → sugammadex 4 mg/kg ; réapparition de T2 → 2 mg/kg. PTC 0 = bloc intense.`,
      `PTC done. Label dosing: deep block (PTC 1–2) → sugammadex 4 mg/kg; reappearance of T2 → 2 mg/kg. PTC 0 = profound block.`
    );
  };

  const launchObeseRecurarizationCrisis = () => {
    setAvatarWeightKg(135);
    setRenalFailure(false);
    const s = simRef.current;
    s.tSec = 0;
    s.rocPlasma = 1.1;
    s.rocPeripheral = 2.6;
    s.sugaFree = 0;
    s.eyelidOcc = 0.85;
    s.thumbOcc = 0.94;
    s.banner = L(
      'EXERCICE DE RECURARISATION CHEZ L’OBÈSE (avatar de 135 kg, bloc profond) : cliquez sur « Flacon fixe de 200 mg sans monitorage » pour voir la remontée transitoire du TOF suivie d’un dangereux rebond du bloc neuromusculaire !',
      'OBESE RECURARIZATION DRILL (135 kg avatar, deep block): Click "Unmonitored 200 mg Vial" to see transient TOF rise followed by dangerous rebound blockade!'
    );
  };

  // TOF ≥ 0.9 is ONE condition (neuromuscular recovery). It is never presented as an overall extubation verdict (audit F12):
  // the BRIDION label also requires adequate spontaneous respiration and a patent airway, which this module does not model.
  const thumbSafeToExtubate = state.thumbTofRatio >= 0.9;

  return (
    <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
      <section className="lg:col-span-8 flex flex-col gap-3">
        <div className="bg-oa-canvas border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-oa-surface2 border-b border-slate-800 flex flex-wrap justify-between items-center gap-2 text-xs">
            <span className="font-bold text-cyan-300">
              {L(
                'Jonction neuromusculaire 4D (ACh vert | rocuronium rouge | sugammadex or)',
                '4D Cellular Neuromuscular Junction (ACh Green | Rocuronium Red | Sugammadex Gold)'
              )}
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span>t = {Math.round(state.elapsedSec)} s</span>
              {[1, 10, 25].map((x) => (
                <button key={x} onClick={() => setSpeedX(x)} className={`px-2 py-0.5 rounded border cursor-pointer ${speedX === x ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  {x}x
                </button>
              ))}
              <button onClick={() => { simRef.current = { tSec: 0, rocPlasma: 0, rocPeripheral: 0, sugaFree: 0, eyelidOcc: 0, thumbOcc: 0, ptcCooldown: 0, banner: L('Retour à l’état de base.', 'Reset to baseline.') }; }} title={L('Réinitialiser', 'Reset')} aria-label={L('Réinitialiser', 'Reset')} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 cursor-pointer">
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div ref={viewportRef} className="w-full h-[320px] sm:h-[360px] touch-none" />
          <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 text-xs text-amber-200">
            {state.feedbackBanner}
          </div>
        </div>

        {/* Split-Screen Quantitative TOF Comparison: Sourcilier (Intubate) vs Adducteur du Pouce (Extubate) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-oa-surface border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-sky-300">{L('Face / muscle sourcilier (corrugator supercilii)', 'Facial / Corrugator Supercilii')}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-200">{L('INTUBATION UNIQUEMENT', 'INTUBATION ONLY')}</span>
            </div>
            <div className="flex items-end gap-3 h-24 bg-slate-950 rounded-lg p-3 border border-slate-800">
              {state.eyelidTwitches.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="w-full bg-sky-400 rounded-t transition-all" style={{ height: `${Math.max(4, h * 100)}%` }} />
                  <span className="text-[10px] font-mono text-slate-400 mt-1">T{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-mono text-xs">
              <span>{L('Rapport T4/T1 : ', 'TOF Ratio: ')}<strong>{(state.eyelidTofRatio * 100).toFixed(0)}{L(' %', '%')}</strong></span>
              <span className="text-slate-400">{L('Installation plus rapide qu’au pouce', 'Faster onset than thumb')}</span>
            </div>
          </div>

          <div className={`bg-oa-surface border rounded-xl p-3 space-y-2 ${thumbSafeToExtubate ? 'border-emerald-500/40' : 'border-rose-500/50'}`}>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-emerald-300">{L('Nerf ulnaire / adducteur du pouce', 'Ulnar / Adductor Pollicis')}</span>
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${thumbSafeToExtubate ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/25 text-rose-200'}`}>
                {thumbSafeToExtubate
                  ? L('RÉCUPÉRATION NEUROMUSCULAIRE : TOF ≥ 0,90', 'NEUROMUSCULAR RECOVERY: TOF ≥ 0.90')
                  : L('BLOC RÉSIDUEL — NE PAS EXTUBER', 'RESIDUAL BLOCK — DO NOT EXTUBATE')}
              </span>
            </div>
            {thumbSafeToExtubate && (
              <div className="text-[11px] text-slate-300 leading-snug">
                {L(
                  'Condition nécessaire, pas suffisante. Avant d’extuber, vérifier aussi : ventilation spontanée adéquate, voies aériennes perméables, état de conscience. Ce module ne simule que la jonction neuromusculaire.',
                  'Necessary, not sufficient. Before extubation also check: adequate spontaneous breathing, patent airway, level of consciousness. This module only simulates the neuromuscular junction.'
                )}
              </div>
            )}
            <div className="flex items-end gap-3 h-24 bg-slate-950 rounded-lg p-3 border border-slate-800">
              {state.thumbTwitches.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className={`w-full rounded-t transition-all ${thumbSafeToExtubate ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ height: `${Math.max(4, h * 100)}%` }} />
                  <span className="text-[10px] font-mono text-slate-400 mt-1">T{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-mono text-xs">
              <span>{L('Rapport T4/T1 : ', 'TOF Ratio: ')}<strong>{(state.thumbTofRatio * 100).toFixed(0)}{L(' %', '%')}</strong></span>
              <span className="text-slate-400">{L('PTC : ', 'PTC: ')}{state.ptcCount}</span>
            </div>
          </div>
        </div>
      </section>

      <aside className="lg:col-span-4 flex flex-col gap-3 text-xs">
        <div className="bg-oa-surface border border-slate-800 rounded-xl p-3 space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Syringe className="w-3.5 h-3.5" /> {L('1. Curares (agents bloquants neuromusculaires)', '1. Synthetic Neuromuscular Agents')}
          </h2>
          <label className="block">
            <div className="flex justify-between text-[11px]">
              <span>{L('Poids de l’avatar virtuel', 'Virtual Avatar Weight')}</span>
              <span className="font-mono text-cyan-300">{avatarWeightKg} kg</span>
            </div>
            <input type="range" min={45} max={150} step={5} value={avatarWeightKg}
              onChange={(e) => setAvatarWeightKg(Number(e.target.value))} className="w-full" />
          </label>
          <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
            <span>{L('Insuffisance rénale sévère (ClCr < 30)', 'Severe renal impairment (CrCl < 30)')}</span>
            <input type="checkbox" checked={renalFailure} onChange={(e) => setRenalFailure(e.target.checked)} />
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => giveRocuronium(0.6)} className="py-2 px-2 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white font-semibold cursor-pointer">
              {L('Rocuronium 0,6 mg/kg', 'Rocuronium 0.6 mg/kg')}
            </button>
            <button onClick={() => giveRocuronium(1.2)} className="py-2 px-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-semibold cursor-pointer">
              {L('Rocuronium 1,2 (ISR)', 'Rocuronium 1.2 (RSI)')}
            </button>
          </div>
        </div>

        <div className="bg-oa-surface border border-slate-800 rounded-xl p-3 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> {L('2. Stimulation quantitative et sugammadex', '2. Quantitative Stimulation & Sugammadex')}
          </h2>
          <button onClick={firePtc} className="w-full py-1.5 rounded-lg bg-slate-900 border border-cyan-500/40 text-cyan-200 hover:bg-slate-800 cursor-pointer">
            {L('Lancer un compte post-tétanique (PTC)', 'Trigger Post-Tetanic Count (PTC)')}{' '}
            {state.ptcCooldownSec > 0
              ? L(`[Attendre ${Math.ceil(state.ptcCooldownSec)} s]`, `[Wait ${Math.ceil(state.ptcCooldownSec)}s]`)
              : ''}
          </button>
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={() => giveSugammadex(2)} className="py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white font-semibold cursor-pointer">
              {L('2 mg/kg (retour de T2)', '2 mg/kg (T2 back)')}
            </button>
            <button onClick={() => giveSugammadex(4)} className="py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer">
              4 mg/kg (PTC 1–2)
            </button>
            <button onClick={() => giveSugammadex(16)} className="py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer">
              {L('16 mg/kg (immédiat)', '16 mg/kg (immediate)')}
            </button>
          </div>
          <button onClick={() => giveSugammadex(0, true)} className="w-full py-1.5 rounded-lg bg-rose-950/70 border border-rose-500/40 text-rose-200 hover:bg-rose-900/60 cursor-pointer">
            {L('Flacon fixe de 200 mg sans monitorage (piège de recurarisation)', 'Unmonitored Fixed 200 mg Vial (Recurarization Trap)')}
          </button>
          <button onClick={launchObeseRecurarizationCrisis} className="w-full py-2 rounded-lg bg-purple-950/60 border border-purple-400/40 text-purple-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
            <AlertTriangle className="w-3.5 h-3.5" /> {L('Charger la crise de recurarisation chez l’obèse (135 kg)', 'Load Obese Recurarization Crisis (135 kg)')}
          </button>
        </div>
      </aside>
    </main>
  );
}

