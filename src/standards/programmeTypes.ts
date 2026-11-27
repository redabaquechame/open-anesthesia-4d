/**
 * Official training programmes (Maroc, France, Canada/Québec, Europe) and the official
 * resource library, in French.
 *
 * Rules
 *  - Every programme and resource points at a document that was actually opened; `reading` says
 *    how it was read (full text, abstract, summary). Nothing is listed from memory.
 *  - Competency texts are short paraphrases in our own words (some bodies, e.g. the Royal
 *    College, forbid reproduction). Each links to the app modules that train it.
 *  - Numbers quoted in `keyPoints` are clinical claims: they must match the opened source.
 */

export type RegionId = 'ma' | 'fr' | 'ca' | 'eu' | 'int';

export type Reading = 'texte intégral' | 'résumé' | 'synthèse' | 'non ouvert';

export type AppModuleId = 'M1_M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9' | 'M10' | 'M11';

export interface ProgrammeItem {
  id: string;
  /** Paraphrase in French. */
  text: string;
  /** Domain id from src/standards/curriculum.ts (for the coverage map). */
  domain?: string;
  /** App modules that let a resident practise it. */
  modules?: AppModuleId[];
  /** Ids of OfficialResource entries that teach or define it. */
  resources?: string[];
}

export interface ProgrammeStage {
  id: string;
  title: string;
  /** e.g. "1 an", "2 ans", "4 semestres". */
  duration?: string;
  summary?: string;
  /** Required placements / rotations, as written in the official text (paraphrased). */
  placements?: string[];
  items: ProgrammeItem[];
}

export interface Programme {
  id: string;
  region: RegionId;
  /** Short label for the tab. */
  label: string;
  flag: string;
  officialTitle: string;
  body: string;
  version: string;
  url: string;
  reading: Reading;
  /** Total duration of training. */
  duration: string;
  /** Legal basis and related official texts. */
  legal?: { title: string; url: string }[];
  /** How the programme is structured, in two or three sentences. */
  structure: string;
  /** How residents are assessed. */
  assessment?: string;
  stages: ProgrammeStage[];
  /** Reuse terms as stated by the body. */
  reuse: string;
  /** Anything not found or not checked. */
  caveats?: string[];
}

export type ResourceKind = 'programme' | 'texte officiel' | 'recommandation' | 'protocole' | 'examen' | 'jeu de données' | 'logiciel libre' | 'norme';

export interface OfficialResource {
  id: string;
  region: RegionId | 'us' | 'uk' | 'sn';
  kind: ResourceKind;
  /** French title (official French title when one exists). */
  title: string;
  /** Original title when the document is not in French. */
  originalTitle?: string;
  body: string;
  year: number;
  citation?: string;
  url: string;
  reading: Reading;
  /** Free to read? */
  access: 'libre' | 'résumé seul' | 'payant' | 'inscription';
  licence?: string;
  /** Domain ids from src/standards/curriculum.ts. */
  domains: string[];
  /** Key points in French, only as read in the source. */
  keyPoints?: string[];
  /** App modules where it is used. */
  modules?: AppModuleId[];
}
