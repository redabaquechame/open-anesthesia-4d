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
  alarms: string[];
}

// ---- Model constants -------------------------------------------------------
const ANATOMIC_DEAD_SPACE_ML = 150;
const SYSTEM_GAS_VOLUME_L = 7; // circle + absorber + FRC mixing volume
const CO2_STORE_L = 20; // lumped body CO2 store: apnoea rise ≈ 8–9 mmHg/min
const CONCENTRATOR_O2_FRACTION = 0.95;
const CONCENTRATOR_ARGON_FRACTION = 0.045; // ~4.5–5% argon in zeolite concentrator O2
const AIR_ARGON_FRACTION = 0.0093;
const O2_FLUSH_LPM = 45;
const CONCENTRATOR_MAX_FLUSH_LPM = 10;
const VCV_PRESSURE_LIMIT = 40;
const SPONT_PMUS_PEAK = 7;
const LOW_FIO2_ALARM_PCT = 25;
const HIGH_FICO2_ALARM_MMHG = 3;
const SUBSTEPS = 4;

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

interface GasState {
  o2: number;
  argon: number;
  agent: number;
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
        this.breathsCompleted++;
      }
      this.breathInspVolMl = 0;
      this.peakPaw = 0;
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

    const leakFrac = f.bellowsLeak ? (compensatesLeak ? 0.03 : 0.35) : 0;
    // Fresh-gas coupling (mL/s added during mechanical inspiration)
    const couplingLps = !spont && isBellows && !ventDriveLost ? totalIn / 60 : 0;
    const fgdClosed = drive === 'piston_fgd' && isInsp && !spont;

    // ---- Fresh-gas composition (needed for first-step initialisation) ------
    const inO2 = o2Flow * o2Purity + airFlow * 0.21 + flushFlow * o2Purity;
    const inAr = (concentrator ? (o2Flow + flushFlow) * CONCENTRATOR_ARGON_FRACTION : 0) + airFlow * AIR_ARGON_FRACTION;
    const vo2 = disconnected ? 0 : p.metabolicVO2MlMin / 1000;
    const agentIn = fgf * (clamp(p.vaporizerDialPct, 0, 18) / 100); // flush bypasses the vaporizer

    if (!this.gas) {
      // Start at the circuit's steady state for the current flows, with no agent yet (wash-in)
      const denom = Math.max(0.05, totalIn - vo2);
      this.gas = {
        o2: totalIn > vo2 ? clamp((inO2 - vo2) / denom, 0.05, 1) : 0.21,
        argon: totalIn > vo2 ? clamp(inAr / denom, 0, 0.5) : AIR_ARGON_FRACTION,
        agent: 0,
      };
      const initPeep = spont ? 0 : peepEff;
      this.v1 = (initPeep * C) / 2;
      this.v2 = (initPeep * C) / 2;
      this.initialized = true;
    }

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
      } else if (isInsp) {
        if (p.ventMode === 'VCV') {
          const qSet = (p.vtMl / 1000 / Ti) * (1 - leakFrac) + couplingLps;
          q1 = (E2 - E1 + R2 * qSet) / (R1 + R2);
          q2 = qSet - q1;
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
    }

    this.peakPaw = Math.max(this.peakPaw, paw);
    if (!isInsp && te > Te - dt * 1.5) this.lastEndExpPaw = paw;

    const lungVol = this.v1 + this.v2;
    const palv = lungVol / C;

    // ---- Circuit gas mass balance -----------------------------------------
    const g = this.gas;
    const kUp = disconnected ? 0 : 0.35 + 1.2 * Math.exp(-this.time / 240); // agent uptake, L/min equivalent
    const overflow = Math.max(0, totalIn - vo2 - kUp * g.agent);
    const dtMin = dt / 60;
    g.o2 = clamp(g.o2 + ((inO2 - vo2 - g.o2 * overflow) / SYSTEM_GAS_VOLUME_L) * dtMin, 0.02, 1);
    g.argon = clamp(g.argon + ((inAr - g.argon * overflow) / SYSTEM_GAS_VOLUME_L) * dtMin, 0, 0.6);
    g.agent = clamp(g.agent + ((agentIn - kUp * g.agent - g.agent * overflow) / SYSTEM_GAS_VOLUME_L) * dtMin, 0, 0.2);

    // ---- Soda lime ---------------------------------------------------------
    this.sodaLime = f.exhaustedSodaLime
      ? Math.min(1, this.sodaLime + dt / 15)
      : Math.max(0, this.sodaLime - dt / 3);

    // ---- Inspired CO2 ------------------------------------------------------
    const ve = Math.max(0.5, (this.lastDeliveredVt * clamp(p.rrBpm, 4, 60)) / 1000);
    const washout = clamp(1 - totalIn / ve, 0, 1); // FGF >= VE washes rebreathed CO2 out
    let fico2 = 0;
    if (!disconnected) {
      fico2 += this.sodaLime * 0.5 * this.paco2 * washout;
      if (f.stuckInspiratoryValve) fico2 += 0.3 * this.paco2 * (0.4 + 0.6 * washout);
      if (f.stuckExpiratoryValve) fico2 += 0.35 * this.paco2; // FGF does not fix this one
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
      // Ascending bellows fail to re-fill on disconnect / large leak (the visible safety feature)
      const targetTop = disconnected ? 0.12 : f.bellowsLeak ? 0.7 : 1;
      this.bellowsTop += (targetTop - this.bellowsTop) * (1 - Math.exp(-dt / 1.5));
      bellowsPos = Math.min(bellowsPos, this.bellowsTop);
    } else {
      this.bellowsTop = 1;
    }
    // Descending bellows re-fill by gravity even when disconnected: the silent trap.

    const inspTarget = f.stuckInspiratoryValve ? 1 : spont ? (qTotal > 0.01 ? 1 : 0) : isInsp && !disconnected ? 1 : 0;
    const expTarget = f.stuckExpiratoryValve ? 1 : spont ? (qTotal < -0.01 ? 1 : 0) : !isInsp && !disconnected ? 1 : 0;
    this.inspValve += (inspTarget - this.inspValve) * (1 - Math.exp(-dt / 0.06));
    this.expValve += (expTarget - this.expValve) * (1 - Math.exp(-dt / 0.06));

    const tidalAbovePeep = Math.max(0, lungVol - peepEff * C);
    const bagFill = spont ? clamp(1 - tidalAbovePeep / 600, 0.15, 1) : totalIn < vo2 ? 0.3 : 0.6;

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
    if (g.o2 * 100 < LOW_FIO2_ALARM_PCT) alarms.push('LOW_FiO2');
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
      circuitFiO2Pct: g.o2 * 100,
      circuitAgentPct: g.agent * 100,
      circuitArgonPct: g.argon * 100,
      bellowsOrPistonPos: bellowsPos,
      fgdValveClosed: fgdClosed,
      vriGasFrontNorm: drive === 'volume_reflector' ? 0.25 + 0.6 * (1 - bellowsPos) / 0.65 : 0.5,
      inspValveOpenNorm: this.inspValve,
      expValveOpenNorm: this.expValve,
      sodaLimeExhaustionNorm: this.sodaLime,
      bagFillNorm: bagFill,
      alarms,
    };
  }
}
