/**
 * Bedside monitor renderer (Canvas2D, no React, no dependencies).
 *
 * Adapted from Gemini's Sprint 1 handoff (handoff/gemini/sprint-1): sweep with an erase gap and a
 * leading dot, fine graticule, hairline lanes, right-hand tabular numerics with alarm limits, and a
 * status bar for the rhythm and alarm banner. Review changes: the waveform maths stays in
 * src/physics/monitorWaveforms.ts (injected sampler); the first resize always sizes the canvas;
 * alarm limits come from the caller (no hidden defaults); the arterial and CO₂ scales follow the
 * values on screen; text is localised by the caller.
 */

export type AlarmPriority = 'none' | 'low' | 'medium' | 'high';

export interface MonitorVitals {
  hr: number;
  sbp: number;
  dbp: number;
  spo2: number;
  etco2: number;
  tempC: number;
}

/** Raw channel values: ECG in mV, ART in mmHg, pleth 0–1, CO₂ in mmHg. */
export interface WaveformSample {
  ecg: number;
  art: number;
  pleth: number;
  co2: number;
}

export interface MonitorLimits {
  hr: [number, number];
  sbp: [number, number];
  spo2Low: number;
  etco2: [number, number];
}

export interface MonitorFrame {
  vitals: MonitorVitals;
  /** No mechanical output: numerics show dashes. */
  noOutput: boolean;
  rhythmLabel: string;
  /** Per-parameter alarm flags (cell flashes). */
  alarms: Partial<Record<'hr' | 'bp' | 'spo2' | 'etco2' | 'temp', boolean>>;
  priority: AlarmPriority;
  bannerText?: string;
  silencedRemainingSec?: number;
  rr: number;
}

export interface ClinicalMonitorOptions {
  /** Advance the waveform clock by dt and return the next sample (backed by monitorWaveforms.ts). */
  sample: (dtSec: number) => WaveformSample;
  limits: MonitorLimits;
  labels: { hr: string; art: string; spo2: string; co2: string; temp: string };
  sweepPxPerSec?: number;
  /** Fired once per R wave (rising edge), for the pulse tone. */
  onRWave?: () => void;
}

const C = {
  bg: '#020406',
  panel: '#06090d',
  hairline: '#1b232e',
  grid: 'rgba(148,163,184,0.07)',
  muted: '#6b7785',
  ecg: '#00e676',
  art: '#ff453a',
  pleth: '#00d4ff',
  co2: '#ffd60a',
  temp: '#cbd5e1',
  high: '#ff1744',
  medium: '#ffd60a',
  low: '#00e5ff',
};
const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const SANS = '"IBM Plex Sans", system-ui, sans-serif';
const HEADER = 22;
const WIPE = 16;

export class ClinicalMonitorRenderer {
  private ctx: CanvasRenderingContext2D;
  private trace: HTMLCanvasElement;
  private tctx: CanvasRenderingContext2D;
  private ro: ResizeObserver | null = null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private traceW = 0;
  private numW = 0;
  private x = 0;
  private prev: WaveformSample | null = null;
  private lastEcg = 0;
  private refractory = 0;
  private blink = 0;
  private artMax = 160;
  private co2Max = 60;
  private disposed = false;
  private opts: ClinicalMonitorOptions;

