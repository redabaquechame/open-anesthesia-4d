import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ClipboardList, Clock, Stethoscope, XCircle } from 'lucide-react';
import type { LocaleCode } from '../../standards/clinicalStandards';
import { CLAIMS } from '../../standards/claimRegistry';
import { EVIDENCE_REGISTRY } from '../../evidence/evidenceRegistry';
import type { ScoreDef, Txt } from './preopTypes';
import { CASES, FASTING, SCORES } from './preopScores';
import { bandForPicks, scoreTotal } from './preopMath';

/** Patient-chart mode: a worked clinical case, or free scoring. */
type Tab = 'cases' | 'scores';
type Answers = Record<string, Record<string, number>>;

const FASTING_SECTION = 'fasting';

/** Short tab labels (score names as used in the workbench tab row). Falls back to the full name. */
const SHORT_NAME: Record<string, string> = {
  asa: 'ASA',
  rcri: 'RCRI',
  stopbang: 'STOP-Bang',
  apfel: 'Apfel',
  ariscat: 'ARISCAT',
};

const TONE: Record<'ok' | 'warn' | 'bad', string> = {
  ok: 'text-emerald-300 bg-emerald-950/40',
  warn: 'text-amber-300 bg-amber-950/40',
  bad: 'text-rose-300 bg-rose-950/50',
};

const TONE_TEXT: Record<'ok' | 'warn' | 'bad', string> = {
  ok: 'text-emerald-300',
  warn: 'text-amber-300',
  bad: 'text-rose-300',
};

const BTN_ON = 'bg-oa-hover border-slate-400 text-white';
const BTN_OFF = 'bg-oa-raised border-oa-hairline text-slate-300 hover:border-oa-border-strong';
const PANE = 'bg-oa-surface border border-oa-hairline rounded';
const ROW = 'border-t border-oa-hairline px-3 py-2';

