/**
 * M9 crisis engine — pure TS (no DOM) so `npm run sanity` can drive it.
 *
 * Simulator model (illustrative): each vital sign relaxes exponentially towards the protocol's
 * target with its own time constant. The targets encode "untreated → worse, treated → better";
 * they are teaching shapes, not measured time courses.
 */
import type { CrisisProtocol, DoseRule, Txt, Vitals } from './crisisTypes';

const TAU_SEC: Record<keyof Omit<Vitals, 'rhythm'>, number> = {
  hr: 20,
  sbp: 25,
  dbp: 25,
  spo2: 30,
  etco2: 40,
  tempC: 240,
};

export interface CrisisRun {
  tSec: number;
  vitals: Vitals;
  /** action id → first time done (s) */
  done: Map<string, number>;
  /** chronological log */
  log: { tSec: number; id: string; kind: 'action' | 'distractor' }[];
  ended: boolean;
}

export function startRun(p: CrisisProtocol): CrisisRun {
  return { tSec: 0, vitals: { ...p.initial }, done: new Map(), log: [], ended: false };
}

export function stepRun(p: CrisisProtocol, run: CrisisRun, dt: number, weightKg: number): CrisisRun {
  if (run.ended) return run;
  const t = run.tSec + dt;
  const tgt = p.target(t, run.done, weightKg, actionCounts(run));
  const v: Vitals = { ...run.vitals };
  (Object.keys(TAU_SEC) as (keyof typeof TAU_SEC)[]).forEach((k) => {
    const goal = tgt[k];
    if (goal === undefined) return;
    const a = 1 - Math.exp(-dt / TAU_SEC[k]);
    v[k] = v[k] + (goal - v[k]) * a;
  });
  if (tgt.rhythm) v.rhythm = tgt.rhythm;
  // No cardiac output → no pressure, no measured HR, EtCO2 falls unless compressions (handled by target).
  v.spo2 = Math.max(0, Math.min(100, v.spo2));
  return { ...run, tSec: t, vitals: v, ended: t >= p.durationSec };
}

/** How many times each action was done (repeatable steps such as shocks or boluses). */
export function actionCounts(run: CrisisRun): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of run.log) m.set(l.id, (m.get(l.id) ?? 0) + 1);
  return m;
}

/** The guideline order with repeats; defaults to the critical actions once each. */
export function modelSequence(p: CrisisProtocol): string[] {
  return p.modelSequence ?? p.actions.filter((a) => a.critical).map((a) => a.id);
}

export function doAction(p: CrisisProtocol, run: CrisisRun, id: string): CrisisRun {
  if (run.ended) return run;
  const isAction = p.actions.some((a) => a.id === id);
  const done = new Map(run.done);
  if (!done.has(id)) done.set(id, run.tSec);
  return { ...run, done, log: [...run.log, { tSec: run.tSec, id, kind: isAction ? 'action' : 'distractor' }] };
}

/** Dose for a given weight, capped at the source's maximum. Returns null when there is no rule. */
export function computeDose(
  rule: DoseRule | undefined,
  weightKg: number
): { amount: number; amountHigh?: number; capped: boolean } | null {
  if (!rule) return null;
  if (rule.fixedAboveKg && weightKg > rule.fixedAboveKg.kg) return { amount: rule.fixedAboveKg.amount, capped: false };
  if (rule.perKg !== undefined) {
    const cap = (x: number) => (rule.max !== undefined && x > rule.max ? rule.max : x);
    const raw = rule.perKg * weightKg;
    const rawHigh = rule.perKgHigh !== undefined ? rule.perKgHigh * weightKg : undefined;
    const capped = rule.max !== undefined && (raw > rule.max || (rawHigh ?? 0) > rule.max);
    return { amount: cap(raw), amountHigh: rawHigh !== undefined ? cap(rawHigh) : undefined, capped };
  }
  if (rule.fixed !== undefined) return { amount: rule.fixed, capped: false };
  return null;
}

const roundDose = (x: number) => (x >= 100 ? Math.round(x) : x >= 10 ? Math.round(x * 10) / 10 : Math.round(x * 100) / 100);

export function formatDose(rule: DoseRule | undefined, weightKg: number, pick: (t: Txt) => string = (t) => t.en): string | null {
  const d = computeDose(rule, weightKg);
  if (!d || !rule) return null;
  const route = typeof rule.route === 'string' ? rule.route : pick(rule.route);
  const n = d.amountHigh !== undefined && d.amountHigh !== d.amount ? `${roundDose(d.amount)}–${roundDose(d.amountHigh)}` : `${roundDose(d.amount)}`;
  return `${n} ${rule.unit} ${route}${d.capped ? ' (max)' : ''}`;
}

export interface Debrief {
  criticalDone: { id: string; tSec: number; late: boolean }[];
  criticalMissed: string[];
  distractorsChosen: string[];
  /** Critical actions done in the guideline's order / total critical done. */
  orderScore: number;
  finalVitals: Vitals;
}

export function buildDebrief(p: CrisisProtocol, run: CrisisRun): Debrief {
  const critical = p.actions.filter((a) => a.critical);
  const criticalDone = critical
    .filter((a) => run.done.has(a.id))
    .map((a) => ({ id: a.id, tSec: run.done.get(a.id)!, late: a.targetSec !== undefined && run.done.get(a.id)! > a.targetSec }));
  const criticalMissed = critical.filter((a) => !run.done.has(a.id)).map((a) => a.id);
  const distractorsChosen = [...new Set(run.log.filter((l) => l.kind === 'distractor').map((l) => l.id))];
  // Order: count adjacent pairs of done critical actions that follow guideline order.
  const doneOrder = critical.filter((a) => run.done.has(a.id)).map((a) => run.done.get(a.id)!);
  let inOrder = 0;
  for (let i = 1; i < doneOrder.length; i++) if (doneOrder[i] >= doneOrder[i - 1]) inOrder++;
  const orderScore = doneOrder.length <= 1 ? 1 : inOrder / (doneOrder.length - 1);
  return { criticalDone, criticalMissed, distractorsChosen, orderScore, finalVitals: run.vitals };
}
