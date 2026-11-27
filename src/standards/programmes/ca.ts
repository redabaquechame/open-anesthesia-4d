/**
 * Canada / Québec.
 *  - Collège royal des médecins et chirurgiens du Canada, « La compétence par conception » (CPC) :
 *    Compétences en anesthésiologie (2017, v1.0, mise à jour 2021), Expériences de formation en
 *    anesthésiologie (2022, v4.0), Guide des APC (2017, v1.0). PDF français et anglais lus en entier
 *    le 2026-11-26.
 *  - Université de Montréal, DES en anesthésiologie (6-460-1-0) : page du programme lue.
 * Le guide des APC n’autorise ni la diffusion ni le partage à des tiers : nous ne reproduisons pas
 * la liste des APC. Les éléments ci-dessous sont nos propres intitulés, regroupés par stade, à partir
 * des expériences de formation (reproduction éducative autorisée avec mention du Collège royal).
 */
import type { Programme } from '../programmeTypes';

type Item = Programme['stages'][number]['items'][number];
const S = (id: string, text: string, domain: string, modules?: Item['modules'], resources?: string[]): Item => ({ id, text, domain, modules, resources });

const RC = 'https://www.royalcollege.ca/content/dam/documents/ibd/anesthesiology-(anes)';

export const CA_RC_CBD: Programme = {
  id: 'ca-rc-cbd',
  region: 'ca',
  label: 'Collège royal — CPC',
  flag: '🇨🇦',
  officialTitle: 'Anesthésiologie — La compétence par conception (Compétences 2017 ; Expériences de formation 2022)',
  body: 'Collège royal des médecins et chirurgiens du Canada',
  version: 'Compétences v1.0 (2017, mise à jour rédactionnelle juin 2021) ; Expériences de formation v4.0 (résidents débutant à partir du 1er juillet 2022) ; Guide des APC v1.0 (2017)',
  url: `${RC}/anesthesiology-competencies-f.pdf`,
  reading: 'texte intégral',
  duration: 'Programme conçu sur 5 ans (périodes de 4 semaines ; habituellement 78 périodes au plus), sans durée imposée par stade',
  legal: [
    { title: 'Expériences de formation en anesthésiologie (2022, v4.0)', url: `${RC}/anesthesiology-training-experiences-f.pdf` },
    { title: 'Guide des activités professionnelles confiables (APC) : Anesthésiologie (2017) — consultation réservée aux programmes canadiens', url: `${RC}/epa-guide-anesthesiology-f.pdf` },
    { title: 'Format de l’examen d’anesthésiologie — automne 2026 / printemps 2027 (anglais)', url: 'https://www.royalcollege.ca/en/eligibility-and-exams/exam-formats/anesthesiology-exam-format-2026.html' },
    { title: 'CMQ / OIIQ / OPIQ — La sédation-analgésie, lignes directrices (2015)', url: 'https://cms.cmq.org/files/documents/Pratique-medicale/p-1-2015-04-01-fr-sedation-analgesie.pdf' },
  ],
  structure:
    'Formation fondée sur les compétences, en quatre stades : progression vers la discipline, acquisition des fondements, maîtrise de la discipline, transition vers la pratique. Chaque stade comprend des expériences de formation obligatoires ou recommandées et des activités professionnelles confiables (APC) observées et documentées dans un portfolio. Le passage d’un stade à l’autre est décidé par le comité de compétence du programme.',
  assessment:
    'Certification : réussite de l’examen du Collège royal (écrit : 2 épreuves de QCM à réponse unique d’environ 3 h chacune ; appliqué : oral structuré de 2 h ; seuil de 70 % par composante ; l’oral n’est accessible qu’après réussite de l’écrit), cinq évaluations par simulation selon la méthode PNSA-CanNASC et le portfolio d’APC complet.',
  stages: [
    {
      id: 'ca-pd',
      title: 'Progression vers la discipline (PD)',
      duration: '2 périodes suggérées (3 au plus)',
      placements: ['Clinique préopératoire', 'Bloc opératoire', 'Salle de réveil', 'Orientation à l’anesthésiologie et à la CPC'],
      items: [
        S('ca-pd-1', 'Évaluation préopératoire d’un adulte en bonne santé avant une chirurgie mineure planifiée', 'preop', ['M10']),
        S('ca-pd-2', 'Préparer la salle, l’appareil et les médicaments pour un cas simple', 'machine', ['M1_M2']),
        S('ca-pd-3', 'Monitorer un adulte en bonne santé sous anesthésie générale ou régionale', 'monitoring', ['M1_M2', 'M4', 'M5']),
        S('ca-pd-4', 'Transmettre le patient en postopératoire, prescriptions comprises', 'postop'),
      ],
    },
    {
      id: 'ca-f',
      title: 'Acquisition des fondements de la discipline (F)',
      duration: '18 périodes suggérées (26 au plus)',
      placements: [
        'Évaluation préopératoire',
        'Cas de faible et moyenne complexité sous AG, neuraxiale et sédation surveillée',
        'Pédiatrie de faible complexité',
        'Chirurgie ambulatoire et urgences hors heures',
        'Consultations et service de douleur aiguë',
        'Équipe de code',
        'Anesthésie obstétricale, gardes comprises',
        'Urgence, un service chirurgical, un service médical, un service pédiatrique',
        'Cours théoriques structurés ; ACLS et ATLS (ou équivalents)',
        'Recommandés : anesthésie rurale ou communautaire, soins intensifs adultes, équipe de trauma',
      ],
      items: [
        S('ca-f-1', 'Évaluer les patients ASA 1 à 3, bâtir le plan d’anesthésie et l’orientation postopératoire', 'preop', ['M10'], ['ca-cas-2026', 'ca-choosing-wisely']),
        S('ca-f-2', 'Obtenir un consentement libre et éclairé', 'ethics', ['M10']),
        S('ca-f-3', 'Reconnaître et préparer une intubation difficile prévue', 'airway', ['M8'], ['ca-cafg-2021-p2']),
        S('ca-f-4', 'Anesthésier un adulte ASA 1–2 en programmé et en urgence', 'ga', ['M1_M2', 'M3', 'M4', 'M5']),
        S('ca-f-5', 'Gérer les événements peropératoires courants et les complications du positionnement', 'ga', ['M1_M2', 'M9']),
        S('ca-f-6', 'Liquides, électrolytes et transfusion', 'fluids', ['M9'], ['ca-cbs-massive']),
        S('ca-f-7', 'Abords artériel et veineux central (facultatifs à ce stade)', 'monitoring'),
        S('ca-f-8', 'Anesthésie neuraxiale hors obstétrique', 'regional', ['M7']),
        S('ca-f-9', 'Analgésie du travail, ses complications et césarienne programmée chez une patiente en bonne santé', 'obstetric', ['M7'], ['ca-cas-2026']),
        S('ca-f-10', 'Évaluation et anesthésie de l’enfant ASA 1–2 de plus de 5 ans', 'paediatric', ['M10'], ['ca-cas-2026']),
        S('ca-f-11', 'Complications courantes en salle de réveil et à l’étage ; douleur aiguë simple', 'postop'),
        S('ca-f-12', 'Premiers gestes face à une situation menaçant la vie ; patients en soins aigus', 'resus', ['M9']),
      ],
    },
    {
      id: 'ca-m',
      title: 'Maîtrise de la discipline (M)',
      duration: '36 périodes suggérées (46 au plus)',
      placements: [
        'Clinique préopératoire',
        'Chirurgie cardiaque, neurochirurgie, rachis, thoracique, vasculaire, pédiatrie et patients à haut risque',
        'Obstétrique et anesthésie régionale',
        'Anesthésie hors bloc',
        'Consultations, douleur aiguë et douleur chronique',
        'Anesthésie rurale ou communautaire ; équipe de code',
        'Soins intensifs adultes, gardes comprises ; cardiologie ; pneumologie ; consultation préopératoire de médecine',
        'Échographie ciblée (POCUS)',
        'Simulation, dont la gestion des ressources en situation de crise',
        'PALS et NRP',
        'Amélioration de la qualité et revues de morbidité-mortalité ; projet d’érudition ; enseignement ; club de lecture',
        'Recommandés : urgence et trauma, soins palliatifs, soins intensifs pédiatriques et néonatals, ETO',
      ],
      items: [
        S('ca-m-1', 'Évaluer et optimiser un patient aux problèmes médicaux complexes', 'preop', ['M10']),
        S('ca-m-2', 'Intubation difficile prévue (plan d’extubation compris) et imprévue, y compris la situation « impossible de ventiler, impossible d’oxygéner »', 'airway', ['M8', 'M9'], ['ca-cafg-2021-p1', 'ca-cafg-2021-p2']),
        S('ca-m-3', 'Adultes complexes, personnes âgées et patients de soins intensifs au bloc', 'ga', ['M3', 'M4', 'M5', 'M6']),
        S('ca-m-4', 'Monitorage invasif et non invasif', 'monitoring', ['M1_M2', 'M4', 'M5', 'M6'], ['ca-cas-2026']),
        S('ca-m-5', 'Complications périopératoires graves et annonce d’un événement indésirable', 'crisis', ['M9']),
        S('ca-m-6', 'Réanimation et gestion des ressources en situation de crise, à tout âge ; polytraumatisés', 'resus', ['M9'], ['ca-hsf-acls-2025']),
        S('ca-m-7', 'Patients complexes de soins intensifs et gardes aux soins intensifs', 'icu'),
        S('ca-m-8', 'Analgésie du travail à risque, césarienne, complications obstétricales et réanimation néonatale', 'obstetric', ['M9'], ['ca-sogc-431', 'ca-cas-2026']),
        S('ca-m-9', 'Enfant de plus d’un an ASA 1–3 : évaluation, anesthésie, abord veineux difficile', 'paediatric'),
        S('ca-m-10', 'Blocs nerveux périphériques et leurs complications', 'regional', ['M6', 'M9']),
        S('ca-m-11', 'Chirurgie cardiaque, vasculaire, thoracique (dont résection pulmonaire) et médiastinale', 'cardiothoracic', ['M6', 'M8']),
        S('ca-m-12', 'Neurochirurgie et chirurgie du rachis', 'neuro', ['M7']),
        S('ca-m-13', 'Anesthésie hors bloc opératoire', 'specialties', [], ['ca-cmq-sedation-2015']),
        S('ca-m-14', 'Douleur aiguë, aiguë sur chronique et chronique ; soins palliatifs', 'chronicpain'),
        S('ca-m-15', 'Prélèvement d’organes et diagnostic de décès neurologique', 'ethics'),
        S('ca-m-16', 'Échographie chez le patient instable ou critique', 'pocus', ['M6']),
        S('ca-m-17', 'Projet d’érudition, dilemmes éthiques, enseignement et plan d’apprentissage', 'education'),
      ],
    },
    {
      id: 'ca-tp',
      title: 'Transition vers la pratique (TP)',
      duration: '9 périodes suggérées (13 au plus)',
      placements: [
        'Clinique préopératoire, consultations et service de douleur aiguë',
        'Toute la gamme adulte et pédiatrique, gardes comprises',
        'Gardes d’obstétrique ; anesthésie hors bloc',
        'Gestion d’un bloc opératoire',
        'Amélioration de la qualité ; achèvement du projet d’érudition',
        'Suggérés : débriefing de simulation, gestion de la pratique, leadership',
      ],
      items: [
        S('ca-tp-1', 'Tenir une clinique préopératoire et des consultations avec leur charge de travail', 'preop', ['M10']),
        S('ca-tp-2', 'Assumer une liste opératoire de jour, une garde avec la salle de réveil, une liste pédiatrique et l’obstétrique', 'ga'),
        S('ca-tp-3', 'Coordonner un bloc opératoire (facultatif)', 'safety'),
        S('ca-tp-4', 'Améliorer le système de soins ; plan de carrière et de formation continue', 'safety', ['M3']),
        S('ca-tp-5', 'Conduire un débriefing après une crise (facultatif, version française du guide)', 'nts', ['M9']),
      ],
    },
    {
      id: 'ca-cert',
      title: 'Certification — simulations PNSA-CanNASC et examen',
      summary: 'Cinq situations évaluées en simulation selon la méthode CanNASC, toutes entraînables dans M9 ou M1.',
      items: [
        S('ca-cert-1', 'Simulation : voies aériennes difficiles', 'airway', ['M9', 'M8'], ['ca-cafg-2021-p1']),
        S('ca-cert-2', 'Simulation : réaction médicamenteuse grave (ex. anaphylaxie, toxicité des anesthésiques locaux)', 'crisis', ['M9']),
        S('ca-cert-3', 'Simulation : choc indifférencié', 'resus', ['M9', 'M6']),
        S('ca-cert-4', 'Simulation : crise d’hyperthermie maligne', 'crisis', ['M9']),
        S('ca-cert-5', 'Simulation : défaillance de l’équipement', 'machine', ['M1_M2']),
        S('ca-cert-6', 'Examen écrit (2 épreuves de QCM) puis examen appliqué (oral structuré)', 'education'),
      ],
    },
  ],
  reuse:
    'Compétences et Expériences de formation : reproduction permise à des fins éducatives seulement, avec la mention « © Collège royal, reproduit avec permission », envoi d’une copie au Bureau de l’éducation spécialisée, toute autre utilisation sur permission écrite. Guide des APC : consultation et impression réservées aux personnes d’un programme canadien, sans partage à des tiers ; nous n’en reproduisons pas la liste.',
  caveats: [
    'Le guide des APC trouvé est la version 1.0 (2017) alors que les expériences de formation sont en version 4.0 (2022) : une version plus récente peut exister.',
    'La version française du guide des APC contient une APC de transition vers la pratique (débriefing après une crise) absente de la version anglaise.',
    'Le texte du règlement du Collège des médecins du Québec sur le certificat de spécialiste n’a pas pu être ouvert.',
  ],
};

