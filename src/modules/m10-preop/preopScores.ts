/**
 * M10 score definitions, cases and fasting rules.
 *
 * Every item, point value and risk number below comes from the source named in its claim
 * (src/standards/claimRegistry.ts, ids m10-*). Items still marked "from-memory" there (ASA-PS
 * definitions, ARISCAT points) are shown with a "to verify" chip in the app.
 */
import type { FastingRule, PreopCase, ScoreDef, ScoreOption } from './preopTypes';

const NO = { fr: 'Non', en: 'No' };
const YES = { fr: 'Oui', en: 'Yes' };
const yn = (points: number): ScoreOption[] => [
  { label: NO, points: 0 },
  { label: YES, points },
];

// ───────────────────────────────────────────────────────────── ASA physical status
const ASA: ScoreDef = {
  id: 'asa',
  name: { fr: 'Classe ASA (statut physique)', en: 'ASA physical status' },
  predicts: { fr: 'Description de l’état de santé préopératoire (pas un score de risque opératoire à lui seul).', en: 'Describes pre-operative health status (not, on its own, a surgical risk score).' },
  items: [
    {
      id: 'class',
      label: { fr: 'Classe', en: 'Class' },
      options: [
        { label: { fr: 'I — patient en bonne santé', en: 'I — normal healthy patient' }, points: 1 },
        { label: { fr: 'II — maladie systémique légère', en: 'II — mild systemic disease' }, points: 2 },
        { label: { fr: 'III — maladie systémique sévère', en: 'III — severe systemic disease' }, points: 3 },
        { label: { fr: 'IV — maladie systémique sévère, menace vitale permanente', en: 'IV — severe systemic disease, constant threat to life' }, points: 4 },
        { label: { fr: 'V — moribond, ne survivrait pas sans l’intervention', en: 'V — moribund, not expected to survive without the operation' }, points: 5 },
        { label: { fr: 'VI — mort encéphalique, prélèvement d’organes', en: 'VI — brain-dead organ donor' }, points: 6 },
      ],
    },
    { id: 'emergency', label: { fr: 'Urgence (suffixe « E »)', en: 'Emergency ("E" suffix)' }, options: yn(0) },
  ],
  bands: [1, 2, 3, 4, 5, 6].map((n) => ({
    min: n,
    max: n,
    label: { fr: `ASA ${['I', 'II', 'III', 'IV', 'V', 'VI'][n - 1]}`, en: `ASA ${['I', 'II', 'III', 'IV', 'V', 'VI'][n - 1]}` },
    risk: { fr: 'Ajouter « E » si urgence.', en: 'Add "E" for an emergency.' },
    tone: n <= 2 ? ('ok' as const) : n === 3 ? ('warn' as const) : ('bad' as const),
  })),
  limits: {
    fr: 'Les exemples officiels de chaque classe sont indicatifs ; les définitions doivent être vérifiées dans la déclaration ASA (réédition 2026).',
    en: 'The official examples for each class are guidance only; check the definitions against the ASA statement (reissued 2026).',
  },
  claimId: 'm10-asa',
};

