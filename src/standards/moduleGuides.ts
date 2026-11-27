/**
 * "What is this module for and how do I use it" — one guide per module, shown at the top of each
 * module and on the home page. Procedural and conceptual only: no clinical numbers here (numbers
 * live in the modules, each with its claim in claimRegistry.ts).
 */
import type { AppModuleId } from './programmeTypes';

type Txt = { fr: string; en: string };

export interface ModuleGuide {
  id: AppModuleId;
  /** Short, plain title used in the navigation. */
  title: Txt;
  /** Where it sits in the anaesthesia workflow (for grouping on the home page). */
  group: 'preop' | 'machine' | 'pharma' | 'airway' | 'regional' | 'crisis' | 'programme';
  /** One sentence: what the module is for. */
  purpose: Txt;
  /** Learning objectives. */
  learn: Txt[];
  /** How to use the screen, in order. */
  steps: Txt[];
  /** The few things to watch for (the teaching points). */
  watch: Txt[];
  /** Suggested use by a teacher. */
  teach?: Txt;
}

export const GROUPS: { id: ModuleGuide['group']; title: Txt }[] = [
  { id: 'programme', title: { fr: 'Votre programme officiel', en: 'Your official programme' } },
  { id: 'preop', title: { fr: 'Avant l’anesthésie', en: 'Before anaesthesia' } },
  { id: 'machine', title: { fr: 'Appareil, ventilation et gaz', en: 'Machine, ventilation and gases' } },
  { id: 'pharma', title: { fr: 'Pharmacologie et monitorage', en: 'Pharmacology and monitoring' } },
  { id: 'airway', title: { fr: 'Voies aériennes et thorax', en: 'Airway and thorax' } },
  { id: 'regional', title: { fr: 'Anesthésie locorégionale et échographie', en: 'Regional anaesthesia and ultrasound' } },
  { id: 'crisis', title: { fr: 'Situations critiques', en: 'Critical events' } },
];

