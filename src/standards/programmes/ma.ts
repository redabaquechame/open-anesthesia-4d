/**
 * Maroc — Référentiel de compétences SMAAR / MBACC (Collège Marocain d’Anesthésiologie et de
 * Réanimation), « Jalons » 2023 : 20 jalons × 5 phases. PDF lu en entier le 2026-11-26.
 * SMAAR interdit la reproduction sans accord écrit : chaque phase est résumée dans nos mots.
 * La durée du résidanat (4 ans) vient du décret n° 2-92-182 (art. 2), lu en entier.
 */
import type { AppModuleId, Programme, ProgrammeStage } from '../programmeTypes';

const PHASE = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4 — profil attendu', 'Phase 5 — expert'];

function jalon(n: number, title: string, domain: string, modules: AppModuleId[], phases: string[], resources?: string[]): ProgrammeStage {
  return {
    id: `ma-j${n}`,
    title: `Jalon ${n} — ${title}`,
    items: phases.map((text, i) => ({
      id: `ma-j${n}-p${i + 1}`,
      text: `${PHASE[i]} : ${text}`,
      domain,
      modules: i < 4 ? modules : undefined,
      resources,
    })),
  };
}

export const MA_SMAAR: Programme = {
  id: 'ma-smaar-jalons-2023',
  region: 'ma',
  label: 'SMAAR / MBACC — Jalons 2023',
  flag: '🇲🇦',
  officialTitle: 'Référentiel de compétences en Anesthésie et Réanimation — Jalons',
  body: 'SMAAR et MBACC (Moroccan Board of Anesthesiology & Critical Care — Collège Marocain d’Anesthésiologie et de Réanimation)',
  version: '2023 (PDF du 21/12/2023)',
  url: 'https://smaar.ma/wp-content/uploads/2023/12/SMAAR-MBACC-Referentiel-de-competences-en-Anesthesie-et-Reanimation-Jalons-_compressed.pdf',
  reading: 'texte intégral',
  duration: '4 ans de résidanat (diplôme de spécialité médicale, décret n° 2-92-182, art. 2)',
  legal: [
    { title: 'Décret n° 2-92-182 du 14 mai 1993 — régime des études du diplôme de spécialité médicale (anesthésie-réanimation : 4 ans ; examen de fin de spécialité commun, une session par an)', url: 'https://www.sante.gov.ma/Reglementation/ProfSante/Documents/2-92-182.pdf' },
    { title: 'Décret n° 2-91-527 du 13 mai 1993 — situation des internes et résidents (internat 2 ans)', url: 'https://www.sante.gov.ma/Reglementation/FORMATIONSETUDESETSPECIALITES/2-91-527.pdf' },
    { title: 'Décret n° 2.26.342 du 30 avril 2026 (BO n° 7505) — nouveau statut des internes et résidents ; engagement de service public ramené à 3 ans pour la promotion 2032', url: 'https://mmsp.gov.ma/sites/default/files/publications/D%C3%A9cret%20n%C2%B0%202.26.342.pdf' },
    { title: 'Référentiel des compétences : profil du métier de médecin anesthésiste-réanimateur (SMAAR/MBACC)', url: 'https://smaar.ma/wp-content/uploads/2023/12/SMAAR-MBACC-Referentiel-des-Competences-_-Profil-du-Metier-Medecin-Anesthesiste-Reanimateur.pdf' },
    { title: 'FMPM Marrakech — Guide du résident (maquette obligatoire, livret de stage, stage < 4 mois non validable)', url: 'https://wd.fmpm.uca.ma/fmpm/formation/spec/guide_res.pdf' },
  ],
  structure:
    '20 jalons couvrant les soins, la coopération, le professionnalisme et l’érudition, chacun en 5 phases de progression. La phase 4 correspond au profil attendu d’un anesthésiste-réanimateur en exercice ; la phase 5 est un niveau d’expertise. Les phases ne sont pas liées à une année de résidanat. Le référentiel doit servir de base aux futurs programmes de formation initiale et continue.',
  assessment:
    'Examen de fin de 1re année, validation annuelle de chaque année, puis examen de fin de spécialité commun à toutes les facultés (une session par an ; titres, épreuves écrites et pratiques) — décret n° 2-92-182, art. 7–8 et règlement des études FMPM, art. 50.',
  stages: [
    jalon(1, 'Évaluation des patients et plans de soins', 'preop', ['M10'], [
      'première évaluation ciblée et premiers examens ; diagnostic et tri sous supervision',
      'cas atypiques sous supervision ; plan tenant compte de l’incertitude ; avis spécialisés',
      'relative autonomie sur les cas atypiques ; reconnaît les défaillances d’organes et, avec aide, la futilité',
      'évaluation et plan de soins autonomes ; usage judicieux de ressources limitées en situation de crise',
      'rôle de conseil ; conçoit des modèles adaptés aux ressources de l’institution',
    ]),
    jalon(2, 'Événements aigus et dysfonctions d’organes', 'resus', ['M9', 'M6'], [
      'reconnaît le choc et la dégradation ; approche ABCDE ; appelle à l’aide',
      'diagnostic différentiel hiérarchisé ; débute la réanimation',
      'relative autonomie face au choc et aux défaillances ; conscience de la situation ; sait quand arrêter',
      'anticipe ; limite la défaillance multiviscérale ; gère un flux de patients critiques',
      'conseil au niveau du service ; critères de tri et allocation des ressources rares',
    ], ['ma-smaar-transfusion-massive', 'ma-smaar-arret-2021', 'ma-smaar-hpp']),
    jalon(3, 'Habiletés procédurales et interprétation', 'monitoring', ['M1_M2', 'M6', 'M8'], [
      'prépare la salle ou la chambre et l’étiquetage des seringues ; cathéters artériel et central ; gaz du sang',
      'monitorage avancé en relative autonomie ; drain thoracique, cricothyroïdotomie, fibroscopie sous supervision',
      'pose l’indication du monitorage avancé ; élimine une panne de matériel ; adapte l’échographie ciblée',
      'autonome ; contourne une panne de matériel ; forme les autres',
      'rédige les guides de monitorage du service ; certification',
    ], ['ma-smar-referentiels-2016']),
    jalon(4, 'Gestion respiratoire en réanimation', 'icu', ['M1_M2'], [
      'insuffisance respiratoire aiguë ; ventilation de base et non invasive',
      'choix invasive / non invasive sous supervision ; interactions cœur-poumon',
      'adapte la ventilation ; indications de trachéotomie et d’ECMO avec aide',
      'maîtrise les différents modes ventilatoires',
      'pilote les procédures et les stratégies ventilatoires',
    ], ['ma-smaar-sepsis-2025']),
    jalon(5, 'Douleur, soins palliatifs et fin de vie', 'chronicpain', [], [
      'plans antalgiques et palliatifs conformes aux objectifs du patient',
      'moment du passage au palliatif ; enjeux éthiques et culturels ; critères de don d’organes',
      'démarche décisionnelle adaptée à la capacité du patient',
      'autonome ; applique les règles du diagnostic de mort encéphalique ; prise en charge du donneur',
      'rôle de liaison ; comités de recommandations',
    ]),
    jalon(6, 'Pharmacologie', 'pharmacology', ['M3', 'M4', 'M5'], [
      'bases : vasoactifs, sédatifs, hypnotiques, analgésiques, antibiotiques',
      'a besoin d’un guide pour choisir les médicaments',
      'ajuste le traitement ; gère interactions et effets indésirables',
      'maîtrise la pharmacologie pratique',
      'rôle de conseil',
    ]),
    jalon(7, 'Évaluation pré-anesthésique', 'preop', ['M10'], [
      'interrogatoire, examen, revue des examens, consentement ; présente au senior',
      'examen ciblé ; prescriptions selon les règles du service',
      'décisions relativement autonomes selon l’urgence et les ressources',
      'autonome et dans les délais pour tous les types de cas',
      'dépiste les pathologies méconnues ; stratifie le risque ; rédige le protocole de consultation',
    ], ['ma-smaar-ppc-2019']),
    jalon(8, 'Planification de l’anesthésie et de l’analgésie', 'ga', ['M10', 'M4'], [
      'énumère les éléments du plan et les stratégies antalgiques',
      'plan incluant monitorage, transfusion et analgésie selon les guides locaux',
      'marges de sécurité à l’induction, à l’entretien et au réveil',
      'planifie pour une comorbidité majeure mal contrôlée ; fixe des objectifs hémodynamiques',
      'stratégies contre les complications ; patients difficiles (ex. usage de drogues)',
    ]),
    jalon(9, 'Gestion peropératoire', 'ga', ['M1_M2', 'M3', 'M4', 'M5', 'M9'], [
      'assiste l’induction, l’entretien et le réveil',
      'cas simples en relative autonomie',
      'patients à comorbidité majeure ; communique avec le chirurgien',
      'comorbidités multiples non contrôlées ; anticipe et s’adapte',
      'événements rares ou inexpliqués ; retour d’expérience aux chirurgiens',
    ], ['ma-smar-referentiels-2016', 'ma-preeclampsie']),
    jalon(10, 'Gestion des voies aériennes', 'airway', ['M8', 'M9'], [
      'évaluation des voies aériennes ; ventilation au ballon-masque ; connaît les protocoles d’intubation difficile',
      'planifie et prépare le matériel ; critères d’extubation',
      'prédit l’intubation difficile ; plan d’extubation sûr',
      'plan autonome de ventilation au masque et d’intubation difficiles',
      'conseil ; guides pour limiter les traumatismes liés aux tentatives répétées',
    ], ['ma-smaar-id-obst-2018']),
    jalon(11, 'Explorations échographiques', 'pocus', ['M6'], [
      'terminologie et orientation ; abord échoguidé sous supervision',
      'signes typiques en échocardiographie transthoracique (hypovolémie, défaillance ventriculaire, tamponnade)',
      'signes plus fins ; abords échoguidés en relative autonomie',
      'optimise l’image ; échographie d’urgence et abords difficiles en situation de crise',
      'évalue les nouvelles techniques',
    ]),
    jalon(12, 'Gestion postopératoire', 'postop', ['M5'], [
      'transfert en SSPI ; complications immédiates',
      'complications courantes ; indication de transfert en réanimation',
      'complications atypiques ; réveil retardé',
      'décide en autonomie de la sortie ou du transfert en réanimation',
      'cartographie des causes de complications ; critères de niveau de soins',
    ], ['ma-smaar-ppc-2019']),
    jalon(13, 'Anesthésie et analgésie locorégionales', 'regional', ['M6', 'M7', 'M9'], [
      'anatomie, préparation, complications',
      'indications et contre-indications ; bloc périphérique sous supervision',
      'choisit la technique ; réalise le bloc en un temps raisonnable',
      'blocs autonomes ; gère les complications',
      'rôle de conseil',
    ], ['ma-smaar-sedation-2018']),
    jalon(14, 'Connaissances médicales et activités d’érudition', 'education', [], [
      'connaissances de base ; congrès ; objectifs d’apprentissage',
      'lecture critique',
      'participe à la recherche ; pratique fondée sur les preuves',
      'initie des travaux et des protocoles',
      'publie et diffuse les connaissances',
    ]),
    jalon(15, 'Communication avec le patient et ses proches', 'nts', [], [
      'information claire, sans jargon ; recours à un interprète',
      'conflits familiaux ; limites culturelles et religieuses ; traçabilité',
      'conflits complexes ; annonce d’un événement indésirable',
      'autonome ; aborde le don d’organes en fin de vie',
      'modèles transculturels ; annonce d’une erreur médicale',
    ]),
    jalon(16, 'Collaboration et transmission sécurisée des soins', 'nts', ['M9'], [
      'transmission claire des tâches ; feuille d’anesthésie',
      'planifie les transferts intrahospitaliers',
      'communication en boucle fermée ; dirige l’équipe de réanimation ; transmission sûre',
      'chef d’équipe ; travaille avec la filière de don d’organes',
      'conduit le débriefing après un événement critique',
    ]),
    jalon(17, 'Déontologie professionnelle', 'ethics', [], [
      'déclare les événements indésirables ; déclarations obligatoires',
      'équilibre excellence et bien-être',
      'analyse des causes d’une erreur',
      'déclare les erreurs selon la procédure de l’établissement ; dilemmes éthiques',
      'pilote des actions de sécurité des patients ; comités nationaux',
    ]),
    jalon(18, 'Formation et encadrement de l’équipe', 'education', ['M9'], [
      'partage ses connaissances',
      'explique ses décisions',
      'anime des séances de raisonnement clinique',
      'corrige les lacunes précises des apprenants',
      'modèle de rôle ; fixe les objectifs pédagogiques',
    ]),
    jalon(19, 'Rétroaction professionnelle (feedback)', 'education', [], [
      'sollicite un retour',
      'fait un retour aux plus jeunes',
      'feedback en situation difficile',
      'feedback précis qui développe l’auto-évaluation',
      'relie feedback et auto-évaluation',
    ]),
    jalon(20, 'Économie de santé et coût des soins', 'safety', ['M3'], [
      'a besoin d’être incité à penser aux coûts',
      'raisonnement coût-bénéfice avec aide',
      'intègre le coût-bénéfice dans ses plans',
      'autonome ; programmes de réduction des coûts',
      'coordonne les ressources ; réforme de l’assurance maladie (AMO)',
    ], ['ma-smaar-n2o-2026']),
  ],
  reuse: 'SMAAR : reproduction, modification ou adaptation interdites sans accord écrit préalable (mentions légales, loi 09-08). Les phases sont résumées dans nos mots ; consultez le PDF original.',
  caveats: [
    'Aucun plan d’études officiel (arrêté conjoint prévu par l’art. 6 du décret n° 2-92-182) ni maquette de faculté n’a été trouvé en ligne : ce référentiel SMAAR est le cadre structuré disponible.',
    'Le document ne mentionne ni auteurs ni validation par le ministère.',
  ],
};