// ───────────────────────────────────────────────────────────── RCRI (Lee 1999)
const RCRI: ScoreDef = {
  id: 'rcri',
  name: { fr: 'Index de risque cardiaque révisé (Lee)', en: 'Revised Cardiac Risk Index (Lee)' },
  predicts: {
    fr: 'Complications cardiaques majeures à l’hôpital (IDM, œdème pulmonaire, FV/arrêt cardiaque, BAV complet) après chirurgie non cardiaque programmée.',
    en: 'In-hospital major cardiac complications (MI, pulmonary oedema, VF/cardiac arrest, complete heart block) after elective non-cardiac surgery.',
  },
  items: [
    { id: 'surgery', label: { fr: 'Chirurgie à haut risque', en: 'High-risk surgery' }, hint: { fr: 'Intrapéritonéale, intrathoracique ou vasculaire sus-inguinale.', en: 'Intraperitoneal, intrathoracic or suprainguinal vascular.' }, options: yn(1) },
    { id: 'ihd', label: { fr: 'Cardiopathie ischémique', en: 'Ischaemic heart disease' }, hint: { fr: 'IDM ancien, épreuve d’effort positive, angor, dérivés nitrés, ondes Q. Pontage/angioplastie : seulement si douleur ischémique actuelle.', en: 'Prior MI, positive exercise test, angina, nitrates, Q waves. Prior CABG/PCI only with current ischaemic pain.' }, options: yn(1) },
    { id: 'chf', label: { fr: 'Insuffisance cardiaque', en: 'Heart failure' }, hint: { fr: 'Antécédent d’IC, d’OAP ou de dyspnée paroxystique nocturne ; crépitants bilatéraux ou B3 ; redistribution vasculaire radiologique.', en: 'History of HF, pulmonary oedema or PND; bilateral rales or S3; vascular redistribution on chest X-ray.' }, options: yn(1) },
    { id: 'cvd', label: { fr: 'Maladie cérébrovasculaire', en: 'Cerebrovascular disease' }, hint: { fr: 'Antécédent d’AIT ou d’AVC.', en: 'History of TIA or stroke.' }, options: yn(1) },
    { id: 'insulin', label: { fr: 'Diabète traité par insuline', en: 'Insulin-treated diabetes' }, options: yn(1) },
    { id: 'creat', label: { fr: 'Créatinine > 2,0 mg/dL (≈ 177 µmol/L)', en: 'Creatinine > 2.0 mg/dL (≈ 177 µmol/L)' }, options: yn(1) },
  ],
  bands: [
    { min: 0, max: 0, label: { fr: 'Classe I (0 point)', en: 'Class I (0 points)' }, risk: { fr: '0,4 % (cohorte de validation, 2/488)', en: '0.4% (validation cohort, 2/488)' }, tone: 'ok' },
    { min: 1, max: 1, label: { fr: 'Classe II (1 point)', en: 'Class II (1 point)' }, risk: { fr: '0,9 % (5/567)', en: '0.9% (5/567)' }, tone: 'ok' },
    { min: 2, max: 2, label: { fr: 'Classe III (2 points)', en: 'Class III (2 points)' }, risk: { fr: '6,6 % (17/258)', en: '6.6% (17/258)' }, tone: 'warn' },
    { min: 3, label: { fr: 'Classe IV (≥ 3 points)', en: 'Class IV (≥ 3 points)' }, risk: { fr: '11,0 % (12/109)', en: '11.0% (12/109)' }, tone: 'bad' },
  ],
  limits: {
    fr: 'Cohorte d’un seul hôpital, ≥ 50 ans, chirurgie programmée (généralisation incertaine en urgence). ESC 2022 : ne recommande aucun score unique ; avec un autre critère (décès, IDM ou arrêt à 30 j) l’ESC cite 4 / 6 / 10 / 15 % pour 0 / 1 / 2 / ≥ 3 points — ne pas mélanger les deux tableaux. Capacité fonctionnelle : incapacité à monter deux étages = information supplémentaire.',
    en: 'Single-hospital cohort, age ≥ 50, elective surgery (uncertain in emergencies). ESC 2022 recommends no single score; with a different outcome (30-day death, MI or arrest) it quotes 4 / 6 / 10 / 15% for 0 / 1 / 2 / ≥ 3 points — do not mix the two tables. Functional capacity: inability to climb two flights of stairs adds information.',
  },
  claimId: 'm10-rcri',
  evidenceId: 'lee-rcri-1999',
};

