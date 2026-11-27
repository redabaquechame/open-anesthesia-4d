import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { EDPVR, simulateHeart, type CardioResult, type ValveLesion } from '../../physics/cardiovascularKernel';
import type { LocaleCode } from '../../standards/clinicalStandards';

const LESIONS: { id: ValveLesion; en: string; fr: string }[] = [
  { id: 'normal', en: 'Normal', fr: 'Normal' },
  { id: 'as', en: 'Aortic stenosis', fr: 'Rétrécissement aortique' },
  { id: 'ar', en: 'Aortic regurgitation', fr: 'Insuffisance aortique' },
  { id: 'ms', en: 'Mitral stenosis', fr: 'Rétrécissement mitral' },
  { id: 'mr', en: 'Mitral regurgitation', fr: 'Insuffisance mitrale' },
];

const SHOCK_MATRIX = [
  { type: { fr: 'Distributif anaphylactique', en: 'Anaphylactic distributive' }, firstLine: { fr: 'Adrénaline (vasoconstricteur, inotrope, inhibe l’activation mastocytaire) — RCUK 2021', en: 'Adrenaline (vasoconstrictor, inotrope, inhibits mast-cell activation) — RCUK 2021' }, color: 'text-rose-300' },
  { type: { fr: 'Distributif septique', en: 'Septic distributive' }, firstLine: { fr: 'Cristalloïdes puis noradrénaline → ajouter la vasopressine si les doses augmentent — SSC 2026', en: 'Crystalloid then noradrenaline → add vasopressin as doses rise — SSC 2026' }, color: 'text-amber-300' },
  { type: { fr: 'Cardiogénique', en: 'Cardiogenic' }, firstLine: { fr: 'Inotrope selon le contexte (évaluer VG, VD, valves) — non vérifié', en: 'Context-dependent inotrope (assess LV/RV/valves) — not checked' }, color: 'text-cyan-300' },
  { type: { fr: 'Hémorragique / hypovolémique', en: 'Haemorrhagic / hypovolaemic' }, firstLine: { fr: 'Arrêter le saignement + produits sanguins ; noradrénaline seulement transitoire si les cibles ne sont pas atteintes — trauma européen 2023', en: 'Stop the bleeding + blood products; noradrenaline only transiently if targets fail — European trauma 2023' }, color: 'text-emerald-300' },
];

