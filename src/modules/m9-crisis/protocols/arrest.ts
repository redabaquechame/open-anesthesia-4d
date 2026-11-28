/**
 * In-hospital VF cardiac arrest — drug and shock steps from the Resuscitation Council UK 2025
 * Adult ALS guideline (full PDF), which adapts the ERC 2025 ALS chapter. The ERC chapter itself
 * could not be opened (bot check), so the claim notes this is the UK adaptation.
 */
import type { CrisisProtocol, LogEntry, TimingIssue } from '../crisisTypes';

/** RCUK/ERC 2025: one shock, then 2 minutes of CPR before the next rhythm check. */
export const CPR_CYCLE_SEC = 120;
/** A shock counts as a new cycle's shock only if at least this long after the previous counted shock
 *  (10 s tolerance for the rhythm check itself). Simulator rule. */
export const MIN_SHOCK_INTERVAL_SEC = 110;

export interface ArrestState {
  padsAt: number | null;
  cprAt: number | null;
  /** Times of the shocks that count (one per 2-minute cycle, pads on). */
  shocks: number[];
  /** Shocks given before the 2-minute cycle was complete, or without pads. */
  premature: { tSec: number; why: 'noPads' | 'early' }[];
  /** Scenario script: ROSC is seen at the rhythm check after the 3rd counted shock, if CPR was running. */
  roscAt: number | null;
}

/** Pure reading of the action log: what the defibrillation sequence really was. */
export function arrestState(log: LogEntry[]): ArrestState {
  let padsAt: number | null = null;
  let cprAt: number | null = null;
  const shocks: number[] = [];
  const premature: ArrestState['premature'] = [];
  for (const l of [...log].sort((a, b) => a.seq - b.seq)) {
    if (l.id === 'pads' && padsAt === null) padsAt = l.tSec;
    if (l.id === 'cpr' && cprAt === null) cprAt = l.tSec;
    if (l.id !== 'shock') continue;
    if (padsAt === null) premature.push({ tSec: l.tSec, why: 'noPads' });
    else if (shocks.length > 0 && l.tSec - shocks[shocks.length - 1] < MIN_SHOCK_INTERVAL_SEC) premature.push({ tSec: l.tSec, why: 'early' });
    else shocks.push(l.tSec);
  }
  const roscAt = shocks.length >= 3 && cprAt !== null && cprAt <= shocks[1] ? shocks[2] + CPR_CYCLE_SEC : null;
  return { padsAt, cprAt, shocks, premature, roscAt };
}

function arrestTiming(log: LogEntry[]): TimingIssue[] {
  const st = arrestState(log);
  const issues: TimingIssue[] = [];
  for (const pr of st.premature)
    issues.push({
      id: 'shock',
      tSec: pr.tSec,
      claimId: 'm9-arrest-timing',
      text:
        pr.why === 'noPads'
          ? { fr: 'Choc demandé sans électrodes posées : non délivré.', en: 'Shock requested without pads attached: not delivered.' }
          : {
              fr: 'Choc avant la fin du cycle de 2 min de massage : il ne compte pas. Après chaque choc, reprendre immédiatement le massage pendant 2 min avant d’analyser le rythme.',
              en: 'Shock before the 2-minute CPR cycle was complete: it does not count. After each shock, resume CPR at once for 2 minutes before the rhythm check.',
            },
    });
  const third = st.shocks[2];
  for (const l of log) {
    if ((l.id === 'adrenaline' || l.id === 'amiodarone') && (third === undefined || l.tSec < third))
      issues.push({
        id: l.id,
        tSec: l.tSec,
        claimId: 'm9-arrest-als',
        text:
          l.id === 'adrenaline'
            ? { fr: 'Adrénaline avant le 3e choc : en rythme choquable, elle se donne après le 3e choc, puis toutes les 3–5 min.', en: 'Adrenaline before the 3rd shock: in a shockable rhythm it is given after the 3rd shock, then every 3–5 min.' }
            : { fr: 'Amiodarone avant le 3e choc : 300 mg après 3 chocs (150 mg après 5).', en: 'Amiodarone before the 3rd shock: 300 mg after 3 shocks (150 mg after 5).' },
      });
    if (l.id === 'adrenalineFirst')
      issues.push({ id: l.id, tSec: l.tSec, claimId: 'm9-arrest-als', text: { fr: 'Adrénaline avant le premier choc : retarde la défibrillation, qui est la priorité en FV.', en: 'Adrenaline before the first shock: delays defibrillation, the priority in VF.' } });
  }
  if (st.cprAt === null)
    issues.push({ id: 'cpr', tSec: 0, claimId: 'm9-arrest-cpr', text: { fr: 'Aucun massage cardiaque : sans massage, pas de retour de circulation dans ce scénario.', en: 'No chest compressions: without CPR there is no return of circulation in this scenario.' } });
  return issues.sort((a, b) => a.tSec - b.tSec);
}

