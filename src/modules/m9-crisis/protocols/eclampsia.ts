/**
 * Eclampsia (convulsion with severe hypertension at 34 weeks).
 * Steps and doses: WHO, Managing complications in pregnancy and childbirth (MCPC), 2nd ed. 2017,
 * pp. S-49 to S-61: general management, Box S-4 (magnesium sulfate regimens), Box S-5 (toxicity)
 * and Table S-13 (acute antihypertensives); full text read. Licence CC BY-NC-SA 3.0 IGO; paraphrased.
 */
import type { CrisisProtocol } from '../crisisTypes';
import { after } from './shared';

export const ECLAMPSIA: CrisisProtocol = {
  id: 'eclampsia',
  title: { fr: 'Éclampsie', en: 'Eclampsia' },
  stem: {
    fr: 'Femme de 31 ans, 68 kg, grossesse de 34 SA, céphalées et vision floue depuis le matin, PA 168/112 au tri. Elle fait sous vos yeux une crise convulsive généralisée.',
    en: '31-year-old woman, 68 kg, 34 weeks pregnant, headache and blurred vision since this morning, BP 168/112 at triage. She has a generalised seizure in front of you.',
  },
  caseWeightKg: 68,
  recognition: [
    {
      fr: 'Convulsions pendant la grossesse ou dans les 6 semaines du post-partum : traiter comme une éclampsie tant qu’une autre cause n’est pas trouvée (OMS).',
      en: 'Convulsions in pregnancy or up to 6 weeks postpartum: manage as eclampsia until another cause is found (WHO).',
    },
    {
      fr: 'Hypertension sévère : PAS ≥ 160 et/ou PAD ≥ 110 mmHg persistantes. Les signes « d’éclampsie imminente » (vision floue, hyperréflexie) ne sont pas fiables.',
      en: 'Severe hypertension: SBP ≥ 160 and/or DBP ≥ 110 mmHg persisting. Signs of “impending eclampsia” (blurred vision, hyperreflexia) are unreliable.',
    },
  ],
  actions: [
    {
      id: 'help',
      label: { fr: 'Appeler à l’aide, ne jamais la laisser seule', en: 'Shout for help, never leave her alone' },
      detail: { fr: 'OMS : mobiliser tout le personnel disponible ; surveillance constante (une convulsion suivie d’inhalation peut tuer la mère et le fœtus).', en: 'WHO: mobilise all available staff; constant supervision (a convulsion followed by aspiration can kill mother and fetus).' },
      critical: true,
      claimId: 'm9-ecl-steps',
    },
    {
      id: 'position',
      label: { fr: 'Décubitus latéral gauche, protéger sans contenir ; voies aériennes, O₂ 4–6 L/min', en: 'Left lateral position, protect without restraining; airway, O₂ 4–6 L/min' },
      detail: { fr: 'OMS : sur le côté gauche pour limiter l’inhalation ; protéger des chutes sans tenter de la maintenir ; O₂ au masque ou aux lunettes, ventilation au ballon si elle ne respire pas.', en: 'WHO: on her left side to reduce aspiration; protect from falls without trying to restrain her; O₂ by mask or nasal cannulae, bag-mask ventilation if she is not breathing.' },
      critical: true,
      claimId: 'm9-ecl-steps',
    },
    {
      id: 'mgLoad',
      label: { fr: 'Sulfate de magnésium : dose de charge 4 g IV en 5 min', en: 'Magnesium sulfate: 4 g IV loading dose over 5 min' },
      detail: { fr: 'OMS, encadré S-4 (schéma IM) : 4 g de solution à 20 % IV en 5 min, puis 10 g de solution à 50 % IM (5 g dans chaque fesse, avec 1 ml de lidocaïne 2 %). Schéma IV : 4 g de solution à 50 % IV.', en: 'WHO Box S-4 (IM regimen): 4 g of 20% solution IV over 5 min, then 10 g of 50% solution IM (5 g in each buttock, with 1 mL 2% lidocaine). IV regimen: 4 g of 50% solution IV.' },
      critical: true,
      dose: { fixed: 4, max: 4, unit: 'g', route: { fr: 'IV en 5 min (solution à 20 %)', en: 'IV over 5 min (20% solution)' } },
      claimId: 'm9-ecl-mg',
    },
    {
      id: 'bp',
      label: { fr: 'Traiter l’hypertension sévère : labétalol 10 mg IV ou hydralazine 5 mg IV lente', en: 'Treat severe hypertension: labetalol 10 mg IV or hydralazine 5 mg IV slowly' },
      detail: {
        fr: 'OMS, tableau S-13 : labétalol 10 mg IV, 20 mg à 10 min si insuffisant, puis 40 et 80 mg toutes les 10 min, 300 mg au total (pas en cas d’insuffisance cardiaque, de choc hypovolémique ou d’asthme). Hydralazine 5 mg IV lente toutes les 5 min jusqu’à l’objectif, 20 mg/24 h au plus. Garder la PA au-dessus des limites basses de la normale.',
        en: 'WHO Table S-13: labetalol 10 mg IV, 20 mg after 10 min if inadequate, then 40 and 80 mg every 10 min, 300 mg in total (not with heart failure, hypovolaemic shock or asthma). Hydralazine 5 mg IV slowly every 5 min until the goal, at most 20 mg/24 h. Keep BP above the lower limits of normal.',
      },
      critical: true,
      claimId: 'm9-ecl-bp',
    },
    {
      id: 'mgMaint',
      label: { fr: 'Entretien : 5 g IM toutes les 4 h ou 1 g/h IV, pendant 24 h', en: 'Maintenance: 5 g IM every 4 h or 1 g/h IV, for 24 h' },
      detail: { fr: 'OMS : poursuivre 24 h après la naissance ou la dernière convulsion (la plus tardive des deux). Les convulsions à l’hôpital viennent le plus souvent d’un sous-traitement.', en: 'WHO: continue for 24 h after birth or the last convulsion, whichever is later. Convulsions in hospital are most often due to under-treatment.' },
      critical: true,
      dose: { fixed: 1, max: 1, unit: 'g', route: { fr: 'IV par heure (pompe), ou 5 g IM / 4 h', en: 'IV per hour (pump), or 5 g IM every 4 h' } },
      claimId: 'm9-ecl-mg',
    },
    {
      id: 'monitor',
      label: { fr: 'Avant chaque dose : FR ≥ 16/min, réflexes rotuliens, diurèse ≥ 30 ml/h (sonde urinaire)', en: 'Before each dose: RR ≥ 16/min, patellar reflexes, urine ≥ 30 mL/h (bladder catheter)' },
      detail: { fr: 'OMS, encadré S-5 : suspendre ou retarder le magnésium si FR < 16/min, réflexes rotuliens absents ou diurèse < 30 ml/h sur 4 h. Bilan hydrique strict pour éviter la surcharge.', en: 'WHO Box S-5: withhold or delay magnesium if RR < 16/min, patellar reflexes are absent or urine < 30 mL/h over 4 h. Strict fluid balance to avoid overload.' },
      critical: true,
      claimId: 'm9-ecl-tox',
    },
    {
      id: 'birth',
      label: { fr: 'Organiser la naissance dans les 12 h suivant le début des convulsions', en: 'Plan birth within 12 h of the onset of convulsions' },
      detail: { fr: 'OMS : pré-éclampsie sévère et éclampsie se traitent de la même façon, mais en cas d’éclampsie la naissance doit avoir lieu dans les 12 h.', en: 'WHO: severe pre-eclampsia and eclampsia are managed alike, but in eclampsia birth must occur within 12 h.' },
      critical: true,
      claimId: 'm9-ecl-steps',
    },
    {
      id: 'recur',
      label: { fr: 'Récidive après 15 min : 2 g de sulfate de magnésium IV en 5 min', en: 'Recurrence after 15 min: magnesium sulfate 2 g IV over 5 min' },
      detail: { fr: 'OMS, encadré S-4 : 2 g de solution à 50 % IV en 5 min si les convulsions reprennent après 15 min.', en: 'WHO Box S-4: 2 g of 50% solution IV over 5 min if convulsions recur after 15 min.' },
      critical: false,
      dose: { fixed: 2, max: 2, unit: 'g', route: { fr: 'IV en 5 min', en: 'IV over 5 min' } },
      claimId: 'm9-ecl-mg',
    },
    {
      id: 'calcium',
      label: { fr: 'Dépression respiratoire : ventiler et gluconate de calcium 1 g IV en 3 min', en: 'Respiratory depression: ventilate and give calcium gluconate 1 g IV over 3 min' },
      detail: { fr: 'OMS, encadré S-5 : antidote prêt ; en cas d’arrêt respiratoire, ventilation assistée et gluconate de calcium 1 g (10 ml à 10 %) IV lente en 3 min.', en: 'WHO Box S-5: keep the antidote ready; in respiratory arrest, assist ventilation and give calcium gluconate 1 g (10 mL of 10%) IV slowly over 3 min.' },
      critical: false,
      dose: { fixed: 1, max: 1, unit: 'g', route: { fr: 'IV lente en 3 min (10 ml à 10 %)', en: 'slow IV over 3 min (10 mL of 10%)' } },
      claimId: 'm9-ecl-tox',
    },
  ],
  distractors: [
    {
      id: 'diazepam',
      label: { fr: 'Diazépam à la place du magnésium', en: 'Diazepam instead of magnesium' },
      why: { fr: 'OMS : le sulfate de magnésium est le médicament de choix pour prévenir et traiter les convulsions de la pré-éclampsie sévère et de l’éclampsie.', en: 'WHO: magnesium sulfate is the drug of choice to prevent and treat convulsions in severe pre-eclampsia and eclampsia.' },
      claimId: 'm9-ecl-mg',
    },
    {
      id: 'restrain',
      label: { fr: 'La maintenir fermement pour arrêter la crise', en: 'Hold her down to stop the seizure' },
      why: { fr: 'OMS : la protéger des blessures mais ne pas tenter de la contenir.', en: 'WHO: protect her from injury but do not try to restrain her.' },
      claimId: 'm9-ecl-steps',
    },
    {
      id: 'normalBP',
      label: { fr: 'Ramener vite la PA à 120/80', en: 'Bring the BP quickly down to 120/80' },
      why: { fr: 'OMS : traiter à partir de 160/110 et garder la PA au-dessus des limites basses de la normale.', en: 'WHO: treat from 160/110 and keep BP above the lower limits of normal.' },
      claimId: 'm9-ecl-bp',
    },
    {
      id: 'fluids',
      label: { fr: 'Remplissage rapide de 2 L', en: 'Rapid 2 L fluid bolus' },
      why: { fr: 'OMS : bilan hydrique strict pour prévenir la surcharge ; ausculter les bases à la recherche d’un œdème pulmonaire.', en: 'WHO: strict fluid balance to prevent overload; listen at the lung bases for pulmonary oedema.' },
      claimId: 'm9-ecl-steps',
    },
  ],
  initial: { hr: 124, sbp: 172, dbp: 114, spo2: 88, etco2: 30, tempC: 36.9, rhythm: 'sinusTachy' },
  target: (t, done) => {
    // Simulator model: seizures stop once magnesium is loaded and recur without maintenance;
    // positioning + O₂ restore saturation; antihypertensive brings BP below 160/110.
    const o2 = after(done, 'position', t, 20);
    const loaded = after(done, 'mgLoad', t, 60);
    const loadT = done.get('mgLoad');
    const relapse = loaded && !done.has('mgMaint') && loadT !== undefined && t > loadT + 300;
    const seizing = (!loaded && (t < 90 || t % 180 < 70)) || (relapse && t % 240 < 60);
    const status = !loaded && t > 330;
    const bpDone = after(done, 'bp', t, 120);
    const sbp = bpDone ? 148 : Math.min(186, 172 + t / 40);
    const dbp = bpDone ? 96 : Math.min(122, 114 + t / 60);
    const temp = 36.9;
    if (status) return { hr: 138, sbp: 188, dbp: 122, spo2: o2 ? 86 : 80, etco2: 46, tempC: temp, rhythm: 'sinusTachy' };
    if (seizing) return { hr: 132, sbp, dbp, spo2: o2 ? 90 : 84, etco2: 42, tempC: temp, rhythm: 'sinusTachy' };
    return { hr: bpDone ? 96 : 112, sbp, dbp, spo2: o2 ? 98 : 94, etco2: 34, tempC: temp, rhythm: bpDone ? 'sinus' : 'sinusTachy' };
  },
  modelSequence: ['help', 'position', 'mgLoad', 'bp', 'mgMaint', 'monitor', 'birth'],
  durationSec: 600,
  claimIds: ['m9-ecl-steps', 'm9-ecl-mg', 'm9-ecl-tox', 'm9-ecl-bp', 'm9-dynamics'],
  evidenceId: 'who-mcpc-2017',
  localNotes: [
    {
      region: 'ma',
      resourceId: 'ma-preeclampsie',
      text: {
        fr: 'Maroc (document national de 2014) : 2e cause de mortalité maternelle ; sulfate de magnésium 4,5 g IV en 20–30 min ; nicardipine 1–6 mg/h ou nifédipine 10 mg ; gluconate de calcium 1 g en antidote.',
        en: 'Morocco (2014 national document): 2nd cause of maternal death; magnesium sulfate 4.5 g IV over 20–30 min; nicardipine 1–6 mg/h or nifedipine 10 mg; calcium gluconate 1 g as antidote.',
      },
    },
  ],
};
