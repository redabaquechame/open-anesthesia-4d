/**
 * Adversarial regression suite: the reproduced failures of the independent audit
 * (audit/2026-11-27/findings.csv, probes.ts) written as tests of the CORRECT behaviour.
 * Run: npm run adversarial. CI and the deploy workflow run it before anything is published.
 *
 * Every test has a status:
 *  - 'fixed'  : must PASS. A failure means a regression and fails the run.
 *  - 'open'   : known defect, scheduled in the recovery plan (handoff/gemini/RECOVERY_PLAN_2026-11-27.md).
 *               It is reported as KNOWN-OPEN. If it starts to PASS the run fails too, so the list is always
 *               updated in the pull request that fixes it (strict "expected failure").
 *
 * These tests prove the absence of specific known defects. They are not clinical validation.
 */
import { readFileSync } from 'node:fs';
import { CircuitLungKernel, type MachineAndPatientParams } from '../../src/physics/circuitLungKernel';
import { CLAIMS } from '../../src/standards/claimRegistry';
import { CLAIM_FR } from '../../src/standards/claimFr';
import { ARREST } from '../../src/modules/m9-crisis/protocols/arrest';
import { MH } from '../../src/modules/m9-crisis/protocols/mh';
import { startRun, doAction, stepRun, buildDebrief } from '../../src/modules/m9-crisis/crisisEngine';
import { SCORES, CASES, FASTING } from '../../src/modules/m10-preop/preopScores';
import { scoreTotal, bandForPicks, itemCorrect } from '../../src/modules/m10-preop/preopMath';
import * as D from '../../src/modules/m8-bronchoscopy-dlt/dltModel';
import { perineuralCue, tipBeamWeight, TIP_VISIBLE_WEIGHT } from '../../src/modules/m6-ultrasound-cardiac/sonoFeedback';
import { MODULE_SCOPE } from '../../src/standards/moduleScope';
import * as THREE from 'three';

type Status = 'fixed' | 'open';
interface Case {
  id: string;
  finding: string;
  status: Status;
  /** Recovery-plan PR that closes an open item. */
  plannedIn?: string;
  run: () => { ok: boolean; detail: string };
}

const src = (p: string) => readFileSync(p, 'utf8');

// ── M1 helpers ──────────────────────────────────────────────────────────────
const base: MachineAndPatientParams = {
  driveType: 'ascending_bellows', ventMode: 'VCV', o2Source: 'pipeline', fgfO2Lpm: 1, fgfAirLpm: 1, fgfN2OLpm: 0,
  vaporizerDialPct: 2, vtMl: 480, rrBpm: 12, ieExpiratoryPart: 2, peepSetCmH2O: 5, pcvPinspCmH2O: 8, aplCmH2O: 10,
  resistanceCmH2OPerLps: 5, complianceMlPerCmH2O: 60, bronchospasmHeterogeneity: 0, metabolicVO2MlMin: 250, metabolicVCO2MlMin: 200,
  faults: {
    stuckInspiratoryValve: false, stuckExpiratoryValve: false, exhaustedSodaLime: false, circuitDisconnect: false, bellowsLeak: false,
    samplingLineLeak: false, curareCleft: false, scavengingObstruction: false, wallO2Failure: false, o2FlushActive: false,
  },
};
function runCircuit(p: MachineAndPatientParams, sec = 120, dt = 0.02) {
  const k = new CircuitLungKernel();
  let s = k.step(p, dt);
  for (let i = 1; i < Math.round(sec / dt); i++) s = k.step(p, dt);
  return s;
}
const withFault = (p: MachineAndPatientParams, f: keyof MachineAndPatientParams['faults']) => ({ ...p, faults: { ...p.faults, [f]: true } });

