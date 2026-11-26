export type PropofolModelId = 'eleveld' | 'schnider' | 'marsh';

export interface VirtualAvatar {
  id: string;
  label: string;
  ageYears: number;
  weightKg: number;
  heightCm: number;
  sex: 'M' | 'F';
  opioidCoAdmin: boolean;
}

export const SYNTHETIC_AVATARS: VirtualAvatar[] = [
  { id: 'std-adult', label: 'Virtual Avatar #1 — 35y, 70 kg, 170 cm Male (Ref)', ageYears: 35, weightKg: 70, heightCm: 170, sex: 'M', opioidCoAdmin: true },
  { id: 'bariatric', label: 'Virtual Avatar #2 — 44y, 155 kg, 165 cm Female (Bariatric)', ageYears: 44, weightKg: 155, heightCm: 165, sex: 'F', opioidCoAdmin: true },
  { id: 'elderly', label: 'Virtual Avatar #3 — 82y, 62 kg, 166 cm Male (Frail Elderly)', ageYears: 82, weightKg: 62, heightCm: 166, sex: 'M', opioidCoAdmin: true },
  { id: 'pediatric', label: 'Virtual Avatar #4 — 6y, 20 kg, 115 cm Child (Eleveld Peds)', ageYears: 6, weightKg: 20, heightCm: 115, sex: 'F', opioidCoAdmin: true },
];

export interface PkParams {
  v1: number;
  v2: number;
  v3: number;
  k10: number;
  k12: number;
  k13: number;
  k21: number;
  k31: number;
  ke0: number;
  ce50: number;
  gammaLow: number;
  gammaHigh: number;
  lbmJames: number;
}

export function jamesLbm(weightKg: number, heightCm: number, sex: 'M' | 'F'): number {
  const ratio = weightKg / heightCm;
  return sex === 'M'
    ? 1.1 * weightKg - 128 * ratio * ratio
    : 1.07 * weightKg - 148 * ratio * ratio;
}

/** Al-Sallami 2015 fat-free mass (kg), as used by the Eleveld 2018 propofol model. */
export function alSallamiFfm(weightKg: number, heightCm: number, ageYears: number, sex: 'M' | 'F'): number {
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  if (sex === 'M') {
    return (0.88 + 0.12 / (1 + Math.pow(ageYears / 13.4, -12.7))) * ((9270 * weightKg) / (6680 + 216 * bmi));
  }
  return (1.11 - 0.11 / (1 + Math.pow(ageYears / 7.1, -1.1))) * ((9270 * weightKg) / (8780 + 244 * bmi));
}

