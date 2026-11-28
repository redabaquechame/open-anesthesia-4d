/**
 * Circuit + lung physics kernel (Modules 1 & 2).
 *
 * Teaching model, not a validated physiological simulator. What it does:
 *  - Two parallel lung compartments (fast / slow) driven by the equation of motion
 *      Paw = PEEP + V/C + R·V'      (Hess, Respir Care 2014, doi:10.4187/respcare.03410)
 *    The slow compartment's resistance rises with bronchospasm heterogeneity, which
 *    produces the "shark-fin" capnogram and gas trapping (auto-PEEP) naturally.
 *  - Circle-system gas mass balance for O2, argon and volatile agent:
 *      Vsys·dF/dt = inflow − uptake − F·overflow
 *    so low fresh-gas flow pulls FiO2 below the fresh-gas O2 fraction and argon from
 *    concentrator O2 accumulates (Parker & Snowdon, Br J Anaesth 1988, doi:10.1093/bja/61.4.397).
 *  - Alveolar CO2 from the alveolar ventilation equation, PACO2 ≈ 0.863·VCO2/VA + PICO2,
 *    relaxed through a lumped CO2 store.
 *  - Fresh-gas coupling: bellows without fresh-gas decoupling add FGF·Ti to every breath
 *    (and the O2 flush during inspiration); the piston's decoupling valve blocks it
 *    (Jain & Swaminathan, Indian J Anaesth 2013, doi:10.4103/0019-5049.120150).
 *
 * Kernel v2 (Gate 1 / PR 5) — the circuit is a gas budget, not a set of scripted fractions:
 *  - Amounts (L) of O2, N2O, N2, Ar and agent in the breathing system; fractions are amount / total,
 *    so they always add up to 100 % (audit F01). Gas moved into the lungs leaves the circuit and comes
 *    back on expiration; uptake, leaks, the spill / APL valve and entrained room air change the total.
 *  - The reservoir (bellows, piston bag or manual bag) is the gas above the fixed circuit volume. With no
 *    fresh gas it empties (audit F18): an ascending bellows then cannot deliver the set volume; a piston
 *    draws room air through its negative-pressure relief valve (≈ −8 cmH2O, AGM "Ventilators" course page),
 *    so volume is kept but O2 and agent are diluted.
 *  - Leaks are pressure-dependent orifices shared by VCV and PCV (audit F08); they also drain the reservoir.
 *  - Unidirectional valves are diodes; an incompetent valve lets gas flow backwards, and the rebreathed
 *    CO2 is computed from that backflow volume (audit F16).
 *  - Vaporizer output: agent flow = carrier × d / (1 − d), so the vaporizer outlet concentration equals
 *    the dial setting d (definition of a concentration-calibrated vaporizer; Simulator model otherwise).
 *  - Manual / spontaneous mode: bag pressure from a bag pressure–volume curve, capped by the APL valve.
 *
 * Units: volume mL (lungs) / L (circuit gas), flow L/s (lungs) / L/min (fresh gas),
 * pressure cmH2O, compliance mL/cmH2O, resistance cmH2O/(L/s), CO2 mmHg.
 */

export const PHYSICS_DT = 0.02; // 50 Hz

export type VentilatorDriveType =
  | 'ascending_bellows'
  | 'descending_bellows'
  | 'piston_fgd'
  | 'turbine'
  | 'volume_reflector'
  | 'glostavent_drawover';

export type VentilationMode = 'VCV' | 'PCV' | 'MANUAL_APL_SPONT';
export type O2Source = 'pipeline' | 'concentrator';

export interface FaultFlags {
  stuckInspiratoryValve: boolean;
  stuckExpiratoryValve: boolean;
  exhaustedSodaLime: boolean;
  circuitDisconnect: boolean;
  bellowsLeak: boolean;
  samplingLineLeak: boolean;
  curareCleft: boolean;
  scavengingObstruction: boolean;
  wallO2Failure: boolean;
  o2FlushActive: boolean;
}

export interface MachineAndPatientParams {
  driveType: VentilatorDriveType;
  ventMode: VentilationMode;
  o2Source: O2Source;
  fgfO2Lpm: number;
  fgfAirLpm: number;
  fgfN2OLpm: number;
  vaporizerDialPct: number;
  vtMl: number;
  rrBpm: number;
  /** I:E = 1 : ieExpiratoryPart */
  ieExpiratoryPart: number;
  peepSetCmH2O: number;
  pcvPinspCmH2O: number;
  aplCmH2O: number;
  resistanceCmH2OPerLps: number;
  complianceMlPerCmH2O: number;
  /** 0 = homogeneous lungs, 1 = severe bronchospasm heterogeneity */
  bronchospasmHeterogeneity: number;
  metabolicVO2MlMin: number;
  metabolicVCO2MlMin: number;
  faults: FaultFlags;
}

