import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Eye, Gauge, RotateCcw, Tag, Wind } from 'lucide-react';
import type { LocaleCode } from '../../standards/clinicalStandards';
import { ANATOMY_CREDIT } from '../../engine/loadAnatomy';
import { createAirwayScene, type AirwayMapJson, type AirwayScene, type AirwayView, type ScopeInputs, type ScopeOverlay } from './airwayScene';
import type { Lobe } from './airwayGeometry';
import * as D from './dltModel';

type Tone = 'ok' | 'warn' | 'bad';
const STATUS_TEXT: Record<D.StatusCode, { fr: string; en: string; tone: Tone }> = {
  ok: { fr: 'Position correcte : bord supérieur du ballonnet bleu juste sous la carène, orifices lobaires libres.', en: 'Good position: top of the blue cuff just below the carina, lobar orifices clear.', tone: 'ok' },
  herniation: { fr: 'Ballonnet bronchique hernié au-dessus de la carène : il gêne la bronche souche controlatérale. Avancer ou dégonfler.', en: 'Bronchial cuff herniating above the carina: it obstructs the other main bronchus. Advance or deflate.', tone: 'bad' },
  tooDeepLUL: { fr: 'Trop profond : l’extrémité bronchique recouvre l’orifice lobaire supérieur gauche. Retirer.', en: 'Too deep: the bronchial tip covers the left upper lobe orifice. Withdraw.', tone: 'bad' },
  tooShallow: { fr: 'Trop superficiel : l’extrémité bronchique est encore dans la trachée. Pas d’isolation.', en: 'Too shallow: the bronchial tip is still in the trachea. No lung isolation.', tone: 'bad' },
  wrongSide: { fr: 'Sonde gauche engagée dans la bronche droite.', en: 'Left DLT has entered the right main bronchus.', tone: 'bad' },
  rulBlocked: { fr: 'Orifice lobaire supérieur droit recouvert : lobe supérieur droit non ventilé.', en: 'Right upper lobe orifice covered: RUL not ventilated.', tone: 'bad' },
  noSeal: { fr: 'Ballonnet bronchique non étanche : fuite entre les deux poumons.', en: 'Bronchial cuff not sealing: leak between the two lungs.', tone: 'warn' },
  cuffPressure: { fr: 'Pression du ballonnet bronchique excessive (> 30 cmH2O) : risque pour la muqueuse.', en: 'Bronchial cuff pressure too high (> 30 cmH2O): mucosal injury risk.', tone: 'warn' },
  trachealOpeningInBronchus: { fr: 'L’orifice de la lumière trachéale est entré dans la bronche : le poumon controlatéral est mal ventilé.', en: 'The tracheal-lumen opening has entered the bronchus: the other lung is poorly ventilated.', tone: 'bad' },
  noVent: { fr: 'Aucun lobe ventilé : vérifier les clamps et la position.', en: 'No lobe ventilated: check clamps and position.', tone: 'bad' },
};
const TONE_CLASS: Record<Tone, string> = {
  ok: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40',
  warn: 'text-amber-300 bg-amber-950/60 border-amber-500/40',
  bad: 'text-rose-300 bg-rose-950/70 border-rose-500/40',
};
const ANATOMY_LABEL: Record<D.AnatomyVariant, { fr: string; en: string }> = {
  male: { fr: 'Homme moyen (Benumof)', en: 'Average male (Benumof)' },
  female: { fr: 'Femme moyenne (Benumof)', en: 'Average female (Benumof)' },
  shortLeft: { fr: 'Bronche souche G courte (38 mm)', en: 'Short left main bronchus (38 mm)' },
  specimen: { fr: 'Spécimen 3D tel quel', en: '3D specimen as is' },
};

const mm = (m: number, d = 0) => `${(m * 1000).toFixed(d)} mm`;

