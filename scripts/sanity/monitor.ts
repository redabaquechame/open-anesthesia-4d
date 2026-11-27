/**
 * Bedside-monitor waveforms: the ECGSYN closed form gives plausible intervals, the QT shortens as
 * the rate rises, and the capnogram plateau reaches the displayed EtCO2.
 */
import { arterialShape, capnoMmHg, ecgMv, plethShape } from '../../src/physics/monitorWaveforms';

type Check = (name: string, ok: boolean, detail: string) => void;

function intervals(hr: number) {
  const n = 4000;
  const beat = 60 / hr;
  const v = Array.from({ length: n }, (_, i) => ecgMv(i / n, hr));
  const rIdx = v.indexOf(Math.max(...v));
  // QRS: span around R where |v| > 10 % of R
  let a = rIdx;
  while (a > 0 && Math.abs(v[a]) > 0.1) a--;
  let b = rIdx;
  while (b < n - 1 && Math.abs(v[b]) > 0.1) b++;
  // QRS onset/offset including Q and S troughs
  let q = a;
  while (q > 0 && v[q - 1] < v[q] + 1e-6 && v[q] < 0) q--;
  // T peak after S
  let tPeak = rIdx + Math.round(0.05 * n);
  for (let i = tPeak; i < n; i++) if (v[i] > v[tPeak]) tPeak = i;
  return { rPhase: rIdx / n, qrsMs: ((b - a) / n) * beat * 1000, rtMs: ((tPeak - rIdx) / n) * beat * 1000 };
}

export function runMonitorChecks(check: Check) {
  const i60 = intervals(60);
  const i120 = intervals(120);
  check('Monitor ECG: R wave at phase 0.25, R peak 1.0 mV', Math.abs(i60.rPhase - 0.25) < 0.002 && Math.abs(ecgMv(0.25, 60) - 1) < 1e-9, `R at ${i60.rPhase.toFixed(3)}`);
  check('Monitor ECG: QRS (|v| > 0.1 mV) 40–120 ms at 60/min', i60.qrsMs > 40 && i60.qrsMs < 120, `${i60.qrsMs.toFixed(0)} ms`);
  check('Monitor ECG: R-to-T-peak shortens from 60 to 120/min', i120.rtMs < i60.rtMs && i60.rtMs > 180 && i60.rtMs < 320, `${i60.rtMs.toFixed(0)} → ${i120.rtMs.toFixed(0)} ms`);
  let artMax = 0;
  let artMin = 9;
  let plMin = 9;
  for (let i = 0; i < 1000; i++) {
    const a = arterialShape(i / 1000);
    artMax = Math.max(artMax, a);
    artMin = Math.min(artMin, a);
    plMin = Math.min(plMin, plethShape(i / 1000));
  }
  check('Monitor ART: contour spans diastolic (≈0) to systolic (1)', artMax <= 1.0001 && artMax > 0.99 && artMin >= 0 && artMin < 0.15, `min ${artMin.toFixed(3)} max ${artMax.toFixed(3)}`);
  check('Monitor pleth: never negative', plMin >= 0, `min ${plMin.toFixed(3)}`);
  const endExp = capnoMmHg(0.655, 38);
  check('Monitor capnogram: end-expiratory value = EtCO2, zero in inspiration', Math.abs(endExp - 38) < 0.5 && capnoMmHg(0.9, 38) === 0 && capnoMmHg(0.02, 38) === 0, `end-exp ${endExp.toFixed(1)} mmHg`);
}
