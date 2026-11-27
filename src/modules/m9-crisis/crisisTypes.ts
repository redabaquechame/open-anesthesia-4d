/**
 * Data model for the M9 crisis trainer.
 *
 * Clinical content (recognition signs, ordered actions, doses) lives in crisisProtocols.ts and
 * must come from the guideline text that was actually opened; each action points at a claim in
 * src/standards/claimRegistry.ts. The vital-sign dynamics are a simulator model (illustrative).
 */

export type Txt = { fr: string; en: string };

export type Rhythm = 'sinus' | 'sinusTachy' | 'VF' | 'PEA' | 'asystole' | 'ROSC';

export interface Vitals {
  hr: number; // /min (0 when no output)
  sbp: number; // mmHg
  dbp: number; // mmHg
  spo2: number; // %
  etco2: number; // mmHg
  tempC: number;
  rhythm: Rhythm;
}

/** A weight-based dose. Values must match the cited source exactly. */
export interface DoseRule {
  /** Per-kg amount in `unit` per kg. */
  perKg?: number;
  /** Upper end when the source gives a per-kg range (e.g. dantrolene 2–3 mg/kg). */
  perKgHigh?: number;
  /** Fixed amount in `unit` (used when no perKg, or as the adult dose). */
  fixed?: number;
  /** Cap in `unit` (from the source; omit if the source gives none). */
  max?: number;
  /** Above this weight the source gives a fixed amount instead of the per-kg dose (e.g. ASRA lipid > 70 kg). */
  fixedAboveKg?: { kg: number; amount: number };
  unit: 'mg' | 'µg' | 'mL' | 'g' | 'J' | 'mmol' | 'IU';
  route: string | Txt;
}

export interface CrisisAction {
  id: string;
  label: Txt;
  /** Short paraphrase of the guideline step, shown in the debrief. */
  detail?: Txt;
  /** Part of the guideline's core sequence: missing it is flagged in the debrief. */
  critical: boolean;
  /** Only when the source states a time target for this step. */
  targetSec?: number;
  dose?: DoseRule;
  /** Can be given more than once (e.g. repeat boluses). */
  repeatable?: boolean;
  claimId: string;
}

export interface Distractor {
  id: string;
  label: Txt;
  /** Why this is wrong or not a priority, with its source claim when there is one. */
  why: Txt;
  claimId?: string;
}

/** What differs locally (drug availability, national guideline values). Numbers must already be in the
 *  M11 resource's keyPoints, so they are covered by the claim m11-<resourceId>. */
export interface LocalNote {
  region: 'ma' | 'fr' | 'ca' | 'eu';
  text: Txt;
  resourceId: string;
}

export interface CrisisProtocol {
  id: string;
  title: Txt;
  /** One-line case stem shown at the start. */
  stem: Txt;
  /** Patient weight stated in the stem; the weight control starts here. */
  caseWeightKg: number;
  /** Signs the guideline lists for recognising the crisis. */
  recognition: Txt[];
  actions: CrisisAction[];
  distractors: Distractor[];
  initial: Vitals;
  /**
   * Simulator model: the state the vitals relax towards at time t, given the actions done so far.
   * `done` maps action id → time (s) it was first done; `counts` maps action id → times done
   * (for repeatable steps such as shocks).
   */
  target: (tSec: number, done: Map<string, number>, weightKg: number, counts: Map<string, number>) => Partial<Vitals>;
  /**
   * The guideline sequence in order, with repeats (e.g. three shocks). Used by the sanity checks
   * and shown as the model answer in the debrief. Defaults to the critical actions, once each.
   */
  modelSequence?: string[];
  /** Seconds after which an unresolved scenario ends. */
  durationSec: number;
  /** Claim ids that back the scenario as a whole (source, dynamics). */
  claimIds: string[];
  evidenceId: string;
  /** Local context, shown once the diagnosis is known. */
  localNotes?: LocalNote[];
}