export function BronchoscopyDltModule({ locale }: { locale: LocaleCode }) {
  const fr = locale !== 'en-INT';
  const L = (f: string, e: string) => (fr ? f : e);

  // Patient and tube
  const [anatomy, setAnatomy] = useState<D.AnatomyVariant>('male');
  const [heightCm, setHeightCm] = useState(170);
  const [size, setSize] = useState<D.DltSize>(37);
  const [depthCm, setDepthCm] = useState(29);
  const [side, setSide] = useState<'left' | 'right'>('left');
  const [cuffMl, setCuffMl] = useState(1.5);
  const [lateral, setLateral] = useState(false);
  const [migrationMm, setMigrationMm] = useState(6.3);
  const [upSide, setUpSide] = useState<'left' | 'right'>('right');
  // Ventilation
  const [clamp, setClamp] = useState<D.Clamp>('none');
  const [vtMl, setVtMl] = useState(450);
  const [rr, setRr] = useState(12);
  const [peep, setPeep] = useState(5);
  const [fio2, setFio2] = useState(1);
  const [hpv, setHpv] = useState(0.5);
  // Bronchoscope
  const [scope, setScope] = useState<ScopeInputs>({ lumen: 'tracheal', advanceMm: 0, steer: 'right', flexDeg: 0, twistDeg: 0 });
  const [labels, setLabels] = useState(true);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [ready, setReady] = useState<{ map: AirwayMapJson; share: Record<Lobe, number> } | null>(null);
  const [overlay, setOverlay] = useState<ScopeOverlay | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<AirwayScene | null>(null);

  useEffect(() => {
    const container = viewportRef.current;
    const scopeBox = scopeRef.current;
    if (!container || !scopeBox) return;
    let cancelled = false;
    let sc: AirwayScene | null = null;
    createAirwayScene(container, scopeBox)
      .then((s) => {
        if (cancelled) {
          s.dispose();
          return;
        }
        sc = s;
        sceneRef.current = s;
        setReady({ map: s.map, share: s.lobeShare });
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
      sceneRef.current = null;
      sc?.dispose();
    };
  }, []);

  const dlt: D.DltInputs = { anatomy, heightCm, size, depthCm, side, lateral, migrationMm, upSide, bronchialCuffMl: cuffMl, clamp, vtMl, rr, peep, fio2, hpv };
  const out = useMemo(
    () => (ready ? D.evaluateDlt(dlt, ready.map, ready.share) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, anatomy, heightCm, size, depthCm, side, lateral, migrationMm, upSide, cuffMl, clamp, vtMl, rr, peep, fio2, hpv]
  );

  useEffect(() => {
    const s = sceneRef.current;
    if (!s || !out) return;
    setOverlay(s.update({ dlt, out, scope, labels, fr }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [out, scope, labels, fr]);

  const nudge = (patch: Partial<ScopeInputs> | ((s: ScopeInputs) => Partial<ScopeInputs>)) =>
    setScope((s) => {
      const p = typeof patch === 'function' ? patch(s) : patch;
      const n = { ...s, ...p };
      n.advanceMm = Math.max(-60, Math.min(90, Math.round(n.advanceMm * 2) / 2));
      n.flexDeg = Math.max(-60, Math.min(60, n.flexDeg));
      n.twistDeg = ((((n.twistDeg + 180) % 360) + 360) % 360) - 180;
      return n;
    });
  const onScopeKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase();
    const map: Record<string, (s: ScopeInputs) => Partial<ScopeInputs>> = {
      w: (s) => ({ advanceMm: s.advanceMm + (e.shiftKey ? 5 : 1) }),
      s: (s) => ({ advanceMm: s.advanceMm - (e.shiftKey ? 5 : 1) }),
      a: (s) => ({ twistDeg: s.twistDeg + 10 }),
      d: (s) => ({ twistDeg: s.twistDeg - 10 }),
      q: (s) => ({ flexDeg: s.flexDeg + 5 }),
      e: (s) => ({ flexDeg: s.flexDeg - 5 }),
    };
    if (map[k]) {
      e.preventDefault();
      nudge(map[k]);
    }
  };

  const primary = out ? out.status.map((c) => STATUS_TEXT[c]) : [];
  const worst: Tone = primary.some((s) => s.tone === 'bad') ? 'bad' : primary.some((s) => s.tone === 'warn') ? 'warn' : 'ok';
  const brodsky = D.brodskyDepthCm(heightCm);
  const lungOf = (l: 'tracheal' | 'bronchial') => (l === 'bronchial' ? side : side === 'left' ? 'right' : 'left');
  const lungName = (s: 'left' | 'right') => (s === 'left' ? L('poumon gauche', 'left lung') : L('poumon droit', 'right lung'));

  const btn = (on: boolean, extra = '') =>
    `px-2 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${on ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'} ${extra}`;
  const slider = (label: string, value: number, shown: string, min: number, max: number, step: number, set: (v: number) => void, color = 'text-slate-200') => (
    <label className="block">
      <div className="flex justify-between text-[11px]">
        <span>{label}</span>
        <span className={`font-mono ${color}`}>{shown}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} className="w-full accent-cyan-500" />
    </label>
  );
  const marker = (angle: number | null, text: string, cls: string) =>
    angle == null ? null : (
      <span
        className={`absolute -translate-x-1/2 -translate-y-1/2 font-mono text-[11px] font-bold ${cls}`}
        style={{ left: `${50 + Math.cos(angle) * 41}%`, top: `${50 - Math.sin(angle) * 41}%` }}
      >
        {text}
      </span>
    );
  const whereText = overlay
    ? {
        inTube: L('dans la lumière de la sonde', 'inside the tube lumen'),
        trachea: L('trachée', 'trachea'),
        leftBronchus: L('bronche souche gauche', 'left main bronchus'),
        rightBronchus: L('bronche souche droite', 'right main bronchus'),
      }[overlay.where]
    : '';

  return (
    <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
      <section className="lg:col-span-8 flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* External 3D */}
          <div className="md:col-span-3 bg-[#050913] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="px-3 py-2 bg-[#0b1220] border-b border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-bold text-cyan-300 mr-auto">{L('Arbre trachéobronchique réel', 'Real tracheobronchial tree')}</span>
              {(['front', 'carina', 'left'] as AirwayView[]).map((v) => (
                <button key={v} onClick={() => sceneRef.current?.setView(v)} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 cursor-pointer hover:border-cyan-500">
                  {v === 'front' ? L('Face', 'Front') : v === 'carina' ? L('Carène', 'Carina') : L('Profil G', 'Left side')}
                </button>
              ))}
              <button onClick={() => setLabels(!labels)} title={L('Étiquettes', 'Labels')} className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-1 cursor-pointer ${labels ? 'bg-cyan-700 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
                <Tag className="w-3 h-3" />
              </button>
            </div>
            <div ref={viewportRef} className="relative w-full h-[360px] sm:h-[400px] touch-none">
              {status !== 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                  {status === 'loading' ? L('Chargement de l’anatomie…', 'Loading anatomy…') : L('Impossible de charger le modèle 3D.', 'Could not load the 3D model.')}
                </div>
              )}
              <div className="absolute bottom-2 left-2 right-2 z-10 w-fit flex flex-wrap gap-x-2 gap-y-0.5 px-1.5 py-1 rounded-md bg-slate-950/80 text-[10px] text-slate-300 pointer-events-none">
                <Legend color="#f4a9b0" text={L('lobe ventilé', 'ventilated lobe')} />
                <Legend color="#f5b04a" text={L('partiellement obstrué', 'partly obstructed')} />
                <Legend color="#6f7f99" text={L('non ventilé (collabé)', 'not ventilated (collapsing)')} />
                <Legend color="#1d6fe0" text={L('ballonnet bronchique', 'bronchial cuff')} />
              </div>
            </div>
          </div>

          {/* Bronchoscope */}
          <div className="md:col-span-2 bg-black border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="px-3 py-2 bg-[#0b1220] border-b border-slate-800 flex justify-between items-center text-xs">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> {L('Fibroscope', 'Bronchoscope')}
              </span>
              <span className="text-[10px] text-slate-400 truncate pl-2">{whereText}</span>
            </div>
            <div
              ref={scopeRef}
              tabIndex={0}
              onKeyDown={onScopeKey}
              aria-label={L('Vue du fibroscope. Touches W/S avancer, A/D rotation, Q/E béquillage.', 'Bronchoscope view. Keys W/S advance, A/D rotate, Q/E flex tip.')}
              className="relative w-full aspect-square md:aspect-auto md:h-[400px] bg-black outline-none focus:ring-1 focus:ring-amber-400/60"
            >
              <div className="absolute inset-0 pointer-events-none z-10">
                {marker(overlay?.anteriorAngle ?? null, L('A', 'A'), 'text-amber-200/90')}
                {marker(overlay?.leftAngle ?? null, L('G', 'L'), 'text-sky-300/90')}
                <span className="absolute bottom-1.5 right-2 text-[9px] font-mono text-slate-500">W/S · A/D · Q/E</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={`px-3 py-2 rounded-xl border text-xs font-semibold flex flex-col gap-1 ${TONE_CLASS[worst]}`}>
          {primary.map((s, i) => (
            <div key={i} className={`flex items-start gap-2 ${i ? TONE_CLASS[s.tone].split(' ')[0] : ''}`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 ${s.tone === 'ok' ? 'opacity-0' : ''}`} />
              <span>{fr ? s.fr : s.en}</span>
            </div>
          ))}
        </div>

        {/* Measurements + monitor */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-3 bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <Metric label={L('Ballonnet ↔ carène', 'Cuff top ↔ carina')} value={out ? (out.toCarina >= 0 ? `${mm(out.toCarina)} ${L('sous', 'below')}` : `${mm(-out.toCarina)} ${L('au-dessus', 'above')}`) : '—'} accent={out && out.toCarina < 0 ? 'text-rose-300' : 'text-emerald-300'} />
              <Metric label={side === 'left' ? L('Extrémité ↔ éperon LSG/LIG', 'Tip ↔ LUL/LLL carina') : L('Extrémité ↔ orifice LSD', 'Tip ↔ RUL orifice')} value={out ? mm(out.toSecondaryCarina) : '—'} accent={out && out.toSecondaryCarina < 0 ? 'text-rose-300' : 'text-slate-100'} />
              <Metric label={L('Marge de sécurité (Benumof)', 'Margin of safety (Benumof)')} value={out ? mm(out.marginOfSafety) : '—'} />
              <Metric label={L('Ballonnet Ø / bronche Ø', 'Cuff Ø / airway Ø')} value={out ? `${(out.cuffDiameter * 1000).toFixed(1)} / ${(out.airwayDiameter * 1000).toFixed(1)} mm` : '—'} accent={out?.sealed ? 'text-emerald-300' : 'text-amber-300'} />
              <Metric label={L('Pression ballonnet (modèle)', 'Cuff pressure (model)')} value={out ? `${out.cuffPressure.toFixed(0)} cmH2O` : '—'} accent={out && out.cuffPressure > 30 ? 'text-rose-300' : 'text-slate-100'} />
              <Metric label={L('Isolation pulmonaire', 'Lung isolation')} value={out ? { complete: L('complète', 'complete'), partial: L('partielle', 'partial'), none: L('aucune', 'none') }[out.isolation] : '—'} accent={out?.isolation === 'complete' ? 'text-emerald-300' : 'text-amber-300'} />
            </div>
            <table className="w-full text-[11px] font-mono">
              <thead className="text-slate-500 text-[10px]">
                <tr>
                  <th className="text-left font-normal">{L('Lobe', 'Lobe')}</th>
                  <th className="text-left font-normal">{L('Lumière', 'Lumen')}</th>
                  <th className="text-right font-normal">{L('Perméabilité', 'Patency')}</th>
                  <th className="text-right font-normal">{L('Ventilé', 'Ventilated')}</th>
                  <th className="text-right font-normal">{L('Perfusion', 'Perfusion')}</th>
                </tr>
              </thead>
              <tbody>
                {out &&
                  D.LOBE_LIST.map((l) => {
                    const st = out.lobes[l];
                    return (
                      <tr key={l} className="border-t border-slate-800/70">
                        <td className="py-0.5">{fr ? { RUL: 'LSD', RML: 'LMD', RLL: 'LID', LUL: 'LSG', LLL: 'LIG' }[l] : l}</td>
                        <td>{st.from.map((x) => (x === 'tracheal' ? L('trach.', 'trach.') : L('bronch.', 'bronch.'))).join(' + ') || '—'}</td>
                        <td className={`text-right ${st.patency < 0.95 ? 'text-amber-300' : ''}`}>{(st.patency * 100).toFixed(0)} %</td>
                        <td className={`text-right ${st.ventilated ? 'text-emerald-300' : 'text-slate-500'}`}>{st.ventilated ? L('oui', 'yes') : L('non', 'no')}</td>
                        <td className="text-right">{(st.perfusion * 100).toFixed(0)} %</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="md:col-span-2 bg-[#03060c] border border-slate-800 rounded-xl p-2 flex flex-col">
            <OlvMonitor out={out} rr={rr} peep={peep} fr={fr} />
          </div>
        </div>
      </section>

      <aside className="lg:col-span-4 flex flex-col gap-3 text-xs">
        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400">{L('1. Patient et sonde', '1. Patient and tube')}</h2>
          <div className="grid grid-cols-2 gap-1.5">
            {(['male', 'female', 'shortLeft', 'specimen'] as D.AnatomyVariant[]).map((a) => (
              <button key={a} className={btn(anatomy === a, 'text-[10px]')} onClick={() => setAnatomy(a)}>
                {fr ? ANATOMY_LABEL[a].fr : ANATOMY_LABEL[a].en}
              </button>
            ))}
          </div>
          {slider(L('Taille du patient', 'Patient height'), heightCm, `${heightCm} cm`, 150, 195, 1, setHeightCm)}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-auto">{L('Sonde gauche', 'Left DLT')}</span>
            {([35, 37, 39, 41] as D.DltSize[]).map((s) => (
              <button key={s} className={btn(size === s, 'font-mono')} onClick={() => setSize(s)}>
                {s} Fr
              </button>
            ))}
          </div>
          <div>
            {slider(L('Profondeur aux incisives', 'Depth at the incisors'), depthCm, `${depthCm.toFixed(1)} cm`, 24, 34, 0.1, setDepthCm, 'text-cyan-300')}
            <div className="flex gap-1 mt-1">
              {[-1, -0.5, -0.1, 0.1, 0.5, 1].map((d) => (
                <button key={d} onClick={() => setDepthCm((v) => Math.max(24, Math.min(34, Math.round((v + d) * 10) / 10)))} className="flex-1 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] cursor-pointer hover:border-cyan-400">
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </div>
            <button onClick={() => setDepthCm(Math.round(brodsky * 10) / 10)} className="mt-1.5 w-full py-1 rounded-lg border border-cyan-700 bg-cyan-950/50 text-cyan-200 text-[11px] cursor-pointer hover:border-cyan-400">
              {L(`Placer selon Brodsky : ${brodsky.toFixed(1)} cm`, `Place per Brodsky: ${brodsky.toFixed(1)} cm`)}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(['left', 'right'] as const).map((s) => (
              <button key={s} className={btn(side === s)} onClick={() => setSide(s)}>
                {s === 'left' ? L('Engagée à gauche', 'Entered left') : L('Engagée à droite (erreur)', 'Entered right (error)')}
              </button>
            ))}
          </div>
          {slider(L('Air dans le ballonnet bronchique', 'Air in the bronchial cuff'), cuffMl, `${cuffMl.toFixed(1)} mL`, 0, 4, 0.1, setCuffMl, 'text-sky-300')}
        </div>

        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-violet-300">{L('2. Position', '2. Position')}</h2>
          <div className="grid grid-cols-2 gap-1.5">
            <button className={btn(!lateral)} onClick={() => setLateral(false)}>{L('Décubitus dorsal', 'Supine')}</button>
            <button className={btn(lateral)} onClick={() => setLateral(true)}>{L('Décubitus latéral', 'Lateral decubitus')}</button>
          </div>
          {lateral && (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                {(['right', 'left'] as const).map((s) => (
                  <button key={s} className={btn(upSide === s, 'text-[10px]')} onClick={() => setUpSide(s)}>
                    {s === 'right' ? L('Côté droit en haut', 'Right side up') : L('Côté gauche en haut', 'Left side up')}
                  </button>
                ))}
              </div>
              {slider(L('Retrait de la sonde au retournement', 'Tube pulled back on turning'), migrationMm, `${migrationMm.toFixed(1)} mm`, 0, 20, 0.1, setMigrationMm, 'text-violet-300')}
              <p className="text-[10px] text-slate-500 leading-snug">
                {L('Yoon 2005 (100 patients, sonde gauche) : déplacement 6,3 ± 5,5 mm mesuré orifice trachéal ↔ carène (2,4 ± 3,6 mm côté bronchique) ; > 5 mm chez 48 %. Toujours recontrôler au fibroscope après le retournement.', 'Yoon 2005 (100 patients, left DLT): displacement 6.3 ± 5.5 mm measured tracheal opening ↔ carina (2.4 ± 3.6 mm on the bronchial side); > 5 mm in 48%. Always re-check with the bronchoscope after turning.')}
              </p>
            </>
          )}
        </div>

        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5" /> {L('3. Ventilation', '3. Ventilation')}
          </h2>
          <div className="grid grid-cols-3 gap-1.5">
            {(['none', 'tracheal', 'bronchial'] as D.Clamp[]).map((c) => (
              <button key={c} className={btn(clamp === c, 'text-[10px] leading-tight')} onClick={() => setClamp(c)}>
                {c === 'none' ? L('Deux poumons', 'Both lungs') : c === 'tracheal' ? L(`Clamp trachéal → ${lungName(lungOf('bronchial'))}`, `Clamp tracheal → ${lungName(lungOf('bronchial'))}`) : L(`Clamp bronchique → ${lungName(lungOf('tracheal'))}`, `Clamp bronchial → ${lungName(lungOf('tracheal'))}`)}
              </button>
            ))}
          </div>
          {slider(L('Volume courant', 'Tidal volume'), vtMl, `${vtMl} mL`, 200, 700, 10, setVtMl)}
          <div className="grid grid-cols-2 gap-3">
            {slider(L('Fréquence', 'Rate'), rr, `${rr}/min`, 8, 24, 1, setRr)}
            {slider('PEEP', peep, `${peep} cmH2O`, 0, 12, 1, setPeep)}
          </div>
          {slider('FiO2', Math.round(fio2 * 100), `${Math.round(fio2 * 100)} %`, 21, 100, 1, (v) => setFio2(v / 100), 'text-emerald-300')}
          {slider(L('Vasoconstriction hypoxique (VPH)', 'Hypoxic pulmonary vasoconstriction'), Math.round(hpv * 100), `${Math.round(hpv * 100)} %`, 0, 100, 5, (v) => setHpv(v / 100))}
        </div>

        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2.5">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" /> {L('4. Fibroscope', '4. Bronchoscope')}
            </h2>
            <button onClick={() => setScope({ lumen: scope.lumen, advanceMm: 0, steer: scope.steer, flexDeg: 0, twistDeg: 0 })} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white cursor-pointer">
              <RotateCcw className="w-3 h-3" /> {L('Au bout de la lumière', 'To lumen tip')}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(['tracheal', 'bronchial'] as const).map((l) => (
              <button key={l} className={btn(scope.lumen === l, 'text-[10px]')} onClick={() => nudge({ lumen: l, advanceMm: 0 })}>
                {l === 'tracheal' ? L('Par la lumière trachéale', 'Through tracheal lumen') : L('Par la lumière bronchique', 'Through bronchial lumen')}
              </button>
            ))}
          </div>
          {scope.lumen === 'tracheal' && (
            <div className="grid grid-cols-2 gap-1.5">
              {(['right', 'left'] as const).map((s) => (
                <button key={s} className={btn(scope.steer === s, 'text-[10px]')} onClick={() => nudge({ steer: s })}>
                  {s === 'right' ? L('Au-delà : bronche droite', 'Beyond: right bronchus') : L('Au-delà : bronche gauche', 'Beyond: left bronchus')}
                </button>
              ))}
            </div>
          )}
          {slider(L('Avancer (depuis l’orifice de la lumière)', 'Advance (from the lumen opening)'), scope.advanceMm, `${scope.advanceMm > 0 ? '+' : ''}${scope.advanceMm} mm`, -60, 90, 0.5, (v) => nudge({ advanceMm: v }), 'text-amber-300')}
          {slider(L('Béquillage', 'Tip flexion'), scope.flexDeg, `${scope.flexDeg}°`, -60, 60, 1, (v) => nudge({ flexDeg: v }))}
          {slider(L('Rotation', 'Rotation'), scope.twistDeg, `${scope.twistDeg}°`, -180, 180, 5, (v) => nudge({ twistDeg: v }))}
          <p className="text-[10px] text-slate-500 leading-snug">
            {L('Repère : par la lumière trachéale, la carène doit être nette et seul le bord supérieur du ballonnet bleu visible dans la bronche gauche. A = antérieur (anneaux cartilagineux), la paroi postérieure membraneuse n’a pas d’anneaux.', 'Landmark: through the tracheal lumen the carina should be sharp, with only the top edge of the blue cuff visible in the left bronchus. A = anterior (cartilage rings); the posterior membranous wall has no rings.')}
          </p>
        </div>

        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {L('Pourquoi une sonde gauche', 'Why a left-sided tube')}
          </div>
          <p>
            {L(
              `Bronche souche gauche ici : ${out ? mm(out.landmarks.leftMain) : '—'} ; droite jusqu’à l’orifice lobaire supérieur : ${out ? mm(out.landmarks.rul[0]) : '—'}. La marge de sécurité d’une sonde gauche (Benumof) est la longueur de la bronche gauche moins 30 mm entre le haut du ballonnet et l’extrémité. Une bronche gauche < 40 mm expose à plus de désaturation en ventilation unipulmonaire (Yao 2019).`,
              `Left main bronchus here: ${out ? mm(out.landmarks.leftMain) : '—'}; right main bronchus to the RUL orifice: ${out ? mm(out.landmarks.rul[0]) : '—'}. A left DLT's margin of safety (Benumof) is the left main length minus the 30 mm between the top of the cuff and the tip. A left main bronchus < 40 mm carries more desaturation during one-lung ventilation (Yao 2019).`
            )}
          </p>
          <p className="text-[10px] text-slate-500">
            {L(
              'Modèle de simulation : voies aériennes réelles (BodyParts3D, un homme adulte) recalées sur les moyennes de Benumof 1987 ; profondeur de Brodsky 1991 ; saturation de Severinghaus 1979. Compliance, résistances, shunt de base, poids de gravité et de VPH, tailles des lumières (À VÉRIFIER) et volumes lobaires sont illustratifs.',
              'Simulator model: real airway (BodyParts3D, one adult male) rescaled to the Benumof 1987 averages; Brodsky 1991 depth; Severinghaus 1979 saturation. Compliance, resistances, baseline shunt, gravity and HPV weights, lumen sizes (VERIFY) and lobe volumes are illustrative.'
            )}
          </p>
          <p className="text-[9px] text-slate-600">{ANATOMY_CREDIT}</p>
        </div>
      </aside>
    </main>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {text}
    </span>
  );
}

function Metric({ label, value, accent = 'text-slate-100' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1.5">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className={`font-mono font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

/**
 * Airway pressure trace for square-flow VCV (I:E 1:2, 10 % end-inspiratory pause) built from the model's
 * Ppeak / Pplat / PEEP, plus PaO2 (steady state) and SpO2 that follows it with a first-order lag (τ 30 s, illustrative).
 */
function OlvMonitor({ out, rr, peep, fr }: { out: D.DltOutputs | null; rr: number; peep: number; fr: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const live = useRef({ out, rr, peep });
  live.current = { out, rr, peep };
  const [spo2, setSpo2] = useState<number | null>(null);
  const spo2Ref = useRef<number | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let x = 0;
    let lastY: number | null = null;
    let t = 0;
    let uiTick = 0;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#03060c';
      ctx.fillRect(0, 0, r.width, r.height);
      x = 0;
      lastY = null;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();
    const paw = (tt: number, o: D.DltOutputs, rate: number, pe: number) => {
      const period = 60 / rate;
      const ti = period / 3;
      const ph = tt % period;
      const res = o.mech.pPeak - o.mech.pPlat;
      if (o.mech.deliveredVt <= 0) return ph < ti ? o.mech.pPeak : pe;
      const tf = ti * 0.9;
      if (ph < tf) return pe + res + (o.mech.pPlat - pe) * (ph / tf);
      if (ph < ti) return o.mech.pPlat;
      return pe + (o.mech.pPlat - pe) * Math.exp(-(ph - ti) / 0.35);
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { out: o, rr: rate, peep: pe } = live.current;
      if (!o) return;
      t += dt;
      // SpO2 lag
      const target = o.gas.sao2 * 100;
      spo2Ref.current = spo2Ref.current == null ? target : spo2Ref.current + (target - spo2Ref.current) * (1 - Math.exp(-dt / 30));
      uiTick += dt;
      if (uiTick > 0.5) {
        uiTick = 0;
        setSpo2(spo2Ref.current);
      }
      // trace
      const r = cv.getBoundingClientRect();
      const w = r.width;
      const h = r.height;
      const pxPerS = w / 10;
      const yOf = (p: number) => h - 6 - (Math.max(0, Math.min(60, p)) / 60) * (h - 12);
      const steps = Math.max(1, Math.ceil(dt * pxPerS));
      for (let k = 0; k < steps; k++) {
        const nx = x + (dt * pxPerS) / steps;
        const y = yOf(paw(t - dt + ((k + 1) * dt) / steps, o, rate, pe));
        ctx.fillStyle = '#03060c';
        ctx.fillRect(x, 0, nx - x + 8, h);
        ctx.strokeStyle = 'rgba(148,163,184,0.12)';
        ctx.lineWidth = 1;
        for (const g of [0, 20, 40]) {
          ctx.beginPath();
          ctx.moveTo(x, yOf(g));
          ctx.lineTo(nx + 8, yOf(g));
          ctx.stroke();
        }
        if (lastY != null) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(x, lastY);
          ctx.lineTo(nx, y);
          ctx.stroke();
        }
        lastY = y;
        x = nx;
        if (x >= w) {
          x = 0;
          lastY = null;
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const L = (f: string, e: string) => (fr ? f : e);
  const m = out?.mech;
  const g = out?.gas;
  const spo2Color = spo2 == null ? 'text-slate-400' : spo2 < 90 ? 'text-rose-400' : spo2 < 94 ? 'text-amber-300' : 'text-cyan-300';
  return (
    <div className="flex flex-col h-full gap-1.5">
      <div className="flex justify-between text-[10px] font-mono text-yellow-300">
        <span>Paw (cmH2O)</span>
        <span className="text-slate-500">0–60</span>
      </div>
      <canvas ref={canvasRef} className="w-full h-[96px] rounded bg-[#03060c]" />
      <div className="grid grid-cols-3 gap-1 text-center font-mono">
        <Vital label="Ppeak" value={m ? m.pPeak.toFixed(0) : '—'} color={m && m.pPeak > 35 ? 'text-rose-400' : 'text-yellow-300'} />
        <Vital label="Pplat" value={m ? m.pPlat.toFixed(0) : '—'} color={m && m.pPlat > 30 ? 'text-rose-400' : 'text-yellow-300'} />
        <Vital label={L('Vt délivré', 'Vt deliv.')} value={m ? m.deliveredVt.toFixed(0) : '—'} color="text-slate-100" />
        <Vital label="SpO2" value={spo2 != null ? spo2.toFixed(0) : '—'} color={spo2Color} big />
        <Vital label="PaO2" value={g ? g.pao2.toFixed(0) : '—'} color="text-emerald-300" big />
        <Vital label="Qs/Qt" value={g ? `${(g.shunt * 100).toFixed(0)}%` : '—'} color="text-slate-100" big />
      </div>
      <p className="text-[9px] text-slate-500 leading-snug">
        {L('PaO2 à l’équilibre (gaz alvéolaire + shunt, Hb 13,5, VO2 250, Qt 5 L/min) ; la SpO2 la suit avec un retard (τ 30 s, illustratif).', 'PaO2 at steady state (alveolar gas + shunt, Hb 13.5, VO2 250, Qt 5 L/min); SpO2 follows with a lag (τ 30 s, illustrative).')}
      </p>
    </div>
  );
}

function Vital({ label, value, color, big }: { label: string; value: string; color: string; big?: boolean }) {
  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded px-1 py-1">
      <div className="text-[9px] text-slate-500">{label}</div>
      <div className={`${big ? 'text-lg' : 'text-sm'} font-bold leading-tight ${color}`}>{value}</div>
    </div>
  );
}