export function computePropofolPk(model: PropofolModelId, av: VirtualAvatar): PkParams {
  const lbm = jamesLbm(av.weightKg, av.heightCm, av.sex);

  if (model === 'marsh') {
    const v1 = 0.228 * av.weightKg;
    const k10 = 0.119;
    const k12 = 0.112;
    const k13 = 0.0419;
    const k21 = 0.055;
    const k31 = 0.0033;
    return {
      v1,
      v2: (v1 * k12) / k21,
      v3: (v1 * k13) / k31,
      k10,
      k12,
      k13,
      k21,
      k31,
      ke0: 0.26, // Diprifusor ke0
      ce50: 3.2, // Marsh has no PD model: simulator assumption
      gammaLow: 1.5,
      gammaHigh: 1.9,
      lbmJames: lbm,
    };
  }

  if (model === 'schnider') {
    // Published Schnider 1998 equations (note James LBM collapse at extreme BMI!)
    const v1 = 4.27;
    const v2 = Math.max(2.5, 18.9 - 0.391 * (av.ageYears - 53));
    const v3 = 238;
    const cl1 = Math.max(
      0.3,
      1.89 + 0.0456 * (av.weightKg - 77) - 0.0681 * (lbm - 59) + 0.0264 * (av.heightCm - 177)
    );
    const cl2 = Math.max(0.15, 1.29 - 0.024 * (av.ageYears - 53));
    const cl3 = 0.836;
    return {
      v1,
      v2,
      v3,
      k10: cl1 / v1,
      k12: cl2 / v1,
      k13: cl3 / v1,
      k21: cl2 / v2,
      k31: cl3 / v3,
      ke0: 0.456,
      ce50: 3.1 * Math.exp(-0.006 * (av.ageYears - 35)), // simulator assumption, not from Schnider 1998
      gammaLow: 1.5,
      gammaHigh: 1.9,
      lbmJames: lbm,
    };
  }

  // Eleveld et al. 2018 (BJA) model STRUCTURE, arterial V1, reference 35 y / 70 kg / 170 cm male.
  // Maturation terms (post-menstrual age) are OMITTED: valid only from early childhood upward.
  // Parameter values entered from the published table — VERIFY against Eleveld 2018 Table 2.
  const fCentral = (w: number) => w / (w + 33.6);
  const wRatio = av.weightKg / 70;
  const ageFactorV2 = Math.exp(-0.0156 * (av.ageYears - 35));
  const opioidClFactor = av.opioidCoAdmin ? Math.exp(-0.00286 * av.ageYears) : 1.0;
  const opioidV3Factor = av.opioidCoAdmin ? Math.exp(-0.0138 * av.ageYears) : 1.0;
  const ffm = alSallamiFfm(av.weightKg, av.heightCm, av.ageYears, av.sex);
  const ffmRef = alSallamiFfm(70, 170, 35, 'M');

  const v1 = 6.28 * (fCentral(av.weightKg) / fCentral(70));
  const v2 = 25.5 * wRatio * ageFactorV2;
  const v3 = 273 * (ffm / ffmRef) * opioidV3Factor;
  const clRef = av.sex === 'M' ? 1.79 : 2.1;
  const cl1 = clRef * Math.pow(wRatio, 0.75) * opioidClFactor;
  const q2 = 1.75 * Math.pow(v2 / 25.5, 0.75);
  const q3 = 1.11 * Math.pow(v3 / 273, 0.75);
  const ke0 = 0.146 * Math.pow(wRatio, -0.25);
  const ce50 = 3.08 * Math.exp(-0.00635 * (av.ageYears - 35));

  return {
    v1,
    v2,
    v3,
    k10: cl1 / v1,
    k12: q2 / v1,
    k13: q3 / v1,
    k21: q2 / v2,
    k31: q3 / v3,
    ke0,
    ce50,
    gammaLow: 1.47,
    gammaHigh: 1.89,
    lbmJames: lbm,
  };
}

export function computeMintoRemifentanilPk(av: VirtualAvatar): PkParams {
  const lbm = Math.max(30, jamesLbm(av.weightKg, av.heightCm, av.sex));
  const v1 = Math.max(1.5, 5.1 - 0.0201 * (av.ageYears - 40) + 0.072 * (lbm - 55));
  const v2 = Math.max(2.0, 9.82 - 0.0811 * (av.ageYears - 40) + 0.108 * (lbm - 55));
  const v3 = 5.42;
  const cl1 = Math.max(0.5, 2.6 - 0.0162 * (av.ageYears - 40) + 0.0191 * (lbm - 55));
  const cl2 = Math.max(0.2, 2.05 - 0.0301 * (av.ageYears - 40));
  const cl3 = Math.max(0.01, 0.076 - 0.00113 * (av.ageYears - 40));
  const ke0 = Math.max(0.15, 0.595 - 0.007 * (av.ageYears - 40));
  return {
    v1,
    v2,
    v3,
    k10: cl1 / v1,
    k12: cl2 / v1,
    k13: cl3 / v1,
    k21: cl2 / v2,
    k31: cl3 / v3,
    ke0,
    ce50: 4.5, // simulator assumption (remifentanil alone barely moves BIS)
    gammaLow: 1.5,
    gammaHigh: 1.5,
    lbmJames: lbm,
  };
}

export interface CompartmentState {
  a1: number;
  a2: number;
  a3: number;
  cp: number;
  ce: number;
  infusionRateMgMin: number;
  predictedBis: number;
}

export class ThreeCompartmentEngine {
  private a1 = 0;
  private a2 = 0;
  private a3 = 0;
  private ce = 0;

  public reset(): void {
    this.a1 = 0;
    this.a2 = 0;
    this.a3 = 0;
    this.ce = 0;
  }

