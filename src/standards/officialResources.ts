/**
 * Official resource library (programmes, laws, guidelines, protocols, exams, datasets), in French.
 * One file per region in src/standards/resources/.
 */
import type { OfficialResource } from './programmeTypes';
import { MA_RESOURCES } from './resources/ma';
import { FR_RESOURCES } from './resources/fr';
import { CA_RESOURCES } from './resources/ca';
import { EU_RESOURCES } from './resources/eu';
import { INTL_RESOURCES } from './resources/intl';

export const OFFICIAL_RESOURCES: OfficialResource[] = [...MA_RESOURCES, ...FR_RESOURCES, ...CA_RESOURCES, ...EU_RESOURCES, ...INTL_RESOURCES];
