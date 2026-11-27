/**
 * M7 checks on the real BodyParts3D spine (public/models/anatomy/spine.glb), using the same
 * geometry code and region settings as the app. These are plausibility checks of the simulator
 * model (shingled thoracic spinous processes, flexion opening the lumbar windows, layer order,
 * depths in a believable range), not validation against patient data.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import * as G from '../../src/modules/m7-neuraxial-spine/spineGeometry';
import { REGIONS, duraHalfDepthFor, type SpineRegion } from '../../src/modules/m7-neuraxial-spine/spineRegions';

type Check = (name: string, ok: boolean, detail: string) => void;

interface Part {
  positions: Float32Array;
  index: ArrayLike<number> | null;
  base: G.Mat4;
  tip: G.Vec3;
  centre: G.Vec3;
}

async function loadParts(): Promise<Record<string, Part>> {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read('public/models/anatomy/spine.glb');
  const parts: Record<string, Part> = {};
  for (const node of doc.getRoot().listNodes()) {
    const prim = node.getMesh()?.listPrimitives()[0];
    if (!prim) continue;
    const acc = prim.getAttribute('POSITION')!;
    const n = acc.getCount();
    const positions = new Float32Array(n * 3);
    const el: number[] = [];
    const base = Float64Array.from(node.getMatrix());
    let tip: G.Vec3 = [0, 0, Infinity];
    let c: G.Vec3 = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      acc.getElement(i, el);
      positions.set(el, i * 3);
      const w = G.transformPoint(base, [el[0], el[1], el[2]]);
      if (w[2] < tip[2]) tip = w;
      c = [c[0] + w[0] / n, c[1] + w[1] / n, c[2] + w[2] / n];
    }
    parts[node.getName()] = { positions, index: prim.getIndices()?.getArray() ?? null, base, tip, centre: c };
  }
  return parts;
}

function buildRegion(parts: Record<string, Part>, region: SpineRegion, flexion: number) {
  const def = REGIONS[region];
  const { vert, disc } = G.flexionChain(def.verts.length, def.anchor, def.discs.map((d) => parts[d].centre), (def.flexMaxDeg * flexion * Math.PI) / 180);
  const names = [...def.verts, ...def.discs, ...def.extras];
  const mats: Record<string, G.Mat4> = {};
  def.verts.forEach((v, k) => (mats[v] = vert[k]));
  def.discs.forEach((d, k) => (mats[d] = disc[k]));
  def.extras.forEach((x) => (mats[x] = vert[def.verts.length - 1]));
  const soup = new G.TriSoup(
    names.map((n, owner) => ({ owner, positions: parts[n].positions, index: parts[n].index, matrix: G.multiply(mats[n], parts[n].base) }))
  );
  const id = (n: string) => names.indexOf(n);
  const boxes = def.verts.map((v) => soup.ownerBox(id(v))!);
  const profile = G.canalProfile(soup, Math.min(...boxes.map((b) => b[1])), Math.max(...boxes.map((b) => b[4])), [...def.verts, ...def.discs].map(id));
  const tips = Object.fromEntries(def.verts.map((v, k) => [v, G.transformPoint(vert[k], parts[v].tip)]));
  const bone = [...def.verts, ...def.extras].map(id);
  const softFor = (space: number, softMm: number): G.SoftTissueParams => {
    const U = tips[def.verts[space]];
    const L = tips[def.verts[space + 1]];
    const skinZ = Math.min(U[2], L[2]) - softMm / 1000;
    return { ...def.soft, skinZ, fatDepth: Math.max(0.004, softMm / 1000 - 0.003), duraHalfDepth: duraHalfDepthFor(def, profile.depth) };
  };
  return { def, soup, profile, tips, bone, softFor };
}

/** Count needle paths (entry offsets × cephalad angles, midline) that reach the epidural space. */
function countSuccess(r: ReturnType<typeof buildRegion>, space: number) {
  const soft = r.softFor(space, 15);
  const U = r.tips[r.def.verts[space]];
  const L = r.tips[r.def.verts[space + 1]];
  let ok = 0;
  const depths: number[] = [];
  for (let y = L[1]; y <= U[1]; y += 0.002)
    for (let c = 0; c <= 30; c += 3) {
      const res = G.traceNeedle(r.soup, r.bone, r.profile, soft, [0, y, soft.skinZ], G.needleDirection(c, 0, 1), 0, 0.09, 0.0005);
      if (res.epiduralAt !== null) {
        ok++;
        depths.push(res.epiduralAt);
      }
    }
  return { ok, depths };
}

