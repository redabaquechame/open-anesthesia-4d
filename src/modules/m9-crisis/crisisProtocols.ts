/**
 * M9 crisis protocols.
 *
 * Rules: steps and doses are paraphrased from the guideline text that was opened (see each
 * action's claimId in src/standards/claimRegistry.ts). The `target` functions are simulator
 * shapes (claim m9-dynamics, illustrative) and must never be read as clinical time courses.
 */
import type { CrisisProtocol } from './crisisTypes';
import { after } from './protocols/shared';
import { MH } from './protocols/mh';
import { ANAPHYLAXIS } from './protocols/anaphylaxis';
import { CICO } from './protocols/cico';
import { ARREST } from './protocols/arrest';
import { BLEEDING } from './protocols/bleeding';
import { PPH } from './protocols/pph';
import { ECLAMPSIA } from './protocols/eclampsia';

// ─────────────────────────────────────────────────────────────── LAST (ASRA 2020 checklist)
const LAST: CrisisProtocol = {
  id: 'last',
  title: { fr: 'Toxicité systémique des AL (LAST)', en: 'Local anaesthetic systemic toxicity (LAST)' },
  stem: {
    fr: 'Homme de 75 kg, bloc interscalénique : 2 minutes après l’injection il devient agité, se plaint d’un goût métallique puis convulse.',
    en: '75 kg man, interscalene block: 2 minutes after the injection he becomes agitated, reports a metallic taste, then has a seizure.',
  },
  caseWeightKg: 75,
  recognition: [
    { fr: 'Signes neurologiques (agitation, goût métallique, convulsions) puis cardiovasculaires (hypotension, bradycardie, arythmies, arrêt).', en: 'CNS signs (agitation, metallic taste, seizures) then cardiovascular signs (hypotension, bradycardia, arrhythmia, arrest).' },
    { fr: 'Survient pendant ou après l’injection d’un anesthésique local.', en: 'Occurs during or after local anaesthetic injection.' },
  ],
  actions: [
    { id: 'help', label: { fr: 'Appeler à l’aide', en: 'Call for help' }, critical: true, claimId: 'm9-last-steps' },
    { id: 'kit', label: { fr: 'Apporter le kit LAST', en: 'Get the LAST rescue kit' }, critical: true, claimId: 'm9-last-steps' },
    { id: 'cpb', label: { fr: 'Envisager d’alerter l’équipe de CEC', en: 'Consider alerting the cardiopulmonary bypass team' }, critical: false, claimId: 'm9-last-steps' },
    {
      id: 'lipidBolus',
      label: { fr: 'Émulsion lipidique 20 % : bolus en 2–3 min', en: '20% lipid emulsion: bolus over 2–3 min' },
      detail: { fr: 'Tôt. > 70 kg : ~100 mL ; < 70 kg : ~1,5 mL/kg. Si toujours instable : répéter le bolus.', en: 'Early. > 70 kg: ~100 mL; < 70 kg: ~1.5 mL/kg. If still unstable: repeat the bolus.' },
      critical: true,
      repeatable: true,
      dose: { perKg: 1.5, fixedAboveKg: { kg: 70, amount: 100 }, unit: 'mL', route: { fr: 'IV en 2–3 min', en: 'IV over 2–3 min' } },
      claimId: 'm6-last-lipid',
    },
    {
      id: 'lipidInfusion',
      label: { fr: 'Émulsion lipidique 20 % : perfusion', en: '20% lipid emulsion: infusion' },
      detail: {
        fr: '> 70 kg : ~250 mL en 15–20 min ; < 70 kg : ~0,25 mL/kg/min. Si instable : doubler. Continuer ≥ 15 min après stabilisation ; dose maximale 12 mL/kg.',
        en: '> 70 kg: ~250 mL over 15–20 min; < 70 kg: ~0.25 mL/kg/min. If unstable: double it. Continue ≥ 15 min once stable; maximum 12 mL/kg.',
      },
      critical: true,
      dose: { perKg: 0.25, fixedAboveKg: { kg: 70, amount: 250 }, unit: 'mL', route: { fr: 'IV (> 70 kg : en 15–20 min ; ≤ 70 kg : par minute)', en: 'IV (> 70 kg: over 15–20 min; ≤ 70 kg: per minute)' } },
      claimId: 'm6-last-lipid',
    },
    { id: 'airway', label: { fr: 'Convulsions : assurer la liberté des voies aériennes', en: 'Seizure: ensure an adequate airway' }, critical: true, claimId: 'm9-last-steps' },
    { id: 'benzo', label: { fr: 'Convulsions : benzodiazépine', en: 'Seizure: benzodiazepine' }, detail: { fr: 'Benzodiazépine préférée.', en: 'Benzodiazepine preferred.' }, critical: true, claimId: 'm9-last-steps' },
    {
      id: 'epiSmall',
      label: { fr: 'Hypotension : adrénaline à petite dose', en: 'Hypotension: small-dose epinephrine' },
      detail: { fr: 'Dose plus faible que d’habitude ; commencer à ≤ 1 µg/kg.', en: 'Smaller than the usual dose; start with ≤ 1 µg/kg.' },
      critical: false,
      dose: { perKg: 1, unit: 'µg', route: { fr: 'IV — commencer à cette dose ou moins', en: 'IV — start at or below this' } },
      claimId: 'm6-last-lipid',
    },
    { id: 'observe', label: { fr: 'Une fois stable : surveillance prolongée', en: 'Once stable: prolonged observation' }, detail: { fr: '2 h après une convulsion ; 4–6 h après une instabilité cardiovasculaire.', en: '2 h after a seizure; 4–6 h after cardiovascular instability.' }, critical: false, claimId: 'm9-last-steps' },
  ],
  distractors: [
    { id: 'vasopressin', label: { fr: 'Vasopressine', en: 'Vasopressin' }, why: { fr: 'À éviter dans la LAST (checklist ASRA).', en: 'Avoid in LAST (ASRA checklist).' }, claimId: 'm6-last-lipid' },
    { id: 'lidocaine', label: { fr: 'Lidocaïne IV pour l’arythmie', en: 'IV lidocaine for the arrhythmia' }, why: { fr: 'Les anesthésiques locaux sont à éviter.', en: 'Local anaesthetics must be avoided.' }, claimId: 'm6-last-lipid' },
    { id: 'betablock', label: { fr: 'Bêtabloquant pour la tachycardie', en: 'Beta-blocker for the tachycardia' }, why: { fr: 'Bêtabloquants à éviter.', en: 'Beta-blockers must be avoided.' }, claimId: 'm6-last-lipid' },
    { id: 'ccb', label: { fr: 'Inhibiteur calcique', en: 'Calcium-channel blocker' }, why: { fr: 'Inhibiteurs calciques à éviter.', en: 'Calcium-channel blockers must be avoided.' }, claimId: 'm6-last-lipid' },
    { id: 'epiStd', label: { fr: 'Adrénaline 1 mg IV d’emblée', en: 'Epinephrine 1 mg IV straight away' }, why: { fr: 'La réanimation de la LAST diffère de l’ACLS standard : adrénaline à dose réduite (≤ 1 µg/kg au départ).', en: 'LAST resuscitation differs from standard ACLS: smaller epinephrine doses (start with ≤ 1 µg/kg).' }, claimId: 'm6-last-lipid' },
    { id: 'propofolBig', label: { fr: 'Propofol 2 mg/kg pour les convulsions', en: 'Propofol 2 mg/kg for the seizure' }, why: { fr: 'Benzodiazépine préférée ; si seul le propofol est disponible, petites doses (ex. 20 mg).', en: 'Benzodiazepine preferred; if only propofol is available, low doses (e.g. 20 mg increments).' }, claimId: 'm9-last-steps' },
  ],
  initial: { hr: 118, sbp: 158, dbp: 92, spo2: 96, etco2: 42, tempC: 36.8, rhythm: 'sinusTachy' },
  target: (t, done) => {
    const lipid = after(done, 'lipidBolus', t, 45);
    const o2 = done.has('airway');
    const seizureCtrl = done.has('benzo');
    if (lipid) return { hr: 88, sbp: 112, dbp: 66, spo2: o2 ? 99 : 92, etco2: 38, rhythm: 'sinus' };
    if (t > 300) return { hr: 0, sbp: 0, dbp: 0, spo2: 60, etco2: 8, rhythm: 'VF' };
    if (t > 90) return { hr: 42, sbp: 68, dbp: 38, spo2: o2 ? 96 : 80, etco2: o2 ? 40 : 55, rhythm: 'sinus' };
    return { hr: 125, sbp: 150, dbp: 90, spo2: o2 ? 98 : seizureCtrl ? 90 : 84, etco2: o2 ? 42 : 52, rhythm: 'sinusTachy' };
  },
  durationSec: 420,
  claimIds: ['m6-last-lipid', 'm9-last-steps', 'm9-dynamics'],
  evidenceId: 'asra-last-2020',
  localNotes: [
    { region: 'ma', resourceId: 'ma-smar-referentiels-2016', text: { fr: 'Maroc : l’émulsion lipidique à 20 % figurait parmi les médicaments indisponibles dans les référentiels SMAR 2016.', en: 'Morocco: 20 % lipid emulsion was listed as unavailable in the SMAR 2016 standards.' } },
    { region: 'fr', resourceId: 'fr-sfar-last', text: { fr: 'France (SFAR) : Intralipide 20 % en bolus de 3 ml/kg ; au moins une poche de 500 ml dans chaque bloc où l’on pratique l’ALR.', en: 'France (SFAR): Intralipid 20 % 3 mL/kg bolus; at least one 500 mL bag in every theatre suite doing regional anaesthesia.' } },
  ],
};

export const CRISES: CrisisProtocol[] = [LAST, MH, ANAPHYLAXIS, CICO, ARREST, BLEEDING, PPH, ECLAMPSIA];