export interface SimulationSnapshot {
  timeS: number;
  isInspiration: boolean;
  pawCmH2O: number;
  flowLps: number;
  /** Effective end-expiratory baseline pressure (set PEEP + circuit back-pressure) */
  peepBaseCmH2O: number;
  /** Mean alveolar pressure above the PEEP baseline (V/C term) */
  elasticPressureCmH2O: number;
  lungVolumeMl: number;
  deliveredVtMl: number;
  capnoMmHg: number;
  etco2MmHg: number;
  fico2MmHg: number;
  paco2MmHg: number;
  circuitFiO2Pct: number;
  circuitAgentPct: number;
  circuitArgonPct: number;
  /** 1 = bellows / piston fully filled (end-expiration), 0 = fully emptied */
  bellowsOrPistonPos: number;
  fgdValveClosed: boolean;
  vriGasFrontNorm: number;
  inspValveOpenNorm: number;
  expValveOpenNorm: number;
  sodaLimeExhaustionNorm: number;
  bagFillNorm: number;
  /** Inspired N2O and N2 (%). With O2, Ar, agent and CO2 they add up to 100 %. */
  circuitN2OPct: number;
  circuitN2Pct: number;
  /** Gas in the reservoir above the fixed circuit volume (L). */
  reservoirL: number;
  reservoirEmpty: boolean;
  /** Room air drawn in (negative-pressure relief valve, descending bellows or draw-over), L/min. */
  airEntrainedLpm: number;
  /** Per-edge flows for the visuals (L/min, averaged over the last step). */
  edges: {
    freshGasLpm: number;
    agentLpm: number;
    leakLpm: number;
    spillLpm: number;
    uptakeLpm: number;
  };
  /** Backflow through an incompetent valve during the last breath (mL). */
  expValveBackflowMl: number;
  inspValveBackflowMl: number;
  alarms: string[];
}

// ---- Model constants -------------------------------------------------------
const ANATOMIC_DEAD_SPACE_ML = 150; // StatPearls, PMID 29494107 (claim m1-dead-space)
/** Fixed gas volume of hoses, absorber and machine (L). Simulator model (claim m1-circuit-budget). */
const FIXED_CIRCUIT_L = 5.5;
/** Reservoir capacity (L): bellows / piston bag / manual bag. Simulator model. */
const RESERVOIR_MAX_L: Record<VentilatorDriveType, number> = {
  ascending_bellows: 1.6,
  descending_bellows: 1.6,
  piston_fgd: 2,
  turbine: 2,
  volume_reflector: 2,
  glostavent_drawover: 2,
};
const MANUAL_BAG_L = 2;
/** Orifice leak: Q = K·√P. K chosen so a "major leak" loses 6 L/min at 20 cmH2O (Simulator model). */
const LEAK_K_LPS_PER_SQRT_CMH2O = 0.1 / Math.sqrt(20);
/** Corrugated limb gas volume available for backflow (L). Simulator model. */
const LIMB_VOLUME_L = 0.5;
/** Share of flow that takes the reverse path through a fully incompetent valve. Simulator model. */
const INCOMPETENT_VALVE_SHARE = 0.5;
const AIR = { o2: 0.2095, n2: 0.7812, ar: 0.0093 };
const CO2_STORE_L = 20; // lumped body CO2 store: apnoea rise ≈ 8–9 mmHg/min
const CONCENTRATOR_O2_FRACTION = 0.95;
const CONCENTRATOR_ARGON_FRACTION = 0.045; // ~4.5–5% argon in zeolite concentrator O2
const AIR_ARGON_FRACTION = 0.0093;
const O2_FLUSH_LPM = 45; // SFAR ≥ 30 L/min; Dräger Atlan 25–75 L/min (claim m1-flush-flow)
const CONCENTRATOR_MAX_FLUSH_LPM = 10;
const VCV_PRESSURE_LIMIT = 40;
const SPONT_PMUS_PEAK = 7;
const LOW_FIO2_ALARM_PCT = 25; // Simulator model: teaching setting (real machines: user-set, from 18%)
const HIGH_FICO2_ALARM_MMHG = 3; // Simulator model: teaching setting (Dräger Julian fixed limit 5 mmHg)
const SUBSTEPS = 4;

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

