import { useEffect, useRef } from 'react';
import type { SimulationSnapshot } from '../physics/circuitLungKernel';

interface BedsideMonitorProps {
  snapshot: SimulationSnapshot | null;
  showEquationZones: boolean;
  projectorMode: boolean;
  blindMode: boolean;
  /** French labels (every locale except en-INT). */
  fr?: boolean;
}

const BUFFER_LEN = 260; // ~5.2 seconds of live 50 Hz telemetry

export function BedsideMonitorCanvas({ snapshot, showEquationZones, projectorMode, blindMode, fr = true }: BedsideMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ringRef = useRef<SimulationSnapshot[]>([]);
  const lastPushedRef = useRef<SimulationSnapshot | null>(null);

  useEffect(() => {
    if (!snapshot) return;
    const buf = ringRef.current;
    // Guard against double-push of the same sample (React StrictMode re-runs effects)
    if (lastPushedRef.current !== snapshot) {
      buf.push(snapshot);
      lastPushedRef.current = snapshot;
      if (buf.length > BUFFER_LEN) buf.shift();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    const bandH = height / 3;
    const lw = projectorMode ? 2.6 : 1.8;
    const fontSize = projectorMode ? 12 : 10.5;

    ctx.strokeStyle = '#162235';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, bandH * i);
      ctx.lineTo(width, bandH * i);
      ctx.stroke();
    }

    const xOf = (idx: number) => (idx / (BUFFER_LEN - 1)) * width;

    // --- BAND 1: Airway Pressure (Paw, -5..45 cmH2O) + Equation of Motion Zones ---
    const pawToY = (p: number) => bandH - 12 - ((p + 5) / 50) * (bandH - 22);

    if (showEquationZones && buf.length > 2) {
      // Elastic (V/C) + PEEP zone (Cyan)
      ctx.fillStyle = 'rgba(34, 211, 238, 0.16)';
      ctx.beginPath();
      ctx.moveTo(xOf(0), pawToY(0));
      buf.forEach((s, i) => ctx.lineTo(xOf(i), pawToY(s.peepBaseCmH2O + s.elasticPressureCmH2O)));
      ctx.lineTo(xOf(buf.length - 1), pawToY(0));
      ctx.closePath();
      ctx.fill();

      // Resistive (F * R) stacked zone (Amber)
      ctx.fillStyle = 'rgba(251, 191, 36, 0.24)';
      ctx.beginPath();
      buf.forEach((s, i) => {
        const y = pawToY(s.pawCmH2O);
        if (i === 0) ctx.moveTo(xOf(i), y);
        else ctx.lineTo(xOf(i), y);
      });
      for (let i = buf.length - 1; i >= 0; i--) {
        const s = buf[i];
        ctx.lineTo(xOf(i), pawToY(s.peepBaseCmH2O + s.elasticPressureCmH2O));
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = lw;
    ctx.beginPath();
    buf.forEach((s, i) => {
      const y = pawToY(s.pawCmH2O);
      if (i === 0) ctx.moveTo(xOf(i), y);
      else ctx.lineTo(xOf(i), y);
    });
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, monospace`;
    ctx.fillText(
      showEquationZones
        ? fr
          ? 'Paw (cmH₂O)  [ambre : débit × R, résistif | cyan : V/C, élastique]'
          : 'Paw (cmH₂O)  [amber: flow × R, resistive | cyan: V/C, elastic]'
        : 'Paw (cmH₂O)',
      8,
      14
    );

    // --- BAND 2: Flow (-1.35 .. +1.35 L/s) ---
    const flowMidY = bandH + bandH * 0.52;
    ctx.strokeStyle = '#1e293b';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, flowMidY);
    ctx.lineTo(width, flowMidY);
    ctx.stroke();
    ctx.setLineDash([]);

    const flowToY = (f: number) => flowMidY - (Math.max(-1.35, Math.min(1.35, f)) / 1.35) * (bandH * 0.42);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = lw;
    ctx.beginPath();
    buf.forEach((s, i) => {
      const y = flowToY(s.flowLps);
      if (i === 0) ctx.moveTo(xOf(i), y);
      else ctx.lineTo(xOf(i), y);
    });
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(fr ? 'Débit (L/s)' : 'Flow (L/s)', 8, bandH + 14);

    // --- BAND 3: Capnography (0..60 mmHg) ---
    const capBaseY = bandH * 3 - 10;
    const capToY = (c: number) => capBaseY - (Math.min(c, 62) / 62) * (bandH - 24);

    ctx.strokeStyle = '#334155';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, capBaseY);
    ctx.lineTo(width, capBaseY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (buf.length > 1) {
      ctx.fillStyle = 'rgba(248, 250, 252, 0.14)';
      ctx.beginPath();
      ctx.moveTo(xOf(0), capBaseY);
      buf.forEach((s, i) => ctx.lineTo(xOf(i), capToY(s.capnoMmHg)));
      ctx.lineTo(xOf(buf.length - 1), capBaseY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = lw;
      ctx.beginPath();
      buf.forEach((s, i) => {
        const y = capToY(s.capnoMmHg);
        if (i === 0) ctx.moveTo(xOf(i), y);
        else ctx.lineTo(xOf(i), y);
      });
      ctx.stroke();
    }

    ctx.fillStyle = '#f8fafc';
    ctx.fillText(fr ? 'Capnogramme CO₂ (mmHg)  [ligne de base = 0]' : 'CO₂ capnogram (mmHg)  [baseline = 0]', 8, bandH * 2 + 14);
    ctx.restore();
  }, [snapshot, showEquationZones, projectorMode]);

  const big = projectorMode ? 'text-xl font-bold' : 'text-base font-bold';

  return (
    <div className="flex flex-col bg-oa-canvas border border-slate-800 rounded-xl overflow-hidden">
      {/* Live Vitals Strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-2.5 bg-oa-surface2 border-b border-slate-800 font-mono">
        <div className="bg-slate-900/90 rounded-lg p-1.5 border border-amber-500/20">
          <div className="text-[10px] text-amber-400">Paw</div>
          <div className={`${big} text-amber-300`}>
            {snapshot ? snapshot.pawCmH2O.toFixed(1) : '--'}
            <span className="text-[10px] font-normal text-slate-400 ml-0.5">cmH2O</span>
          </div>
        </div>
        <div className="bg-slate-900/90 rounded-lg p-1.5 border border-cyan-500/20">
          <div className="text-[10px] text-cyan-400">{fr ? 'Vt délivré' : 'Vt delivered'}</div>
          <div className={`${big} text-cyan-300`}>
            {snapshot ? snapshot.deliveredVtMl : '--'}
            <span className="text-[10px] font-normal text-slate-400 ml-0.5">mL</span>
          </div>
        </div>
        <div className="bg-slate-900/90 rounded-lg p-1.5 border border-slate-700">
          <div className="text-[10px] text-slate-300">EtCO2 / FiCO2</div>
          <div className={`${big} text-white`}>
            {snapshot ? Math.round(snapshot.etco2MmHg) : '--'}
            <span className="text-rose-400 text-xs ml-1">/{snapshot ? Math.round(snapshot.fico2MmHg) : 0}</span>
          </div>
        </div>
        <div className="bg-slate-900/90 rounded-lg p-1.5 border border-sky-500/20">
          <div className="text-[10px] text-sky-400">FiO2</div>
          <div className={`${big} text-sky-300`}>{snapshot ? Math.round(snapshot.circuitFiO2Pct) : '--'}%</div>
        </div>
        <div className="bg-slate-900/90 rounded-lg p-1.5 border border-yellow-500/20">
          <div className="text-[10px] text-yellow-400">Agent</div>
          <div className={`${big} text-yellow-300`}>{snapshot ? snapshot.circuitAgentPct.toFixed(1) : '--'}%</div>
        </div>
        <div className="bg-slate-900/90 rounded-lg p-1.5 border border-purple-500/20">
          <div className="text-[10px] text-purple-400">Argon</div>
          <div className={`${big} text-purple-300`}>{snapshot ? snapshot.circuitArgonPct.toFixed(1) : '0.0'}%</div>
        </div>
      </div>

      {/* Active Alarms Ribbon */}
      {snapshot && snapshot.alarms.length > 0 && (
        <div className="px-3 py-1.5 bg-rose-950/80 border-b border-rose-500/40 flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">ALARMS:</span>
          {snapshot.alarms.map((a) => (
            <span
              key={a}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/25 text-rose-100 border border-rose-400/40"
            >
              {blindMode && a.includes('SCAVENGING') ? 'HIGH_PEEP_ALARM' : a}
            </span>
          ))}
        </div>
      )}

      {/* Live Waveform Canvas */}
      <div className={projectorMode ? 'h-80 w-full' : 'h-60 w-full'}>
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>
    </div>
  );
}
