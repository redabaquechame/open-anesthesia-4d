/** Traductions françaises du registre des preuves (src/evidence/evidenceRegistry.ts). Les nombres, unités, doses et seuils sont identiques à l'original. */
export interface EvidenceFr { title: string; keyFinding: string; clinicalTakeaway: string }

export const EVIDENCE_FR: Record<string, EvidenceFr> = {
  'equation-of-motion': {
    title: 'Équation du mouvement du système respiratoire',
    keyFinding:
      'La pression des voies aériennes est la somme d’un terme élastique (volume divisé par la compliance), d’un terme résistif (résistance multipliée par le débit) et de la pression de fin d’expiration (PEP). La pression de plateau isole la composante élastique ; la différence pression de crête − pression de plateau reflète la résistance.',
    clinicalTakeaway:
      'Une pression de crête qui augmente avec un plateau stable oriente vers la résistance (bronchospasme, sonde coudée) ; un plateau qui augmente oriente vers la compliance (pneumopéritoine, poumons rigides).',
  },
  'capnography-waveform': {
    title: 'Capnographie : phases et morphologies de la courbe',
    keyFinding:
      'Revue de la capnographie temporelle et de son utilisation en dehors du bloc opératoire, incluant l’interprétation de la courbe et les morphologies observées lors de problèmes des voies aériennes et du circuit.',
    clinicalTakeaway:
      'Lire la forme, pas seulement le chiffre : une ligne de base élevée signifie une réinhalation ; une phase ascendante inclinée en « aileron de requin » signifie une obstruction expiratoire.',
  },
  'argon-concentrator': {
    title: 'L’argon s’accumule dans les circuits filtres à bas débit alimentés par l’O2 d’un concentrateur',
    keyFinding:
      'L’oxygène issu d’un concentrateur à zéolite contenait environ 5 % d’argon, qui s’accumule dans les circuits filtres partiellement et totalement fermés. Les auteurs recommandent un débit d’O2 frais au moins égal à deux fois la consommation d’O2, et l’ouverture périodique d’un circuit totalement fermé.',
    clinicalTakeaway:
      'Avec l’O2 d’un concentrateur à très bas débit, surveiller la baisse progressive de la FiO2 ; maintenir un débit d’O2 d’au moins 2 × VO2 ou purger périodiquement le circuit.',
  },
  'anaesthesia-ventilators': {
    title: 'Ventilateurs d’anesthésie : soufflets, pistons et découplage du gaz frais',
    keyFinding:
      'Les soufflets ascendants sont plus sûrs que les soufflets descendants ; les ventilateurs à piston sont à entraînement électrique, ne nécessitent pas de gaz moteur et délivrent des volumes courants précis. Le découplage du gaz frais a été ajouté aux ventilateurs à piston et à soufflet descendant pour réduire le volotraumatisme induit par le ventilateur.',
    clinicalTakeaway:
      'Connaître sa machine : un soufflet descendant continue de bouger après une déconnexion, et l’activation du by-pass d’O2 (flush) pendant l’inspiration sur un soufflet non découplé ajoute du volume à l’insufflation.',
  },
  'mapleson-systems': {
    title: 'Systèmes respiratoires de Mapleson A–F',
    keyFinding:
      'Chez l’adulte, le Mapleson A est le circuit de choix en ventilation spontanée, tandis que le Mapleson D et sa modification de Bain sont les plus adaptés à la ventilation contrôlée. Chez le nouveau-né et l’enfant, les Mapleson E et F (Jackson-Rees) sont préférés.',
    clinicalTakeaway: 'Ventilation spontanée : A > D/E/F > C > B. Ventilation contrôlée : D/E/F > B > C > A.',
  },
  'circle-low-flow': {
    title: 'Le circuit filtre, le circuit fermé et l’anesthésie à bas débit',
    keyFinding:
      'Un circuit filtre avec absorbeur de CO2 peut fonctionner avec des débits aussi bas que 250–500 mL/min. Les valves unidirectionnelles doivent être placées sur les deux branches, le gaz frais ne doit pas entrer entre la valve expiratoire et le patient, et la valve APL ne doit pas être placée entre le patient et la valve inspiratoire.',
    clinicalTakeaway:
      'À bas débit, la fraction inspirée d’O2 devient inférieure à la fraction d’O2 du gaz frais car le patient continue de consommer de l’O2 : toujours surveiller la FiO2.',
  },
  'bis-nmb-awake': {
    title: 'Le BIS diminue sous curarisation chez des volontaires éveillés',
    keyFinding:
      'Chez 10 volontaires totalement éveillés ayant reçu du suxaméthonium et du rocuronium (sans anesthésique), le BIS est descendu jusqu’à 44 et 47 sur deux versions actuelles du moniteur et n’a pas récupéré avant le retour des mouvements.',
    clinicalTakeaway:
      'Le BIS a besoin d’une activité musculaire en plus d’un EEG d’éveil pour afficher « éveillé » : un BIS bas chez un patient curarisé n’exclut pas un réveil peropératoire (awareness).',
  },
  'corrugator-vs-adductor': {
    title: 'Muscle sourcilier (corrugator supercilii) versus adducteur du pouce après rocuronium',
    keyFinding:
      'Chez 201 patients ayant reçu du rocuronium 0,6 ou 1,0 mg/kg, le délai d’installation était significativement plus court à l’orbiculaire de l’œil et au muscle sourcilier qu’à l’adducteur du pouce.',
    clinicalTakeaway:
      'Le monitorage d’un site facial permet d’intuber plus tôt ; l’adducteur du pouce reste le site pour évaluer la récupération du bloc avant l’extubation.',
  },
  'eleveld-propofol': {
    title: 'Modèle PK-PD du propofol d’Eleveld (population large)',
    keyFinding:
      'Construit à partir de 30 études (1033 individus, de 27 semaines d’âge post-menstruel à 88 ans, 0,68–160 kg). Pour un homme de 35 ans, 170 cm, 70 kg, sans médicament associé : V1 6,28, V2 25,5, V3 273 L ; CL 1,79, Q2 1,75, Q3 1,11 L/min ; ke0 0,146 /min.',
    clinicalTakeaway:
      'Un seul modèle couvre l’enfant, l’adulte, le sujet âgé et le patient à IMC élevé, et prédit le BIS ; le simulateur reproduit exactement ces valeurs de référence (npm run sanity).',
  },
  'yasuda-sevo-iso': {
    title: 'Captation du sévoflurane versus isoflurane chez des volontaires',
    keyFinding:
      'À 30 min de concentration inspirée constante, le rapport FA/FI était de 0,986 pour le protoxyde d’azote, 0,850 pour le sévoflurane et 0,733 pour l’isoflurane (moyenne, 7 volontaires).',
    clinicalTakeaway:
      'Une plus faible solubilité sanguine entraîne une montée plus rapide de la concentration alvéolaire. Le simulateur donne 0,865 (sévo) et 0,731 (iso) dans les mêmes conditions (npm run sanity).',
  },
  'esaic-nmb-2023': {
    title: 'Recommandations ESAIC : gestion périopératoire du bloc neuromusculaire',
    keyFinding:
      'Recommande la stimulation du nerf ulnaire avec monitorage quantitatif à l’adducteur du pouce pour exclure une curarisation résiduelle (1B) ; le sugammadex pour antagoniser les blocs profonds, modérés et superficiels par curares aminostéroïdiens (1A) ; un rapport TOF > 0,2 avant la néostigmine et un monitorage jusqu’à un rapport TOF > 0,9 (1C).',
    clinicalTakeaway: 'Ne pas extuber sur des signes cliniques : mesurer un rapport TOF supérieur à 0,9 à l’adducteur du pouce.',
  },
  'bridion-smpc': {
    title: 'Sugammadex (Bridion) : Résumé des caractéristiques du produit (RCP) européen, rubrique 4.2',
    keyFinding:
      'Adultes : 4 mg/kg si la récupération a atteint au moins 1–2 comptes post-tétaniques (PTC) ; 2 mg/kg à la réapparition de T2 ; 16 mg/kg pour une antagonisation immédiate (étudiée 3 min après rocuronium 1,2 mg/kg). Non recommandé en cas d’insuffisance rénale sévère (ClCr < 30 mL/min, y compris en dialyse). Patients obèses : dose calculée sur le poids réel. Récurarisation après 2 ou 4 mg/kg : nouvelle dose de 4 mg/kg.',
    clinicalTakeaway: 'Doser selon la profondeur mesurée du bloc, jamais selon la taille du flacon.',
  },
  'asra-last-2020': {
    title: 'Check-list ASRA de la toxicité systémique des anesthésiques locaux (LAST) (2020, v1.1)',
    keyFinding:
      'Émulsion lipidique à 20 %. Plus de 70 kg : bolus d’environ 100 mL en 2–3 min, perfusion d’environ 250 mL en 15–20 min. Moins de 70 kg : bolus d’environ 1,5 mL/kg en 2–3 min, perfusion d’environ 0,25 mL/kg/min. En cas d’instabilité : répéter le bolus, doubler la perfusion. Poursuivre ≥ 15 min après la stabilisation ; maximum 12 mL/kg. Convulsions : assurer une gestion adéquate des voies aériennes, benzodiazépine à privilégier. Adrénaline : commencer par ≤ 1 µg/kg. Éviter les anesthésiques locaux, les bêtabloquants, les inhibiteurs calciques et la vasopressine.',
    clinicalTakeaway:
      'La réanimation d’une LAST diffère de la réanimation standard (ACLS) : administrer les lipides précocement et utiliser de faibles doses d’adrénaline. L’ASRA indique que la check-list est en cours de révision (mise à jour attendue début 2027).',
  },
  'brodsky-dlt-depth': {
    title: 'Profondeur d’insertion des sondes à double lumière gauches',
    keyFinding:
      'Chez 101 adultes, la profondeur moyenne d’insertion était de 29 cm pour une taille de 170 cm (hommes et femmes) ; chaque variation de 10 cm de taille modifiait la profondeur moyenne de 1 cm. La profondeur suivait une distribution normale quelle que soit la taille.',
    clinicalTakeaway: 'La taille ne prédit que la profondeur de départ : toujours confirmer la position par fibroscopie bronchique.',
  },
  'benumof-dlt-margin': {
    title: 'Marge de sécurité du positionnement des sondes à double lumière',
    keyFinding:
      'Longueur de la bronche souche : homme 49 ± 8 mm à gauche / 19 ± 6 mm à droite ; femme 44 ± 7 / 15 ± 5 mm. Diamètre de la bronche lobaire supérieure droite 11 mm. Marge de sécurité moyenne d’une sonde à double lumière (SDL) gauche 16–19 mm ; SDL droite Mallinckrodt 8 mm.',
    clinicalTakeaway:
      'Les sondes gauches laissent une marge bien plus large que les sondes droites, et cette marge n’est malgré tout que de quelques millimètres : confirmer par fibroscopie bronchique.',
  },
  'yoon-dlt-displacement': {
    title: 'Déplacement de la sonde à double lumière lors du passage en décubitus latéral',
    keyFinding:
      '100 patients, SDL gauche, mesures par fibroscopie bronchique : déplacement décubitus dorsal → latéral de 6,3 ± 5,5 mm (orifice trachéal ↔ carène) et de 2,4 ± 3,6 mm (orifice bronchique ↔ carène bronchique) sans collier cervical ; > 5 mm chez 48 % (12 % avec collier).',
    clinicalTakeaway:
      'Les mouvements de la tête et du cou déplacent la sonde : revérifier sa position par fibroscopie bronchique après chaque changement de position.',
  },
  'yao-lmb-desaturation': {
    title: 'Bronche souche gauche courte et désaturation pendant la ventilation unipulmonaire',
    keyFinding:
      '360 patients avec une SDL gauche (bronche mesurée au scanner) : une bronche souche gauche < 40 mm était associée à une désaturation pendant la ventilation unipulmonaire (OR 8,087) ; de même que le diabète, une chirurgie avec exclusion du poumon droit et l’IMC.',
    clinicalTakeaway:
      'Une bronche souche gauche courte réduit la marge avant que l’extrémité de la sonde n’obstrue l’orifice de la bronche lobaire supérieure gauche.',
  },
  'severinghaus-odc': {
    title: 'Équation de la courbe de dissociation de l’oxyhémoglobine',
    keyFinding: 'Une équation de Hill modifiée reproduit la courbe standard de dissociation de l’O₂ chez l’humain à ± 0,0055 de saturation près.',
    clinicalTakeaway: 'Utilisée ici pour convertir la PaO₂ simulée en SaO₂ (courbe standard : pH 7,40, 37 °C).',
  },
  'bodyparts3d': {
    title: 'BodyParts3D : base de données d’anatomie 3D (source des maillages osseux et vasculaires)',
    keyFinding:
      'Base de données anatomique de type dictionnaire : chaque concept anatomique est un segment 3D d’un même modèle corps entier d’homme adulte, avec les identifiants de concept FMA.',
    clinicalTakeaway:
      'Formes réelles, un seul corps : tailles, profondeurs et rapports varient d’un patient à l’autre. Le plexus et la plèvre de M6 sont schématiques.',
  },
  'harrison-epidural-depth': {
    title: 'Profondeur de l’espace péridural lombaire depuis la peau',
    keyFinding:
      'Chez 1000 parturientes, la distance médiane peau–espace péridural était de 4,7 cm ; elle était maximale en L3–4 (4,93 cm) et minimale en L1–2 (4,23 cm).',
    clinicalTakeaway:
      'S’attendre à une perte de résistance vers 4–5 cm chez de nombreux adultes, mais la profondeur varie selon l’espace intervertébral et le patient : ne jamais se fier à une profondeur fixe.',
  },
  'suga-elastance': {
    title: 'Élastance variable dans le temps : indépendance du rapport pression–volume vis-à-vis de la charge',
    keyFinding:
      'Dans le ventricule gauche du chien, le rapport pression–volume instantané était indépendant de la charge et variait avec l’adrénaline et la fréquence cardiaque.',
    clinicalTakeaway:
      'L’élastance télésystolique (pente de la relation pression–volume télésystolique, ESPVR) reflète la contractilité indépendamment de la précharge et de la postcharge.',
  },
  'westerhof-windkessel': {
    title: 'Le Windkessel artériel (modèle à trois éléments)',
    keyFinding:
      'Le Windkessel à deux éléments (résistance + compliance) explique la décroissance diastolique mais pas la systole ; l’ajout de l’impédance caractéristique fournit une approximation simple et assez précise de la postcharge ventriculaire.',
    clinicalTakeaway:
      'La postcharge ne se résume pas à la résistance : la compliance et l’impédance caractéristique façonnent la pression aortique.',
  },
  'eu-fgas-2024': {
    title: 'Règlement (UE) 2024/573 sur les gaz fluorés : restriction du desflurane et valeurs de PRG (GWP)',
    keyFinding:
      'Art. 13(8) : l’utilisation du desflurane comme anesthésique par inhalation est interdite à partir du 1er janvier 2026, sauf lorsqu’elle est strictement nécessaire et qu’aucun autre anesthésique ne peut être utilisé pour des raisons médicales ; l’établissement conserve les preuves de cette justification. Annexe II (fondée sur l’AR6) : PRG du desflurane 2590, isoflurane 539, sévoflurane 195, enflurane 654. Annexe VI : PRG-100 du N2O 273.',
    clinicalTakeaway:
      'Dans l’UE, l’utilisation courante du desflurane n’est plus légale ; le sévoflurane à bas débit est l’halogéné bas carbone par défaut.',
  },
  'purdon-propofol-eeg': {
    title: 'Signatures EEG de la perte et de la récupération de conscience sous propofol',
    keyFinding:
      'La perte de conscience était marquée par une augmentation de la puissance des basses fréquences (< 1 Hz), une perte de l’alpha occipital cohérent (8–12 Hz) et l’apparition d’un alpha frontal cohérent ; ces modifications s’inversaient à la récupération.',
    clinicalTakeaway:
      'Alpha frontal et ondes lentes : c’est la signature du propofol à rechercher sur la matrice de densité spectrale (DSA).',
  },
  'lee-rcri-1999': {
    title: 'Revised Cardiac Risk Index (score de Lee, 1999)',
    keyFinding:
      'Six facteurs prédictifs indépendants de complications cardiaques majeures après chirurgie non cardiaque programmée chez 4 315 patients âgés de 50 ans ou plus. Taux dans la cohorte de validation : 0 facteur 0,4 %, 1 facteur 0,9 %, 2 facteurs 6,6 %, 3 ou plus 11,0 %.',
    clinicalTakeaway: 'Compter les six facteurs ; trois ou plus placent le patient en classe IV. Validé uniquement en chirurgie programmée.',
  },
  'esc-noncardiac-2022': {
    title: 'Recommandations ESC 2022 sur l’évaluation cardiovasculaire avant chirurgie non cardiaque',
    keyFinding:
      'La Task Force ne recommande aucun score de risque en particulier. L’incapacité, rapportée par le patient, à monter deux étages apporte une valeur ajoutée au RCRI. Biomarqueurs : troponine hypersensible (classe I) et/ou BNP/NT-proBNP (classe IIa) chez des patients sélectionnés.',
    clinicalTakeaway: 'Associer un score de risque, la capacité fonctionnelle et, chez les patients à risque, l’ECG et les biomarqueurs.',
  },
  'stopbang': {
    title: 'Questionnaire STOP-Bang pour le syndrome d’apnées obstructives du sommeil (SAOS)',
    keyFinding:
      'Huit items oui/non. Un score de 3 ou plus a une sensibilité de 93 % pour un SAOS modéré à sévère (IAH > 15) et de 100 % pour un SAOS sévère, mais une spécificité d’environ 31 % seulement. La probabilité de SAOS sévère passe de 4 % pour un score de 0–2 à 38 % pour 7–8.',
    clinicalTakeaway: 'Un score bas est rassurant ; un score élevé justifie des précautions liées au SAOS (épargne morphinique, surveillance).',
  },
  'apfel-1999': {
    title: 'Score de risque simplifié des nausées et vomissements postopératoires (NVPO) (Apfel 1999)',
    keyFinding:
      'Quatre facteurs prédictifs (sexe féminin, antécédent de NVPO ou de mal des transports, non-fumeur, opioïdes postopératoires). 0 à 4 facteurs correspondent à une incidence de 10, 21, 39, 61 et 79 % dans les 24 h.',
    clinicalTakeaway: 'À partir de deux facteurs, envisager une prophylaxie.',
  },
  'ariscat-canet-2010': {
    title: 'ARISCAT : prédiction des complications pulmonaires postopératoires (Canet 2010)',
    keyFinding:
      'Sept facteurs prédictifs chez 2 464 patients de 59 hôpitaux : SpO2 basse, infection respiratoire récente, âge, anémie, chirurgie abdominale haute ou intrathoracique, chirurgie de 2 h ou plus, urgence. Des complications pulmonaires sont survenues chez 5 % des patients et ont fait passer la mortalité à 30 jours de 0,5 % à 19,5 %.',
    clinicalTakeaway:
      'Les patients à haut risque (≥ 45 points) nécessitent une stratégie de protection pulmonaire. Les valeurs des points dans l’application doivent encore être vérifiées par rapport à l’article.',
  },
  'esa-fasting-2011': {
    title: 'Jeûne périopératoire chez l’adulte et l’enfant (ESA 2011) + mise à jour ASA 2023',
    keyFinding:
      'ESA 2011 : liquides clairs jusqu’à 2 h, solides 6 h ; ne pas annuler pour un chewing-gum, un bonbon ou le tabac. ASA 2023 : l’adulte en bonne santé peut boire des liquides clairs contenant des glucides (jusqu’à 400 mL) jusqu’à 2 h avant la chirurgie.',
    clinicalTakeaway: 'Encourager les liquides clairs jusqu’à 2 h avant la chirurgie ; un jeûne prolongé n’est pas plus sûr.',
  },
  'esaic-paed-fasting-2022': {
    title: 'Recommandations ESAIC : jeûne préopératoire chez l’enfant (2022)',
    keyFinding:
      'Liquides clairs jusqu’à 1 h avant l’induction, lait maternel jusqu’à 3 h, lait infantile (préparation pour nourrissons) ou lait d’origine non humaine jusqu’à 4 h.',
    clinicalTakeaway: 'Des jeûnes plus courts chez l’enfant réduisent la soif, l’inconfort et l’hypotension à l’induction.',
  },
  'glp1-multisociety-2024': {
    title: 'Agonistes des récepteurs du GLP-1 avant une chirurgie : recommandations multisociétés (2024)',
    keyFinding:
      'Décision partagée. Poursuivre en l’absence de critères de haut risque ; en cas d’arrêt, interrompre le jour même (traitements quotidiens) ou une semaine avant (traitements hebdomadaires). Régime liquide pendant 24 h en cas de doute ; l’échographie gastrique peut aider.',
    clinicalTakeaway:
      'Rechercher la prise d’agonistes du GLP-1 à chaque consultation préanesthésique et anticiper le retard de vidange gastrique.',
  },
  'aoa-qrh-mh-2021': {
    title: 'Crise d’hyperthermie maligne — fiche QRH 3-8 de l’Association of Anaesthetists (v.2, 2021)',
    keyFinding:
      'Reconnaître : augmentation inexpliquée de l’EtCO2, tachycardie, augmentation de la consommation d’O2 (la température est un signe tardif). Supprimer les agents déclenchants (évaporateur fermé, O2 100 % à haut débit, ventilation × 2–3, filtres à charbon actif), anesthésie intraveineuse totale (TIVA), dantrolène 2–3 mg/kg puis 1 mg/kg toutes les 5 min jusqu’à EtCO2 < 6 kPa et T < 38,5 °C, refroidissement actif, traiter l’acidose et l’hyperkaliémie.',
    clinicalTakeaway:
      'Le traitement, c’est le dantrolène précoce. L’EMHG 2024 utilise 2–2,5 mg/kg répétés toutes les 10 min ; suivre la fiche HM de votre établissement.',
  },
  'garvey-anaphylaxis-2019': {
    title: 'Suspicion de réaction allergique périopératoire immédiate : consensus international (2019)',
    keyFinding:
      'Grades I–IV (Ring et Messmer modifié). Adrénaline IV chez l’adulte : grade II 20 µg → 50 µg ; grade III 50 µg → 200 µg toutes les 2 min ; grade IV 1 mg selon l’algorithme ALS. Remplissage : grade III 1 L, jusqu’à 30 mL/kg. Réanimation cardio-pulmonaire (RCP) si PAS < 50 mmHg. Corticoïdes et antihistaminiques uniquement après l’adrénaline et le remplissage. Tryptase à 1 h et à 2–4 h, dosage de base à ≥ 24 h.',
    clinicalTakeaway:
      'L’adrénaline IV titrée et le remplissage vasculaire sont le traitement de première intention ; les signes cutanés sont souvent absents dans les réactions sévères.',
  },
  'das-2025': {
    title: 'Recommandations 2025 de la Difficult Airway Society : intubation trachéale difficile non prévue chez l’adulte',
    keyFinding:
      'Plans A (≤ 3 + 1 tentatives) → B (dispositif supraglottique de deuxième génération, ≤ 3 tentatives) → C (dernière tentative au masque facial) → déclarer la situation CICO (« impossible d’intuber, impossible d’oxygéner ») → D (abord trachéal par voie cervicale antérieure scalpel–bougie–sonde, incision verticale par défaut lorsque la membrane n’est pas clairement palpable). Déclarer l’échec à chaque étape ; maintenir l’oxygénation tout au long de la prise en charge.',
    clinicalTakeaway:
      'Limiter les tentatives, annoncer chaque échec à voix haute et passer sans délai à l’abord trachéal par voie cervicale antérieure dès que la situation CICO est déclarée.',
  },
  'rcuk-als-2025': {
    title: 'Réanimation cardio-pulmonaire spécialisée de l’adulte 2025 (Resuscitation Council UK, adaptation de l’ERC 2025)',
    keyFinding:
      'Rythme choquable : chocs uniques avec cycles de RCP de 2 min ; adrénaline 1 mg après le 3e choc, puis toutes les 3–5 min ; amiodarone 300 mg après 3 chocs et 150 mg après 5 (ou lidocaïne 100 mg + 50 mg). Compressions 100–120/min, 5–6 cm. Traiter les 4 H et les 4 T. Pas de calcium ni de bicarbonate en routine.',
    clinicalTakeaway: 'Une RCP de haute qualité et une défibrillation précoce passent en premier ; les médicaments viennent après le troisième choc.',
  },
  'sfar-machine-checkout': {
    title: 'SFAR — l’appareil d’anesthésie et sa vérification avant utilisation',
    keyFinding:
      'Recommandations françaises sur l’appareil d’anesthésie et sa vérification par l’utilisateur : by-pass d’O2 d’au moins 30 L/min ; contenu de la bouteille de réserve = contenance gravée × pression en bars, à remplacer à 150 L ou moins ; analyseur d’O2 à 21 ± 2 % à l’air et > 90 % en O2, alarme basse testée à 40 % avec O2 2 + N2O 4 L/min ; fuite du système d’alimentation en gaz frais ≤ 50 mL/min à 30 cmH2O (selon l’ISO 5358).',
    clinicalTakeaway: 'Vérifier l’appareil avant chaque programme avec la procédure écrite ; le texte date de 1994, les appareils récents en auto-testent une partie.',
  },
  'asa-pac-2008': {
    title: 'Recommandations ASA 2008 pour la vérification pré-anesthésique',
    keyFinding:
      'Quinze items à vérifier chaque jour (ou après maintenance, déplacement ou changement d’évaporateur), dont huit à refaire avant chaque patient ; chaque item précise qui peut le faire (anesthésiste, technicien ou auto-test de l’appareil).',
    clinicalTakeaway: 'Adapter la liste au modèle d’appareil ; le moyen de ventilation de secours et l’aspiration se vérifient avant chaque patient.',
  },
  'who-mcpc-2017': {
    title: 'Prise en charge des complications de la grossesse et de l’accouchement (OMS, 2e éd.)',
    keyFinding:
      'Des convulsions pendant la grossesse sont traitées comme une éclampsie jusqu’à preuve du contraire. Le sulfate de magnésium est le médicament de choix : charge de 4 g IV (schéma IM ou IV), 2 g IV en cas de récidive après 15 min, entretien pendant 24 h ; suspendre si FR < 16/min, réflexes rotuliens absents ou diurèse < 30 ml/h ; gluconate de calcium 1 g IV en antidote. Traiter une PA ≥ 160/110 (hydralazine, labétalol, nifédipine) sans descendre sous la normale. Naissance dans les 12 h suivant le début des convulsions.',
    clinicalTakeaway: 'Le magnésium d’abord, puis la pression artérielle, puis la naissance ; vérifier respiration, réflexes et diurèse avant chaque dose.',
  },
  'sogc-pph-2022': {
    title: 'Directive clinique n° 431 : hémorragie post-partum et choc hémorragique',
    keyFinding:
      'Stade de l’HPP selon les pertes mesurées, pas selon les constantes. Ocytocine en première ligne (bolus IV ≤ 3 UI ou 10 UI IM, puis perfusion) ; utérotonique de 2e ligne sans tonus à 4 min ; acide tranexamique 1 g IV, renouvelable une fois après 30 min ; compression bimanuelle, vidange vésicale, ballonnet de Bakri, puis embolisation ou chirurgie. Hb 70–90 g/l pendant le saignement ; protocole 1:1:1 ou 2:1:1 ; fibrinogène s’il est < 2 g/l.',
    clinicalTakeaway: 'Mesurer les pertes, appeler tôt, restaurer le tonus utérin, donner l’acide tranexamique et transfuser avant la triade létale.',
  },
  'esaic-bleeding-2023': {
    title: 'Prise en charge des hémorragies périopératoires sévères : recommandations ESAIC, deuxième mise à jour 2022',
    keyFinding:
      'Hémorragie massive en chirurgie programmée : rapport plasma:CGR ≥ 1:1 (2C), puis traitement guidé par objectifs dès que possible (1C). Maintenir le calcium > 0,9 mmol/L et la normothermie ; Hb 7–9 g/dL pendant le saignement actif (1B) ; CCP plutôt que PFC (1B) ; cristalloïdes balancés (2C). Acide tranexamique 1 g IV dans les 3 h en cas d’hémorragie du post-partum (1B).',
    clinicalTakeaway:
      'Contrôler la source du saignement, administrer précocement des produits sanguins de façon équilibrée, puis passer à un traitement ciblé guidé par les tests.',
  },
};