/** Amounts (L at ambient conditions) of each species in the breathing system. */
interface GasState {
  o2: number;
  n2o: number;
  n2: number;
  ar: number;
  agent: number;
}
const total = (g: GasState) => g.o2 + g.n2o + g.n2 + g.ar + g.agent;

/** Manual bag pressure (cmH2O) for a gas volume (L): floppy until full, then stiffens. Simulator model. */
export function bagPressureCmH2O(volL: number, capL = MANUAL_BAG_L): number {
  if (volL <= capL) return 2 * Math.max(0, volL / capL);
  return Math.min(45, 2 + 25 * (volL - capL));
}

export class CircuitLungKernel {
  private time = 0;
  private cycleT = 0;
  private v1 = 0; // fast compartment volume above ZEEP-FRC (mL)
  private v2 = 0; // slow compartment
  private gas: GasState | null = null;
  private paco2 = 40;
  private sodaLime = 0;
  private capno = 0;
  private wasInsp = false;
  private breathInspVolMl = 0;
  private lastDeliveredVt = 0;
  private lastEtco2 = 0;
  private peakPaw = 0;
  private lastPeakPaw = 0;
  private lastEndExpPaw = 0;
  private bellowsTop = 1;
  private inspValve = 0;
  private expValve = 0;
  private initialized = false;
  private breathsCompleted = 0;
  private expBackflowMl = 0;
  private inspBackflowMl = 0;
  private lastExpBackflowMl = 0;
  private lastInspBackflowMl = 0;

  public reset(): void {
    this.time = 0;
    this.cycleT = 0;
    this.v1 = 0;
    this.v2 = 0;
    this.gas = null;
    this.paco2 = 40;
    this.sodaLime = 0;
    this.capno = 0;
    this.wasInsp = false;
    this.breathInspVolMl = 0;
    this.lastDeliveredVt = 0;
    this.lastEtco2 = 0;
    this.peakPaw = 0;
    this.lastPeakPaw = 0;
    this.lastEndExpPaw = 0;
    this.bellowsTop = 1;
    this.inspValve = 0;
    this.expValve = 0;
    this.initialized = false;
    this.breathsCompleted = 0;
    this.expBackflowMl = 0;
    this.inspBackflowMl = 0;
    this.lastExpBackflowMl = 0;
    this.lastInspBackflowMl = 0;
  }

