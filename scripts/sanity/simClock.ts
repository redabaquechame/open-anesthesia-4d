/**
 * Shared simulation clock (audit F14, F23): the physics must give the same answer whatever the screen
 * frame rate, a hidden tab must not advance time, and a stall must not produce a burst of hidden time.
 */
import { SimClock } from '../../src/sim/simClock';
import { VolatileKineticsKernel, type VolatileParams } from '../../src/physics/volatileKineticsKernel';
import { computePropofolPk, SYNTHETIC_AVATARS, ThreeCompartmentEngine } from '../../src/physics/aivocEegKernel';
import { NMJ_STEP_SEC, freshNmj, stepNmj } from '../../src/modules/m5-nmj-tof/nmjDynamics';

type Check = (name: string, ok: boolean, detail: string) => void;

/** Deterministic pseudo-random frame times (jittery phone): 8–70 ms. */
function jitterFrames(totalSec: number, seed = 7): number[] {
  let x = seed;
  const out: number[] = [];
  let t = 0;
  while (t < totalSec) {
    x = (x * 1103515245 + 12345) % 2147483648;
    const dt = 0.008 + (x / 2147483648) * 0.062;
    out.push(dt);
    t += dt;
  }
  return out;
}
const fixedFrames = (totalSec: number, hz: number) => Array.from({ length: Math.round(totalSec * hz) }, () => 1 / hz);

/** Run `step` on a clock fed with the given wall frames; returns the clock. */
function drive(frames: number[], stepSec: number, speed: number, step: (dt: number) => void) {
  const c = new SimClock({ stepSec, speed });
  for (const f of frames) {
    const n = c.tick(f);
    for (let k = 0; k < n; k++) step(c.stepSec);
  }
  return c;
}

export function runSimClockChecks(check: Check) {
  // ── Clock arithmetic
  {
    const c = new SimClock({ stepSec: 0.25, speed: 15 });
    for (const f of fixedFrames(10, 60)) c.tick(f);
    check('SimClock: ×15 for 10 s wall = 150 s simulated (± 1 step)', Math.abs(c.simTimeSec - 150) <= 0.25, `${c.simTimeSec.toFixed(2)} s`);
    const h = new SimClock({ stepSec: 0.1 });
    h.hidden = true;
    for (const f of fixedFrames(5, 60)) h.tick(f);
    h.hidden = false;
    const p = new SimClock({ stepSec: 0.1 });
    p.paused = true;
    for (const f of fixedFrames(5, 60)) p.tick(f);
    check('SimClock: hidden tab or pause → no simulated time', h.simTimeSec === 0 && p.simTimeSec === 0, `hidden ${h.simTimeSec}, paused ${p.simTimeSec}`);
    const s = new SimClock({ stepSec: 0.1, speed: 10 });
    const n = s.tick(120); // two minutes in a background tab, then one frame
    check('SimClock: a 120 s stall is not caught up (≤ 0.25 s wall accepted)', n <= 25 && s.droppedWallSec >= 119.7, `${n} steps, ${s.droppedWallSec.toFixed(2)} s dropped`);
  }

  // ── M3: same uptake curve at 144 Hz, 30 Hz and a jittery phone
  {
    const p: VolatileParams = {
      agent: 'sevoflurane', misfillVaporizerAs: null, weightKg: 70, fgfLpm: 1, vaporizerDialPct: 2.4, n2oPct: 0,
      cardiacOutputScale: 1, ventilationScale: 1, rightToLeftShuntFrac: 0, o2ConcentratorMode: false, gwpStandard: 'IPCC_AR6',
    };
    const run = (frames: number[]) => {
      const k = new VolatileKineticsKernel();
      let fa = 0;
      drive(frames, 0.5, 12, (dt) => { fa = k.step(p, dt / 60).faPct; });
      return fa;
    };
    const a = run(fixedFrames(20, 144));
    const b = run(fixedFrames(20, 30));
    const c = run(jitterFrames(20));
    const spread = Math.max(a, b, c) - Math.min(a, b, c);
    check('M3 on SimClock: FA after 4 simulated min identical at 144 Hz / 30 Hz / jitter', spread < 0.02, `FA ${a.toFixed(4)} / ${b.toFixed(4)} / ${c.toFixed(4)} %`);
  }

  // ── M4: propofol Ce identical across frame rates (the hidden ×15 is now an explicit, visible speed)
  {
    const pk = computePropofolPk('eleveld', SYNTHETIC_AVATARS[0]);
    const run = (frames: number[]) => {
      const e = new ThreeCompartmentEngine();
      let ce = 0;
      drive(frames, 0.25, 15, (dt) => { ce = e.stepTci(pk, 3, dt / 60).ce; });
      return ce;
    };
    const a = run(fixedFrames(20, 144));
    const b = run(fixedFrames(20, 30));
    const c = run(jitterFrames(20, 11));
    const spread = Math.max(a, b, c) - Math.min(a, b, c);
    check('M4 on SimClock: Ce after 5 simulated min identical at 144 Hz / 30 Hz / jitter', spread < 0.02, `Ce ${a.toFixed(3)} / ${b.toFixed(3)} / ${c.toFixed(3)} µg/mL`);
    // Raw EEG: exactly 128 samples per real second at any frame rate.
    const eeg60 = drive(fixedFrames(10, 60), 1 / 128, 1, () => {});
    const eegJ = drive(jitterFrames(10, 3), 1 / 128, 1, () => {});
    const rate60 = eeg60.simTimeSec / eeg60.runWallSec * 128;
    const rateJ = eegJ.simTimeSec / eegJ.runWallSec * 128;
    check('M4 raw EEG sampled at 128 Hz whatever the frame rate', Math.abs(rate60 - 128) < 1 && Math.abs(rateJ - 128) < 1, `${rate60.toFixed(1)} / ${rateJ.toFixed(1)} Hz`);
  }

  // ── M5: NMJ block identical across frame rates
  {
    const run = (frames: number[]) => {
      const s = freshNmj('');
      s.rocPlasma = 0.6 * 1.45;
      s.rocPeripheral = 0.6 * 1.1;
      drive(frames, NMJ_STEP_SEC, 10, (dt) => stepNmj(s, dt));
      return s.thumbOcc;
    };
    const a = run(fixedFrames(30, 144));
    const b = run(fixedFrames(30, 30));
    const c = run(jitterFrames(30, 5));
    const spread = Math.max(a, b, c) - Math.min(a, b, c);
    check('M5 on SimClock: thumb occupancy after 300 simulated s identical at 144 Hz / 30 Hz / jitter', spread < 0.005, `${a.toFixed(4)} / ${b.toFixed(4)} / ${c.toFixed(4)}`);
  }
}
