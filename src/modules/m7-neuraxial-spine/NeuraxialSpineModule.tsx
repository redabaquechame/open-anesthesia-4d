import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Crosshair, RotateCcw, Scissors, Tag } from 'lucide-react';
import type { LocaleCode } from '../../standards/clinicalStandards';
import { ANATOMY_CREDIT } from '../../engine/loadAnatomy';
import { createSpineScene, REGIONS, spaceName, type Approach, type SpineOutputs, type SpineRegion, type SpineScene, type SpineView } from './spineScene';
import { TISSUE_INFO, type SpineTissue } from './spineGeometry';
import type { FluoroProjection } from './fluoroView';
import { ClinicalStepper } from '../../components/ClinicalStepper';

const MAX_DEPTH_MM = 90;

export function NeuraxialSpineModule({ locale }: { locale: LocaleCode }) {
  const fr = locale !== 'en-INT';
  const L = (f: string, e: string) => (fr ? f : e);

  const [region, setRegion] = useState<SpineRegion>('lumbar');
  const [space, setSpace] = useState(REGIONS.lumbar.defaultSpace);
  const [approach, setApproach] = useState<Approach>('midline');
  const [flexion, setFlexion] = useState(0.6);
  const [softTissueMm, setSoftTissueMm] = useState(15);
  const [entryOffsetMm, setEntryOffsetMm] = useState(0);
  const [cephaladDeg, setCephaladDeg] = useState(REGIONS.lumbar.defaults.midline.ceph);
  const [medialDeg, setMedialDeg] = useState(REGIONS.lumbar.defaults.paramedian.med);
  const [depthMm, setDepthMm] = useState(15);
  const [cut, setCut] = useState(true);
  const [boneOpacity, setBoneOpacity] = useState(1);
  const [labels, setLabels] = useState(false); // 3D labels off at load (DESIGN.md §1.5)
  const [fluoro, setFluoro] = useState<FluoroProjection>('LAT');
  const [out, setOut] = useState<SpineOutputs | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [lorFlash, setLorFlash] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const fluoroRef = useRef<HTMLDivElement | null>(null);
  const fluoroLabelsRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<SpineScene | null>(null);
  const prevTissue = useRef<SpineTissue | null>(null);

  const wantSuggest = useRef(true);
  const [suggested, setSuggested] = useState<boolean | null>(null);
  const resetNeedle = (r: SpineRegion, a: Approach) => {
    setCephaladDeg(REGIONS[r].defaults[a].ceph);
    setMedialDeg(REGIONS[r].defaults.paramedian.med);
    setEntryOffsetMm(0);
    setDepthMm(15);
    wantSuggest.current = true;
  };

  useEffect(() => {
    const container = viewportRef.current;
    const fluoroBox = fluoroRef.current;
    if (!container || !fluoroBox) return;
    let cancelled = false;
    let sc: SpineScene | null = null;
    createSpineScene(container, fluoroBox)
      .then((s) => {
        if (cancelled) {
          s.dispose();
          return;
        }
        sc = s;
        sceneRef.current = s;
        s.setFluoroLabels(fluoroLabelsRef.current);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
      sceneRef.current = null;
      sc?.dispose();
    };
  }, []);

  useEffect(() => {
    const s = sceneRef.current;
    if (!s || status !== 'ready') return;
    const inputs = { region, space, approach, flexion, softTissueMm, entryOffsetMm, cephaladDeg, medialDeg, depthMm, cut, boneOpacity, labels, fluoro, fr };
    if (wantSuggest.current) {
      // Start on a typical successful trajectory for this anatomy (found by tracing the real bones).
      wantSuggest.current = false;
      const sug = s.suggestStart({ ...inputs, cephaladDeg: REGIONS[region].defaults[approach].ceph });
      setSuggested(!!sug);
      if (sug && (sug.entryOffsetMm !== entryOffsetMm || sug.cephaladDeg !== cephaladDeg)) {
        setEntryOffsetMm(sug.entryOffsetMm);
        setCephaladDeg(sug.cephaladDeg);
        return;
      }
    }
    const o = s.update(inputs);
    setOut(o);
    const t = o.result.tissue;
    if (prevTissue.current === 'flavum' && t === 'epidural') {
      setLorFlash(true);
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(40);
      window.setTimeout(() => setLorFlash(false), 1400);
    }
    prevTissue.current = t;
  }, [status, region, space, approach, flexion, softTissueMm, entryOffsetMm, cephaladDeg, medialDeg, depthMm, cut, boneOpacity, labels, fluoro, fr]);

  const res = out?.result;
  const tissue: SpineTissue = res?.tissue ?? 'outside';
  const info = TISSUE_INFO[tissue];
  const def = REGIONS[region];
  const atBone = tissue === 'bone';
  const statusText = (() => {
    if (!res) return '';
    if (atBone) {
      const what = out?.boneStructure === 'spinous' ? L('apophyse épineuse', 'spinous process') : out?.boneStructure === 'lamina' ? L('lame', 'lamina') : L('massif articulaire / pédicule', 'facet / pedicle');
      return `${L('Contact osseux', 'Bone contact')} — ${what} ${out?.boneName ?? ''} ${L('à', 'at')} ${(res.boneAt! * 1000).toFixed(0)} mm. ${L('Retirer et réorienter', 'Withdraw and redirect')}.`;
    }
    const base = fr ? info.fr : info.en;
    if (tissue === 'flavum') return `${base} — ${L('résistance franche : avancer millimètre par millimètre', 'firm resistance: advance millimetre by millimetre')}`;
    if (tissue === 'epidural') return `${base} — ${L('perte de résistance : arrêter, ne plus avancer', 'loss of resistance: stop, do not advance')}`;
    if (tissue === 'csf') return `${base} — ${L('l’aiguille a traversé la dure-mère', 'the needle has crossed the dura')}`;
    if (tissue === 'cord') return `${base} — ${L('ARRÊT : l’aiguille est dans la moelle', 'STOP: the needle is in the cord')}`;
    if (tissue === 'lateral') return `${base} — ${L('trop latéral : réorienter vers la ligne médiane', 'too lateral: redirect toward the midline')}`;
    return base;
  })();
  const statusColor =
    tissue === 'epidural' ? 'text-emerald-300' : tissue === 'cord' || tissue === 'csf' ? 'text-rose-400' : tissue === 'flavum' ? 'text-amber-300' : atBone ? 'text-orange-300' : 'text-slate-300';

  // Depth ruler extent.
  const rulerMax = MAX_DEPTH_MM;
  const pct = (m: number) => `${Math.max(0, Math.min(100, ((m * 1000) / rulerMax) * 100))}%`;

  const btn = (on: boolean, extra = '') =>
    `px-2 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${on ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'} ${extra}`;

  // Tactile stepper (DESIGN.md §1.4) in place of a raw range slider; same ranges and steps as before.
  const slider = (label: string, value: number, unit: string, min: number, max: number, step: number, set: (v: number) => void, color = 'text-slate-200') => (
    <ClinicalStepper
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      decimals={step < 1 ? 1 : 0}
      unit={unit.trim()}
      tone={color}
      onChange={set}
    />
  );

  return (
    <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
      <section className="lg:col-span-8 flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* 3D */}
          <div className="md:col-span-3 bg-oa-canvas border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="px-3 py-2 bg-oa-surface2 border-b border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-bold text-cyan-300 mr-auto">
                {L('Rachis réel — ', 'Real spine — ')}
                {region === 'lumbar' ? 'L2–L5' : 'T4–T9'}
              </span>
              {(['side', 'back', 'needle'] as SpineView[]).map((v) => (
                <button key={v} onClick={() => sceneRef.current?.setView(v)} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 cursor-pointer hover:border-cyan-500">
                  {v === 'side' ? L('Profil', 'Side') : v === 'back' ? L('Dos', 'Back') : L('Axe aiguille', 'Needle axis')}
                </button>
              ))}
              <button onClick={() => setCut(!cut)} title={L('Coupe sagittale', 'Sagittal cut')} className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-1 cursor-pointer ${cut ? 'bg-cyan-700 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
                <Scissors className="w-3 h-3" /> {L('Coupe', 'Cut')}
              </button>
              <button onClick={() => setLabels(!labels)} title={L('Étiquettes', 'Labels')} className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-1 cursor-pointer ${labels ? 'bg-cyan-700 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
                <Tag className="w-3 h-3" />
              </button>
            </div>
            <div ref={viewportRef} className="relative w-full h-[380px] touch-none">
              {status !== 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                  {status === 'loading' ? L('Chargement de l’anatomie…', 'Loading anatomy…') : L('Impossible de charger le modèle 3D.', 'Could not load the 3D model.')}
                </div>
              )}
            </div>
            <div className={`px-3 py-2 bg-slate-950 border-t border-slate-800 text-xs font-semibold min-h-[2.5rem] ${statusColor}`}>{statusText}</div>
          </div>

          {/* C-arm */}
          <div className="md:col-span-2 bg-oa-canvas border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="px-3 py-2 bg-oa-surface2 border-b border-slate-800 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-100 flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5 text-amber-400" /> {L('Amplificateur de brillance', 'C-arm fluoroscopy')}
              </span>
              <div className="flex gap-1">
                {(['AP', 'LAT', 'OBL'] as FluoroProjection[]).map((v) => (
                  <button key={v} onClick={() => setFluoro(v)} className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${fluoro === v ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'}`}>
                    {v === 'AP' ? 'F' : v === 'LAT' ? 'P' : 'OBL'}
                    <span className="sr-only">{v}</span>
                  </button>
                ))}
              </div>
            </div>
            <div ref={fluoroRef} className="relative w-full h-[380px] bg-black">
              <div ref={fluoroLabelsRef} className="absolute inset-0 pointer-events-none" />
              <div className="absolute bottom-2 right-3 text-[10px] font-mono text-yellow-300/90">
                {fluoro === 'AP' ? L('Face', 'AP') : fluoro === 'LAT' ? L('Profil', 'Lateral') : L('Oblique 35°', 'Oblique 35°')}
              </div>
            </div>
            <div className="px-3 py-2 bg-oa-surface2 border-t border-slate-800 flex items-center gap-2 text-xs">
              <span className="font-mono text-[10px] text-slate-300 shrink-0">{L('Seringue PDR', 'LOR syringe')}</span>
              <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-200 ${info.resistance > 80 ? 'bg-amber-400' : info.resistance < 12 ? 'bg-emerald-400' : 'bg-cyan-500'}`}
                  style={{ width: `${info.resistance}%` }}
                />
              </div>
              <span className="font-mono text-[10px] w-8 text-right">{info.resistance}</span>
            </div>
          </div>
        </div>

        {/* Depth ruler */}
        <div className={`bg-oa-surface border rounded-xl p-3 transition-colors ${lorFlash ? 'border-emerald-400' : 'border-slate-800'}`}>
          <div className="flex justify-between items-baseline text-[11px] mb-1.5">
            <span className="font-bold uppercase tracking-wider text-cyan-400">{L('Couches traversées sur cette trajectoire', 'Layers along this trajectory')}</span>
            {lorFlash && <span className="font-bold text-emerald-300 animate-pulse">{L('PERTE DE RÉSISTANCE', 'LOSS OF RESISTANCE')}</span>}
          </div>
          <div className="relative h-6 rounded-md overflow-hidden bg-slate-900 border border-slate-700">
            {res?.path.map((seg, i) => (
              <div
                key={i}
                title={`${fr ? TISSUE_INFO[seg.tissue].fr : TISSUE_INFO[seg.tissue].en}: ${(seg.from * 1000).toFixed(0)}–${(seg.to * 1000).toFixed(0)} mm`}
                className="absolute top-0 bottom-0"
                style={{ left: pct(seg.from), width: `calc(${pct(seg.to)} - ${pct(seg.from)})`, background: TISSUE_INFO[seg.tissue].color, opacity: seg.to <= (res?.reached ?? 0) + 1e-4 ? 1 : 0.35 }}
              />
            ))}
            {res && <div className="absolute top-[-2px] bottom-[-2px] w-[3px] bg-white shadow" style={{ left: pct(res.reached) }} />}
          </div>
          <div className="relative h-3 text-[9px] font-mono text-slate-500">
            {Array.from({ length: rulerMax / 10 + 1 }, (_, k) => (
              <span key={k} className="absolute -translate-x-1/2" style={{ left: `${((k * 10) / rulerMax) * 100}%` }}>
                {k * 10}
              </span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <Metric label={L('Profondeur atteinte', 'Depth reached')} value={res ? `${(res.reached * 1000).toFixed(0)} mm` : '—'} />
            <Metric label={L('Ligament jaune à', 'Flavum at')} value={res?.flavumAt != null ? `${(res.flavumAt * 1000).toFixed(0)} mm` : L('non atteint', 'not reached')} />
            <Metric label={L('Espace péridural à', 'Epidural space at')} value={res?.epiduralAt != null ? `${(res.epiduralAt * 1000).toFixed(0)} mm` : L('non atteint', 'not reached')} accent="text-emerald-300" />
            <Metric label={L('Os sur la trajectoire', 'Bone on this path')} value={res?.boneAt != null ? `${(res.boneAt * 1000).toFixed(0)} mm` : L('aucun', 'none')} accent="text-orange-300" />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
            {(['skin', 'fat', 'ligament', 'muscle', 'flavum', 'epidural', 'csf', ...(region === 'thoracic' ? (['cord'] as const) : [])] as SpineTissue[]).map((t) => (
              <span key={t} className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: TISSUE_INFO[t].color }} />
                {fr ? TISSUE_INFO[t].fr : TISSUE_INFO[t].en}
              </span>
            ))}
          </div>
        </div>
      </section>

      <aside className="lg:col-span-4 flex flex-col gap-3 text-xs">
        <div className="bg-oa-surface border border-slate-800 rounded-xl p-3 space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400">{L('1. Niveau, abord, patient', '1. Level, approach, patient')}</h2>
          <div className="grid grid-cols-2 gap-1.5">
            {(['lumbar', 'thoracic'] as SpineRegion[]).map((r) => (
              <button
                key={r}
                className={btn(region === r)}
                onClick={() => {
                  setRegion(r);
                  setSpace(REGIONS[r].defaultSpace);
                  const a: Approach = r === 'thoracic' ? 'paramedian' : 'midline';
                  setApproach(a);
                  resetNeedle(r, a);
                }}
              >
                {r === 'lumbar' ? L('Lombaire (L2–L5)', 'Lumbar (L2–L5)') : L('Thoracique (T4–T9)', 'Thoracic (T4–T9)')}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {def.verts.slice(0, -1).map((_, i) => (
              <button key={i} className={btn(space === i, 'font-mono')} onClick={() => { setSpace(i); resetNeedle(region, approach); }}>
                {spaceName(region, i)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(['midline', 'paramedian'] as Approach[]).map((a) => (
              <button key={a} className={btn(approach === a)} onClick={() => { setApproach(a); resetNeedle(region, a); }}>
                {a === 'midline' ? L('Médian', 'Midline') : L('Paramédian (1 cm)', 'Paramedian (1 cm)')}
              </button>
            ))}
          </div>
          {slider(L('Flexion du rachis (dos rond)', 'Spine flexion (rounded back)'), Math.round(flexion * 100), ' %', 0, 100, 5, (v) => setFlexion(v / 100))}
          {slider(L('Tissus mous sur les épineuses', 'Soft tissue over spinous processes'), softTissueMm, ' mm', 8, 50, 1, setSoftTissueMm)}
        </div>

        <div className="bg-oa-surface border border-slate-800 rounded-xl p-3 space-y-2.5">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-rose-300">{L('2. Aiguille de Tuohy 17 G', '2. Tuohy needle 17 G')}</h2>
            <button onClick={() => resetNeedle(region, approach)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white cursor-pointer">
              <RotateCcw className="w-3 h-3" /> {L('Retirer', 'Withdraw')}
            </button>
          </div>
          {slider(L('Point de ponction (crânial +)', 'Entry point (cranial +)'), entryOffsetMm, ' mm', -20, 20, 1, setEntryOffsetMm)}
          {slider(L('Angle céphalique', 'Cephalad angle'), cephaladDeg, '°', 0, 70, 1, setCephaladDeg, 'text-cyan-300')}
          {approach === 'paramedian' && slider(L('Angle médial', 'Medial angle'), medialDeg, '°', 0, 30, 1, setMedialDeg, 'text-cyan-300')}
          <div>
            {slider(L('Progression', 'Advance'), depthMm, ' mm', 0, MAX_DEPTH_MM, 0.5, setDepthMm, 'text-rose-300')}
            <div className="flex gap-1 mt-1">
              {[-5, -1, -0.5, 0.5, 1, 5].map((d) => (
                <button key={d} onClick={() => setDepthMm((v) => Math.max(0, Math.min(MAX_DEPTH_MM, Math.round((v + d) * 2) / 2)))} className="flex-1 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] cursor-pointer hover:border-rose-400">
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </div>
          </div>
          {suggested !== null && (
            <p className="text-[10px] text-slate-500 leading-snug">
              {suggested
                ? L('« Retirer » replace l’aiguille sur une trajectoire type qui atteint l’espace péridural pour cette anatomie (calculée sur les os réels). Modifiez-la pour sentir la différence.', '"Withdraw" puts the needle back on a typical trajectory that reaches the epidural space for this anatomy (traced on the real bones). Change it to feel the difference.')
                : L('Aucune trajectoire proche n’atteint l’espace péridural à cette flexion : arrondissez le dos ou changez d’abord.', 'No nearby trajectory reaches the epidural space at this flexion: round the back more or change approach.')}
            </p>
          )}
          {slider(L('Opacité des os', 'Bone opacity'), Math.round(boneOpacity * 100), ' %', 20, 100, 5, (v) => setBoneOpacity(v / 100))}
        </div>

        <div className="bg-oa-surface border border-slate-800 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {L('À observer', 'Things to notice')}
          </div>
          {region === 'thoracic' ? (
            <p>
              {L(
                'Thoracique moyen : les épineuses descendent en tuiles. Une aiguille médiane peu inclinée bute sur l’épineuse. En paramédian, toucher d’abord la lame, puis augmenter l’angle céphalique pour « glisser » au-dessus d’elle dans le ligament jaune. La moelle est juste sous la dure-mère.',
                'Mid-thoracic: spinous processes overlap like roof tiles. A shallow midline needle meets the spinous process. Paramedian: touch the lamina first, then increase the cephalad angle to "walk off" its upper edge into the ligamentum flavum. The cord lies just under the dura.'
              )}
            </p>
          ) : (
            <p>
              {L(
                'Lombaire : épineuses presque horizontales. Le dos rond ouvre les fenêtres interlamaires (regardez la radio de profil). La profondeur peau–espace péridural dépend surtout de l’épaisseur des tissus mous.',
                'Lumbar: spinous processes are nearly horizontal. Flexing the back opens the interlaminar windows (watch the lateral X-ray). Skin-to-epidural depth depends mostly on soft-tissue thickness.'
              )}
            </p>
          )}
          <p className="text-[10px] text-slate-500">
            {L(
              `Modèle de simulation : vertèbres réelles (BodyParts3D, un homme adulte, posture debout) ; ligament jaune, espace péridural, dure-mère et moelle placés à partir du canal mesuré, épaisseurs illustratives. Profondeur du canal mesurée ici : ${out ? out.canalDepthMm.toFixed(0) : '—'} mm. Résistances de la seringue illustratives.`,
              `Simulator model: real vertebrae (BodyParts3D, one adult male, standing posture); flavum, epidural space, dura and cord placed from the measured canal with illustrative thicknesses. Canal depth measured here: ${out ? out.canalDepthMm.toFixed(0) : '—'} mm. Syringe resistances are illustrative.`
            )}
          </p>
          <p className="text-[10px] text-slate-400">
            {L(
              'Repère publié : distance peau–espace péridural médiane 4,7 cm (L3–L4 : 4,93 cm) chez 1000 parturientes (Harrison & Clowes, Anaesthesia 1985). Ne jamais se fier à une profondeur fixe.',
              'Published reference: median skin-to-epidural distance 4.7 cm (L3–L4: 4.93 cm) in 1000 parturients (Harrison & Clowes, Anaesthesia 1985). Never rely on a fixed depth.'
            )}
          </p>
          <p className="text-[9px] text-slate-600">{ANATOMY_CREDIT}</p>
        </div>
      </aside>
    </main>
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
