import type { LocaleCode } from './clinicalStandards';

/**
 * Pre-use checkout content.
 *
 * Checked 2026-11-27 against the SFAR text (sfar.org, 1994 recommendations): 150 L reserve,
 * 50 mL/min @ 30 cmH2O (SFAR citing ISO 5358) and the 40% alarm test mixture match.
 * VERIFY: ISO 80601-2-13, which replaced ISO 5358, was not opened (paywalled).
 * The ASA list follows the 2008 ASA "Recommendations for Pre-Anesthesia Checkout Procedures",
 * checked against the task force's APSF Newsletter article (Spring 2008); item 6 is ≥ 50 psig.
 */

export interface CheckoutItem {
  id: string;
  number: number;
  betweenCases: boolean;
  label: Record<LocaleCode, string>;
  passCriterion: Record<LocaleCode, string>;
  linkedFaultKey?: string;
}

export const SFAR_FOSO_CHECKLIST: CheckoutItem[] = [
  {
    id: 'sfar-1',
    number: 1,
    betweenCases: true,
    label: {
      'fr-FR': 'BAVU de secours & Aspiration patient (A.P.A.V.O.I.R.)',
      'fr-CA': 'Ballon-masque de secours & Aspiration',
      'en-INT': 'Backup BVM (Ambu) & Patient Suction',
      'ar-MA': 'بالون التهوية الاحتياطي والشفط',
    },
    passCriterion: {
      'fr-FR': 'BAVU fonctionnel + source O2 auxiliaire; aspiration étanche sans fissure de bocal.',
      'fr-CA': 'Ballon ventilatoire prêt + succion vérifiée sans fuite.',
      'en-INT': 'Self-inflating bag present + suction checked for hidden canister cracks.',
      'ar-MA': 'توفر البالون اليدوي وفحص جهاز الشفط من أي تسرب.',
    },
  },
  {
    id: 'sfar-2',
    number: 2,
    betweenCases: false,
    label: {
      'fr-FR': 'Alimentation électrique, batterie & SEGA (anti-pollution)',
      'fr-CA': 'Alimentation secteur, batterie & évacuation des gaz',
      'en-INT': 'AC Power, Battery & Scavenging System (SEGA/AGSS)',
      'ar-MA': 'التيار الكهربائي والبطارية ونظام إخلاء الغازات',
    },
    passCriterion: {
      'fr-FR': 'Secteur branché, test batterie validé, extraction SEGA libre (aucune surpression / auto-PEP).',
      'fr-CA': 'Alimentation OK, évacuation active libre sans obstruction.',
      'en-INT': 'AC/battery confirmed; scavenging outlet unobstructed (prevents circuit auto-PEEP).',
      'ar-MA': 'تأكيد الطاقة وعدم وجود انسداد في مخرج الغازات العادمة.',
    },
    linkedFaultKey: 'scavengingObstruction',
  },
  {
    id: 'sfar-3',
    number: 3,
    betweenCases: false,
    label: {
      'fr-FR': 'Bouteille O2 de secours (Volume = Contenance × Pression en bar)',
      'fr-CA': 'Cylindre O2 de secours (pression minimale)',
      'en-INT': 'Reserve O2 Cylinder (Liters = Cylinder Size x Pressure in bar)',
      'ar-MA': 'أسطوانة الأكسجين الاحتياطية (الحجم باللتر = السعة × الضغط بالبار)',
    },
    passCriterion: {
      'fr-FR': 'Remplacer la bouteille si contenu <= 150 L; refermer et vérifier l’absence de chute de pression.',
      'fr-CA': 'Remplacer si réserve <= 150 L; aucune fuite robinet fermé.',
      'en-INT': 'Replace cylinder when reserve <= 150 L; verify pressure holds with valve closed.',
      'ar-MA': 'استبدال الأسطوانة إذا قل المخزون عن 150 لتراً والتأكد من عدم التسرب.',
    },
    linkedFaultKey: 'wallO2Failure',
  },
  {
    id: 'sfar-4',
    number: 4,
    betweenCases: false,
    label: {
      'fr-FR': 'Analyseur FiO2 (21% & 100%) et alarme hypoxique',
      'fr-CA': 'Analyseur FiO2 (21% et 100%) & alarme FiO2 basse',
      'en-INT': 'FiO2 Calibration (21% Air / >90% O2) & Low-FiO2 Alarm',
      'ar-MA': 'معايرة مستشعر الأكسجين (21% و 100%) وإنذار النقص',
    },
    passCriterion: {
      'fr-FR': 'Air ambiant 0,21 +/- 0,02; O2 pur > 0,90; alarme à 40% déclenchée (O2 2 L/min + N2O 4 L/min).',
      'fr-CA': 'Calibration 21% et >90% validée; alarme FiO2 basse fonctionnelle.',
      'en-INT': 'Reads 0.21 +/- 0.02 in room air, >0.90 in pure O2; 40% low-O2 alarm verified.',
      'ar-MA': 'قراءة 21% في الهواء و >90% في الأكسجين النقي وتجربة إنذار 40%.',
    },
  },
  {
    id: 'sfar-5',
    number: 5,
    betweenCases: true,
    label: {
      'fr-FR': 'Cuves halogénés & Bypass O2 (Flush)',
      'fr-CA': 'Vaporisateurs & Rinçage O2 (Flush)',
      'en-INT': 'Vaporizers Vertical/Filled & O2 Bypass/Flush',
      'ar-MA': 'مبخرات الغازات المخدرة وصمام التدفق السريع للأكسجين',
    },
    passCriterion: {
      'fr-FR': 'Fixation verticale, niveau liquide vérifié, bouchon étanche, sens du gaz vecteur correct.',
      'fr-CA': 'Vaporisateurs remplis et verrouillés; flush O2 opérationnel.',
      'en-INT': 'Mounted upright, filled, filler cap closed, interlock active, O2 flush verified.',
      'ar-MA': 'تثبيت عمودي ومستوى سائل كافٍ وإغلاق محكم لفتحة التعبئة.',
    },
  },
  {
    id: 'sfar-6',
    number: 6,
    betweenCases: true,
    label: {
      'fr-FR': 'Chaux sodée, test fuite ISO 5358 & valves unidirectionnelles',
      'fr-CA': 'Chaux sodée, test d’étanchéité ISO 5358 & valves',
      'en-INT': 'Soda Lime, ISO 5358 Leak Test & Unidirectional Valves',
      'ar-MA': 'الجير الصودي واختبار التسرب ISO 5358 والصمامات أحادية الاتجاه',
    },
    passCriterion: {
      'fr-FR': 'Chaux non virée; fuite alimentation gaz frais <= 50 mL/min à 30 cmH2O; dômes des valves mobiles.',
      'fr-CA': 'Absorbeur frais; fuite <= 50 mL/min à 30 cmH2O; valves inspiratoire/expiratoire libres.',
      'en-INT': 'Fresh absorbent; fresh gas leak <= 50 mL/min at 30 cmH2O (ISO 5358); valve discs mobile.',
      'ar-MA': 'جير صودي سليم؛ تسرب <= 50 مل/دقيقة عند 30 سم ماء؛ حركة حرة للصمامات.',
    },
    linkedFaultKey: 'exhaustedSodaLime',
  },
  {
    id: 'sfar-7',
    number: 7,
    betweenCases: true,
    label: {
      'fr-FR': 'Valve APL, ventilation manuelle/mécanique & traçabilité FOSO',
      'fr-CA': 'Valve APL, essai ventilateur & consignation',
      'en-INT': 'APL Venting Test, Ventilator Check & FOSO Log Sign-off',
      'ar-MA': 'اختبار صمام APL والمنفسة والتوقيع في سجل التحقق',
    },
    passCriterion: {
      'fr-FR': 'Ouverture APL ramène la pression à zéro; test sur ballon testeur; validation signée par le MAR.',
      'fr-CA': 'Pression retombe à 0 à l’ouverture APL; réglages confirmés.',
      'en-INT': 'Opening APL drops circuit pressure to 0; test-lung cycle verified; signed in FOSO register.',
      'ar-MA': 'عودة الضغط للصفر عند فتح APL وتأكيد إعدادات المنفسة والتوثيق.',
    },
    linkedFaultKey: 'circuitDisconnect',
  },
];

