/**
 * M8 double-lumen tube (DLT) + one-lung ventilation model (pure TypeScript, no DOM).
 *
 * What is sourced (opened, see src/evidence/evidenceRegistry.ts):
 * - Brodsky 1991 (doi:10.1213/00000539-199111000-00010): average left-DLT depth 29 cm at 170 cm height,
 *   ±1 cm per 10 cm of height, with the cephalad surface of the bronchial cuff immediately below the carina.
 * - Benumof 1987 (doi:10.1097/00000542-198711000-00018): proximal left cuff → left lumen tip 30 mm; male / female
 *   left main bronchus 49 ± 8 / 44 ± 7 mm, right main bronchus 19 ± 6 / 15 ± 5 mm; RUL diameter 11 mm;
 *   margin of safety (left DLT) = left main bronchus length − 30 mm.
 * - Yao 2019 (doi:10.1016/j.bjan.2019.03.012): left main bronchus < 40 mm → more desaturation during OLV.
 * - Yoon 2005 (doi:10.1007/BF03016286): DLT displacement supine → lateral 6.3 ± 5.5 mm (trachea), 2.4 ± 3.6 mm (bronchus).
 * - Severinghaus 1979 (doi:10.1152/jappl.1979.46.3.599): S = 1 / (23400 / (PO2³ + 150·PO2) + 1).
 *
 * Simulator model (derived or illustrative, labelled in the claim registry):
 * - airway landmarks come from the BodyParts3D specimen (airway-map.json) or from the Benumof averages;
 * - cuff length 15 mm, tracheal-lumen opening 15 mm above the cuff, cuff wall compliance, airway resistance,
 *   lung compliance, baseline shunt, gravity and HPV weights, lumen sizes (VERIFY) are illustrative;
 * - gas exchange: alveolar gas equation + shunt (Berggren form) + Fick: CaO2 = Cc'O2 − Qs/Qt · VO2/Q.
 */
import type { Lobe } from './airwayGeometry';

export const LOBE_LIST: Lobe[] = ['RUL', 'RML', 'RLL', 'LUL', 'LLL'];
const isLeft = (l: Lobe) => l[0] === 'L';

// ── Anatomy ─────────────────────────────────────────────────────────────────
export type AnatomyVariant = 'specimen' | 'male' | 'female' | 'shortLeft';

/** Landmarks along each main path, metres from the carina. */
export interface Landmarks {
  leftMain: number;
  lul: [number, number];
  rul: [number, number];
  rml: [number, number];
  tracheaD: number;
  leftMainD: number;
  rightMainD: number;
}

export interface SpecimenMeasures {
  leftMainLength: number;
  lulOrifice: { proximal: number; distal: number };
  rulOrifice: { proximal: number; distal: number };
  rmlOrifice: { proximal: number; distal: number };
  tracheaDiameter: number;
  leftMainDiameter: number;
  rightMainDiameter: number;
}

/** Benumof 1987 means (mm). RUL diameter 11 mm (lung casts). */
export const BENUMOF = { maleLeft: 49, maleRight: 19, femaleLeft: 44, femaleRight: 15, rulDiameter: 11, cuffToTip: 30 } as const;

export function landmarksFor(v: AnatomyVariant, m: SpecimenMeasures): Landmarks {
  const spec: Landmarks = {
    leftMain: m.leftMainLength,
    lul: [m.lulOrifice.proximal, m.lulOrifice.distal],
    rul: [m.rulOrifice.proximal, m.rulOrifice.distal],
    rml: [m.rmlOrifice.proximal, m.rmlOrifice.distal],
    tracheaD: m.tracheaDiameter,
    leftMainD: m.leftMainDiameter,
    rightMainD: m.rightMainDiameter,
  };
  if (v === 'specimen') return spec;
  const [L, R] =
    v === 'male' ? [BENUMOF.maleLeft, BENUMOF.maleRight] : v === 'female' ? [BENUMOF.femaleLeft, BENUMOF.femaleRight] : [38, BENUMOF.femaleRight];
  const left = L / 1000;
  const rulP = R / 1000;
  // Keep the specimen's orifice widths; place them at the published lengths.
  const lulW = spec.lul[1] - spec.lul[0];
  const k = rulP / spec.rul[0];
  const sizeK = v === 'male' ? 1 : 0.9;
  return {
    leftMain: left,
    lul: [left - lulW, left],
    rul: [rulP, rulP + BENUMOF.rulDiameter / 1000],
    rml: [spec.rml[0] * k, spec.rml[1] * k],
    tracheaD: spec.tracheaD * sizeK,
    leftMainD: spec.leftMainD * sizeK,
    rightMainD: spec.rightMainD * sizeK,
  };
}