// ───────────────────────────────────────────────────────────── STOP-Bang
const STOPBANG: ScoreDef = {
  id: 'stopbang',
  name: { fr: 'STOP-Bang (apnée obstructive du sommeil)', en: 'STOP-Bang (obstructive sleep apnoea)' },
  predicts: { fr: 'Dépistage du syndrome d’apnées obstructives du sommeil.', en: 'Screening for obstructive sleep apnoea.' },
  items: [
    { id: 's', label: { fr: 'Ronflement (Snoring)', en: 'Snoring' }, options: yn(1) },
    { id: 't', label: { fr: 'Fatigue diurne (Tired)', en: 'Tiredness' }, options: yn(1) },
    { id: 'o', label: { fr: 'Apnées observées (Observed)', en: 'Observed stopped breathing' }, options: yn(1) },
    { id: 'p', label: { fr: 'Hypertension (Pressure)', en: 'High blood pressure' }, options: yn(1) },
    { id: 'b', label: { fr: 'IMC > 35 kg/m²', en: 'BMI > 35 kg/m²' }, options: yn(1) },
    { id: 'a', label: { fr: 'Âge > 50 ans', en: 'Age > 50' }, options: yn(1) },
    { id: 'n', label: { fr: 'Tour de cou ≥ 40 cm', en: 'Neck circumference ≥ 40 cm' }, options: yn(1) },
    { id: 'g', label: { fr: 'Sexe masculin', en: 'Male sex' }, options: yn(1) },
  ],
  bands: [
    { min: 0, max: 2, label: { fr: 'Risque faible (0–2)', en: 'Low risk (0–2)' }, risk: { fr: 'Probabilité de SAOS modéré à sévère la plus basse (18 % pour 0–2 dans la cohorte de Chung 2016).', en: 'Lowest probability of moderate-to-severe OSA (18% at 0–2 in the Chung 2016 cohort).' }, tone: 'ok' },
    { min: 3, max: 4, label: { fr: 'Risque intermédiaire (3–4)', en: 'Intermediate risk (3–4)' }, risk: { fr: 'Score ≥ 3 : sensibilité 93 % (IAH > 15) mais spécificité faible (31 %).', en: 'Score ≥ 3: 93% sensitive (AHI > 15) but poorly specific (31%).' }, tone: 'warn' },
    { min: 5, label: { fr: 'Risque élevé', en: 'High risk' }, risk: { fr: 'SAOS modéré à sévère jusqu’à 60 % (score 7–8).', en: 'Moderate-to-severe OSA up to 60% (score 7–8).' }, tone: 'bad' },
  ],
  bandOverride: (p) => {
    const stop = ['s', 't', 'o', 'p'].filter((k) => p[k] === 1).length;
    const extra = p.g === 1 || p.b === 1 || p.n === 1;
    return stop >= 2 && extra ? 2 : undefined;
  },
  limits: {
    fr: 'Risque élevé aussi si ≥ 2 items STOP + sexe masculin, IMC > 35 ou tour de cou ≥ 40 cm. Spécificité faible : beaucoup de faux positifs.',
    en: 'Also high risk if ≥ 2 STOP items plus male sex, BMI > 35 or neck ≥ 40 cm. Low specificity: many false positives.',
  },
  claimId: 'm10-stopbang',
  evidenceId: 'stopbang',
};

