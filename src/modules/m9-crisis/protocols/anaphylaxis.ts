/**
 * Peri-operative anaphylaxis, grade III — adrenaline and fluid doses from Garvey et al. BJA 2019
 * (international consensus, full text); step order from the Association of Anaesthetists QRH
 * card 3-1 v.5 (2022, CC BY-NC-SA 4.0).
 */
import type { CrisisProtocol } from '../crisisTypes';
import { after } from './shared';

export const ANAPHYLAXIS: CrisisProtocol = {
  id: 'anaphylaxis',
  title: { fr: 'Anaphylaxie peropératoire (grade III)', en: 'Peri-operative anaphylaxis (grade III)' },
  stem: {
    fr: 'Femme de 70 kg, induction : propofol, rocuronium puis céfazoline. 3 min plus tard : PAS 58 mmHg, FC 135, pressions d’insufflation élevées. Pas d’éruption.',
    en: '70 kg woman, induction: propofol, rocuronium, then cefazolin. 3 min later: SBP 58 mmHg, HR 135, high airway pressures. No rash.',
  },
  caseWeightKg: 70,
  recognition: [
    { fr: 'Hypotension inexpliquée, bronchospasme, tachycardie ou bradycardie, angio-œdème, arrêt cardiaque inattendu.', en: 'Unexplained hypotension, bronchospasm, tachycardia or bradycardia, angioedema, unexpected cardiac arrest.' },
    { fr: 'Les signes cutanés manquent souvent dans les formes graves (grades III–IV).', en: 'Skin signs are often absent in severe reactions (grades III–IV).' },
    { fr: 'Grade III : atteinte menaçant la vie d’un ou plusieurs organes (hypotension, bronchospasme sévère).', en: 'Grade III: life-threatening involvement of one or more organs (hypotension, severe bronchospasm).' },
  ],
  actions: [
    {
      id: 'help',
      label: { fr: 'Appeler à l’aide, noter l’heure', en: 'Call for help, note the time' },
      detail: { fr: 'Arrêter ou ne pas commencer la chirurgie non essentielle.', en: 'Stop or do not start non-essential surgery.' },
      critical: true,
      claimId: 'm9-anaph-steps',
    },
    {
      id: 'removeTrigger',
      label: { fr: 'Retirer les déclencheurs probables', en: 'Remove all likely triggers' },
      detail: { fr: 'Antibiotique, curare, bleu patent, chlorhexidine, colloïdes. Entretien par halogéné.', en: 'Antibiotic, neuromuscular blocker, patent blue, chlorhexidine, colloids. Maintain anaesthesia with a volatile agent.' },
      critical: true,
      claimId: 'm9-anaph-steps',
    },
    { id: 'o2Airway', label: { fr: 'O2 100 %, sécuriser les voies aériennes, surélever les jambes', en: '100% O2, secure the airway, raise the legs' }, critical: true, claimId: 'm9-anaph-steps' },
    {
      id: 'adrenaline',
      label: { fr: 'Adrénaline IV : bolus grade III', en: 'Adrenaline IV: grade III bolus' },
      detail: {
        fr: 'Garvey 2019 : 50 µg (100 µg si pas de réponse aux autres vasopresseurs ou bronchodilatateurs) ; sans réponse à 2 min : 200 µg toutes les 2 min. Perfusion après 3 bolus.',
        en: 'Garvey 2019: 50 µg (100 µg if not responding to other vasopressors or bronchodilators); no response at 2 min: 200 µg every 2 min. Infusion after 3 boluses.',
      },
      critical: true,
      repeatable: true,
      dose: { fixed: 50, unit: 'µg', route: 'IV' },
      claimId: 'm9-anaph-adrenaline',
    },
    {
      id: 'adrenalineHigh',
      label: { fr: 'Pas de réponse à 2 min : adrénaline 200 µg', en: 'No response at 2 min: adrenaline 200 µg' },
      critical: false,
      repeatable: true,
      dose: { fixed: 200, unit: 'µg', route: { fr: 'IV, toutes les 2 min', en: 'IV, every 2 min' } },
      claimId: 'm9-anaph-adrenaline',
    },
    {
      id: 'fluids',
      label: { fr: 'Remplissage rapide par cristalloïde', en: 'Rapid crystalloid bolus' },
      detail: { fr: 'Grade III : 1 L, à répéter jusqu’à 30 mL/kg.', en: 'Grade III: 1 L, repeat up to 30 mL/kg.' },
      critical: true,
      repeatable: true,
      dose: { fixed: 1000, unit: 'mL', route: { fr: 'IV, rapide', en: 'IV, rapid' } },
      claimId: 'm9-anaph-adrenaline',
    },
    {
      id: 'infusion',
      label: { fr: 'Perfusion d’adrénaline (après 3 bolus)', en: 'Adrenaline infusion (after 3 boluses)' },
      detail: { fr: 'Garvey : 0,05–0,1 µg/kg/min. QRH : 3 mg dans 50 mL, débuter à 3 µg/min, max 40 µg/min.', en: 'Garvey: 0.05–0.1 µg/kg/min. QRH: 3 mg in 50 mL, start at 3 µg/min, max 40 µg/min.' },
      critical: false,
      dose: { perKg: 0.05, perKgHigh: 0.1, unit: 'µg', route: { fr: 'IV par min', en: 'IV per min' } },
      claimId: 'm9-anaph-adrenaline',
    },
    {
      id: 'refractory',
      label: { fr: 'Réfractaire (> 10 min) : noradrénaline, vasopressine, glucagon si bêtabloqué', en: 'Refractory (> 10 min): noradrenaline, vasopressin, glucagon if on beta-blockers' },
      detail: { fr: 'Noradrénaline 0,05–0,5 µg/kg/min ; vasopressine 1–2 UI ; glucagon 1–2 mg ; ECLS si disponible.', en: 'Noradrenaline 0.05–0.5 µg/kg/min; vasopressin 1–2 IU; glucagon 1–2 mg; ECLS where available.' },
      critical: false,
      claimId: 'm9-anaph-adrenaline',
    },
    {
      id: 'cpr',
      label: { fr: 'PAS < 50 mmHg ou arrêt : massage cardiaque', en: 'SBP < 50 mmHg or arrest: start CPR' },
      detail: { fr: 'À envisager aussi si EtCO2 < 20 mmHg. Grade IV : adrénaline 1 mg selon l’ALS.', en: 'Also consider if EtCO2 < 20 mmHg. Grade IV: adrenaline 1 mg per ALS.' },
      critical: false,
      claimId: 'm9-anaph-adrenaline',
    },
    {
      id: 'tryptase',
      label: { fr: 'Prélever la tryptase', en: 'Take tryptase samples' },
      detail: { fr: 'Garvey : 1 h et 2–4 h après le début ; valeur de base ≥ 24 h.', en: 'Garvey: 1 h and 2–4 h after onset; baseline at ≥ 24 h.' },
      critical: false,
      claimId: 'm9-anaph-adrenaline',
    },
    {
      id: 'refer',
      label: { fr: 'Réanimation, signaler l’allergie, adresser en consultation d’allergologie', en: 'Critical care, label the allergy, refer to an allergy clinic' },
      detail: { fr: 'Surveillance d’au moins 6 h (Garvey).', en: 'Monitor for at least 6 h (Garvey).' },
      critical: false,
      claimId: 'm9-anaph-adrenaline',
    },
  ],
  distractors: [
    {
      id: 'steroidsFirst',
      label: { fr: 'Hydrocortisone + antihistaminique en premier', en: 'Hydrocortisone + antihistamine first' },
      why: { fr: 'QRH v.5 : ne font plus partie du traitement aigu ; Garvey : seulement après adrénaline et remplissage.', en: 'QRH v.5: no longer part of acute treatment; Garvey: only after adrenaline and fluids.' },
      claimId: 'm9-anaph-steps',
    },
    { id: 'adrenaline1mg', label: { fr: 'Adrénaline 1 mg IV', en: 'Adrenaline 1 mg IV' }, why: { fr: '1 mg est la dose du grade IV (arrêt). Grade III : bolus titrés de 50 µg.', en: '1 mg is the grade IV (arrest) dose. Grade III: titrated 50 µg boluses.' }, claimId: 'm9-anaph-adrenaline' },
    { id: 'sugammadex', label: { fr: 'Sugammadex pour « neutraliser » le rocuronium', en: 'Sugammadex to "neutralise" the rocuronium' }, why: { fr: 'Pas de rôle immédiat dans le traitement (Garvey).', en: 'No immediate role in treatment (Garvey).' }, claimId: 'm9-anaph-adrenaline' },
    { id: 'promethazine', label: { fr: 'Prométhazine IV', en: 'IV promethazine' }, why: { fr: 'À éviter (Garvey).', en: 'Avoid (Garvey).' }, claimId: 'm9-anaph-adrenaline' },
  ],
  initial: { hr: 135, sbp: 58, dbp: 30, spo2: 93, etco2: 28, tempC: 36.6, rhythm: 'sinusTachy' },
  target: (t, done, _w, counts) => {
    const adr = after(done, 'adrenaline', t, 20);
    const boluses = (counts.get('adrenaline') ?? 0) + (counts.get('adrenalineHigh') ?? 0);
    const fl = done.has('fluids');
    const o2 = done.has('o2Airway');
    const trig = done.has('removeTrigger');
    if (adr && fl) return { hr: 102, sbp: trig || boluses > 1 ? 108 : 96, dbp: 58, spo2: o2 ? 98 : 93, etco2: 36, rhythm: 'sinus' };
    if (adr) return { hr: 118, sbp: 82, dbp: 44, spo2: o2 ? 96 : 91, etco2: 32, rhythm: 'sinusTachy' };
    if (t > 240) return { hr: 0, sbp: 0, dbp: 0, spo2: 70, etco2: 10, rhythm: 'PEA' };
    return { hr: 142, sbp: 46, dbp: 24, spo2: o2 ? 92 : 84, etco2: 22, rhythm: 'sinusTachy' };
  },
  durationSec: 420,
  claimIds: ['m9-anaph-steps', 'm9-anaph-adrenaline', 'm9-dynamics'],
  evidenceId: 'garvey-anaphylaxis-2019',
  localNotes: [
    { region: 'fr', resourceId: 'fr-sfar-hsi-2025', text: { fr: 'France (RFE SFAR/SFA 2025) : adrénaline IV chez l’adulte 10–20 µg au grade II, 100–200 µg au grade III, toutes les 2 min ; perfusion après 3 doses.', en: 'France (SFAR/SFA 2025): IV adrenaline in adults 10–20 µg for grade II, 100–200 µg for grade III, every 2 min; infusion after 3 doses.' } },
  ],
};
