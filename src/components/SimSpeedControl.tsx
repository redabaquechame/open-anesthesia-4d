import { Pause, Play } from 'lucide-react';

/** Visible simulation speed, simulated time and pause (audit F14: no hidden time multipliers). */
export function SimSpeedControl({
  fr,
  speeds,
  speed,
  onSpeed,
  paused,
  onTogglePause,
  simTimeSec,
}: {
  fr: boolean;
  speeds: number[];
  speed: number;
  onSpeed: (s: number) => void;
  paused: boolean;
  onTogglePause: () => void;
  simTimeSec: number;
}) {
  const L = (f: string, e: string) => (fr ? f : e);
  const t = Math.max(0, Math.floor(simTimeSec));
  const hh = Math.floor(t / 3600);
  const mm = Math.floor((t % 3600) / 60);
  const ss = t % 60;
  const time = `${hh > 0 ? `${hh}:` : ''}${hh > 0 ? String(mm).padStart(2, '0') : mm}:${String(ss).padStart(2, '0')}`;
  return (
    <div className="flex items-center gap-1 font-mono text-[11px]" role="group" aria-label={L('Horloge de simulation', 'Simulation clock')}>
      <button
        onClick={onTogglePause}
        className="h-7 min-w-7 px-1.5 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-100 flex items-center justify-center cursor-pointer"
        aria-label={paused ? L('Reprendre la simulation', 'Resume simulation') : L('Mettre la simulation en pause', 'Pause simulation')}
        title={paused ? L('Reprendre', 'Resume') : L('Pause', 'Pause')}
      >
        {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
      </button>
      <span
        className={`px-1.5 h-7 flex items-center rounded border ${paused ? 'border-amber-500/60 text-amber-200' : 'border-slate-700 text-slate-200'}`}
        title={L('Temps simulé', 'Simulated time')}
      >
        {paused ? L('pause · ', 'paused · ') : ''}t = {time}
      </span>
      {speeds.map((s) => (
        <button
          key={s}
          onClick={() => onSpeed(s)}
          aria-pressed={speed === s}
          title={s === 1 ? L('Temps réel', 'Real time') : L(`Accéléré : 1 s réelle = ${s} s simulées`, `Accelerated: 1 real second = ${s} simulated seconds`)}
          className={`h-7 px-2 rounded border cursor-pointer ${speed === s ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
        >
          ×{s}
        </button>
      ))}
      <span className={`ms-1 font-sans ${speed === 1 ? 'text-slate-400' : 'text-amber-300'}`}>
        {speed === 1 ? L('temps réel', 'real time') : L(`accéléré ×${speed}`, `accelerated ×${speed}`)}
      </span>
    </div>
  );
}
