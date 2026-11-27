import { useMemo, useState } from 'react';
import { ExternalLink, GraduationCap, X } from 'lucide-react';
import type { LocaleCode } from '../standards/clinicalStandards';
import { CURRICULA, DOMAINS, type Coverage } from '../standards/curriculum';

const COVERAGE: Record<Coverage, { fr: string; en: string; cls: string }> = {
  covered: { fr: 'Couvert', en: 'Covered', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  partial: { fr: 'Partiel', en: 'Partial', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  gap: { fr: 'À construire', en: 'To build', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/40' },
};

/** Which official programme to show first for each UI locale. */
const DEFAULT_CURRICULUM: Record<LocaleCode, string | undefined> = {
  'fr-FR': CURRICULA.find((c) => c.region === 'fr')?.id,
  'fr-CA': CURRICULA.find((c) => c.region === 'ca')?.id,
  'ar-MA': CURRICULA.find((c) => c.region === 'ma')?.id ?? CURRICULA.find((c) => c.region === 'fr')?.id,
  'en-INT': CURRICULA.find((c) => c.region === 'eu')?.id,
};

export function CurriculumDrawer({ locale, onClose }: { locale: LocaleCode; onClose: () => void }) {
  const fr = locale !== 'en-INT';
  const L = (f: string, e: string) => (fr ? f : e);
  const [cid, setCid] = useState<string | 'all'>(DEFAULT_CURRICULUM[locale] ?? 'all');
  const cur = CURRICULA.find((c) => c.id === cid);
  const rows = useMemo(() => DOMAINS.filter((d) => cid === 'all' || d.listedBy.includes(cid)), [cid]);
  const counts = useMemo(() => {
    const o: Record<Coverage, number> = { covered: 0, partial: 0, gap: 0 };
    rows.forEach((r) => o[r.coverage]++);
    return o;
  }, [rows]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl bg-[#0d1422] border-l border-slate-800 h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-cyan-300" /> {L('Programme officiel et couverture', 'Official curriculum and coverage')}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {L(
                'Domaines exigés par les programmes officiels de formation, et ce que la plateforme couvre déjà. Les zones « À construire » sont la feuille de route.',
                'Domains required by the official training programmes, and what the platform already covers. "To build" areas are the roadmap.'
              )}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3 border-b border-slate-800 flex flex-wrap gap-1.5 text-xs">
          <button onClick={() => setCid('all')} className={`px-2 py-1 rounded border cursor-pointer ${cid === 'all' ? 'bg-cyan-700 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
            {L('Tous', 'All')}
          </button>
          {CURRICULA.map((c) => (
            <button key={c.id} onClick={() => setCid(c.id)} className={`px-2 py-1 rounded border cursor-pointer ${cid === c.id ? 'bg-cyan-700 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
              {c.short}
            </button>
          ))}
        </div>
        {cur && (
          <div className="px-4 pt-3 text-[11px] text-slate-400">
            <a href={cur.url} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline inline-flex items-center gap-1">
              {cur.title} <ExternalLink className="w-3 h-3" />
            </a>
            <div>
              {cur.body} · {cur.version}
              {!cur.opened && <span className="text-amber-300"> · {L('document non ouvert : liste à vérifier', 'document not opened: list to verify')}</span>}
            </div>
          </div>
        )}
        <div className="px-4 pt-2 flex gap-2 text-[10px] font-mono">
          {(Object.keys(COVERAGE) as Coverage[]).map((k) => (
            <span key={k} className={`px-1.5 py-0.5 rounded border ${COVERAGE[k].cls}`}>
              {counts[k]} {fr ? COVERAGE[k].fr : COVERAGE[k].en}
            </span>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {rows.map((d) => (
            <div key={d.id} className="border border-slate-800 rounded-lg p-2.5 bg-slate-950/60 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-100">{fr ? d.name.fr : d.name.en}</span>
                <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] ${COVERAGE[d.coverage].cls}`}>{fr ? COVERAGE[d.coverage].fr : COVERAGE[d.coverage].en}</span>
              </div>
              {d.modules.length > 0 && <div className="text-[10px] font-mono text-cyan-400 mt-0.5">{d.modules.join(' · ')}</div>}
              <div className="text-slate-400 mt-0.5">{fr ? d.note.fr : d.note.en}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {L('Exigé par', 'Required by')} : {d.listedBy.map((id) => CURRICULA.find((c) => c.id === id)?.short ?? id).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
