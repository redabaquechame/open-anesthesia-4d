import { useState } from 'react';
import { Gauge } from 'lucide-react';
import { getQualityMode, setQualityMode, QUALITY_LABELS, type QualityMode } from '../engine/quality';
import type { LocaleCode } from '../standards/clinicalStandards';

/** Header control: 3D render quality (Auto follows the device and steps down if the frame rate drops). */
export function QualitySelect({ locale }: { locale: LocaleCode }) {
  const [mode, setMode] = useState<QualityMode>(getQualityMode);
  const L = locale.startsWith('fr') ? 'fr' : locale === 'ar-MA' ? 'ar' : 'en';
  return (
    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 gap-1" title="3D quality">
      <Gauge className="w-3.5 h-3.5 text-cyan-400" />
      <select
        value={mode}
        onChange={(e) => {
          const m = e.target.value as QualityMode;
          setMode(m);
          setQualityMode(m);
        }}
        className="bg-transparent text-slate-100 text-xs outline-none cursor-pointer"
        aria-label="3D quality"
      >
        {(Object.keys(QUALITY_LABELS) as QualityMode[]).map((m) => (
          <option key={m} value={m} className="bg-slate-900">
            {QUALITY_LABELS[m][L]}
          </option>
        ))}
      </select>
    </div>
  );
}
