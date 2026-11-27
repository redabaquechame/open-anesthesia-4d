import type { ScoreDef } from './preopTypes';

/** Sum of the points of the picked options (index 0 when an item is not answered). */
export function scoreTotal(def: ScoreDef, picks: Record<string, number> | undefined): number {
  return def.items.reduce((sum, it) => sum + (it.options[picks?.[it.id] ?? 0]?.points ?? 0), 0);
}

export function bandFor(def: ScoreDef, total: number) {
  return def.bands.find((b) => total >= b.min && (b.max === undefined || total <= b.max));
}

/** Band from the total, unless the source's extra rule says otherwise (e.g. STOP-Bang high-risk rule). */
export function bandForPicks(def: ScoreDef, picks: Record<string, number> | undefined) {
  const byTotal = bandFor(def, scoreTotal(def, picks));
  const o = def.bandOverride?.(picks ?? {});
  if (o === undefined) return byTotal;
  const forced = def.bands[o];
  // The override can only raise the class.
  return byTotal && def.bands.indexOf(byTotal) > o ? byTotal : forced;
}
