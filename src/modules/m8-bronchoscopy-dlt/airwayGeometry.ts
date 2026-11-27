/**
 * M8 airway geometry (pure TypeScript, no DOM, no three.js).
 *
 * Works on the real BodyParts3D tracheobronchial meshes (public/models/anatomy/airway.glb):
 * metres, +X = patient's left, +Y = cranial, +Z = anterior.
 *
 * - `AirwaySoup` holds every triangle in world space with its owner part.
 * - `slice` cuts the soup with a plane and returns the closed cross-section loops
 *   (centroid, area, equivalent diameter) — the same way airway calibre is measured on CT
 *   (cross-sectional area perpendicular to the airway axis).
 * - `traceTube` marches along a tube: slice perpendicular to the current direction, step to the
 *   centroid of the loop that contains the predicted point, and stop at a bifurcation (two loops)
 *   or at an open end. This gives the centreline, arc length and calibre profile.
 * - `buildAirwayMap` runs the tracker from the upper trachea through the carina into both main
 *   bronchi and finds the landmarks a double-lumen tube depends on: carina, right upper lobe (RUL)
 *   orifice, left upper/lower lobe secondary carina.
 *
 * Everything here is a simulator model built on one anatomical specimen. Lengths are checked against
 * published adult ranges in scripts/sanity/airway.ts; they are not patient-specific.
 */

export type V3 = [number, number, number];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const dist = (a: V3, b: V3) => len(sub(a, b));
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export interface PartInput {
  name: string;
  /** World-space positions (metres), xyz triplets. */
  positions: ArrayLike<number>;
  index: ArrayLike<number> | null;
}

export class AirwaySoup {
  readonly tris: Float64Array;
  readonly owner: Int32Array;
  readonly names: string[];
  /** Triangle index range [start, end) of each owner (parts are stored contiguously). */
  readonly range: [number, number][] = [];
  constructor(parts: PartInput[]) {
    let total = 0;
    for (const p of parts) total += (p.index ? p.index.length : p.positions.length / 3) / 3;
    this.tris = new Float64Array(total * 9);
    this.owner = new Int32Array(total);
    this.names = parts.map((p) => p.name);
    let t = 0;
    parts.forEach((p, o) => {
      const n = p.index ? p.index.length : p.positions.length / 3;
      this.range.push([t, t + n / 3]);
      for (let i = 0; i < n; i += 3) {
        for (let k = 0; k < 3; k++) {
          const v = p.index ? p.index[i + k] : i + k;
          this.tris[t * 9 + k * 3] = p.positions[v * 3];
          this.tris[t * 9 + k * 3 + 1] = p.positions[v * 3 + 1];
          this.tris[t * 9 + k * 3 + 2] = p.positions[v * 3 + 2];
        }
        this.owner[t] = o;
        t++;
      }
    });
  }
  /** Indices of the parts whose name passes `test`. */
  ownersWhere(test: (name: string) => boolean): Set<number> {
    const s = new Set<number>();
    this.names.forEach((n, i) => test(n) && s.add(i));
    return s;
  }
  /** All vertices of the given owners (for hulls and bounds). */
  verticesOf(owners: Set<number>): V3[] {
    const out: V3[] = [];
    for (let t = 0; t < this.owner.length; t++) {
      if (!owners.has(this.owner[t])) continue;
      for (let k = 0; k < 3; k++) out.push([this.tris[t * 9 + k * 3], this.tris[t * 9 + k * 3 + 1], this.tris[t * 9 + k * 3 + 2]]);
    }
    return out;
  }
}

export interface Loop {
  centroid: V3;
  area: number;
  /** Equivalent circular diameter, 2·√(area/π). */
  dEq: number;
  /** Loop vertices projected in plane coordinates (u, v) around the plane origin. */
  poly: [number, number][];
}

/** Orthonormal basis (u, v) of the plane with normal n. */
export function planeBasis(n: V3): [V3, V3] {
  const a: V3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = norm(cross(a, n));
  return [u, cross(n, u)];
}

