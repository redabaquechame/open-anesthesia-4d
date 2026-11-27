/**
 * Needle-path geometry for the neuraxial module ("Simulator model").
 *
 * Pure TypeScript (no DOM, no three.js) so it runs in the browser and in `npm run sanity`.
 *
 * Frame (metres): x = lateral, y = cranial, z = anterior (posterior skin is at negative z).
 *
 * - Bones: real BodyParts3D vertebrae, flattened into one triangle list ("soup"). The needle stops
 *   at the first bone surface it meets (ray-cast), so bone contact depends on the real shape and on
 *   the flexion applied to each vertebra.
 * - Canal: sampled from the same bones along the midline: anterior wall = back of the bodies/discs,
 *   posterior wall = front of the laminae. Where there is no lamina (the interlaminar window) the
 *   wall is interpolated and that window is where the ligamentum flavum sits.
 * - Soft tissues (flavum, epidural fat, dural sac, cord) are not in the anatomy archive: they are
 *   placed from the canal profile with illustrative thicknesses.
 */

export type Vec3 = [number, number, number];

export interface SoupInput {
  owner: number;
  /** Local positions xyz (already denormalised). */
  positions: ArrayLike<number>;
  index: ArrayLike<number> | null;
  /** Column-major 4×4 local→world matrix (three.js Matrix4.elements order). */
  matrix: ArrayLike<number>;
}

export interface RayHit {
  t: number;
  owner: number;
  /** true when the ray enters the surface (hits a front face). */
  entering: boolean;
}

interface OwnerRange {
  owner: number;
  start: number;
  end: number;
  box: Float64Array; // minx,miny,minz,maxx,maxy,maxz
}

export class TriSoup {
  readonly tris: Float32Array;
  readonly ranges: OwnerRange[] = [];

