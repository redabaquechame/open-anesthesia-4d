import { useState } from 'react';
import { ChevronDown, ChevronRight, Compass } from 'lucide-react';
import type { LocaleCode } from '../standards/clinicalStandards';
import { guideFor } from '../standards/moduleGuides';

/**
 * Collapsible "what is this and how do I use it" panel shown above every module.
 * Open the first time a module is visited on this device, then remembers the user's choice.
 */
export function ModuleGuidePanel({ moduleId, locale }: { moduleId: string; locale: LocaleCode }) {
  const g = guideFor(moduleId);
  const key = `oa4d-guide-${moduleId}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(key) !== 'closed';
    } catch {
      return true;
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
    <section className="max-w-[1600px] w-full mx-auto px-3 pt-3" aria-label={fr ? 'Mode d’emploi du module' : 'Module guide'}>
      <div className="rounded-xl border border-cyan-900/60 bg-[#0b1626]">
        <button
          onClick={toggle}
          aria-expanded={open}
          className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer"
        >
          <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-sm font-semibold text-white">{T(g.title)}</span>
          <span className="hidden md:inline text-xs text-slate-400 truncate">— {T(g.purpose)}</span>
          <span className="ms-auto flex items-center gap-1 text-[11px] text-cyan-300 shrink-0">
            {open ? (fr ? 'Masquer le mode d’emploi' : 'Hide guide') : fr ? 'Mode d’emploi' : 'How to use'}
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        </button>
        {open && (
          <div className="px-3 pb-3 grid gap-3 md:grid-cols-3 text-xs text-slate-300 border-t border-cyan-900/40 pt-3">
            <p className="md:hidden text-slate-400">{T(g.purpose)}</p>
            <div>
              <h3 className="text-[11px] uppercase tracking-wide text-cyan-300 font-semibold mb-1.5">
                {fr ? 'Ce que vous apprenez' : 'What you learn'}
              </h3>
              <ul className="space-y-1 list-disc ps-4">
                {g.learn.map((x, i) => (
                  <li key={i}>{T(x)}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] uppercase tracking-wide text-cyan-300 font-semibold mb-1.5">
                {fr ? 'Comment l’utiliser' : 'How to use it'}
              </h3>
              <ol className="space-y-1 list-decimal ps-4">
                {g.steps.map((x, i) => (
                  <li key={i}>{T(x)}</li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="text-[11px] uppercase tracking-wide text-cyan-300 font-semibold mb-1.5">
                {fr ? 'À savoir' : 'Good to know'}
              </h3>
              <ul className="space-y-1 list-disc ps-4">
                {g.watch.map((x, i) => (
                  <li key={i}>{T(x)}</li>
                ))}
              </ul>
              {g.teach && (
                <p className="mt-2 rounded-lg border border-indigo-800/60 bg-indigo-950/30 px-2 py-1.5 text-indigo-200">
                  <span className="font-semibold">{fr ? 'Pour l’enseignant : ' : 'For teachers: '}</span>
                  {T(g.teach)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
