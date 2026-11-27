/**
 * Official anaesthesia training programmes and the platform's coverage of their domains.
 * Each curriculum entry records whether the document was actually opened (`opened`, 2026-11-27).
 * Domain names are our own summaries (no curriculum text is reproduced; the Royal College
 * documents restrict reproduction). Coverage is the maintainers' assessment of this app.
 */
export type Coverage = 'covered' | 'partial' | 'gap';

export interface Curriculum {
  id: string;
  short: string;
  title: string;
  body: string;
  version: string;
  url: string;
  region: 'eu' | 'fr' | 'ca' | 'ma' | 'uk' | 'us' | 'int';
  opened: boolean;
}

export interface CurriculumDomain {
  id: string;
  name: { fr: string; en: string };
  /** Curriculum ids that explicitly list this domain as a top-level item. */
  listedBy: string[];
  coverage: Coverage;
  /** App modules that teach it. */
  modules: string[];
  note: { fr: string; en: string };
}

export const CURRICULA: Curriculum[] = [
  { id: 'eu-etr', short: 'UEMS/EBA (EU)', title: 'European Training Requirements in Anaesthesiology — update 2022', body: 'UEMS Section & European Board of Anaesthesiology (the ESAIC EDAIC exam follows it)', version: '2022 (UEMS ref. 2024/30)', url: 'https://www.uems.eu/european-training-requirements', region: 'eu', opened: true },
  { id: 'fr-des', short: 'DES AR (France)', title: 'Arrêté du 21 avril 2017 — maquette du DES Anesthésie-Réanimation', body: 'JORF 28/04/2017; annexe republiée JORF 20/12/2017', version: '2017 (later amendments not checked)', url: 'https://medecine.univ-grenoble-alpes.fr/medias/fichier/maquette-d-e-s-anesthesie-reanimation_1622549686227-pdf', region: 'fr', opened: true },
  { id: 'ca-rc', short: 'Royal College (CA)', title: 'Anesthesiology Competencies (Competence by Design) and EPA guide', body: 'Royal College of Physicians and Surgeons of Canada', version: '2017 v1.0, revised 2021', url: 'https://www.royalcollege.ca/content/dam/documents/ibd/anesthesiology-(anes)/anesthesiology-competencies-e.pdf', region: 'ca', opened: true },
  { id: 'ma-smaar', short: 'SMAAR (Maroc)', title: 'Référentiel de compétences en Anesthésie et Réanimation — Jalons', body: 'Collège Marocain d’Anesthésiologie et de Réanimation / SMAAR (no national DES programme is published)', version: '2023', url: 'https://smaar.ma/wp-content/uploads/2023/12/SMAAR-MBACC-Referentiel-de-competences-en-Anesthesie-et-Reanimation-Jalons-_compressed.pdf', region: 'ma', opened: true },
  { id: 'sn-ucad', short: 'UCAD Dakar', title: 'Maquette du DES d’Anesthésie-Réanimation', body: 'Université Cheikh Anta Diop, Dakar', version: '8 semesters', url: 'https://fmpos.ucad.sn/sites/default/files/Maquette%20DES%20anest_reanim.pdf', region: 'int', opened: true },
  { id: 'uk-rcoa', short: 'RCoA (UK)', title: '2021 Curriculum for a CCT in Anaesthetics — domains', body: 'Royal College of Anaesthetists', version: '2021 (read via web archive)', url: 'https://www.rcoa.ac.uk/training-careers/training-hub/2021-anaesthetics-curriculum', region: 'uk', opened: true },
  { id: 'us-aba', short: 'ABA (US)', title: 'BASIC and ADVANCED exam blueprints', body: 'American Board of Anesthesiology', version: 'current blueprints', url: 'https://www.theaba.org/pdfs/BASIC_Blueprint.pdf', region: 'us', opened: true },
  { id: 'who-wfsa', short: 'WHO-WFSA', title: 'International Standards for a Safe Practice of Anesthesia', body: 'WHO & World Federation of Societies of Anaesthesiologists (Gelb et al. 2018)', version: '2018', url: 'https://escholarship.org/content/qt8qj6d507/qt8qj6d507.pdf', region: 'int', opened: true },
];

const EU = 'eu-etr', FR = 'fr-des', CA = 'ca-rc', MA = 'ma-smaar', SN = 'sn-ucad', UK = 'uk-rcoa', US = 'us-aba', WHO = 'who-wfsa';