// ───────────────────────────────────────────────────────────── Apfel simplified PONV score
const APFEL: ScoreDef = {
  id: 'apfel',
  name: { fr: 'Score d’Apfel (NVPO)', en: 'Apfel score (PONV)' },
  predicts: { fr: 'Nausées et/ou vomissements dans les 24 h après anesthésie par halogénés, sans prophylaxie.', en: 'Nausea and/or vomiting within 24 h after inhalational anaesthesia, without prophylaxis.' },
  items: [
    { id: 'female', label: { fr: 'Sexe féminin', en: 'Female sex' }, options: yn(1) },
    { id: 'history', label: { fr: 'ATCD de NVPO ou mal des transports', en: 'History of PONV or motion sickness' }, options: yn(1) },
    { id: 'nonsmoker', label: { fr: 'Non-fumeur', en: 'Non-smoker' }, options: yn(1) },
    { id: 'opioids', label: { fr: 'Opioïdes postopératoires', en: 'Postoperative opioids' }, options: yn(1) },
  ],
  bands: [
    { min: 0, max: 0, label: { fr: '0 facteur', en: '0 factors' }, risk: { fr: 'Incidence 10 %', en: 'Incidence 10%' }, tone: 'ok' },
    { min: 1, max: 1, label: { fr: '1 facteur', en: '1 factor' }, risk: { fr: 'Incidence 21 %', en: 'Incidence 21%' }, tone: 'ok' },
    { min: 2, max: 2, label: { fr: '2 facteurs', en: '2 factors' }, risk: { fr: 'Incidence 39 % — envisager une prophylaxie (auteurs : dès 2 facteurs)', en: 'Incidence 39% — consider prophylaxis (authors: from 2 factors)' }, tone: 'warn' },
    { min: 3, max: 3, label: { fr: '3 facteurs', en: '3 factors' }, risk: { fr: 'Incidence 61 %', en: 'Incidence 61%' }, tone: 'bad' },
    { min: 4, max: 4, label: { fr: '4 facteurs', en: '4 factors' }, risk: { fr: 'Incidence 79 %', en: 'Incidence 79%' }, tone: 'bad' },
  ],
  limits: { fr: 'Discrimination modeste (AUC 0,63–0,73) ; dérivé sous anesthésie par halogénés.', en: 'Modest discrimination (AUC 0.63–0.73); derived under inhalational anaesthesia.' },
  claimId: 'm10-apfel',
  evidenceId: 'apfel-1999',
};

// ───────────────────────────────────────────────────────────── ARISCAT
const ARISCAT: ScoreDef = {
  id: 'ariscat',
  name: { fr: 'ARISCAT (complications pulmonaires)', en: 'ARISCAT (pulmonary complications)' },
  predicts: {
    fr: 'Complications pulmonaires postopératoires (infection, insuffisance respiratoire, bronchospasme, atélectasie, épanchement, pneumothorax, inhalation).',
    en: 'Postoperative pulmonary complications (infection, respiratory failure, bronchospasm, atelectasis, effusion, pneumothorax, aspiration).',
  },
  items: [
    { id: 'age', label: { fr: 'Âge', en: 'Age' }, options: [{ label: { fr: '≤ 50 ans', en: '≤ 50 y' }, points: 0 }, { label: { fr: '51–80 ans', en: '51–80 y' }, points: 3 }, { label: { fr: '> 80 ans', en: '> 80 y' }, points: 16 }] },
    { id: 'spo2', label: { fr: 'SpO2 préopératoire (air ambiant)', en: 'Pre-operative SpO2 (room air)' }, options: [{ label: { fr: '≥ 96 %', en: '≥ 96%' }, points: 0 }, { label: { fr: '91–95 %', en: '91–95%' }, points: 8 }, { label: { fr: '≤ 90 %', en: '≤ 90%' }, points: 24 }] },
    { id: 'infection', label: { fr: 'Infection respiratoire le mois précédent', en: 'Respiratory infection in the last month' }, options: yn(17) },
    { id: 'anaemia', label: { fr: 'Anémie (Hb ≤ 10 g/dL)', en: 'Anaemia (Hb ≤ 10 g/dL)' }, options: yn(11) },
    { id: 'incision', label: { fr: 'Incision', en: 'Incision' }, options: [{ label: { fr: 'Périphérique', en: 'Peripheral' }, points: 0 }, { label: { fr: 'Abdominale haute', en: 'Upper abdominal' }, points: 15 }, { label: { fr: 'Intrathoracique', en: 'Intrathoracic' }, points: 24 }] },
    { id: 'duration', label: { fr: 'Durée de chirurgie', en: 'Duration of surgery' }, options: [{ label: { fr: '≤ 2 h', en: '≤ 2 h' }, points: 0 }, { label: { fr: '2–3 h', en: '2–3 h' }, points: 16 }, { label: { fr: '> 3 h', en: '> 3 h' }, points: 23 }] },
    { id: 'emergency', label: { fr: 'Chirurgie urgente', en: 'Emergency surgery' }, options: yn(8) },
  ],
  bands: [
    { min: 0, max: 25, label: { fr: 'Risque faible (< 26)', en: 'Low risk (< 26)' }, risk: { fr: '1,6 % (à vérifier) ; validation externe PERISCOPE : 3,4 % observé', en: '1.6% (to verify); PERISCOPE external validation: 3.4% observed' }, tone: 'ok' },
    { min: 26, max: 44, label: { fr: 'Risque intermédiaire (26–44)', en: 'Intermediate risk (26–44)' }, risk: { fr: '13,3 % (à vérifier) ; PERISCOPE : 13,0 % observé', en: '13.3% (to verify); PERISCOPE: 13.0% observed' }, tone: 'warn' },
    { min: 45, label: { fr: 'Risque élevé (≥ 45)', en: 'High risk (≥ 45)' }, risk: { fr: '42,1 % (à vérifier) ; PERISCOPE : 38,0 % observé', en: '42.1% (to verify); PERISCOPE: 38.0% observed' }, tone: 'bad' },
  ],
  limits: {
    fr: 'Points et taux de la classe tirés d’un tableau secondaire, à confirmer dans Canet 2010. Performance variable selon les régions (PERISCOPE).',
    en: 'Points and class rates taken from a secondary table; to confirm in Canet 2010. Performance varies between regions (PERISCOPE).',
  },
  claimId: 'm10-ariscat',
  evidenceId: 'ariscat-canet-2010',
};