  public step(p: MachineAndPatientParams, dt: number): SimulationSnapshot {
    const f = p.faults;
    const spont = p.ventMode === 'MANUAL_APL_SPONT';
    const drive = p.driveType;
    const isBellows = drive === 'ascending_bellows' || drive === 'descending_bellows';
    const compensatesLeak = drive === 'turbine' || drive === 'volume_reflector';
    const C = Math.max(5, p.complianceMlPerCmH2O);
    const R = Math.max(1, p.resistanceCmH2OPerLps);
    const het = clamp(p.bronchospasmHeterogeneity, 0, 1);

    // ---- Timing ------------------------------------------------------------
    const T = 60 / clamp(p.rrBpm, 4, 60);
    const Ti = T / (1 + Math.max(0.5, p.ieExpiratoryPart));
    const Te = T - Ti;
    this.time += dt;
    this.cycleT += dt;
    while (this.cycleT >= T) this.cycleT -= T;
    const isInsp = this.cycleT < Ti;
    const te = this.cycleT - Ti;

    if (isInsp && !this.wasInsp) {
      // Breath boundary: latch previous breath measurements
      if (this.initialized) {
        this.lastDeliveredVt = this.breathInspVolMl;
        this.lastEtco2 = this.capno;
        this.lastPeakPaw = this.peakPaw;
        this.lastExpBackflowMl = this.expBackflowMl;
        this.lastInspBackflowMl = this.inspBackflowMl;
        this.breathsCompleted++;
      }
      this.breathInspVolMl = 0;
      this.peakPaw = 0;
      this.expBackflowMl = 0;
      this.inspBackflowMl = 0;
    }

    // ---- Gas supply --------------------------------------------------------
    const concentrator = p.o2Source === 'concentrator';
    const o2Failed = f.wallO2Failure && !concentrator;
    const o2Flow = o2Failed ? 0 : Math.max(0, p.fgfO2Lpm);
    const n2oFlow = o2Failed ? 0 : Math.max(0, p.fgfN2OLpm); // fail-safe cuts N2O with O2 loss
    const airFlow = Math.max(0, p.fgfAirLpm);
    const flushFlow = f.o2FlushActive && !o2Failed ? (concentrator ? CONCENTRATOR_MAX_FLUSH_LPM : O2_FLUSH_LPM) : 0;
    const fgf = o2Flow + airFlow + n2oFlow;
    const totalIn = fgf + flushFlow;
    const o2Purity = concentrator ? CONCENTRATOR_O2_FRACTION : 1;

    // Pneumatic bellows lose their drive gas when the O2 pipeline fails (teaching point:
    // electrically driven pistons / turbines keep ventilating).
    const ventDriveLost = !spont && isBellows && o2Failed;
    const disconnected = f.circuitDisconnect;

    // ---- Pressures & flows -------------------------------------------------
    let peepEff = spont ? 0 : p.peepSetCmH2O;
    if (!spont && drive === 'ascending_bellows') peepEff = Math.max(peepEff, 2.5); // inherent bellows PEEP
    if (f.scavengingObstruction) peepEff += 8;
    if (disconnected) peepEff = 0;

    const leakK = f.bellowsLeak ? LEAK_K_LPS_PER_SQRT_CMH2O : 0;
    // Fresh-gas coupling (mL/s added during mechanical inspiration)
    const couplingLps = !spont && isBellows && !ventDriveLost ? totalIn / 60 : 0;
    const fgdClosed = drive === 'piston_fgd' && isInsp && !spont;

    // ---- Fresh-gas composition (L/min of each species) ----------------------
    const o2Gas = o2Flow + flushFlow; // flush bypasses the vaporizer
    const inO2 = o2Gas * o2Purity + airFlow * AIR.o2;
    const inAr = (concentrator ? o2Gas * CONCENTRATOR_ARGON_FRACTION : 0) + airFlow * AIR_ARGON_FRACTION;
    const inN2 = (concentrator ? o2Gas * (1 - CONCENTRATOR_O2_FRACTION - CONCENTRATOR_ARGON_FRACTION) : 0) + airFlow * AIR.n2;
    const inN2O = n2oFlow;
    const dial = clamp(p.vaporizerDialPct, 0, 18) / 100;
    // Concentration-calibrated vaporizer: the outlet carries the dial fraction, so agent = carrier·d/(1−d).
    const agentIn = (fgf * dial) / (1 - dial);
    const vo2 = disconnected ? 0 : p.metabolicVO2MlMin / 1000;
    const resMax = spont ? MANUAL_BAG_L : RESERVOIR_MAX_L[drive];

    if (!this.gas) {
      // Start full, at the steady state for the current flows, with no agent yet (wash-in).
      const overflow = totalIn - vo2;
      const fill = FIXED_CIRCUIT_L + resMax;
      const frac =
        overflow > 0.05
          ? { o2: Math.max(0, inO2 - vo2) / overflow, n2o: inN2O / overflow, n2: inN2 / overflow, ar: inAr / overflow }
          : { o2: AIR.o2, n2o: 0, n2: AIR.n2, ar: AIR.ar };
      const sum = frac.o2 + frac.n2o + frac.n2 + frac.ar;
      this.gas = { o2: (frac.o2 / sum) * fill, n2o: (frac.n2o / sum) * fill, n2: (frac.n2 / sum) * fill, ar: (frac.ar / sum) * fill, agent: 0 };
      const initPeep = spont ? 0 : peepEff;
      this.v1 = (initPeep * C) / 2;
      this.v2 = (initPeep * C) / 2;
      this.initialized = true;
    }

    // Gas available to the ventilator above the fixed circuit volume (L).
    const g0 = this.gas;
    // Draw-over is open to air by design; a piston has a negative-pressure relief valve; a descending
    // bellows refills by gravity, drawing room air in through an open circuit.
    const entrains = drive === 'piston_fgd' || drive === 'glostavent_drawover' || (drive === 'descending_bellows' && disconnected);
    const lungTidal0 = disconnected ? 0 : Math.max(0, (this.v1 + this.v2) / 1000 - (spont ? 0 : peepEff * C) / 1000);
    let reservoir = total(g0) - FIXED_CIRCUIT_L - lungTidal0;
    let movedToLungL = 0;
    let leakL = 0;

    const C1 = C / 2;
    const C2 = C / 2;
    const R1 = 2 * R;
    const R2 = 2 * R * (1 + 3 * het);

    let paw = 0;
    let qTotal = 0;
    const h = dt / SUBSTEPS;

    for (let s = 0; s < SUBSTEPS; s++) {
      const E1 = this.v1 / C1;
      const E2 = this.v2 / C2;
      let q1 = 0;
      let q2 = 0;

      const pressureSource = (pd: number) => {
        q1 = (pd - E1) / R1;
        q2 = (pd - E2) / R2;
        paw = pd;
      };

      if (spont) {
        // Spontaneous breathing through the bag + APL valve.
        const tInCycle = this.cycleT;
        const pmus = isInsp ? SPONT_PMUS_PEAK * Math.sin((Math.PI * tInCycle) / Ti) : 0;
        const turbineCpap = drive === 'turbine';
        // Bag + APL baseline is not true CPAP: pressure sags as the patient draws from the bag.
        const pb = disconnected ? 0 : turbineCpap ? p.aplCmH2O : p.aplCmH2O * 0.85;
        const k = disconnected ? 0 : turbineCpap ? 0.5 : 6;
        const sumG = 1 / R1 + 1 / R2;
        const q = ((pb + pmus - E1) / R1 + (pb + pmus - E2) / R2) / (1 + k * sumG);
        paw = pb - k * q;
        q1 = (paw + pmus - E1) / R1;
        q2 = (paw + pmus - E2) / R2;
      } else if (disconnected) {
        pressureSource(0);
        paw = 0.3; // machine still sees a little FGF back-pressure
      } else if (ventDriveLost) {
        pressureSource(peepEff * 0.2);
      } else if (isInsp && reservoir <= 0 && !entrains) {
        // Bellows bottomed out: nothing left to push (audit F18). Lungs hold their volume.
        const qEq = (E2 - E1) / (R1 + R2);
        q1 = qEq;
        q2 = -qEq;
        paw = E1 + R1 * q1;
      } else if (isInsp) {
        if (p.ventMode === 'VCV') {
          // Pressure-dependent leak at the circuit: part of the set flow never reaches the patient, unless
          // the ventilator measures and compensates it (turbine / volume reflector, Simulator model).
          const leakLpsGuess = leakK * Math.sqrt(Math.max(0, paw || peepEff));
          const qSet = p.vtMl / 1000 / Ti + couplingLps - (compensatesLeak ? 0 : leakLpsGuess);
          q1 = (E2 - E1 + R2 * Math.max(0, qSet)) / (R1 + R2);
          q2 = Math.max(0, qSet) - q1;
          paw = E1 + R1 * q1; // E1 is absolute alveolar pressure (already includes PEEP)
          if (paw > VCV_PRESSURE_LIMIT) pressureSource(VCV_PRESSURE_LIMIT);
        } else {
          // PCV: pressure-targeted, so fresh-gas coupling adds little volume
          pressureSource(peepEff + p.pcvPinspCmH2O);
        }
      } else {
        pressureSource(peepEff);
      }

      this.v1 = Math.max(0, this.v1 + q1 * 1000 * h);
      this.v2 = Math.max(0, this.v2 + q2 * 1000 * h);
      qTotal = q1 + q2;
      if (isInsp && qTotal > 0) this.breathInspVolMl += qTotal * 1000 * h;
      // Gas budget: what enters the lungs leaves the circuit; on a closed circuit it comes back on expiration.
      if (!disconnected) {
        movedToLungL += qTotal * h;
        reservoir -= qTotal * h;
      } else if (!spont && isInsp) {
        // Open Y-piece: the ventilator empties its stroke into the room.
        const stroke = Math.min(Math.max(0, reservoir), Math.max(0, p.vtMl / 1000 / Ti) * h);
        movedToLungL += stroke;
        reservoir -= stroke;
      }
      // Pressure-dependent leak, both phases, every mode (audit F08).
      const lk = disconnected ? 0 : leakK * Math.sqrt(Math.max(0, paw)) * h;
      leakL += lk;
      reservoir -= lk;
      // Valve backflow (diodes): incompetent expiratory valve → part of inspiration comes from the
      // expiratory limb; incompetent inspiratory valve → part of expiration goes up the inspiratory limb.
      if (!disconnected && f.stuckExpiratoryValve && isInsp && qTotal > 0) this.expBackflowMl += INCOMPETENT_VALVE_SHARE * qTotal * 1000 * h;
      if (!disconnected && f.stuckInspiratoryValve && !isInsp && qTotal < 0) this.inspBackflowMl += INCOMPETENT_VALVE_SHARE * -qTotal * 1000 * h;
    }

    this.peakPaw = Math.max(this.peakPaw, paw);
    if (!isInsp && te > Te - dt * 1.5) this.lastEndExpPaw = paw;

    const lungVol = this.v1 + this.v2;
    const palv = lungVol / C;

    // ---- Circuit gas budget --------------------------------------------------
    const g = this.gas;
    const dtMin = dt / 60;
    const tot0 = total(g);
    const fr = (x: number) => (tot0 > 0 ? x / tot0 : 0);
    // Agent and N2O uptake by the patient: same falling-rate shape (Simulator model, claim m1-circuit-budget).
    const kUp = disconnected ? 0 : 0.35 + 1.2 * Math.exp(-this.time / 240);
    const upO2 = Math.min(vo2 * dtMin, g.o2);
    const upAgent = Math.min(kUp * fr(g.agent) * dtMin, g.agent);
    const upN2O = Math.min(kUp * fr(g.n2o) * dtMin, g.n2o);
    // Tidal exchange already moved `movedToLungL` out (and back) inside the loop; on a closed circuit the
    // net over a breath is zero. Remove the leak at the mixed composition.
    const mixOut = (vol: number) => {
      const t = total(g);
      if (vol <= 0 || t <= 0) return;
      const k = Math.min(1, vol / t);
      g.o2 -= g.o2 * k; g.n2o -= g.n2o * k; g.n2 -= g.n2 * k; g.ar -= g.ar * k; g.agent -= g.agent * k;
    };
    // Fresh gas in, uptake out.
    g.o2 += inO2 * dtMin - upO2;
    g.n2o += inN2O * dtMin - upN2O;
    g.n2 += inN2 * dtMin;
    g.ar += inAr * dtMin;
    g.agent += agentIn * dtMin - upAgent;
    // Leak and (when disconnected) the gas pushed out of the open Y-piece.
    mixOut(leakL + (disconnected ? movedToLungL : 0));
    // The lungs hold `lungGasL` of circuit gas at this instant (tidal part, closed circuit).
    const lungTidalL = disconnected ? 0 : Math.max(0, (this.v1 + this.v2) / 1000 - (spont ? 0 : peepEff * C) / 1000);
    // Entrained room air fills a deficit (piston relief valve, descending bellows, draw-over).
    let entrainedL = 0;
    const floor = FIXED_CIRCUIT_L + lungTidalL;
    if (entrains && total(g) < floor) {
      entrainedL = floor - total(g);
      g.o2 += entrainedL * AIR.o2; g.n2 += entrainedL * AIR.n2; g.ar += entrainedL * AIR.ar;
    }
    // Spill / APL: excess above a full reservoir leaves at the mixed composition.
    let spillL = 0;
    const ceiling = FIXED_CIRCUIT_L + resMax + lungTidalL;
    if (spont && !disconnected) {
      // Manual bag: the APL valve opens when bag pressure exceeds its setting.
      const bagVol = total(g) - (FIXED_CIRCUIT_L + lungTidalL);
      if (bagPressureCmH2O(bagVol) > p.aplCmH2O) {
        let lo = 0, hi = Math.max(0, bagVol);
        for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (bagPressureCmH2O(m) > p.aplCmH2O) hi = m; else lo = m; }
        spillL = Math.max(0, bagVol - lo);
      }
    } else if (total(g) > ceiling) {
      spillL = total(g) - ceiling;
    }
    mixOut(spillL);
    g.o2 = Math.max(0, g.o2); g.n2o = Math.max(0, g.n2o); g.agent = Math.max(0, g.agent);
    const totNow = total(g);
    const reservoirL = Math.max(0, totNow - (FIXED_CIRCUIT_L + lungTidalL));
    const reservoirEmpty = !entrains && reservoirL < 0.02;
    const frac = {
      o2: totNow > 0 ? g.o2 / totNow : 0,
      n2o: totNow > 0 ? g.n2o / totNow : 0,
      n2: totNow > 0 ? g.n2 / totNow : 0,
      ar: totNow > 0 ? g.ar / totNow : 0,
      agent: totNow > 0 ? g.agent / totNow : 0,
    };