function ScoreSection({
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
    <div className={`${PANE} flex flex-col text-xs`}>
      <div className="px-3 py-2 flex items-start justify-between gap-3">
        <div className="text-start">
          <div className="font-semibold text-slate-100 text-sm">{T(def.name)}</div>
          <div className="text-slate-400">{T(def.predicts)}</div>
        </div>
        <div className="oa-num text-xl text-white shrink-0" dir="ltr">{total}</div>
      </div>
      {def.items.map((it) => {
        const cur = picks?.[it.id] ?? 0;
        const wrong = answerKey && answerKey[it.id] !== undefined && answerKey[it.id] !== cur;
        return (
          <div
            key={it.id}
            className={`${ROW} flex flex-col md:flex-row md:items-start md:justify-between gap-1.5 md:gap-3 ${wrong ? 'bg-rose-950/30 border-s-2 border-s-rose-500/70' : ''}`}
          >
            <div className="text-start md:max-w-[50%]">
              <div className="text-slate-200">{T(it.label)}</div>
              {it.hint && <div className="text-[10px] text-slate-500">{T(it.hint)}</div>}
              {wrong && <div className="text-[10px] text-rose-300 mt-0.5">{L('Réponse attendue', 'Expected')} : {T(it.options[answerKey![it.id]].label)}</div>}
            </div>
            <div className="flex flex-wrap gap-1 md:justify-end">
              {it.options.map((o, i) => (
                <button
                  key={i}
                  onClick={() => onPick(it.id, i)}
                  className={`px-1.5 py-0.5 rounded border text-[11px] cursor-pointer ${cur === i ? BTN_ON : BTN_OFF}`}
                >
                  {T(o.label)}
                  {o.points !== 0 && <span className="oa-num text-[10px] opacity-75" dir="ltr"> {o.points > 0 ? '+' : ''}{o.points}</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {band && (
        <div className={`${ROW} ${TONE[band.tone]}`}>
          <div className="font-bold">{T(band.label)}</div>
          <div className="text-slate-200">{T(band.risk)}</div>
        </div>
      )}
      {def.limits && <div className={`${ROW} text-[10px] text-slate-400`}>{L('Limites', 'Limits')} : {T(def.limits)}</div>}
      {(claim?.source || ev) && (
        <div className={ROW}>
          <a href={ev?.sourceUrl} target="_blank" rel="noreferrer" className="flex items-start gap-1 text-[10px] text-slate-400 hover:text-slate-200 hover:underline">
            <BookOpen className="w-3 h-3 shrink-0 mt-0.5" /> {ev?.sourceCitation ?? claim?.source}
          </a>
        </div>
      )}
    </div>
  );
}

export function PreopModule({ locale }: { locale: LocaleCode }) {
  const fr = locale !== 'en-INT';
  const T = (t: Txt) => (fr ? t.fr : t.en);
  const L = (f: string, e: string) => (fr ? f : e);

  const [tab, setTab] = useState<Tab>('cases');
  const [section, setSection] = useState<string>(SCORES[0]?.id ?? FASTING_SECTION);
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
  const earliestText = earliest ? earliest.toLocaleTimeString(fr ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';

  // Workbench: the scores of the current mode, then fasting.
  const benchScores = tab === 'cases' ? (kase ? caseScores : []) : SCORES;
  const answersFor = tab === 'cases' ? caseAnswers : free;
  const sections = [...benchScores.map((s) => s.id), FASTING_SECTION];
  const active = sections.includes(section) ? section : sections[0];
  const activeScore = benchScores.find((s) => s.id === active);

  const wrongCount = (def: ScoreDef) => {
    if (tab !== 'cases' || !checked || !kase) return 0;
    const key = kase.answers[def.id] ?? {};
    return Object.entries(key).filter(([iid, idx]) => (caseAnswers[def.id]?.[iid] ?? 0) !== idx).length;
  };

  return (
    <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
        <Stethoscope className="w-4 h-4 text-slate-400" /> {L('Consultation pré-anesthésique', 'Pre-operative assessment')}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-3 items-start">
        {/* Patient chart */}
        <aside className={`${PANE} text-xs flex flex-col lg:sticky lg:top-3 lg:max-h-[calc(100dvh-1.5rem)] lg:overflow-y-auto`}>
          <div className="px-3 py-2 flex gap-1">
            {(
              [
                ['cases', L('Cas cliniques', 'Clinical cases'), ClipboardList],
                ['scores', L('Scores de risque', 'Risk scores'), Stethoscope],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 px-2 py-1 rounded border text-xs flex items-center justify-center gap-1 cursor-pointer ${tab === id ? BTN_ON : BTN_OFF}`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {tab === 'cases' && kase && (
            <>
              <div className={`${ROW} flex flex-wrap gap-1`}>
                {CASES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCaseId(c.id); setCaseAnswers({}); setChecked(false); }}
                    className={`px-2 py-0.5 rounded border text-xs cursor-pointer ${c.id === caseId ? BTN_ON : BTN_OFF}`}
                  >
                    {T(c.title)}
                  </button>
                ))}
              </div>
              <div className={`${ROW} text-slate-200 whitespace-pre-line leading-relaxed text-start`}>{T(kase.story)}</div>
              <div className={ROW}>
                <button
                  onClick={() => setChecked(true)}
                  className="px-3 py-1 rounded border border-slate-400 bg-oa-hover hover:bg-oa-raised text-white text-xs cursor-pointer"
                >
                  {L('Corriger', 'Check my answers')}
                </button>
              </div>
              {checked && caseResult && (
                <div className={`${ROW} flex flex-col gap-1.5`}>
                  <div className="font-bold text-slate-100 flex items-center gap-1.5">
                    {caseResult.right === caseResult.total ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-amber-400" />}
                    <span className="oa-num" dir="ltr">{caseResult.right}/{caseResult.total}</span> {L('items corrects', 'items correct')}
                  </div>
                  <div className="font-bold text-slate-200 mt-1">{L('Points clés', 'Teaching points')}</div>
                  <ul className="list-disc ps-4 space-y-1 text-slate-300">
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
            </>
          )}

          {/* Running totals of the scores in the workbench */}
          {benchScores.map((s) => {
            const band = bandForPicks(s, answersFor[s.id]);
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`${ROW} flex items-center justify-between gap-2 text-start cursor-pointer hover:bg-oa-hover ${active === s.id ? 'bg-oa-raised' : ''}`}
              >
                <span className="text-slate-300 truncate">{SHORT_NAME[s.id] ?? T(s.name)}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {band && <span className={`truncate max-w-[150px] ${TONE_TEXT[band.tone]}`}>{T(band.label)}</span>}
                  <span className="oa-num text-white" dir="ltr">{scoreTotal(s, answersFor[s.id])}</span>
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setSection(FASTING_SECTION)}
            className={`${ROW} flex items-center justify-between gap-2 text-start cursor-pointer hover:bg-oa-hover ${active === FASTING_SECTION ? 'bg-oa-raised' : ''}`}
          >
            <span className="text-slate-300 truncate">{L('Induction possible à partir de', 'Earliest induction time')}</span>
            <span className="oa-num text-white shrink-0" dir="ltr">{earliestText}</span>
          </button>
        </aside>

        {/* Score workbench */}
        <section className="flex flex-col gap-2 min-w-0">
          <div className="flex flex-wrap gap-1" role="tablist">
            {benchScores.map((s) => {
              const wrong = wrongCount(s);
              return (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={active === s.id}
                  onClick={() => setSection(s.id)}
                  className={`px-2.5 py-1 rounded border text-xs flex items-center gap-1.5 cursor-pointer ${active === s.id ? BTN_ON : BTN_OFF}`}
                >
                  {SHORT_NAME[s.id] ?? T(s.name)}
                  <span className="oa-num text-slate-400" dir="ltr">{scoreTotal(s, answersFor[s.id])}</span>
                  {wrong > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" aria-hidden />}
                </button>
              );
            })}
            <button
              role="tab"
              aria-selected={active === FASTING_SECTION}
              onClick={() => setSection(FASTING_SECTION)}
              className={`px-2.5 py-1 rounded border text-xs flex items-center gap-1 cursor-pointer ${active === FASTING_SECTION ? BTN_ON : BTN_OFF}`}
            >
              <Clock className="w-3.5 h-3.5" /> {L('Jeûne préopératoire', 'Pre-operative fasting')}
            </button>
          </div>

          {activeScore && (
            <ScoreSection
              key={`${tab}-${activeScore.id}`}
              def={activeScore}
              picks={answersFor[activeScore.id]}
              onPick={pick(tab === 'cases' ? setCaseAnswers : setFree)(activeScore.id)}
              T={T}
              L={L}
              answerKey={tab === 'cases' && checked && kase ? kase.answers[activeScore.id] : undefined}
            />
          )}

          {active === FASTING_SECTION && (
            <div className={`${PANE} text-xs flex flex-col`}>
              <div className="px-3 py-2 flex gap-1">
                {(['adult', 'child'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPopulation(p)}
                    className={`px-2 py-0.5 rounded border cursor-pointer ${population === p ? BTN_ON : BTN_OFF}`}
                  >
                    {p === 'adult' ? L('Adulte', 'Adult') : L('Enfant', 'Child')}
                  </button>
                ))}
              </div>
              <div className={`${ROW} text-slate-400`}>{L('Heure de la dernière prise (laisser vide si aucune) :', 'Time of the last intake (leave empty if none):')}</div>
              {fastingRules.map((r) => {
                const c = CLAIMS.find((x) => x.id === r.claimId);
                return (
                  <label key={r.id} className={`${ROW} flex items-center justify-between gap-3`}>
                    <span className="text-start">
                      <span className="text-slate-200">{T(r.intake)}</span>
                      <span className="oa-num text-amber-300" dir="ltr"> ≥ {r.hours} h</span>
                      {r.note && <span className="block text-[10px] text-slate-500">{T(r.note)}</span>}
                      {c?.source && <span className="block text-[10px] text-slate-600">{c.source}</span>}
                    </span>
                    <input
                      type="time"
                      value={lastIntake[r.id] ?? ''}
                      onChange={(e) => setLastIntake((s) => ({ ...s, [r.id]: e.target.value }))}
                      className="oa-num bg-oa-raised border border-oa-hairline rounded px-1 py-0.5 text-slate-100 shrink-0"
                    />
                  </label>
                );
              })}
              <div className={`${ROW} flex items-baseline justify-between gap-3`}>
                <span className="font-semibold text-slate-200">{L('Induction possible à partir de', 'Earliest induction time')}</span>
                <span className="oa-num text-3xl text-white" dir="ltr">{earliestText}</span>
              </div>
              <p className={`${ROW} text-slate-400`}>
                {L(
                  'Règles pour patients sans facteur de vidange gastrique retardée. Diabète, grossesse, obésité, agonistes du GLP-1, urgence : appliquer les règles spécifiques et votre protocole local.',
                  'Rules for patients without delayed gastric emptying. Diabetes, pregnancy, obesity, GLP-1 agonists, emergencies: apply the specific rules and your local protocol.'
                )}
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="text-[10px] text-slate-500">
        {L(
          'Outil pédagogique, pas un dispositif médical : ne remplace pas le jugement clinique ni les protocoles locaux.',
          'Teaching tool, not a medical device: it does not replace clinical judgement or local protocols.'
        )}
      </p>
    </main>
  );
}
