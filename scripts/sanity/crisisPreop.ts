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
    const treated = simulate(p.id, modelSequence(p));
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
  }
  if (CRISES.some((c) => c.id === 'arrest')) {
    const oneShock = simulate('arrest', ['help', 'cpr', 'pads', 'shock']);
    const threeShocks = simulate('arrest', ['help', 'cpr', 'pads', 'shock', 'shock', 'shock']);
    check('M9 arrest: one shock leaves refractory VF, three shocks + CPR → ROSC', oneShock.rhythm === 'VF' && threeShocks.rhythm === 'ROSC', `${oneShock.rhythm} / ${threeShocks.rhythm}`);
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