function pointInPoly(x: number, y: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Triangle indices of the given owners (all triangles if null). */
export function* triIndices(soup: AirwaySoup, owners: Set<number> | null): Generator<number> {
  if (!owners) {
    for (let t = 0; t < soup.owner.length; t++) yield t;
    return;
  }
  for (const o of owners) {
    const [a, b] = soup.range[o];
    for (let t = a; t < b; t++) yield t;
  }
}

/** Cut the soup with the plane through `p` with unit normal `n`. Only owners in `owners` (all if null). */
export function slice(soup: AirwaySoup, p: V3, n: V3, owners: Set<number> | null = null, radius = Infinity): Loop[] {
  const T = soup.tris;
  const [u, v] = planeBasis(n);
  const segs: [number, number, number, number][] = [];
  const d = [0, 0, 0];
  const pts: number[] = [];
  for (const t of triIndices(soup, owners)) {
    const o = t * 9;
    // cheap reject by distance of first vertex
    if (radius !== Infinity) {
      const dx = T[o] - p[0], dy = T[o + 1] - p[1], dz = T[o + 2] - p[2];
      if (dx * dx + dy * dy + dz * dz > radius * radius) continue;
    }
    for (let k = 0; k < 3; k++) d[k] = (T[o + k * 3] - p[0]) * n[0] + (T[o + k * 3 + 1] - p[1]) * n[1] + (T[o + k * 3 + 2] - p[2]) * n[2];
    pts.length = 0;
    for (let k = 0; k < 3; k++) {
      const k2 = (k + 1) % 3;
      if ((d[k] < 0) === (d[k2] < 0)) continue;
      // canonical edge order so neighbouring triangles produce identical points
      let a = k, b = k2;
      const ka = o + a * 3, kb = o + b * 3;
      if (T[ka] > T[kb] || (T[ka] === T[kb] && (T[ka + 1] > T[kb + 1] || (T[ka + 1] === T[kb + 1] && T[ka + 2] > T[kb + 2])))) {
        a = k2;
        b = k;
      }
      const s = d[a] / (d[a] - d[b]);
      const x = T[o + a * 3] + s * (T[o + b * 3] - T[o + a * 3]) - p[0];
      const y = T[o + a * 3 + 1] + s * (T[o + b * 3 + 1] - T[o + a * 3 + 1]) - p[1];
      const z = T[o + a * 3 + 2] + s * (T[o + b * 3 + 2] - T[o + a * 3 + 2]) - p[2];
      pts.push(x * u[0] + y * u[1] + z * u[2], x * v[0] + y * v[1] + z * v[2]);
    }
    if (pts.length === 4) segs.push([pts[0], pts[1], pts[2], pts[3]]);
  }
  if (!segs.length) return [];
  // Chain segments by endpoint (hash at 1 µm).
  const key = (x: number, y: number) => `${Math.round(x * 1e6)},${Math.round(y * 1e6)}`;
  const ends = new Map<string, number[]>();
  segs.forEach((s, i) => {
    for (const k of [key(s[0], s[1]), key(s[2], s[3])]) {
      const l = ends.get(k);
      if (l) l.push(i);
      else ends.set(k, [i]);
    }
  });
  const used = new Uint8Array(segs.length);
  const loops: Loop[] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const poly: [number, number][] = [[segs[i][0], segs[i][1]]];
    let cx = segs[i][2], cy = segs[i][3];
    let closed = false;
    for (let guard = 0; guard < segs.length; guard++) {
      const k = key(cx, cy);
      if (k === key(poly[0][0], poly[0][1])) {
        closed = true;
        break;
      }
      poly.push([cx, cy]);
      const cand = (ends.get(k) ?? []).find((j) => !used[j]);
      if (cand === undefined) break;
      used[cand] = 1;
      const s = segs[cand];
      if (key(s[0], s[1]) === k) {
        cx = s[2];
        cy = s[3];
      } else {
        cx = s[0];
        cy = s[1];
      }
    }
    if (poly.length < 6) continue;
    let A = 0, gx = 0, gy = 0;
    for (let a = 0; a < poly.length; a++) {
      const [x0, y0] = poly[a];
      const [x1, y1] = poly[(a + 1) % poly.length];
      const c = x0 * y1 - x1 * y0;
      A += c;
      gx += (x0 + x1) * c;
      gy += (y0 + y1) * c;
    }
    A /= 2;
    if (Math.abs(A) < 1e-9) continue;
    gx /= 6 * A;
    gy /= 6 * A;
    const area = Math.abs(A);
    // Open polylines (mesh borders) still give a usable centroid if they are nearly closed.
    if (!closed) {
      const gap = Math.hypot(poly[0][0] - poly[poly.length - 1][0], poly[0][1] - poly[poly.length - 1][1]);
      if (gap > 2 * Math.sqrt(area / Math.PI) * 0.5) continue;
    }
    loops.push({ centroid: add(p, add(scale(u, gx), scale(v, gy))), area, dEq: 2 * Math.sqrt(area / Math.PI), poly });
  }
  return loops;
}