export const CA_UDEM: Programme = {
  id: 'ca-qc-udem',
  region: 'ca',
  label: 'Québec — UdeM',
  flag: '⚜️',
  officialTitle: 'Diplôme d’études spécialisées (DES) en anesthésiologie (6-460-1-0)',
  body: 'Université de Montréal, Faculté de médecine',
  version: 'Page du programme consultée le 2026-11-26 (passage à la CPC en juillet 2017)',
  url: 'https://admission.umontreal.ca/programmes/des-en-anesthesiologie/',
  reading: 'texte intégral',
  duration: '5 ans (R1 à R5)',
  legal: [
    { title: 'Université Laval — Formation médicale spécialisée en anesthésiologie (5 ans, 260 crédits)', url: 'https://www.ulaval.ca/etudes/programmes/formation-medicale-specialisee-en-anesthesiologie' },
    { title: 'Université de Sherbrooke — répartition des stages (tableau en image, non lu)', url: 'https://www.usherbrooke.ca/dep-anesthesiologie/programmes/etudes-medicales-postdoctorales/repartition-des-stages' },
    { title: 'Université McGill — description du programme de résidence (en anglais)', url: 'https://www.mcgill.ca/anesthesia/education/residency-program/program-description' },
  ],
  structure:
    'Application locale du cursus du Collège royal (compétence par conception). Les stages sont répartis par année de résidence ; des stages en région sont prévus chaque année à partir de R2.',
  assessment: 'Évaluations du Collège royal (APC, simulations PNSA-CanNASC, examen de certification) ; certificat de spécialiste délivré par le Collège des médecins du Québec.',
  stages: [
    {
      id: 'udem-r1',
      title: 'R1',
      items: [
        S('udem-r1-1', 'Introduction à l’anesthésie I et II', 'ga', ['M1_M2', 'M3', 'M4']),
        S('udem-r1-2', 'Médecine et spécialités médicales', 'organ'),
        S('udem-r1-3', 'Soins intensifs', 'icu'),
      ],
    },
    {
      id: 'udem-r2',
      title: 'R2',
      items: [
        S('udem-r2-1', 'Anesthésie régionale I', 'regional', ['M6', 'M7']),
        S('udem-r2-2', 'Douleur', 'chronicpain'),
        S('udem-r2-3', 'Chirurgie vasculaire et thoracique', 'cardiothoracic', ['M8']),
        S('udem-r2-4', 'ORL et voies aériennes', 'airway', ['M8', 'M9']),
        S('udem-r2-5', 'Stage en région', 'specialties'),
      ],
    },
    {
      id: 'udem-r3r4',
      title: 'R3–R4',
      items: [
        S('udem-r3-1', 'Pédiatrie I et II', 'paediatric'),
        S('udem-r3-2', 'Obstétrique I', 'obstetric'),
        S('udem-r3-3', 'Recherche', 'education'),
        S('udem-r3-4', 'Neuroanesthésie', 'neuro'),
        S('udem-r3-5', 'Chirurgie cardiaque', 'cardiothoracic', ['M6']),
        S('udem-r3-6', 'Médecine interne et soins intensifs', 'icu'),
        S('udem-r3-7', 'Stage en région', 'specialties'),
      ],
    },
    {
      id: 'udem-r5',
      title: 'R5',
      items: [
        S('udem-r5-1', 'Anesthésie régionale II', 'regional', ['M6', 'M7']),
        S('udem-r5-2', 'Chirurgie générale et chirurgie majeure', 'ga'),
        S('udem-r5-3', 'Pédiatrie III et obstétrique II', 'obstetric'),
        S('udem-r5-4', 'Clinique de base', 'preop', ['M10']),
        S('udem-r5-5', 'Stage en région et stages au choix', 'specialties'),
      ],
    },
  ],
  reuse: 'Liste des stages résumée à partir de la page publique du programme ; consultez l’université pour la version en vigueur.',
  caveats: ['La durée de chaque stage n’est pas indiquée sur la page publique.'],
};