    // ---- Soda lime ---------------------------------------------------------
    this.sodaLime = f.exhaustedSodaLime
      ? Math.min(1, this.sodaLime + dt / 15)
      : Math.max(0, this.sodaLime - dt / 3);

    // ---- Inspired CO2 ------------------------------------------------------
    const ve = Math.max(0.5, (this.lastDeliveredVt * clamp(p.rrBpm, 4, 60)) / 1000);
    const vaNow = (Math.max(0, this.lastDeliveredVt - ANATOMIC_DEAD_SPACE_ML) * clamp(p.rrBpm, 4, 60)) / 1000;
    // Mixed expired PCO2 = PaCO2 · VA/VE (Bohr; anatomical dead space only).
    const peco2 = this.paco2 * clamp(vaNow / ve, 0, 1);
    const washout = clamp(1 - totalIn / ve, 0, 1); // FGF >= VE washes rebreathed CO2 out
    let fico2 = 0;
    if (!disconnected) {
      // Exhausted absorber: gas recirculates with its CO2 (efficiency 1 − exhaustion).
      fico2 += this.sodaLime * peco2 * washout;
      // Valve backflow volumes from the last breath (diode model), capped by the limb volume.
      const vtRef = Math.max(50, this.lastDeliveredVt || p.vtMl);
      const expBack = Math.min(LIMB_VOLUME_L * 1000, this.lastExpBackflowMl);
      const inspBack = Math.max(0, Math.min(LIMB_VOLUME_L * 1000, this.lastInspBackflowMl) - (totalIn / 60) * Te * 1000);
      fico2 += (expBack / vtRef) * peco2;
      fico2 += (inspBack / vtRef) * peco2;
      fico2 = Math.min(fico2, this.paco2 * 0.9);
    }