export const DOMAINS: CurriculumDomain[] = [
  { id: 'physiology', name: { fr: 'Physiologie et physiopathologie', en: 'Physiology and pathophysiology' }, listedBy: [EU, FR, CA, SN, US], coverage: 'partial', modules: ['M1', 'M3', 'M6', 'M8'], note: { fr: 'Mécanique ventilatoire, cinétique des halogénés, boucles P-V, échanges gazeux en ventilation unipulmonaire. Manquent : rein, foie, acide-base, thermorégulation.', en: 'Respiratory mechanics, volatile kinetics, P-V loops, one-lung gas exchange. Missing: renal, hepatic, acid–base, thermoregulation.' } },
  { id: 'anatomy', name: { fr: 'Anatomie et sono-anatomie', en: 'Anatomy and sonoanatomy' }, listedBy: [CA, US, FR], coverage: 'partial', modules: ['M6', 'M7', 'M8'], note: { fr: 'Anatomie réelle (BodyParts3D) : région supraclaviculaire, rachis, arbre bronchique. Manquent : voies aériennes supérieures, autres sites de blocs.', en: 'Real anatomy (BodyParts3D): supraclavicular region, spine, bronchial tree. Missing: upper airway, other block sites.' } },
  { id: 'pharmacology', name: { fr: 'Pharmacologie (IV, halogénés, curares, AL)', en: 'Pharmacology (IV, volatile, NMB, local anaesthetics)' }, listedBy: [EU, FR, CA, MA, SN, US], coverage: 'partial', modules: ['M3', 'M4', 'M5'], note: { fr: 'Halogénés, propofol/rémifentanil en AIVOC, rocuronium/sugammadex. Manquent : opioïdes, kétamine, dexmédétomidine, AL, vasopresseurs, antiémétiques, anticoagulants.', en: 'Volatiles, propofol/remifentanil TCI, rocuronium/sugammadex. Missing: opioids, ketamine, dexmedetomidine, local anaesthetics, vasopressors, antiemetics, anticoagulants.' } },
  { id: 'machine', name: { fr: 'Physique, gaz, appareil d’anesthésie, circuits, évaporateurs', en: 'Physics, gases, anaesthesia machine, breathing systems, vaporisers' }, listedBy: [EU, FR, CA, SN, US, WHO, MA], coverage: 'covered', modules: ['M1', 'M3'], note: { fr: 'Six types de ventilateurs, Mapleson, check-list FOSO/ASA, pannes, évaporateurs, couleurs des gaz.', en: 'Six ventilator drives, Mapleson, FOSO/ASA checkout, faults, vaporisers, gas colours.' } },
  { id: 'monitoring', name: { fr: 'Monitorage (capnographie, curarisation, EEG, hémodynamique)', en: 'Monitoring (capnography, NMT, processed EEG, haemodynamics)' }, listedBy: [EU, FR, CA, US, WHO], coverage: 'partial', modules: ['M2', 'M4', 'M5', 'M6'], note: { fr: 'Capnographie, EEG/BIS, TOF/PTC, boucles P-V. Manquent : ECG, pression artérielle invasive, débit cardiaque.', en: 'Capnography, EEG/BIS, TOF/PTC, P-V loops. Missing: ECG, invasive arterial pressure, cardiac output monitors.' } },
  { id: 'preop', name: { fr: 'Évaluation préopératoire et médecine périopératoire', en: 'Pre-op assessment and perioperative medicine' }, listedBy: [EU, FR, CA, MA, UK, US], coverage: 'partial', modules: ['M10'], note: { fr: 'ASA, RCRI, STOP-Bang, Apfel, ARISCAT, jeûne, agonistes du GLP-1. Manquent : anticoagulants, fragilité, anémie, prédiction de l’intubation difficile.', en: 'ASA, RCRI, STOP-Bang, Apfel, ARISCAT, fasting, GLP-1 agonists. Missing: anticoagulants, frailty, anaemia, difficult-airway prediction.' } },
  { id: 'ga', name: { fr: 'Anesthésie générale et réveil', en: 'General anaesthesia and emergence' }, listedBy: [EU, FR, CA, MA, SN, UK, US, WHO], coverage: 'partial', modules: ['M1', 'M3', 'M4', 'M5'], note: { fr: 'Induction et entretien (halogénés, AIVOC), décurarisation. Manque : réveil et SSPI.', en: 'Induction and maintenance (volatile, TCI), reversal. Missing: emergence and recovery room.' } },
  { id: 'sedation', name: { fr: 'Sédation', en: 'Sedation' }, listedBy: [EU, UK, US], coverage: 'gap', modules: [], note: { fr: 'À construire (interactions propofol–opioïde, dépression respiratoire).', en: 'To build (propofol–opioid interaction, respiratory depression).' } },
  { id: 'airway', name: { fr: 'Voies aériennes', en: 'Airway management' }, listedBy: [EU, FR, CA, MA], coverage: 'partial', modules: ['M8', 'M9'], note: { fr: 'Fibroscopie et sonde à double lumière ; intubation difficile imprévue et CICO (DAS 2025) dans M9. Manquent : laryngoscopie 3D, vidéolaryngoscopie, extubation.', en: 'Bronchoscopy and double-lumen tube; unanticipated difficult intubation and CICO (DAS 2025) in M9. Missing: 3D laryngoscopy, videolaryngoscopy, extubation.' } },
  { id: 'regional', name: { fr: 'ALR et anesthésie périmédullaire', en: 'Regional and neuraxial anaesthesia' }, listedBy: [EU, FR, CA, MA, SN, UK, US], coverage: 'partial', modules: ['M6', 'M7', 'M9'], note: { fr: 'Bloc supraclaviculaire échoguidé, péridurale thoracique et lombaire, LAST. Manquent : rachianesthésie, blocs du membre inférieur et de la paroi.', en: 'Ultrasound-guided supraclavicular block, thoracic and lumbar epidural, LAST. Missing: spinal, lower-limb and truncal blocks.' } },
  { id: 'pocus', name: { fr: 'Échographie / POCUS', en: 'Ultrasound / POCUS' }, listedBy: [EU, FR, CA, MA], coverage: 'partial', modules: ['M6'], note: { fr: 'Physique de l’échographie et sono-anatomie. Manquent : échographie pulmonaire, cardiaque, gastrique.', en: 'Ultrasound physics and sonoanatomy. Missing: lung, cardiac and gastric ultrasound.' } },
  { id: 'postop', name: { fr: 'Soins postopératoires et douleur aiguë', en: 'Postoperative care and acute pain' }, listedBy: [EU, FR, CA, MA, UK, US], coverage: 'gap', modules: ['M10'], note: { fr: 'Seul le risque de NVPO (Apfel) est couvert.', en: 'Only PONV risk (Apfel) is covered.' } },
  { id: 'chronicpain', name: { fr: 'Douleur chronique, soins palliatifs', en: 'Chronic pain and palliative care' }, listedBy: [EU, CA, MA, UK, US], coverage: 'gap', modules: [], note: { fr: 'À construire.', en: 'To build.' } },
  { id: 'icu', name: { fr: 'Réanimation / soins intensifs', en: 'Intensive care' }, listedBy: [EU, FR, CA, MA, UK, US], coverage: 'gap', modules: [], note: { fr: 'À construire (ventilation en réanimation, sepsis, défaillances d’organes).', en: 'To build (ICU ventilation, sepsis, organ failure).' } },
  { id: 'resus', name: { fr: 'Réanimation d’urgence, trauma, transfert', en: 'Resuscitation, emergencies, trauma, transfer' }, listedBy: [EU, FR, CA, SN, UK, US], coverage: 'partial', modules: ['M9'], note: { fr: 'Arrêt cardiaque (RCUK 2025 / ERC 2025) et crises périopératoires dans M9. Manquent : trauma, transfert.', en: 'Cardiac arrest (RCUK 2025 / ERC 2025) and perioperative crises in M9. Missing: trauma, transfer.' } },
  { id: 'fluids', name: { fr: 'Remplissage, transfusion, hémostase', en: 'Fluids, transfusion, haemostasis' }, listedBy: [FR, CA, US, SN, EU], coverage: 'partial', modules: ['M9'], note: { fr: 'Hémorragie peropératoire massive (ESAIC 2023) dans M9. Manquent : stratégie de remplissage, tests viscoélastiques.', en: 'Massive peri-operative bleeding (ESAIC 2023) in M9. Missing: fluid strategy, viscoelastic testing.' } },
  { id: 'crisis', name: { fr: 'Crises et complications (HM, anaphylaxie, CRM)', en: 'Crises and complications (MH, anaphylaxis, CRM)' }, listedBy: [EU, CA, US], coverage: 'covered', modules: ['M9', 'M1'], note: { fr: 'Six scénarios chronométrés avec débriefing sourcé (M9) ; pannes de l’appareil (M1).', en: 'Six timed scenarios with sourced debrief (M9); machine faults (M1).' } },
  { id: 'obstetric', name: { fr: 'Anesthésie obstétricale', en: 'Obstetric anaesthesia' }, listedBy: [EU, FR, CA, SN, US], coverage: 'partial', modules: ['M9'], note: { fr: 'M9 : hémorragie du post-partum (SOGC 431, check-list SMAR, CNGOF/SFAR) et éclampsie (OMS 2017), avec les doses de chaque pays côte à côte. Manquent : analgésie du travail, césarienne.', en: 'M9: postpartum haemorrhage (SOGC 431, SMAR checklist, CNGOF/SFAR) and eclampsia (WHO 2017), with each country’s doses side by side. Missing: labour analgesia, caesarean section.' } },
  { id: 'paediatric', name: { fr: 'Anesthésie pédiatrique et néonatale', en: 'Paediatric and neonatal anaesthesia' }, listedBy: [EU, FR, CA, SN, US], coverage: 'gap', modules: ['M10'], note: { fr: 'Seul le jeûne pédiatrique est couvert.', en: 'Only paediatric fasting is covered.' } },
  { id: 'cardiothoracic', name: { fr: 'Anesthésie cardiothoracique et vasculaire', en: 'Cardiothoracic and vascular anaesthesia' }, listedBy: [EU, FR, CA, SN], coverage: 'partial', modules: ['M6', 'M8'], note: { fr: 'Boucles P-V valvulaires, ventilation unipulmonaire. Manque : circulation extracorporelle.', en: 'Valvular P-V loops, one-lung ventilation. Missing: cardiopulmonary bypass.' } },
  { id: 'neuro', name: { fr: 'Neuroanesthésie', en: 'Neuroanaesthesia' }, listedBy: [EU, FR, CA, SN], coverage: 'gap', modules: [], note: { fr: 'À construire.', en: 'To build.' } },
  { id: 'specialties', name: { fr: 'Autres spécialités, hors bloc, ambulatoire, gériatrie', en: 'Other specialties, outside the OR, ambulatory, geriatric' }, listedBy: [FR, CA, SN, US], coverage: 'gap', modules: [], note: { fr: 'À construire.', en: 'To build.' } },
  { id: 'organ', name: { fr: 'Pathologies d’organes, métabolisme, rein, foie', en: 'Organ disease, metabolic, renal, hepatic' }, listedBy: [FR, SN, US, CA], coverage: 'gap', modules: [], note: { fr: 'À construire.', en: 'To build.' } },
  { id: 'nts', name: { fr: 'Compétences non techniques, communication, travail d’équipe', en: 'Non-technical skills, communication, teamwork' }, listedBy: [EU, CA, MA, UK], coverage: 'partial', modules: ['M9', 'M1'], note: { fr: 'Débriefing structuré et cas « à l’aveugle ».', en: 'Structured debrief and "blind" cases.' } },
  { id: 'ethics', name: { fr: 'Professionnalisme, éthique, médico-légal', en: 'Professionalism, ethics, medico-legal' }, listedBy: [EU, CA, MA, UK, US, FR], coverage: 'gap', modules: [], note: { fr: 'Hors du périmètre actuel du simulateur.', en: 'Outside the simulator’s current scope.' } },
  { id: 'safety', name: { fr: 'Sécurité, qualité, économie, développement durable', en: 'Safety, quality, economics, sustainability' }, listedBy: [EU, CA, MA, UK, US, WHO], coverage: 'partial', modules: ['M1', 'M3'], note: { fr: 'Check-list de l’appareil, empreinte carbone des halogénés, statut de preuve de chaque donnée.', en: 'Machine checkout, carbon footprint of volatiles, evidence status of every number.' } },
  { id: 'education', name: { fr: 'Enseignement et recherche', en: 'Education and research' }, listedBy: [EU, CA, MA, UK], coverage: 'partial', modules: [], note: { fr: 'Fiche de débriefing imprimable, traces xAPI, relecture clinique ouverte.', en: 'Printable debrief card, xAPI traces, open clinical review.' } },
];
