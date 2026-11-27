/**
 * Headless sanity checks for the physics kernels. Run: npm run sanity
 * Each check prints PASS/FAIL. Exit code 1 if any check fails.
 *
 * Reference data used here (all opened and read):
 * - Eleveld 2018 BJA abstract (doi:10.1016/j.bja.2018.01.018): reference 35 y / 170 cm / 70 kg male
 *   without concomitant drugs: V1 6.28, V2 25.5, V3 273 L; CL 1.79, Q2 1.75, Q3 1.11 L/min; ke0 0.146 /min.
 * - Yasuda 1991 Anesth Analg abstract (doi:10.1213/00000539-199103000-00007): FA/FI at 30 min of constant
 *   inspired concentration: sevoflurane 0.850 ± 0.018, isoflurane 0.733 ± 0.027 (volunteers, FI sevo 1.0 %, iso 0.6 %).
 */
import { CircuitLungKernel, PHYSICS_DT, type MachineAndPatientParams } from '../../src/physics/circuitLungKernel';
import { VolatileKineticsKernel, type VolatileParams } from '../../src/physics/volatileKineticsKernel';
import { computePropofolPk, SYNTHETIC_AVATARS, ThreeCompartmentEngine } from '../../src/physics/aivocEegKernel';
import { simulateHeart } from '../../src/physics/cardiovascularKernel';
import { runSpineChecks } from './spine';
import { runAirwayChecks } from './airway';

