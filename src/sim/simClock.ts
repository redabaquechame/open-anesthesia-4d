/**
 * One simulation clock for every module (audit F14, F23).
 *
 * Fixed-step accumulator ("fix your timestep"): the screen frame rate decides how often we look at the
 * clock, never how big a physics step is. Each module integrates in steps of exactly `stepSec` of
 * simulated time, so the result after N simulated seconds is the same on a 30 Hz phone and a 144 Hz
 * desktop. The speed factor is always visible in the UI (no hidden multipliers).
 *
 * Rules:
 *  - `tick(wallDtSec)` returns how many fixed steps to run now.
 *  - Paused or hidden tab → no simulated time passes (and the wall time is not banked).
 *  - A wall gap longer than `maxFrameSec` (tab switch, debugger, slow phone) is not caught up:
 *    the extra is counted in `droppedWallSec`, so a stall can never produce a burst of hidden time.
 *  - At most `maxStepsPerTick` steps per call; any extra is dropped the same way.
 *
 * Pure TypeScript, no DOM; `bindPageVisibility` is the only browser-facing helper.
 */
export interface SimClockOptions {
  /** Simulated seconds per physics step. */
  stepSec: number;
  /** Simulated seconds per wall second (×1 = real time). */
  speed?: number;
  /** Longest wall gap accepted per tick, in s. Default 0.25 s. */
  maxFrameSec?: number;
  /** Cap on steps per tick. Default 2000. */
  maxStepsPerTick?: number;
}

export class SimClock {
  readonly stepSec: number;
  speed: number;
  paused = false;
  hidden = false;
  /** Simulated time elapsed, s (always a whole number of steps). */
  simTimeSec = 0;
  /** Wall time the clock has been running (not paused, not hidden), s. */
  runWallSec = 0;
  /** Wall time discarded because of stalls or the step cap, s. */
  droppedWallSec = 0;
  private acc = 0;
  private readonly maxFrameSec: number;
  private readonly maxStepsPerTick: number;

  constructor(o: SimClockOptions) {
    if (!(o.stepSec > 0)) throw new Error('SimClock: stepSec must be > 0');
    this.stepSec = o.stepSec;
    this.speed = o.speed ?? 1;
    this.maxFrameSec = o.maxFrameSec ?? 0.25;
    this.maxStepsPerTick = o.maxStepsPerTick ?? 2000;
  }

  get running(): boolean {
    return !this.paused && !this.hidden;
  }

  /** Wall seconds since the last tick → number of fixed steps to integrate now. */
  tick(wallDtSec: number): number {
    if (!this.running || !(wallDtSec > 0)) return 0;
    const wall = Math.min(wallDtSec, this.maxFrameSec);
    this.droppedWallSec += wallDtSec - wall;
    this.runWallSec += wall;
    this.acc += wall * this.speed;
    let n = Math.floor(this.acc / this.stepSec + 1e-9);
    if (n > this.maxStepsPerTick) {
      this.droppedWallSec += ((n - this.maxStepsPerTick) * this.stepSec) / this.speed;
      n = this.maxStepsPerTick;
      this.acc = 0;
    } else {
      this.acc -= n * this.stepSec;
      if (this.acc < 0) this.acc = 0;
    }
    this.simTimeSec += n * this.stepSec;
    return n;
  }

  /** Fraction of the next step already accumulated (0–1), for drawing between steps if wanted. */
  get alpha(): number {
    return this.acc / this.stepSec;
  }

  reset(): void {
    this.simTimeSec = 0;
    this.runWallSec = 0;
    this.droppedWallSec = 0;
    this.acc = 0;
  }
}

/** Pause the given clocks while the page is hidden. Returns the cleanup function. */
export function bindPageVisibility(clocks: SimClock[], onChange?: (hidden: boolean) => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const apply = () => {
    const h = document.visibilityState === 'hidden';
    for (const c of clocks) c.hidden = h;
    onChange?.(h);
  };
  apply();
  document.addEventListener('visibilitychange', apply);
  return () => document.removeEventListener('visibilitychange', apply);
}

/**
 * Drive a clock from requestAnimationFrame timestamps. Call `frame(now)` once per animation frame;
 * it returns the number of fixed steps to run. The first frame after a (re)start never counts the gap.
 */
export function makeFrameDriver(clock: SimClock) {
  let last: number | null = null;
  return {
    frame(nowMs: number): number {
      const dt = last === null ? 0 : (nowMs - last) / 1000;
      last = nowMs;
      return clock.tick(dt);
    },
    restart() {
      last = null;
    },
  };
}