    // ---- Alveolar CO2 ------------------------------------------------------
    const effectiveVt = this.breathsCompleted > 0 ? this.lastDeliveredVt : p.vtMl;
    const va = (Math.max(0, effectiveVt - ANATOMIC_DEAD_SPACE_ML) * clamp(p.rrBpm, 4, 60)) / 1000;
    const co2Prod = 0.863 * p.metabolicVCO2MlMin; // mmHg·L/min
    this.paco2 = clamp(this.paco2 + ((co2Prod - va * (this.paco2 - fico2)) / CO2_STORE_L) * dtMin, 5, 150);

    // ---- Capnogram ---------------------------------------------------------
    const mechanical = !spont;
    if (isInsp) {
      const downTau = f.stuckInspiratoryValve ? 0.35 : 0.05;
      this.capno += (fico2 - this.capno) * (1 - Math.exp(-dt / downTau));
      if (f.samplingLineLeak && mechanical && !disconnected && this.cycleT < 0.18) {
        this.capno = Math.max(this.capno, this.paco2 * 0.9); // terminal "steeple" spike
      }
    } else {
      const exhaled = this.breathInspVolMl;
      const ventFactor = disconnected && mechanical ? 0 : clamp((exhaled - 60) / 200, 0, 1);
      const riseTau = 0.07 + 0.45 * het + Math.max(0, R - 10) * 0.004;
      const delay = 0.1;
      const plateau = this.paco2 * (0.95 + 0.05 * Math.min(1, te / Te));
      const shape = te < delay ? 0 : 1 - Math.exp(-(te - delay) / riseTau);
      let target = fico2 + (plateau - fico2) * shape * ventFactor;
      if (f.curareCleft) {
        const x = te / Te;
        if (x > 0.45 && x < 0.62) target -= (target - fico2) * 0.35 * Math.sin(((x - 0.45) / 0.17) * Math.PI);
      }
      if (f.samplingLineLeak) target = fico2 + (target - fico2) * 0.72;
      if (disconnected && mechanical) target = 0;
      this.capno += (target - this.capno) * (1 - Math.exp(-dt / 0.03));
    }

