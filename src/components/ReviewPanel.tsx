import { useMemo, useState } from 'react';
import { BadgeCheck, BookMarked, Flag, Shapes, X } from 'lucide-react';
import { claimsForModule, statusCounts, type ClaimStatus, type ClinicalClaim } from '../standards/claimRegistry';
import type { LocaleCode } from '../standards/clinicalStandards';
import { reportMistake } from '../utils/reportIssue';

const STATUS_META: Record<ClaimStatus, { label: Record<'fr' | 'en' | 'ar', string>; cls: string; Icon: typeof BadgeCheck }> = {
  sourced: {
    label: { fr: 'Sourcé', en: 'Sourced', ar: 'موثّق' },
    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    Icon: BadgeCheck,
  },
  'from-memory': {
    label: { fr: 'À vérifier', en: 'To verify', ar: 'للتحقق' },
    cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    Icon: BookMarked,
  },
  illustrative: {
    label: { fr: 'Illustratif', en: 'Illustrative', ar: 'توضيحي' },
    cls: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
    Icon: Shapes,
  },
};

const lang = (l: LocaleCode): 'fr' | 'en' | 'ar' => (l.startsWith('fr') ? 'fr' : l === 'ar-MA' ? 'ar' : 'en');

export const BETA_NOTICE: Record<LocaleCode, string> = {
  'fr-FR': 'Bêta — relecture clinique en cours. Chaque donnée indique son niveau de preuve.',
  'fr-CA': 'Bêta — révision clinique en cours. Chaque donnée indique son niveau de preuve.',
  'en-INT': 'Beta — clinical review in progress. Every number shows its source status.',
  'ar-MA': 'نسخة تجريبية — المراجعة السريرية جارية. كل معلومة تُظهر مستوى توثيقها.',
};

/** Compact chip: "12 sourced · 20 to verify · 9 illustrative" for the active module. */
export function ReviewStatusChip({ moduleTab, locale, onOpen }: { moduleTab: string; locale: LocaleCode; onOpen: () => void }) {
  const counts = useMemo(() => statusCounts(claimsForModule(moduleTab)), [moduleTab]);
  const L = lang(locale);
  return (
    <button
      onClick={onOpen}
      className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:border-slate-500 text-[10px] font-mono cursor-pointer"
      title="Clinical review status of this module"
    >
      {(Object.keys(STATUS_META) as ClaimStatus[]).map((s) => (
        <span key={s} className={`px-1.5 py-0.5 rounded border ${STATUS_META[s].cls}`}>
          {counts[s]} {STATUS_META[s].label[L]}
        </span>
      ))}
    </button>
  );
}

/** Slide-over listing every claim of the active module with its status and a report button. */
export function ReviewDrawer({ moduleTab, locale, onClose }: { moduleTab: string; locale: LocaleCode; onClose: () => void }) {
  const claims = useMemo(() => claimsForModule(moduleTab), [moduleTab]);
  const [toast, setToast] = useState<string | null>(null);
  const L = lang(locale);

  const report = async (claim?: ClinicalClaim) => {
    const r = await reportMistake({ moduleTab, locale, claim });
    setToast(
      r === 'opened'
        ? L === 'fr' ? 'Formulaire GitHub ouvert.' : 'GitHub report form opened.'
        : r === 'copied'
          ? L === 'fr'
            ? 'Rapport copié : collez-le dans un message aux mainteneurs du projet.'
            : 'Report copied — paste it into a message to the project maintainers.'
          : L === 'fr' ? 'Copie impossible : sélectionnez le texte manuellement.' : 'Could not copy — please select the text manually.'
    );
    setTimeout(() => setToast(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-xl bg-[#0d1422] border-l border-slate-800 h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-sm">
              {L === 'fr' ? 'Statut de relecture clinique' : 'Clinical review status'} — {moduleTab.replace('_', '+')}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              {L === 'fr'
                ? 'Sourcé = vérifié dans une source primaire ouverte. À vérifier = connaissance de manuel saisie sans ouvrir la source. Illustratif = forme pédagogique du simulateur, pas une mesure.'
                : 'Sourced = checked in a primary source that was opened. To verify = textbook knowledge entered without opening the source. Illustrative = a teaching shape chosen by the simulator, not a measurement.'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white cursor-pointer shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
          {claims.map((c) => {
            const meta = STATUS_META[c.status];
            return (
              <div key={c.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-100 leading-relaxed">{c.claim}</span>
                  <span className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${meta.cls}`}>
                    <meta.Icon className="w-3 h-3" />
                    {meta.label[L]}
                  </span>
                </div>
                {c.value && <div className="font-mono text-[11px] text-cyan-300">{c.value}</div>}
                {c.source && <div className="text-[10px] text-emerald-300/90">{c.source}</div>}
                {c.note && <div className="text-[10px] text-amber-200/80">{c.note}</div>}
                <div className="flex justify-between items-center pt-0.5">
                  <span className="font-mono text-[9px] text-slate-500">{c.id}</span>
                  <button onClick={() => report(c)} className="flex items-center gap-1 text-[10px] text-rose-300 hover:text-rose-200 cursor-pointer">
                    <Flag className="w-3 h-3" /> {L === 'fr' ? 'Signaler' : 'Report'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-800 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-300 min-h-4">{toast}</span>
          <button
            onClick={() => report()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Flag className="w-3.5 h-3.5" /> {L === 'fr' ? 'Signaler une erreur' : 'Report a mistake'}
          </button>
        </div>
      </div>
    </div>
  );
}