export const SCORES: ScoreDef[] = [ASA, RCRI, STOPBANG, APFEL, ARISCAT];

// ───────────────────────────────────────────────────────────── Fasting
export const FASTING: FastingRule[] = [
  {
    id: 'adultClear',
    intake: { fr: 'Liquides clairs (dont thé/café avec ≤ 1/5 de lait, boisson glucidique ≤ 400 mL)', en: 'Clear fluids (incl. tea/coffee with ≤ 1/5 milk, carbohydrate drink ≤ 400 mL)' },
    hours: 2,
    population: 'adult',
    claimId: 'm10-fasting-adult',
    note: { fr: 'Boisson glucidique : ASA 2023 (adulte sain).', en: 'Carbohydrate drink: ASA 2023 (healthy adults).' },
  },
  { id: 'adultSolid', intake: { fr: 'Solides', en: 'Solids' }, hours: 6, population: 'adult', claimId: 'm10-fasting-adult' },
  { id: 'childClear', intake: { fr: 'Liquides clairs', en: 'Clear fluids' }, hours: 1, population: 'child', claimId: 'm10-fasting-child' },
  { id: 'childBreast', intake: { fr: 'Lait maternel', en: 'Breast milk' }, hours: 3, population: 'child', claimId: 'm10-fasting-child' },
  { id: 'childFormula', intake: { fr: 'Lait infantile / lait non humain', en: 'Formula / non-human milk' }, hours: 4, population: 'child', claimId: 'm10-fasting-child' },
  { id: 'childSolid', intake: { fr: 'Solides', en: 'Solids' }, hours: 6, population: 'child', claimId: 'm10-fasting-adult', note: { fr: 'ESA 2011 (non précisé dans le résumé ESAIC 2022).', en: 'ESA 2011 (not stated in the ESAIC 2022 abstract).' } },
];

