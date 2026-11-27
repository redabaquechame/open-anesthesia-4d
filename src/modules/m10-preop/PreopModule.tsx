import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ClipboardList, Clock, Stethoscope, XCircle } from 'lucide-react';
import type { LocaleCode } from '../../standards/clinicalStandards';
import { CLAIMS } from '../../standards/claimRegistry';
import { EVIDENCE_REGISTRY } from '../../evidence/evidenceRegistry';
import type { ScoreDef, Txt } from './preopTypes';
import { CASES, FASTING, SCORES } from './preopScores';
import { bandForPicks, scoreTotal } from './preopMath';

type Tab = 'cases' | 'scores' | 'fasting';
type Answers = Record<string, Record<string, number>>;

const TONE: Record<'ok' | 'warn' | 'bad', string> = {
  ok: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40',
  warn: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
  bad: 'text-rose-300 border-rose-500/40 bg-rose-950/50',
};


function ScoreCard({
  def,
  picks,
  onPick,
  T,
  L,
  answerKey,
}: {
  def: ScoreDef;
  picks: Record<string, number> | undefined;
  onPick: (itemId: string, idx: number) => void;
  T: (t: Txt) => string;
  L: (f: string, e: string) => string;
  answerKey?: Record<string, number>;
}) {
  const total = scoreTotal(def, picks);
  const band = bandForPicks(def, picks);
  const claim = CLAIMS.find((c) => c.id === def.claimId);
  const ev = def.evidenceId ? EVIDENCE_REGISTRY.find((e) => e.id === def.evidenceId) : undefined;
  return (
    <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-3 flex flex-col gap-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-cyan-300 text-sm">{T(def.name)}</div>
          <div className="text-slate-400">{T(def.predicts)}</div>
        </div>
        <div className="font-mono text-lg text-white shrink-0">{total}</div>
      </div>
      <div className="flex flex-col gap-1.5">
        {def.items.map((it) => {
          const cur = picks?.[it.id] ?? 0;
          const wrong = answerKey && answerKey[it.id] !== undefined && answerKey[it.id] !== cur;
          return (
            <div key={it.id} className={`rounded-lg border px-2 py-1.5 ${wrong ? 'border-rose-500/60 bg-rose-950/30' : 'border-slate-800 bg-slate-950/60'}`}>
              <div className="text-slate-200">{T(it.label)}</div>
              {it.hint && <div className="text-[10px] text-slate-500">{T(it.hint)}</div>}
              <div className="flex flex-wrap gap-1 mt-1">
                {it.options.map((o, i) => (
                  <button
                    key={i}
                    onClick={() => onPick(it.id, i)}
                    className={`px-1.5 py-0.5 rounded border text-[11px] cursor-pointer ${cur === i ? 'bg-cyan-700 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                  >
                    {T(o.label)}
                    {o.points !== 0 && <span className="font-mono text-[10px] opacity-75"> {o.points > 0 ? '+' : ''}{o.points}</span>}
                  </button>
                ))}
              </div>
              {wrong && <div className="text-[10px] text-rose-300 mt-0.5">{L('Réponse attendue', 'Expected')} : {T(it.options[answerKey![it.id]].label)}</div>}
            </div>
          );
        })}
      </div>
      {band && (
        <div className={`rounded-lg border p-2 ${TONE[band.tone]}`}>
          <div className="font-bold">{T(band.label)}</div>
          <div className="text-slate-200">{T(band.risk)}</div>
        </div>
      )}
      {def.limits && <div className="text-[10px] text-slate-400">{L('Limites', 'Limits')} : {T(def.limits)}</div>}
      {(claim?.source || ev) && (
        <a href={ev?.sourceUrl} target="_blank" rel="noreferrer" className="flex items-start gap-1 text-[10px] text-cyan-400 hover:underline">
          <BookOpen className="w-3 h-3 shrink-0 mt-0.5" /> {ev?.sourceCitation ?? claim?.source}
        </a>
      )}
    </div>
  );
}

export function PreopModule({ locale }: { locale: LocaleCode }) {
  const fr = locale !== 'en-INT';
  const T = (t: Txt) => (fr ? t.fr : t.en);
  const L = (f: string, e: string) => (fr ? f : e);

  const [tab, setTab] = useState<Tab>('cases');
  const [free, setFree] = useState<Answers>({});
  const [caseId, setCaseId] = useState(CASES[0]?.id ?? '');
  const [caseAnswers, setCaseAnswers] = useState<Answers>({});
  const [checked, setChecked] = useState(false);
  const [lastIntake, setLastIntake] = useState<Record<string, string>>({});
  const [population, setPopulation] = useState<'adult' | 'child'>('adult');

  const kase = CASES.find((c) => c.id === caseId);
  const caseScores = useMemo(() => SCORES.filter((s) => kase && kase.answers[s.id]), [kase]);

  const pick = (setter: typeof setFree) => (scoreId: string) => (itemId: string, idx: number) =>
    setter((a) => ({ ...a, [scoreId]: { ...(a[scoreId] ?? {}), [itemId]: idx } }));

  const caseResult = useMemo(() => {
    if (!kase) return null;
    let right = 0;
    let total = 0;
    for (const [sid, items] of Object.entries(kase.answers)) {
      for (const [iid, idx] of Object.entries(items)) {
        total++;
        if ((caseAnswers[sid]?.[iid] ?? 0) === idx) right++;
      }
    }
    return { right, total };
  }, [kase, caseAnswers]);

  // Fasting: earliest induction time = max(last intake + hours).
  const fastingRules = FASTING.filter((f) => f.population === 'both' || f.population === population);
  const earliest = useMemo(() => {
    let best: Date | null = null;
    for (const r of fastingRules) {
      const v = lastIntake[r.id];
      if (!v) continue;
      const [h, m] = v.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      const ready = new Date(d.getTime() + r.hours * 3600e3);
      if (!best || ready > best) best = ready;
    }
    return best;
  }, [lastIntake, fastingRules]);

  return (
    <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-bold text-cyan-300 mr-2">
          <Stethoscope className="w-4 h-4" /> {L('Consultation pré-anesthésique', 'Pre-operative assessment')}
        </span>
        {(
          [
            ['cases', L('Cas cliniques', 'Clinical cases'), ClipboardList],
            ['scores', L('Scores de risque', 'Risk scores'), Stethoscope],
            ['fasting', L('Jeûne préopératoire', 'Pre-operative fasting'), Clock],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1 cursor-pointer ${tab === id ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'cases' && kase && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <aside className="lg:col-span-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {CASES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCaseId(c.id); setCaseAnswers({}); setChecked(false); }}
                  className={`px-2 py-1 rounded-lg border text-xs cursor-pointer ${c.id === caseId ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}
                >
                  {T(c.title)}
                </button>
              ))}
            </div>
            <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 whitespace-pre-line leading-relaxed">{T(kase.story)}</div>
            <button
              onClick={() => setChecked(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs cursor-pointer self-start"
            >
              {L('Corriger', 'Check my answers')}
            </button>
            {checked && caseResult && (
              <div className="bg-[#0b1220] border border-cyan-700/50 rounded-xl p-3 text-xs flex flex-col gap-1.5">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  {caseResult.right === caseResult.total ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-amber-400" />}
                  {caseResult.right}/{caseResult.total} {L('items corrects', 'items correct')}
                </div>
                <div className="font-bold text-slate-200 mt-1">{L('Points clés', 'Teaching points')}</div>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  {kase.teaching.map((t, i) => {
                    const c = CLAIMS.find((x) => x.id === t.claimId);
                    return (
                      <li key={i}>
                        {T(t.text)}
                        {c?.source && <span className="block text-[10px] text-slate-500">{c.source}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </aside>
          <section className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
            {caseScores.map((s) => (
              <ScoreCard
                key={s.id}
                def={s}
                picks={caseAnswers[s.id]}
                onPick={pick(setCaseAnswers)(s.id)}
                T={T}
                L={L}
                answerKey={checked ? kase.answers[s.id] : undefined}
              />
            ))}
          </section>
        </div>
      )}

      {tab === 'scores' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 content-start">
          {SCORES.map((s) => (
            <ScoreCard key={s.id} def={s} picks={free[s.id]} onPick={pick(setFree)(s.id)} T={T} L={L} />
          ))}
        </div>
      )}

      {tab === 'fasting' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-3 text-xs flex flex-col gap-2">
            <div className="flex gap-1.5">
              {(['adult', 'child'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPopulation(p)}
                  className={`px-2 py-1 rounded-lg border cursor-pointer ${population === p ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}
                >
                  {p === 'adult' ? L('Adulte', 'Adult') : L('Enfant', 'Child')}
                </button>
              ))}
            </div>
            <div className="text-slate-400">{L('Heure de la dernière prise (laisser vide si aucune) :', 'Time of the last intake (leave empty if none):')}</div>
            {fastingRules.map((r) => {
              const c = CLAIMS.find((x) => x.id === r.claimId);
              return (
                <label key={r.id} className="flex items-center justify-between gap-2 border border-slate-800 rounded-lg px-2 py-1.5 bg-slate-950/60">
                  <span>
                    <span className="text-slate-200">{T(r.intake)}</span>
                    <span className="font-mono text-amber-300"> ≥ {r.hours} h</span>
                    {r.note && <span className="block text-[10px] text-slate-500">{T(r.note)}</span>}
                    {c?.source && <span className="block text-[10px] text-slate-600">{c.source}</span>}
                  </span>
                  <input
                    type="time"
                    value={lastIntake[r.id] ?? ''}
                    onChange={(e) => setLastIntake((s) => ({ ...s, [r.id]: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-slate-100"
                  />
                </label>
              );
            })}
          </div>
          <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-3 text-xs flex flex-col gap-2">
            <div className="font-bold text-cyan-300">{L('Induction possible à partir de', 'Earliest induction time')}</div>
            <div className="font-mono text-3xl text-white">
              {earliest ? earliest.toLocaleTimeString(fr ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
            <p className="text-slate-400">
              {L(
                'Règles pour patients sans facteur de vidange gastrique retardée. Diabète, grossesse, obésité, agonistes du GLP-1, urgence : appliquer les règles spécifiques et votre protocole local.',
                'Rules for patients without delayed gastric emptying. Diabetes, pregnancy, obesity, GLP-1 agonists, emergencies: apply the specific rules and your local protocol.'
              )}
            </p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-500">
        {L(
          'Outil pédagogique, pas un dispositif médical : ne remplace pas le jugement clinique ni les protocoles locaux.',
          'Teaching tool, not a medical device: it does not replace clinical judgement or local protocols.'
        )}
      </p>
    </main>
  );
}