export interface TubeSample {
  p: V3;
  /** Arc length from the start of this trace (m). */
  s: number;
  /** Equivalent diameter (m). */
  d: number;
  dir: V3;
}

export interface TubeTrace {
  samples: TubeSample[];
  end: 'open' | 'split' | 'max';
  /** Loops on the plane where the trace stopped at a bifurcation. */
  children: Loop[];
  /** Plane point / normal at the split. */
  splitPoint?: V3;
  splitDir?: V3;
}

export function traceTube(
  soup: AirwaySoup,
  start: V3,
  dir: V3,
  opts: { owners?: Set<number> | null; step?: number; maxLength?: number; startDiameter?: number; turn?: number } = {}
): TubeTrace {
  const step = opts.step ?? 0.0012;
  const owners = opts.owners ?? null;
  const turn = opts.turn ?? 0.45;
  let p = start;
  let d = norm(dir);
  let r = (opts.startDiameter ?? 0.016) / 2;
  const samples: TubeSample[] = [{ p, s: 0, d: r * 2, dir: d }];
  let s = 0;
  const maxLength = opts.maxLength ?? 0.2;
  while (s < maxLength) {
    const q = add(p, scale(d, step));
    const loops = slice(soup, q, d, owners, Math.max(0.03, r * 6));
    const [u, v] = planeBasis(d);
    const near = loops.filter((l) => dist(l.centroid, q) < Math.max(2.4 * r, 0.006) && l.dEq > 0.25 * 2 * r);
    if (near.length >= 2) {
      return { samples, end: 'split', children: near, splitPoint: q, splitDir: d };
    }
    let pick = loops.find((l) => pointInPoly(0, 0, l.poly));
    if (!pick && near.length === 1) pick = near[0];
    if (!pick) return { samples, end: 'open', children: [] };
    void u;
    void v;
    const c = pick.centroid;
    const nd = norm(sub(c, p));
    const moved = dist(c, p);
    d = norm(add(scale(d, 1 - turn), scale(nd, turn)));
    p = c;
    s += moved;
    r = 0.7 * r + 0.3 * (pick.dEq / 2);
    samples.push({ p, s, d: pick.dEq, dir: d });
  }
  return { samples, end: 'max', children: [] };
}

/** Arc-length polyline helpers. */
export interface Path {
  pts: V3[];
  /** Cumulative arc length at each point (m). */
  s: number[];
  /** Equivalent diameter at each point (m). */
  d: number[];
}

export function pathFrom(samples: { p: V3; d: number }[]): Path {
  const pts: V3[] = [];
  const s: number[] = [];
  const d: number[] = [];
  let acc = 0;
  samples.forEach((smp, i) => {
    if (i > 0) acc += dist(smp.p, samples[i - 1].p);
    pts.push(smp.p);
    s.push(acc);
    d.push(smp.d);
  });
  return { pts, s, d };
}

export function concatPaths(a: Path, b: Path): Path {
  const off = a.s[a.s.length - 1] + dist(a.pts[a.pts.length - 1], b.pts[0]);
  return { pts: [...a.pts, ...b.pts], s: [...a.s, ...b.s.map((x) => x + off)], d: [...a.d, ...b.d] };
}

export function pointAt(path: Path, s: number): { p: V3; dir: V3; d: number } {
  const n = path.pts.length;
  if (s <= path.s[0]) return { p: path.pts[0], dir: norm(sub(path.pts[1], path.pts[0])), d: path.d[0] };
  if (s >= path.s[n - 1]) {
    const dir = norm(sub(path.pts[n - 1], path.pts[n - 2]));
    return { p: add(path.pts[n - 1], scale(dir, s - path.s[n - 1])), dir, d: path.d[n - 1] };
  }
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (path.s[m] <= s) lo = m;
    else hi = m;
  }
  const t = (s - path.s[lo]) / Math.max(1e-9, path.s[hi] - path.s[lo]);
  // smooth direction over ±4 mm
  const a = Math.max(0, lo - 3), b = Math.min(n - 1, hi + 3);
  return { p: lerp3(path.pts[lo], path.pts[hi], t), dir: norm(sub(path.pts[b], path.pts[a])), d: path.d[lo] + (path.d[hi] - path.d[lo]) * t };
}