let failures = 0;
function check(name: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${detail}`);
}
const within = (v: number, lo: number, hi: number) => v >= lo && v <= hi;

// ── M1/M2 circuit–lung kernel ───────────────────────────────────────────────
const base: MachineAndPatientParams = {
  driveType: 'ascending_bellows', ventMode: 'VCV', o2Source: 'pipeline', fgfO2Lpm: 1, fgfAirLpm: 1, fgfN2OLpm: 0,
  vaporizerDialPct: 2, vtMl: 480, rrBpm: 12, ieExpiratoryPart: 2, peepSetCmH2O: 5, pcvPinspCmH2O: 15, aplCmH2O: 10,
  resistanceCmH2OPerLps: 5, complianceMlPerCmH2O: 60, bronchospasmHeterogeneity: 0, metabolicVO2MlMin: 250, metabolicVCO2MlMin: 200,
  faults: {
    stuckInspiratoryValve: false, stuckExpiratoryValve: false, exhaustedSodaLime: false, circuitDisconnect: false,
    bellowsLeak: false, samplingLineLeak: false, curareCleft: false, scavengingObstruction: false, wallO2Failure: false, o2FlushActive: false,
  },
};
function runCircuit(mod: (p: MachineAndPatientParams) => MachineAndPatientParams, secs: number) {
  const k = new CircuitLungKernel();
  const p = mod(structuredClone(base));
  let s: ReturnType<CircuitLungKernel['step']> | undefined;
  for (let i = 0, n = Math.round(secs / PHYSICS_DT); i < n; i++) s = k.step(p, PHYSICS_DT);
  return s!;
}
const disc = (drive: MachineAndPatientParams['driveType']) => (p: MachineAndPatientParams) => ({
  ...p, driveType: drive, faults: { ...p.faults, circuitDisconnect: true },
});

const baseline = runCircuit((p) => p, 120);
check('M1 baseline EtCO2 35–45 mmHg', within(baseline.etco2MmHg, 35, 45), `EtCO2 ${baseline.etco2MmHg.toFixed(1)}`);
const ascDisc = runCircuit(disc('ascending_bellows'), 40);
check('M1 disconnect → delivered Vt 0', ascDisc.deliveredVtMl === 0, `Vt ${ascDisc.deliveredVtMl}`);
check('M1 disconnect → alarms raised', ascDisc.alarms.length > 0, `[${ascDisc.alarms.join(', ')}]`);
check('M1 ascending bellows collapse on disconnect', ascDisc.bellowsOrPistonPos < 0.2, `bellows ${ascDisc.bellowsOrPistonPos.toFixed(2)}`);
const descDisc = runCircuit(disc('descending_bellows'), 40);
check('M1 descending bellows keep moving on disconnect', descDisc.bellowsOrPistonPos > 0.3, `bellows ${descDisc.bellowsOrPistonPos.toFixed(2)}`);
const argon = runCircuit((p) => ({ ...p, driveType: 'glostavent_drawover', o2Source: 'concentrator', fgfO2Lpm: 0.5, fgfAirLpm: 0 }), 1800);
check('M1 argon accumulates at 0.5 L/min concentrator O2', argon.circuitArgonPct > 5, `Ar ${argon.circuitArgonPct.toFixed(1)} %`);

// ── M3 volatile kinetics vs Yasuda 1991 ─────────────────────────────────────
const vBase: VolatileParams = {
  agent: 'sevoflurane', misfillVaporizerAs: null, weightKg: 70, fgfLpm: 10, vaporizerDialPct: 1.0, n2oPct: 0,
  cardiacOutputScale: 1, ventilationScale: 1, rightToLeftShuntFrac: 0, o2ConcentratorMode: false, gwpStandard: 'IPCC_AR6',
};
function runVolatile(p: VolatileParams, min: number) {
  const k = new VolatileKineticsKernel();
  let s: ReturnType<VolatileKineticsKernel['step']> | undefined;
  for (let t = 0; t < min * 60; t++) s = k.step(p, 1 / 60);
  return s!;
}
// High fresh-gas flow approximates Yasuda's constant inspired concentration. Tolerance: ±0.06 (≈ 3 SD).
const sevo30 = runVolatile(vBase, 30);
const sevoRatio = sevo30.faPct / sevo30.fiPct;
check('M3 sevo FA/FI at 30 min ≈ 0.85 (Yasuda 1991)', within(sevoRatio, 0.79, 0.91), `FA/FI ${sevoRatio.toFixed(3)} (FI ${sevo30.fiPct.toFixed(2)} %)`);
const iso30 = runVolatile({ ...vBase, agent: 'isoflurane', vaporizerDialPct: 0.6 }, 30);
const isoRatio = iso30.faPct / iso30.fiPct;
check('M3 iso FA/FI at 30 min ≈ 0.73 (Yasuda 1991)', within(isoRatio, 0.67, 0.79), `FA/FI ${isoRatio.toFixed(3)} (FI ${iso30.fiPct.toFixed(2)} %)`);
check('M3 order: sevo FA/FI > iso FA/FI', sevoRatio > isoRatio, `${sevoRatio.toFixed(3)} > ${isoRatio.toFixed(3)}`);
const misfill = runVolatile({ ...vBase, agent: 'halothane', misfillVaporizerAs: 'isoflurane', fgfLpm: 2, vaporizerDialPct: 2 }, 5);
check('M3 halothane in iso vaporizer gives ~2 % output', within(misfill.fdPct, 1.8, 2.4), `FD ${misfill.fdPct.toFixed(2)} %`);

// ── M4 Eleveld reference individual + TCI ───────────────────────────────────
const ref = { ...SYNTHETIC_AVATARS[0], ageYears: 35, weightKg: 70, heightCm: 170, sex: 'M' as const, opioidCoAdmin: false };
const pk = computePropofolPk('eleveld', ref);
const cl = pk.k10 * pk.v1, q2 = pk.k12 * pk.v1, q3 = pk.k13 * pk.v1;
const near = (v: number, t: number) => Math.abs(v - t) / t < 0.01;
check('M4 Eleveld ref V1/V2/V3 = 6.28/25.5/273 L', near(pk.v1, 6.28) && near(pk.v2, 25.5) && near(pk.v3, 273), `${pk.v1.toFixed(2)}/${pk.v2.toFixed(1)}/${pk.v3.toFixed(0)}`);
check('M4 Eleveld ref CL/Q2/Q3 = 1.79/1.75/1.11 L/min', near(cl, 1.79) && near(q2, 1.75) && near(q3, 1.11), `${cl.toFixed(2)}/${q2.toFixed(2)}/${q3.toFixed(2)}`);
check('M4 Eleveld ref ke0 = 0.146 /min', near(pk.ke0, 0.146), `${pk.ke0.toFixed(3)}`);
for (const model of ['eleveld', 'schnider', 'marsh'] as const) {
  const m = computePropofolPk(model, SYNTHETIC_AVATARS[0]);
  const e = new ThreeCompartmentEngine();
  let st: ReturnType<ThreeCompartmentEngine['stepTci']> | undefined;
  for (let i = 0; i < 3000; i++) st = e.stepTci(m, 3, 0.004);
  check(`M4 ${model} TCI reaches Ce 3 µg/mL in 12 min`, within(st!.ce, 2.9, 3.1), `Ce ${st!.ce.toFixed(2)}`);
}

// ── M6 left-heart elastance model (simulator model: textbook adult targets) ──
const hp = { preloadScale: 1, afterloadScale: 1, contractilityScale: 1, heartRateBpm: 75 };
const hn = simulateHeart({ ...hp, lesion: 'normal' });
check('M6 normal EF 55–70 %', within(hn.ef, 0.55, 0.7), `EF ${(hn.ef * 100).toFixed(0)} %, EDV ${hn.edv.toFixed(0)} mL`);
check('M6 normal MAP 80–100 mmHg, CO 4–7 L/min', within(hn.mapMmHg, 80, 100) && within(hn.cardiacOutputLpm, 4, 7), `MAP ${hn.mapMmHg.toFixed(0)}, CO ${hn.cardiacOutputLpm.toFixed(1)}`);
check('M6 normal aortic mean gradient < 10 mmHg', hn.meanAorticGradientMmHg < 10, `${hn.meanAorticGradientMmHg.toFixed(1)} mmHg`);
const has = simulateHeart({ ...hp, lesion: 'as' });
check('M6 AS: mean gradient > 40, LV peak ≫ aortic systolic', has.meanAorticGradientMmHg > 40 && has.lvPeakMmHg - has.aoSysMmHg > 40, `grad ${has.meanAorticGradientMmHg.toFixed(0)}, LV ${has.lvPeakMmHg.toFixed(0)} vs Ao ${has.aoSysMmHg.toFixed(0)}`);
const har = simulateHeart({ ...hp, lesion: 'ar' });
check('M6 AR: wide pulse pressure, low diastolic', har.aoDiaMmHg < 45 && har.edv > hn.edv, `Ao ${har.aoSysMmHg.toFixed(0)}/${har.aoDiaMmHg.toFixed(0)}, EDV ${har.edv.toFixed(0)}`);
const hmr = simulateHeart({ ...hp, lesion: 'mr' });
check('M6 MR: EF rises while forward SV falls', hmr.ef > hn.ef && hmr.forwardSv < hn.forwardSv && hmr.regurgitantFraction > 0.3, `EF ${(hmr.ef * 100).toFixed(0)} %, RF ${(hmr.regurgitantFraction * 100).toFixed(0)} %`);
const hms = simulateHeart({ ...hp, lesion: 'ms' });
check('M6 MS: small EDV, transmitral gradient > 5', hms.edv < hn.edv && hms.meanMitralGradientMmHg > 5, `EDV ${hms.edv.toFixed(0)}, MV grad ${hms.meanMitralGradientMmHg.toFixed(1)}`);

// ── M7 neuraxial geometry on the real spine model ──────────────────────────
await runSpineChecks(check);
runAirwayChecks(check);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll sanity checks passed');
process.exit(failures ? 1 : 0);
