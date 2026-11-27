/**
 * Left-heart circulation model (pure TS, no DOM). "Simulator model" — the STRUCTURE is published,
 * the parameter values are illustrative and tuned to give textbook adult numbers.
 *
 * - Ventricle: time-varying elastance (Suga & Sagawa). Systolic pressure follows an end-systolic
 *   elastance line P = Ees·(V − V0); diastolic pressure follows an exponential EDPVR.
 * - Atrium: low-elastance chamber with an atrial kick at end-diastole.
 * - Valves: orifice flow from the simplified Bernoulli relation ΔP = 4v² (v in m/s), so
 *   Q (mL/s) = 50 · EOA (cm²) · √ΔP (mmHg). Stenosis = small forward orifice; regurgitation =
 *   a backward orifice that stays open when the valve should be closed.
 * - Afterload: three-element Windkessel (characteristic impedance Zc, peripheral resistance R,
 *   compliance C) — Westerhof et al.
 * - Preload: venous return to the left atrium from a pressure source behind a resistance, so atrial
 *   pressure can rise when the left heart cannot empty (mitral stenosis, ventricular failure).
 */

/** Exponential end-diastolic pressure–volume relation P = a·(e^(b·(V − V0)) − 1). */
export const EDPVR = { a: 0.45, b: 0.024 } as const;

export type ValveLesion = 'normal' | 'as' | 'ar' | 'ms' | 'mr';

export interface CardioParams {
  lesion: ValveLesion;
  /** Venous return drive (preload / volume status); 1 = normal. */
  preloadScale: number;
  /** Peripheral resistance scale (afterload). */
  afterloadScale: number;
  /** End-systolic elastance scale (contractility). */
  contractilityScale: number;
  heartRateBpm: number;
}

export interface LoopPoint {
  v: number;
  p: number;
  pAo: number;
  pLa: number;
}

export interface CardioResult {
  loop: LoopPoint[];
  edv: number;
  esv: number;
  /** Total LV stroke volume (EDV − ESV), including any regurgitant part. */
  totalSv: number;
  /** Net forward flow into the aorta per beat. */
  forwardSv: number;
  ef: number;
  regurgitantFraction: number;
  lvPeakMmHg: number;
  lvedpMmHg: number;
  aoSysMmHg: number;
  aoDiaMmHg: number;
  mapMmHg: number;
  meanAorticGradientMmHg: number;
  meanMitralGradientMmHg: number;
  cardiacOutputLpm: number;
  /** End-systolic elastance actually used (mmHg/mL) — the slope of the ESPVR line. */
  ees: number;
  v0: number;
}

/** Illustrative effective orifice areas (cm²). Severe lesions chosen for a clear teaching contrast. */
const ORIFICES: Record<ValveLesion, { avFwd: number; avBack: number; mvFwd: number; mvBack: number }> = {
  normal: { avFwd: 3.5, avBack: 0, mvFwd: 4.0, mvBack: 0 },
  as: { avFwd: 0.7, avBack: 0, mvFwd: 4.0, mvBack: 0 },
  ar: { avFwd: 3.5, avBack: 0.35, mvFwd: 4.0, mvBack: 0 },
  ms: { avFwd: 3.5, avBack: 0, mvFwd: 0.9, mvBack: 0 },
  mr: { avFwd: 3.5, avBack: 0, mvFwd: 4.0, mvBack: 0.45 },
};

/** Orifice flow, regularised near ΔP = 0 so the integration stays stable. */
const orificeFlow = (eoaCm2: number, dp: number) => (eoaCm2 <= 0 ? 0 : (50 * eoaCm2 * dp) / Math.sqrt(Math.abs(dp) + 0.05));

/** Forward aortic flow with the Windkessel Zc in series: solves Q = k·√(Plv − Pc − Zc·Q) exactly. */
function aorticForwardFlow(eoaCm2: number, drive: number, zc: number): number {
  const k = 50 * eoaCm2;
  const k2 = k * k;
  return (-k2 * zc + Math.sqrt(k2 * k2 * zc * zc + 4 * k2 * drive)) / 2;
}

/** Normalised ventricular activation 0..1 (raised-cosine contraction then relaxation). */
function activation(tInBeat: number, period: number): number {
  const tPeak = 0.18 + 0.12 * period; // ≈ 0.28 s at 75 bpm
  const tRelax = 0.6 * tPeak;
  if (tInBeat < tPeak) return 0.5 * (1 - Math.cos((Math.PI * tInBeat) / tPeak));
  if (tInBeat < tPeak + tRelax) return 0.5 * (1 + Math.cos((Math.PI * (tInBeat - tPeak)) / tRelax));
  return 0;
}

