import { useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';

/**
 * Tactile stepped control (DESIGN.md §1.4): − / tabular readout / +, optional preset chips.
 * Press and hold a button to repeat; arrow keys step when the readout has focus.
 * Replaces raw range sliders in active clinical views.
 */
export function ClinicalStepper({
  label,
  value,
  min,
  max,
  step,
  unit,
  decimals = 0,
  presets,
  onChange,
  tone = 'text-white',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  decimals?: number;
  presets?: number[];
  onChange: (v: number) => void;
  tone?: string;
}) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const timer = useRef<number | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const bump = (dir: number) => onChange(Number(clamp(valueRef.current + dir * step).toFixed(6)));

  const stop = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  const start = (dir: number) => {
    bump(dir);
    stop();
    let n = 0;
    timer.current = window.setInterval(() => {
      n++;
      if (n > 3) bump(dir); // short delay before repeating
    }, 90);
  };

  const btn = 'w-7 h-7 shrink-0 rounded border border-oa-hairline bg-oa-raised hover:bg-oa-hover active:bg-oa-border-strong flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-default select-none';
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[11px] text-slate-400 truncate">{label}</div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={btn}
          aria-label={`${label} −`}
          disabled={value <= min}
          onPointerDown={() => start(-1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && bump(-1)}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div
          role="spinbutton"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); bump(1); }
            if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); bump(-1); }
          }}
          className={`flex-1 h-7 rounded border border-oa-hairline bg-oa-canvas flex items-baseline justify-end gap-1 px-2 outline-none focus:border-slate-400 ${tone}`}
          dir="ltr"
        >
          <span className="oa-num text-sm leading-7">{value.toFixed(decimals)}</span>
          {unit && <span className="text-[10px] text-slate-500">{unit}</span>}
        </div>
        <button
          type="button"
          className={btn}
          aria-label={`${label} +`}
          disabled={value >= max}
          onPointerDown={() => start(1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && bump(1)}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {presets && (
        <div className="flex gap-1" dir="ltr">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`flex-1 h-5 rounded border text-[10px] font-mono cursor-pointer ${Math.abs(value - p) < step / 2 ? 'border-slate-400 bg-oa-hover text-white' : 'border-oa-hairline text-slate-400 hover:text-white'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