export const MODULE_GUIDES: ModuleGuide[] = [
  {
    id: 'M11',
    group: 'programme',
    title: { fr: 'Programmes officiels et bibliothèque', en: 'Official programmes and library' },
    purpose: {
      fr: 'Retrouver votre programme de formation officiel (Maroc, France, Canada/Québec, Europe), étape par étape, relié aux simulateurs et aux textes de référence.',
      en: 'Find your official training programme (Morocco, France, Canada/Québec, Europe), stage by stage, linked to the simulators and the reference texts.',
    },
    learn: [
      { fr: 'Ce que votre programme attend à chaque étape (jalons, phases, compétences)', en: 'What your programme expects at each stage (milestones, phases, competencies)' },
      { fr: 'Quels simulateurs travaillent chaque compétence', en: 'Which simulators train each competency' },
      { fr: 'Où trouver le texte officiel et les recommandations nationales', en: 'Where to find the official text and the national guidelines' },
    ],
    steps: [
      { fr: 'Choisissez votre pays et votre programme.', en: 'Choose your country and programme.' },
      { fr: 'Ouvrez votre étape (année, jalon ou phase).', en: 'Open your stage (year, milestone or phase).' },
      { fr: 'Pour chaque compétence, ouvrez le simulateur proposé, puis cochez-la quand vous la maîtrisez. La progression reste sur cet appareil.', en: 'For each competency, open the suggested simulator, then tick it when you master it. Progress stays on this device.' },
      { fr: 'Dans la bibliothèque, filtrez par pays ou par domaine pour lire les textes de référence.', en: 'In the library, filter by country or domain to read the reference texts.' },
    ],
    watch: [
      { fr: 'Chaque ressource indique comment elle a été lue (texte intégral, résumé) et sa licence.', en: 'Each resource says how it was read (full text, abstract) and its licence.' },
      { fr: 'Les textes nationaux priment : le simulateur ne remplace pas votre maquette officielle.', en: 'National texts prevail: the simulator does not replace your official programme.' },
    ],
    teach: { fr: 'Projetez l’étape d’un groupe de résidents et répartissez les compétences à travailler.', en: 'Project a stage for a group of residents and assign the competencies to work on.' },
  },
  {
    id: 'M10',
    group: 'preop',
    title: { fr: 'Consultation pré-anesthésique', en: 'Pre-operative assessment' },
    purpose: {
      fr: 'S’entraîner à la consultation : scores de risque validés, règles de jeûne et cas cliniques corrigés.',
      en: 'Practise the pre-operative visit: validated risk scores, fasting rules and corrected clinical cases.',
    },
    learn: [
      { fr: 'Coter ASA, RCRI, STOP-Bang, Apfel et ARISCAT, et savoir ce que chaque score prédit', en: 'Score ASA, RCRI, STOP-Bang, Apfel and ARISCAT, and know what each predicts' },
      { fr: 'Calculer l’heure d’induction possible selon le dernier repas ou la dernière boisson', en: 'Work out the earliest induction time from the last food or drink' },
      { fr: 'Rédiger une synthèse de risque sur un cas réel', en: 'Write a risk summary for a realistic case' },
    ],
    steps: [
      { fr: 'Ouvrez un cas clinique et lisez-le.', en: 'Open a clinical case and read it.' },
      { fr: 'Remplissez chaque score à partir du dossier, sans regarder la correction.', en: 'Fill in each score from the file, without looking at the answer.' },
      { fr: 'Cliquez « Vérifier mes réponses » : chaque écart est expliqué avec sa source.', en: 'Click “Check my answers”: each difference is explained with its source.' },
      { fr: 'Utilisez l’onglet Jeûne pour les horaires.', en: 'Use the Fasting tab for timings.' },
    ],
    watch: [
      { fr: 'Les limites de chaque score sont affichées : un score oriente, il ne décide pas.', en: 'Each score’s limits are shown: a score guides, it does not decide.' },
    ],
  },
  {
    id: 'M1_M2',
    group: 'machine',
    title: { fr: 'Appareil d’anesthésie et ventilation', en: 'Anaesthesia machine and ventilation' },
    purpose: {
      fr: 'Voir à l’intérieur d’un appareil d’anesthésie en fonctionnement : trajet des gaz, ventilateur, valves, absorbeur, et leur effet sur les courbes du patient.',
      en: 'See inside a working anaesthesia machine: gas path, ventilator, valves, absorber, and their effect on the patient’s curves.',
    },
    learn: [
      { fr: 'Suivre le gaz frais, le circuit filtre et l’évacuation', en: 'Follow fresh gas, the circle system and scavenging' },
      { fr: 'Comparer les six types de ventilateur (soufflets, piston, turbine, réflecteur, draw-over)', en: 'Compare the six ventilator drives (bellows, piston, turbine, reflector, draw-over)' },
      { fr: 'Relier une panne à sa signature sur la pression, le débit et le capnogramme', en: 'Link a fault to its signature on pressure, flow and the capnogram' },
      { fr: 'Faire la vérification de l’appareil (check-list SFAR, ASA 2008)', en: 'Perform the machine checkout (SFAR, ASA 2008 checklists)' },
    ],
    steps: [
      { fr: 'Choisissez un ventilateur dans le panneau 1 et observez-le dans la vue 3D (glissez pour tourner, pincez pour zoomer).', en: 'Pick a ventilator in panel 1 and watch it in the 3D view (drag to rotate, pinch to zoom).' },
      { fr: 'Réglez débits, évaporateur, PEP, résistance et compliance dans le panneau 2.', en: 'Set flows, vaporizer, PEEP, resistance and compliance in panel 2.' },
      { fr: 'Déclenchez une panne dans le panneau 3 et cherchez ses signes sur l’écran du ventilateur et le moniteur.', en: 'Trigger a fault in panel 3 and look for its signs on the ventilator screen and the monitor.' },
      { fr: 'Utilisez le curseur « Rayons X » pour voir à travers le capot, et « Légendes » pour nommer les pièces.', en: 'Use the “X-ray” slider to see through the casing, and “Labels” to name the parts.' },
      { fr: 'Mode « ECOS à l’aveugle » : une panne cachée, capot opaque ; faites le diagnostic avant de révéler.', en: '“Blind OSCE” mode: a hidden fault, opaque casing; make the diagnosis before revealing.' },
    ],
    watch: [
      { fr: 'Couleur des gaz (rubans ou particules) : O₂ bleu, CO₂ rouge, halogéné à la couleur ISO 5360, argon violet.', en: 'Gas colours (ribbons or particles): O₂ blue, CO₂ red, agent in its ISO 5360 colour, argon violet.' },
      { fr: 'Les couleurs des gaz changent selon le pays : lisez toujours l’étiquette.', en: 'Gas colours differ by country: always read the label.' },
    ],
    teach: { fr: 'Mode projecteur et ECOS à l’aveugle pour un enseignement au tableau ; le QR partage le réglage exact avec la salle.', en: 'Projector mode and blind OSCE for chalk talks; the QR code shares the exact setup with the room.' },
  },
  {
    id: 'M3',
    group: 'machine',
    title: { fr: 'Halogénés et bas débit', en: 'Volatile agents and low flow' },
    purpose: {
      fr: 'Comprendre la cinétique des halogénés (FD, FI, FA, cerveau), l’intérêt du bas débit et l’empreinte carbone de chaque agent.',
      en: 'Understand volatile kinetics (FD, FI, FA, brain), the value of low flow and each agent’s carbon footprint.',
    },
    learn: [
      { fr: 'Pourquoi la solubilité sang/gaz fixe la vitesse d’induction et de réveil', en: 'Why blood/gas solubility sets the speed of induction and emergence' },
      { fr: 'L’effet du débit de gaz frais, du débit cardiaque, de la ventilation et du shunt', en: 'The effect of fresh gas flow, cardiac output, ventilation and shunt' },
      { fr: 'Consommation de liquide et équivalent CO₂ selon le débit et l’agent', en: 'Liquid use and CO₂ equivalent by flow and agent' },
    ],
    steps: [
      { fr: 'Choisissez l’agent, puis le débit de gaz frais et le réglage de l’évaporateur.', en: 'Choose the agent, then fresh gas flow and vaporizer setting.' },
      { fr: 'Observez les courbes FD, FI, FA et cerveau se rapprocher.', en: 'Watch the FD, FI, FA and brain curves converge.' },
      { fr: 'Lancez un scénario (bas débit, desflurane, induction pédiatrique, erreur de remplissage, réveil lent).', en: 'Run a scenario (low flow, desflurane, paediatric induction, misfill, slow emergence).' },
    ],
    watch: [
      { fr: 'Certaines données (coefficients tissulaires, PRG) sont encore marquées « à vérifier ».', en: 'Some data (tissue partitions, GWP) are still marked “to verify”.' },
    ],
  },
  {
    id: 'M4',
    group: 'pharma',
    title: { fr: 'AIVOC et profondeur d’anesthésie', en: 'TCI and depth of anaesthesia' },
    purpose: {
      fr: 'Piloter une AIVOC propofol/rémifentanil et comparer les modèles pharmacocinétiques, avec l’EEG frontal et sa matrice spectrale.',
      en: 'Run propofol/remifentanil TCI and compare pharmacokinetic models, with the frontal EEG and its spectrogram.',
    },
    learn: [
      { fr: 'Différence entre cible plasmatique et cible au site effet', en: 'Difference between plasma and effect-site targeting' },
      { fr: 'Pourquoi Marsh, Schnider et Eleveld ne donnent pas les mêmes doses', en: 'Why Marsh, Schnider and Eleveld give different doses' },
      { fr: 'Reconnaître sur l’EEG une anesthésie trop légère ou trop profonde', en: 'Recognise too light or too deep anaesthesia on the EEG' },
    ],
    steps: [
      { fr: 'Renseignez le patient (âge, poids, taille, sexe).', en: 'Enter the patient (age, weight, height, sex).' },
      { fr: 'Choisissez le modèle principal et un modèle « fantôme » à comparer.', en: 'Choose the main model and a “ghost” model to compare.' },
      { fr: 'Fixez les cibles et observez débit de perfusion, Cp, Ce et l’EEG.', en: 'Set the targets and watch the infusion rate, Cp, Ce and the EEG.' },
    ],
    watch: [
      { fr: 'Les équations des modèles sont en cours de vérification sur les articles originaux.', en: 'Model equations are being checked against the original papers.' },
    ],
  },
  {
    id: 'M5',
    group: 'pharma',
    title: { fr: 'Curares et monitorage (TOF)', en: 'Neuromuscular block and TOF' },
    purpose: {
      fr: 'Comprendre le monitorage de la curarisation : train-de-quatre, compte post-tétanique, site de mesure et décurarisation.',
      en: 'Understand neuromuscular monitoring: train-of-four, post-tetanic count, monitoring site and reversal.',
    },
    learn: [
      { fr: 'Pourquoi le sourcilier et l’adducteur du pouce ne disent pas la même chose', en: 'Why the corrugator and adductor pollicis disagree' },
      { fr: 'Quand extuber : critère du rapport TOF', en: 'When to extubate: the TOF ratio criterion' },
      { fr: 'Mode d’action du sugammadex et de la néostigmine', en: 'How sugammadex and neostigmine work' },
    ],
    steps: [
      { fr: 'Injectez le curare, puis stimulez (TOF, PTC) aux deux sites.', en: 'Give the blocker, then stimulate (TOF, PTC) at both sites.' },
      { fr: 'Décurarisez et vérifiez le rapport TOF avant de conclure.', en: 'Reverse and check the TOF ratio before concluding.' },
    ],
    watch: [
      { fr: 'Deux PTC doivent être espacés (au moins 2 min selon le standard de recherche GCRP 2023) : la stimulation tétanique fausse la mesure suivante.', en: 'Two PTCs must be spaced (at least 2 min in the GCRP 2023 research standard): tetanic stimulation distorts the next reading.' },
    ],
  },
  {
    id: 'M8',
    group: 'airway',
    title: { fr: 'Fibroscopie et sonde double lumière', en: 'Bronchoscopy and double-lumen tube' },
    purpose: {
      fr: 'Placer et vérifier une sonde double lumière gauche sur un arbre bronchique réel, avec la vue du fibroscope.',
      en: 'Place and check a left double-lumen tube in a real bronchial tree, with the bronchoscope view.',
    },
    learn: [
      { fr: 'Choisir la taille et la profondeur de la sonde', en: 'Choose tube size and depth' },
      { fr: 'Reconnaître la carène et les orifices lobaires au fibroscope', en: 'Recognise the carina and lobar orifices with the scope' },
      { fr: 'Effet d’une sonde trop haute, trop basse ou à droite sur l’isolation pulmonaire', en: 'Effect of a tube too high, too deep or right-sided on lung isolation' },
    ],
    steps: [
      { fr: 'Panneau 1 : taille du patient, taille de sonde, profondeur, gonflage du ballonnet.', en: 'Panel 1: patient height, tube size, depth, cuff inflation.' },
      { fr: 'Panneau 2 : position du patient.', en: 'Panel 2: patient position.' },
      { fr: 'Fibroscope : touches W/S pour avancer, A/D pour tourner, Q/E pour béqueter.', en: 'Bronchoscope: W/S to advance, A/D to rotate, Q/E to flex.' },
    ],
    watch: [
      { fr: 'Les lobes changent de couleur selon leur ventilation.', en: 'Lobes change colour with their ventilation.' },
      { fr: 'Anatomie : BodyParts3D (DBCLS).', en: 'Anatomy: BodyParts3D (DBCLS).' },
    ],
  },
  {
    id: 'M6',
    group: 'regional',
    title: { fr: 'Échographie (ALR) et hémodynamique', en: 'Ultrasound blocks and haemodynamics' },
    purpose: {
      fr: 'Relier la sonde d’échographie à l’image en coupe sur une anatomie réelle, et comprendre les boucles pression-volume et les vasopresseurs selon le choc.',
      en: 'Link the ultrasound probe to the cross-sectional image on real anatomy, and understand pressure-volume loops and vasopressors by type of shock.',
    },
    learn: [
      { fr: 'Repères du bloc supraclaviculaire et trajet de l’aiguille dans le plan', en: 'Supraclavicular block landmarks and in-plane needle path' },
      { fr: 'Distinguer artère et veine à l’écho', en: 'Tell artery from vein on ultrasound' },
      { fr: 'Lire une boucle pression-volume selon la valvulopathie', en: 'Read a pressure-volume loop by valve disease' },
    ],
    steps: [
      { fr: 'Déplacez et inclinez la sonde : l’image 2D suit la coupe 3D.', en: 'Move and tilt the probe: the 2D image follows the 3D slice.' },
      { fr: 'Avancez l’aiguille dans le plan en suivant la séquence en 5 étapes.', en: 'Advance the needle in plane following the 5-step sequence.' },
      { fr: 'Dans l’onglet cœur, changez précharge, postcharge et contractilité.', en: 'In the heart tab, change preload, afterload and contractility.' },
    ],
    watch: [{ fr: 'Anatomie : BodyParts3D (DBCLS).', en: 'Anatomy: BodyParts3D (DBCLS).' }],
  },
  {
    id: 'M7',
    group: 'regional',
    title: { fr: 'Péridurale et rachis', en: 'Epidural and spine' },
    purpose: {
      fr: 'Réaliser une péridurale lombaire ou thoracique sur un rachis réel : niveau, abord médian ou paramédian, angles et perte de résistance.',
      en: 'Perform a lumbar or thoracic epidural on a real spine: level, midline or paramedian approach, angles and loss of resistance.',
    },
    learn: [
      { fr: 'Pourquoi l’angle céphalique diffère entre lombaire et thoracique', en: 'Why the cephalad angle differs between lumbar and thoracic levels' },
      { fr: 'Les couches traversées jusqu’à l’espace péridural', en: 'The layers crossed to reach the epidural space' },
      { fr: 'Reconnaître et corriger un contact osseux', en: 'Recognise and correct bone contact' },
    ],
    steps: [
      { fr: 'Panneau 1 : niveau, abord, flexion du rachis, tissus mous.', en: 'Panel 1: level, approach, spine flexion, soft tissue.' },
      { fr: 'Panneau 2 : point de ponction, angles, puis faites progresser l’aiguille de Tuohy.', en: 'Panel 2: puncture point, angles, then advance the Tuohy needle.' },
      { fr: 'Regardez la seringue (perte de résistance) et l’amplificateur de brillance.', en: 'Watch the syringe (loss of resistance) and the C-arm view.' },
    ],
    watch: [
      { fr: 'Les valeurs de résistance de la seringue sont relatives (illustratives).', en: 'Syringe resistance values are relative (illustrative).' },
      { fr: 'Anatomie : BodyParts3D (DBCLS).', en: 'Anatomy: BodyParts3D (DBCLS).' },
    ],
  },
  {
    id: 'M9',
    group: 'crisis',
    title: { fr: 'Gestion de crise', en: 'Crisis management' },
    purpose: {
      fr: 'S’entraîner aux crises du bloc en temps réel, avec moniteur, gestes dans l’ordre, doses au poids et débriefing sourcé.',
      en: 'Train for theatre crises in real time, with a monitor, ordered actions, weight-based doses and a sourced debrief.',
    },
    learn: [
      { fr: 'Reconnaître la crise sur le moniteur', en: 'Recognise the crisis on the monitor' },
      { fr: 'Dérouler l’algorithme de la recommandation dans le bon ordre', en: 'Run the guideline algorithm in the right order' },
      { fr: 'Calculer les doses au poids et éviter les pièges', en: 'Work out weight-based doses and avoid the traps' },
      { fr: 'Connaître les différences locales (Maroc, France, Canada)', en: 'Know local differences (Morocco, France, Canada)' },
    ],
    steps: [
      { fr: 'Choisissez une crise (ou « Cas à l’aveugle » pour la découvrir sur le moniteur).', en: 'Choose a crisis (or “Blind case” to find it from the monitor).' },
      { fr: 'Cliquez « Démarrer », puis choisissez les gestes dans l’ordre où vous les feriez. Certains sont des pièges.', en: 'Click “Start”, then pick the actions in the order you would do them. Some are traps.' },
      { fr: 'Ajustez le poids si besoin : les doses se recalculent.', en: 'Adjust the weight if needed: doses recalculate.' },
      { fr: 'Cliquez « Terminer et débriefer » : gestes faits, ordre, oublis et source de chaque étape.', en: 'Click “End and debrief”: actions done, order, omissions and the source of each step.' },
    ],
    watch: [
      { fr: 'L’évolution des constantes est un modèle pédagogique ; les gestes et doses viennent des recommandations citées.', en: 'Vital-sign changes are a teaching model; actions and doses come from the cited guidelines.' },
      { fr: 'Suivez toujours le protocole de votre établissement.', en: 'Always follow your institution’s protocol.' },
    ],
    teach: { fr: 'Lancez un cas à l’aveugle projeté, laissez l’équipe décider, puis débriefez avec la séquence de référence.', en: 'Run a projected blind case, let the team decide, then debrief against the guideline sequence.' },
  },
];

export const guideFor = (id: string) => MODULE_GUIDES.find((g) => g.id === id);