  constructor(inputs: SoupInput[]) {
    let total = 0;
    for (const m of inputs) total += (m.index ? m.index.length : m.positions.length / 3) / 3;
    this.tris = new Float32Array(total * 9);
    let w = 0;
    for (const m of inputs) {
      const e = m.matrix;
      const n = m.index ? m.index.length : m.positions.length / 3;
      const start = w / 9;
      const box = new Float64Array([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
      for (let k = 0; k < n; k++) {
        const vi = (m.index ? m.index[k] : k) * 3;
        const x = m.positions[vi], y = m.positions[vi + 1], z = m.positions[vi + 2];
        const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
        const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
        const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
        this.tris[w++] = wx;
        this.tris[w++] = wy;
        this.tris[w++] = wz;
        if (wx < box[0]) box[0] = wx;
        if (wy < box[1]) box[1] = wy;
        if (wz < box[2]) box[2] = wz;
        if (wx > box[3]) box[3] = wx;
        if (wy > box[4]) box[4] = wy;
        if (wz > box[5]) box[5] = wz;
      }
      this.ranges.push({ owner: m.owner, start, end: w / 9, box });
    }
  }

  ownerBox(owner: number): Float64Array | null {
    return this.ranges.find((r) => r.owner === owner)?.box ?? null;
  }

  /** All surface crossings along o + t·d (|d| = 1), 0 < t < maxT, sorted by t. */
  raycast(o: Vec3, d: Vec3, maxT: number, filter?: (owner: number) => boolean): RayHit[] {
    const hits: RayHit[] = [];
    const T = this.tris;
    for (const r of this.ranges) {
      if (filter && !filter(r.owner)) continue;
      if (!rayBox(o, d, r.box, maxT)) continue;
      for (let i = r.start; i < r.end; i++) {
        const b = i * 9;
        const ax = T[b], ay = T[b + 1], az = T[b + 2];
        const e1x = T[b + 3] - ax, e1y = T[b + 4] - ay, e1z = T[b + 5] - az;
        const e2x = T[b + 6] - ax, e2y = T[b + 7] - ay, e2z = T[b + 8] - az;
        const px = d[1] * e2z - d[2] * e2y;
        const py = d[2] * e2x - d[0] * e2z;
        const pz = d[0] * e2y - d[1] * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (det > -1e-14 && det < 1e-14) continue;
        const inv = 1 / det;
        const tx = o[0] - ax, ty = o[1] - ay, tz = o[2] - az;
        const u = (tx * px + ty * py + tz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y;
        const qy = tz * e1x - tx * e1z;
        const qz = tx * e1y - ty * e1x;
        const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
        if (v < 0 || u + v > 1) continue;
        const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (t <= 1e-7 || t >= maxT) continue;
        // Front face (counter-clockwise, normal e1×e2 facing the ray) ⇔ det > 0.
        hits.push({ t, owner: r.owner, entering: det > 0 });
      }
    }
    hits.sort((a, b) => a.t - b.t);
    return hits;
  }

  /** First bone surface along the ray, or null. */
  firstHit(o: Vec3, d: Vec3, maxT: number, filter?: (owner: number) => boolean): RayHit | null {
    const h = this.raycast(o, d, maxT, filter);
    return h.length ? h[0] : null;
  }
}

function rayBox(o: Vec3, d: Vec3, b: Float64Array, maxT: number): boolean {
  let t0 = 0;
  let t1 = maxT;
  for (let k = 0; k < 3; k++) {
    const inv = 1 / (d[k] || 1e-30);
    let tn = (b[k] - 0.0005 - o[k]) * inv;
    let tf = (b[k + 3] + 0.0005 - o[k]) * inv;
    if (tn > tf) [tn, tf] = [tf, tn];
    t0 = Math.max(t0, tn);
    t1 = Math.min(t1, tf);
    if (t0 > t1) return false;
  }
  return true;
}

/** Inside intervals [tIn, tOut] along a ray, per owner (pairing sorted crossings), merged. */
function insideIntervals(hits: RayHit[]): [number, number][] {
  const byOwner = new Map<number, number[]>();
  for (const h of hits) {
    const l = byOwner.get(h.owner) ?? [];
    l.push(h.t);
    byOwner.set(h.owner, l);
  }
  const iv: [number, number][] = [];
  for (const l of byOwner.values()) for (let k = 0; k + 1 < l.length; k += 2) iv.push([l[k], l[k + 1]]);
  iv.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [a, b] of iv) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1] + 0.0004) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  return merged;
}

// ─────────────────────────────────────────────────────────────── canal profile

export interface CanalProfile {
  y0: number;
  step: number;
  /** Anterior canal wall z (back of bodies / discs). */
  zA: Float32Array;
  /** Posterior canal wall z (front of laminae; interpolated across the interlaminar windows). */
  zP: Float32Array;
  /** 1 where there is no lamina at the midline (interlaminar window → ligamentum flavum). */
  gap: Uint8Array;
  /** Median canal depth (zA − zP), m. */
  depth: number;
}

function fillNaN(a: Float32Array): void {
  const n = a.length;
  let prev = -1;
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(a[i])) continue;
    if (prev < 0) for (let k = 0; k < i; k++) a[k] = a[i];
    else for (let k = prev + 1; k < i; k++) a[k] = a[prev] + ((a[i] - a[prev]) * (k - prev)) / (i - prev);
    prev = i;
  }
  if (prev >= 0) for (let k = prev + 1; k < n; k++) a[k] = a[prev];
}

