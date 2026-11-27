import type { SoftTissueParams } from './spineGeometry';

/** Region set-up for the neuraxial module (pure data, shared by the app and `npm run sanity`). */

export type SpineRegion = 'thoracic' | 'lumbar';
export type Approach = 'midline' | 'paramedian';

export interface RegionDef {
  verts: string[];
  /** discs[k] lies between verts[k] and verts[k + 1]. */
  discs: string[];
  /** Meshes that move with the last vertebra (e.g. sacrum). */
  extras: string[];
  anchor: number;
  /** Extra flexion per motion segment at 100 % (illustrative). */
  flexMaxDeg: number;
  defaultSpace: number;
  /** Illustrative soft-tissue dimensions (m); see claim m7-soft-tissue-dims. */
  soft: Omit<SoftTissueParams, 'skinZ' | 'fatDepth' | 'duraHalfDepth'>;
  defaults: Record<Approach, { ceph: number; med: number }>;
}

export const REGIONS: Record<SpineRegion, RegionDef> = {
  lumbar: {
    verts: ['l2', 'l3', 'l4', 'l5'],
    discs: ['discL2', 'discL3', 'discL4'],
    extras: ['sacrum'],
    anchor: 1,
    flexMaxDeg: 6,
    defaultSpace: 1,
    soft: { flavumThickness: 0.004, epiDorsal: 0.005, flavumHalfWidth: 0.011, canalHalfWidth: 0.012, duraHalfWidth: 0.008, cord: null, ligHalfWidth: 0.004 },
    defaults: { midline: { ceph: 10, med: 0 }, paramedian: { ceph: 15, med: 12 } },
  },
  thoracic: {
    verts: ['t4', 't5', 't6', 't7', 't8', 't9'],
    discs: ['discT4', 'discT5', 'discT6', 'discT7', 'discT8'],
    extras: [],
    anchor: 2,
    flexMaxDeg: 2,
    defaultSpace: 2,
    soft: { flavumThickness: 0.0025, epiDorsal: 0.003, flavumHalfWidth: 0.009, canalHalfWidth: 0.009, duraHalfWidth: 0.007, cord: [0.0045, 0.0035], ligHalfWidth: 0.004 },
    defaults: { midline: { ceph: 50, med: 0 }, paramedian: { ceph: 20, med: 12 } },
  },
};

export const spaceName = (region: SpineRegion, i: number) => {
  const v = REGIONS[region].verts;
  return `${v[i].toUpperCase()}–${v[i + 1].toUpperCase()}`;
};

/** Dural sac half-depth from the measured canal depth (illustrative rule). */
export const duraHalfDepthFor = (def: RegionDef, canalDepth: number) =>
  Math.min(0.0075, Math.max(0.0035, (canalDepth - def.soft.epiDorsal - 0.0015) / 2));