/** Arc length on `path` of the point closest to `q`. */
export function project(path: Path, q: V3): { s: number; distance: number } {
  let best = { s: 0, distance: Infinity };
  for (let i = 0; i + 1 < path.pts.length; i++) {
    const a = path.pts[i];
    const ab = sub(path.pts[i + 1], a);
    const l2 = dot(ab, ab) || 1e-12;
    const t = Math.max(0, Math.min(1, dot(sub(q, a), ab) / l2));
    const c = add(a, scale(ab, t));
    const dd = dist(c, q);
    if (dd < best.distance) best = { s: path.s[i] + t * (path.s[i + 1] - path.s[i]), distance: dd };
  }
  return best;
}

/** Moving average over ±k samples (positions and diameters), keeps end points. */
export function smoothPath(path: Path, k = 3): Path {
  const n = path.pts.length;
  const pts = path.pts.map((p, i) => {
    if (i === 0 || i === n - 1) return p;
    let acc: V3 = [0, 0, 0];
    let c = 0;
    for (let j = Math.max(0, i - k); j <= Math.min(n - 1, i + k); j++) {
      acc = add(acc, path.pts[j]);
      c++;
    }
    return scale(acc, 1 / c);
  });
  const d = path.d.map((_, i) => {
    let acc = 0;
    let c = 0;
    for (let j = Math.max(0, i - k); j <= Math.min(n - 1, i + k); j++) {
      acc += path.d[j];
      c++;
    }
    return acc / c;
  });
  return pathFrom(pts.map((p, i) => ({ p, d: d[i] })));
}

export type Lobe = 'RUL' | 'RML' | 'RLL' | 'LUL' | 'LLL';
export const LOBES: Lobe[] = ['RUL', 'RML', 'RLL', 'LUL', 'LLL'];

/** Nearest wall hit along a ray (any face orientation), or Infinity. */
export function rayHit(soup: AirwaySoup, owners: Set<number> | null, o: V3, d: V3, maxT: number, cand?: Int32Array): number {
  const T = soup.tris;
  let best = maxT;
  const list = cand ?? null;
  const n = list ? list.length : soup.owner.length;
  for (let k = 0; k < n; k++) {
    const t = list ? list[k] : k;
    if (!list && owners && !owners.has(soup.owner[t])) continue;
    const i = t * 9;
    const e1x = T[i + 3] - T[i], e1y = T[i + 4] - T[i + 1], e1z = T[i + 5] - T[i + 2];
    const e2x = T[i + 6] - T[i], e2y = T[i + 7] - T[i + 1], e2z = T[i + 8] - T[i + 2];
    const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-14) continue;
    const inv = 1 / det;
    const tx = o[0] - T[i], ty = o[1] - T[i + 1], tz = o[2] - T[i + 2];
    const u = (tx * px + ty * py + tz * pz) * inv;
    if (u < 0 || u > 1) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
    if (v < 0 || u + v > 1) continue;
    const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
    if (tt > 1e-6 && tt < best) best = tt;
  }
  return best < maxT ? best : Infinity;
}

/** Triangles of `owners` with a vertex within `r` of `p` (candidate list for repeated ray casts). */
export function trianglesNear(soup: AirwaySoup, owners: Set<number> | null, p: V3, r: number): Int32Array {
  const T = soup.tris;
  const out: number[] = [];
  const r2 = r * r;
  for (const t of triIndices(soup, owners)) {
    for (let k = 0; k < 3; k++) {
      const dx = T[t * 9 + k * 3] - p[0], dy = T[t * 9 + k * 3 + 1] - p[1], dz = T[t * 9 + k * 3 + 2] - p[2];
      if (dx * dx + dy * dy + dz * dz < r2) {
        out.push(t);
        break;
      }
    }
  }
  return Int32Array.from(out);
}


/**
 * Radial wall distances around the centreline point p (in the plane ⟂ dir).
 * Infinity = the ray left through an opening (a branch or an open end).
 */
export function radialProfile(soup: AirwaySoup, owners: Set<number> | null, p: V3, dir: V3, rays = 32, cand?: Int32Array): { dir: V3; r: number }[] {
  const [u, v] = planeBasis(dir);
  const out: { dir: V3; r: number }[] = [];
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * Math.PI * 2;
    const d = norm(add(scale(u, Math.cos(a)), scale(v, Math.sin(a))));
    out.push({ dir: d, r: rayHit(soup, owners, p, d, 0.04, cand) });
  }
  return out;
}

const median = (xs: number[]) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};

