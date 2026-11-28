/**
 * Sanity checks for M9 (crisis trainer) and M10 (pre-operative assessment).
 * These check data integrity (every step/score is backed by a registered claim, risk tables have
 * no gaps) and that each crisis behaves as taught: untreated → worse, guideline sequence → better.
 */
import { CLAIMS } from '../../src/standards/claimRegistry';
import { EVIDENCE_REGISTRY } from '../../src/evidence/evidenceRegistry';
import { CRISES } from '../../src/modules/m9-crisis/crisisProtocols';
import { computeDose, doAction, modelSequence, startRun, stepRun } from '../../src/modules/m9-crisis/crisisEngine';
import { CASES, FASTING, SCORES } from '../../src/modules/m10-preop/preopScores';
import { bandFor, scoreTotal } from '../../src/modules/m10-preop/preopMath';

type Check = (name: string, ok: boolean, detail: string) => void;

const claimIds = new Set(CLAIMS.map((c) => c.id));
const evidenceIds = new Set(EVIDENCE_REGISTRY.map((e) => e.id));

function simulate(id: string, actions: string[], weightKg = 70) {
  const p = CRISES.find((c) => c.id === id)!;
  let run = startRun(p);
  // Do the actions in order, 10 s apart, then let the scenario run to its end.
  for (const a of actions) {
    run = doAction(p, run, a);
    for (let i = 0; i < 20; i++) run = stepRun(p, run, 0.5, weightKg);
  }
  while (!run.ended) run = stepRun(p, run, 0.5, weightKg);
  return run.vitals;
}

/** Do actions at given scenario times (s), then run to the end. */
function simulateTimeline(id: string, timeline: { id: string; atSec: number }[], weightKg = 70) {
  const p = CRISES.find((c) => c.id === id)!;
  let run = startRun(p);
  const todo = [...timeline].sort((a, b) => a.atSec - b.atSec);
  while (!run.ended) {
    while (todo.length && todo[0].atSec <= run.tSec + 1e-9) run = doAction(p, run, todo.shift()!.id);
    run = stepRun(p, run, 0.5, weightKg);
  }
  return run;
}

/** The guideline-correct run: the protocol's timeline when it has timing rules, else the sequence 10 s apart. */
function simulateGuideline(id: string, weightKg = 70) {
  const p = CRISES.find((c) => c.id === id)!;
  return p.modelTimeline ? simulateTimeline(id, p.modelTimeline, weightKg).vitals : simulate(id, modelSequence(p), weightKg);
}

/** Crude severity: lower is better. */
const badness = (v: { sbp: number; spo2: number; rhythm: string; tempC: number }) =>
  (v.rhythm === 'VF' || v.rhythm === 'PEA' || v.rhythm === 'asystole' ? 100 : 0) + Math.max(0, 90 - v.sbp) + Math.max(0, 94 - v.spo2) + Math.max(0, v.tempC - 38) * 10;