export const ASA_2008_CHECKLIST: CheckoutItem[] = [
  { id: 'asa-1', number: 1, betweenCases: false, label: { 'fr-FR': 'O2 auxiliaire & BAVU disponibles', 'fr-CA': 'O2 auxiliaire & ballon-masque prêts', 'en-INT': 'Verify Auxiliary O2 Cylinder & Self-Inflating BVM', 'ar-MA': 'التحقق من أسطوانة O2 الاحتياطية والبالون اليدوي' }, passCriterion: { 'fr-FR': 'Disponibles et fonctionnels.', 'fr-CA': 'Disponibles et fonctionnels.', 'en-INT': 'Available and functioning before daily start.', 'ar-MA': 'متوفرة وتعمل بكفاءة.' } },
  { id: 'asa-2', number: 2, betweenCases: true, label: { 'fr-FR': 'Aspiration patient adéquate', 'fr-CA': 'Succion patient adéquate', 'en-INT': 'Verify Patient Suction Is Adequate', 'ar-MA': 'التحقق من كفاءة جهاز الشفط' }, passCriterion: { 'fr-FR': 'Vide suffisant pour libérer les voies aériennes.', 'fr-CA': 'Succion efficace vérifiée.', 'en-INT': 'Suction clears airway reliably (Daily + Between Cases).', 'ar-MA': 'قوة شفط كافية لتنظيف مجرى الهواء.' } },
  { id: 'asa-3', number: 3, betweenCases: false, label: { 'fr-FR': 'Mise sous tension & alimentation secteur', 'fr-CA': 'Allumage & courant secteur AC', 'en-INT': 'Turn On Anesthesia System & Confirm AC Power', 'ar-MA': 'تشغيل جهاز التخدير وتأكيد التيار الكهربائي' }, passCriterion: { 'fr-FR': 'Secteur confirmé + batterie chargée.', 'fr-CA': 'Secteur confirmé.', 'en-INT': 'AC power indicator illuminated.', 'ar-MA': 'التيار متصل والبطارية مشحونة.' } },
  { id: 'asa-4', number: 4, betweenCases: true, label: { 'fr-FR': 'Moniteurs requis et alarmes actifs', 'fr-CA': 'Moniteurs et alarmes configurés', 'en-INT': 'Verify Required Monitors & Alarms', 'ar-MA': 'التحقق من أجهزة المراقبة والإنذارات' }, passCriterion: { 'fr-FR': 'ECG, SpO2, PNI, EtCO2 et limites d’alarmes vérifiés.', 'fr-CA': 'Moniteurs et alarmes vérifiés.', 'en-INT': 'Standard ASA monitors & audible alarms verified (Between Cases).', 'ar-MA': 'تأكيد ECG و SpO2 والضغط و EtCO2 والإنذارات.' } },
  { id: 'asa-5', number: 5, betweenCases: false, label: { 'fr-FR': 'Pression bouteille O2 de secours', 'fr-CA': 'Pression cylindre O2 de secours', 'en-INT': 'Verify Adequate Spare O2 Cylinder Pressure', 'ar-MA': 'التحقق من ضغط أسطوانة O2 الاحتياطية' }, passCriterion: { 'fr-FR': 'Pression suffisante sur le manomètre de secours.', 'fr-CA': 'Pression cylindre suffisante.', 'en-INT': 'Mounted reserve E-cylinder pressure adequate.', 'ar-MA': 'ضغط كافٍ في أسطوانة الطوارئ.' } },
  { id: 'asa-6', number: 6, betweenCases: false, label: { 'fr-FR': 'Pressions réseaux muraux ≥ 50 psig', 'fr-CA': 'Pressions murales ≥ 345 kPa (50 psig)', 'en-INT': 'Verify Piped Gas Pressures ≥ 50 psig', 'ar-MA': 'التحقق من ضغط الشبكة المركزية ≥ 50 psig' }, passCriterion: { 'fr-FR': 'Réseaux O2/Air/N2O ≥ 50 psig (≈ 3,45 bar).', 'fr-CA': 'Réseaux ≥ 345 kPa (50 psig).', 'en-INT': 'Central pipeline gauges read at least 50 psig.', 'ar-MA': 'ضغط الغازات المركزية ضمن المعدل المطلوب.' }, linkedFaultKey: 'wallO2Failure' },
  { id: 'asa-7', number: 7, betweenCases: true, label: { 'fr-FR': 'Cuves halogénés remplies & bouchons fermés', 'fr-CA': 'Vaporisateurs remplis & bouchons fermés', 'en-INT': 'Verify Vaporizers Filled & Filler Ports Closed', 'ar-MA': 'التحقق من امتلاء المبخرات وإغلاق فتحات التعبئة' }, passCriterion: { 'fr-FR': 'Niveau correct et ports de remplissage étanches.', 'fr-CA': 'Ports fermés et niveau adéquat.', 'en-INT': 'Filled adequately and filler ports tightly closed (Between Cases).', 'ar-MA': 'مستوى كافٍ وإغلاق محكم.' } },
  { id: 'asa-8', number: 8, betweenCases: false, label: { 'fr-FR': 'Étanchéité basse pression (débitmètres -> CGO)', 'fr-CA': 'Test de fuite basse pression', 'en-INT': 'Verify No Leaks Between Flowmeters & Common Gas Outlet', 'ar-MA': 'فحص عدم وجود تسرب في خطوط الضغط المنخفض' }, passCriterion: { 'fr-FR': 'Aucune fuite sur les lignes basse pression.', 'fr-CA': 'Aucune fuite basse pression.', 'en-INT': 'Low-pressure system leak check passed.', 'ar-MA': 'نجاح اختبار تسرب الضغط المنخفض.' } },
  { id: 'asa-9', number: 9, betweenCases: false, label: { 'fr-FR': 'Test du système d’évacuation (SEGA / WAGD)', 'fr-CA': 'Test du système d’évacuation (WAGD)', 'en-INT': 'Test Scavenging System Function', 'ar-MA': 'اختبار نظام التخلص من الغازات العادمة' }, passCriterion: { 'fr-FR': 'Aucune obstruction ni surpression de l’évacuation.', 'fr-CA': 'Évacuation libre sans surpression.', 'en-INT': 'Scavenging vacuum/relief operating without auto-PEEP.', 'ar-MA': 'عمل سليم لنظام الإخلاء دون ضغط مرتد.' }, linkedFaultKey: 'scavengingObstruction' },
  { id: 'asa-10', number: 10, betweenCases: false, label: { 'fr-FR': 'Calibration analyseur O2 & alarme FiO2 basse', 'fr-CA': 'Calibration O2 & alarme basse', 'en-INT': 'Calibrate O2 Monitor & Check Low-O2 Alarm', 'ar-MA': 'معايرة مستشعر الأكسجين وإنذار الانخفاض' }, passCriterion: { 'fr-FR': '21% air ambiant + alarme FiO2 basse vérifiée.', 'fr-CA': 'Calibration et alarme O2 confirmées.', 'en-INT': 'Room air 21% verified and low-oxygen alarm triggered.', 'ar-MA': 'التأكد من دقة القراءة وتفعيل الإنذار.' } },
  { id: 'asa-11', number: 11, betweenCases: true, label: { 'fr-FR': 'Chaux sodée fraîche non épuisée', 'fr-CA': 'Absorbeur CO2 frais', 'en-INT': 'Verify CO2 Absorbent Is Fresh & Not Exhausted', 'ar-MA': 'التحقق من صلاحية الجير الصودي الماص للغاز' }, passCriterion: { 'fr-FR': 'Granulés blancs non virés au violet.', 'fr-CA': 'Absorbeur non épuisé.', 'en-INT': 'Canister granules not violet/exhausted (Between Cases).', 'ar-MA': 'عدم تحول الحبيبات إلى اللون البنفسجي.' }, linkedFaultKey: 'exhaustedSodaLime' },
  { id: 'asa-12', number: 12, betweenCases: true, label: { 'fr-FR': 'Test de pression et fuite du circuit patient', 'fr-CA': 'Test de pression et étanchéité du circuit', 'en-INT': 'Perform Breathing System Pressure & Leak Testing', 'ar-MA': 'اختبار ضغط وتسرب دارة التنفس' }, passCriterion: { 'fr-FR': 'Maintien de pression sans fuite ni déconnexion.', 'fr-CA': 'Circuit étanche vérifié.', 'en-INT': 'Circuit holds pressure without leak/disconnect (Between Cases).', 'ar-MA': 'ثبات الضغط دون تسرب.' }, linkedFaultKey: 'bellowsLeak' },
  { id: 'asa-13', number: 13, betweenCases: true, label: { 'fr-FR': 'Flux inspiratoire/expiratoire & valves unidirectionnelles', 'fr-CA': 'Débit dans les deux branches & valves', 'en-INT': 'Verify Proper Gas Flow in Inspiration & Exhalation', 'ar-MA': 'التحقق من تدفق الغاز الشهيقي والزفيري والصمامات' }, passCriterion: { 'fr-FR': 'Test à deux ballons validant les 2 valves.', 'fr-CA': 'Valves inspiratoire et expiratoire fonctionnelles.', 'en-INT': 'Two-bag test confirms competent valves (Between Cases).', 'ar-MA': 'تأكيد كفاءة صمامي الشهيق والزفير.' }, linkedFaultKey: 'stuckExpiratoryValve' },
  { id: 'asa-14', number: 14, betweenCases: true, label: { 'fr-FR': 'Documenter l’achèvement de la vérification', 'fr-CA': 'Consigner la vérification', 'en-INT': 'Document Completion of Checkout Procedures', 'ar-MA': 'توثيق إتمام إجراءات الفحص' }, passCriterion: { 'fr-FR': 'Tracée sur la feuille d’ouverture de salle.', 'fr-CA': 'Consignée au registre.', 'en-INT': 'Recorded in machine checkout log (Between Cases).', 'ar-MA': 'تسجيل الفحص رسمياً قبل التخدير.' } },
  { id: 'asa-15', number: 15, betweenCases: true, label: { 'fr-FR': 'Confirmer réglages ventilateur (Anesthesia Time Out)', 'fr-CA': 'Confirmer paramètres ventilateur (Temps d’arrêt)', 'en-INT': 'Confirm Ventilator Settings & Readiness (Time Out)', 'ar-MA': 'تأكيد إعدادات المنفسة والجاهزية للتخدير' }, passCriterion: { 'fr-FR': 'Mode, Vt, FR, PEP et limites confirmés pour le patient.', 'fr-CA': 'Paramètres confirmés avant induction.', 'en-INT': 'Ventilator mode/settings & readiness verified (Between Cases).', 'ar-MA': 'مراجعة نهائية لإعدادات التهوية قبل البدء.' } },
];

