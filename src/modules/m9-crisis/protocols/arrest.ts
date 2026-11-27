/**
 * In-hospital VF cardiac arrest — drug and shock steps from the Resuscitation Council UK 2025
 * Adult ALS guideline (full PDF), which adapts the ERC 2025 ALS chapter. The ERC chapter itself
 * could not be opened (bot check), so the claim notes this is the UK adaptation.
 */
import type { CrisisProtocol } from '../crisisTypes';

export const ARREST: CrisisProtocol = {
  id: 'arrest',
  title: { fr: 'Arrêt cardiaque en FV (rythme choquable)', en: 'VF cardiac arrest (shockable rhythm)' },
  stem: {
    fr: 'Homme de 65 ans, 80 kg, en SSPI sous monitorage : il devient aréactif, sans pouls ; fibrillation ventriculaire au scope.',
    en: '65-year-old man, 80 kg, monitored in recovery: he becomes unresponsive with no pulse; ventricular fibrillation on the monitor.',
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
  target: (_t, done, _w, counts) => {
    const shocks = counts.get('shock') ?? 0;
    const cpr = done.has('cpr');
    // Teaching shape: refractory VF that converts after the third shock with ongoing CPR.
    if (cpr && done.has('pads') && shocks >= 3) return { hr: 98, sbp: 104, dbp: 62, spo2: 96, etco2: 38, rhythm: 'ROSC' };
    return { hr: 0, sbp: 0, dbp: 0, spo2: cpr ? 85 : 60, etco2: cpr ? 22 : 5, rhythm: 'VF' };
  },
  modelSequence: ['help', 'cpr', 'pads', 'shock', 'shock', 'shock', 'adrenaline', 'amiodarone', 'causes'],
  durationSec: 480,
  claimIds: ['m9-arrest-als', 'm9-arrest-cpr', 'm9-dynamics'],
  evidenceId: 'rcuk-als-2025',
  localNotes: [
    { region: 'ma', resourceId: 'ma-smaar-arret-2021', text: { fr: 'Maroc : appeler le 15 ou le 141 (SAMU).', en: 'Morocco: call 15 or 141 (SAMU).' } },
    { region: 'fr', resourceId: 'fr-sfar-uvih-2026', text: { fr: 'France (RFE 2026) : équipe d’urgence vitale sur place en moins de 5 min, 24 h/24.', en: 'France (2026 guideline): in-hospital emergency team on scene in under 5 min, 24/7.' } },
    { region: 'ca', resourceId: 'ca-hsf-acls-2025', text: { fr: 'Canada (Cœur + AVC 2025) : après retour à une circulation spontanée, PAM ≥ 65 mmHg.', en: 'Canada (Heart & Stroke 2025): after ROSC, MAP ≥ 65 mmHg.' } },
  ],
};
