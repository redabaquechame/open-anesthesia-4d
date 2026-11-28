/**
 * Circuit kernel v2 (Gate 1 / PR 5): conservation, reservoir, leaks, valves, analytic checks, convergence.
 * Analytic references:
 *  - Wash-out of an inert gas from a well-mixed circuit with overflow: F(t) = F0·exp(−t/τ), τ = V / Qout.
 *  - Passive expiration of a single-compartment lung: V(t) = V0·exp(−t/(R·C)) (equation of motion with P = 0).
 */
import { CircuitLungKernel, PHYSICS_DT, bagPressureCmH2O, type MachineAndPatientParams, type SimulationSnapshot } from '../../src/physics/circuitLungKernel';

type Check = (name: string, ok: boolean, detail: string) => void;

const base: MachineAndPatientParams = {
  driveType: 'ascending_bellows', ventMode: 'VCV', o2Source: 'pipeline', fgfO2Lpm: 1, fgfAirLpm: 1, fgfN2OLpm: 0,
  vaporizerDialPct: 2, vtMl: 480, rrBpm: 12, ieExpiratoryPart: 2, peepSetCmH2O: 5, pcvPinspCmH2O: 15, aplCmH2O: 10,
  resistanceCmH2OPerLps: 5, complianceMlPerCmH2O: 60, bronchospasmHeterogeneity: 0, metabolicVO2MlMin: 250, metabolicVCO2MlMin: 200,
  faults: {
    stuckInspiratoryValve: false, stuckExpiratoryValve: false, exhaustedSodaLime: false, circuitDisconnect: false,
    bellowsLeak: false, samplingLineLeak: false, curareCleft: false, scavengingObstruction: false, wallO2Failure: false, o2FlushActive: false,
  },
};
const P = (over: Partial<MachineAndPatientParams>, faults: Partial<MachineAndPatientParams['faults']> = {}): MachineAndPatientParams => ({
  ...structuredClone(base), ...over, faults: { ...base.faults, ...faults },
});
function run(p: MachineAndPatientParams, secs: number, dt = PHYSICS_DT, k = new CircuitLungKernel()) {
  let s!: SimulationSnapshot;
  for (let i = 0, n = Math.round(secs / dt); i < n; i++) s = k.step(p, dt);
  return { s, k };
}
const sumPct = (s: SimulationSnapshot) => s.circuitFiO2Pct + s.circuitN2OPct + s.circuitN2Pct + s.circuitArgonPct + s.circuitAgentPct + (s.fico2MmHg / 760) * 100;

