/**
 * France — DES d’anesthésie-réanimation (co-DES avec la médecine intensive-réanimation).
 * Arrêté du 21 avril 2017 relatif aux connaissances, compétences et maquettes de formation des DES,
 * annexe publiée au JORF du 20 décembre 2017 (texte 49 sur 126). Annexe lue en entier le 2026-11-26.
 * Texte officiel : résumé fidèlement, dans l’ordre du texte.
 */
import type { Programme } from '../programmeTypes';

type Item = Programme['stages'][number]['items'][number];
const S = (id: string, text: string, domain: string, modules?: Item['modules'], resources?: string[]): Item => ({ id, text, domain, modules, resources });

export const FR_DES_AR: Programme = {
  id: 'fr-des-ar-2017',
  region: 'fr',
  label: 'DES Anesthésie-Réanimation',
  flag: '🇫🇷',
  officialTitle: 'Diplôme d’études spécialisées d’anesthésie-réanimation (co-DES avec médecine intensive-réanimation)',
  body: 'Ministère de l’Enseignement supérieur et ministère de la Santé — arrêté du 21 avril 2017 (annexe, JORF du 20 décembre 2017)',
  version: 'Maquette 2017 (JORF du 20/12/2017), modifiée par les arrêtés du 3 mars 2022 et du 5 juin 2026 (en vigueur le 1er septembre 2026)',
  url: 'https://medecine.univ-grenoble-alpes.fr/medias/fichier/maquette-d-e-s-anesthesie-reanimation_1622549686227-pdf',
  reading: 'texte intégral',
  duration: '10 semestres (5 ans), dont au moins 4 avec encadrement universitaire et au moins 2 sans encadrement universitaire',
  legal: [
    { title: 'Arrêté du 5 juin 2026 (JORF du 6/06/2026, art. 11) — stages de pédiatrie, nombre minimal d’enfants, consolidation en 2 semestres, 28 FST', url: 'https://www.fhf.fr/sites/default/files/2026-06/Arr%C3%AAt%C3%A9%20du%205%20juin%202026%20-%20DES,%20option,%20formations%20sp%C3%A9cialis%C3%A9es%20transversales%20et%20maquettes.pdf' },
    { title: 'Arrêté du 3 mars 2022 (JORF du 9/03/2022, art. 5-I) — 3e option d’approfondissement, consolidation par défaut 1 semestre d’anesthésie + 1 de réanimation, EDAIC/EDIC', url: 'https://medecine.univ-cotedazur.fr/medias/fichier/arre-te-03-03-2022-r3c-options-fst-jo-09-03-22_1739447665550-pdf' },
    { title: 'Arrêté du 16 janvier 2020 — référentiel de mises en situation du docteur junior (autonomie supervisée)', url: 'https://facmedecine.umontpellier.fr/wp-content/uploads/2021/09/Arrete-du-16-janvier-2020.pdf' },
    { title: 'Arrêté du 23 octobre 2026 (JORF du 25/10/2026) — gardes et astreintes des docteurs juniors', url: 'https://www.fhf.fr/sites/default/files/2026-11/Arr%C3%AAt%C3%A9%20du%2023%20octobre%202026%20gardes%20des%20DJ_0.pdf' },
    { title: 'Livret CNEAR 2022 du DES d’anesthésie-réanimation et médecine périopératoire (377 cours sur SIDES NG)', url: 'https://ufr-sante.univ-reunion.fr/fileadmin/Fichiers/sante/04-formation/02-Medecine/3eme_Cycle/DES/DES_anesthesie/Livret_CNEAR_2022_Final__2_.pdf' },
  ],
  structure:
    'Trois phases : socle (2 semestres), approfondissement (6 semestres), consolidation (1 an). Enseignements hors stage : 2 demi-journées par semaine (une supervisée, une en autonomie), en présentiel, simulation, séminaires et à distance. Option réanimation pédiatrique ; une formation spécialisée transversale possible parmi la liste nationale (28 FST depuis 2026, dont douleur, soins palliatifs, nutrition, pharmacologie, hygiène).',
  assessment:
    'Socle : chaque UE validée par QCM ou dossiers cliniques progressifs, évaluation des stages, portfolio numérique et quantification des actes. Approfondissement : QCM, tests de concordance de script, dossiers cliniques progressifs, progression des gestes en autonomie suivie dans le portfolio. Consolidation (docteur junior, autonomie supervisée) : cas cliniques, capacité d’autonomie, nombre de gardes, portfolio, mémoire et document de synthèse (portfolio, thèse, communications, projet). Certification européenne possible à titre individuel (EDAIC, EDIC/CoBaTriCE).',
  stages: [
    {
      id: 'fr-socle',
      title: 'Phase socle',
      duration: '2 semestres',
      summary: 'UE 1 compétences génériques (risques, éthique, communication, risques sanitaires exceptionnels) ; UE 2 bases de l’anesthésie et de la réanimation ; UE 3 physiopathologie des défaillances d’organes ; UE 4 gestes techniques et simulation.',
      placements: [
        '1 stage d’anesthésie (lieu agréé à titre principal en anesthésie-réanimation, hors secteur hyperspécialisé)',
        '1 stage de réanimation (agréé en médecine intensive-réanimation ou en anesthésie-réanimation)',
        'L’un des deux de préférence avec encadrement universitaire ; garde formatrice d’interne',
      ],
      items: [
        S('fr-s-1', 'Réanimation cardio-respiratoire', 'resus', ['M9'], ['erc-2025', 'cfrc-2025', 'fr-sfar-uvih-2026']),
        S('fr-s-2', 'Abord des voies aériennes et ventilation assistée', 'airway', ['M1_M2', 'M8', 'M9'], ['fr-sfar-airway-2026', 'fr-sfar-id-2017', 'fr-sfar-intub-urg-2025']),
        S('fr-s-3', 'Bases de l’abord vasculaire et du cathétérisme ; drainage thoracique', 'monitoring'),
        S('fr-s-4', 'Bases de l’anesthésie générale et locorégionale', 'ga', ['M1_M2', 'M3', 'M6', 'M7']),
        S('fr-s-5', 'Utiliser les agents d’anesthésie, d’analgésie et de sédation', 'pharmacology', ['M3', 'M4', 'M5']),
        S('fr-s-6', 'Utiliser les vasopresseurs et les inotropes', 'pharmacology', ['M6']),
        S('fr-s-7', 'Échographie en réanimation (niveau 1)', 'pocus', ['M6']),
        S('fr-s-8', 'Évaluer et traiter un malade en état de choc', 'resus', ['M9', 'M6'], ['fr-has-sepsis-2025', 'fr-sfar-choc-hemo-2015']),
        S('fr-s-9', 'Transfusion sanguine et hémovigilance', 'fluids', ['M9'], ['fr-sfar-choc-hemo-2015', 'esaic-bleeding-2023r']),
      ],
    },
    {
      id: 'fr-appro-ar',
      title: 'Phase d’approfondissement — médecine périopératoire (filière anesthésie-réanimation)',
      duration: '6 semestres',
      placements: [
        'Au choix : 3 stages d’anesthésie + 2 de réanimation en lieu agréé AR + 1 de réanimation en lieu agréé MIR',
        'ou : 3 stages d’anesthésie + 1 de réanimation AR + 1 de réanimation MIR + 1 stage libre',
        'ou (depuis 2022) : 2 stages d’anesthésie + 1 de réanimation AR + 1 de réanimation MIR + 2 stages libres',
        'Depuis le 1er septembre 2026 : au moins 3 mois en anesthésie pédiatrique et 3 mois dans un secteur d’anesthésie avec activité pédiatrique ou en réanimation pédiatrique',
        'Réanimation agréée : plus de 8 lits, plus de 20 % de patients ventilés, occupation supérieure à 70 %, encadrement permanent ; participation à la permanence des soins',
      ],
      items: [
        S('fr-a-A', 'A. Évaluer le risque opératoire, prémédiquer, préparer et informer : consultation, classes de risque, risque allergique, examens, gestion des traitements, jeûne de l’adulte et de l’enfant', 'preop', ['M10'], ['fr-sfar-csa', 'fr-sfar-raac-2014', 'fr-sfar-aod-2026', 'fr-sfar-abp-2024', 'esaic-preop-2024', 'esaic-fasting-child-2022']),
        S('fr-a-B1', 'B. Conduire une AG : contrôles avant l’acte, voies aériennes, appareil d’anesthésie (vérification, fonctionnement, modes ventilatoires, conduite à tenir en cas de panne)', 'machine', ['M1_M2', 'M8']),
        S('fr-a-B2', 'B. Installation et posture ; profondeur d’anesthésie ; monitorage de base (SpO₂, capnométrie, ECG, PA) ; induction en urgence ou sans voie veineuse ; besoins liquidiens ; hypothermie', 'ga', ['M1_M2', 'M3', 'M4']),
        S('fr-a-C', 'C. Conduire le réveil : surveillance, incidents, prévention des nausées et vomissements', 'postop', ['M5', 'M10'], ['fr-sfar-nvpo-2008', 'fr-sfar-curare-2018', 'gan-ponv-2020']),
        S('fr-a-D', 'D. Pratiquer l’ALR : pharmacologie des anesthésiques locaux, rachianesthésie, péridurale, caudale, blocs périphériques, complications', 'regional', ['M6', 'M7', 'M9'], ['fr-sfar-last', 'fr-sfar-aod-2026', 'fr-sfar-alr-ped-2026', 'esaic-ra-antithrombotic-2022']),
        S('fr-a-E', 'E. Gérer la douleur per- et postopératoire : morphiniques et antagonistes, non-morphiniques, anti-hyperalgésiques, évaluation et monitorage de l’analgésie, douleur chronique', 'postop', [], ['fr-sfar-dpo-2016']),
        S('fr-a-E2', 'Gestes de douleur chronique dans un parcours coordonné avec un médecin titulaire de la FST, du DESC ou de la capacité douleur (ajout 2026)', 'chronicpain'),
        S('fr-a-Fa', 'F-a. Fonction respiratoire : insuffisant respiratoire, asthme, allergie, chirurgie thoracique et thoracoscopie, œsophage', 'cardiothoracic', ['M8', 'M1_M2']),
        S('fr-a-Fb', 'F-b. Fonction cardiovasculaire : coronarien, troubles du rythme, insuffisance cardiaque, HTA, choc, chirurgie cardiaque et vasculaire, CEC et assistances, cardiologie interventionnelle', 'cardiothoracic', ['M6'], ['fr-sfar-hemo-2024']),
        S('fr-a-Fc', 'F-c. Système nerveux : hémodynamique cérébrale et monitorage, chirurgie sus- et sous-tentorielle, anévrismes, rachis, myasthénie et myopathies, Parkinson', 'neuro', ['M4', 'M7']),
        S('fr-a-Fd', 'F-d. Métabolisme : diabète, insuffisance rénale, thyroïde et parathyroïdes, surrénales, obésité', 'organ'),
        S('fr-a-Fe', 'F-e. Hémostase et transfusion : anomalies de l’hémostase, thromboprophylaxie, accidents transfusionnels, épargne sanguine, autotransfusion', 'fluids', ['M9'], ['fr-sfar-choc-hemo-2015', 'fr-sfar-aap-2018', 'esaic-bleeding-2023r', 'esaic-doac-2024']),
        S('fr-a-Ff', 'F-f. Obstétrique : pharmacologie de la grossesse, césarienne, analgésie du travail, prééclampsie, hémorragie de la délivrance, embolie amniotique', 'obstetric', ['M7', 'M9'], ['fr-sfar-travail-2025', 'fr-cngof-hpp-2014', 'fr-sfar-hemo-2024', 'esaic-failing-epidural-2025']),
        S('fr-a-Fg', 'F-g. Pédiatrie : circuits, monitorage, intubation, agents et curares, apports hydro-électrolytiques, période néonatale, urgences digestives du nourrisson, cardiopathies, ALR, amygdalectomie', 'paediatric', [], ['fr-sfar-airway-child-2018', 'fr-sfar-paed-orga-2023', 'esaic-neonatal-airway-2024']),
        S('fr-a-Fg2', 'Portfolio pédiatrique (arrêté du 5 juin 2026) : au moins 10 enfants de moins d’1 an dont 2 nouveau-nés, 20 enfants de 1 à 3 ans et 60 enfants de 3 à 10 ans', 'paediatric', [], ['fr-arrete-2026']),
        S('fr-a-Fh', 'F-h. Chirurgie céphalique : laryngectomie, laser, endoscopies, oreille moyenne, ophtalmologie, maxillo-facial, dentaire', 'specialties', ['M8']),
        S('fr-a-Fi', 'F-i. Chirurgie digestive, urologique, orthopédique et plastique ; transplanté', 'specialties'),
        S('fr-a-Fj', 'F-j. Anesthésie hors bloc : endoscopies digestives, radiologie et neuroradiologie interventionnelles', 'specialties', [], ['ma-smaar-sedation-2018']),
        S('fr-a-G', 'G. Ultrasons : fonction et charge ventriculaires, péricarde, plèvre, abdomen et vessie, repérage vasculaire, doppler transcrânien, sono-anatomie des blocs', 'pocus', ['M6']),
      ],
    },
    {
      id: 'fr-appro-rea',
      title: 'Phase d’approfondissement — réanimation (référentiel européen CoBaTriCE, commun aux deux DES)',
      duration: 'pendant les 6 semestres',
      items: [
        S('fr-r-1', 'Approche structurée du patient grave avec une ou plusieurs défaillances ; prescrire et interpréter les examens', 'icu'),
        S('fr-r-2', 'Défaillances rénale, neurologique, cardio-circulatoire, pulmonaire, hépato-digestive et hématologique', 'icu', ['M6']),
        S('fr-r-3', 'Sepsis, antibiothérapie, intoxications', 'icu', [], ['fr-has-sepsis-2025', 'ma-smaar-sepsis-2025']),
        S('fr-r-4', 'Complications du péripartum menaçant la vie de la mère', 'obstetric', ['M9'], ['fr-cngof-hpp-2014', 'ma-smaar-hpp', 'ca-sogc-431']),
        S('fr-r-5', 'Produits sanguins, remplissage, vasopresseurs et inotropes, assistances circulatoires mécaniques', 'fluids', ['M6', 'M9']),
        S('fr-r-6', 'Ventilation invasive et non invasive et sevrage ; épuration extrarénale et sevrage', 'icu', ['M1_M2'], ['fr-srlf-sdra-2019']),
        S('fr-r-7', 'Troubles hydro-électrolytiques, glycémiques et acido-basiques ; nutrition', 'organ'),
        S('fr-r-8', 'Patient chirurgical à haut risque (cardiaque, neurochirurgie), transplanté, traumatisé', 'icu'),
        S('fr-r-9', 'Douleur, délire, sédation et curarisation en réanimation', 'icu', ['M4', 'M5'], ['esaic-delirium-2024', 'fr-sfar-curare-2018', 'esaic-nmb-2023']),
        S('fr-r-10', 'Limitation ou arrêt des traitements, fin de vie, soins palliatifs, mort encéphalique et don d’organes', 'ethics'),
        S('fr-r-11', 'Transport du patient grave ; sortie de réanimation et transmission', 'resus'),
      ],
    },
    {
      id: 'fr-conso',
      title: 'Phase de consolidation',
      duration: '1 an — docteur junior (2 stages d’un semestre depuis 2026 ; par défaut 1 en anesthésie et 1 en réanimation)',
      placements: [
        'Lieux agréés à titre principal ou complémentaire en anesthésie-réanimation',
        'Autonomie supervisée par étapes (senior présent tout le geste → au début et à la fin → débriefing a posteriori) ; gardes et astreintes possibles à la demande (arrêté du 23 octobre 2026)',
        'Garde de la spécialité : seconde liste de garde avec un senior sur place en anesthésie ; astreinte de senior en réanimation',
        'Séminaires de préparation à l’exercice : cas cliniques, démarche qualité, éthique, médico-légal',
      ],
      items: [
        S('fr-c-1', 'Conduire la visite pluridisciplinaire quotidienne de l’unité', 'nts'),
        S('fr-c-2', 'Surveillance des infections ; risques environnementaux ; sécurité des patients et du personnel', 'safety', [], ['helsinki-2025']),
        S('fr-c-3', 'Identifier et réduire les risques d’incidents graves et d’effets indésirables', 'safety', ['M9', 'M1_M2'], ['fr-sfar-hm-2019', 'fr-sfar-hsi-2025', 'fr-sfar-last']),
        S('fr-c-4', 'Organiser une revue de cas en groupe', 'education', ['M9']),
        S('fr-c-5', 'Scores de gravité, case mix et charge de travail', 'icu'),
        S('fr-c-6', 'Responsabilités administratives et de gestion du spécialiste', 'safety'),
        S('fr-c-7', 'Mémoire validé ; nombre de gardes ; portfolio complet', 'education'),
      ],
    },
    {
      id: 'fr-option-rp',
      title: 'Option réanimation pédiatrique',
      duration: '2 semestres',
      placements: ['Deux stages d’un semestre en réanimation pédiatrique ou mixte pédiatrique et néonatale (au plus un en réanimation de chirurgie cardiaque ou de neurochirurgie pédiatriques)'],
      items: [
        S('fr-o-1', 'Prérequis PEDIC partie 1 : physiologie et développement de l’enfant, examen, monitorage, réanimation cardio-pulmonaire, prise en charge initiale', 'paediatric'),
        S('fr-o-2', 'Défaillances d’organes de l’enfant, soins postopératoires, transport, accompagnement des familles', 'paediatric'),
        S('fr-o-3', 'Validation : QCM en ligne PEDIC, portfolio, séance de simulation de réanimation pédiatrique, entretien avec la commission', 'education', ['M9']),
      ],
    },
  ],
  reuse: 'Texte réglementaire publié au Journal officiel : les actes officiels ne sont pas protégés par le droit d’auteur. Résumé fidèle ; seule la publication au JORF fait foi.',
  caveats: [
    'Légifrance n’a pas pu être consulté (contrôle anti-robot) : les arrêtés ont été lus dans des copies PDF du JORF hébergées par des universités et la FHF. Seule la version de Légifrance fait foi.',
    'Aucune liste nationale publique d’objectifs par phase (CNEAR) ni contenu national du portfolio n’a été trouvé, en dehors des nombres minimaux pédiatriques de 2026.',
  ],
};