/** Physics arc length → arc length on the 3D specimen path (piecewise-linear about the key landmark). */
export function toModelArc(s: number, side: 'left' | 'right', lm: Landmarks, spec: Landmarks): number {
  const [a, b] = side === 'left' ? [lm.leftMain, spec.leftMain] : [lm.rul[0], spec.rul[0]];
  if (s <= 0) return s;
  if (s <= a) return (s / a) * b;
  return b + (s - a);
}

// ── Device ──────────────────────────────────────────────────────────────────
export type DltSize = 35 | 37 | 39 | 41;
/**
 * Outer diameter = Fr / 3 mm, matching Shiley's catalogue (11.7/12.3/13.0/13.7 mm; claim m8-dlt-od).
 * Lumen IDs and bronchial-limb OD are illustrative: manufacturers publish one limiting ID per size
 * (Shiley 4.8/5.1/5.3/5.4 mm), not per-lumen values; bronchial-limb OD is close to Hegland 2019 measurements.
 */
export const DLT_SPECS: Record<DltSize, { od: number; bronchialOd: number; trachealId: number; bronchialId: number }> = {
  35: { od: 35 / 3, bronchialOd: 9.5, trachealId: 4.5, bronchialId: 4.3 },
  37: { od: 37 / 3, bronchialOd: 10.0, trachealId: 4.7, bronchialId: 4.5 },
  39: { od: 39 / 3, bronchialOd: 10.1, trachealId: 4.9, bronchialId: 4.7 },
  41: { od: 41 / 3, bronchialOd: 10.6, trachealId: 5.4, bronchialId: 4.8 },
};
/** Tube layout, mm proximal from the bronchial tip. */
export const LAYOUT = {
  cuffProximal: BENUMOF.cuffToTip, // sourced (Benumof 1987)
  cuffDistal: 15, // illustrative: 15 mm cuff
  trachealOpening: 45, // illustrative
  lumenLength: 0.38, // m, illustrative length used for lumen resistance
} as const;

/** Incisor-to-carina distance (mm) calibrated so that Brodsky's average depth places the cuff 5 mm below the carina. */
export function incisorToCarinaMm(heightCm: number): number {
  const sTipAtBrodsky = 5 + LAYOUT.cuffProximal; // cephalad cuff surface 5 mm below carina
  return 290 - sTipAtBrodsky + (heightCm - 170); // +1 mm depth per cm of height (Brodsky 1991)
}
export const brodskyDepthCm = (heightCm: number) => 29 + (heightCm - 170) / 10;

