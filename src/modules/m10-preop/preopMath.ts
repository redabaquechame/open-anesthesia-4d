import type { ScoreDef } from './preopTypes';

/**
 * An unanswered item is UNKNOWN, never "absent" (audit F36): scores are only computed once every
 * item has an explicit answer, so missing information is never silently read as a negative finding.
 * (Simulator rule: the original score papers do not define a missing-item policy.)
 */
export type Picks = Record<string, number> | undefined;

export function answeredCount(def: ScoreDef, picks: Picks): number {
  return def.items.filter((it) => picks?.[it.id] !== undefined).length;
}

export function isComplete(def: ScoreDef, picks: Picks): boolean {
  return answeredCount(def, picks) === def.items.length;
}

/** Sum of the points of the answered items; null while any item is unanswered. */
export function scoreTotal(def: ScoreDef, picks: Picks): number | null {
  if (!isComplete(def, picks)) return null;
  return def.items.reduce((sum, it) => sum + (it.options[picks![it.id]]?.points ?? 0), 0);
}

export function bandFor(def: ScoreDef, total: number) {
  return def.bands.find((b) => total >= b.min && (b.max === undefined || total <= b.max));
}

/** Band from the total, unless the source's extra rule says otherwise (e.g. STOP-Bang high-risk rule).
 *  Undefined while the score is incomplete. */
export function bandForPicks(def: ScoreDef, picks: Picks) {
  const total = scoreTotal(def, picks);
  if (total === null) return undefined;
  const byTotal = bandFor(def, total);
  const o = def.bandOverride?.(picks ?? {});
  if (o === undefined) return byTotal;
  const forced = def.bands[o];
  // The override can only raise the class.
  return byTotal && def.bands.indexOf(byTotal) > o ? byTotal : forced;
}

/** Case marking: an unanswered item is wrong, whatever the expected option is. */
export function itemCorrect(expected: number, given: number | undefined): boolean {
  return given !== undefined && given === expected;
}