export interface MaplesonCircuitSpec {
  id: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  eponym: string;
  spontaneousEfficiencyRank: number; // 1 = best (ties allowed: D, E, F behave alike)
  controlledEfficiencyRank: number; // 1 = best
  spontaneousFgfRule: string;
  controlledFgfRule: string;
  clinicalNote: Record<LocaleCode, string>;
}

/**
 * Efficiency order follows the standard teaching (Kaul & Mittal, Indian J Anaesth 2013,
 * doi:10.4103/0019-5049.120148): spontaneous A > D/E/F > C > B; controlled D/E/F > B > C > A.
 * The original Pack 1 data ranked C below D and left B out; corrected here.
 */
export const MAPLESON_CIRCUITS: MaplesonCircuitSpec[] = [
  {
    id: 'A',
    eponym: 'Magill / Lack',
    spontaneousEfficiencyRank: 1,
    controlledEfficiencyRank: 4,
    spontaneousFgfRule: '0.7–1.0 x VE (most efficient spontaneous)',
    controlledFgfRule: '> 3 x VE (poor for controlled PPV)',
    clinicalNote: {
      'fr-FR': 'Le plus efficace en ventilation spontanée (chasse le gaz alvéolaire par l’APL près du patient); mauvais en ventilation contrôlée.',
      'fr-CA': 'Le plus efficace en ventilation spontanée; inefficace en ventilation contrôlée.',
      'en-INT': 'Most efficient Mapleson for spontaneous breathing (vents alveolar gas near patient); poor for controlled ventilation.',
      'ar-MA': 'الأكثر كفاءة للتنفس التلقائي؛ ضعيف الكفاءة في التهوية المتحكم بها.',
    },
  },
  {
    id: 'B',
    eponym: 'Mapleson B',
    spontaneousEfficiencyRank: 4,
    controlledEfficiencyRank: 2,
    spontaneousFgfRule: '≈ 2 x VE',
    controlledFgfRule: '≈ 2–2.5 x VE',
    clinicalNote: {
      'fr-FR': 'Gaz frais près de la valve patient; peu utilisé en pratique actuelle.',
      'fr-CA': 'Gaz frais près de la valve patient; rarement utilisé aujourd’hui.',
      'en-INT': 'Fresh gas enters near the patient valve; rarely used in current practice.',
      'ar-MA': 'يدخل الغاز الطازج قرب صمام المريض؛ نادر الاستعمال حالياً.',
    },
  },
  {
    id: 'C',
    eponym: 'Waters (sans chaux)',
    spontaneousEfficiencyRank: 3,
    controlledEfficiencyRank: 3,
    spontaneousFgfRule: '≈ 2 x VE',
    controlledFgfRule: '≈ 2–2.5 x VE',
    clinicalNote: {
      'fr-FR': 'Compact, utilisé en réanimation/transport et réveil pour ventilation manuelle à haut débit d’O2.',
      'fr-CA': 'Compact pour transport/réanimation manuelle à haut DGF.',
      'en-INT': 'Compact circuit favored for short ICU transport & resuscitation bagging with high O2 flow.',
      'ar-MA': 'دارة مدمجة للإنعاش والنقل السريع مع تدفق أكسجين مرتفع.',
    },
  },
  {
    id: 'D',
    eponym: 'Bain (coaxial)',
    spontaneousEfficiencyRank: 2,
    controlledEfficiencyRank: 1,
    spontaneousFgfRule: '2–3 x VE',
    controlledFgfRule: '1–1.5 x VE (most efficient controlled)',
    clinicalNote: {
      'fr-FR': 'Le plus efficace en ventilation contrôlée; effectuer le test de Pethick (effet Venturi) pour vérifier l’intégrité du tube interne.',
      'fr-CA': 'Optimal en ventilation contrôlée; test de Pethick obligatoire pour le tube interne coaxial.',
      'en-INT': 'Most efficient Mapleson for controlled ventilation; run the Pethick Venturi test to exclude inner-tube disconnection.',
      'ar-MA': 'الأكثر كفاءة للتهوية المتحكم بها؛ يجب إجراء اختبار Pethick للتأكد من سلامة الأنبوب الداخلي.',
    },
  },
  {
    id: 'E',
    eponym: 'Ayre T-Piece',
    spontaneousEfficiencyRank: 2,
    controlledEfficiencyRank: 1,
    spontaneousFgfRule: '2–3 x VE',
    controlledFgfRule: '2–3 x VE (thumb occlusion)',
    clinicalNote: {
      'fr-FR': 'Pièce en T sans valve ni ballon : résistance minimale, adaptée à la pédiatrie.',
      'fr-CA': 'Pièce en T d’Ayre sans valve ni ballon pour pédiatrie.',
      'en-INT': 'Valveless T-piece with no bag; minimal resistance for pediatrics.',
      'ar-MA': 'أنبوب حرف T بدون صمامات، مقاومة منخفضة للأطفال.',
    },
  },
  {
    id: 'F',
    eponym: 'Jackson-Rees',
    spontaneousEfficiencyRank: 2,
    controlledEfficiencyRank: 1,
    spontaneousFgfRule: '2–3 x VE',
    controlledFgfRule: '1.5–2 x VE',
    clinicalNote: {
      'fr-FR': 'Modification d’Ayre avec ballon ouvert à l’extrémité : permet PEP manuelle et ventilation pédiatrique/transport.',
      'fr-CA': 'Ballon ouvert permettant PEP manuelle en pédiatrie et transport.',
      'en-INT': 'Adds open-ended tail bag to Ayre T-piece; allows manual PEEP and tactile compliance feedback in pediatrics.',
      'ar-MA': 'يضيف بالوناً مفتوحاً يسمح بضبط PEP اليدوي في تخدير الأطفال والنقل.',
    },
  },
];