// ── Gas exchange (sourced equations) ────────────────────────────────────────
/** Severinghaus 1979 Eq. 1: SO2 (0–1) from PO2 (mmHg). */
export const severinghausS = (po2: number) => (po2 <= 0 ? 0 : 1 / (23400 / (po2 ** 3 + 150 * po2) + 1));
/** O2 content (mL/dL) for Hb (g/dL) and PO2 (mmHg): 1.34·Hb·S + 0.003·PO2. */
export const o2Content = (hb: number, po2: number) => 1.34 * hb * severinghausS(po2) + 0.003 * po2;
/** Inverse of o2Content by bisection. */
export function po2FromContent(hb: number, c: number): number {
  let lo = 0.5;
  let hi = 800;
  if (c <= o2Content(hb, lo)) return lo;
  if (c >= o2Content(hb, hi)) return hi;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (o2Content(hb, mid) < c) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ── Model ───────────────────────────────────────────────────────────────────
export type Clamp = 'none' | 'tracheal' | 'bronchial';
export type Lumen = 'tracheal' | 'bronchial';

export interface DltInputs {
  anatomy: AnatomyVariant;
  heightCm: number;
  size: DltSize;
  depthCm: number;
  /** Bronchus the bronchial limb entered. A left DLT belongs in the left. */
  side: 'left' | 'right';
  lateral: boolean;
  /** Outward migration when turned lateral (mm). Yoon 2005 mean 6.3 mm. */
  migrationMm: number;
  /** Side facing up in lateral decubitus (the operated side). */
  upSide: 'left' | 'right';
  bronchialCuffMl: number;
  clamp: Clamp;
  vtMl: number;
  rr: number;
  peep: number;
  fio2: number;
  /** HPV strength 0–1 (fraction of flow diverted away from unventilated lung). Illustrative. */
  hpv: number;
}

export interface LobeState {
  /** Which lumen(s) can reach the lobe. */
  from: Lumen[];
  /** 0–1 airway patency of the lobe's orifice. */
  patency: number;
  ventilated: boolean;
  /** Perfusion fraction (sums to 1). */
  perfusion: number;
}

export type StatusCode =
  | 'ok'
  | 'herniation'
  | 'tooDeepLUL'
  | 'tooShallow'
  | 'wrongSide'
  | 'rulBlocked'
  | 'noSeal'
  | 'cuffPressure'
  | 'trachealOpeningInBronchus'
  | 'noVent';

export interface DltOutputs {
  /** Physics arc length of the bronchial tip from the carina along the entered bronchus (m; < 0 = in trachea). */
  sTip: number;
  cuffTop: number;
  cuffBottom: number;
  trachealOpening: number;
  /** Free (unconstrained) cuff diameter and local airway diameter at the cuff (m). */
  cuffDiameter: number;
  airwayDiameter: number;
  sealed: boolean;
  cuffPressure: number;
  herniation: number;
  /** Left DLT margin of safety (Benumof): left main length − 30 mm (m). */
  marginOfSafety: number;
  /** Remaining travel before the tip reaches the secondary carina / before the cuff reaches the carina (m). */
  toSecondaryCarina: number;
  toCarina: number;
  isolation: 'complete' | 'partial' | 'none';
  lobes: Record<Lobe, LobeState>;
  status: StatusCode[];
  mech: {
    ventCompliance: number;
    pPlat: number;
    pPeak: number;
    lumenDeltaP: number;
    deliveredVt: number;
    flowLps: number;
  };
  gas: { shunt: number; pao2: number; sao2: number; pAO2: number };
  landmarks: Landmarks;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Pressure drop (cmH2O) for flow q (L/s) through a lumen of diameter d (mm) and length L (m): max(laminar, Blasius). */
export function lumenPressureDrop(qLps: number, dMm: number, lengthM: number): number {
  const q = Math.abs(qLps) / 1000; // m³/s
  const r = dMm / 2000;
  const mu = 1.85e-5; // Pa·s, air/O2 near body temperature
  const rho = 1.2; // kg/m³
  const lam = (8 * mu * lengthM * q) / (Math.PI * r ** 4);
  const v = q / (Math.PI * r * r);
  const re = (rho * v * 2 * r) / mu;
  const f = 0.316 * Math.max(re, 1) ** -0.25;
  const turb = (f * (lengthM / (2 * r)) * rho * v * v) / 2;
  return Math.max(lam, re > 2300 ? turb : lam) / 98.0665;
}

/**
 * One steady-state evaluation. Lobe sizes (`lobeShare`) come from the specimen (airway-map.json);
 * they set both lobar compliance and baseline perfusion.
 */
export function evaluateDlt(inp: DltInputs, spec: SpecimenMeasures, lobeShare: Record<Lobe, number>): DltOutputs {
  const specLm = landmarksFor('specimen', spec);
  const lm = landmarksFor(inp.anatomy, spec);
  const dev = DLT_SPECS[inp.size];
  const status: StatusCode[] = [];

  // Position along the entered bronchus.
  const migration = inp.lateral ? inp.migrationMm : 0;
  const sTip = (inp.depthCm * 10 - incisorToCarinaMm(inp.heightCm) - migration) / 1000;
  const cuffTop = sTip - LAYOUT.cuffProximal / 1000;
  const cuffBottom = sTip - LAYOUT.cuffDistal / 1000;
  const trachealOpening = sTip - LAYOUT.trachealOpening / 1000;
  const sideMainD = inp.side === 'left' ? lm.leftMainD : lm.rightMainD;

  // Bronchial cuff: sleeve of length Lc around the bronchial limb. V = π/4 (D² − d0²) Lc.
  const Lc = (LAYOUT.cuffProximal - LAYOUT.cuffDistal) / 1000;
  const d0 = dev.bronchialOd / 1000;
  const vM3 = Math.max(0, inp.bronchialCuffMl) * 1e-6;
  const cuffDiameter = Math.sqrt(d0 * d0 + (4 * vM3) / (Math.PI * Lc));
  const cuffMid = (cuffTop + cuffBottom) / 2;
  const airwayDiameter = cuffMid < 0 ? lm.tracheaD : sideMainD;
  const contactVolume = (Math.PI / 4) * (airwayDiameter ** 2 - d0 * d0) * Lc * 1e6; // mL
  // Illustrative wall + cuff compliance after contact: 0.04 mL/cmH2O.
  const cuffPressure = inp.bronchialCuffMl > contactVolume ? (inp.bronchialCuffMl - contactVolume) / 0.04 : 0;
  const sealed = inp.bronchialCuffMl > 0 && cuffDiameter >= airwayDiameter * 0.995;
  if (cuffPressure > 30) status.push('cuffPressure');
  const herniation = Math.max(0, -cuffTop);

  // Orifices on the entered side.
  type Orifice = { lobe: Lobe; at: [number, number] };
  const own: Orifice[] =
    inp.side === 'left'
      ? [
          { lobe: 'LUL', at: lm.lul },
          { lobe: 'LLL', at: [lm.leftMain + 0.02, lm.leftMain + 0.03] },
        ]
      : [
          { lobe: 'RUL', at: lm.rul },
          { lobe: 'RML', at: lm.rml },
          { lobe: 'RLL', at: [lm.rml[1] + 0.01, lm.rml[1] + 0.02] },
        ];
  const otherLobes = LOBE_LIST.filter((l) => isLeft(l) !== (inp.side === 'left'));

  const lobes = {} as Record<Lobe, LobeState>;
  for (const l of LOBE_LIST) lobes[l] = { from: [], patency: 1, ventilated: false, perfusion: 0 };

  if (sTip <= 0) {
    // Tip still in the trachea: both lumens open above the carina.
    status.push('tooShallow');
    const cuffSealsTrachea = sealed && cuffMid < 0;
    for (const l of LOBE_LIST) lobes[l].from = cuffSealsTrachea ? ['bronchial'] : ['tracheal', 'bronchial'];
  } else {
    if (inp.side === 'right') status.push('wrongSide');
    // Space above the bronchial cuff (trachea + contralateral lung) is reached by the tracheal lumen,
    // provided its opening is not buried inside the bronchus.
    const tOpenBuried = clamp01(trachealOpening / 0.008);
    if (tOpenBuried > 0.3) status.push('trachealOpeningInBronchus');
    // A herniated cuff bulges over the carina and the contralateral main-bronchus origin; the block grows with
    // the length that has herniated and with how much of the airway the cuff fills (illustrative).
    const fill = clamp01((cuffDiameter / lm.tracheaD - 0.6) / 0.4);
    const hernBlock = clamp01(herniation / 0.008) * 0.85 * fill;
    if (herniation > 0.0005 && inp.bronchialCuffMl > 0) status.push('herniation');
    for (const l of otherLobes) {
      lobes[l].from = ['tracheal'];
      lobes[l].patency = (1 - hernBlock) * (1 - tOpenBuried);
    }
    for (const o of own) {
      const [a, b] = o.at;
      const cover = Math.max(0, Math.min(b, sTip) - Math.max(a, Math.max(cuffTop, 0))) / (b - a);
      if (b <= cuffTop) {
        // orifice proximal to the cuff → tracheal-lumen side
        lobes[o.lobe].from = ['tracheal'];
        lobes[o.lobe].patency = 1 - tOpenBuried;
      } else {
        lobes[o.lobe].from = ['bronchial'];
        lobes[o.lobe].patency = 1 - clamp01(cover * 1.25);
      }
      if (cover > 0.3 && isLeft(o.lobe)) status.push('tooDeepLUL');
      if (cover > 0.3 && o.lobe === 'RUL') status.push('rulBlocked');
    }
    if (!sealed) {
      status.push('noSeal');
      for (const l of LOBE_LIST) if (!lobes[l].from.includes('tracheal')) lobes[l].from.push('tracheal');
      for (const l of LOBE_LIST) if (!lobes[l].from.includes('bronchial') && lobes[l].patency > 0) lobes[l].from.push('bronchial');
    }
  }
  const dedupStatus = [...new Set(status)];

  // Ventilation: a lobe is ventilated if an unclamped lumen reaches it and its orifice is patent.
  const open = (x: Lumen) => !(inp.clamp === 'tracheal' && x === 'tracheal') && !(inp.clamp === 'bronchial' && x === 'bronchial');
  for (const l of LOBE_LIST) {
    const st = lobes[l];
    st.ventilated = st.patency > 0.25 && st.from.some(open);
  }
  const isolation: DltOutputs['isolation'] =
    sTip <= 0 ? 'none' : !sealed ? 'none' : dedupStatus.includes('herniation') || dedupStatus.includes('trachealOpeningInBronchus') ? 'partial' : 'complete';

  // Mechanics (VCV, square flow, I:E 1:2). Total compliance 50 mL/cmH2O (illustrative).
  const cTotal = 50;
  const ventC = LOBE_LIST.reduce((acc, l) => acc + (lobes[l].ventilated ? cTotal * lobeShare[l] * lobes[l].patency : 0), 0);
  const ti = 60 / inp.rr / 3;
  const flow = inp.vtMl / 1000 / ti;
  const usedLumens = (['tracheal', 'bronchial'] as Lumen[]).filter((x) => open(x) && LOBE_LIST.some((l) => lobes[l].ventilated && lobes[l].from.includes(x)));
  const lumenDeltaP = usedLumens.length
    ? Math.min(
        ...usedLumens.map((x) => lumenPressureDrop(flow / usedLumens.length, x === 'tracheal' ? dev.trachealId : dev.bronchialId, LAYOUT.lumenLength))
      )
    : 0;
  const pLimit = 60;
  let pPlat: number;
  let pPeak: number;
  let deliveredVt = inp.vtMl;
  if (ventC < 1) {
    dedupStatus.push('noVent');
    pPlat = pLimit;
    pPeak = pLimit;
    deliveredVt = 0;
  } else {
    pPlat = inp.peep + inp.vtMl / ventC;
    const minPat = Math.min(...LOBE_LIST.filter((l) => lobes[l].ventilated).map((l) => lobes[l].patency));
    const rAw = 5 / Math.max(0.2, minPat) ** 2; // cmH2O/L/s, illustrative
    pPeak = pPlat + lumenDeltaP + rAw * flow;
    if (pPeak > pLimit) {
      deliveredVt = Math.max(0, inp.vtMl * ((pLimit - inp.peep) / (pPeak - inp.peep)));
      pPeak = pLimit;
      pPlat = inp.peep + deliveredVt / ventC;
    }
  }

  // Perfusion: lobe size × gravity (lateral: dependent lung favoured, illustrative 1.4×) × HPV in unventilated lobes.
  let qSum = 0;
  for (const l of LOBE_LIST) {
    let q = lobeShare[l];
    if (inp.lateral) q *= (isLeft(l) ? 'left' : 'right') === inp.upSide ? 0.75 : 1.4;
    if (!lobes[l].ventilated) q *= 1 - 0.8 * clamp01(inp.hpv);
    lobes[l].perfusion = q;
    qSum += q;
  }
  for (const l of LOBE_LIST) lobes[l].perfusion /= qSum;

  // Gas exchange. Baseline shunt 5 % (illustrative); a partially patent lobe adds (1 − patency) of its flow.
  const pb = 760;
  const paco2 = 40;
  const pAO2 = Math.max(0, inp.fio2 * (pb - 47) - paco2 / 0.8);
  const base = 0.05;
  let exchanging = 0;
  for (const l of LOBE_LIST) if (lobes[l].ventilated && deliveredVt > 0) exchanging += lobes[l].perfusion * lobes[l].patency;
  const shunt = 1 - (1 - base) * exchanging;
  const hb = 13.5;
  const vo2 = 250;
  const qt = 5;
  const ccO2 = o2Content(hb, pAO2);
  const caO2 = ccO2 - shunt * (vo2 / (qt * 10));
  const pao2 = po2FromContent(hb, caO2);

  const sideMain = inp.side === 'left' ? lm.leftMain : lm.rul[0];
  return {
    sTip,
    cuffTop,
    cuffBottom,
    trachealOpening,
    cuffDiameter,
    airwayDiameter,
    sealed,
    cuffPressure,
    herniation,
    marginOfSafety: lm.leftMain - LAYOUT.cuffProximal / 1000,
    toSecondaryCarina: sideMain - sTip,
    toCarina: cuffTop,
    isolation,
    lobes,
    status: dedupStatus.length ? dedupStatus : ['ok'],
    mech: { ventCompliance: ventC, pPlat, pPeak, lumenDeltaP, deliveredVt, flowLps: flow },
    gas: { shunt, pao2, sao2: severinghausS(pao2), pAO2 },
    landmarks: lm,
  } satisfies DltOutputs & { landmarks: Landmarks };
  void specLm;
}
