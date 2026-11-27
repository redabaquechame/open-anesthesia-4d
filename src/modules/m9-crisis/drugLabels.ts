/**
 * ISO 26825:2020 syringe-label class for M9 drug actions (claim m9-iso26825).
 *
 * Read in the standard's preview (clauses 5.2.2, 5.4.4, 5.4.5 and Table 1, first page):
 * induction yellow RGB 255.255.0; benzodiazepines orange 255.102.0 with white lettering; local
 * anaesthetics grey 194.184.171; anti-emetics salmon 237.194.130; anticholinergics green 163.217.99;
 * drugs of opposite action = white diagonal stripes at 45°; suxamethonium and adrenaline = black bar
 * with white lettering on the upper half.
 * Not in the preview, so no colour is shown yet: opioids, neuromuscular blockers and their
 * reversal, vasopressors, hypotensive agents.
 *
 * Trap drugs keep their real class colour, so the colour never gives the answer away.
 */
export type IsoLabel = { colour?: string; pattern?: 'stripes' | 'blackbar'; nameFr: string; nameEn: string };

const INDUCTION: IsoLabel = { colour: 'rgb(255,255,0)', nameFr: 'Hypnotique d’induction', nameEn: 'Induction agent' };
const BENZO: IsoLabel = { colour: 'rgb(255,102,0)', nameFr: 'Benzodiazépine', nameEn: 'Benzodiazepine' };
const LOCAL: IsoLabel = { colour: 'rgb(194,184,171)', nameFr: 'Anesthésique local', nameEn: 'Local anaesthetic' };
const ADRENALINE: IsoLabel = { pattern: 'blackbar', nameFr: 'Adrénaline (barre noire)', nameEn: 'Adrenaline (black bar)' };
const NMB_REVERSAL: IsoLabel = { pattern: 'stripes', nameFr: 'Antagoniste (rayures)', nameEn: 'Antagonist (stripes)' };

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
  sugammadex: NMB_REVERSAL,
};