    // ---- Machine-side visuals ---------------------------------------------
    const machineFrac = isInsp ? this.cycleT / Ti : Math.max(0, 1 - te / (0.4 * Te));
    let bellowsPos = 1 - 0.65 * clamp(machineFrac, 0, 1);
    if (spont || ventDriveLost) bellowsPos = 1;
    if (drive === 'ascending_bellows' && !spont) {
      // Ascending bellows show the gas actually left in the reservoir: they fail to re-fill on a
      // disconnection or a large leak (the visible safety feature).
      this.bellowsTop += (clamp(reservoirL / resMax, 0, 1) - this.bellowsTop) * (1 - Math.exp(-dt / 0.3));
      bellowsPos = Math.min(bellowsPos, this.bellowsTop);
    } else {
      this.bellowsTop = 1;
    }
    // Descending bellows re-fill by gravity even when disconnected (room air): the silent trap.

    const inspTarget = f.stuckInspiratoryValve ? 1 : spont ? (qTotal > 0.01 ? 1 : 0) : isInsp && !disconnected ? 1 : 0;
    const expTarget = f.stuckExpiratoryValve ? 1 : spont ? (qTotal < -0.01 ? 1 : 0) : !isInsp && !disconnected ? 1 : 0;
    this.inspValve += (inspTarget - this.inspValve) * (1 - Math.exp(-dt / 0.06));
    this.expValve += (expTarget - this.expValve) * (1 - Math.exp(-dt / 0.06));

