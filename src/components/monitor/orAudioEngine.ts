/**
 * Operating-room sound engine (WebAudio, no React, no dependencies).
 *
 * Adapted from Gemini's Sprint 1 handoff. Two sounds:
 * 1. Pulse-oximeter tone on every detected pulse, with a pitch that falls as SpO₂ falls. The
 *    principle (a variable-pitch tone for each pulse) is in Sanderson PM, Loeb RG et al., Biomed
 *    Instrum Technol 2022;56(2):46-57, doi:10.2345/0899-8205-56.2.46 (PMC9767428, abstract only). The Hz values of the curve below are NOT from a source:
 *    claim m9-audio-spo2-pitch, status illustrative.
 * 2. Alarm bursts by priority (high / medium / low) in the spirit of IEC 60601-1-8. The standard is
 *    paywalled; pulse counts, notes and intervals here are illustrative (claim m9-audio-alarms).
 *
 * Review changes: alarm priority is decided by the caller from the module's own alarm limits (no
 * second set of hidden thresholds); the tone is driven by the monitor's R-wave detector; silent
 * until the user turns sound on (browser autoplay rules).
 */

export type AlarmPriority = 'none' | 'low' | 'medium' | 'high';

/** Illustrative pitch curve: ~660 Hz at 100 %, 3 % lower per 1 % SpO₂ drop (claim m9-audio-spo2-pitch). */
export function spo2ToHz(spo2: number): number {
  const s = Math.max(50, Math.min(100, spo2));
  return 660 * Math.pow(0.97, 100 - s);
}

const BURSTS: Record<Exclude<AlarmPriority, 'none'>, { notes: number[]; pulse: number; gap: number; repeatAfter?: number; every: number; gain: number }> = {
  high: { notes: [523.25, 440, 349.23, 440, 523.25], pulse: 0.11, gap: 0.06, repeatAfter: 0.35, every: 4.5, gain: 0.42 },
  medium: { notes: [523.25, 440, 349.23], pulse: 0.14, gap: 0.1, every: 12, gain: 0.3 },
  low: { notes: [392, 329.63], pulse: 0.18, gap: 0.14, every: 22, gain: 0.22 },
};

export class OrAudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = true;
  private volume = 0.35;
  private cooldown = 0;
  private silenced = 0;
  private priority: AlarmPriority = 'none';
  private disposed = false;

  /** Call from a click handler (autoplay policy). */
  async unlock(): Promise<boolean> {
    if (this.disposed) return false;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx.state === 'running';
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.02);
  }

  isMuted() {
    return this.muted;
  }

  /** Audio pause for alarms only; the pulse tone keeps playing (claim m9-audio-alarms). */
  silence(sec = 120) {
    this.silenced = sec;
  }

  silencedRemaining() {
    return this.silenced;
  }

  /** One pulse beep at the pitch for this SpO₂. */
  beat(spo2: number) {
    if (!this.ready()) return;
    this.tone(spo2ToHz(spo2), this.ctx!.currentTime, 0.1, 0.24, [[1, 1], [2, 0.14]]);
  }

  /** Advance timers; plays an alarm burst when due. */
  update(priority: AlarmPriority, dt: number) {
    dt = Math.max(0, Math.min(0.25, dt));
    if (rank(priority) > rank(this.priority)) this.cooldown = 0;
    this.priority = priority;
    this.silenced = Math.max(0, this.silenced - dt);
    if (priority === 'none' || this.silenced > 0) {
      this.cooldown = 0;
      return;
    }
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const b = BURSTS[priority];
    this.cooldown = b.every;
    if (!this.ready()) return;
    const t0 = this.ctx!.currentTime + 0.01;
    const pass = (off: number) =>
      b.notes.forEach((hz, i) => this.tone(hz, t0 + off + i * (b.pulse + b.gap), b.pulse, b.gain, [[1, 1], [2, 0.45], [3, 0.22]]));
    pass(0);
    if (b.repeatAfter !== undefined) pass(b.notes.length * (b.pulse + b.gap) + b.repeatAfter);
  }

  dispose() {
    this.disposed = true;
    try {
      this.master?.disconnect();
      if (this.ctx && this.ctx.state !== 'closed') void this.ctx.close();
    } catch {
      /* already closed */
    }
    this.ctx = null;
    this.master = null;
  }

  private ready() {
    return !this.disposed && !this.muted && !!this.ctx && !!this.master && this.ctx.state === 'running';
  }

  private tone(hz: number, t: number, dur: number, peak: number, partials: [number, number][]) {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.008);
    env.gain.setValueAtTime(peak * 0.9, t + Math.max(0.02, dur - 0.025));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    env.connect(this.master!);
    for (const [mult, w] of partials) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(hz * mult, t);
      g.gain.value = w * 0.55;
      o.connect(g);
      g.connect(env);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
  }
}

const rank = (p: AlarmPriority) => ({ none: 0, low: 1, medium: 2, high: 3 })[p];