export async function runSpineChecks(check: Check) {
  const parts = await loadParts();
  const lum0 = buildRegion(parts, 'lumbar', 0);
  const lum1 = buildRegion(parts, 'lumbar', 1);
  const tho = buildRegion(parts, 'thoracic', 0.6);

  check('M7 lumbar canal depth 14–24 mm (real model)', lum0.profile.depth > 0.014 && lum0.profile.depth < 0.024, `${(lum0.profile.depth * 1000).toFixed(1)} mm`);
  check('M7 thoracic canal depth 12–21 mm (real model)', tho.profile.depth > 0.012 && tho.profile.depth < 0.021, `${(tho.profile.depth * 1000).toFixed(1)} mm`);

  // Thoracic shingling: a perpendicular midline needle meets bone before the flavum at T5–T8.
  let blocked = 0;
  for (let s = 1; s <= 3; s++) {
    const soft = tho.softFor(s, 15);
    const U = tho.tips[tho.def.verts[s]];
    const res = G.traceNeedle(tho.soup, tho.bone, tho.profile, soft, [0, U[1] - 0.003, soft.skinZ], [0, 0, 1], 0, 0.09);
    if (res.boneAt !== null && (res.flavumAt === null || res.boneAt < res.flavumAt)) blocked++;
  }
  check('M7 thoracic midline ⊥ needle hits bone first', blocked === 3, `${blocked}/3 interspaces (T5–T8)`);

  // Flexion opens the lumbar interlaminar windows.
  const a = countSuccess(lum0, 1);
  const b = countSuccess(lum1, 1);
  check('M7 flexion increases L3–L4 successful paths', b.ok > a.ok, `${a.ok} → ${b.ok} paths (neutral → full flexion)`);

  // Skin-to-epidural depth at 15 mm soft tissue over the spinous processes (lumbar L4–L5).
  const c = countSuccess(lum1, 2);
  const med = c.depths.sort((x, y) => x - y)[Math.floor(c.depths.length / 2)] ?? NaN;
  check('M7 L4–L5 skin→epidural 30–60 mm (lean patient)', med > 0.03 && med < 0.06, `median ${(med * 1000).toFixed(0)} mm over ${c.ok} paths`);

  // Layer order on a successful path: flavum before epidural, epidural before CSF.
  const soft = lum1.softFor(2, 15);
  let orderOk = true;
  let tested = 0;
  const L5 = lum1.tips.l5;
  const L4 = lum1.tips.l4;
  for (let y = L5[1]; y <= L4[1]; y += 0.002)
    for (let cdeg = 0; cdeg <= 30; cdeg += 3) {
      const res = G.traceNeedle(lum1.soup, lum1.bone, lum1.profile, soft, [0, y, soft.skinZ], G.needleDirection(cdeg, 0, 1), 0, 0.09, 0.0005);
      if (res.epiduralAt === null) continue;
      tested++;
      const order = res.path.map((p) => p.tissue);
      const iF = order.indexOf('flavum');
      const iE = order.indexOf('epidural');
      const iC = order.indexOf('csf');
      if (iF < 0 || iF > iE || (iC >= 0 && iC < iE)) orderOk = false;
    }
  check('M7 layer order skin…flavum→epidural→CSF', orderOk && tested > 0, `${tested} successful paths checked`);
}