/** Atrial activation: a short contraction ending just as the ventricle starts. */
function atrialActivation(tInBeat: number, period: number): number {
  const dur = Math.min(0.14, 0.2 * period);
  const start = period - dur;
  if (tInBeat < start) return 0;
  return Math.sin((Math.PI * (tInBeat - start)) / dur);
}

export function simulateHeart(params: CardioParams, beats = 10, dt = 0.0004): CardioResult {
  const period = 60 / params.heartRateBpm;
  const o = ORIFICES[params.lesion];

  const ees = 3.0 * params.contractilityScale; // mmHg/mL
  const v0 = 10; // mL
  const edA = EDPVR.a; // mmHg
  const edB = EDPVR.b; // 1/mL
  const laEmin = 0.15;
  const laEmax = 0.35;
  const laV0 = 4;
  const pDrive = 20 * params.preloadScale; // mmHg
  const rIn = 0.15; // mmHg·s/mL
  const zc = 0.035;
  const rSys = 0.95 * params.afterloadScale;
  const cArt = 1.4;

  let vLv = 110;
  let vLa = 40;
  let pC = 80; // Windkessel capacitor pressure

  const steps = Math.round(period / dt);
  const loop: LoopPoint[] = [];
  let sumAvGrad = 0;
  let nAv = 0;
  let sumMvGrad = 0;
  let nMv = 0;
  let fwdAo = 0;
  let backAo = 0;
  let backMv = 0;
  let aoMax = -Infinity;
  let aoMin = Infinity;
  let aoSum = 0;
  let lvMax = -Infinity;
  let vMax = -Infinity;
  let vMin = Infinity;
  let lvedp = 0;

  for (let b = 0; b < beats; b++) {
    const record = b === beats - 1;
    for (let i = 0; i < steps; i++) {
      const t = i * dt;
      const e = activation(t, period);
      const pEd = edA * (Math.exp(edB * (vLv - v0)) - 1);
      const pLv = e * ees * (vLv - v0) + (1 - e) * pEd;
      const pLa = (laEmin + (laEmax - laEmin) * atrialActivation(t, period)) * (vLa - laV0);

      // Mitral valve
      const dpMv = pLa - pLv;
      const qMv = dpMv >= 0 ? orificeFlow(o.mvFwd, dpMv) : orificeFlow(o.mvBack, dpMv);
      // Aortic valve: root pressure = capacitor + Zc·Q.
      const dpAv0 = pLv - pC;
      const qAv = dpAv0 >= 0 ? aorticForwardFlow(o.avFwd, dpAv0, zc) : orificeFlow(o.avBack, dpAv0);
      const pAoRoot = pC + zc * qAv;
      const qPv = Math.max(0, (pDrive - pLa) / rIn);

      vLv += (qMv - qAv) * dt;
      vLa += (qPv - qMv) * dt;
      pC += ((qAv - pC / rSys) / cArt) * dt;

      if (record) {
        if (i % 10 === 0) loop.push({ v: vLv, p: pLv, pAo: pAoRoot, pLa });
        if (qAv > 0) {
          fwdAo += qAv * dt;
          sumAvGrad += Math.max(0, pLv - pAoRoot);
          nAv++;
        } else backAo += -qAv * dt;
        if (qMv > 0) {
          sumMvGrad += Math.max(0, pLa - pLv);
          nMv++;
        } else backMv += -qMv * dt;
        aoMax = Math.max(aoMax, pAoRoot);
        aoMin = Math.min(aoMin, pAoRoot);
        aoSum += pAoRoot;
        lvMax = Math.max(lvMax, pLv);
        if (vLv > vMax) {
          vMax = vLv;
          lvedp = pLv;
        }
        vMin = Math.min(vMin, vLv);
      }
    }
  }

  const totalSv = vMax - vMin;
  const forwardSv = fwdAo - backAo;
  const regurgitant = backAo + backMv;
  return {
    loop,
    edv: vMax,
    esv: vMin,
    totalSv,
    forwardSv,
    ef: totalSv / vMax,
    regurgitantFraction: totalSv > 0 ? Math.min(1, regurgitant / totalSv) : 0,
    lvPeakMmHg: lvMax,
    lvedpMmHg: lvedp,
    aoSysMmHg: aoMax,
    aoDiaMmHg: aoMin,
    mapMmHg: aoSum / steps,
    meanAorticGradientMmHg: nAv ? sumAvGrad / nAv : 0,
    meanMitralGradientMmHg: nMv ? sumMvGrad / nMv : 0,
    cardiacOutputLpm: (forwardSv * params.heartRateBpm) / 1000,
    ees,
    v0,
  };
}