function median(values: number[]): number {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * Sample the canal along the midline (x = 0) between yMin and yMax.
 * `isBone` selects vertebrae (posterior elements); discs count only for the anterior wall.
 */
export function canalProfile(
  soup: TriSoup,
  yMin: number,
  yMax: number,
  owners: number[],
  step = 0.001,
  maxCanal = 0.026
): CanalProfile {
  const n = Math.max(2, Math.floor((yMax - yMin) / step) + 1);
  const zA = new Float32Array(n);
  const zPraw = new Float32Array(n);
  const z0 = 0.2;
  const ownerSet = new Set(owners);
  const filter = (o: number) => ownerSet.has(o);
  for (let i = 0; i < n; i++) {
    const y = yMin + i * step;
    const iv = insideIntervals(soup.raycast([0, y, z0], [0, 0, -1], 0.5, filter));
    if (!iv.length) {
      zA[i] = NaN;
      zPraw[i] = NaN;
      continue;
    }
    zA[i] = z0 - iv[0][1];
    zPraw[i] = iv.length > 1 ? z0 - iv[1][0] : NaN;
  }
  // Anterior wall: robust to holes between bodies and discs.
  const zAm = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const w: number[] = [];
    for (let k = Math.max(0, i - 4); k <= Math.min(n - 1, i + 4); k++) if (!Number.isNaN(zA[k])) w.push(zA[k]);
    zAm[i] = median(w);
  }
  fillNaN(zAm);
  // Posterior wall: only a bone surface within a plausible canal depth counts as lamina.
  const pass = (limit: number) => {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const dpt = zAm[i] - zPraw[i];
      out[i] = !Number.isNaN(zPraw[i]) && dpt > 0.006 && dpt < limit ? zPraw[i] : NaN;
    }
    return out;
  };
  let zP = pass(maxCanal);
  const depths: number[] = [];
  for (let i = 0; i < n; i++) if (!Number.isNaN(zP[i])) depths.push(zAm[i] - zP[i]);
  const depth0 = median(depths);
  if (!Number.isNaN(depth0)) zP = pass(Math.min(maxCanal, depth0 + 0.004));
  const gap = new Uint8Array(n);
  for (let i = 0; i < n; i++) gap[i] = Number.isNaN(zP[i]) ? 1 : 0;
  // Widen each window slightly (the flavum attaches to the edges of the laminae).
  const grown = gap.slice();
  for (let i = 0; i < n; i++) if (gap[i]) for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) grown[k] = 1;
  fillNaN(zP);
  const finalDepths: number[] = [];
  for (let i = 0; i < n; i++) finalDepths.push(zAm[i] - zP[i]);
  return { y0: yMin, step, zA: zAm, zP, gap: grown, depth: median(finalDepths) };
}

function sample(a: Float32Array | Uint8Array, p: CanalProfile, y: number): number {
  const f = (y - p.y0) / p.step;
  const i = Math.max(0, Math.min(a.length - 1, Math.floor(f)));
  const j = Math.min(a.length - 1, i + 1);
  const w = Math.max(0, Math.min(1, f - i));
  return a[i] * (1 - w) + a[j] * w;
}

// ─────────────────────────────────────────────────────────────── tissues

export type SpineTissue = 'outside' | 'skin' | 'fat' | 'muscle' | 'ligament' | 'flavum' | 'epidural' | 'csf' | 'cord' | 'lateral' | 'bone';

/** Syringe resistance felt with a loss-of-resistance syringe (0–100, illustrative). */
export const TISSUE_INFO: Record<SpineTissue, { resistance: number; color: string; fr: string; en: string }> = {
  outside: { resistance: 0, color: '#334155', fr: 'Hors patient', en: 'Outside the patient' },
  skin: { resistance: 45, color: '#e3b196', fr: 'Peau', en: 'Skin' },
  fat: { resistance: 12, color: '#eccb7a', fr: 'Tissu sous-cutané', en: 'Subcutaneous fat' },
  muscle: { resistance: 28, color: '#b45348', fr: 'Muscles paravertébraux', en: 'Paraspinal muscle' },
  ligament: { resistance: 60, color: '#cbd5a1', fr: 'Ligaments sus- et interépineux', en: 'Supra- and interspinous ligaments' },
  flavum: { resistance: 95, color: '#f59e0b', fr: 'Ligament jaune', en: 'Ligamentum flavum' },
  epidural: { resistance: 5, color: '#34d399', fr: 'Espace péridural', en: 'Epidural space' },
  csf: { resistance: 4, color: '#38bdf8', fr: 'Brèche dure-mérienne — LCS', en: 'Dural puncture — CSF' },
  cord: { resistance: 4, color: '#f43f5e', fr: 'MOELLE SPINALE', en: 'SPINAL CORD' },
  lateral: { resistance: 30, color: '#a78bfa', fr: 'Latéral au canal (foramen, racine)', en: 'Lateral to the canal (foramen, nerve root)' },
  bone: { resistance: 100, color: '#e2e8f0', fr: 'Contact osseux', en: 'Bone contact' },
};

