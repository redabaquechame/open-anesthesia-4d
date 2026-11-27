/**
 * Malignant hyperthermia — paraphrased from the Association of Anaesthetists QRH card 3-8 v.2
 * (2021, CC BY-NC-SA 4.0), with the EMHG v2024 differences stated where they matter.
 */
import type { CrisisProtocol } from '../crisisTypes';
import { after } from './shared';

export const MH: CrisisProtocol = {
  id: 'mh',
  title: { fr: 'Hyperthermie maligne', en: 'Malignant hyperthermia' },
  stem: {
    fr: 'Homme de 25 ans, 70 kg, appendicectomie cœlioscopique sous sévoflurane (succinylcholine à l’induction). À 40 min, l’EtCO2 monte malgré l’augmentation de la ventilation et la fréquence cardiaque s’accélère.',
    en: '25-year-old man, 70 kg, laparoscopic appendicectomy under sevoflurane (succinylcholine at induction). At 40 min, EtCO2 keeps rising despite more ventilation and the heart rate climbs.',
  },
  caseWeightKg: 70,
  recognition: [
    { fr: 'Hausse inexpliquée de l’EtCO2 avec tachycardie et consommation d’O2 accrue ; la hausse de température est un signe tardif.', en: 'Unexplained rise in EtCO2 with tachycardia and increased O2 consumption; a rising temperature is a late sign.' },
    { fr: 'Aussi : acidose mixte, rigidité généralisée ou spasme des masséters après succinylcholine, arythmies, pression instable.', en: 'Also: mixed acidosis, generalised rigidity or masseter spasm after succinylcholine, arrhythmias, unstable blood pressure.' },
    { fr: 'Déclencheurs : tous les halogénés et la succinylcholine.', en: 'Triggers: all volatile agents and succinylcholine.' },
  ],
  actions: [
    {
      id: 'help',
      label: { fr: 'Appeler à l’aide, noter l’heure, demander le kit HM (dantrolène)', en: 'Call for help, note the time, get the MH kit (dantrolene)' },
      detail: { fr: 'Viser à arrêter ou terminer la chirurgie rapidement.', en: 'Aim to stop or finish surgery quickly.' },
      critical: true,
      claimId: 'm9-mh-steps',
    },
    {
      id: 'trigger',
      label: { fr: 'Supprimer le déclencheur : halogéné coupé et retiré', en: 'Remove the trigger: vaporiser off and removed' },
      detail: {
        fr: 'O2 100 % à débit maximal, ventilation minute × 2–3, filtres à charbon actif sur les deux branches. Changer la chaux et le circuit n’est pas une priorité.',
        en: '100% O2 at maximum flow, 2–3 × normal minute ventilation, activated charcoal filters on both limbs. Changing soda lime and circuit is not a priority.',
      },
      critical: true,
      claimId: 'm9-mh-steps',
    },
    { id: 'tiva', label: { fr: 'Passer en anesthésie IV + curare non dépolarisant', en: 'Switch to TIVA + non-depolarising blocker' }, critical: true, claimId: 'm9-mh-steps' },
    {
      id: 'dantrolene',
      label: { fr: 'Dantrolène IV : bolus initial', en: 'Dantrolene IV: first bolus' },
      detail: {
        fr: 'QRH : 2–3 mg/kg (adulte ~200 mg), puis 1 mg/kg toutes les 5 min jusqu’à EtCO2 < 6 kPa et T < 38,5 °C ; 10 mg/kg peut être dépassé. EMHG 2024 diffère : 2–2,5 mg/kg (≤ 300 mg par dose) répétés toutes les 10 min.',
        en: 'QRH: 2–3 mg/kg (adult ~200 mg), then 1 mg/kg every 5 min until EtCO2 < 6 kPa and T < 38.5 °C; 10 mg/kg may be exceeded. EMHG 2024 differs: 2–2.5 mg/kg (≤ 300 mg per dose) repeated every 10 min.',
      },
      critical: true,
      dose: { perKg: 2, perKgHigh: 3, unit: 'mg', route: { fr: 'IV en bolus', en: 'IV bolus' } },
      claimId: 'm9-mh-dantrolene',
    },
    {
      id: 'dantroleneRepeat',
      label: { fr: 'Dantrolène : dose répétée', en: 'Dantrolene: repeat dose' },
      detail: { fr: 'QRH : 1 mg/kg toutes les 5 min jusqu’aux objectifs.', en: 'QRH: 1 mg/kg every 5 min until the targets are met.' },
      critical: false,
      repeatable: true,
      dose: { perKg: 1, unit: 'mg', route: { fr: 'IV toutes les 5 min', en: 'IV every 5 min' } },
      claimId: 'm9-mh-dantrolene',
    },
    {
      id: 'cool',
      label: { fr: 'Refroidissement actif', en: 'Active cooling' },
      detail: { fr: 'Solutés IV froids, glace aux aisselles et aux plis inguinaux. EMHG : arrêter sous 38,5 °C.', en: 'Cold IV fluids, ice to axillae and groins. EMHG: stop below 38.5 °C.' },
      critical: true,
      claimId: 'm9-mh-steps',
    },
    {
      id: 'monitor',
      label: { fr: 'PA invasive, température centrale, diurèse', en: 'Invasive BP, core temperature, urine output' },
      detail: { fr: 'Diurèse > 2 mL/kg/h, pH urinaire > 7.', en: 'Urine output > 2 mL/kg/h, urine pH > 7.' },
      critical: false,
      claimId: 'm9-mh-steps',
    },
    { id: 'labs', label: { fr: 'Gaz du sang, K+, CK, coagulation', en: 'Blood gas, K+, CK, coagulation' }, detail: { fr: 'CK maximale à 12–24 h.', en: 'CK peaks at 12–24 h.' }, critical: false, claimId: 'm9-mh-steps' },
    {
      id: 'bicarb',
      label: { fr: 'Acidose (pH < 7,2 malgré l’hyperventilation) : bicarbonate', en: 'Acidosis (pH < 7.2 despite hyperventilation): bicarbonate' },
      critical: false,
      dose: { fixed: 50, unit: 'mmol', route: { fr: 'IV (50 mL à 8,4 %)', en: 'IV (50 mL of 8.4%)' } },
      claimId: 'm9-mh-dantrolene',
    },
    {
      id: 'hyperK',
      label: { fr: 'Hyperkaliémie : glucose + insuline', en: 'Hyperkalaemia: glucose + insulin' },
      detail: { fr: 'Glucose 50 mL à 50 % avec insuline 10 UI ; calcium 0,1 mmol/kg seulement in extremis.', en: '50 mL of 50% glucose with 10 IU insulin; calcium 0.1 mmol/kg only in extremis.' },
      critical: false,
      dose: { fixed: 10, unit: 'IU', route: { fr: 'd’insuline IV avec 50 mL de glucose à 50 %', en: 'insulin IV with 50 mL of 50% glucose' } },
      claimId: 'm9-mh-dantrolene',
    },
    {
      id: 'icu',
      label: { fr: 'Réanimation, information de la famille, centre de référence HM', en: 'Critical care, family counselling, refer to the MH centre' },
      detail: { fr: 'EMHG : au moins 24 h en réanimation ou en SSPI.', en: 'EMHG: at least 24 h in critical care or recovery.' },
      critical: false,
      claimId: 'm9-mh-steps',
    },
  ],
  distractors: [
    { id: 'lowerSevo', label: { fr: 'Baisser le sévoflurane à 1 %', en: 'Turn sevoflurane down to 1%' }, why: { fr: 'Tous les halogénés déclenchent l’HM : couper et retirer l’évaporateur.', en: 'All volatile agents trigger MH: turn off and remove the vaporiser.' }, claimId: 'm9-mh-steps' },
    { id: 'sodaLime', label: { fr: 'Changer d’abord la chaux sodée et le circuit', en: 'Change the soda lime and circuit first' }, why: { fr: 'Pas une priorité (QRH) : filtres à charbon et haut débit d’O2.', en: 'Not a priority (QRH): charcoal filters and high O2 flow instead.' }, claimId: 'm9-mh-steps' },
    { id: 'waitTemp', label: { fr: 'Attendre la fièvre pour confirmer', en: 'Wait for a fever to confirm' }, why: { fr: 'La hausse de température est un signe tardif.', en: 'A rising temperature is a late sign.' }, claimId: 'm9-mh-steps' },
    { id: 'ccb', label: { fr: 'Inhibiteur calcique pour l’arythmie', en: 'Calcium-channel blocker for the arrhythmia' }, why: { fr: 'À éviter (QRH) : amiodarone ou bêtabloquant.', en: 'Avoid (QRH): use amiodarone or a beta-blocker.' }, claimId: 'm9-mh-dantrolene' },
  ],
  initial: { hr: 118, sbp: 138, dbp: 80, spo2: 96, etco2: 58, tempC: 37.9, rhythm: 'sinusTachy' },
  target: (t, done) => {
    const dant = after(done, 'dantrolene', t, 60);
    const off = done.has('trigger');
    const cool = done.has('cool');
    if (dant) return { hr: 92, sbp: 124, dbp: 72, spo2: 98, etco2: 40, tempC: cool ? 37.3 : 38.1, rhythm: 'sinus' };
    if (t > 540) return { hr: 0, sbp: 0, dbp: 0, spo2: 70, etco2: 20, tempC: 41, rhythm: 'VF' };
    return { hr: off ? 132 : 150, sbp: 118, dbp: 64, spo2: off ? 96 : 91, etco2: off ? 62 : 85, tempC: cool ? 38.8 : 40.8, rhythm: 'sinusTachy' };
  },
  durationSec: 600,
  claimIds: ['m9-mh-steps', 'm9-mh-dantrolene', 'm9-dynamics'],
  evidenceId: 'aoa-qrh-mh-2021',
  localNotes: [
    { region: 'ma', resourceId: 'ma-smar-referentiels-2016', text: { fr: 'Maroc : le dantrolène figurait parmi les médicaments indisponibles dans les référentiels SMAR 2016. Vérifiez où se trouve le kit dans votre établissement.', en: 'Morocco: dantrolene was listed as unavailable in the SMAR 2016 standards. Check where the kit is in your hospital.' } },
    { region: 'ma', resourceId: 'ma-antidotes-2021', text: { fr: 'Maroc (enquête 2018–2019, 17 hôpitaux publics ou militaires) : dantrolène présent dans 3 hôpitaux sur 17 seulement. Sachez avant l’induction où est le plus proche.', en: 'Morocco (2018–2019 survey, 17 public or military hospitals): dantrolene stocked in only 3 of 17. Know where the nearest supply is before induction.' } },
    { region: 'fr', resourceId: 'fr-sfar-hm-2019', text: { fr: 'France (RPP SFAR 2019) : dantrolène 2–3 mg/kg puis bolus de 1 mg/kg jusqu’à 10 mg/kg ; stock de 36 flacons de 20 mg.', en: 'France (SFAR 2019): dantrolene 2–3 mg/kg then 1 mg/kg boluses up to 10 mg/kg; stock of 36 × 20 mg vials.' } },
  ],
};