/**
 * Where the wall of `path` opens towards `target` (a side-branch root): the first run of centreline
 * positions at which at least two rays aimed at the branch (±35°) travel more than 1.6× the local
 * wall radius. Ray casts use only `owners` (the mesh that contains both lumens).
 */
export function findOrifice(
  soup: AirwaySoup,
  owners: Set<number>,
  path: Path,
  target: V3,
  from = 0.003,
  to = Infinity
): { proximal: number; distal: number; wallRadius: number } | null {
  const step = 0.0005;
  const end = Math.min(to, path.s[path.s.length - 1]);
  const flags: { s: number; open: boolean; R: number }[] = [];
  for (let s = from; s <= end; s += step) {
    const { p, dir } = pointAt(path, s);
    const cand = trianglesNear(soup, owners, p, 0.045);
    const prof = radialProfile(soup, owners, p, dir, 36, cand);
    const toT = sub(target, p);
    const along = sub(toT, scale(dir, dot(toT, dir)));
    if (len(along) < 1e-6) continue;
    const td = norm(along);
    const ang = (x: V3) => Math.acos(Math.max(-1, Math.min(1, dot(x, td))));
    const away = prof.filter((q) => ang(q.dir) > 1.2);
    // Only count positions inside the lumen: the wall away from the branch must be closed.
    const inside = away.filter((q) => Number.isFinite(q.r)).length >= away.length * 0.8;
    const R = median(away.map((q) => q.r));
    const open = inside && prof.filter((q) => ang(q.dir) < 0.61 && !(q.r < 1.6 * R)).length >= 2;
    flags.push({ s, open, R });
  }
  // First run of open positions ≥ 2 mm long (one-sample gaps tolerated).
  for (let i = 0; i < flags.length; i++) {
    if (!flags[i].open) continue;
    let j = i;
    while (j + 1 < flags.length && (flags[j + 1].open || (j + 2 < flags.length && flags[j + 2].open))) j++;
    if (flags[j].s - flags[i].s >= 0.002) return { proximal: flags[i].s, distal: flags[j].s + step, wallRadius: flags[i].R };
    i = j;
  }
  return null;
}

/**
 * Entry of a closed tubular part seen from `from`: the first plane cross-section (⟂ to the direction
 * from `from` to the part) that cuts a real lumen (≥ 4 mm), and the local axis direction.
 */
export function entryOf(soup: AirwaySoup, owner: number, from: V3): { p: V3; dir: V3; d: number } | null {
  const owners = new Set([owner]);
  const verts = soup.verticesOf(owners);
  if (!verts.length) return null;
  let c: V3 = [0, 0, 0];
  for (const v of verts) c = add(c, scale(v, 1 / verts.length));
  // direction from the nearest vertex region towards the bulk of the part
  let near = verts[0];
  let nd = Infinity;
  for (const v of verts) {
    const d = dist(v, from);
    if (d < nd) {
      nd = d;
      near = v;
    }
  }
  const u = norm(sub(c, near));
  let e0 = Infinity;
  for (const v of verts) e0 = Math.min(e0, dot(v, u));
  const cut = (off: number, prefer?: V3) => {
    const loops = slice(soup, scale(u, e0 + off), u, owners);
    if (!loops.length) return null;
    loops.sort((a, b) => (prefer ? dist(a.centroid, prefer) - dist(b.centroid, prefer) : b.area - a.area));
    return loops[0];
  };
  for (let off = 0.002; off < 0.03; off += 0.001) {
    const l1 = cut(off);
    if (!l1 || l1.dEq < 0.004) continue;
    const l2 = cut(off + 0.004, l1.centroid);
    const dir = l2 ? norm(sub(l2.centroid, l1.centroid)) : u;
    return { p: l1.centroid, dir, d: l1.dEq };
  }
  return null;
}

export interface Capsule {
  a: V3;
  b: V3;
  ra: number;
  rb: number;
  /** 'trachea' | 'LMB' | 'RMB' | lobe | 'seg' */
  region: string;
}

