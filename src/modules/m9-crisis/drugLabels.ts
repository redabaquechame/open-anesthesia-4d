/**
 * Syringe-label class strip for M9 drug actions.
 *
 * 1. ISO 26825:2020 preview (claim m9-iso26825; clauses 5.2.2, 5.4.4, 5.4.5 and Table 1, first page):
 *    induction yellow RGB 255.255.0; benzodiazepines orange 255.102.0 with white lettering; local
 *    anaesthetics grey 194.184.171; drugs of opposite action = white diagonal stripes at 45°;
 *    suxamethonium and adrenaline = black bar with white lettering on the upper half.
 * 2. AAGBI « Syringe labelling in critical care areas », review 2014 updated 2016 (built on ISO 26825:2008;
 *    claim m9-syringe-classes-aagbi): opioids blue (Pantone 297), vasopressors violet (Pantone 256,
 *    adrenaline violet under a black bar), neuromuscular blockers warm red (Pantone 805),
 *    hypotensive agents violet with white diagonal stripes, antagonists = class colour with white stripes.
 *    The Pantone references are sourced; the RGB values below are screen approximations of them,
 *    not values printed in a standard.
 *
 * Trap drugs keep their real class colour, so the colour never gives the answer away.
 * Actions that are not a single syringe (« normaliser la PA », « curarisation complète »,
 * « noradrénaline, vasopressine, glucagon ») get no strip.
 */
export type IsoLabel = { colour?: string; pattern?: 'stripes' | 'blackbar'; nameFr: string; nameEn: string };

const INDUCTION: IsoLabel = { colour: 'rgb(255,255,0)', nameFr: 'Hypnotique d’induction', nameEn: 'Induction agent' };
const BENZO: IsoLabel = { colour: 'rgb(255,102,0)', nameFr: 'Benzodiazépine', nameEn: 'Benzodiazepine' };
const LOCAL: IsoLabel = { colour: 'rgb(194,184,171)', nameFr: 'Anesthésique local', nameEn: 'Local anaesthetic' };

// Screen approximations of the Pantone references in the AAGBI guideline (claim m9-syringe-classes-aagbi).
const VIOLET_256 = 'rgb(204,162,224)';
const RED_805 = 'rgb(255,114,118)';

const ADRENALINE: IsoLabel = { colour: VIOLET_256, pattern: 'blackbar', nameFr: 'Vasopresseur — adrénaline (barre noire)', nameEn: 'Vasopressor — adrenaline (black bar)' };
const VASOPRESSOR: IsoLabel = { colour: VIOLET_256, nameFr: 'Vasopresseur', nameEn: 'Vasopressor' };
const HYPOTENSIVE: IsoLabel = { colour: VIOLET_256, pattern: 'stripes', nameFr: 'Antihypertenseur (violet rayé)', nameEn: 'Hypotensive agent (violet, striped)' };
const NMB_REVERSAL: IsoLabel = { colour: RED_805, pattern: 'stripes', nameFr: 'Antagoniste des curares (rouge rayé)', nameEn: 'Neuromuscular block reversal (red, striped)' };

/** By action or distractor id (ids are shared across scenarios with the same meaning). */
export const ISO_LABEL_BY_ID: Record<string, IsoLabel> = {
  propofolBig: INDUCTION,
  benzo: BENZO,
  diazepam: BENZO,
  lidocaine: LOCAL,
  adrenaline: ADRENALINE,
  adrenalineHigh: ADRENALINE,
  adrenaline1mg: ADRENALINE,
  adrenalineFirst: ADRENALINE,
  epiStd: ADRENALINE,
  epiSmall: ADRENALINE,
  infusion: ADRENALINE,
  vasopressin: VASOPRESSOR,
  bp: HYPOTENSIVE,
  sugammadex: NMB_REVERSAL,
};
