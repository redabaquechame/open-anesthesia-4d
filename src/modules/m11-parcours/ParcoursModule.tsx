import { useEffect, useMemo, useState } from 'react';
import { BookMarked, CheckCircle2, Circle, Download, ExternalLink, FileText, GraduationCap, Library, Printer, Scale, Search } from 'lucide-react';
import type { LocaleCode } from '../../standards/clinicalStandards';
import type { AppModuleId, OfficialResource, Programme, RegionId, ResourceKind } from '../../standards/programmeTypes';
import { PROGRAMMES } from '../../standards/programmes';
import { OFFICIAL_RESOURCES } from '../../standards/officialResources';
import { DOMAINS } from '../../standards/curriculum';

const STORAGE_KEY = 'oa4d.parcours.v1';

const REGION_ORDER: { id: RegionId; label: string; flag: string }[] = [
  { id: 'ma', label: 'Maroc', flag: '🇲🇦' },
  { id: 'fr', label: 'France', flag: '🇫🇷' },
  { id: 'ca', label: 'Canada / Québec', flag: '🇨🇦' },
  { id: 'eu', label: 'Europe', flag: '🇪🇺' },
];

const DEFAULT_REGION: Record<LocaleCode, RegionId> = { 'ar-MA': 'ma', 'fr-FR': 'fr', 'fr-CA': 'ca', 'en-INT': 'eu' };

const MODULE_LABEL: Record<AppModuleId, string> = {
  M1_M2: 'M1+M2 Poste & ventilation',
  M3: 'M3 Halogénés',
  M4: 'M4 AIVOC & EEG',
  M5: 'M5 Curares',
  M6: 'M6 Écho-ALR & cœur',
  M7: 'M7 Rachis & péridurale',
  M8: 'M8 Fibroscopie & DLT',
  M9: 'M9 Crises',
  M10: 'M10 Consultation',
  M11: 'M11 Parcours',
};

const READING_CLS: Record<string, string> = {
  'texte intégral': 'border-emerald-500/50 text-emerald-300',
  résumé: 'border-amber-500/50 text-amber-300',
  synthèse: 'border-amber-500/50 text-amber-300',
  'non ouvert': 'border-rose-500/50 text-rose-300',
};

type Progress = Record<string, string>; // item id → ISO date when ticked

function loadProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Progress;
  } catch {
    return {};
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

function printPortfolio(p: Programme, progress: Progress) {
  const total = p.stages.reduce((n, s) => n + s.items.length, 0);
  const done = p.stages.reduce((n, s) => n + s.items.filter((i) => progress[i.id]).length, 0);
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Portfolio — ${esc(p.label)}</title>
<style>body{font:13px/1.45 system-ui,sans-serif;max-width:820px;margin:24px auto;color:#111}h1{font-size:20px}h2{font-size:15px;margin-top:20px;border-bottom:1px solid #ccc}
li{margin:3px 0}.ok{color:#0a7a3a}.no{color:#999}small{color:#555}</style></head><body>
<h1>Portfolio de compétences — ${esc(p.label)}</h1>
<p><small>${esc(p.officialTitle)} · ${esc(p.body)} · ${esc(p.version)}<br>Progression auto-déclarée : ${done}/${total} · imprimé le ${new Date().toLocaleDateString('fr-FR')}<br>
Outil pédagogique (Open Anesthesia 4D) — ne remplace pas le portfolio ni l’évaluation officiels.</small></p>
${p.stages
  .map(
    (s) => `<h2>${esc(s.title)}${s.duration ? ` <small>(${esc(s.duration)})</small>` : ''}</h2><ul>${s.items
      .map((i) => `<li class="${progress[i.id] ? 'ok' : 'no'}">${progress[i.id] ? '☑' : '☐'} ${esc(i.text)}${progress[i.id] ? ` <small>— ${new Date(progress[i.id]).toLocaleDateString('fr-FR')}</small>` : ''}</li>`)
      .join('')}</ul>`
  )
  .join('')}
<p><small>Source : ${esc(p.url)}</small></p></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function exportProgress(progress: Progress) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ app: 'open-anesthesia-4d', version: 1, progress }, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'parcours-anesthesie.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function ResourceCard({ r, onNavigate }: { r: OfficialResource; onNavigate?: (m: AppModuleId) => void }) {
  return (
    <div id={`res-${r.id}`} className="border border-slate-800 rounded-lg p-2.5 bg-slate-950/60 text-xs scroll-mt-24">
      <div className="flex items-start justify-between gap-2">
        <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-slate-100 hover:text-cyan-300 hover:underline">
          {r.title} <ExternalLink className="inline w-3 h-3" />
        </a>
        <span className="shrink-0 font-mono text-[10px] text-slate-400">{r.year}</span>
      </div>
      {r.originalTitle && <div className="text-[10px] italic text-slate-500">{r.originalTitle}</div>}
      <div className="text-[11px] text-slate-400 mt-0.5">
        {r.body}
        {r.citation && <> · {r.citation}</>}
      </div>
      <div className="flex flex-wrap gap-1 mt-1 text-[10px]">
        <span className="px-1.5 rounded border border-slate-700 text-slate-300">{r.kind}</span>
        <span className={`px-1.5 rounded border ${READING_CLS[r.reading]}`}>lu : {r.reading}</span>
        <span className="px-1.5 rounded border border-slate-700 text-slate-400">accès : {r.access}</span>
        {r.licence && <span className="px-1.5 rounded border border-slate-700 text-slate-400">{r.licence}</span>}
      </div>
      {r.keyPoints && r.keyPoints.length > 0 && (
        <ul className="list-disc pl-4 mt-1.5 space-y-0.5 text-slate-300">
          {r.keyPoints.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ul>
      )}
      {r.modules && r.modules.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {r.modules.map((m) => (
            <button key={m} onClick={() => onNavigate?.(m)} className="px-1.5 py-0.5 rounded bg-cyan-900/40 border border-cyan-700/50 text-cyan-200 text-[10px] hover:bg-cyan-800/60 cursor-pointer">
              ▶ {MODULE_LABEL[m]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ParcoursModule({ locale, onNavigate }: { locale: LocaleCode; onNavigate?: (m: AppModuleId) => void }) {
  const [view, setView] = useState<'programme' | 'library'>('programme');
  const [region, setRegion] = useState<RegionId>(DEFAULT_REGION[locale] ?? 'fr');
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<ResourceKind | 'all'>('all');
  const [libRegion, setLibRegion] = useState<string>('all');
  const [domain, setDomain] = useState<string>('all');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      /* private mode: progress lives for this session only */
    }
  }, [progress]);

  const programmes = PROGRAMMES.filter((p) => p.region === region);
  const [pid, setPid] = useState<string | undefined>(programmes[0]?.id);
  const programme = programmes.find((p) => p.id === pid) ?? programmes[0];

  const toggle = (id: string) =>
    setProgress((pr) => {
      const n = { ...pr };
      if (n[id]) delete n[id];
      else n[id] = new Date().toISOString();
      return n;
    });

  const resourcesById = useMemo(() => new Map(OFFICIAL_RESOURCES.map((r) => [r.id, r])), []);
  const domainName = (id?: string) => DOMAINS.find((d) => d.id === id)?.name.fr;

  const library = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return OFFICIAL_RESOURCES.filter(
      (r) =>
        (kind === 'all' || r.kind === kind) &&
        (libRegion === 'all' || r.region === libRegion) &&
        (domain === 'all' || r.domains.includes(domain)) &&
        (!needle || `${r.title} ${r.originalTitle ?? ''} ${r.body} ${r.citation ?? ''} ${(r.keyPoints ?? []).join(' ')}`.toLowerCase().includes(needle))
    ).sort((a, b) => b.year - a.year);
  }, [q, kind, libRegion, domain]);

  const openResource = (id: string) => {
    setView('library');
    setQ('');
    setKind('all');
    setLibRegion('all');
    setDomain('all');
    setTimeout(() => document.getElementById(`res-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const total = programme ? programme.stages.reduce((n, s) => n + s.items.length, 0) : 0;
  const done = programme ? programme.stages.reduce((n, s) => n + s.items.filter((i) => progress[i.id]).length, 0) : 0;

  return (
    <main className="flex-1 max-w-[1200px] w-full mx-auto p-3 flex flex-col gap-3 text-slate-200">
      <section className="bg-[#0b1220] border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-cyan-300 flex items-center gap-2">
            <GraduationCap className="w-5 h-5" /> Parcours officiel de l’interne en anesthésie-réanimation
          </h2>
          <div className="flex gap-1.5 text-xs">
            <button onClick={() => setView('programme')} className={`px-2.5 py-1 rounded-lg border cursor-pointer flex items-center gap-1 ${view === 'programme' ? 'bg-cyan-700 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
              <BookMarked className="w-3.5 h-3.5" /> Programmes
            </button>
            <button onClick={() => setView('library')} className={`px-2.5 py-1 rounded-lg border cursor-pointer flex items-center gap-1 ${view === 'library' ? 'bg-cyan-700 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
              <Library className="w-3.5 h-3.5" /> Bibliothèque officielle ({OFFICIAL_RESOURCES.length})
            </button>
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          Les programmes officiels de formation, reformulés en français et reliés aux simulations de la plateforme. Chaque document indique comment il a été lu (texte intégral, résumé). Cochez les compétences travaillées : votre progression reste sur votre appareil (hors ligne, sans compte).
        </p>
      </section>

      {view === 'programme' && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {REGION_ORDER.map((r) => {
              const n = PROGRAMMES.filter((p) => p.region === r.id).length;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setRegion(r.id);
                    setPid(PROGRAMMES.find((p) => p.region === r.id)?.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${region === r.id ? 'bg-cyan-700/70 border-cyan-400 text-white font-semibold' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                >
                  {r.flag} {r.label} <span className="text-[10px] text-slate-400">({n})</span>
                </button>
              );
            })}
          </div>

          {programmes.length > 1 && (
            <div className="flex flex-wrap gap-1.5 text-xs">
              {programmes.map((p) => (
                <button key={p.id} onClick={() => setPid(p.id)} className={`px-2 py-1 rounded border cursor-pointer ${programme?.id === p.id ? 'bg-slate-700 border-slate-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {!programme && <div className="text-sm text-slate-400 p-4">Programme en cours de constitution pour cette région.</div>}

          {programme && (
            <>
              <section className="bg-[#0b1220] border border-slate-800 rounded-xl p-3 text-xs flex flex-col gap-1.5">
                <a href={programme.url} target="_blank" rel="noreferrer" className="font-semibold text-sm text-white hover:text-cyan-300 hover:underline">
                  {programme.flag} {programme.officialTitle} <ExternalLink className="inline w-3.5 h-3.5" />
                </a>
                <div className="text-slate-400">
                  {programme.body} · {programme.version} · <span className="text-slate-200">durée : {programme.duration}</span> ·{' '}
                  <span className={`px-1 rounded border ${READING_CLS[programme.reading]}`}>lu : {programme.reading}</span>
                </div>
                <p className="text-slate-300">{programme.structure}</p>
                {programme.assessment && (
                  <p className="text-slate-300">
                    <span className="font-semibold text-slate-100">Évaluation : </span>
                    {programme.assessment}
                  </p>
                )}
                {programme.legal && programme.legal.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-100 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5" /> Textes officiels
                    </span>
                    {programme.legal.map((l) => (
                      <a key={l.url + l.title} href={l.url} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
                        {l.title}
                      </a>
                    ))}
                  </div>
                )}
                {programme.caveats && programme.caveats.length > 0 && (
                  <ul className="text-amber-300/90 list-disc pl-4">
                    {programme.caveats.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
                <div className="text-[10px] text-slate-500">Droits : {programme.reuse}</div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[160px] h-2 rounded bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${total ? (100 * done) / total : 0}%` }} />
                  </div>
                  <span className="font-mono text-slate-300">
                    {done}/{total}
                  </span>
                  <button onClick={() => printPortfolio(programme, progress)} className="px-2 py-1 rounded border border-slate-700 bg-slate-900 hover:border-slate-500 cursor-pointer flex items-center gap-1">
                    <Printer className="w-3.5 h-3.5" /> Imprimer mon portfolio
                  </button>
                  <button onClick={() => exportProgress(progress)} className="px-2 py-1 rounded border border-slate-700 bg-slate-900 hover:border-slate-500 cursor-pointer flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Exporter
                  </button>
                </div>
              </section>

              {programme.stages.map((s) => {
                const sd = s.items.filter((i) => progress[i.id]).length;
                return (
                  <section key={s.id} className="bg-[#0b1220] border border-slate-800 rounded-xl p-3 text-xs flex flex-col gap-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-bold text-slate-100 text-sm">
                        {s.title} {s.duration && <span className="text-[11px] font-normal text-slate-400">· {s.duration}</span>}
                      </h3>
                      <span className="font-mono text-[10px] text-slate-400">
                        {sd}/{s.items.length}
                      </span>
                    </div>
                    {s.summary && <p className="text-slate-400">{s.summary}</p>}
                    {s.placements && s.placements.length > 0 && (
                      <div className="text-slate-300">
                        <span className="font-semibold text-slate-100">Stages : </span>
                        {s.placements.join(' · ')}
                      </div>
                    )}
                    <ul className="flex flex-col gap-1">
                      {s.items.map((i) => {
                        const ok = !!progress[i.id];
                        return (
                          <li key={i.id} className="flex gap-2 items-start rounded-lg px-1.5 py-1 hover:bg-slate-900/70">
                            <button onClick={() => toggle(i.id)} aria-label={ok ? 'Décocher' : 'Cocher'} className="mt-0.5 cursor-pointer shrink-0">
                              {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-slate-500" />}
                            </button>
                            <div className="flex-1">
                              <span className={ok ? 'text-slate-400 line-through decoration-slate-600' : 'text-slate-200'}>{i.text}</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {i.domain && <span className="text-[10px] text-slate-500">{domainName(i.domain)}</span>}
                                {(i.modules ?? []).map((m) => (
                                  <button key={m} onClick={() => onNavigate?.(m)} className="px-1.5 rounded bg-cyan-900/40 border border-cyan-700/50 text-cyan-200 text-[10px] hover:bg-cyan-800/60 cursor-pointer">
                                    ▶ {MODULE_LABEL[m]}
                                  </button>
                                ))}
                                {(i.resources ?? []).map((rid) => {
                                  const r = resourcesById.get(rid);
                                  return r ? (
                                    <button key={rid} onClick={() => openResource(rid)} className="px-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] hover:border-slate-500 cursor-pointer flex items-center gap-0.5">
                                      <FileText className="w-3 h-3" /> {r.body.split(/[ (/]/)[0]} {r.year}
                                    </button>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </>
          )}
        </>
      )}

      {view === 'library' && (
        <>
          <section className="bg-[#0b1220] border border-slate-800 rounded-xl p-3 flex flex-wrap gap-2 text-xs items-center">
            <label className="flex items-center gap-1 flex-1 min-w-[200px] bg-slate-900 border border-slate-700 rounded px-2 py-1">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (titre, société, dose, mot-clé)…" className="bg-transparent outline-none flex-1 text-slate-200" />
            </label>
            <select value={libRegion} onChange={(e) => setLibRegion(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1">
              <option value="all">Toutes les régions</option>
              <option value="ma">Maroc</option>
              <option value="fr">France</option>
              <option value="ca">Canada / Québec</option>
              <option value="eu">Europe</option>
              <option value="int">International</option>
              <option value="uk">Royaume-Uni</option>
              <option value="us">États-Unis</option>
              <option value="sn">Sénégal</option>
            </select>
            <select value={kind} onChange={(e) => setKind(e.target.value as ResourceKind | 'all')} className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1">
              <option value="all">Tous les types</option>
              {(['programme', 'texte officiel', 'recommandation', 'protocole', 'examen', 'norme', 'jeu de données', 'logiciel libre'] as ResourceKind[]).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <select value={domain} onChange={(e) => setDomain(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 max-w-[220px]">
              <option value="all">Tous les domaines</option>
              {DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name.fr}
                </option>
              ))}
            </select>
            <span className="text-slate-400 font-mono">{library.length}</span>
          </section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {library.map((r) => (
              <ResourceCard key={r.id} r={r} onNavigate={onNavigate} />
            ))}
          </div>
          {library.length === 0 && <div className="text-slate-400 text-xs p-4">Aucun document ne correspond.</div>}
        </>
      )}

      <p className="text-[10px] text-slate-500 px-1">
        Outil pédagogique libre : ne remplace ni les textes officiels, ni le portfolio, ni l’évaluation de votre faculté ou de votre collège. Les intitulés sont reformulés ; reportez-vous toujours au document original.
      </p>
    </main>
  );
}
