import { useState } from 'react';
import { ChevronDown, CircleHelp, FlaskConical } from 'lucide-react';
import type { LocaleCode } from '../standards/clinicalStandards';
import { guideFor } from '../standards/moduleGuides';
import { scopeFor } from '../standards/moduleScope';
import { ReviewStatusChip } from './ReviewPanel';

/**
 * Slim module bar: title, one-line purpose, evidence status and a "Guide" button.
 * DESIGN.md §1.1: the how-to stays closed so the instrument is above the fold; it opens on demand
 * and the choice is remembered per module on this device.
 */
export function ModuleGuidePanel({
  moduleId,
  locale,
  onOpenReview,
}: {
  moduleId: string;
  locale: LocaleCode;
  onOpenReview: () => void;
}) {
  const g = guideFor(moduleId);
  const scope = scopeFor(moduleId);
  const key = `oa4d-guide2-${moduleId}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(key) === 'open';
    } catch {
      return false;
    }
  });
  if (!g) return null;
  const fr = locale !== 'en-INT';
  const T = (x: { fr: string; en: string }) => (fr ? x.fr : x.en);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(key, next ? 'open' : 'closed');
    } catch {
      /* private mode */
    }
  };

  return (
    <section className="w-full border-b border-oa-hairline bg-oa-canvas" aria-label={fr ? 'Mode d’emploi du module' : 'Module guide'}>
      <div className="max-w-[1600px] mx-auto px-3 h-9 flex items-center gap-2">
        <h2 className="text-[13px] font-semibold text-white shrink-0">{T(g.title)}</h2>
        {scope?.status === 'prototype' && (
          <span
            className="shrink-0 h-5 px-1.5 rounded border border-amber-500/60 bg-amber-950/50 text-amber-200 text-[11px] font-semibold flex items-center gap-1"
            title={fr ? 'Pas encore revu par des cliniciens nommés' : 'Not yet reviewed by named clinicians'}
          >
            <FlaskConical className="w-3 h-3" aria-hidden />
            {fr ? 'Prototype' : 'Prototype'}
          </span>
        )}
        <span className="hidden lg:inline text-xs text-slate-500 truncate">{T(g.purpose)}</span>
        <div className="ms-auto flex items-center gap-1.5 shrink-0">
          <ReviewStatusChip moduleTab={moduleId} locale={locale} onOpen={onOpenReview} />
          <button
            onClick={toggle}
            aria-expanded={open}
            className={`h-6 px-2 rounded border text-[11px] flex items-center gap-1 cursor-pointer ${open ? 'border-slate-400 bg-oa-hover text-white' : 'border-oa-hairline text-slate-300 hover:border-slate-500'}`}
          >
            <CircleHelp className="w-3.5 h-3.5" />
            {fr ? 'Guide' : 'Guide'}
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      {scope?.status === 'prototype' && (
        <p className="max-w-[1600px] mx-auto px-3 pb-1.5 -mt-1 text-[12px] leading-snug text-amber-200/90">
          <span className="font-semibold">{fr ? 'Pas encore modélisé : ' : 'Not modelled yet: '}</span>
          {T(scope.notModelled)}
        </p>
      )}
      {open && (
        <div className="max-w-[1600px] mx-auto px-3 pb-3 pt-2 grid gap-4 md:grid-cols-3 text-xs text-slate-300 border-t border-oa-hairline">
          <p className="md:col-span-3 text-slate-400">{T(g.purpose)}</p>
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">{fr ? 'Ce que vous apprenez' : 'What you learn'}</h3>
            <ul className="space-y-1 list-disc ps-4">
              {g.learn.map((x, i) => (
                <li key={i}>{T(x)}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">{fr ? 'Comment l’utiliser' : 'How to use it'}</h3>
            <ol className="space-y-1 list-decimal ps-4">
              {g.steps.map((x, i) => (
                <li key={i}>{T(x)}</li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">{fr ? 'À savoir' : 'Good to know'}</h3>
            <ul className="space-y-1 list-disc ps-4">
              {g.watch.map((x, i) => (
                <li key={i}>{T(x)}</li>
              ))}
            </ul>
            {g.teach && (
              <p className="mt-2 border-s-2 border-slate-600 ps-2 text-slate-300">
                <span className="font-semibold">{fr ? 'Pour l’enseignant : ' : 'For teachers: '}</span>
                {T(g.teach)}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