export interface AirwayMap {
  version: 2;
  /** Upper end of the model trachea → junction point J, 12 mm above the carina (the tracheal tail is blended into each bronchus). */
  trachea: Path;
  /** Carina: where the walls of the two main bronchi meet (ridge apex), world coordinates (m). */
  carina: V3;
  /** J → left main bronchus → left lower-lobe bronchus. Arc length 0 = carina level (s < 0 on the blended J → bronchus part). */
  left: Path;
  /** J → right main bronchus → bronchus intermedius → lower lobe. Arc length 0 = carina level. */
  right: Path;
  /** Left main bronchus length: carina → LUL/LLL bifurcation (secondary carina). */
  leftMainLength: number;
  /** LUL / RUL / RML orifices on their paths (m from carina). */
  lulOrifice: { proximal: number; distal: number };
  rulOrifice: { proximal: number; distal: number };
  rmlOrifice: { proximal: number; distal: number };
  tracheaLength: number;
  tracheaDiameter: number;
  leftMainDiameter: number;
  rightMainDiameter: number;
  /** Number of segmental bronchi per lobe in the model. */
  segments: Record<Lobe, number>;
  /** Mean entry point of each lobe's segmental bronchi. */
  lobeJunctions: Record<Lobe, V3>;
  /** Smooth lumen model for the bronchoscope: tapered capsules along every traced centreline. */
  capsules: Capsule[];
}

/** Lobe of a segmental-tree node name (e.g. "LUL_apical_2"), or null for central airways / context. */
export function lobeOf(name: string): Lobe | null {
  const m = /^(RUL|RML|RLL|LUL|LLL)_/.exec(name);
  return m ? (m[1] as Lobe) : null;
}

function capsulesAlong(path: Path, region: string, every = 0.003): Capsule[] {
  const out: Capsule[] = [];
  const total = path.s[path.s.length - 1];
  let prev = pointAt(path, path.s[0]);
  for (let s = path.s[0] + every; s <= total + 1e-9; s += every) {
    const cur = pointAt(path, Math.min(s, total));
    out.push({ a: prev.p, b: cur.p, ra: prev.d / 2, rb: cur.d / 2, region });
    prev = cur;
  }
  return out;
}

