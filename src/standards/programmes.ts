/**
 * Official training programmes, in the order the user asked for: Maroc, France, Canada/Québec, Europe.
 * Each programme lives in src/standards/programmes/<region>.ts.
 */
import type { Programme } from './programmeTypes';
import { MA_SMAAR } from './programmes/ma';
import { FR_DES_AR } from './programmes/fr';
import { CA_RC_CBD, CA_UDEM } from './programmes/ca';
import { EU_ETR } from './programmes/eu';

export const PROGRAMMES: Programme[] = [MA_SMAAR, FR_DES_AR, CA_RC_CBD, CA_UDEM, EU_ETR];