export interface SoftTissueParams {
  /** Skin plane z (posterior surface). */
  skinZ: number;
  /** Skin + subcutaneous thickness before ligament/muscle, m. */
  fatDepth: number;
  flavumThickness: number;
  /** Dorsal epidural space depth at the midline, m. */
  epiDorsal: number;
  /** Half-width of the interlaminar window / flavum, m. */
  flavumHalfWidth: number;
  /** Half-width of the canal (beyond: foramen / lateral), m. */
  canalHalfWidth: number;
  /** Dural sac: half-width and half-depth, m. */
  duraHalfWidth: number;
  duraHalfDepth: number;
  /** Spinal cord half-width and half-depth (null below the conus: cauda equina). */
  cord: [number, number] | null;
  /** Half-width of the supraspinous/interspinous ligament column, m. */
  ligHalfWidth: number;
}

export function duraCentreZ(p: CanalProfile, s: SoftTissueParams, y: number): number {
  return sample(p.zP, p, y) + s.epiDorsal + s.duraHalfDepth;
}

export function classify(pt: Vec3, p: CanalProfile, s: SoftTissueParams): SpineTissue {
  const [x, y, z] = pt;
  const dSkin = z - s.skinZ;
  if (dSkin < 0) return 'outside';
  if (dSkin < 0.002) return 'skin';
  const zP = sample(p.zP, p, y);
  const zA = sample(p.zA, p, y);
  const ax = Math.abs(x);
  if (z >= zP && z <= zA) {
    if (ax > s.canalHalfWidth) return 'lateral';
    const zc = zP + s.epiDorsal + s.duraHalfDepth;
    const ex = x / s.duraHalfWidth;
    const ez = (z - zc) / s.duraHalfDepth;
    if (ex * ex + ez * ez < 1) {
      if (s.cord) {
        const cx = x / s.cord[0];
        const cz = (z - zc) / s.cord[1];
        if (cx * cx + cz * cz < 1) return 'cord';
      }
      return 'csf';
    }
    return 'epidural';
  }
  if (z > zA) return 'lateral';
  const inWindow = sample(p.gap, p, y) > 0.5;
  if (inWindow && ax < s.flavumHalfWidth && z >= zP - s.flavumThickness) return 'flavum';
  if (dSkin < s.fatDepth) return 'fat';
  if (ax < s.ligHalfWidth) return 'ligament';
  return 'muscle';
}

export interface PathSegment {
  tissue: SpineTissue;
  from: number;
  to: number;
}

export interface NeedleResult {
  tip: Vec3;
  tissue: SpineTissue;
  /** Distance to the first bone surface along the path (null = none within reach). */
  boneAt: number | null;
  boneOwner: number | null;
  /** Depth actually reached (≤ requested depth, stops at bone). */
  reached: number;
  /** Tissue layers along the whole path up to `maxDepth` or bone. */
  path: PathSegment[];
  /** Depth at which the epidural space starts on this path (null if not reached before bone). */
  epiduralAt: number | null;
  flavumAt: number | null;
}

