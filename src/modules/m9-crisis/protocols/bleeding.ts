/**
 * Massive peri-operative bleeding in elective surgery — graded recommendations from the ESAIC
 * guideline on severe peri-operative bleeding, second update 2022 (Kietaibl et al., EJA 2023,
 * full text). "Call for help" and "surgical control" are standard crisis steps (from memory).
 */
import type { CrisisProtocol } from '../crisisTypes';
import { after } from './shared';

export const BLEEDING: CrisisProtocol = {
  id: 'bleeding',
  title: { fr: 'Hémorragie peropératoire massive', en: 'Massive peri-operative bleeding' },
  stem: {
    fr: 'Femme de 60 ans, 75 kg, hépatectomie programmée : saignement brutal et non contrôlé. PAS 70 mmHg, FC 130, 2 L dans l’aspiration en 15 min.',
    en: '60-year-old woman, 75 kg, elective liver resection: sudden uncontrolled bleeding. SBP 70 mmHg, HR 130, 2 L in the suction in 15 min.',
  },
  caseWeightKg: 75,
  recognition: [
    {
      fr: 'Saignement chirurgical rapide avec instabilité hémodynamique ; coagulopathie, hypothermie, acidose et hypocalcémie s’aggravent mutuellement.',
      en: 'Rapid surgical bleeding with haemodynamic instability; coagulopathy, hypothermia, acidosis and low calcium worsen each other.',
    },
  ],
  actions: [
    { id: 'help', label: { fr: 'Appeler à l’aide, déclencher le protocole de transfusion massive', en: 'Call for help, activate the massive transfusion protocol' }, critical: true, claimId: 'm9-bleed-team' },
    { id: 'surgical', label: { fr: 'Informer le chirurgien : contrôle chirurgical du saignement', en: 'Tell the surgeon: surgical control of the bleeding' }, critical: true, claimId: 'm9-bleed-team' },
    {
      id: 'mtp',
      label: { fr: 'Transfusion massive : plasma:CGR ≥ 1:1', en: 'Massive transfusion: plasma:RBC ≥ 1:1' },
      detail: { fr: 'ESAIC (2C) : saignement massif précoce et non contrôlé en chirurgie programmée (≥ 6–10 CGR).', en: 'ESAIC (2C): early uncontrolled massive bleeding in elective surgery (≥ 6–10 units).' },
      critical: true,
      repeatable: true,
      claimId: 'm9-bleed-esaic',
    },
    {
      id: 'goal',
      label: { fr: 'Passer au plus vite à une stratégie guidée (biologie, tests viscoélastiques)', en: 'Switch to goal-directed therapy as soon as possible (labs, viscoelastic tests)' },
      detail: { fr: 'ESAIC (1C). Ex. : fibrinogène si déficit ; CCP plutôt que PFC pour un déficit en facteurs (1B).', en: 'ESAIC (1C). E.g. fibrinogen for a deficit; PCC rather than FFP for factor deficiency (1B).' },
      critical: true,
      claimId: 'm9-bleed-esaic',
    },
    { id: 'calcium', label: { fr: 'Calcium : maintenir le Ca ionisé > 0,9 mmol/L', en: 'Calcium: keep ionised Ca > 0.9 mmol/L' }, critical: true, claimId: 'm9-bleed-esaic' },
    { id: 'warm', label: { fr: 'Maintenir la normothermie', en: 'Maintain normothermia' }, detail: { fr: 'Réchauffeur de solutés, couverture chauffante.', en: 'Fluid warmer, forced-air warming.' }, critical: true, claimId: 'm9-bleed-esaic' },
    { id: 'hbTarget', label: { fr: 'Cible d’hémoglobine 7–9 g/dL pendant le saignement', en: 'Target haemoglobin 7–9 g/dL while bleeding' }, critical: false, claimId: 'm9-bleed-esaic' },
    {
      id: 'txa',
      label: { fr: 'Acide tranexamique', en: 'Tranexamic acid' },
      detail: {
        fr: 'ESAIC donne des doses par contexte (post-partum : 1 g IV dans les 3 h ; chirurgie gynécologique : 1 g ou 10–15 mg/kg) mais pas de dose unique pour toute hémorragie chirurgicale.',
        en: 'ESAIC gives doses by setting (postpartum: 1 g IV within 3 h; gynaecological surgery: 1 g or 10–15 mg/kg) but no single dose for all surgical bleeding.',
      },
      critical: false,
      claimId: 'm9-bleed-esaic',
    },
  ],
  distractors: [
    { id: 'saline', label: { fr: 'Plusieurs litres de NaCl 0,9 %', en: 'Several litres of 0.9% saline' }, why: { fr: 'ESAIC suggère des cristalloïdes balancés (2C).', en: 'ESAIC suggests balanced crystalloids (2C).' }, claimId: 'm9-bleed-esaic' },
    { id: 'rf7', label: { fr: 'Facteur VIIa recombinant d’emblée', en: 'Recombinant factor VIIa straight away' }, why: { fr: 'Seulement pour un saignement réfractaire, avec correction du pH (2B).', en: 'Only for intractable bleeding, alongside pH correction (2B).' }, claimId: 'm9-bleed-esaic' },
    { id: 'hb10', label: { fr: 'Transfuser jusqu’à Hb > 10 g/dL', en: 'Transfuse to Hb > 10 g/dL' }, why: { fr: 'Cible 7–9 g/dL pendant le saignement actif (1B).', en: 'Target 7–9 g/dL during active bleeding (1B).' }, claimId: 'm9-bleed-esaic' },
  ],
  initial: { hr: 130, sbp: 70, dbp: 40, spo2: 97, etco2: 30, tempC: 35.9, rhythm: 'sinusTachy' },
  target: (t, done) => {
    const ctrl = after(done, 'surgical', t, 60);
    const blood = after(done, 'mtp', t, 30);
    const temp = done.has('warm') ? 36.6 : 34.8;
    if (ctrl && blood) return { hr: 96, sbp: 108, dbp: 62, spo2: 98, etco2: 36, tempC: temp, rhythm: 'sinus' };
    if (blood) return { hr: 112, sbp: 88, dbp: 50, spo2: 97, etco2: 33, tempC: temp, rhythm: 'sinusTachy' };
    if (t > 300) return { hr: 0, sbp: 0, dbp: 0, spo2: 75, etco2: 10, tempC: temp, rhythm: 'PEA' };
    return { hr: 145, sbp: 55, dbp: 28, spo2: 95, etco2: 24, tempC: temp, rhythm: 'sinusTachy' };
  },
  durationSec: 480,
  claimIds: ['m9-bleed-esaic', 'm9-bleed-team', 'm9-dynamics'],
  evidenceId: 'esaic-bleeding-2023',
  localNotes: [
    { region: 'ma', resourceId: 'ma-smaar-transfusion-massive', text: { fr: 'Maroc (protocole SMAR/SMMUC) : déclenchement si score TASH > 18 ; 4 CGR O négatif à 30 min, puis 4 CGR + 4 PFC + fibrinogène 3 g + calcium 1 g + acide tranexamique 1 g à 60 min.', en: 'Morocco (SMAR/SMMUC): trigger at TASH > 18; 4 O-negative RBC at 30 min, then 4 RBC + 4 FFP + fibrinogen 3 g + calcium 1 g + tranexamic acid 1 g at 60 min.' } },
    { region: 'fr', resourceId: 'fr-sfar-choc-hemo-2015', text: { fr: 'France (RFE SFAR 2015) : PAS 80–90 mmHg jusqu’au contrôle du saignement ; Hb 7–9 g/dl ; acide tranexamique 1 g en 10 min puis 1 g en 8 h.', en: 'France (SFAR 2015): SBP 80–90 mmHg until bleeding is controlled; Hb 7–9 g/dL; tranexamic acid 1 g over 10 min then 1 g over 8 h.' } },
  ],
};
