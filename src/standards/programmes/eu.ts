/**
 * Europe — UEMS/EBA European Training Requirements in Anaesthesiology, update 2022
 * (UEMS 2024/30). 48-page PDF read in full on 2026-11-26. Competencies are paraphrased in French;
 * the letter is the ETR level: A = connaissance / observe, B = sous supervision directe,
 * C = sous supervision à distance, D = en autonomie.
 */
import type { Programme } from '../programmeTypes';

const S = (id: string, text: string, domain: string, modules?: Programme['stages'][number]['items'][number]['modules'], resources?: string[]) => ({ id, text, domain, modules, resources });

export const EU_ETR: Programme = {
  id: 'eu-etr-2022',
  region: 'eu',
  label: 'UEMS/EBA — ETR 2022',
  flag: '🇪🇺',
  officialTitle: 'European Training Requirements in Anaesthesiology — mise à jour 2022',
  body: 'UEMS Section et European Board of Anaesthesiology (EBA)',
  version: '2022 (UEMS 2024/30) ; prochaine révision annoncée pour 2025, non publiée à ce jour',
  url: 'https://www.uems.eu/european-training-requirements',
  reading: 'texte intégral',
  duration: '5 ans minimum, dont au moins 1 an de réanimation (continu ou non)',
  legal: [
    { title: 'Liste UEMS des European Training Requirements (Anaesthesiology 2024/30)', url: 'https://www.uems.eu/european-training-requirements' },
    { title: 'Consensus ESAIC/EBA sur la formation par compétences (Eur J Anaesthesiol 2020;37:421-434)', url: 'https://pubmed.ncbi.nlm.nih.gov/32205575/' },
  ],
  structure:
    'Formation par compétences (CBMET), sans nombre minimal d’actes au niveau européen : les sociétés nationales peuvent en fixer. 12 domaines de compétences générales (1.1 à 1.12) et 5 domaines spécifiques (2.1 à 2.5), chacun décliné en connaissances, gestes cliniques (avec un niveau A à D) et attitudes. Quatre rôles : expert clinicien, leader professionnel, universitaire, humaniste.',
  assessment:
    'Évaluations formatives en situation de travail (DOPS, A-CEX, ALAT, CBD), carnet de bord et e-portfolio ; EPA définies par chaque hôpital (10 exemples dans l’annexe). Connaissances par QCM ou oral. Bilan obligatoire en début de cursus, EDAIC partie I après 3 ans, diplôme national ou EDAIC partie II en fin de formation.',
  stages: [
    {
      id: 'eu-1-1',
      title: 'Domaine 1.1 — Médecine périopératoire, évaluation et réduction du risque',
      items: [
        S('eu-1-1-a', 'Évaluer le patient (interrogatoire, examen, examens complémentaires) à tout âge, en programmé comme en urgence — D', 'preop', ['M10'], ['esaic-preop-2024']),
        S('eu-1-1-b', 'Utiliser les scores de risque, dont la classe ASA — D', 'preop', ['M10']),
        S('eu-1-1-c', 'Évaluer les voies aériennes — D', 'airway', ['M10', 'M8']),
        S('eu-1-1-d', 'Interpréter ECG, EFR, gaz du sang, épreuve d’effort, imagerie, hémostase, bilans hépatique, rénal et endocrinien — D', 'preop', ['M10'], ['esaic-biomarkers-2023']),
        S('eu-1-1-e', 'Optimiser le patient en équipe (anémie, cœur, poumon) — D', 'preop', ['M10']),
        S('eu-1-1-f', 'Appliquer les règles de jeûne, de traitement et de prémédication — D', 'preop', ['M10'], ['esa-fasting-2011', 'esaic-fasting-child-2022']),
        S('eu-1-1-g', 'Patients porteurs de stimulateur ou de défibrillateur implantable — D', 'preop'),
        S('eu-1-1-h', 'Décider d’un report ou d’une annulation ; informer et recueillir le consentement — D', 'ethics', ['M10']),
      ],
    },
    {
      id: 'eu-1-2',
      title: 'Domaine 1.2 — Anesthésie générale et sédation',
      items: [
        S('eu-1-2-a', 'Préparer le poste de travail selon les check-lists et les règles de sécurité — D', 'machine', ['M1_M2']),
        S('eu-1-2-b', 'Induction, entretien et réveil, par voie inhalée et intraveineuse — D', 'ga', ['M3', 'M4']),
        S('eu-1-2-c', 'Dépanner les pannes simples des moniteurs et des machines — D', 'machine', ['M1_M2']),
        S('eu-1-2-d', 'Défibrillation et cardioversion — D', 'resus', ['M9'], ['erc-2025']),
        S('eu-1-2-e', 'Abords vasculaires périphériques et centraux, intra-osseux, artériels, gaz du sang — D', 'ga'),
        S('eu-1-2-f', 'Transfusion et récupération sanguine peropératoire — D', 'fluids', ['M9'], ['esaic-bleeding-2023r']),
        S('eu-1-2-g', 'Gérer les incidents critiques avec la check-list de crise : anaphylaxie, laryngo/bronchospasme, embolie gazeuse, inhalation, pneumothorax, hypoxie, hyper/hypocapnie, pressions de pointe élevées, arythmies, arrêt cardiaque, oligurie, hypo/hyperthermie, hyperthermie maligne, réveil peropératoire, convulsions, réaction transfusionnelle, hémorragie sévère — D', 'crisis', ['M9', 'M1_M2'], ['helsinki-2025', 'esaic-arrest-2023']),
        S('eu-1-2-h', 'Sédation pour gestes invasifs et anesthésie hors bloc (IRM, scanner, sismothérapie) — D', 'sedation'),
        S('eu-1-2-i', 'Critères de sortie de SSPI et d’ambulatoire — D', 'postop'),
        S('eu-1-2-j', 'Positionnement du patient et maintien de l’homéostasie des organes — D', 'ga'),
      ],
    },
    {
      id: 'eu-1-3',
      title: 'Domaine 1.3 — Anesthésie locorégionale',
      items: [
        S('eu-1-3-a', 'ALR sûre : choix des produits, technique, contrôles de sécurité, monitorage — D', 'regional', ['M6', 'M7'], ['esaic-ra-antithrombotic-2022']),
        S('eu-1-3-b', 'Guidage échographique des blocs — D', 'regional', ['M6']),
        S('eu-1-3-c', 'Rachianesthésie, péridurale thoracique et lombaire, rachi-péridurale combinée, caudale — D', 'regional', ['M7']),
        S('eu-1-3-d', 'Blocs du membre supérieur (interscalénique, axillaire), du membre inférieur (fémoral, obturateur, sciatique) et du tronc (paravertébral, intercostal) — D', 'regional', ['M6']),
        S('eu-1-3-e', 'Blocs des plans fasciaux (PECS, ESP, TAP, QLB, gaine des droits) — C', 'regional'),
        S('eu-1-3-f', 'Reconnaître et traiter : bloc insuffisant, rachianesthésie totale, pneumothorax, toxicité systémique des AL (LAST) — D', 'regional', ['M9', 'M6']),
        S('eu-1-3-g', 'Complications neuraxiales : hématome, abcès, arachnoïdite, méningite — D', 'regional', ['M7']),
      ],
    },
    {
      id: 'eu-1-4',
      title: 'Domaine 1.4 — Gestion des voies aériennes',
      items: [
        S('eu-1-4-a', 'Induction en séquence rapide — D', 'airway', ['M9'], ['esaic-nmb-2023']),
        S('eu-1-4-b', 'Voies aériennes difficiles prévues et imprévues selon les algorithmes — D', 'airway', ['M9', 'M8']),
        S('eu-1-4-c', 'Choisir le dispositif : vidéolaryngoscope, fibroscope, masque laryngé — D', 'airway', ['M8']),
        S('eu-1-4-d', 'Intubation vigile ou endormie sous fibroscopie — D', 'airway', ['M8']),
        S('eu-1-4-e', 'Cricothyroïdotomie (par exemple en simulation) — D', 'airway', ['M9']),
        S('eu-1-4-f', 'Extubation du patient à intubation difficile ; complications précoces et tardives — D', 'airway'),
      ],
    },
    {
      id: 'eu-1-5',
      title: 'Domaine 1.5 — Échographie au lit du patient (POCUS)',
      items: [
        S('eu-1-5-a', 'Physique des ultrasons, choix de la sonde, artéfacts, réglages — connaissance', 'pocus', ['M6']),
        S('eu-1-5-b', 'Voies aériennes : membrane cricothyroïdienne, confirmation de l’intubation, glissement pleural — D', 'pocus'),
        S('eu-1-5-c', 'Poumon : épanchement, pneumothorax, diaphragme — D', 'pocus'),
        S('eu-1-5-d', 'Guidage des abords vasculaires — D', 'pocus'),
        S('eu-1-5-e', 'Contenu gastrique et risque d’inhalation — D', 'pocus', ['M10']),
        S('eu-1-5-f', 'Précharge-dépendance et fonction cardiaque chez le patient instable ; FAST — C', 'pocus', ['M6']),
      ],
    },
    {
      id: 'eu-1-6',
      title: 'Domaine 1.6 — Soins postopératoires et douleur aiguë',
      items: [
        S('eu-1-6-a', 'Transmissions en SSPI — D', 'postop'),
        S('eu-1-6-b', 'Évaluer la douleur dans tous les groupes de patients ; analgésie multimodale — D', 'postop'),
        S('eu-1-6-c', 'Complications postopératoires : curarisation résiduelle, NVPO, frissons, céphalées post-ponction, saignement, délirium, hématome périmédullaire, syndrome des loges — D', 'postop', ['M5', 'M10'], ['esaic-nmb-2023', 'esaic-delirium-2024', 'gan-ponv-2020']),
        S('eu-1-6-d', 'Critères de sortie et de transfert en réanimation — D', 'postop'),
        S('eu-1-6-e', 'Visite postanesthésique ; informer le patient d’un incident (intubation difficile, lésion nerveuse) — D', 'ethics'),
      ],
    },
    {
      id: 'eu-1-7',
      title: 'Domaine 1.7 — Médecine intensive-réanimation',
      summary: 'Au moins un an de formation en réanimation.',
      items: [
        S('eu-1-7-a', 'Ventilation invasive et non invasive, décubitus ventral, oxygénothérapie à haut débit, sevrage — D', 'icu', ['M1_M2']),
        S('eu-1-7-b', 'Hémodynamique : monitorage avancé, inotropes et vasopresseurs, entraînement électrosystolique — D', 'icu', ['M6']),
        S('eu-1-7-c', 'Coagulopathie, gestion du sang du patient, transfusion — D', 'fluids', ['M9']),
        S('eu-1-7-d', 'Insuffisance rénale aiguë et épuration extrarénale ; nutrition, électrolytes, acide-base — D', 'icu'),
        S('eu-1-7-e', 'Neuroréanimation : pression intracrânienne et pression de perfusion cérébrale — D', 'icu'),
        S('eu-1-7-f', 'Infections, antibiothérapie, hygiène ; prévention des complications (VILI, pneumopathies, thrombose) — D', 'icu'),
        S('eu-1-7-g', 'Défaillance multiviscérale : protocoles et faisceaux de soins — D', 'icu'),
      ],
    },
    {
      id: 'eu-1-8',
      title: 'Domaine 1.8 — Médecine d’urgence critique (CREM)',
      items: [
        S('eu-1-8-a', 'Appliquer les algorithmes de réanimation et de traumatologie — D', 'resus', ['M9'], ['erc-2025']),
        S('eu-1-8-b', 'Réanimation intrahospitalière au sein de l’équipe d’arrêt cardiaque — D', 'resus', ['M9']),
        S('eu-1-8-c', 'Échographie pour un diagnostic différentiel rapide — D', 'pocus', ['M6']),
        S('eu-1-8-d', 'Conduire un débriefing d’équipe — C', 'nts', ['M9']),
        S('eu-1-8-e', 'Entraînement en équipe à la gestion des ressources en crise (CRM), 1 à 2 fois par an en centre de simulation — D', 'nts', ['M9']),
      ],
    },
    {
      id: 'eu-1-9',
      title: 'Domaine 1.9 — Compétences non techniques (ANTS)',
      items: [
        S('eu-1-9-a', 'Gestion des tâches : planifier, prioriser, utiliser les ressources — D', 'nts', ['M9']),
        S('eu-1-9-b', 'Travail en équipe : coordonner, échanger l’information, s’affirmer — D', 'nts', ['M9']),
        S('eu-1-9-c', 'Conscience de la situation : recueillir, comprendre, anticiper — D', 'nts', ['M9', 'M1_M2']),
        S('eu-1-9-d', 'Décision : options, éviter les erreurs de fixation, réévaluer — D', 'nts', ['M9']),
        S('eu-1-9-e', 'Leadership : organiser les tâches et la communication — D', 'nts', ['M9']),
      ],
    },
    {
      id: 'eu-1-10',
      title: 'Domaine 1.10 — Professionnalisme et éthique',
      items: [
        S('eu-1-10-a', 'Éthique : fin de vie, limitation et arrêt des traitements, Témoins de Jéhovah, patient inapte à décider — D', 'ethics'),
        S('eu-1-10-b', 'Obligations médico-légales ; autonomie, confidentialité, consentement — D', 'ethics'),
        S('eu-1-10-c', 'Résilience et gestion du stress — D ; déclaration d’incidents et audits — C', 'ethics'),
      ],
    },
    {
      id: 'eu-1-11',
      title: 'Domaine 1.11 — Sécurité des patients et économie de la santé',
      items: [
        S('eu-1-11-a', 'Appliquer les standards de qualité et de sécurité, check-lists et recommandations — D', 'safety', ['M1_M2'], ['helsinki-2025']),
        S('eu-1-11-b', 'Usage pertinent et économe des moyens diagnostiques et thérapeutiques — C', 'safety'),
        S('eu-1-11-c', 'Choisir des techniques respectueuses de l’environnement, réduire les déchets — C', 'safety', ['M3'], ['esaic-sustain-2024', 'glasgow-2023']),
      ],
    },
    {
      id: 'eu-1-12',
      title: 'Domaine 1.12 — Recherche, enseignement et autoformation',
      items: [
        S('eu-1-12-a', 'Recherche bibliographique et lecture critique (plan d’étude, statistiques) — D/C', 'education'),
        S('eu-1-12-b', 'Médecine fondée sur les preuves appliquée à la pratique — D', 'education'),
        S('eu-1-12-c', 'Présentations orales, projets d’amélioration de la qualité, tutorat — D/C', 'education'),
      ],
    },
    {
      id: 'eu-2-1',
      title: 'Domaine 2.1 — Anesthésie obstétricale',
      items: [
        S('eu-2-1-a', 'Péridurale lombaire, rachi-péridurale combinée et rachianesthésie pour le travail — D', 'obstetric', ['M7'], ['esaic-failing-epidural-2025']),
        S('eu-2-1-b', 'Rachianesthésie, rachi-péridurale et péridurale pour césarienne — D', 'obstetric', ['M7']),
        S('eu-2-1-c', 'Séquence rapide et voies aériennes chez la parturiente ; céphalées post-ponction, inhalation — D', 'obstetric'),
        S('eu-2-1-d', 'Hémorragie sévère du péripartum — D', 'obstetric', ['M9']),
        S('eu-2-1-e', 'Réanimation de la femme enceinte et du nouveau-né — D/C', 'obstetric', ['M9']),
      ],
    },
    {
      id: 'eu-2-2',
      title: 'Domaine 2.2 — Anesthésie cardiothoracique',
      items: [
        S('eu-2-2-a', 'Séparation pulmonaire : sonde double lumière et bloqueurs bronchiques — C ; contrôle clinique et fibroscopique — D', 'cardiothoracic', ['M8']),
        S('eu-2-2-b', 'Décubitus latéral et drainage thoracique — D', 'cardiothoracic', ['M8']),
        S('eu-2-2-c', 'Chirurgie cardiaque avec et sans CEC — B ; ETO de base — B', 'cardiothoracic', ['M6']),
        S('eu-2-2-d', 'Analgésie multimodale en chirurgie thoracique (péridurale thoracique, blocs) — B', 'cardiothoracic', ['M7']),
      ],
    },
    {
      id: 'eu-2-3',
      title: 'Domaine 2.3 — Neuroanesthésie',
      items: [
        S('eu-2-3-a', 'Position assise ; embolie gazeuse, hypertension intracrânienne, convulsions — D', 'neuro'),
        S('eu-2-3-b', 'Neuroprotection — D ; neuromonitorage avancé — B', 'neuro', ['M4']),
        S('eu-2-3-c', 'Arrêt cardiaque en décubitus ventral — D', 'neuro', ['M9']),
      ],
    },
    {
      id: 'eu-2-4',
      title: 'Domaine 2.4 — Anesthésie pédiatrique',
      items: [
        S('eu-2-4-a', 'Appliquer les domaines 1.1 à 1.12 chez l’enfant de plus d’un an — C', 'paediatric'),
        S('eu-2-4-b', 'Voies aériennes, abord vasculaire et anesthésie générale avant 1 an — B', 'paediatric', undefined, ['esaic-neonatal-airway-2024']),
        S('eu-2-4-c', 'Choisir la taille du matériel à tout âge — D', 'paediatric'),
        S('eu-2-4-d', 'Caudale et blocs chez le nourrisson — B', 'paediatric'),
        S('eu-2-4-e', 'Réanimation cardiorespiratoire de l’enfant et du nouveau-né — D', 'paediatric', undefined, ['erc-2025']),
        S('eu-2-4-f', 'Jeûne préopératoire de l’enfant — D', 'paediatric', ['M10'], ['esaic-fasting-child-2022']),
      ],
    },
    {
      id: 'eu-2-5',
      title: 'Domaine 2.5 — Douleur chronique pluridisciplinaire',
      items: [
        S('eu-2-5-a', 'Évaluer selon le modèle biopsychosocial ; échelles et questionnaires validés — B/D', 'chronicpain'),
        S('eu-2-5-b', 'Traitement multimodal initial des douleurs cancéreuses et non cancéreuses — B', 'chronicpain'),
        S('eu-2-5-c', 'Techniques interventionnelles échoguidées — B', 'chronicpain', ['M6']),
      ],
    },
  ],
  reuse: 'Copyright © UEMS, sans licence de réutilisation : intitulés reformulés, document original à consulter.',
  caveats: ['Les cadres nationaux (France, Belgique, Suisse…) priment : l’ETR ne les remplace pas.'],
};