export function buildAirwayMap(soup: AirwaySoup): AirwayMap {
  const idOf = (n: string) => {
    const i = soup.names.indexOf(n);
    if (i < 0) throw new Error(`airway part missing: ${n}`);
    return i;
  };
  const T = idOf('trachea');
  const LM = idOf('leftMainBronchus');
  const RM = idOf('rightMainBronchus');

  // Trachea: entered from above, traced inside its own mesh.
  const tv = soup.verticesOf(new Set([T]));
  let top: V3 = tv[0];
  for (const v of tv) if (v[1] > top[1]) top = v;
  const te = entryOf(soup, T, add(top, [0, 0.05, 0]))!;
  const tr = traceTube(soup, te.p, te.dir, { owners: new Set([T]), startDiameter: te.d, maxLength: 0.16, turn: 0.3 });
  const tEnd = tr.samples[tr.samples.length - 1].p;

  const follow = (owner: number) => {
    const e = entryOf(soup, owner, tEnd)!;
    const t = traceTube(soup, e.p, e.dir, { owners: new Set([owner]), startDiameter: e.d, maxLength: 0.08, turn: 0.35 });
    let path = pathFrom(t.samples);
    let split = Infinity;
    if (t.end === 'split' && t.splitPoint) {
      split = path.s[path.s.length - 1] + dist(path.pts[path.pts.length - 1], t.splitPoint);
      const ch = [...t.children].sort((a, b) => a.centroid[1] - b.centroid[1]);
      const low = ch[0];
      const lower = traceTube(soup, low.centroid, norm(add(t.splitDir!, norm(sub(low.centroid, t.splitPoint)))), {
        owners: new Set([owner]),
        startDiameter: low.dEq,
        maxLength: 0.035,
      });
      path = concatPaths(path, pathFrom(lower.samples));
    }
    return { path: smoothPath(path, 3), split };
  };
  const L = follow(LM);
  const R = follow(RM);

  // Carina = first level where the two bronchial lumens stop overlapping (walls touch).
  let carina: V3 = scale(add(L.path.pts[0], R.path.pts[0]), 0.5);
  let sL0 = 0;
  let sR0 = 0;
  for (let s = 0; s < 0.03; s += 0.0005) {
    const pl = pointAt(L.path, s);
    const pr = project(R.path, pl.p);
    const qr = pointAt(R.path, pr.s);
    if (pr.distance >= (pl.d + qr.d) / 2) {
      carina = scale(add(pl.p, qr.p), 0.5);
      sL0 = s;
      sR0 = pr.s;
      break;
    }
  }
  const rebase = (path: Path, s0: number): Path => {
    const keep = path.pts.map((p, i) => ({ p, d: path.d[i], s: path.s[i] })).filter((x) => x.s > s0 + 0.002);
    return smoothPath(pathFrom([{ p: carina, d: pointAt(path, s0).d }, ...keep]), 2);
  };
  const left = rebase(L.path, sL0);
  const right = rebase(R.path, sR0);
  const leftMainLength = Number.isFinite(L.split) ? project(left, pointAt(L.path, L.split).p).s : left.s[left.s.length - 1];

  // Trachea path ends at the carina level.
  const tPath = pathFrom(tr.samples);
  const tCut = project(tPath, carina).s;
  const trachea = smoothPath(
    pathFrom([...tPath.pts.map((p, i) => ({ p, d: tPath.d[i], s: tPath.s[i] })).filter((x) => x.s < tCut - 0.002), { p: carina, d: pointAt(tPath, tCut).d }]),
    4
  );

  // Segmental bronchi: trunk of each segment = the piece whose entry is closest to its main path.
  const segments = {} as Record<Lobe, number>;
  const lobeJunctions = {} as Record<Lobe, V3>;
  const capsules: Capsule[] = [];
  const segEntries: { lobe: Lobe; seg: string; e: { p: V3; dir: V3; d: number }; owner: number; trunk: boolean }[] = [];
  for (const lobe of LOBES) {
    const main = lobe[0] === 'L' ? left : right;
    const segNames = [...new Set(soup.names.filter((n) => lobeOf(n) === lobe).map((n) => n.replace(/_\d+$/, '')))];
    segments[lobe] = segNames.length;
    const trunks: V3[] = [];
    for (const seg of segNames) {
      const pieces = soup.names.map((n, i) => ({ n, i })).filter((x) => x.n.replace(/_\d+$/, '') === seg);
      const entries = pieces
        .map((x) => {
          const verts = soup.verticesOf(new Set([x.i]));
          let best = verts[0];
          let bd = Infinity;
          for (let k = 0; k < verts.length; k += 2) {
            const d = project(main, verts[k]).distance;
            if (d < bd) {
              bd = d;
              best = verts[k];
            }
          }
          return { owner: x.i, near: best, d: bd };
        })
        .sort((a, b) => a.d - b.d);
      entries.forEach((x, k) => {
        const e = entryOf(soup, x.owner, x.near);
        if (!e) return;
        segEntries.push({ lobe, seg, e, owner: x.owner, trunk: k === 0 });
        if (k === 0) trunks.push(e.p);
      });
    }
    let j: V3 = [0, 0, 0];
    for (const p of trunks) j = add(j, scale(p, 1 / trunks.length));
    lobeJunctions[lobe] = j;
  }

  // Orifices on the main paths (ray casts inside the main-bronchus mesh that contains both lumens).
  const rul = findOrifice(soup, new Set([RM]), right, lobeJunctions.RUL, 0.004, 0.05);
  const rmlS = project(right, lobeJunctions.RML).s;
  const rml = findOrifice(soup, new Set([RM]), right, lobeJunctions.RML, Math.max(0.01, rmlS - 0.02), rmlS + 0.01);
  const lul = findOrifice(soup, new Set([LM]), left, lobeJunctions.LUL, Math.max(0.01, leftMainLength - 0.015), leftMainLength + 0.012);
  const orifice = (o: ReturnType<typeof findOrifice>, s: number, d: number) => (o ? { proximal: o.proximal, distal: o.distal } : { proximal: s - d / 2, distal: s + d / 2 });
  const rulO = orifice(rul, 0.02, 0.011);
  const rmlO = orifice(rml, rmlS, 0.008);
  const lulO = orifice(lul, leftMainLength, 0.01);

  // Lobar connectors: main path at the orifice → lobe junction.
  const attach: Record<Lobe, { path: Path; s: number }> = {
    RUL: { path: right, s: (rulO.proximal + rulO.distal) / 2 },
    RML: { path: right, s: (rmlO.proximal + rmlO.distal) / 2 },
    RLL: { path: right, s: right.s[right.s.length - 1] },
    LUL: { path: left, s: (lulO.proximal + lulO.distal) / 2 },
    LLL: { path: left, s: left.s[left.s.length - 1] },
  };
  const lobarR: Record<Lobe, number> = {
    RUL: Math.max(0.0035, (rulO.distal - rulO.proximal) / 2),
    RML: Math.max(0.003, (rmlO.distal - rmlO.proximal) / 2),
    RLL: pointAt(right, right.s[right.s.length - 1]).d / 2,
    LUL: Math.max(0.0035, (lulO.distal - lulO.proximal) / 2),
    LLL: pointAt(left, left.s[left.s.length - 1]).d / 2,
  };
  for (const lobe of LOBES) {
    const a = pointAt(attach[lobe].path, attach[lobe].s).p;
    capsules.push({ a, b: lobeJunctions[lobe], ra: lobarR[lobe], rb: lobarR[lobe] * 0.85, region: lobe });
  }
  // Segmental trunks (traced 20 mm inside each piece) joined to their lobe junction.
  for (const se of segEntries) {
    const t = traceTube(soup, se.e.p, se.e.dir, { owners: new Set([se.owner]), startDiameter: se.e.d, maxLength: se.trunk ? 0.022 : 0.012, turn: 0.4 });
    const p = pathFrom(t.samples);
    if (se.trunk) capsules.push({ a: lobeJunctions[se.lobe], b: se.e.p, ra: lobarR[se.lobe] * 0.8, rb: se.e.d / 2, region: 'seg' });
    else {
      // join a sub-branch to the nearest point already in the model
      let best: V3 = lobeJunctions[se.lobe];
      let bd = Infinity;
      for (const c of capsules) {
        const d = dist(c.b, se.e.p);
        if (d < bd && d > 0.001) {
          bd = d;
          best = c.b;
        }
      }
      if (bd < 0.02) capsules.push({ a: best, b: se.e.p, ra: se.e.d / 2, rb: se.e.d / 2, region: 'seg' });
    }
    if (p.pts.length > 1) capsules.push(...capsulesAlong(p, 'seg', 0.004));
  }

  const tl = trachea.s[trachea.s.length - 1];
  // Junction: the traced centrelines jump sideways from the carina to each bronchial lumen centre. Replace the last
  // 12 mm of the trachea and the first 8 mm of each bronchus by a Hermite blend, keeping arc lengths ≥ 8 mm unchanged
  // (all measurements above were made on the raw paths).
  const jS = tl - 0.012;
  const J = pointAt(trachea, jS);
  const jD = pointAt(trachea, tl - 0.025).d;
  const tracheaOut = pathFrom([
    ...trachea.pts.map((p, i) => ({ p, d: trachea.d[i], s: trachea.s[i] })).filter((x) => x.s < jS - 0.0005),
    { p: J.p, d: jD },
  ]);
  const blend = (path: Path): Path => {
    const sA = 0.008;
    const A = pointAt(path, sA);
    const chord = dist(J.p, A.p);
    const n = Math.max(6, Math.ceil(chord / 0.001));
    const pts: { p: V3; d: number }[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const h00 = 2 * t ** 3 - 3 * t ** 2 + 1, h10 = t ** 3 - 2 * t ** 2 + t, h01 = -2 * t ** 3 + 3 * t ** 2, h11 = t ** 3 - t ** 2;
      const p = add(add(scale(J.p, h00), scale(J.dir, h10 * chord)), add(scale(A.p, h01), scale(A.dir, h11 * chord)));
      const w = t * t * (3 - 2 * t);
      pts.push({ p, d: jD + (A.d - jD) * w });
    }
    const rest = path.pts.map((p, i) => ({ p, d: path.d[i], s: path.s[i] })).filter((x) => x.s > sA + 0.0005);
    const out = pathFrom([...pts, { p: A.p, d: A.d }, ...rest]);
    const iA = pts.length;
    const shift = sA - out.s[iA];
    // keep original arc lengths beyond A; the blend gets s < sA
    return { pts: out.pts, d: out.d, s: [...out.s.slice(0, iA + 1).map((v) => v + shift), ...rest.map((x) => x.s)] };
  };
  const leftOut = blend(left);
  const rightOut = blend(right);
  capsules.unshift(...capsulesAlong(tracheaOut, 'trachea'), ...capsulesAlong(leftOut, 'LMB'), ...capsulesAlong(rightOut, 'RMB'));
  return {
    version: 2,
    trachea: tracheaOut,
    carina,
    left: leftOut,
    right: rightOut,
    leftMainLength,
    lulOrifice: lulO,
    rulOrifice: rulO,
    rmlOrifice: rmlO,
    tracheaLength: tl,
    tracheaDiameter: pointAt(trachea, tl / 2).d,
    leftMainDiameter: pointAt(left, Math.min(0.02, leftMainLength / 2)).d,
    rightMainDiameter: pointAt(right, rulO.proximal / 2).d,
    segments,
    lobeJunctions,
    capsules,
  };
}
