/**
 * Data model for M10 (pre-operative assessment).
 * Score items, points and risk tables live in preopScores.ts and must match the original
 * validation paper / official statement; each score points at a claim in claimRegistry.ts.
 */
export type Txt = { fr: string; en: string };

export interface ScoreOption {
  label: Txt;
  points: number;
}

export interface ScoreItem {
  id: string;
  label: Txt;
  /** Exact definition / threshold from the source. */
  hint?: Txt;
  /** Two options (no / yes) for a binary item; more for graded items. Index 0 is the default. */
  options: ScoreOption[];
}

export interface RiskBand {
  /** Inclusive lower bound of the total. */
  min: number;
  /** Inclusive upper bound (omit for open-ended). */
  max?: number;
  label: Txt;
  /** Outcome risk as reported by the source, with its outcome definition. */
  risk: Txt;
  tone: 'ok' | 'warn' | 'bad';
}

export interface ScoreDef {
  id: string;
  name: Txt;
  /** What the score predicts, in the source's words (paraphrased). */
  predicts: Txt;
  items: ScoreItem[];
  bands: RiskBand[];
  /** Limits stated by the authors or by later guidelines. */
  limits?: Txt;
  /** Extra classification rule from the source that a points total cannot express (returns a band index). */
  bandOverride?: (picks: Record<string, number>) => number | undefined;
  claimId: string;
  evidenceId?: string;
}

export interface PreopCase {
  id: string;
  title: Txt;
  /** The case as a resident would read it in the clinic. */
  story: Txt;
  /** scoreId → itemId → option index (the answer key). */
  answers: Record<string, Record<string, number>>;
  /** Teaching points for the case (each backed by a claim). */
  teaching: { text: Txt; claimId: string }[];
}

export interface FastingRule {
  id: string;
  intake: Txt;
  /** Minimum hours before induction. */
  hours: number;
  population: 'adult' | 'child' | 'both';
  claimId: string;
  note?: Txt;
}