  public stepTci(pk: PkParams, targetCe: number, dtMin: number): CompartmentState {
    // Proportional-feedforward effect-site TCI controller (capped at 1200 mL/h of 10 mg/mL = 200 mg/min)
    const cp = this.a1 / pk.v1;
    const maintFlux = (pk.k10 + pk.k12 + pk.k13) * this.a1 - pk.k21 * this.a2 - pk.k31 * this.a3;
    const ceErr = targetCe - this.ce;
    let rateMgMin = 0;

    // Simulator controller (not a commercial TCI algorithm): overshoot Cp while Ce is below target,
    // hold Cp at the target once Ce is there, stop the pump while Ce is above target.
    if (ceErr > -0.05) {
      const desiredCp = targetCe + Math.max(0, ceErr) * (0.9 / Math.max(0.15, pk.ke0));
      rateMgMin = Math.max(0, maintFlux + (desiredCp - cp) * pk.v1 * 2.2);
    }
    rateMgMin = Math.min(rateMgMin, 200);

    const sub = 6;
    const h = dtMin / sub;
    for (let i = 0; i < sub; i++) {
      const da1 = rateMgMin - (pk.k10 + pk.k12 + pk.k13) * this.a1 + pk.k21 * this.a2 + pk.k31 * this.a3;
      const da2 = pk.k12 * this.a1 - pk.k21 * this.a2;
      const da3 = pk.k13 * this.a1 - pk.k31 * this.a3;
      this.a1 = Math.max(0, this.a1 + da1 * h);
      this.a2 = Math.max(0, this.a2 + da2 * h);
      this.a3 = Math.max(0, this.a3 + da3 * h);
      const currCp = this.a1 / pk.v1;
      this.ce = Math.max(0, this.ce + pk.ke0 * (currCp - this.ce) * h);
    }

    const gamma = this.ce <= pk.ce50 ? pk.gammaLow : pk.gammaHigh;
    const bis = 93 * (1 - Math.pow(this.ce, gamma) / (Math.pow(this.ce, gamma) + Math.pow(pk.ce50, gamma)));

    return {
      a1: this.a1,
      a2: this.a2,
      a3: this.a3,
      cp: this.a1 / pk.v1,
      ce: this.ce,
      infusionRateMgMin: rateMgMin,
      predictedBis: bis,
    };
  }
}

/**
 * Generates synthetic frontal EEG waveform & 30-bin (1..30 Hz) DSA power spectrum.
 * Exposes: GABAergic delta+alpha bands, 2 Hz BIS filter distortion, NMB false-low BIS drop,
 * nociceptive alpha dropout, elderly alpha attenuation, and burst suppression.
 */