const CASES_LIST: Case[] = [
  // ── Release and governance ───────────────────────────────────────────────
  {
    id: 'release-gate', finding: 'F15', status: 'fixed',
    run: () => {
      const y = src('.github/workflows/deploy.yml');
      const ok = ['npm run sanity', 'npm run adversarial', 'npm run typecheck', 'docs/clinical-review'].every((x) => y.includes(x))
        && y.indexOf('npm run adversarial') < y.indexOf('npm run build');
      return { ok, detail: ok ? 'deploy runs typecheck, sanity, adversarial, review-doc drift before build' : 'deploy.yml can publish without the checks' };
    },
  },
  {
    id: 'build-id-commit', finding: 'F41', status: 'fixed',
    run: () => {
      const ok = src('src/config.ts').includes('__BUILD_COMMIT__') && src('vite.config.ts').includes('GITHUB_SHA');
      return { ok, detail: ok ? 'build ID carries the commit hash' : 'build ID is date-only' };
    },
  },
  {
    id: 'every-module-scoped', finding: 'F05/F40', status: 'fixed',
    run: () => {
      const ids = ['M1_M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11'];
      const miss = ids.filter((m) => !MODULE_SCOPE[m]?.notModelled.fr || !MODULE_SCOPE[m]?.notModelled.en);
      // A module may only drop the Prototype badge once named reviewers are recorded for it.
      const falselyReviewed = ids.filter((m) => MODULE_SCOPE[m]?.status === 'reviewed' && !CLAIMS.some((c) => c.module === (m === 'M1_M2' ? 'M1' : m) && c.reviewedBy));
      const ok = miss.length === 0 && falselyReviewed.length === 0;
      return { ok, detail: ok ? 'all 10 modules carry a scope line; none marked reviewed without a named reviewer' : `missing ${miss.join(',')} / reviewed without reviewer ${falselyReviewed.join(',')}` };
    },
  },
  {
    id: 'named-clinical-review', finding: 'F05', status: 'open', plannedIn: 'Gate 2 (named reviewers)',
    run: () => {
      const n = CLAIMS.filter((c) => c.reviewedBy).length;
      return { ok: n > 0, detail: `${n} claims with a named reviewer` };
    },
  },

  // ── M1 workstation ───────────────────────────────────────────────────────
  {
    id: 'gas-sum-le-100', finding: 'F01', status: 'open', plannedIn: 'PR 5 (circuit kernel v2)',
    run: () => {
      const s = runCircuit({ ...base, fgfO2Lpm: 6, fgfAirLpm: 0, vaporizerDialPct: 8 }, 1800);
      const total = s.circuitFiO2Pct + s.circuitArgonPct + s.circuitAgentPct;
      return { ok: total <= 100.01, detail: `O2+Ar+agent = ${total.toFixed(3)} %` };
    },
  },
  {
    id: 'zero-fgf-reservoir-empties', finding: 'F18', status: 'open', plannedIn: 'PR 5',
    run: () => {
      const s = runCircuit({ ...base, driveType: 'piston_fgd', fgfO2Lpm: 0, fgfAirLpm: 0 }, 1800);
      return { ok: s.deliveredVtMl < 0.5 * base.vtMl, detail: `delivered Vt after 30 min without fresh gas = ${s.deliveredVtMl.toFixed(0)} mL` };
    },
  },
  {
    id: 'pcv-leak-changes-volume', finding: 'F08', status: 'open', plannedIn: 'PR 5',
    run: () => {
      const p = { ...base, ventMode: 'PCV' as const };
      const a = runCircuit(p), b = runCircuit(withFault(p, 'bellowsLeak'));
      return { ok: b.deliveredVtMl < 0.97 * a.deliveredVtMl, detail: `PCV Vt ${a.deliveredVtMl.toFixed(0)} → ${b.deliveredVtMl.toFixed(0)} mL with leak` };
    },
  },
  {
    id: 'stuck-valve-changes-flow', finding: 'F16', status: 'open', plannedIn: 'PR 5',
    run: () => {
      const a = runCircuit(base), b = runCircuit(withFault(base, 'stuckExpiratoryValve'));
      const same = Math.abs(a.deliveredVtMl - b.deliveredVtMl) < 1 && Math.abs(a.pawCmH2O - b.pawCmH2O) < 0.1;
      return { ok: !same, detail: same ? 'valve fault leaves Vt and Paw identical (CO2 only scripted)' : 'valve fault changes mechanics' };
    },
  },
  {
    id: 'ventilator-controls-exposed', finding: 'F06', status: 'open', plannedIn: 'PR 6 (ventilator panel)',
    run: () => {
      const a = src('src/App.tsx');
      const ok = ['setVtMl', 'setRrBpm', 'setIe', 'setPinsp'].every((x) => a.includes(x)) || /vtMl:\s*v\b/.test(a);
      return { ok, detail: ok ? 'Vt/RR/I:E/Pinsp controls present' : 'Vt, RR, I:E, Pinsp have no control' };
    },
  },

  // ── M4 timing ────────────────────────────────────────────────────────────
  {
    id: 'm4-no-hidden-speed', finding: 'F14', status: 'open', plannedIn: 'PR 3 (one simulation clock)',
    run: () => {
      const s = src('src/modules/m4-aivoc-eeg/AivocEegModule.tsx');
      const hidden = /\(dtSec \/ 60\) \* 15/.test(s);
      return { ok: !hidden, detail: hidden ? 'drug clock multiplied by a hidden 15' : 'no hidden multiplier' };
    },
  },
  {
    id: 'physics-not-in-render-loop', finding: 'F23', status: 'open', plannedIn: 'PR 3',
    run: () => {
      const files = ['src/modules/m3-volatile-eco/VolatileEcoModule.tsx', 'src/modules/m4-aivoc-eeg/AivocEegModule.tsx', 'src/modules/m5-nmj-tof/NmjTofModule.tsx'];
      // Pattern of the frame-clamped integrators: Math.min((now - last) / 1000, 0.05) inside requestAnimationFrame.
      const bad = files.filter((f) => /Math\.min\(\(now - last\) \/ 1000,\s*0\.05\)/.test(src(f)));
      return { ok: bad.length === 0, detail: bad.length ? `frame-clamped integration in ${bad.length} modules` : 'shared fixed-step clock' };
    },
  },

  // ── M5 ───────────────────────────────────────────────────────────────────
  {
    id: 'no-extubation-verdict', finding: 'F12', status: 'fixed',
    run: () => {
      const s = src('src/modules/m5-nmj-tof/NmjTofModule.tsx');
      const bad = /SAFE EXTUBATION|EXTUBATION POSSIBLE/.test(s);
      const caveat = s.includes('Necessary, not sufficient') && s.includes('Condition nécessaire, pas suffisante');
      return { ok: !bad && caveat, detail: !bad && caveat ? 'TOF badge scoped to neuromuscular recovery, with caveat in FR/EN' : 'TOF ratio still presented as an extubation verdict' };
    },
  },
  {
    id: 'sugammadex-in-plasma', finding: 'F13', status: 'fixed',
    run: () => {
      const s = src('src/modules/m5-nmj-tof/NmjTofModule.tsx');
      const bad = /in synaptic cleft|dans la fente synaptique/.test(s);
      const claim = CLAIMS.find((c) => c.id === 'm5-sugammadex-mechanism');
      const ok = !bad && claim?.status === 'sourced' && !!CLAIM_FR['m5-sugammadex-mechanism'];
      return { ok, detail: ok ? 'mechanism text = plasma complex + gradient; sourced claim present' : 'cleft wording or missing claim' };
    },
  },

  // ── M6 ───────────────────────────────────────────────────────────────────
  {
    id: 'green-cue-needs-visible-tip', finding: 'F10', status: 'fixed',
    run: () => {
      const hidden = perineuralCue({ hazard: false, nearNerve: true, tipVisible: false, laMl: 5 });
      const seen = perineuralCue({ hazard: false, nearNerve: true, tipVisible: true, laMl: 5 });
      const hazard = perineuralCue({ hazard: true, nearNerve: true, tipVisible: true, laMl: 5 });
      // Geometry: a tip 3 mm out of plane is not visible; one in plane is.
      const frame = { origin: new THREE.Vector3(0, 0, 0), u: new THREE.Vector3(1, 0, 0), d: new THREE.Vector3(0, -1, 0), e: new THREE.Vector3(0, 0, 1) };
      const inPlane = tipBeamWeight(frame, new THREE.Vector3(0.005, -0.015, 0), 0.038, 0.04);
      const outPlane = tipBeamWeight(frame, new THREE.Vector3(0.005, -0.015, 0.003), 0.038, 0.04);
      const ok = hidden === 'tip-not-seen' && seen === 'perineural-spread' && hazard === 'none' && inPlane >= TIP_VISIBLE_WEIGHT && outPlane < TIP_VISIBLE_WEIGHT;
      return { ok, detail: `hidden→${hidden}, seen→${seen}, hazard→${hazard}, weights ${inPlane.toFixed(2)}/${outPlane.toFixed(3)}` };
    },
  },
  {
    id: 'needle-injury-latched', finding: 'F11', status: 'open', plannedIn: 'PR 4 (needle history)',
    run: () => {
      const s = src('src/modules/m6-ultrasound-cardiac/SonoLab.tsx');
      return { ok: /injuryLog|complications/i.test(s) && /latch/i.test(s), detail: 'hazards are instantaneous, nothing is latched' };
    },
  },
  {
    id: 'injectate-deposits-stay', finding: 'F32', status: 'open', plannedIn: 'PR 4',
    run: () => {
      const s = src('src/modules/m6-ultrasound-cardiac/SonoLab.tsx');
      const teleports = /laCenter = tip\.clone\(\)/.test(s);
      return { ok: !teleports, detail: teleports ? 'injectate follows the needle tip' : 'deposits stay in world space' };
    },
  },

  // ── M8 ───────────────────────────────────────────────────────────────────
  {
    id: 'm8-static-gas-labelled', finding: 'F09', status: 'fixed',
    run: () => {
      const s = src('src/modules/m8-bronchoscopy-dlt/BronchoscopyDltModule.tsx');
      const ok = s.includes('do NOT change PaO2 or SpO2 here') && s.includes('ne changent PAS la PaO2');
      return { ok, detail: ok ? 'screen states that ventilation does not change the blood gas' : 'static gas exchange shown without warning' };
    },
  },
  {
    id: 'm8-ventilation-coupled', finding: 'F09', status: 'open', plannedIn: 'Gate 3 (M8 shunt + dead-space model)',
    run: () => {
      const map = JSON.parse(src('public/models/anatomy/airway-map.json'));
      const sum = (Object.values(map.lobeHullVolume) as number[]).reduce((a, b) => a + b, 0);
      const shares = Object.fromEntries(Object.entries(map.lobeHullVolume).map(([k, v]) => [k, (v as number) / sum])) as never;
      const inp: D.DltInputs = { anatomy: 'male', heightCm: 170, size: 37, depthCm: 29, side: 'left', lateral: false, migrationMm: 6.3, upSide: 'right', bronchialCuffMl: 1.5, clamp: 'none', vtMl: 450, rr: 12, peep: 5, fio2: 1, hpv: 0.5 };
      const lo = D.evaluateDlt({ ...inp, rr: 4, vtMl: 150 }, map, shares).gas;
      const hi = D.evaluateDlt({ ...inp, rr: 30, vtMl: 900 }, map, shares).gas;
      const same = JSON.stringify(lo) === JSON.stringify(hi);
      return { ok: !same, detail: same ? 'gas identical at RR/Vt 4/150 and 30/900' : 'gas responds to ventilation' };
    },
  },

  // ── M9 crises ────────────────────────────────────────────────────────────
  {
    id: 'no-click-rosc', finding: 'F02', status: 'fixed',
    run: () => {
      // Five clicks in 0 s, then the whole scenario: three stacked shocks are one cycle, so never ROSC.
      let r = startRun(ARREST);
      for (const id of ['pads', 'cpr', 'shock', 'shock', 'shock']) r = doAction(ARREST, r, id);
      let rosc = false;
      while (!r.ended) { r = stepRun(ARREST, r, 0.5, 80); if (r.vitals.rhythm === 'ROSC') rosc = true; }
      return { ok: !rosc, detail: rosc ? `ROSC after instant clicks (t=${r.tSec}s)` : `rapid clicks: still ${r.vitals.rhythm} at ${r.tSec}s` };
    },
  },
  {
    id: 'reversed-order-penalised', finding: 'F03', status: 'fixed',
    run: () => {
      // Reversed order at the same timestamp must score 0; guideline order must score 1.
      let rev = startRun(ARREST);
      for (const a of [...ARREST.actions.filter((x) => x.critical)].reverse()) rev = doAction(ARREST, rev, a.id);
      let fwd = startRun(ARREST);
      for (const a of ARREST.actions.filter((x) => x.critical)) fwd = doAction(ARREST, fwd, a.id);
      const dr = buildDebrief(ARREST, rev).orderScore;
      const df = buildDebrief(ARREST, fwd).orderScore;
      return { ok: dr === 0 && df === 1, detail: `reversed = ${dr}, guideline order = ${df}` };
    },
  },
  {
    id: 'mh-trigger-matters', finding: 'F04', status: 'fixed',
    run: () => {
      let r = startRun(MH);
      r = doAction(MH, r, 'dantrolene');
      for (let i = 0; i < 360; i++) r = stepRun(MH, r, 0.5, 70);
      const v = r.vitals as unknown as { hr: number; etco2: number };
      const normal = v.hr < 100 && v.etco2 < 50;
      return { ok: !normal, detail: `dantrolene only, trigger on, 180 s: HR ${v.hr?.toFixed?.(0)}, EtCO2 ${v.etco2?.toFixed?.(0)}` };
    },
  },
  {
    id: 'distractors-have-consequences', finding: 'M9 probe', status: 'fixed',
    run: () => {
      // MH: turning sevoflurane down instead of removing it leaves the crisis running even with dantrolene.
      let good = startRun(MH), bad = startRun(MH);
      good = doAction(MH, good, 'trigger'); good = doAction(MH, good, 'dantrolene');
      bad = doAction(MH, bad, 'lowerSevo'); bad = doAction(MH, bad, 'dantrolene');
      for (let i = 0; i < 360; i++) { good = stepRun(MH, good, 0.5, 70); bad = stepRun(MH, bad, 0.5, 70); }
      const g = good.vitals.etco2, b = bad.vitals.etco2;
      // Arrest: adrenaline before the first shock is flagged in the debrief.
      let ar = startRun(ARREST);
      ar = doAction(ARREST, ar, 'adrenalineFirst');
      const flagged = buildDebrief(ARREST, ar).timingIssues.some((t) => t.id === 'adrenalineFirst');
      return { ok: b > g + 15 && flagged, detail: `MH EtCO2 trigger removed ${g.toFixed(0)} vs lowered ${b.toFixed(0)}; arrest adrenaline-first flagged: ${flagged}` };
    },
  },

  // ── M10 ──────────────────────────────────────────────────────────────────
  {
    id: 'unanswered-is-unknown', finding: 'F36', status: 'fixed',
    run: () => {
      const leaks = SCORES.filter((s) => scoreTotal(s, undefined) !== null || bandForPicks(s, undefined) !== undefined || bandForPicks(s, {}) !== undefined);
      // Partially answered: still no band.
      const partial = SCORES.filter((s) => s.items.length > 1 && bandForPicks(s, { [s.items[0].id]: 0 }) !== undefined);
      return { ok: leaks.length === 0 && partial.length === 0, detail: leaks.length || partial.length ? `band shown without full answers: ${[...leaks, ...partial].map((s) => s.id).join(',')}` : 'no total or band until every item is answered' };
    },
  },
  {
    id: 'case-marking-unanswered-wrong', finding: 'F36', status: 'fixed',
    run: () => {
      // An empty answer sheet must score 0 on every case (before: unanswered counted as correct when the key was option 0).
      const bad = CASES.filter((c) => Object.values(c.answers).some((items) => Object.values(items).some((idx) => itemCorrect(idx, undefined))));
      return { ok: bad.length === 0, detail: bad.length ? `empty sheet scores points on ${bad.map((c) => c.id).join(',')}` : 'empty answer sheet scores 0' };
    },
  },
  {
    id: 'fasting-meal-types', finding: 'F37', status: 'fixed',
    run: () => {
      const adult = FASTING.filter((f) => f.population === 'adult');
      const fatty = adult.find((f) => f.id === 'adultFatty');
      const nonClear = adult.find((f) => f.id === 'adultNonClear');
      const claim = CLAIMS.find((c) => c.id === 'm10-fasting-adult-2026');
      const ok = !!fatty && fatty.hours === 8 && !!nonClear && nonClear.hours === 6 && claim?.status === 'sourced' && /70130/.test(claim.source ?? '');
      return { ok, detail: ok ? 'light 6 h / large-fatty 8 h / non-clear 6 h / clear 2 h, Rüggeberg 2026' : 'single generic adult solid rule' };
    },
  },
];

let failures = 0;
let open = 0;
for (const c of CASES_LIST) {
  let res: { ok: boolean; detail: string };
  try {
    res = c.run();
  } catch (e) {
    res = { ok: false, detail: `threw: ${(e as Error).message}` };
  }
  let tag: string;
  if (c.status === 'fixed') {
    tag = res.ok ? 'PASS' : 'FAIL';
    if (!res.ok) failures++;
  } else if (res.ok) {
    tag = 'FAIL';
    failures++;
    res.detail = `now passes — mark '${c.id}' as fixed in scripts/adversarial/run.ts (${res.detail})`;
  } else {
    tag = 'KNOWN-OPEN';
    open++;
    res.detail = `${res.detail} → ${c.plannedIn}`;
  }
  console.log(`${tag.padEnd(10)} ${c.finding.padEnd(9)} ${c.id.padEnd(32)} ${res.detail}`);
}
const fixed = CASES_LIST.filter((c) => c.status === 'fixed').length;
console.log(`\n${fixed} fixed checks, ${open} known-open defects scheduled, ${failures} failure(s).`);
if (failures > 0) process.exit(1);
