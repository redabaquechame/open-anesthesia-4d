import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BookOpen, CheckCircle2, Clock, EyeOff, Pause, Play, RotateCcw, Siren, XCircle } from 'lucide-react';
import type { LocaleCode } from '../../standards/clinicalStandards';
import { CLAIMS } from '../../standards/claimRegistry';
import { EVIDENCE_REGISTRY } from '../../evidence/evidenceRegistry';
import type { CrisisProtocol, Txt, Vitals } from './crisisTypes';
import { buildDebrief, doAction, formatDose, modelSequence, startRun, stepRun, type CrisisRun } from './crisisEngine';
import { CRISES } from './crisisProtocols';
import { PatientMonitor } from '../../components/PatientMonitor';

type Mode = 'guided' | 'blind';
const TICK_SEC = 0.5;
const HOME_REGION: Record<LocaleCode, 'ma' | 'fr' | 'ca' | 'eu'> = { 'ar-MA': 'ma', 'fr-FR': 'fr', 'fr-CA': 'ca', 'en-INT': 'eu' };
const REGION_FLAG = { ma: '🇲🇦', fr: '🇫🇷', ca: '🇨🇦', eu: '🇪🇺' } as const;

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function Spark({ data, color, min, max }: { data: number[]; color: string; min: number; max: number }) {
  if (data.length < 2) return <svg className="w-full h-6" />;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${24 - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 22 - 1}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w-full h-6">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function CrisisModule({ locale }: { locale: LocaleCode }) {
  const fr = locale !== 'en-INT';
  const T = (t: Txt) => (fr ? t.fr : t.en);
  const L = (f: string, e: string) => (fr ? f : e);

  const [mode, setMode] = useState<Mode>('guided');
  const [crisisId, setCrisisId] = useState(CRISES[0].id);
  const [weightKg, setWeightKg] = useState(CRISES[0].caseWeightKg);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6) + 1);
  const [guess, setGuess] = useState<string | null>(null);
  const [showDebrief, setShowDebrief] = useState(false);

  const protocol = useMemo(() => CRISES.find((c) => c.id === crisisId) as CrisisProtocol, [crisisId]);
  const [run, setRun] = useState<CrisisRun>(() => startRun(protocol));
  const [trend, setTrend] = useState<Vitals[]>([]);
  const runRef = useRef(run);
  runRef.current = run;

  const reset = (nextId = crisisId, nextMode = mode) => {
    const p = CRISES.find((c) => c.id === nextId) as CrisisProtocol;
    setCrisisId(nextId);
    setMode(nextMode);
    setWeightKg(p.caseWeightKg);
    setRun(startRun(p));
    setTrend([]);
    setRunning(false);
    setGuess(null);
    setShowDebrief(false);
    setSeed(Math.floor(Math.random() * 1e6) + 1);
  };

  const startBlind = () => {
    const pick = CRISES[Math.floor(Math.random() * CRISES.length)].id;
    reset(pick, 'blind');
  };

  // Clock
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const next = stepRun(protocol, runRef.current, TICK_SEC * speed, weightKg);
      setRun(next);
      setTrend((tr) => [...tr, next.vitals].slice(-240));
      if (next.ended) {
        setRunning(false);
        setShowDebrief(true);
      }
    }, TICK_SEC * 1000);
    return () => window.clearInterval(id);
  }, [running, speed, protocol, weightKg]);

  const blindLocked = mode === 'blind' && guess === null;
  const buttons = useMemo(() => {
    const items = [
      ...protocol.actions.map((a) => ({ kind: 'action' as const, id: a.id, label: a.label, dose: formatDose(a.dose, weightKg, T), repeatable: !!a.repeatable })),
      ...protocol.distractors.map((d) => ({ kind: 'distractor' as const, id: d.id, label: d.label, dose: null, repeatable: false })),
    ];
    return seededShuffle(items, seed);
  }, [protocol, seed, weightKg]);

  const act = (id: string) => {
    if (run.ended || blindLocked) return;
    if (!running && run.tSec === 0) setRunning(true);
    setRun((r) => doAction(protocol, r, id));
  };

  const debrief = useMemo(() => buildDebrief(protocol, run), [protocol, run]);
  const v = run.vitals;
  const noOutput = v.rhythm === 'VF' || v.rhythm === 'PEA' || v.rhythm === 'asystole';
  const alarm = {
    hr: !noOutput && (v.hr > 120 || v.hr < 45),
    bp: noOutput || v.sbp < 80 || v.sbp > 180,
    spo2: v.spo2 < 90,
    etco2: v.etco2 > 50 || v.etco2 < 25,
    temp: v.tempC > 38.5,
  };

  const actionLabel = (id: string) => {
    const a = protocol.actions.find((x) => x.id === id) ?? protocol.distractors.find((x) => x.id === id);
    return a ? T(a.label) : id;
  };
  const claimSource = (claimId?: string) => (claimId ? CLAIMS.find((c) => c.id === claimId) : undefined);
  const evidence = EVIDENCE_REGISTRY.find((e) => e.id === protocol.evidenceId);
  const titleShown = mode === 'guided' || guess !== null;

  const rhythmText: Record<Vitals['rhythm'], string> = {
    sinus: L('Sinusal', 'Sinus'),
    sinusTachy: L('Tachycardie sinusale', 'Sinus tachycardia'),
    VF: L('FIBRILLATION VENTRICULAIRE', 'VENTRICULAR FIBRILLATION'),
    PEA: L('AESP (activité électrique sans pouls)', 'PEA (pulseless electrical activity)'),
    asystole: L('ASYSTOLIE', 'ASYSTOLE'),
    ROSC: L('RACS (reprise d’activité circulatoire)', 'ROSC'),
  };

  return (
    <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
      {/* LEFT: scenario + monitor */}
      <section className="lg:col-span-5 flex flex-col gap-3">
        <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-300">
            <Siren className="w-4 h-4" /> {L('Gestion de crise', 'Crisis management')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CRISES.map((c) => (
              <button
                key={c.id}
                onClick={() => reset(c.id, 'guided')}
                className={`px-2 py-1 rounded-lg border text-xs cursor-pointer ${mode === 'guided' && crisisId === c.id ? 'bg-rose-500/20 border-rose-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'}`}
              >
                {T(c.title)}
              </button>
            ))}
            <button
              onClick={startBlind}
              className={`px-2 py-1 rounded-lg border text-xs cursor-pointer flex items-center gap-1 ${mode === 'blind' ? 'bg-violet-500/20 border-violet-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'}`}
            >
              <EyeOff className="w-3 h-3" /> {L('Cas à l’aveugle', 'Blind case')}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <label className="flex items-center gap-2">
              {L('Poids', 'Weight')}
              <input type="range" min={40} max={150} step={1} value={weightKg} onChange={(e) => setWeightKg(+e.target.value)} className="w-28" aria-label={L('Poids', 'Weight')} />
              <span className="font-mono w-14">{weightKg} kg</span>
            </label>
            <label className="flex items-center gap-1">
              {L('Vitesse', 'Speed')}
              <select value={speed} onChange={(e) => setSpeed(+e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5">
                {[1, 2, 4].map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            </label>
            <span className="text-[10px] text-slate-500">{L('Adulte uniquement', 'Adults only')}</span>
          </div>
          <div className="text-xs text-slate-200 bg-slate-900/70 border border-slate-800 rounded-lg p-2">
            {titleShown && <div className="font-bold text-rose-200 mb-1">{T(protocol.title)}</div>}
            {T(protocol.stem)}
          </div>
          {titleShown && protocol.localNotes && protocol.localNotes.length > 0 && (
            <details className="text-[11px] bg-slate-900/50 border border-slate-800 rounded-lg p-2" open>
              <summary className="cursor-pointer text-amber-200 font-semibold">{L('Contexte local', 'Local context')}</summary>
              <ul className="mt-1 space-y-1">
                {[...protocol.localNotes]
                  .sort((a, b) => Number(b.region === HOME_REGION[locale]) - Number(a.region === HOME_REGION[locale]))
                  .map((n) => (
                    <li key={n.region + n.resourceId} className={n.region === HOME_REGION[locale] ? 'text-slate-100' : 'text-slate-400'}>
                      {REGION_FLAG[n.region]} {T(n.text)}
                    </li>
                  ))}
              </ul>
            </details>
          )}
          {mode === 'blind' && guess === null && (
            <div className="text-xs bg-violet-950/50 border border-violet-500/40 rounded-lg p-2">
              <div className="text-violet-200 mb-1.5">{L('Lisez le moniteur. Quel est votre diagnostic ?', 'Read the monitor. What is your diagnosis?')}</div>
              <div className="flex flex-wrap gap-1.5">
                {CRISES.map((c) => (
                  <button key={c.id} onClick={() => { setGuess(c.id); setRunning(true); }} className="px-2 py-1 rounded border border-violet-500/50 bg-slate-900 hover:bg-violet-900/40 cursor-pointer">
                    {T(c.title)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode === 'blind' && guess !== null && (
            <div className={`text-xs rounded-lg p-2 border ${guess === crisisId ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/60 border-rose-500/40 text-rose-200'}`}>
              {guess === crisisId ? L('Diagnostic correct.', 'Correct diagnosis.') : L(`Diagnostic incorrect : il s’agissait de « ${T(protocol.title)} ».`, `Wrong diagnosis: this was "${T(protocol.title)}".`)}
            </div>
          )}
        </div>

        {/* Monitor */}
        <div className="bg-black border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> {L('Moniteur', 'Monitor')}
            </span>
            <span className={`font-mono ${noOutput ? 'text-rose-400 animate-pulse font-bold' : 'text-emerald-300'}`}>{rhythmText[v.rhythm]}</span>
            <span className="flex items-center gap-1 font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5" /> {fmtTime(run.tSec)}
            </span>
          </div>
          <PatientMonitor vitals={v} running={running} alarms={alarm} fr={fr} />
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[
              { k: 'hr', label: L('Tendance FC', 'HR trend'), color: '#4ade80', series: trend.map((x) => x.hr), min: 0, max: 200 },
              { k: 'bp', label: L('Tendance PAS', 'SBP trend'), color: '#f87171', series: trend.map((x) => x.sbp), min: 0, max: 200 },
              { k: 'spo2', label: 'SpO₂', color: '#22d3ee', series: trend.map((x) => x.spo2), min: 50, max: 100 },
              { k: 'etco2', label: 'EtCO₂', color: '#facc15', series: trend.map((x) => x.etco2), min: 0, max: 100 },
            ].map((m) => (
              <div key={m.k} className="rounded border border-slate-800 bg-slate-950 px-1.5 pt-1">
                <div className="text-[9px] text-slate-500">{m.label}</div>
                <Spark data={m.series} color={m.color} min={m.min} max={m.max} />
              </div>
            ))}
          </div>
          <p className="mt-1 text-[9px] text-slate-500">
            {L(
              'ECG : modèle ECGSYN (McSharry et al., IEEE TBME 2003). PA, pléthysmographie, capnogramme : forme du simulateur.',
              'ECG: ECGSYN model (McSharry et al., IEEE TBME 2003). ART, pleth, capnogram: simulator shapes.',
            )}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setRunning(!running)}
              disabled={run.ended || blindLocked}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs flex items-center gap-1 cursor-pointer"
            >
              {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {running ? L('Pause', 'Pause') : run.tSec === 0 ? L('Démarrer', 'Start') : L('Reprendre', 'Resume')}
            </button>
            <button onClick={() => { setRunning(false); setShowDebrief(true); }} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs cursor-pointer">
              {L('Terminer et débriefer', 'End and debrief')}
            </button>
            <button onClick={() => reset()} className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs flex items-center gap-1 cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" /> {L('Recommencer', 'Restart')}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            {L(
              'Évolution des constantes = modèle de simulation (illustratif). Les gestes et les doses proviennent des recommandations citées.',
              'Vital-sign changes are a simulator model (illustrative). Steps and doses come from the cited guidelines.'
            )}
          </p>
        </div>

        {titleShown && (
          <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-3 text-xs">
            <div className="font-bold text-amber-300 mb-1">{L('Signes de reconnaissance (recommandation)', 'Recognition (guideline)')}</div>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-300">
              {protocol.recognition.map((r, i) => (
                <li key={i}>{T(r)}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* MIDDLE: actions */}
      <section className="lg:col-span-4 bg-[#0b1220] border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
        <div className="text-sm font-bold text-cyan-300">{L('Vos actions', 'Your actions')}</div>
        <p className="text-[11px] text-slate-400">
          {L('Choisissez dans l’ordre où vous les feriez. Certaines propositions sont des pièges.', 'Pick them in the order you would do them. Some options are traps.')}
        </p>
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 ${blindLocked ? 'opacity-40 pointer-events-none' : ''}`}>
          {buttons.map((b) => {
            const done = run.done.has(b.id);
            return (
              <button
                key={b.id}
                onClick={() => act(b.id)}
                disabled={run.ended || (done && !b.repeatable)}
                className={`text-left px-2 py-1.5 rounded-lg border text-xs cursor-pointer disabled:cursor-default ${done ? 'bg-cyan-900/40 border-cyan-600 text-cyan-100' : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-cyan-500'}`}
              >
                <div>{T(b.label)}</div>
                {b.dose && <div className="font-mono text-[10px] text-amber-300 mt-0.5">{b.dose}</div>}
              </button>
            );
          })}
        </div>
      </section>

      {/* RIGHT: log + debrief */}
      <aside className="lg:col-span-3 flex flex-col gap-3">
        <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-3 text-xs">
          <div className="font-bold text-slate-200 mb-1.5">{L('Chronologie', 'Timeline')}</div>
          {run.log.length === 0 ? (
            <div className="text-slate-500">{L('Aucune action pour l’instant.', 'No actions yet.')}</div>
          ) : (
            <ol className="space-y-0.5 max-h-64 overflow-y-auto font-mono text-[11px]">
              {run.log.map((l, i) => (
                <li key={i} className={l.kind === 'distractor' ? 'text-rose-300' : 'text-slate-300'}>
                  {fmtTime(l.tSec)} · {actionLabel(l.id)}
                </li>
              ))}
            </ol>
          )}
        </div>

        {showDebrief && (
          <div className="bg-[#0b1220] border border-cyan-700/50 rounded-xl p-3 text-xs flex flex-col gap-2">
            <div className="font-bold text-cyan-300">{L('Débriefing', 'Debrief')} — {T(protocol.title)}</div>
            <div className="text-slate-300">
              {L('Gestes clés faits', 'Key steps done')}: {debrief.criticalDone.length}/{debrief.criticalDone.length + debrief.criticalMissed.length} · {L('ordre', 'order')}{' '}
              {Math.round(debrief.orderScore * 100)} %
            </div>
            <ul className="space-y-1">
              {protocol.actions
                .filter((a) => a.critical)
                .map((a) => {
                  const d = debrief.criticalDone.find((x) => x.id === a.id);
                  const src = claimSource(a.claimId);
                  return (
                    <li key={a.id} className="flex gap-1.5">
                      {d ? <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${d.late ? 'text-amber-400' : 'text-emerald-400'}`} /> : <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />}
                      <span>
                        <span className="text-slate-100">{T(a.label)}</span>
                        {d && <span className="font-mono text-slate-400"> @ {fmtTime(d.tSec)}{d.late ? L(' (tardif)', ' (late)') : ''}</span>}
                        {a.detail && <span className="block text-slate-400">{T(a.detail)}</span>}
                        {formatDose(a.dose, weightKg, T) && <span className="block font-mono text-amber-300/90">{formatDose(a.dose, weightKg, T)}</span>}
                        {src && <span className="block text-[10px] text-slate-500">{src.status === 'sourced' ? '✓ ' : '⚠ '}{src.source ?? src.note}</span>}
                      </span>
                    </li>
                  );
                })}
            </ul>
            {protocol.modelSequence && (
              <div className="text-[11px] text-slate-300">
                <span className="font-bold text-slate-200">{L('Séquence de référence', 'Guideline sequence')}: </span>
                {modelSequence(protocol).map(actionLabel).join(' → ')}
              </div>
            )}
            {debrief.distractorsChosen.length > 0 && (
              <div>
                <div className="font-bold text-rose-300 mt-1">{L('Pièges choisis', 'Traps chosen')}</div>
                <ul className="space-y-1">
                  {debrief.distractorsChosen.map((id) => {
                    const d = protocol.distractors.find((x) => x.id === id)!;
                    return (
                      <li key={id}>
                        <span className="text-rose-200">{T(d.label)}</span> — <span className="text-slate-400">{T(d.why)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {evidence && (
              <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="flex items-start gap-1.5 text-[11px] text-cyan-300 hover:underline mt-1">
                <BookOpen className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {evidence.sourceCitation}
              </a>
            )}
            <p className="text-[10px] text-slate-500">
              {L(
                'Outil pédagogique : suivez toujours le protocole de votre établissement.',
                'Teaching tool: always follow your institution’s protocol.'
              )}
            </p>
          </div>
        )}
      </aside>
    </main>
  );
}