export function runCircuitV2Checks(check: Check) {
  // ── Conservation: inspired fractions add up to 100 % in every regime (audit F01)
  {
    const cases: [string, MachineAndPatientParams][] = [
      ['O2 6 L/min + sevo 8 %', P({ fgfO2Lpm: 6, fgfAirLpm: 0, vaporizerDialPct: 8 })],
      ['N2O 2 + O2 1 + 2 %', P({ fgfO2Lpm: 1, fgfAirLpm: 0, fgfN2OLpm: 2 })],
      ['concentrator 0.5 L/min', P({ o2Source: 'concentrator', fgfO2Lpm: 0.5, fgfAirLpm: 0 })],
      ['exhausted absorber', P({ fgfO2Lpm: 0.5, fgfAirLpm: 0 }, { exhaustedSodaLime: true })],
      ['piston, no fresh gas', P({ driveType: 'piston_fgd', fgfO2Lpm: 0, fgfAirLpm: 0 })],
    ];
    const worst = cases.map(([n, p]) => [n, sumPct(run(p, 900).s)] as const);
    const bad = worst.filter(([, v]) => Math.abs(v - 100) > 0.01);
    check('M1 v2: inspired fractions add up to 100 % (5 regimes)', bad.length === 0, worst.map(([n, v]) => `${n} ${v.toFixed(3)}`).join('; '));
  }

  // ── Vaporizer: the outlet concentration equals the dial (carrier × d/(1−d))
  {
    const s = run(P({ fgfO2Lpm: 10, fgfAirLpm: 0, vaporizerDialPct: 2 }), 1).s;
    const outletPct = (s.edges.agentLpm / (s.edges.freshGasLpm + s.edges.agentLpm)) * 100;
    check('M1 v2: vaporizer outlet = dial (2 %)', Math.abs(outletPct - 2) < 1e-9, `${outletPct.toFixed(6)} %`);
  }

  // ── Reservoir without fresh gas (audit F18): bellows bottom out; piston draws room air
  {
    // Watch the last minute: the reservoir empties during inspiration and partly refills on expiration.
    const watch = (p: MachineAndPatientParams) => {
      const k = new CircuitLungKernel();
      let s = run(p, 1740, PHYSICS_DT, k).s;
      let empty = false, alarmEmpty = false, airMax = 0;
      for (let i = 0; i < 60 / PHYSICS_DT; i++) {
        s = k.step(p, PHYSICS_DT);
        empty ||= s.reservoirEmpty; alarmEmpty ||= s.alarms.includes('RESERVOIR_EMPTY'); airMax = Math.max(airMax, s.airEntrainedLpm);
      }
      return { s, empty, alarmEmpty, airMax };
    };
    const asc = watch(P({ fgfO2Lpm: 0, fgfAirLpm: 0, vaporizerDialPct: 0 }));
    check('M1 v2: ascending bellows, no fresh gas → reservoir empties, Vt falls', asc.empty && asc.alarmEmpty && asc.s.deliveredVtMl < 0.5 * base.vtMl, `Vt ${asc.s.deliveredVtMl} mL, emptied ${asc.empty}, alarm ${asc.alarmEmpty}`);
    // Piston: the negative-pressure relief valve lets room air in; volume is kept, but only the uptake
    // deficit is made up with air, so O2 is consumed and the mixture becomes hypoxic (claim m1-piston-nprv).
    const pisK = new CircuitLungKernel();
    const pisP = P({ driveType: 'piston_fgd', fgfO2Lpm: 0, fgfAirLpm: 0, vaporizerDialPct: 0 });
    let airSeen = 0;
    let pis!: SimulationSnapshot;
    for (let i = 0; i < 600 / PHYSICS_DT; i++) { pis = pisK.step(pisP, PHYSICS_DT); airSeen = Math.max(airSeen, pis.airEntrainedLpm); }
    check('M1 v2: piston, no fresh gas → room air drawn in, Vt kept, FiO2 falls', airSeen > 0 && pis.deliveredVtMl > 0.8 * base.vtMl && pis.circuitFiO2Pct < 21 && pis.alarms.includes('LOW_FiO2') && !pis.reservoirEmpty, `Vt ${pis.deliveredVtMl} mL, FiO2 ${pis.circuitFiO2Pct.toFixed(1)} % at 10 min, air up to ${airSeen.toFixed(2)} L/min`);
  }

  // ── Leak (audit F08): pressure-dependent, drains the reservoir in PCV too
  {
    const pcv = run(P({ ventMode: 'PCV' }), 240).s;
    const pcvLeak = run(P({ ventMode: 'PCV' }, { bellowsLeak: true }), 240).s;
    check('M1 v2: PCV with a leak loses tidal volume once the reservoir drains', pcvLeak.deliveredVtMl < 0.9 * pcv.deliveredVtMl && pcvLeak.edges.leakLpm > 0, `Vt ${pcv.deliveredVtMl} → ${pcvLeak.deliveredVtMl} mL, leak ${pcvLeak.edges.leakLpm.toFixed(1)} L/min`);
    const hi = run(P({ ventMode: 'PCV', fgfO2Lpm: 5, fgfAirLpm: 5 }, { bellowsLeak: true }), 240).s;
    check('M1 v2: same leak with 10 L/min fresh gas: reservoir holds, PCV volume kept', hi.deliveredVtMl > 0.95 * pcv.deliveredVtMl, `Vt ${hi.deliveredVtMl} mL`);
    const vcvLeak = run(P({}, { bellowsLeak: true }), 30).s;
    check('M1 v2: VCV leak during inspiration lowers delivered Vt', vcvLeak.deliveredVtMl < base.vtMl - 10, `Vt ${vcvLeak.deliveredVtMl} mL`);
  }

  // ── Incompetent valves (audit F16): CO2 comes from the computed backflow
  {
    const ok = run(P({}), 120).s;
    const exp = run(P({}, { stuckExpiratoryValve: true }), 120).s;
    const insp = run(P({}, { stuckInspiratoryValve: true }), 120).s;
    check('M1 v2: competent valves → no backflow, FiCO2 0', ok.expValveBackflowMl === 0 && ok.inspValveBackflowMl === 0 && ok.fico2MmHg < 0.5, `FiCO2 ${ok.fico2MmHg.toFixed(2)}`);
    check('M1 v2: incompetent expiratory valve → backflow and rebreathing', exp.expValveBackflowMl > 100 && exp.fico2MmHg > 3, `backflow ${exp.expValveBackflowMl} mL, FiCO2 ${exp.fico2MmHg.toFixed(1)} mmHg`);
    check('M1 v2: incompetent inspiratory valve → backflow, partly flushed by fresh gas', insp.inspValveBackflowMl > 100 && insp.fico2MmHg > 1, `backflow ${insp.inspValveBackflowMl} mL, FiCO2 ${insp.fico2MmHg.toFixed(1)} mmHg`);
    const inspHi = run(P({ fgfO2Lpm: 5, fgfAirLpm: 5 }, { stuckInspiratoryValve: true }), 120).s;
    check('M1 v2: high fresh gas flushes inspiratory-limb backflow', inspHi.fico2MmHg < insp.fico2MmHg, `${insp.fico2MmHg.toFixed(1)} → ${inspHi.fico2MmHg.toFixed(1)} mmHg`);
  }

  // ── Analytic: N2 wash-out after switching air → O2, τ = V / Qout
  {
    const k = new CircuitLungKernel();
    run(P({ fgfO2Lpm: 0, fgfAirLpm: 6, vaporizerDialPct: 0 }), 600, PHYSICS_DT, k);
    const pO2 = P({ fgfO2Lpm: 6, fgfAirLpm: 0, vaporizerDialPct: 0 });
    const s0 = run(pO2, PHYSICS_DT, PHYSICS_DT, k).s;
    // Outflow from the mixed circuit = FGF − VO2; V = fixed circuit + full reservoir + tidal gas (~ constant).
    const V = s0.reservoirL + 5.5;
    const tau = (V / (6 - 0.25)) * 60;
    const s1 = run(pO2, tau, PHYSICS_DT, k).s;
    const ratio = s1.circuitN2Pct / s0.circuitN2Pct;
    check('M1 v2: N2 wash-out at t = τ = V/Qout is e⁻¹ (± 6 %)', Math.abs(ratio - Math.exp(-1)) / Math.exp(-1) < 0.06, `ratio ${ratio.toFixed(3)} vs ${Math.exp(-1).toFixed(3)} (τ ${tau.toFixed(0)} s)`);
  }

  // ── Analytic: passive expiration, flow falls to e⁻¹ after R·C
  {
    const R = 10, C = 50;
    const p = P({ resistanceCmH2OPerLps: R, complianceMlPerCmH2O: C, rrBpm: 6, ieExpiratoryPart: 3, peepSetCmH2O: 0, driveType: 'piston_fgd' });
    const k = new CircuitLungKernel();
    const dt = 0.002;
    const T = 10, Ti = T / 4;
    let s = run(p, 3 * T, dt, k).s;
    while (s.isInspiration || s.timeS % T < Ti + dt) s = k.step(p, dt); // to the start of expiration
    const q0 = s.flowLps;
    const tau = (R * C) / 1000;
    s = run(p, tau, dt, k).s;
    const ratio = s.flowLps / q0;
    check('M1 v2: expiratory flow at t = R·C is e⁻¹ of its start (± 5 %)', Math.abs(ratio - Math.exp(-1)) / Math.exp(-1) < 0.05, `ratio ${ratio.toFixed(3)} (R·C ${tau.toFixed(2)} s)`);
  }

  // ── Convergence: halving the step changes the answer by < 1 %
  {
    const conv = P({ fgfO2Lpm: 3, fgfAirLpm: 3 }, { bellowsLeak: true, stuckExpiratoryValve: true });
    const a = run(conv, 180, 0.02).s;
    const b = run(conv, 180, 0.005).s;
    const dv = Math.abs(a.deliveredVtMl - b.deliveredVtMl) / b.deliveredVtMl;
    const de = Math.abs(a.etco2MmHg - b.etco2MmHg) / b.etco2MmHg;
    const dr = Math.abs(a.reservoirL - b.reservoirL);
    check('M1 v2: dt 20 ms vs 5 ms → Vt and EtCO2 within 1 % (leak + valve fault)', dv < 0.01 && de < 0.01 && b.deliveredVtMl > 100, `Vt ${a.deliveredVtMl}/${b.deliveredVtMl}, EtCO2 ${a.etco2MmHg.toFixed(2)}/${b.etco2MmHg.toFixed(2)}, reservoir Δ ${dr.toFixed(3)} L`);
  }

  // ── Manual bag + APL: the bag never exceeds the APL setting
  {
    const s = run(P({ ventMode: 'MANUAL_APL_SPONT', aplCmH2O: 20, fgfO2Lpm: 8, fgfAirLpm: 0 }), 120).s;
    check('M1 v2: manual bag pressure capped by the APL valve', bagPressureCmH2O(s.reservoirL) <= 20 + 0.5 && s.edges.spillLpm > 0, `bag ${bagPressureCmH2O(s.reservoirL).toFixed(1)} cmH2O, spill ${s.edges.spillLpm.toFixed(1)} L/min`);
  }

  // ── Property sweep: no NaN, no negative amounts, fractions in [0, 100] over random settings
  {
    let seed = 42;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const drives: MachineAndPatientParams['driveType'][] = ['ascending_bellows', 'descending_bellows', 'piston_fgd', 'turbine', 'volume_reflector', 'glostavent_drawover'];
    const modes: MachineAndPatientParams['ventMode'][] = ['VCV', 'PCV', 'MANUAL_APL_SPONT'];
    let bad = 0;
    let worst = '';
    for (let i = 0; i < 60; i++) {
      const p = P(
        {
          driveType: drives[Math.floor(rnd() * drives.length)], ventMode: modes[Math.floor(rnd() * modes.length)],
          o2Source: rnd() < 0.3 ? 'concentrator' : 'pipeline', fgfO2Lpm: rnd() * 8, fgfAirLpm: rnd() * 4, fgfN2OLpm: rnd() < 0.3 ? rnd() * 4 : 0,
          vaporizerDialPct: rnd() * 8, vtMl: 200 + rnd() * 600, rrBpm: 6 + rnd() * 24, peepSetCmH2O: rnd() * 12, pcvPinspCmH2O: 5 + rnd() * 20,
          aplCmH2O: rnd() * 40, resistanceCmH2OPerLps: 2 + rnd() * 30, complianceMlPerCmH2O: 15 + rnd() * 80, bronchospasmHeterogeneity: rnd(),
        },
        { bellowsLeak: rnd() < 0.3, stuckExpiratoryValve: rnd() < 0.2, stuckInspiratoryValve: rnd() < 0.2, exhaustedSodaLime: rnd() < 0.2, circuitDisconnect: rnd() < 0.15, wallO2Failure: rnd() < 0.1 }
      );
      const s = run(p, 90).s;
      const vals = [s.pawCmH2O, s.flowLps, s.deliveredVtMl, s.etco2MmHg, s.circuitFiO2Pct, s.circuitAgentPct, s.circuitN2OPct, s.circuitN2Pct, s.circuitArgonPct, s.reservoirL];
      const fracOk = [s.circuitFiO2Pct, s.circuitAgentPct, s.circuitN2OPct, s.circuitN2Pct, s.circuitArgonPct].every((x) => x >= -1e-9 && x <= 100 + 1e-9);
      if (vals.some((x) => !Number.isFinite(x)) || !fracOk || s.reservoirL < 0 || Math.abs(sumPct(s) - 100) > 0.01) {
        bad++;
        worst = `${p.driveType}/${p.ventMode} sum ${sumPct(s).toFixed(2)}`;
      }
    }
    check('M1 v2: 60 random settings → finite, non-negative, 100 %', bad === 0, bad ? `${bad} bad, e.g. ${worst}` : '60/60 valid');
  }
}