export function traceNeedle(
  soup: TriSoup,
  boneOwners: number[],
  profile: CanalProfile,
  soft: SoftTissueParams,
  entry: Vec3,
  dir: Vec3,
  depth: number,
  maxDepth = 0.1,
  step = 0.00025
): NeedleResult {
  const ownerSet = new Set(boneOwners);
  const hit = soup.firstHit(entry, dir, maxDepth, (o) => ownerSet.has(o));
  const boneAt = hit ? hit.t : null;
  const limit = boneAt ?? maxDepth;
  const path: PathSegment[] = [];
  let epiduralAt: number | null = null;
  let flavumAt: number | null = null;
  for (let t = 0; t < limit; t += step) {
    const p: Vec3 = [entry[0] + dir[0] * t, entry[1] + dir[1] * t, entry[2] + dir[2] * t];
    const tissue = classify(p, profile, soft);
    if (tissue === 'epidural' && epiduralAt === null) epiduralAt = t;
    if (tissue === 'flavum' && flavumAt === null) flavumAt = t;
    const last = path[path.length - 1];
    if (last && last.tissue === tissue) last.to = t + step;
    else path.push({ tissue, from: t, to: t + step });
  }
  if (boneAt !== null) path.push({ tissue: 'bone', from: boneAt, to: boneAt + 0.001 });
  const reached = Math.min(depth, limit);
  const tip: Vec3 = [entry[0] + dir[0] * reached, entry[1] + dir[1] * reached, entry[2] + dir[2] * reached];
  const tissue = boneAt !== null && depth >= boneAt ? 'bone' : classify(tip, profile, soft);
  return { tip, tissue, boneAt, boneOwner: hit?.owner ?? null, reached, path, epiduralAt, flavumAt };
}

// ─────────────────────────────────────────────────────────────── flexion chain

/** Column-major 4×4 helpers (same layout as three.js Matrix4.elements). */
export type Mat4 = Float64Array;

export function identity(): Mat4 {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function multiply(a: ArrayLike<number>, b: ArrayLike<number>): Mat4 {
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  return o;
}

/** Rotation by `angle` about the lateral (x) axis through point p. Positive = flexion of the upper segment. */
export function rotateAboutX(p: Vec3, angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const m = identity();
  m[5] = c;
  m[6] = s;
  m[9] = -s;
  m[10] = c;
  // translation = p − R·p
  m[13] = p[1] - (c * p[1] - s * p[2]);
  m[14] = p[2] - (s * p[1] + c * p[2]);
  return m;
}

/**
 * Segment transforms for a chain of vertebrae (top → bottom). `pivots[k]` is the disc between
 * vertebra k and k+1. The anchor vertebra stays fixed; each disc adds `segAngle` of flexion.
 * Returns one matrix per vertebra and one per disc (half the segment rotation).
 */
export function flexionChain(count: number, anchor: number, pivots: Vec3[], segAngle: number): { vert: Mat4[]; disc: Mat4[] } {
  const vert: Mat4[] = new Array(count);
  vert[anchor] = identity();
  for (let k = anchor - 1; k >= 0; k--) vert[k] = multiply(vert[k + 1], rotateAboutX(pivots[k], segAngle));
  for (let k = anchor + 1; k < count; k++) vert[k] = multiply(vert[k - 1], rotateAboutX(pivots[k - 1], -segAngle));
  const disc: Mat4[] = [];
  for (let k = 0; k + 1 < count; k++) disc.push(multiply(vert[k + 1], rotateAboutX(pivots[k], segAngle / 2)));
  return { vert, disc };
}

export function transformPoint(m: ArrayLike<number>, p: Vec3): Vec3 {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

export function needleDirection(cephaladDeg: number, medialDeg: number, side: 1 | -1): Vec3 {
  const c = (cephaladDeg * Math.PI) / 180;
  const m = (medialDeg * Math.PI) / 180;
  const v: Vec3 = [-side * Math.sin(m) * Math.cos(c), Math.sin(c), Math.cos(m) * Math.cos(c)];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}
