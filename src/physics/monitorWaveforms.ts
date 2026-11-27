/**
 * Bedside-monitor waveforms (ECG lead II, invasive arterial pressure, plethysmogram, capnogram).
 * Pure TS, no DOM, so `npm run sanity` can check timing and amplitudes.
 *
 * ECG: closed-form solution of the ECGSYN dynamical model (McSharry PE, Clifford GD, Tarassenko L,
 * Smith LA. A dynamical model for generating synthetic electrocardiogram signals. IEEE Trans Biomed
 * Eng 2003;50(3):289-94). Each wave i is a Gaussian in the cardiac phase θ: z(θ) = Σ aᵢ bᵢ²
 * exp(−Δθᵢ²/2bᵢ²). Default θᵢ, aᵢ, bᵢ and the heart-rate scaling are those of the reference C
 * implementation on PhysioNet (ecgsyn.c, read 2026-11-27); our code is an independent
 * re-implementation of the published equation, not a copy.
 *
 * Arterial, pleth and capnogram shapes are a simulator model (illustrative): they reproduce the
 * textbook landmarks (systolic upstroke, dicrotic notch, diastolic run-off; capnogram phases I–III
 * and inspiratory down-stroke) scaled to the displayed numbers, not a fitted physiological model.
 */

export type MonitorRhythm = 'sinus' | 'sinusTachy' | 'VF' | 'PEA' | 'asystole' | 'ROSC';

const DEG = Math.PI / 180;
/** ECGSYN defaults (P, Q, R, S, T): angle (deg), amplitude, width (rad). */
export const ECGSYN = {
  theta: [-60, -15, 0, 15, 90],
  a: [1.2, -5.0, 30.0, -7.5, 0.75],
  b: [0.25, 0.1, 0.1, 0.1, 0.4],
} as const;

/** Raw ECGSYN value at phase θ (rad, R wave at 0) for a mean heart rate in /min. */
export function ecgsynRaw(theta: number, hr: number): number {
  const f = Math.sqrt(Math.max(hr, 20) / 60);
  const f2 = Math.sqrt(f);
  // ecgsyn.c: b scaled by f; P angle by f^0.5, Q and S by f, R and T unchanged.
  const thetaScale = [f2, f, 1, f, 1];
  let z = 0;
  for (let i = 0; i < 5; i++) {
    const bi = ECGSYN.b[i] * f;
    const ti = ECGSYN.theta[i] * DEG * thetaScale[i];
    let d = theta - ti;
    d = Math.atan2(Math.sin(d), Math.cos(d)); // wrap to (−π, π]
    z += ECGSYN.a[i] * bi * bi * Math.exp((-d * d) / (2 * bi * bi));
  }
  return z;
}

/** ECG in mV, scaled so the R peak at the given rate is ~1.0 mV. `phase` ∈ [0,1), R wave at 0.25. */
export function ecgMv(phase: number, hr: number): number {
  const theta = (phase - 0.25) * 2 * Math.PI;
  return ecgsynRaw(theta, hr) / ecgsynRaw(0, hr);
}

/** Normalised arterial pulse contour (0 = diastolic, 1 = systolic) at beat phase ∈ [0,1). */
export function arterialShape(phase: number): number {
  const p = ((phase % 1) + 1) % 1;
  const up = 0.12; // upstroke ends (fraction of the beat)
  if (p < up) return Math.sin((p / up) * (Math.PI / 2)) ** 2;
  const notch = 0.36;
  if (p < notch) {
    const x = (p - up) / (notch - up);
    return 1 - 0.55 * x - 0.05 * Math.sin(x * Math.PI);
  }
  // dicrotic wave, then exponential diastolic run-off
  const x = p - notch;
  const dicrotic = 0.08 * Math.exp(-((x - 0.05) ** 2) / 0.0012);
  return (0.45 - 0.02) * Math.exp(-x / 0.28) + dicrotic;
}

/** Plethysmogram: smoother, later and without a sharp notch. 0–1. */
export function plethShape(phase: number): number {
  const p = (((phase - 0.08) % 1) + 1) % 1;
  const rise = 0.18;
  if (p < rise) return Math.sin((p / rise) * (Math.PI / 2)) ** 2;
  const x = p - rise;
  return 0.62 * Math.exp(-x / 0.35) + 0.38 * Math.exp(-((x - 0.12) ** 2) / 0.02);
}

/**
 * Capnogram over one breath, phase ∈ [0,1): expiration first (phases I–III), then inspiration.
 * Returns mmHg. I:E ≈ 1:2.
 */
export function capnoMmHg(phase: number, etco2: number): number {
  const p = ((phase % 1) + 1) % 1;
  const exp = 0.66;
  if (etco2 <= 0) return 0;
  if (p < exp) {
    const x = p / exp;
    if (x < 0.06) return 0; // phase I: dead space
    if (x < 0.2) return etco2 * 0.88 * (1 - Math.exp(-((x - 0.06) / 0.035))); // phase II: upstroke
    return etco2 * (0.88 + 0.12 * ((x - 0.2) / 0.8)); // phase III: alveolar plateau, slight rise
  }
  const x = (p - exp) / (1 - exp);
  return x < 0.06 ? etco2 * (1 - x / 0.06) : 0; // inspiratory down-stroke (phase 0)
}

/** Coarse ventricular fibrillation: chaotic 4–7 Hz activity, mV. Deterministic in t. */
export function vfMv(tSec: number): number {
  const amp = 0.35 + 0.15 * Math.sin(tSec * 0.7) + 0.1 * Math.sin(tSec * 1.9 + 1);
  return amp * (Math.sin(2 * Math.PI * 4.6 * tSec) + 0.6 * Math.sin(2 * Math.PI * 6.3 * tSec + 0.8) + 0.4 * Math.sin(2 * Math.PI * 5.1 * tSec + 2.1)) / 1.6;
}

/** Baseline wander and a little noise so the trace looks acquired, not drawn. */
export function baselineMv(tSec: number): number {
  return 0.04 * Math.sin(2 * Math.PI * 0.21 * tSec) + 0.01 * Math.sin(2 * Math.PI * 23 * tSec);
}