export function PvLoopLab({ locale }: { locale: LocaleCode }) {
  const fr = locale !== 'en-INT';
  const [lesion, setLesion] = useState<ValveLesion>('normal');
  const [preload, setPreload] = useState(1);
  const [afterload, setAfterload] = useState(1);
  const [contractility, setContractility] = useState(1);
  const [hr, setHr] = useState(75);
  const loopRef = useRef<HTMLCanvasElement | null>(null);
  const traceRef = useRef<HTMLCanvasElement | null>(null);

  const normal = useMemo(() => simulateHeart({ lesion: 'normal', preloadScale: 1, afterloadScale: 1, contractilityScale: 1, heartRateBpm: 75 }), []);
  const result = useMemo(
    () => simulateHeart({ lesion, preloadScale: preload, afterloadScale: afterload, contractilityScale: contractility, heartRateBpm: hr }),
    [lesion, preload, afterload, contractility, hr]
  );

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const period = 60 / hr;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const phase = (((performance.now() - start) / 1000) % period) / period;
      drawLoop(loopRef.current, result, normal, phase, fr);
      drawTraces(traceRef.current, result, phase, fr);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [result, normal, hr, fr]);

  const slider = (label: string, v: number, setV: (n: number) => void, min: number, max: number, step: number, fmt: (n: number) => string) => (
    <label className="block">
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="font-mono">{fmt(v)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => setV(parseFloat(e.target.value))} className="w-full" />
    </label>
  );

  const metric = (label: string, value: string, warn = false) => (
    <div className="flex justify-between py-0.5 border-b border-slate-800/70">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono ${warn ? 'text-amber-300' : 'text-slate-100'}`}>{value}</span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      <section className="lg:col-span-8 bg-[#060a12] border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-rose-400" /> {fr ? 'Boucle pression–volume du VG (modèle à élastance)' : 'LV pressure–volume loop (elastance model)'}
          </h2>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {LESIONS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLesion(l.id)}
                className={`px-2.5 py-1 rounded-lg border cursor-pointer ${lesion === l.id ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}
              >
                {fr ? l.fr : l.en}
              </button>
            ))}
          </div>
        </div>
        <canvas ref={loopRef} className="w-full h-[340px] block rounded-lg bg-[#04070e]" />
        <canvas ref={traceRef} className="w-full h-[150px] block rounded-lg bg-[#04070e]" />
        <p className="text-[10px] text-slate-500 leading-relaxed">
          {fr
            ? 'Modèle de simulateur : ventricule à élastance variable (Suga & Sagawa), valves par la relation de Bernoulli simplifiée, post-charge en Windkessel à 3 éléments (Westerhof). Paramètres illustratifs réglés sur des valeurs adultes de manuel.'
            : 'Simulator model: time-varying elastance ventricle (Suga & Sagawa), valves from the simplified Bernoulli relation, 3-element Windkessel afterload (Westerhof). Parameters are illustrative, tuned to textbook adult values.'}
        </p>
      </section>

      <aside className="lg:col-span-4 flex flex-col gap-3 text-xs">
        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">{fr ? 'Déterminants' : 'Determinants'}</h3>
          {slider(fr ? 'Précharge (retour veineux)' : 'Preload (venous return)', preload, setPreload, 0.5, 1.5, 0.05, (n) => `${n.toFixed(2)}×`)}
          {slider(fr ? 'Post-charge (résistance)' : 'Afterload (resistance)', afterload, setAfterload, 0.5, 1.8, 0.05, (n) => `${n.toFixed(2)}×`)}
          {slider(fr ? 'Contractilité (Ees)' : 'Contractility (Ees)', contractility, setContractility, 0.3, 1.6, 0.05, (n) => `${n.toFixed(2)}×`)}
          {slider(fr ? 'Fréquence cardiaque' : 'Heart rate', hr, setHr, 45, 140, 1, (n) => `${n} bpm`)}
          <button
            onClick={() => {
              setPreload(1);
              setAfterload(1);
              setContractility(1);
              setHr(75);
            }}
            className="w-full py-1 rounded-lg border border-slate-700 hover:border-cyan-500 cursor-pointer"
          >
            {fr ? 'Réinitialiser' : 'Reset'}
          </button>
        </div>

        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 text-[11px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">{fr ? 'Résultats du modèle' : 'Model output'}</h3>
          {metric('EDV / ESV', `${result.edv.toFixed(0)} / ${result.esv.toFixed(0)} mL`)}
          {metric(fr ? 'VES total / antérograde' : 'Total / forward SV', `${result.totalSv.toFixed(0)} / ${result.forwardSv.toFixed(0)} mL`, result.forwardSv < result.totalSv * 0.8)}
          {metric(fr ? 'FE' : 'EF', `${(result.ef * 100).toFixed(0)} %`)}
          {metric(fr ? 'Fraction régurgitante' : 'Regurgitant fraction', `${(result.regurgitantFraction * 100).toFixed(0)} %`, result.regurgitantFraction > 0.3)}
          {metric(fr ? 'PA aortique' : 'Aortic BP', `${result.aoSysMmHg.toFixed(0)}/${result.aoDiaMmHg.toFixed(0)} (${result.mapMmHg.toFixed(0)}) mmHg`, result.mapMmHg < 65)}
          {metric(fr ? 'Pic VG / PTDVG' : 'LV peak / LVEDP', `${result.lvPeakMmHg.toFixed(0)} / ${result.lvedpMmHg.toFixed(0)} mmHg`, result.lvedpMmHg > 18)}
          {metric(fr ? 'Gradient aortique moyen' : 'Mean aortic gradient', `${result.meanAorticGradientMmHg.toFixed(0)} mmHg`, result.meanAorticGradientMmHg > 20)}
          {metric(fr ? 'Gradient mitral moyen' : 'Mean mitral gradient', `${result.meanMitralGradientMmHg.toFixed(1)} mmHg`, result.meanMitralGradientMmHg > 5)}
          {metric(fr ? 'Débit cardiaque' : 'Cardiac output', `${result.cardiacOutputLpm.toFixed(1)} L/min`, result.cardiacOutputLpm < 4)}
        </div>

        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">{fr ? 'Vasopresseurs selon le type de choc' : 'Shock-type vasopressor framework'}</h3>
          {SHOCK_MATRIX.map((row) => (
            <div key={row.type.en} className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className={`font-bold ${row.color}`}>{fr ? row.type.fr : row.type.en}</div>
              <div className="text-[11px] text-slate-300">{fr ? row.firstLine.fr : row.firstLine.en}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function prep(canvas: HTMLCanvasElement | null) {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#04070e';
  ctx.fillRect(0, 0, w, h);
  return { ctx, w, h };
}

function drawLoop(canvas: HTMLCanvasElement | null, r: CardioResult, normal: CardioResult, phase: number, fr: boolean) {
  const c = prep(canvas);
  if (!c) return;
  const { ctx, w, h } = c;
  const left = 48;
  const bottom = h - 30;
  const vMax = 240;
  const pMax = Math.max(160, Math.ceil((r.lvPeakMmHg + 20) / 20) * 20);
  const x = (v: number) => left + (v / vMax) * (w - left - 14);
  const y = (p: number) => bottom - (p / pMax) * (bottom - 14);

  // Grid + axes
  ctx.strokeStyle = '#111c2e';
  ctx.lineWidth = 1;
  ctx.font = '10px ui-monospace, monospace';
  ctx.fillStyle = '#64748b';
  for (let v = 0; v <= vMax; v += 40) {
    ctx.beginPath();
    ctx.moveTo(x(v), 14);
    ctx.lineTo(x(v), bottom);
    ctx.stroke();
    ctx.fillText(`${v}`, x(v) - 8, bottom + 13);
  }
  for (let p = 0; p <= pMax; p += 40) {
    ctx.beginPath();
    ctx.moveTo(left, y(p));
    ctx.lineTo(w - 14, y(p));
    ctx.stroke();
    ctx.fillText(`${p}`, left - 26, y(p) + 3);
  }
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(fr ? 'Pression VG (mmHg)' : 'LV pressure (mmHg)', left + 4, 24);
  ctx.fillText(fr ? 'Volume VG (mL)' : 'LV volume (mL)', w - 110, bottom - 6);

  // ESPVR line (slope Ees through V0) and EDPVR curve
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
  ctx.beginPath();
  ctx.moveTo(x(r.v0), y(0));
  const vTop = r.v0 + pMax / r.ees;
  ctx.lineTo(x(Math.min(vMax, vTop)), y(Math.min(pMax, (Math.min(vMax, vTop) - r.v0) * r.ees)));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
  ctx.beginPath();
  for (let v = r.v0; v <= vMax; v += 4) {
    const p = EDPVR.a * (Math.exp(EDPVR.b * (v - r.v0)) - 1);
    if (p > pMax) break;
    v === r.v0 ? ctx.moveTo(x(v), y(p)) : ctx.lineTo(x(v), y(p));
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(250, 204, 21, 0.8)';
  ctx.fillText('ESPVR', x(Math.min(vMax - 30, r.v0 + (pMax * 0.85) / r.ees)) + 4, y(pMax * 0.85));
  ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
  ctx.fillText('EDPVR', x(200), y(Math.min(pMax - 10, EDPVR.a * (Math.exp(EDPVR.b * 190) - 1))) - 6);

  // Normal ghost loop
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  normal.loop.forEach((pt, i) => (i ? ctx.lineTo(x(pt.v), y(pt.p)) : ctx.moveTo(x(pt.v), y(pt.p))));
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Active loop with stroke-work fill
  ctx.fillStyle = 'rgba(244, 63, 94, 0.16)';
  ctx.strokeStyle = '#fb7185';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  r.loop.forEach((pt, i) => (i ? ctx.lineTo(x(pt.v), y(pt.p)) : ctx.moveTo(x(pt.v), y(pt.p))));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Moving state marker
  const pt = r.loop[Math.min(r.loop.length - 1, Math.floor(phase * r.loop.length))];
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x(pt.v), y(pt.p), 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawTraces(canvas: HTMLCanvasElement | null, r: CardioResult, phase: number, fr: boolean) {
  const c = prep(canvas);
  if (!c) return;
  const { ctx, w, h } = c;
  const left = 48;
  const pMax = Math.max(150, Math.ceil((r.lvPeakMmHg + 10) / 25) * 25);
  const n = r.loop.length;
  const x = (i: number) => left + (i / (n - 1)) * (w - left - 10);
  const y = (p: number) => h - 18 - (p / pMax) * (h - 30);
  ctx.font = '10px ui-monospace, monospace';
  ctx.fillStyle = '#64748b';
  for (const p of [0, pMax / 2, pMax]) ctx.fillText(`${p.toFixed(0)}`, left - 28, y(p) + 3);
  const line = (key: 'p' | 'pAo' | 'pLa', color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    r.loop.forEach((pt, i) => (i ? ctx.lineTo(x(i), y(pt[key])) : ctx.moveTo(x(i), y(pt[key]))));
    ctx.stroke();
  };
  line('pAo', '#f87171');
  line('p', '#e2e8f0');
  line('pLa', '#38bdf8');
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(x(phase * (n - 1)), 6);
  ctx.lineTo(x(phase * (n - 1)), h - 18);
  ctx.stroke();
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(fr ? 'VG' : 'LV', w - 110, 14);
  ctx.fillStyle = '#f87171';
  ctx.fillText(fr ? 'Aorte' : 'Aorta', w - 85, 14);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(fr ? 'OG' : 'LA', w - 40, 14);
}
