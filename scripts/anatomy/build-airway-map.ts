/**
 * Precomputes the M8 airway map (centrelines, calibres, carina, lobar orifices, lumen capsules)
 * from public/models/anatomy/airway.glb and writes public/models/anatomy/airway-map.json.
 * Usage: npm run anatomy:airway   (re-run after rebuilding airway.glb)
 */
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';
import { AirwaySoup, buildAirwayMap, LOBES, lobeOf } from '../../src/modules/m8-bronchoscopy-dlt/airwayGeometry';
import { loadGlbParts } from './loadGlbParts';

const parts = await loadGlbParts('public/models/anatomy/airway.glb');
const soup = new AirwaySoup(parts.filter((p) => !p.name.startsWith('ctx_')));
const map = buildAirwayMap(soup) as ReturnType<typeof buildAirwayMap> & { lobeHullVolume?: Record<string, number> };

// Lobe size proxy: volume of the convex hull of each lobe's segmental bronchial trees (simulator model).
const lobeHullVolume: Record<string, number> = {};
for (const lobe of LOBES) {
  const pts = soup.verticesOf(soup.ownersWhere((n) => lobeOf(n) === lobe)).filter((_, i) => i % 2 === 0);
  const hull = new ConvexHull().setFromPoints(pts.map((p) => new Vector3(...p)));
  let vol = 0;
  const c = new Vector3();
  pts.forEach((p) => c.add(new Vector3(...p)));
  c.divideScalar(pts.length);
  for (const f of hull.faces) {
    const vs: Vector3[] = [];
    let e = f.edge;
    do {
      vs.push(e.head().point);
      e = e.next;
    } while (e !== f.edge);
    for (let k = 1; k + 1 < vs.length; k++) {
      const a = vs[0].clone().sub(c), b = vs[k].clone().sub(c), d = vs[k + 1].clone().sub(c);
      vol += Math.abs(a.dot(b.clone().cross(d))) / 6;
    }
  }
  lobeHullVolume[lobe] = vol;
}
map.lobeHullVolume = lobeHullVolume;
// 0.01 mm precision is plenty and keeps the file small.
const json = JSON.stringify(map, (_k, v) => (typeof v === 'number' ? Math.round(v * 1e5) / 1e5 : v));
writeFileSync('public/models/anatomy/airway-map.json', json);
const mm = (x: number) => (x * 1000).toFixed(1);
console.log(
  `airway-map.json: ${(json.length / 1024).toFixed(0)} KB, trachea ${mm(map.tracheaLength)} mm, LMB ${mm(map.leftMainLength)} mm, ` +
    `RUL orifice ${mm(map.rulOrifice.proximal)}–${mm(map.rulOrifice.distal)} mm, ${map.capsules.length} capsules`
);
const tot = Object.values(lobeHullVolume).reduce((a, b) => a + b, 0);
console.log('lobe hull shares', Object.entries(lobeHullVolume).map(([k, v]) => `${k} ${((v / tot) * 100).toFixed(1)}%`).join(', '));
