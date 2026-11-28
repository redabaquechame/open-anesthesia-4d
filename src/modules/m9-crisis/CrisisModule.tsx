import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, EyeOff, Minus, Pause, Play, Plus, RotateCcw, XCircle } from 'lucide-react';
import type { LocaleCode } from '../../standards/clinicalStandards';
import { CLAIMS } from '../../standards/claimRegistry';
import { CLAIM_FR } from '../../standards/claimFr';
import { EVIDENCE_REGISTRY } from '../../evidence/evidenceRegistry';
import type { CrisisProtocol, Txt, Vitals } from './crisisTypes';
import { buildDebrief, doAction, formatDose, modelSequence, startRun, stepRun, type CrisisRun } from './crisisEngine';
import { CRISES } from './crisisProtocols';
import { PatientMonitor } from '../../components/PatientMonitor';
import { ISO_LABEL_BY_ID } from './drugLabels';
import { MobileDock } from '../../components/MobileDock';

/** Teaching alarm limits (claim m9-alarm-limits, illustrative): the same limits drive the flashing cells and the sounds. */
const LIMITS = { hr: [45, 120] as [number, number], sbp: [80, 180] as [number, number], spo2Low: 90, etco2: [25, 50] as [number, number] };

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
  const cycle = protocol.cycle?.(run.log, run.tSec) ?? null;
  const cycleDue = cycle?.remainingSec != null && cycle.remainingSec <= 10;
  const v = run.vitals;
  const noOutput = v.rhythm === 'VF' || v.rhythm === 'PEA' || v.rhythm === 'asystole';
  const alarm = {
    hr: !noOutput && (v.hr > LIMITS.hr[1] || v.hr < LIMITS.hr[0]),
    bp: noOutput || v.sbp < LIMITS.sbp[0] || v.sbp > LIMITS.sbp[1],
    spo2: v.spo2 < LIMITS.spo2Low,
    etco2: v.etco2 > LIMITS.etco2[1] || v.etco2 < LIMITS.etco2[0],
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
    <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 pb-16 md:pb-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
      {/* Scenario strip: choose, weight, speed, run controls */}
      <section className="lg:col-span-12 bg-oa-surface border border-oa-hairline rounded p-2 flex flex-col gap-2">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {CRISES.map((c) => (
            <button
              key={c.id}
              onClick={() => reset(c.id, 'guided')}
              className={`shrink-0 h-7 px-2.5 rounded border text-xs cursor-pointer ${mode === 'guided' && crisisId === c.id ? 'bg-oa-hover border-slate-400 text-white' : 'bg-oa-raised border-oa-hairline text-slate-300 hover:border-slate-500'}`}
            >
              {T(c.title)}
            </button>
          ))}
          <button
            onClick={startBlind}
            className={`shrink-0 h-7 px-2.5 rounded border text-xs cursor-pointer flex items-center gap-1 ${mode === 'blind' ? 'bg-violet-500/20 border-violet-400 text-white' : 'bg-oa-raised border-oa-hairline text-slate-300 hover:border-slate-500'}`}
          >
            <EyeOff className="w-3 h-3" /> {L('Cas à l’aveugle', 'Blind case')}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">{L('Poids', 'Weight')}</span>
            <button onClick={() => setWeightKg((w) => Math.max(40, w - 5))} className="w-7 h-7 rounded border border-oa-hairline bg-oa-raised hover:bg-oa-hover flex items-center justify-center cursor-pointer" aria-label={L('Moins 5 kg', 'Minus 5 kg')}>
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="oa-num w-16 text-center text-sm text-white">{weightKg} kg</span>
            <button onClick={() => setWeightKg((w) => Math.min(150, w + 5))} className="w-7 h-7 rounded border border-oa-hairline bg-oa-raised hover:bg-oa-hover flex items-center justify-center cursor-pointer" aria-label={L('Plus 5 kg', 'Plus 5 kg')}>
              <Plus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-500 ms-1">{L('Adulte uniquement', 'Adults only')}</span>
          </div>
          <div className="flex items-center gap-1" role="group" aria-label={L('Vitesse', 'Speed')}>
            <span className="text-slate-400 me-1">{L('Vitesse', 'Speed')}</span>
            {[1, 2, 4].map((sp) => (
              <button key={sp} onClick={() => setSpeed(sp)} className={`h-7 w-9 rounded border font-mono text-[11px] cursor-pointer ${speed === sp ? 'border-slate-400 bg-oa-hover text-white' : 'border-oa-hairline bg-oa-raised text-slate-400 hover:text-white'}`}>
                ×{sp}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 ms-auto">
            <span className="flex items-center gap-1 font-mono text-slate-300 me-2">
              <Clock className="w-3.5 h-3.5" /> {fmtTime(run.tSec)}
            </span>
            {cycle && cycle.remainingSec !== null && (
              <span
                role="timer"
                aria-live="off"
                className={`flex items-center gap-1 h-7 px-2 rounded border font-mono text-[11px] me-1 ${cycleDue ? 'border-amber-400 bg-amber-950/60 text-amber-200' : 'border-oa-hairline bg-oa-raised text-slate-200'}`}
                title={L('Règle des recommandations : un choc, puis 2 min de massage avant l’analyse suivante.', 'Guideline rule: one shock, then 2 min of CPR before the next rhythm check.')}
              >
                <span className="font-sans text-slate-400">{T(cycle.label)}</span> {fmtTime(Math.ceil(cycle.remainingSec))}
              </span>
            )}
            <button
              onClick={() => setRunning(!running)}
              disabled={run.ended || blindLocked}
              className="h-7 px-3 rounded bg-slate-100 hover:bg-white disabled:opacity-40 text-oa-canvas font-semibold text-xs flex items-center gap-1 cursor-pointer"
            >
              {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {running ? L('Pause', 'Pause') : run.tSec === 0 ? L('Démarrer', 'Start') : L('Reprendre', 'Resume')}
            </button>
            <button onClick={() => { setRunning(false); setShowDebrief(true); }} className="h-7 px-3 rounded border border-oa-border-strong bg-oa-raised hover:bg-oa-hover text-white text-xs cursor-pointer">
              {L('Terminer et débriefer', 'End and debrief')}
            </button>
            <button onClick={() => reset()} className="h-7 px-2 rounded border border-oa-hairline text-slate-300 hover:bg-oa-raised text-xs flex items-center gap-1 cursor-pointer" title={L('Recommencer', 'Restart')}>
              <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{L('Recommencer', 'Restart')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* LEFT: monitor + case */}
      <section id="m9-monitor" className="lg:col-span-5 flex flex-col gap-3 scroll-mt-2">
        {/* Monitor (always sweeping, so the screen is never dead before Start) */}
        <div className="bg-black border border-oa-hairline rounded p-1.5">
          <PatientMonitor vitals={v} running={running} alarms={alarm} limits={LIMITS} rhythmLabel={rhythmText[v.rhythm]} fr={fr} />
          <div className="grid grid-cols-4 gap-1.5 mt-1.5">
            {[
              { k: 'hr', label: L('Tendance FC', 'HR trend'), color: '#00e676', series: trend.map((x) => x.hr), min: 0, max: 200 },
              { k: 'bp', label: L('Tendance PAS', 'SBP trend'), color: '#ff453a', series: trend.map((x) => x.sbp), min: 0, max: 200 },
              { k: 'spo2', label: 'SpO₂', color: '#00d4ff', series: trend.map((x) => x.spo2), min: 50, max: 100 },
              { k: 'etco2', label: 'EtCO₂', color: '#ffd60a', series: trend.map((x) => x.etco2), min: 0, max: 100 },
            ].map((m) => (
              <div key={m.k} className="rounded border border-oa-hairline bg-oa-canvas px-1.5 pt-1">
                <div className="text-[9px] text-slate-500">{m.label}</div>
                <Spark data={m.series} color={m.color} min={m.min} max={m.max} />
              </div>
            ))}
          </div>
          <p className="mt-1 px-0.5 text-[9px] text-slate-500">
            {L(
              'ECG : modèle ECGSYN (McSharry et al., IEEE TBME 2003). PA, pléthysmographie, capnogramme et évolution des constantes : modèle du simulateur (illustratif). Gestes et doses : recommandations citées.',
              'ECG: ECGSYN model (McSharry et al., IEEE TBME 2003). ART, pleth, capnogram and vital-sign changes: simulator model (illustrative). Steps and doses: cited guidelines.',
            )}
          </p>
        </div>

        <div id="m9-context" className="bg-oa-surface border border-oa-hairline rounded p-3 flex flex-col gap-2 scroll-mt-2">
          <div className="text-xs text-slate-200">
            {titleShown && <div className="font-semibold text-white mb-1">{T(protocol.title)}</div>}
            {T(protocol.stem)}
          </div>
          {titleShown && protocol.localNotes && protocol.localNotes.length > 0 && (
            <details className="text-[11px] border-t border-oa-hairline pt-2" open>
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
            <div className="text-xs border border-violet-500/40 rounded p-2">
              <div className="text-violet-200 mb-1.5">{L('Lisez le moniteur. Quel est votre diagnostic ?', 'Read the monitor. What is your diagnosis?')}</div>
              <div className="flex flex-wrap gap-1.5">
                {CRISES.map((c) => (
                  <button key={c.id} onClick={() => { setGuess(c.id); setRunning(true); }} className="px-2 py-1 rounded border border-violet-500/50 bg-oa-raised hover:bg-violet-900/40 cursor-pointer">
                    {T(c.title)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode === 'blind' && guess !== null && (
            <div className={`text-xs rounded p-2 border ${guess === crisisId ? 'border-emerald-500/40 text-emerald-200' : 'border-rose-500/40 text-rose-200'}`}>
              {guess === crisisId ? L('Diagnostic correct.', 'Correct diagnosis.') : L(`Diagnostic incorrect : il s’agissait de « ${T(protocol.title)} ».`, `Wrong diagnosis: this was "${T(protocol.title)}".`)}
            </div>
          )}
        </div>

        {titleShown && (
          <div className="bg-oa-surface border border-oa-hairline rounded p-3 text-xs">
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
      <section id="m9-actions" className="lg:col-span-4 bg-oa-surface border border-oa-hairline rounded p-3 flex flex-col gap-2 scroll-mt-2">
        <div className="text-sm font-semibold text-white">{L('Vos actions', 'Your actions')}</div>
        <p className="text-[11px] text-slate-400">
          {L('Choisissez dans l’ordre où vous les feriez. Certaines propositions sont des pièges.', 'Pick them in the order you would do them. Some options are traps.')}
        </p>
        <p className="text-[10px] text-slate-500">
          {L('Bande de couleur = étiquette de seringue ISO 26825 (classes vérifiées seulement). Les pièges gardent la couleur de leur vraie classe.', 'Colour strip = ISO 26825 syringe label (verified classes only). Traps keep their real class colour.')}
        </p>
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 ${blindLocked ? 'opacity-40 pointer-events-none' : ''}`}>
          {buttons.map((b) => {
            const done = run.done.has(b.id);
            const iso = ISO_LABEL_BY_ID[b.id];
            return (
              <button
                key={b.id}
                onClick={() => act(b.id)}
                disabled={run.ended || (done && !b.repeatable)}
                title={iso ? (fr ? `Étiquette ISO 26825 : ${iso.nameFr}` : `ISO 26825 label: ${iso.nameEn}`) : undefined}
                style={iso?.colour ? ({ '--oa-drug-colour': iso.colour } as React.CSSProperties) : undefined}
                className={`text-start px-2 py-1.5 rounded border text-xs cursor-pointer disabled:cursor-default overflow-hidden ${iso ? `oa-drug ${iso.pattern === 'stripes' ? 'oa-drug-antagonist' : iso.pattern === 'blackbar' ? 'oa-drug-blackbar' : ''}` : ''} ${done ? 'bg-oa-hover border-slate-400 text-white' : 'bg-oa-raised border-oa-hairline text-slate-200 hover:border-slate-500'}`}
              >
                <div>{T(b.label)}</div>
                {b.dose && <div className="font-mono text-[10px] text-amber-300 mt-0.5">{b.dose}</div>}
              </button>
            );
          })}
        </div>
      </section>

      {/* RIGHT: log + debrief */}
      <aside id="m9-journal" className="lg:col-span-3 flex flex-col gap-3 scroll-mt-2">
        <div className="bg-oa-surface border border-oa-hairline rounded p-3 text-xs">
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
          <div className="bg-oa-surface2 border border-cyan-700/50 rounded p-3 text-xs flex flex-col gap-2">
            <div className="font-bold text-cyan-300">{L('Débriefing', 'Debrief')} — {T(protocol.title)}</div>
            <div className="text-slate-300">
              {L('Gestes clés faits', 'Key steps done')}: {debrief.criticalDone.length}/{debrief.criticalDone.length + debrief.criticalMissed.length} · {L('ordre', 'order')}{' '}
              {Math.round(debrief.orderScore * 100)} %
            </div>
            <p className="text-[10px] text-slate-500 -mt-1">
              {L(
                'Ordre = part des paires de gestes clés faites dans l’ordre de la recommandation (100 % = même ordre, 0 % = ordre inversé).',
                'Order = share of pairs of key steps done in the guideline’s order (100 % = same order, 0 % = reversed).',
              )}
            </p>
            {debrief.orderViolations.length > 0 && (
              <div>
                <div className="font-bold text-amber-300">{L('Ordre à revoir', 'Order to review')}</div>
                <ul className="space-y-0.5 text-slate-300">
                  {debrief.orderViolations.slice(0, 6).map(([first, then]) => (
                    <li key={first + then}>
                      {L('La recommandation place', 'The guideline puts')} <span className="text-slate-100">{actionLabel(first)}</span> {L('avant', 'before')} <span className="text-slate-100">{actionLabel(then)}</span>
                    </li>
                  ))}
                  {debrief.orderViolations.length > 6 && <li className="text-slate-500">+{debrief.orderViolations.length - 6}</li>}
                </ul>
              </div>
            )}
            {debrief.timingIssues.length > 0 && (
              <div>
                <div className="font-bold text-amber-300">{L('Délais et séquence', 'Timing and sequence')}</div>
                <ul className="space-y-1">
                  {debrief.timingIssues.map((ti, i) => {
                    const src = ti.claimId ? claimSource(ti.claimId) : undefined;
                    return (
                      <li key={ti.id + i} className="flex gap-1.5">
                        <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                        <span>
                          <span className="font-mono text-slate-400">{fmtTime(ti.tSec)} · </span>
                          <span className="text-slate-100">{T(ti.text)}</span>
                          {src && <span className="block text-[10px] text-slate-500">{src.status === 'sourced' ? '✓ ' : '⚠ '}{src.source ?? src.note}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
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
            {protocol.claimIds
              .map((id) => CLAIMS.find((c) => c.id === id))
              .filter((c) => c && c.status === 'illustrative' && c.id !== 'm9-dynamics')
              .map((c) => (
                <p key={c!.id} className="text-[11px] text-amber-200/90 border border-amber-500/30 rounded px-2 py-1">
                  <span className="font-semibold">{L('Modèle du simulateur : ', 'Simulator model: ')}</span>
                  {fr ? (CLAIM_FR[c!.id]?.claim ?? c!.claim) : c!.claim}
                </p>
              ))}
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
      <MobileDock
        items={[
          { id: 'm9-monitor', label: L('Moniteur', 'Monitor') },
          { id: 'm9-actions', label: L('Actions', 'Actions') },
          { id: 'm9-journal', label: L('Journal', 'Log') },
          { id: 'm9-context', label: L('Contexte', 'Context') },
        ]}
      />
    </main>
  );
}
