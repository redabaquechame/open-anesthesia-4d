/**
 * Unanticipated difficult tracheal intubation → CICO — steps paraphrased from the Difficult
 * Airway Society 2025 adult guideline (Ahmad et al., BJA 2026;136:283-307, full text). The DAS
 * algorithm figures are not reproduced (excluded from the CC BY-NC-ND licence).
 */
import type { CrisisProtocol } from '../crisisTypes';
import { after } from './shared';

export const CICO: CrisisProtocol = {
  id: 'cico',
  title: { fr: 'Intubation difficile imprévue → CICO', en: 'Unanticipated difficult intubation → CICO' },
  stem: {
    fr: 'Homme de 90 kg, induction en séquence rapide pour laparotomie (propofol, rocuronium 1,2 mg/kg). Trois laryngoscopies, dont une par un senior, ont échoué. SpO2 88 % et en baisse. Dans ce scénario, la ventilation par DSG et au masque échouera.',
    en: '90 kg man, rapid sequence induction for laparotomy (propofol, rocuronium 1.2 mg/kg). Three laryngoscopy attempts, one by a senior colleague, have failed. SpO2 88% and falling. In this scenario, SAD and facemask ventilation will fail.',
  },
  caseWeightKg: 90,
  recognition: [
    { fr: 'Plan A : au plus 3 tentatives (+1 par un opérateur plus expérimenté) ; déclarer l’échec à la fin de chaque plan.', en: 'Plan A: at most 3 attempts (+1 by a more experienced operator); declare failure at the end of each plan.' },
    { fr: 'CICO : échec de la ventilation au masque du plan C → passer directement au plan D.', en: 'CICO: facemask ventilation fails in Plan C → go straight to Plan D.' },
  ],
  actions: [
    { id: 'declare', label: { fr: 'Déclarer l’échec d’intubation, appeler à l’aide', en: 'Declare failed intubation, call for help' }, critical: true, claimId: 'm9-das-plans' },
    {
      id: 'planB',
      label: { fr: 'Plan B : dispositif supraglottique de 2e génération', en: 'Plan B: second-generation supraglottic airway' },
      detail: {
        fr: 'Au plus 3 tentatives. Si l’oxygénation est possible : s’arrêter et réfléchir (réveil, intubation fibroscopique via le DSG, poursuite, rarement voie chirurgicale).',
        en: 'At most 3 attempts. If oxygenation works: stop and think (wake, fibreoptic intubation through the SAD, continue, rarely a surgical airway).',
      },
      critical: true,
      claimId: 'm9-das-plans',
    },
    { id: 'planC', label: { fr: 'Plan C : dernière tentative de ventilation au masque', en: 'Plan C: final attempt at facemask ventilation' }, detail: { fr: 'Si efficace : réveiller le patient.', en: 'If it works: wake the patient.' }, critical: true, claimId: 'm9-das-plans' },
    { id: 'paralysis', label: { fr: 'S’assurer d’une curarisation complète', en: 'Ensure full neuromuscular block' }, critical: true, claimId: 'm9-das-plans' },
    { id: 'declareCico', label: { fr: 'Déclarer « CICO »', en: 'Declare "CICO"' }, critical: true, claimId: 'm9-das-plans' },
    {
      id: 'fona',
      label: { fr: 'Plan D : cricothyroïdotomie scalpel–bougie–sonde', en: 'Plan D: scalpel–bougie–tube cricothyroidotomy' },
      detail: {
        fr: 'Lame n° 10, bougie à extrémité béquillée, sonde à ballonnet 6,0 ; cou en extension. DAS 2025 : incision cutanée verticale (jusqu’à 8 cm) par défaut si la membrane n’est pas clairement palpable.',
        en: 'No. 10 blade, bougie with a coudé tip, 6.0 mm cuffed tube; neck extended. DAS 2025: vertical skin incision (up to 8 cm) by default if the membrane is not clearly palpable.',
      },
      critical: true,
      claimId: 'm9-das-plans',
    },
    { id: 'upperO2', label: { fr: 'Poursuivre l’O2 par les voies aériennes supérieures', en: 'Keep giving O2 through the upper airway' }, critical: false, claimId: 'm9-das-plans' },
    { id: 'confirm', label: { fr: 'Confirmer par capnographie', en: 'Confirm with waveform capnography' }, critical: false, claimId: 'm9-das-plans' },
  ],
  distractors: [
    { id: 'moreAttempts', label: { fr: '5e tentative de laryngoscopie', en: 'Fifth laryngoscopy attempt' }, why: { fr: 'Règle « 3 + 1 » : au-delà, perte de temps et traumatisme.', en: '"3 + 1" rule: further attempts waste time and cause trauma.' }, claimId: 'm9-das-plans' },
    { id: 'blindSad', label: { fr: 'Intubation à l’aveugle à travers le DSG', en: 'Blind intubation through the SAD' }, why: { fr: 'Non recommandée : intubation via le DSG seulement sous fibroscopie.', en: 'Not recommended: intubate through the SAD only with a fibrescope.' }, claimId: 'm9-das-plans' },
    { id: 'wakeCico', label: { fr: 'Attendre la reprise ventilatoire en CICO', en: 'Wait for spontaneous breathing during CICO' }, why: { fr: 'Le réveil n’est une option que si l’oxygénation est possible ; en CICO : curarisation complète et plan D.', en: 'Waking is only an option when oxygenation is possible; in CICO: full block and Plan D.' }, claimId: 'm9-das-plans' },
  ],
  initial: { hr: 112, sbp: 142, dbp: 84, spo2: 88, etco2: 0, tempC: 36.7, rhythm: 'sinusTachy' },
  target: (t, done) => {
    if (after(done, 'fona', t, 15)) return { hr: 96, sbp: 128, dbp: 74, spo2: done.has('upperO2') ? 98 : 97, etco2: 42, rhythm: 'sinus' };
    if (t > 240) return { hr: 0, sbp: 0, dbp: 0, spo2: 30, etco2: 0, rhythm: 'PEA' };
    if (t > 150) return { hr: 44, sbp: 70, dbp: 36, spo2: 40, etco2: 0, rhythm: 'sinus' };
    return { hr: 124, sbp: 150, dbp: 88, spo2: done.has('upperO2') ? 62 : 55, etco2: 0, rhythm: 'sinusTachy' };
  },
  durationSec: 360,
  claimIds: ['m9-das-plans', 'm9-dynamics'],
  evidenceId: 'das-2025',
  localNotes: [
    { region: 'fr', resourceId: 'fr-sfar-airway-2026', text: { fr: 'France (RFE SFAR 2026) : cricothyroïdotomie bistouri–bougie longue–sonde.', en: 'France (SFAR 2026): scalpel–long bougie–tube cricothyroidotomy.' } },
    { region: 'ca', resourceId: 'ca-cafg-2021-p1', text: { fr: 'Canada (CAFG 2021) : au plus 3 tentatives au total avant de déclarer l’échec ; kit d’abord cervical partout où l’on gère des voies aériennes.', en: 'Canada (CAFG 2021): at most 3 attempts in total before declaring failure; front-of-neck kit wherever airways are managed.' } },
    { region: 'ma', resourceId: 'ma-smaar-id-obst-2018', text: { fr: 'Maroc (SMAAR, obstétrique 2018) : 2 tentatives d’intubation au maximum chez la femme enceinte.', en: 'Morocco (SMAAR obstetrics 2018): at most 2 intubation attempts in pregnancy.' } },
  ],
};