export function synthesizeEegSpectrum(opts: {
  propofolCe: number;
  ce50: number;
  ageYears: number;
  nmbParalyzedAwakeTrap: boolean;
  untreatedPain: boolean;
  bis2HzFilterOn: boolean;
  timeSec: number;
}): {
  spectrum30Hz: Float32Array;
  rawSampleUv: number;
  trueBrainStateLabel: string;
  displayedBisLag: number;
  suppressionRatioPct: number;
} {
  const { propofolCe, ce50, ageYears, nmbParalyzedAwakeTrap, untreatedPain, bis2HzFilterOn, timeSec } = opts;
  const depth = propofolCe / Math.max(0.8, ce50);
  const elderlyFactor = Math.max(0.28, 1 - Math.max(0, ageYears - 45) * 0.015);
  const spectrum = new Float32Array(30);

  // Burst suppression probability rises sharply at high depth or in frail elderly brains
  const burstSupThreshold = ageYears > 70 ? 1.32 : 1.65;
  const suppressionRatioPct =
    depth > burstSupThreshold ? Math.min(92, (depth - burstSupThreshold) * 115) : 0;
  const inFlatPeriod =
    suppressionRatioPct > 8 && Math.sin(timeSec * 0.85) < (suppressionRatioPct / 100) * 1.6 - 0.8;

  for (let hz = 1; hz <= 30; hz++) {
    let power = 0.08;
    if (inFlatPeriod) {
      power = 0.02;
    } else if (depth < 0.35) {
      // Awake: strong beta/EMG (15-30 Hz), weak slow wave
      power = hz >= 14 ? (nmbParalyzedAwakeTrap ? 0.08 : 0.78) : 0.2;
    } else {
      // GABAergic surgical plane: strong slow/delta (0.5-4 Hz) + frontal alpha (8-12 Hz)
      const deltaBand = Math.exp(-Math.pow((hz - 2.0) / 2.2, 2)) * Math.min(1.0, depth * 0.85);
      const alphaBand =
        Math.exp(-Math.pow((hz - 10.2) / 1.8, 2)) *
        elderlyFactor *
        (untreatedPain ? 0.18 : 0.92) *
        Math.max(0.15, 1.35 - Math.abs(depth - 1.05));
      const betaBand = hz > 16 ? (nmbParalyzedAwakeTrap ? 0.03 : 0.14 * Math.exp(-depth)) : 0;
      power = 0.06 + deltaBand + alphaBand + betaBand;
    }
    // Simulator illustration of a 2 Hz high-pass display filter hiding slow waves (UNVERIFIED claim)
    if (bis2HzFilterOn && hz <= 2) {
      power *= 0.14;
    }
    spectrum[hz - 1] = Math.min(1.0, power + Math.random() * 0.03);
  }

  // Synthesize instantaneous raw EEG trace (uV)
  let rawUv = 0;
  if (!inFlatPeriod) {
    const slowAmp = bis2HzFilterOn ? 6 : 42 * Math.min(1, depth);
    const alphaAmp = depth >= 0.35 ? 24 * elderlyFactor * (untreatedPain ? 0.2 : 1) : 4;
    const betaAmp = depth < 0.4 && !nmbParalyzedAwakeTrap ? 22 : 4;
    rawUv =
      Math.sin(timeSec * 2 * Math.PI * 1.4) * slowAmp +
      Math.sin(timeSec * 2 * Math.PI * 10.2) * alphaAmp +
      Math.sin(timeSec * 2 * Math.PI * 22.0) * betaAmp;
  }

  // Raw (unsmoothed) processed index. Feed it through BisDisplaySmoother for the displayed number.
  let bis = 93 * (1 - Math.pow(depth, 1.65) / (Math.pow(depth, 1.65) + 1));
  if (nmbParalyzedAwakeTrap && depth < 0.35) {
    // Schuller et al. 2015 (BJA, doi 10.1093/bja/aev072): in fully awake volunteers given NMB
    // alone, BIS fell to values as low as 44 and 47.
    bis = 47;
  }
  if (suppressionRatioPct > 20) {
    bis = Math.max(8, 32 - suppressionRatioPct * 0.25);
  }

  const trueBrainStateLabel =
    suppressionRatioPct > 15
      ? 'BURST SUPPRESSION (Delirium Risk — Reduce Dose)'
      : depth < 0.35
        ? nmbParalyzedAwakeTrap
          ? 'AWAKE & PARALYZED! (False-Low BIS Artifact from EMG Loss)'
          : 'AWAKE (Beta / EMG Dominant)'
        : untreatedPain
          ? 'ALPHA DROPOUT (Untreated Nociception — Check Analgesia)'
          : 'SURGICAL GABAERGIC PLANE (Dual Slow-Delta + Frontal Alpha)';

  return {
    spectrum30Hz: spectrum,
    rawSampleUv: rawUv,
    trueBrainStateLabel,
    displayedBisLag: Math.round(bis),
    suppressionRatioPct: Math.round(suppressionRatioPct),
  };
}


/**
 * Displayed-BIS smoothing: first-order lag on the raw index, like the monitor's smoothing window.
 * tauSec defaults to 15 s (simulator choice).
 */
export class BisDisplaySmoother {
  private value: number | null = null;
  public reset(): void {
    this.value = null;
  }
  public update(raw: number, dtSec: number, tauSec = 15): number {
    if (this.value === null) this.value = raw;
    const a = 1 - Math.exp(-Math.max(dtSec, 0) / Math.max(tauSec, 0.1));
    this.value += (raw - this.value) * a;
    return this.value;
  }
}