    const tidalAbovePeep = Math.max(0, lungVol - peepEff * C);
    void tidalAbovePeep;
    const bagFill = clamp(reservoirL / resMax, 0, 1);

    // ---- Alarms ------------------------------------------------------------
    const alarms: string[] = [];
    if (this.breathsCompleted >= 1) {
      if (!spont && this.lastPeakPaw < peepEff + 3) alarms.push('LOW_AIRWAY_PRESSURE');
      if (this.lastDeliveredVt < 100) alarms.push('APNEA_LOW_VT');
      if (this.lastPeakPaw > 35) alarms.push('HIGH_AIRWAY_PRESSURE');
      if (this.lastEtco2 > 50) alarms.push('HIGH_EtCO2');
      if (this.lastEtco2 < 20 && this.lastDeliveredVt >= 100) alarms.push('LOW_EtCO2');
    }
    if (fico2 > HIGH_FICO2_ALARM_MMHG) alarms.push('HIGH_FiCO2');
    if (frac.o2 * 100 < LOW_FIO2_ALARM_PCT) alarms.push('LOW_FiO2');
    if (reservoirEmpty) alarms.push('RESERVOIR_EMPTY');
    if (entrainedL > 0 && !disconnected) alarms.push('AIR_ENTRAINED');
    if (o2Failed) alarms.push('O2_SUPPLY_FAILURE');
    if (ventDriveLost) alarms.push('VENT_DRIVE_GAS_LOSS');
    if (f.scavengingObstruction && !disconnected && this.lastEndExpPaw > p.peepSetCmH2O + 4) {
      alarms.push('HIGH_PEEP_SCAVENGING_SUSPECT');
    }

    this.wasInsp = isInsp;

    return {
      timeS: this.time,
      isInspiration: isInsp,
      pawCmH2O: paw,
      flowLps: qTotal,
      peepBaseCmH2O: spont ? (disconnected ? 0 : p.aplCmH2O * 0.85) : peepEff,
      elasticPressureCmH2O: palv - (spont ? 0 : peepEff),
      lungVolumeMl: lungVol,
      deliveredVtMl: Math.round(this.lastDeliveredVt),
      capnoMmHg: Math.max(0, this.capno),
      etco2MmHg: Math.max(0, this.lastEtco2),
      fico2MmHg: fico2,
      paco2MmHg: this.paco2,
      // Inspired fractions of the CO2-free circuit gas, scaled so that with FiCO2 they add up to 100 %.
      circuitFiO2Pct: frac.o2 * (1 - fico2 / 760) * 100,
      circuitAgentPct: frac.agent * (1 - fico2 / 760) * 100,
      circuitArgonPct: frac.ar * (1 - fico2 / 760) * 100,
      bellowsOrPistonPos: bellowsPos,
      fgdValveClosed: fgdClosed,
      vriGasFrontNorm: drive === 'volume_reflector' ? 0.25 + 0.6 * (1 - bellowsPos) / 0.65 : 0.5,
      inspValveOpenNorm: this.inspValve,
      expValveOpenNorm: this.expValve,
      sodaLimeExhaustionNorm: this.sodaLime,
      bagFillNorm: bagFill,
      circuitN2OPct: frac.n2o * (1 - fico2 / 760) * 100,
      circuitN2Pct: frac.n2 * (1 - fico2 / 760) * 100,
      reservoirL,
      reservoirEmpty,
      airEntrainedLpm: entrainedL / dtMin,
      edges: {
        freshGasLpm: totalIn,
        agentLpm: agentIn,
        leakLpm: leakL / dtMin,
        spillLpm: spillL / dtMin,
        uptakeLpm: (upO2 + upAgent + upN2O) / dtMin,
      },
      expValveBackflowMl: Math.round(this.lastExpBackflowMl),
      inspValveBackflowMl: Math.round(this.lastInspBackflowMl),
      alarms,
    };
  }
}
