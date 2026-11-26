import {
  N2O_CLIMATE,
  VOLATILE_AGENTS,
  type GwpStandardId,
  type VolatileAgentId,
} from '../standards/clinicalStandards';

export interface VolatileParams {
  agent: VolatileAgentId;
  misfillVaporizerAs?: VolatileAgentId | null; // e.g., halothane liquid accidentally poured into isoflurane vaporizer
  weightKg: number; // 4 (pediatric) .. 140 (bariatric)
  fgfLpm: number; // 0.25 .. 10 L/min
  vaporizerDialPct: number; // 0 .. 8% (up to 18% for desflurane)
  n2oPct: number; // 0 .. 70% (drives Second Gas & Concentration Effects)
  cardiacOutputScale: number; // 0.5 .. 1.8x baseline
  ventilationScale: number; // 0.3 (hypoventilation/emergence) .. 1.8x
  rightToLeftShuntFrac: number; // 0 .. 0.45
  o2ConcentratorMode: boolean; // 95% O2 + ~5% inert argon
  gwpStandard: GwpStandardId;
}

export interface VolatileState {
  timeMin: number;
  fdPct: number;
  fiPct: number;
  faPct: number;
  fArterialPct: number;
  // Nine perfusion-limited compartments (simulator model) (expressed as equilibrated partial pressure % atm)
  compartments: {
    circuit: number;
    lungBlood: number;
    heart: number;
    brain: number;
    kidney: number;
    liver: number;
    muscle: number;
    fat: number;
    poorlyPerfused: number;
  };
  macBrain: number;
  circuitFiO2Pct: number;
  argonPct: number;
  liquidMlConsumed: number;
  co2eKgCumulative: number;
  co2eKgPerHour: number;
  secondGasBoostPct: number;
  /** false when the selected GWP source has no value for this agent (CO2e then counts N2O only) */
  agentGwpAvailable: boolean;
  warnings: string[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export class VolatileKineticsKernel {
  private timeMin = 0;
  private cCircuit = 0;
  private cAlv = 0;
  private cHeart = 0;
  private cBrain = 0;
  private cKidney = 0;
  private cLiver = 0;
  private cMuscle = 0;
  private cFat = 0;
  private cPoor = 0;
  private cO2: number | null = null; // initialised to the delivered O2 fraction on the first step
  private cArgon = 0.0;
  private liquidMl = 0;
  private co2eKg = 0;

  public reset(): void {
    this.timeMin = 0;
    this.cCircuit = 0;
    this.cAlv = 0;
    this.cHeart = 0;
    this.cBrain = 0;
    this.cKidney = 0;
    this.cLiver = 0;
    this.cMuscle = 0;
    this.cFat = 0;
    this.cPoor = 0;
    this.cO2 = null;
    this.cArgon = 0;
    this.liquidMl = 0;
    this.co2eKg = 0;
  }

  /**
   * Advances 9-compartment uptake & distribution by dtMin minutes.
   * Volumes scale linearly from 70 kg; ventilation & cardiac output scale via Brody W^(3/4).
   */
  public step(p: VolatileParams, dtMin: number): VolatileState {
    this.timeMin += dtMin;
    const spec = VOLATILE_AGENTS[p.agent];
    const warnings: string[] = [];

    const wScale = clamp(p.weightKg, 4, 150) / 70;
    const brodyScale = Math.pow(clamp(p.weightKg, 4, 150) / 70, 0.75);

    // Baseline physiological flows (L/min) scaled via Brody's W^(3/4)
    const vaLpm = 4.2 * brodyScale * clamp(p.ventilationScale, 0.25, 2.2);
    const qTotalLpm = 5.2 * brodyScale * 0.75 * clamp(p.cardiacOutputScale, 0.4, 2.0);
    const shunt = clamp(p.rightToLeftShuntFrac, 0, 0.45);
    const qPulmCap = qTotalLpm * (1 - shunt);

    // Compartment volumes (L, scaled linearly with body mass)
    const vCircuit = p.weightKg < 20 ? 0.9 : 1.5;
    const vFrc = 3.2 * wScale;
    const vHeart = 0.35 * wScale;
    const vBrain = 1.45 * wScale;
    const vKidney = 0.31 * wScale;
    const vLiver = 1.8 * wScale;
    const vMuscle = 28.0 * wScale;
    const vFat = 14.5 * wScale;
    const vPoor = 12.0 * wScale;

    // Organ blood flow fractions (summing to 1.0 of systemic CO)
    const qHeart = qTotalLpm * 0.05;
    const qBrain = qTotalLpm * 0.14;
    const qKidney = qTotalLpm * 0.22;
    const qLiver = qTotalLpm * 0.26;
    const qMuscle = qTotalLpm * 0.18;
    const qFat = qTotalLpm * 0.06;
    const qPoor = qTotalLpm * 0.09;

    // Vaporizer misfill (variable-bypass vaporizer, simulator model):
    // the dial sets a splitting ratio r for the calibrated agent Y: D = r·kY / (1 + r·kY), k = SVP / (Patm − SVP).
    // The same r with liquid X in the sump gives output r·kX / (1 + r·kX).
    let effectiveFd = p.vaporizerDialPct;
    if (p.misfillVaporizerAs && p.misfillVaporizerAs !== p.agent) {
      const targetVap = VOLATILE_AGENTS[p.misfillVaporizerAs];
      if (p.misfillVaporizerAs === 'desflurane') {
        warnings.push('VAPORIZER_MISFILL_HEATED_DESFLURANE_VAPORIZER_NOT_MODELLED');
      } else {
        const PATM = 760;
        const k = (svp: number) => svp / Math.max(PATM - svp, 1);
        const d = clamp(p.vaporizerDialPct / 100, 0, 0.99);
        const r = d / (k(targetVap.svpMmHgAt20C) * (1 - d));
        const out = (r * k(spec.svpMmHgAt20C)) / (1 + r * k(spec.svpMmHgAt20C));
        effectiveFd = clamp(out * 100, 0, 25);
        const intendedMac = p.vaporizerDialPct / targetVap.macPct;
        warnings.push(
          `VAPORIZER_MISFILL: ${spec.name} in ${targetVap.name} vaporizer delivers ~${effectiveFd.toFixed(1)}% = ${(effectiveFd / spec.macPct).toFixed(1)} MAC (dial implies ${intendedMac.toFixed(1)} MAC)`
        );
      }
    }

    // Second Gas & Concentration Effect: rapid early N2O alveolar uptake concentrates volatile agent
    const n2oFrac = clamp(p.n2oPct / 100, 0, 0.75);
    const n2oUptakeBoost = n2oFrac * Math.exp(-this.timeMin / 5.5) * 0.36;
    const secondGasBoostPct = n2oUptakeBoost * 100;

    const lambdaBG = spec.bloodGasPartition;
    const lambdaBrain = spec.brainBloodPartition;
    const lambdaMuscle = spec.muscleBloodPartition;
    const lambdaFat = spec.fatBloodPartition;

    // Arterial tension diluted by right-to-left venous shunt (impacts low-solubility agents most!)

    // Sub-step integration (10 substeps per call) for stiff low-volume circuit stability
    const subSteps = 10;
    const h = dtMin / subSteps;
    for (let s = 0; s < subSteps; s++) {
      // 1. Circle circuit mixing
      const dCirc = (p.fgfLpm * (effectiveFd - this.cCircuit) + vaLpm * (this.cAlv - this.cCircuit)) / vCircuit;
      this.cCircuit = clamp(this.cCircuit + dCirc * h, 0, 25);

      const mixedVenous = this.mixedVenous(qTotalLpm, qHeart, qBrain, qKidney, qLiver, qMuscle, qFat, qPoor);

      // 2. Alveolar lung/blood equilibration + Fick uptake + Second Gas inflow augmentation
      const effectiveVa = vaLpm * (1 + n2oUptakeBoost);
      const uptakeTerm = qPulmCap * lambdaBG * (this.cAlv - mixedVenous);
      const dAlv = (effectiveVa * (this.cCircuit - this.cAlv) - uptakeTerm) / (vFrc + 0.6 * wScale * lambdaBG);
      this.cAlv = clamp(this.cAlv + dAlv * h, 0, 25);

      const art = (1 - shunt) * this.cAlv + shunt * mixedVenous;

      // 3. Organ compartments (Fick mass balance: dC_i/dt = (Q_i / (V_i * lambda_tissue:blood)) * (C_art - C_i))
      this.cHeart += (qHeart / (vHeart * lambdaBrain)) * (art - this.cHeart) * h;
      this.cBrain += (qBrain / (vBrain * lambdaBrain)) * (art - this.cBrain) * h;
      this.cKidney += (qKidney / (vKidney * (lambdaBrain * 0.9))) * (art - this.cKidney) * h;
      this.cLiver += (qLiver / (vLiver * (lambdaBrain * 1.1))) * (art - this.cLiver) * h;
      this.cMuscle += (qMuscle / (vMuscle * lambdaMuscle)) * (art - this.cMuscle) * h;
      this.cFat += (qFat / (vFat * lambdaFat)) * (art - this.cFat) * h;
      this.cPoor += (qPoor / (vPoor * 1.2)) * (art - this.cPoor) * h;
    }

    const fArterial = (1 - shunt) * this.cAlv + shunt * this.mixedVenous(qTotalLpm, qHeart, qBrain, qKidney, qLiver, qMuscle, qFat, qPoor);

    // Oxygen & argon mass balance in circuit + FRC (simulator model, same form as Module 1):
    // V·dF/dt = inflow − uptake − F·(FGF − VO2)   (excess gas leaves at circuit concentration)
    const vo2Lpm = 0.25 * brodyScale;
    const vGas = vCircuit + vFrc;
    const o2SourceFrac = p.o2ConcentratorMode ? 0.95 : 1.0; // concentrator: ~95% O2 + ~4.5% argon
    const deliveredO2Frac = (1 - n2oFrac) * o2SourceFrac;
    const argonInFrac = p.o2ConcentratorMode ? (1 - n2oFrac) * 0.045 : 0;
    if (this.cO2 === null) {
      this.cO2 = deliveredO2Frac;
      this.cArgon = argonInFrac;
    }
    const outflow = Math.max(p.fgfLpm - vo2Lpm, 0.02);
    const oSub = 20;
    const ho = dtMin / oSub;
    for (let s = 0; s < oSub; s++) {
      const dO2 = (p.fgfLpm * deliveredO2Frac - vo2Lpm - this.cO2 * outflow) / vGas;
      this.cO2 = clamp(this.cO2 + dO2 * ho, 0.05, 1.0);
      const dAr = (p.fgfLpm * argonInFrac - this.cArgon * outflow) / vGas;
      this.cArgon = clamp(this.cArgon + dAr * ho, 0, 0.5);
    }
    const fiO2Pct = this.cO2 * 100;

    if (fiO2Pct < 25) warnings.push('HYPOXIC_LOW_FLOW_FIO2');
    if (this.cArgon > 0.08) warnings.push('CONCENTRATOR_ARGON_BUILDUP_FGF_UNDER_1L');
    if (p.agent === 'desflurane' && p.vaporizerDialPct > 0) {
      // EU 2024/573 Art. 13(8): use from 1 Jan 2026 only when strictly required on medical grounds
      warnings.push('EU_2024_573_DESFLURANE_RESTRICTED_FROM_JAN_2026');
    }
    if (p.ventilationScale < 0.55 && this.cMuscle > this.cBrain && this.cBrain > 0.25) {
      // Simulator observation: tissue stores return agent via mixed venous blood and slow washout
      warnings.push('SLOW_WASHOUT_TISSUE_RESERVOIR');
    }

    // Liquid volatile consumption & greenhouse accounting: E_CO2e = FGF * FD * rho_vapor * GWP100
    const vaporMlThisStep = p.fgfLpm * 1000 * (effectiveFd / 100) * dtMin;
    const liquidMlThisStep = vaporMlThisStep / spec.vaporMlPerLiquidMl;
    this.liquidMl += liquidMlThisStep;

    const volatileKgThisStep = (liquidMlThisStep * spec.liquidDensityGPerMl) / 1000;
    const agentGwp = spec.gwp100[p.gwpStandard];
    const volatileCo2e = agentGwp === null ? 0 : volatileKgThisStep * agentGwp;

    // N2O mass (approx 1.84 g/L at 20°C)
    const n2oKgThisStep = (p.fgfLpm * n2oFrac * dtMin * 1.84) / 1000;
    const n2oCo2e = n2oKgThisStep * N2O_CLIMATE.gwp100[p.gwpStandard];

    const stepCo2e = volatileCo2e + n2oCo2e;
    this.co2eKg += stepCo2e;
    const co2eKgPerHour = dtMin > 0 ? (stepCo2e / dtMin) * 60 : 0;

    return {
      timeMin: this.timeMin,
      fdPct: effectiveFd,
      fiPct: this.cCircuit,
      faPct: this.cAlv,
      fArterialPct: fArterial,
      compartments: {
        circuit: this.cCircuit,
        lungBlood: this.cAlv,
        heart: this.cHeart,
        brain: this.cBrain,
        kidney: this.cKidney,
        liver: this.cLiver,
        muscle: this.cMuscle,
        fat: this.cFat,
        poorlyPerfused: this.cPoor,
      },
      macBrain: this.cBrain / spec.macPct,
      circuitFiO2Pct: fiO2Pct,
      argonPct: this.cArgon * 100,
      liquidMlConsumed: this.liquidMl,
      co2eKgCumulative: this.co2eKg,
      co2eKgPerHour,
      secondGasBoostPct,
      agentGwpAvailable: agentGwp !== null,
      warnings,
    };
  }

  private mixedVenous(
    qTotal: number, qHeart: number, qBrain: number, qKidney: number,
    qLiver: number, qMuscle: number, qFat: number, qPoor: number
  ): number {
    return (
      (qHeart * this.cHeart + qBrain * this.cBrain + qKidney * this.cKidney + qLiver * this.cLiver +
        qMuscle * this.cMuscle + qFat * this.cFat + qPoor * this.cPoor) / qTotal
    );
  }
}