// ───────────────────────────────────────────────────────────── Clinical cases (fictional teaching cases)
export const CASES: PreopCase[] = [
  {
    id: 'colectomy',
    title: { fr: 'Colectomie programmée', en: 'Elective colectomy' },
    story: {
      fr: 'Homme de 72 ans, colectomie par laparotomie médiane sus- et sous-ombilicale, durée prévue 2 h 30.\n\nATCD : HTA, infarctus il y a 3 ans (ondes Q séquellaires), diabète de type 2 sous insuline. Pas d’AVC, pas d’insuffisance cardiaque.\nRonfle fort, sa femme a observé des pauses respiratoires ; fatigué la journée. Non-fumeur, jamais de NVPO.\nIMC 31 kg/m², tour de cou 42 cm. SpO2 95 % en air. Hb 11,5 g/dL, créatinine 1,4 mg/dL. Pas d’infection récente.\nAnalgésie postopératoire prévue : morphine.',
      en: '72-year-old man, colectomy through an upper and lower midline laparotomy, expected 2 h 30.\n\nHistory: hypertension, MI 3 years ago (residual Q waves), insulin-treated type 2 diabetes. No stroke, no heart failure.\nLoud snorer, his wife has seen him stop breathing; tired in the daytime. Non-smoker, never had PONV.\nBMI 31 kg/m², neck 42 cm. SpO2 95% on air. Hb 11.5 g/dL, creatinine 1.4 mg/dL. No recent infection.\nPlanned postoperative analgesia: morphine.',
    },
    answers: {
      asa: { class: 2, emergency: 0 },
      rcri: { surgery: 1, ihd: 1, chf: 0, cvd: 0, insulin: 1, creat: 0 },
      stopbang: { s: 1, t: 1, o: 1, p: 1, b: 0, a: 1, n: 1, g: 1 },
      apfel: { female: 0, history: 0, nonsmoker: 1, opioids: 1 },
      ariscat: { age: 1, spo2: 1, infection: 0, anaemia: 0, incision: 1, duration: 1, emergency: 0 },
    },
    teaching: [
      { text: { fr: 'RCRI 3 (chirurgie intrapéritonéale, cardiopathie ischémique, insuline) : classe IV, 11 % de complications cardiaques majeures dans la cohorte de validation.', en: 'RCRI 3 (intraperitoneal surgery, ischaemic heart disease, insulin): class IV, 11% major cardiac complications in the validation cohort.' }, claimId: 'm10-rcri' },
      { text: { fr: 'ESC 2022 : capacité fonctionnelle (deux étages), ECG et biomarqueurs (troponine hs, BNP/NT-proBNP) avant chirurgie à risque intermédiaire ou élevé chez ce patient.', en: 'ESC 2022: functional capacity (two flights of stairs), ECG and biomarkers (hs-troponin, BNP/NT-proBNP) before intermediate- or high-risk surgery in this patient.' }, claimId: 'm10-rcri-esc' },
      { text: { fr: 'STOP-Bang 7 : risque élevé de SAOS.', en: 'STOP-Bang 7: high risk of OSA.' }, claimId: 'm10-stopbang' },
      { text: { fr: 'ARISCAT 42 (3 + 8 + 15 + 16) : risque intermédiaire de complications pulmonaires.', en: 'ARISCAT 42 (3 + 8 + 15 + 16): intermediate risk of pulmonary complications.' }, claimId: 'm10-ariscat' },
    ],
  },
  {
    id: 'cholecystectomy',
    title: { fr: 'Cholécystectomie cœlioscopique', en: 'Laparoscopic cholecystectomy' },
    story: {
      fr: 'Femme de 34 ans, cholécystectomie par cœlioscopie, durée prévue 1 h 15.\n\nAucun antécédent médical, aucun traitement. Non-fumeuse. Vomissements prolongés après une appendicectomie à 20 ans ; mal des transports.\nIMC 24 kg/m², ne ronfle pas. SpO2 99 %. Hb 13 g/dL.\nAnalgésie postopératoire prévue : paracétamol, AINS et oxycodone si besoin.',
      en: '34-year-old woman, laparoscopic cholecystectomy, expected 1 h 15.\n\nNo medical history, no medication. Non-smoker. Prolonged vomiting after an appendicectomy at 20; motion sickness.\nBMI 24 kg/m², does not snore. SpO2 99%. Hb 13 g/dL.\nPlanned postoperative analgesia: paracetamol, NSAID and oxycodone as needed.',
    },
    answers: {
      asa: { class: 0, emergency: 0 },
      rcri: { surgery: 1, ihd: 0, chf: 0, cvd: 0, insulin: 0, creat: 0 },
      stopbang: { s: 0, t: 0, o: 0, p: 0, b: 0, a: 0, n: 0, g: 0 },
      apfel: { female: 1, history: 1, nonsmoker: 1, opioids: 1 },
      ariscat: { age: 0, spo2: 0, infection: 0, anaemia: 0, incision: 1, duration: 0, emergency: 0 },
    },
    teaching: [
      { text: { fr: 'Apfel 4/4 : 79 % de NVPO sans prophylaxie dans la cohorte d’origine.', en: 'Apfel 4/4: 79% PONV without prophylaxis in the original cohort.' }, claimId: 'm10-apfel' },
      { text: { fr: 'Piège : la cœlioscopie reste « intrapéritonéale » au sens du RCRI (1 point).', en: 'Trap: laparoscopy is still "intraperitoneal" in RCRI terms (1 point).' }, claimId: 'm10-rcri' },
      { text: { fr: 'Jeûne : liquides clairs jusqu’à 2 h avant, y compris une boisson glucidique (≤ 400 mL) chez l’adulte sain.', en: 'Fasting: clear fluids until 2 h before, including a carbohydrate drink (≤ 400 mL) in a healthy adult.' }, claimId: 'm10-fasting-adult' },
    ],
  },
  {
    id: 'hip',
    title: { fr: 'Fracture du col fémoral (urgence)', en: 'Hip fracture (emergency)' },
    story: {
      fr: 'Femme de 85 ans, ostéosynthèse de fracture du col fémoral en urgence, durée prévue 1 h 30.\n\nATCD : HTA, AVC ischémique il y a 2 ans. Toux fébrile traitée par antibiotiques il y a 3 semaines.\nExamen : crépitants bilatéraux, œdèmes des membres inférieurs. Ne ronfle pas. Non-fumeuse, pas de NVPO.\nSpO2 92 % en air. Hb 9,5 g/dL, créatinine 2,3 mg/dL. Morphine prévue en postopératoire.',
      en: '85-year-old woman, emergency fixation of a hip fracture, expected 1 h 30.\n\nHistory: hypertension, ischaemic stroke 2 years ago. Febrile cough treated with antibiotics 3 weeks ago.\nExamination: bilateral crackles, leg oedema. Does not snore. Non-smoker, no PONV.\nSpO2 92% on air. Hb 9.5 g/dL, creatinine 2.3 mg/dL. Morphine planned postoperatively.',
    },
    answers: {
      asa: { class: 3, emergency: 1 },
      rcri: { surgery: 0, ihd: 0, chf: 1, cvd: 1, insulin: 0, creat: 1 },
      stopbang: { s: 0, t: 0, o: 0, p: 1, b: 0, a: 1, n: 0, g: 0 },
      apfel: { female: 1, history: 0, nonsmoker: 1, opioids: 1 },
      ariscat: { age: 2, spo2: 1, infection: 1, anaemia: 1, incision: 0, duration: 0, emergency: 1 },
    },
    teaching: [
      { text: { fr: 'ARISCAT 60 (16 + 8 + 17 + 11 + 8) : risque élevé.', en: 'ARISCAT 60 (16 + 8 + 17 + 11 + 8): high risk.' }, claimId: 'm10-ariscat' },
      { text: { fr: 'RCRI 3 mais chirurgie urgente : hors de la population de dérivation (chirurgie programmée) ; à interpréter avec prudence.', en: 'RCRI 3 but emergency surgery: outside the derivation population (elective surgery); interpret with caution.' }, claimId: 'm10-rcri' },
      { text: { fr: 'ASA IV-E : insuffisance cardiaque décompensée, chirurgie urgente.', en: 'ASA IV-E: decompensated heart failure, emergency surgery.' }, claimId: 'm10-asa' },
    ],
  },
];