export function runCrisisPreopChecks(check: Check) {
  // ── M9 data integrity
  for (const p of CRISES) {
    const missing = [
      ...p.actions.map((a) => a.claimId),
      ...p.distractors.map((d) => d.claimId).filter(Boolean),
      ...p.claimIds,
    ].filter((id) => !claimIds.has(id as string));
    check(`M9 ${p.id}: every step backed by a claim`, missing.length === 0, missing.length ? `missing ${[...new Set(missing)].join(', ')}` : `${p.actions.length} steps`);
    check(`M9 ${p.id}: evidence entry exists`, evidenceIds.has(p.evidenceId), p.evidenceId);
    const untreated = simulate(p.id, []);
    const treated = simulateGuideline(p.id);
    check(
      `M9 ${p.id}: guideline sequence beats no treatment`,
      badness(treated) < badness(untreated),
      `treated ${treated.rhythm} ${Math.round(treated.sbp)} mmHg SpO2 ${Math.round(treated.spo2)} vs untreated ${untreated.rhythm} ${Math.round(untreated.sbp)}`
    );
  }

  // ── M9 dose arithmetic (ASRA lipid: > 70 kg fixed 100 mL, otherwise 1.5 mL/kg)
  const last = CRISES.find((c) => c.id === 'last');
  if (last) {
    const bolus = last.actions.find((a) => a.id === 'lipidBolus')!.dose;
    check('M9 LAST lipid bolus 60 kg = 90 mL', computeDose(bolus, 60)!.amount === 90, `${computeDose(bolus, 60)!.amount} mL`);
    check('M9 LAST lipid bolus 90 kg = 100 mL', computeDose(bolus, 90)!.amount === 100, `${computeDose(bolus, 90)!.amount} mL`);
  }
  // ── M9 dantrolene range (QRH 3-8: 2–3 mg/kg) and the arrest's shock counting
  const mh = CRISES.find((c) => c.id === 'mh');
  if (mh) {
    const d = computeDose(mh.actions.find((a) => a.id === 'dantrolene')!.dose, 70)!;
    check('M9 MH dantrolene 70 kg = 140–210 mg', d.amount === 140 && d.amountHigh === 210, `${d.amount}–${d.amountHigh} mg`);
    const both = simulateTimeline('mh', [{ id: 'help', atSec: 0 }, { id: 'trigger', atSec: 10 }, { id: 'dantrolene', atSec: 20 }]).vitals;
    const dantOnly = simulateTimeline('mh', [{ id: 'help', atSec: 0 }, { id: 'dantrolene', atSec: 20 }]).vitals;
    const lowered = simulateTimeline('mh', [{ id: 'help', atSec: 0 }, { id: 'lowerSevo', atSec: 10 }, { id: 'dantrolene', atSec: 20 }]).vitals;
    check('M9 MH: trigger off + dantrolene resolves; dantrolene with trigger on does not', both.etco2 < 50 && both.hr < 100 && dantOnly.etco2 > 60 && dantOnly.hr > 120, `both HR ${Math.round(both.hr)} EtCO2 ${Math.round(both.etco2)} / dantrolene only HR ${Math.round(dantOnly.hr)} EtCO2 ${Math.round(dantOnly.etco2)}`);
    check('M9 MH: turning the volatile down is not removing the trigger', lowered.etco2 > 60, `EtCO2 ${Math.round(lowered.etco2)}`);
  }
  if (CRISES.some((c) => c.id === 'arrest')) {
    const at = (ids: [string, number][]) => ids.map(([id, atSec]) => ({ id, atSec }));
    const oneShock = simulateTimeline('arrest', at([['help', 0], ['cpr', 5], ['pads', 30], ['shock', 40]])).vitals;
    const timed = simulateTimeline('arrest', at([['help', 0], ['cpr', 5], ['pads', 30], ['shock', 40], ['shock', 160], ['shock', 280]]));
    // Three shocks 10 s apart (stacked, pads put on after the arrest): only the first counts → still VF.
    const rapid = simulateTimeline('arrest', at([['help', 0], ['cpr', 5], ['pads', 30], ['shock', 40], ['shock', 50], ['shock', 60]]));
    // Correct shocks but no CPR: no ROSC in this scenario.
    const noCpr = simulateTimeline('arrest', at([['help', 0], ['pads', 30], ['shock', 40], ['shock', 160], ['shock', 280]])).vitals;
    const rosc = timed.log.length > 0 && timed.vitals.rhythm === 'ROSC';
    check('M9 arrest: one shock leaves refractory VF, three shocks 2 min apart + CPR → ROSC', oneShock.rhythm === 'VF' && rosc, `${oneShock.rhythm} / ${timed.vitals.rhythm}`);
    check('M9 arrest: three rapid shocks do not count as three cycles (still VF)', rapid.vitals.rhythm === 'VF', rapid.vitals.rhythm);
    check('M9 arrest: correct shocks without CPR → no ROSC', noCpr.rhythm === 'VF', noCpr.rhythm);
    const arrestP = CRISES.find((c) => c.id === 'arrest')!;
    const rapidIssues = arrestP.timingIssues?.(rapid.log, rapid.tSec) ?? [];
    check('M9 arrest: premature shocks are reported in the debrief', rapidIssues.filter((i) => i.id === 'shock').length === 2, `${rapidIssues.length} issue(s)`);
    const timedIssues = arrestP.timingIssues?.(timed.log, timed.tSec) ?? [];
    check('M9 arrest: the guideline timeline has no timing issue', timedIssues.length === 0, timedIssues.map((i) => i.text.en).join(' | ') || 'none');
  }
  // ── M9 eclampsia (WHO MCPC 2017): BP treated below 160/110 but not below normal; no maintenance → relapse
  if (CRISES.some((c) => c.id === 'eclampsia')) {
    const full = simulate('eclampsia', ['help', 'position', 'mgLoad', 'bp', 'mgMaint', 'monitor', 'birth']);
    check('M9 eclampsia: treated BP < 160/110 and SBP ≥ 120', full.sbp < 160 && full.dbp < 110 && full.sbp >= 120, `${Math.round(full.sbp)}/${Math.round(full.dbp)}`);
    const p = CRISES.find((c) => c.id === 'eclampsia')!;
    let run = startRun(p);
    for (const a of ['help', 'position', 'mgLoad', 'bp']) run = doAction(p, run, a);
    let minSpo2 = 100;
    while (!run.ended) {
      run = stepRun(p, run, 0.5, 68);
      if (run.tSec > 420) minSpo2 = Math.min(minSpo2, run.vitals.spo2);
    }
    check('M9 eclampsia: loading dose without maintenance → seizures recur', minSpo2 < 93, `SpO2 nadir ${Math.round(minSpo2)} % after 7 min`);
  }

  for (const p of CRISES) {
    const ids = new Set([...p.actions.map((a) => a.id), ...p.distractors.map((d) => d.id)]);
    const unknown = modelSequence(p).filter((id) => !ids.has(id));
    const clash = p.actions.filter((a) => p.distractors.some((d) => d.id === a.id)).map((a) => a.id);
    check(`M9 ${p.id}: model sequence and ids are consistent`, unknown.length === 0 && clash.length === 0, unknown.concat(clash).join(', ') || `${modelSequence(p).length} steps`);
  }
  for (const p of CRISES)
    for (const a of p.actions)
      if (a.dose?.max !== undefined) {
        const d = computeDose(a.dose, 200)!;
        check(`M9 ${p.id}/${a.id}: dose capped at source maximum`, d.amount <= a.dose.max, `${d.amount} ${a.dose.unit} ≤ ${a.dose.max}`);
      }

  // ── M10 data integrity
  for (const s of SCORES) {
    check(`M10 ${s.id}: claim registered`, claimIds.has(s.claimId), s.claimId);
    const max = s.items.reduce((m, it) => m + Math.max(...it.options.map((o) => o.points)), 0);
    const min = s.items.reduce((m, it) => m + Math.min(...it.options.map((o) => o.points)), 0);
    const gaps: number[] = [];
    for (let t = min; t <= max; t++) if (!bandFor(s, t)) gaps.push(t);
    check(`M10 ${s.id}: risk table covers ${min}–${max}`, gaps.length === 0, gaps.length ? `no band for ${gaps.join(',')}` : `${s.bands.length} bands`);
  }
  for (const c of CASES) {
    const bad: string[] = [];
    for (const [sid, items] of Object.entries(c.answers)) {
      const s = SCORES.find((x) => x.id === sid);
      if (!s) { bad.push(sid); continue; }
      for (const [iid, idx] of Object.entries(items)) {
        const it = s.items.find((x) => x.id === iid);
        if (!it || !it.options[idx]) bad.push(`${sid}.${iid}`);
      }
    }
    for (const t of c.teaching) if (!claimIds.has(t.claimId)) bad.push(t.claimId);
    check(`M10 case ${c.id}: answer key and claims valid`, bad.length === 0, bad.length ? bad.join(', ') : 'ok');
  }
  for (const f of FASTING) check(`M10 fasting ${f.id}: claim registered`, claimIds.has(f.claimId), `${f.hours} h`);
  void scoreTotal;
}