export const ARREST: CrisisProtocol = {
  id: 'arrest',
  title: { fr: 'Arrêt cardiaque en FV (rythme choquable)', en: 'VF cardiac arrest (shockable rhythm)' },
  stem: {
    fr: 'Homme de 65 ans, 80 kg, en SSPI sous monitorage : il devient aréactif, sans pouls ; fibrillation ventriculaire au scope. Le défibrillateur est dans le couloir : les électrodes ne sont pas encore posées.',
    en: '65-year-old man, 80 kg, monitored in recovery: he becomes unresponsive with no pulse; ventricular fibrillation on the monitor. The defibrillator is in the corridor: pads are not on yet.',
  },
  caseWeightKg: 80,
  recognition: [
    { fr: 'Aréactif, pas de respiration normale ni de pouls ; FV ou TV sans pouls = rythme choquable.', en: 'Unresponsive, no normal breathing, no pulse; VF or pulseless VT = shockable rhythm.' },
    {
      fr: 'Causes réversibles : 4 H (hypoxie, hypovolémie, troubles électrolytiques, hypothermie) et 4 T (tamponnade, pneumothorax sous tension, thrombose, toxiques).',
      en: 'Reversible causes: 4 Hs (hypoxia, hypovolaemia, electrolytes, hypothermia) and 4 Ts (tamponade, tension pneumothorax, thrombosis, toxins).',
    },
  ],
  actions: [
    { id: 'help', label: { fr: 'Appeler l’équipe de réanimation', en: 'Call the resuscitation team' }, critical: true, claimId: 'm9-arrest-als' },
    {
      id: 'cpr',
      label: { fr: 'Massage cardiaque 30:2', en: 'Start CPR 30:2' },
      detail: { fr: '100–120/min, 5–6 cm, relâchement complet ; interruptions < 5 s.', en: '100–120/min, 5–6 cm, full recoil; pauses < 5 s.' },
      critical: true,
      claimId: 'm9-arrest-cpr',
    },
    { id: 'pads', label: { fr: 'Poser les électrodes du défibrillateur', en: 'Attach defibrillator pads' }, critical: true, claimId: 'm9-arrest-als' },
    {
      id: 'shock',
      label: { fr: 'Choc puis reprise immédiate du massage (2 min)', en: 'Shock, then resume CPR at once (2 min)' },
      detail: { fr: 'Biphasique : 1er choc ≥ 150 J, augmenter en cas d’échec ; en cas de doute, énergie maximale.', en: 'Biphasic: first shock ≥ 150 J, increase if it fails; if unsure, use the highest setting.' },
      critical: true,
      repeatable: true,
      dose: { fixed: 150, unit: 'J', route: { fr: 'biphasique, au moins', en: 'biphasic, at least' } },
      claimId: 'm9-arrest-als',
    },
    {
      id: 'adrenaline',
      label: { fr: 'Adrénaline 1 mg IV après le 3e choc', en: 'Adrenaline 1 mg IV after the 3rd shock' },
      detail: { fr: 'Puis toutes les 3–5 min. Patient monitoré avec cathéter artériel : bolus de 50–100 µg plutôt que 1 mg.', en: 'Then every 3–5 min. Monitored patient with an arterial line: 50–100 µg increments rather than 1 mg.' },
      critical: true,
      repeatable: true,
      dose: { fixed: 1, unit: 'mg', route: 'IV' },
      claimId: 'm9-arrest-als',
    },
    {
      id: 'amiodarone',
      label: { fr: 'Amiodarone 300 mg IV après 3 chocs', en: 'Amiodarone 300 mg IV after 3 shocks' },
      detail: { fr: '150 mg après 5 chocs. Alternative : lidocaïne 100 mg (+ 50 mg après 5 chocs).', en: '150 mg after 5 shocks. Alternative: lidocaine 100 mg (+ 50 mg after 5 shocks).' },
      critical: true,
      dose: { fixed: 300, unit: 'mg', route: 'IV' },
      claimId: 'm9-arrest-als',
    },
    { id: 'causes', label: { fr: 'Rechercher et traiter les 4 H / 4 T', en: 'Look for and treat the 4 Hs / 4 Ts' }, critical: true, claimId: 'm9-arrest-cpr' },
    { id: 'airway', label: { fr: 'Voie aérienne avancée + capnographie, 10 insufflations/min', en: 'Advanced airway + waveform capnography, 10 breaths/min' }, critical: false, claimId: 'm9-arrest-als' },
  ],
  distractors: [
    { id: 'adrenalineFirst', label: { fr: 'Adrénaline 1 mg avant le premier choc', en: 'Adrenaline 1 mg before the first shock' }, why: { fr: 'Rythme choquable : adrénaline après le 3e choc.', en: 'Shockable rhythm: adrenaline after the 3rd shock.' }, claimId: 'm9-arrest-als' },
    { id: 'calcium', label: { fr: 'Calcium systématique', en: 'Routine calcium' }, why: { fr: 'Pas de calcium systématique.', en: 'No routine calcium.' }, claimId: 'm9-arrest-als' },
    { id: 'bicarb', label: { fr: 'Bicarbonate de sodium systématique', en: 'Routine sodium bicarbonate' }, why: { fr: 'Pas de bicarbonate systématique.', en: 'No routine bicarbonate.' }, claimId: 'm9-arrest-als' },
  ],
  initial: { hr: 0, sbp: 0, dbp: 0, spo2: 90, etco2: 8, tempC: 36.4, rhythm: 'VF' },
  // Scenario script (claim m9-arrest-scenario), not a prediction: refractory VF that converts at the rhythm
  // check after the third counted shock, only if CPR is running. Shocks must be one per 2-minute cycle.
  target: (t, done, _w, _counts, log) => {
    const cpr = done.has('cpr');
    const st = arrestState(log);
    if (st.roscAt !== null && t >= st.roscAt) return { hr: 98, sbp: 104, dbp: 62, spo2: 96, etco2: 38, rhythm: 'ROSC' };
    return { hr: 0, sbp: 0, dbp: 0, spo2: cpr ? 85 : 60, etco2: cpr ? 18 : 5, rhythm: 'VF' };
  },
  modelSequence: ['help', 'cpr', 'pads', 'shock', 'shock', 'shock', 'adrenaline', 'amiodarone', 'causes'],
  modelTimeline: [
    { id: 'help', atSec: 0 },
    { id: 'cpr', atSec: 5 },
    { id: 'pads', atSec: 30 },
    { id: 'shock', atSec: 40 },
    { id: 'shock', atSec: 160 },
    { id: 'shock', atSec: 280 },
    { id: 'adrenaline', atSec: 290 },
    { id: 'amiodarone', atSec: 295 },
    { id: 'causes', atSec: 300 },
  ],
  timingIssues: (log) => arrestTiming(log),
  cycle: (log, tNow) => {
    const st = arrestState(log);
    if (st.roscAt !== null && tNow >= st.roscAt) return null;
    const last = st.shocks.length ? st.shocks[st.shocks.length - 1] : st.cprAt;
    if (last === null) return null;
    const remaining = CPR_CYCLE_SEC - ((tNow - last) % CPR_CYCLE_SEC);
    return { label: { fr: 'Cycle de massage : analyse du rythme dans', en: 'CPR cycle: rhythm check in' }, remainingSec: remaining };
  },
  durationSec: 600,
  claimIds: ['m9-arrest-als', 'm9-arrest-cpr', 'm9-arrest-timing', 'm9-arrest-scenario', 'm9-dynamics'],
  evidenceId: 'rcuk-als-2025',
  localNotes: [
    { region: 'ma', resourceId: 'ma-smaar-arret-2021', text: { fr: 'Maroc : appeler le 15 ou le 141 (SAMU).', en: 'Morocco: call 15 or 141 (SAMU).' } },
    { region: 'fr', resourceId: 'fr-sfar-uvih-2026', text: { fr: 'France (RFE 2026) : équipe d’urgence vitale sur place en moins de 5 min, 24 h/24.', en: 'France (2026 guideline): in-hospital emergency team on scene in under 5 min, 24/7.' } },
    { region: 'ca', resourceId: 'ca-hsf-acls-2025', text: { fr: 'Canada (Cœur + AVC 2025) : après retour à une circulation spontanée, PAM ≥ 65 mmHg.', en: 'Canada (Heart & Stroke 2025): after ROSC, MAP ≥ 65 mmHg.' } },
  ],
};
