/**
 * Bedside patient monitor: sweeping ECG II, arterial line, pleth and capnogram traces with large
 * numerics, driven by the vital signs of a running scenario. Waveform maths lives in
 * src/physics/monitorWaveforms.ts (ECG = ECGSYN closed form; the others are a simulator model).
 */
import { useEffect, useRef } from 'react';
import { arterialShape, baselineMv, capnoMmHg, ecgMv, plethShape, vfMv, type MonitorRhythm } from '../physics/monitorWaveforms';

export interface MonitorVitals {
  hr: number;
  sbp: number;
  dbp: number;
  spo2: number;
  etco2: number;
  tempC: number;
  rhythm: MonitorRhythm;
}

interface Props {
  vitals: MonitorVitals;
  running: boolean;
  /** Respiratory rate for the capnogram (ventilated patient). */
  rr?: number;
  alarms?: Partial<Record<'hr' | 'bp' | 'spo2' | 'etco2' | 'temp', boolean>>;
  fr: boolean;
}

const SWEEP_PX_PER_S = 110; // ≈ 25 mm/s on a typical laptop screen
const BANDS = [
  { key: 'ecg', label: 'II', color: '#4ade80' },
  { key: 'art', label: 'ART', color: '#f87171' },
  { key: 'pleth', label: 'Pleth', color: '#22d3ee' },
  { key: 'co2', label: 'CO₂', color: '#facc15' },
] as const;

export function PatientMonitor({ vitals, running, rr = 12, alarms = {}, fr }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vRef = useRef(vitals);
  const runRef = useRef(running);
  vRef.current = vitals;
  runRef.current = running;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let x = 0;
    let last = performance.now();
    let t = 0;
    let cPhase = 0;
    let rPhase = 0;
    let prevY: number[] = [NaN, NaN, NaN, NaN];
    let dpr = 1;
    let W = 0;
    let H = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, Math.floor(r.width * dpr));
      H = Math.max(1, Math.floor(r.height * dpr));
      canvas.width = W;
      canvas.height = H;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      x = 0;
      prevY = [NaN, NaN, NaN, NaN];
      drawLabels();
    };
    const bandH = () => H / BANDS.length;
    const drawLabels = () => {
      ctx.font = `${10 * dpr}px ui-monospace, monospace`;
      BANDS.forEach((b, i) => {
        ctx.fillStyle = b.color;
        ctx.fillText(b.label, 4 * dpr, i * bandH() + 12 * dpr);
      });
    };

    const sample = (dt: number): number[] => {
      const v = vRef.current;
      t += dt;
      const pulse = (v.rhythm === 'sinus' || v.rhythm === 'sinusTachy' || v.rhythm === 'ROSC') && v.hr > 0 && v.sbp > 0;
      const rate = v.rhythm === 'PEA' ? 40 : Math.max(v.hr, 1);
      if (v.rhythm !== 'VF' && v.rhythm !== 'asystole') cPhase = (cPhase + (rate / 60) * dt) % 1;
      rPhase = (rPhase + (rr / 60) * dt) % 1;
      let ecg = baselineMv(t);
      if (v.rhythm === 'VF') ecg += vfMv(t);
      else if (v.rhythm !== 'asystole') ecg += ecgMv(cPhase, rate);
      const art = pulse ? v.dbp + (v.sbp - v.dbp) * arterialShape(cPhase - 0.05) : 4 + 2 * Math.sin(t * 1.3);
      const pleth = pulse && v.spo2 > 0 ? plethShape(cPhase - 0.12) : 0.02 * Math.sin(t * 2);
      const co2 = capnoMmHg(rPhase, v.etco2);
      // map to band-relative 0..1 (1 = top)
      const artMax = Math.max(160, Math.ceil((v.sbp + 20) / 40) * 40);
      const co2Max = v.etco2 > 55 ? 100 : 60;
      return [
        0.62 + ecg * 0.42,
        Math.min(1, art / artMax),
        0.1 + pleth * 0.78,
        Math.min(1, co2 / co2Max),
      ];
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (!runRef.current || dt <= 0) return;
      dt = Math.min(dt, 0.1);
      const dx = SWEEP_PX_PER_S * dpr * dt;
      const steps = Math.max(1, Math.ceil(dx / dpr));
      const bh = bandH();
      for (let s = 0; s < steps; s++) {
        const ys = sample(dt / steps);
        const nx = x + dx / steps;
        // erase bar ahead of the cursor
        ctx.fillStyle = '#000';
        ctx.fillRect(nx, 0, 14 * dpr, H);
        ys.forEach((y, i) => {
          const py = i * bh + 4 * dpr + (1 - Math.max(0, Math.min(1, y))) * (bh - 8 * dpr);
          ctx.strokeStyle = BANDS[i].color;
          ctx.lineWidth = 1.6 * dpr;
          ctx.beginPath();
          ctx.moveTo(x, Number.isNaN(prevY[i]) ? py : prevY[i]);
          ctx.lineTo(nx, py);
          ctx.stroke();
          prevY[i] = py;
        });
        x = nx;
        if (x > W) {
          x = 0;
          prevY = [NaN, NaN, NaN, NaN];
        }
      }
      if (x < 40 * dpr) drawLabels();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [rr]);

  const v = vitals;
  const noOutput = v.rhythm === 'VF' || v.rhythm === 'PEA' || v.rhythm === 'asystole';
  const map = Math.round(v.dbp + (v.sbp - v.dbp) / 3);
  const num = (on: boolean | undefined) => `rounded-md px-2 py-1 border ${on ? 'border-rose-500 bg-rose-950/50 animate-pulse' : 'border-slate-800 bg-black'}`;

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 bg-black rounded-lg border border-slate-800 p-1.5">
      <canvas ref={canvasRef} className="w-full h-56 sm:h-64 rounded" aria-label={fr ? 'Tracés du moniteur' : 'Monitor traces'} />
      <div className="flex flex-col gap-1 w-24 sm:w-28 font-mono">
        <div className={num(alarms.hr)}>
          <div className="text-[9px] text-emerald-400">HR</div>
          <div className="text-2xl leading-none text-emerald-400">{noOutput ? '---' : Math.round(v.hr)}</div>
        </div>
        <div className={num(alarms.bp)}>
          <div className="text-[9px] text-red-400">ART mmHg</div>
          <div className="text-lg leading-none text-red-400">{noOutput ? '--/--' : `${Math.round(v.sbp)}/${Math.round(v.dbp)}`}</div>
          <div className="text-[11px] text-red-300">{noOutput ? '' : `(${map})`}</div>
        </div>
        <div className={num(alarms.spo2)}>
          <div className="text-[9px] text-cyan-400">SpO₂ %</div>
          <div className="text-2xl leading-none text-cyan-400">{noOutput ? '--' : Math.round(v.spo2)}</div>
        </div>
        <div className={num(alarms.etco2)}>
          <div className="text-[9px] text-yellow-400">EtCO₂ mmHg · RR {rr}</div>
          <div className="text-2xl leading-none text-yellow-400">{Math.round(v.etco2)}</div>
        </div>
        <div className={num(alarms.temp)}>
          <div className="text-[9px] text-orange-400">T °C</div>
          <div className="text-lg leading-none text-orange-400">{v.tempC.toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
}
