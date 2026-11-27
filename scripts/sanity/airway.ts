/**
 * M8 checks: the measured airway map (public/models/anatomy/airway-map.json) against published anatomy, and the
 * DLT / one-lung-ventilation model against the behaviour it must teach.
 * - Adhikari 2025 (doi:10.1186/s13037-025-00450-2): male tracheal length 109.5 ± 8.9 mm.
 * - Benumof 1987 (doi:10.1097/00000542-198711000-00018): main bronchus lengths, 30 mm cuff-to-tip, margin of safety.
 * - Brodsky 1991 (doi:10.1213/00000539-199111000-00010): 29 cm at 170 cm, cuff just below the carina.
 * - Severinghaus 1979 (doi:10.1152/jappl.1979.46.3.599): S(26.8 mmHg) ≈ 0.5 (standard P50).
 */
import { readFileSync } from 'node:fs';
import * as D from '../../src/modules/m8-bronchoscopy-dlt/dltModel';
import type { AirwayMap, Lobe } from '../../src/modules/m8-bronchoscopy-dlt/airwayGeometry';

type Check = (name: string, ok: boolean, detail: string) => void;

export function runAirwayChecks(check: Check) {
  const map = JSON.parse(readFileSync('public/models/anatomy/airway-map.json', 'utf8')) as AirwayMap & { lobeHullVolume: Record<Lobe, number> };
  const mm = (m: number) => (m * 1000).toFixed(1);

  check('M8 trachea length within male mean ± 2 SD', Math.abs(map.tracheaLength * 1000 - 109.5) <= 2 * 8.9, `${mm(map.tracheaLength)} mm (109.5 ± 8.9)`);
  check('M8 specimen left main bronchus 33–65 mm', map.leftMainLength > 0.033 && map.leftMainLength < 0.065, `${mm(map.leftMainLength)} mm (Benumof male 49 ± 8)`);
  check('M8 RUL orifice nearer the carina than LUL/LLL split', map.rulOrifice.proximal < map.leftMainLength, `RUL ${mm(map.rulOrifice.proximal)} mm vs LMB ${mm(map.leftMainLength)} mm`);
  check('M8 right main bronchus to RUL within Benumof ± 2 SD', map.rulOrifice.proximal * 1000 <= 19 + 2 * 6 + 3, `${mm(map.rulOrifice.proximal)} mm (19 ± 6)`);
  const smooth = (['left', 'right'] as const).every((k) => {
    const p = map[k];
    for (let i = 1; i < p.pts.length; i++) {
      const d = Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1], p.pts[i][2] - p.pts[i - 1][2]);
      if (d > 0.004) return false;
    }
    return true;
  });
  check('M8 centrelines continuous through the carina', smooth, 'no step > 4 mm');

  const tot = Object.values(map.lobeHullVolume).reduce((a, b) => a + b, 0);
  const share = Object.fromEntries(Object.entries(map.lobeHullVolume).map(([k, v]) => [k, v / tot])) as Record<Lobe, number>;
  const base: D.DltInputs = { anatomy: 'male', heightCm: 170, size: 37, depthCm: 29, side: 'left', lateral: false, migrationMm: 6.3, upSide: 'right', bronchialCuffMl: 1.5, clamp: 'none', vtMl: 450, rr: 12, peep: 5, fio2: 1, hpv: 0.5 };
  const ev = (p: Partial<D.DltInputs>) => D.evaluateDlt({ ...base, ...p }, map, share);

  const ok = ev({ depthCm: D.brodskyDepthCm(170) });
  check('M8 Brodsky depth → correct position, sealed', ok.status.join() === 'ok' && ok.sealed && ok.isolation === 'complete', `${ok.status.join(',')}, cuff top ${mm(ok.toCarina)} mm below carina`);
  check('M8 margin of safety = LMB − 30 mm (Benumof)', Math.abs(ok.marginOfSafety * 1000 - 19) < 0.5, `${mm(ok.marginOfSafety)} mm`);
  const tall = ev({ heightCm: 190, depthCm: D.brodskyDepthCm(190) });
  check('M8 Brodsky depth scales with height', tall.status.join() === 'ok' && Math.abs(tall.sTip - ok.sTip) < 1e-6, `190 cm → ${D.brodskyDepthCm(190)} cm`);
  const deep = ev({ depthCm: 29 + (ok.marginOfSafety * 1000 + 5) / 10 });
  check('M8 deeper than the margin → LUL blocked', deep.status.includes('tooDeepLUL') && !deep.lobes.LUL.ventilated, deep.status.join(','));
  const shallow = ev({ depthCm: 27.5 });
  check('M8 1.5 cm too shallow → cuff herniation', shallow.status.includes('herniation'), shallow.status.join(','));
  const wrong = ev({ side: 'right' });
  check('M8 left DLT in right bronchus → RUL blocked', wrong.status.includes('wrongSide') && !wrong.lobes.RUL.ventilated, wrong.status.join(','));
  const turned = ev({ lateral: true });
  check('M8 lateral turn (Yoon 6.3 mm) pulls the cuff up', Math.abs(ok.cuffTop - turned.cuffTop - 0.0063) < 1e-6, `cuff top ${mm(ok.cuffTop)} → ${mm(turned.cuffTop)} mm`);

  const olvDepth = 29.5; // cuff 10 mm below carina, still above the LUL take-off after a lateral turn
  const twoLung = ev({ depthCm: olvDepth, lateral: true });
  const olv = ev({ depthCm: olvDepth, lateral: true, clamp: 'tracheal' });
  const olvNoHpv = ev({ depthCm: olvDepth, lateral: true, clamp: 'tracheal', hpv: 0 });
  check('M8 OLV: only the left lung ventilated', olv.status.join() === 'ok' && !olv.lobes.RUL.ventilated && olv.lobes.LUL.ventilated && olv.lobes.LLL.ventilated, olv.status.join(','));
  check('M8 OLV lowers PaO2 and raises shunt', olv.gas.pao2 < twoLung.gas.pao2 && olv.gas.shunt > twoLung.gas.shunt, `PaO2 ${twoLung.gas.pao2.toFixed(0)} → ${olv.gas.pao2.toFixed(0)}, shunt ${(olv.gas.shunt * 100).toFixed(0)} %`);
  check('M8 HPV improves OLV PaO2', olv.gas.pao2 > olvNoHpv.gas.pao2, `HPV 50 % ${olv.gas.pao2.toFixed(0)} vs 0 % ${olvNoHpv.gas.pao2.toFixed(0)} mmHg`);
  check('M8 OLV plateau pressure rises (half the compliance)', olv.mech.pPlat > twoLung.mech.pPlat, `Pplat ${twoLung.mech.pPlat.toFixed(0)} → ${olv.mech.pPlat.toFixed(0)} cmH2O`);
  const both = ev({ depthCm: olvDepth, clamp: 'none' });
  check('M8 two-lung ventilation delivers the set Vt', both.mech.deliveredVt === base.vtMl, `${both.mech.deliveredVt.toFixed(0)} mL`);
  const s = D.severinghausS(26.8);
  check('M8 Severinghaus S(26.8 mmHg) ≈ 0.5', Math.abs(s - 0.5) < 0.01, s.toFixed(3));
}