  constructor(private canvas: HTMLCanvasElement, opts: ClinicalMonitorOptions) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
    this.trace = document.createElement('canvas');
    const t = this.trace.getContext('2d');
    if (!t) throw new Error('2D context unavailable');
    this.tctx = t;
    this.opts = opts;
    this.resize();
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
    }
  }

  setLabels(labels: ClinicalMonitorOptions['labels']) {
    this.opts.labels = labels;
  }

  resize() {
    if (this.disposed) return;
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(280, Math.floor(r.width));
    const h = Math.max(200, Math.floor(r.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === this.w && h === this.h && dpr === this.dpr) return;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.numW = w < 460 ? Math.floor(w * 0.36) : Math.min(190, Math.floor(w * 0.3));
    this.traceW = w - this.numW;
    this.trace.width = Math.floor(this.traceW * dpr);
    this.trace.height = Math.floor(h * dpr);
    this.tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.x = 0;
    this.prev = null;
  }

  /** Advance the sweep by dt (s) and draw one frame. */
  update(frame: MonitorFrame, dt: number) {
    if (this.disposed) return;
    dt = Math.max(0.001, Math.min(0.1, dt));
    this.blink += dt;
    this.refractory = Math.max(0, this.refractory - dt);
    this.artMax = Math.max(160, Math.ceil((frame.vitals.sbp + 20) / 40) * 40);
    this.co2Max = frame.vitals.etco2 > 55 ? 100 : 60;

    const laneH = (this.h - HEADER) / 4;
    const dx = (this.opts.sweepPxPerSec ?? 110) * dt;
    const steps = Math.max(1, Math.min(10, Math.ceil(dx / 1.5)));
    for (let i = 0; i < steps; i++) {
      const s = this.opts.sample(dt / steps);
      if (this.opts.onRWave && this.refractory <= 0 && this.lastEcg < 0.6 && s.ecg >= 0.6) {
        this.refractory = 0.22;
        this.opts.onRWave();
      }
      this.lastEcg = s.ecg;
      const nx = this.x + dx / steps;
      const wrapped = nx >= this.traceW;
      const x1 = wrapped ? nx - this.traceW : nx;
      this.tctx.clearRect(x1, 0, WIPE, this.h);
      if (x1 + WIPE > this.traceW) this.tctx.clearRect(0, 0, x1 + WIPE - this.traceW, this.h);
      if (this.prev && !wrapped) this.segment(this.x, x1, this.prev, s, laneH);
      this.x = x1;
      this.prev = s;
    }
    this.draw(frame, laneH);
  }

  dispose() {
    this.disposed = true;
    this.ro?.disconnect();
    this.ro = null;
    this.trace.width = 0;
    this.trace.height = 0;
  }

  private norm(s: WaveformSample): [number, number, number, number] {
    return [(s.ecg + 0.45) / 1.75, s.art / this.artMax, 0.08 + s.pleth * 0.8, s.co2 / this.co2Max];
  }

  private y(lane: number, v: number, laneH: number) {
    const top = HEADER + lane * laneH + 12;
    const usable = Math.max(16, laneH - 18);
    return top + (1 - Math.max(0, Math.min(1, v))) * usable;
  }

  private segment(x0: number, x1: number, a: WaveformSample, b: WaveformSample, laneH: number) {
    const t = this.tctx;
    const na = this.norm(a);
    const nb = this.norm(b);
    const cols = [C.ecg, C.art, C.pleth, C.co2];
    t.lineCap = 'round';
    t.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const y0 = this.y(i, na[i], laneH);
      const y1 = this.y(i, nb[i], laneH);
      if (i === 3) {
        const base = this.y(3, 0, laneH);
        t.fillStyle = 'rgba(255,214,10,0.10)';
        t.beginPath();
        t.moveTo(x0, base);
        t.lineTo(x0, y0);
        t.lineTo(x1, y1);
        t.lineTo(x1, base);
        t.closePath();
        t.fill();
      }
      t.strokeStyle = cols[i];
      t.lineWidth = i === 0 ? 1.8 : 1.7;
      t.beginPath();
      t.moveTo(x0, y0);
      t.lineTo(x1, y1);
      t.stroke();
    }
  }

  private draw(f: MonitorFrame, laneH: number) {
    const c = this.ctx;
    c.fillStyle = C.bg;
    c.fillRect(0, 0, this.w, this.h);

    // Graticule (5 mm-like squares) and lane mid-lines
    c.strokeStyle = C.grid;
    c.lineWidth = 1;
    c.beginPath();
    for (let gx = 27.5; gx < this.traceW; gx += 27.5) {
      c.moveTo(Math.round(gx) + 0.5, HEADER);
      c.lineTo(Math.round(gx) + 0.5, this.h);
    }
    c.stroke();

    c.drawImage(this.trace, 0, 0, this.trace.width, this.trace.height, 0, 0, this.traceW, this.h);

    // Leading phosphor dots
    if (this.prev) {
      const n = this.norm(this.prev);
      const cols = [C.ecg, C.art, C.pleth, C.co2];
      for (let i = 0; i < 4; i++) {
        c.fillStyle = cols[i];
        c.beginPath();
        c.arc(this.x, this.y(i, n[i], laneH), 2.2, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Numerics column and hairlines
    c.fillStyle = C.panel;
    c.fillRect(this.traceW, HEADER, this.numW, this.h - HEADER);
    c.strokeStyle = C.hairline;
    c.beginPath();
    c.moveTo(this.traceW + 0.5, HEADER);
    c.lineTo(this.traceW + 0.5, this.h);
    for (let r = 1; r < 4; r++) {
      const yy = Math.floor(HEADER + r * laneH) + 0.5;
      c.moveTo(0, yy);
      c.lineTo(this.w, yy);
    }
    c.stroke();

    const L = this.opts.labels;
    const lim = this.opts.limits;
    const lane = (i: number, title: string, scale: string, col: string) => {
      c.font = `600 10px ${SANS}`;
      c.textAlign = 'left';
      c.fillStyle = col;
      c.fillText(title, 6, HEADER + i * laneH + 11);
      c.font = `400 9px ${MONO}`;
      c.fillStyle = C.muted;
      c.fillText(scale, 6 + c.measureText(title).width + 30, HEADER + i * laneH + 11);
    };
    lane(0, 'II', '1 mV', C.ecg);
    lane(1, 'ART', `${this.artMax}/0`, C.art);
    lane(2, 'Pleth', '', C.pleth);
    lane(3, 'CO₂', `${this.co2Max}/0`, C.co2);

    const v = f.vitals;
    const flash = Math.floor(this.blink * 2.5) % 2 === 0;
    const dash = f.noOutput;
    const map = Math.round(v.dbp + (v.sbp - v.dbp) / 3);
    this.cell(0, laneH, C.ecg, L.hr, dash ? '---' : `${Math.round(v.hr)}`, `${lim.hr[1]}`, `${lim.hr[0]}`, '', !!f.alarms.hr, flash, false);
    this.cell(1, laneH, C.art, L.art, dash ? '--/--' : `${Math.round(v.sbp)}/${Math.round(v.dbp)}`, `${lim.sbp[1]}`, `${lim.sbp[0]}`, dash ? '' : `(${map})`, !!f.alarms.bp, flash, true);
    this.cell(2, laneH, C.pleth, L.spo2, dash ? '--' : `${Math.round(v.spo2)}`, '', `${lim.spo2Low}`, '', !!f.alarms.spo2, flash, false);
    this.cell(3, laneH, C.co2, `${L.co2} · RR ${f.rr}`, `${Math.round(v.etco2)}`, `${lim.etco2[1]}`, `${lim.etco2[0]}`, `${L.temp} ${v.tempC.toFixed(1)}`, !!f.alarms.etco2 || !!f.alarms.temp, flash, false);

    this.statusBar(f, flash);
  }

  private cell(row: number, laneH: number, col: string, title: string, value: string, hi: string, lo: string, sub: string, alarm: boolean, flash: boolean, compact: boolean) {
    const c = this.ctx;
    const x0 = this.traceW;
    const y0 = HEADER + row * laneH;
    const pad = 8;
    if (alarm && flash) {
      c.fillStyle = 'rgba(255,23,68,0.2)';
      c.fillRect(x0 + 1, y0 + 1, this.numW - 2, laneH - 2);
      c.strokeStyle = C.high;
      c.lineWidth = 1.5;
      c.strokeRect(x0 + 1.5, y0 + 1.5, this.numW - 3, laneH - 3);
    }
    c.textAlign = 'left';
    c.font = `600 9.5px ${SANS}`;
    c.fillStyle = col;
    c.fillText(title, x0 + pad, y0 + 12);
    c.font = `400 9px ${MONO}`;
    c.fillStyle = C.muted;
    if (hi) c.fillText(hi, x0 + pad, y0 + laneH * 0.5);
    if (lo) c.fillText(lo, x0 + pad, y0 + laneH * 0.76);
    const size = Math.max(14, Math.min(compact ? 22 : 32, Math.floor(laneH * (compact ? 0.32 : 0.5))));
    c.font = `700 ${size}px ${MONO}`;
    c.textAlign = 'right';
    c.fillStyle = col;
    c.fillText(value, x0 + this.numW - pad, y0 + laneH * 0.66);
    if (sub) {
      c.font = `500 10px ${MONO}`;
      c.fillStyle = row === 3 ? C.temp : col;
      c.fillText(sub, x0 + this.numW - pad, y0 + laneH - 5);
    }
  }

  private statusBar(f: MonitorFrame, flash: boolean) {
    const c = this.ctx;
    c.fillStyle = '#090c11';
    c.fillRect(0, 0, this.w, HEADER);
    c.strokeStyle = C.hairline;
    c.beginPath();
    c.moveTo(0, HEADER - 0.5);
    c.lineTo(this.w, HEADER - 0.5);
    c.stroke();
    c.font = `600 10px ${MONO}`;
    c.textAlign = 'left';
    c.fillStyle = f.noOutput ? C.high : C.muted;
    c.fillText(f.rhythmLabel, 8, 15);
    if (f.priority === 'none') return;
    const col = f.priority === 'high' ? C.high : f.priority === 'medium' ? C.medium : C.low;
    const fill = f.priority === 'low' || flash || (f.silencedRemainingSec ?? 0) > 0;
    const bw = Math.min(280, Math.floor(this.w * 0.5));
    const bx = this.w - bw - 4;
    if (fill) {
      c.fillStyle = col;
      c.fillRect(bx, 3, bw, HEADER - 6);
    } else {
      c.strokeStyle = col;
      c.strokeRect(bx + 0.5, 3.5, bw - 1, HEADER - 7);
    }
    c.font = `700 10px ${MONO}`;
    c.textAlign = 'center';
    c.fillStyle = fill ? (f.priority === 'high' ? '#ffffff' : '#05070a') : col;
    const sil = f.silencedRemainingSec && f.silencedRemainingSec > 0 ? `  🔕 ${Math.ceil(f.silencedRemainingSec)} s` : '';
    c.fillText(`${f.bannerText ?? ''}${sil}`, bx + bw / 2, 15);
  }
}
