import * as THREE from 'three';

/**
 * B-mode ultrasound computed from the 3D scene ("Simulator model").
 *
 * 1. Slice: every tissue mesh is intersected with the beam plane; analytic shapes (nerve trunks,
 *    pleural dome, local anaesthetic) are tested per pixel. Result: a tissue label per pixel.
 * 2. Echo: each scanline is marched from the transducer down. At every tissue boundary part of the
 *    energy is reflected (R = ((Z2 − Z1)/(Z2 + Z1))²); inside a tissue the energy is attenuated
 *    (dB/cm/MHz, round trip) and scattered (speckle). Bone shadows and enhancement behind fluid are
 *    therefore produced by the physics, not drawn.
 * 3. Air (lung) reflects almost everything: a bright pleural line and A-line reverberations below it.
 * 4. Needle: a specular reflector; brightness falls with the angle between the needle and the
 *    transducer face and with its distance from the thin beam (out-of-plane needles vanish).
 * 5. Time-gain compensation, log compression to a 60 dB display range, light point-spread blur.
 *
 * Acoustic values are typical textbook figures used to make the mechanisms visible; they are
 * illustrative, not tissue measurements.
 */

export type Tissue = 'soft' | 'skin' | 'fat' | 'muscle' | 'artery' | 'vein' | 'nerve' | 'bone' | 'air' | 'la';

export const ACOUSTIC: Record<Tissue, { z: number; att: number; scatter: number }> = {
  soft: { z: 1.63, att: 0.6, scatter: 0.3 },
  skin: { z: 1.7, att: 0.9, scatter: 0.75 },
  fat: { z: 1.38, att: 0.5, scatter: 0.12 },
  muscle: { z: 1.7, att: 1.0, scatter: 0.32 },
  artery: { z: 1.61, att: 0.15, scatter: 0.004 },
  vein: { z: 1.61, att: 0.15, scatter: 0.006 },
  nerve: { z: 1.6, att: 0.8, scatter: 0.55 },
  bone: { z: 7.8, att: 12, scatter: 0.6 },
  air: { z: 0.0004, att: 40, scatter: 0 },
  la: { z: 1.5, att: 0.08, scatter: 0.002 },
};

const TISSUES: Tissue[] = ['soft', 'skin', 'fat', 'muscle', 'artery', 'vein', 'nerve', 'bone', 'air', 'la'];
const TID: Record<Tissue, number> = Object.fromEntries(TISSUES.map((t, i) => [t, i])) as Record<Tissue, number>;

/** Probe frame in world space: origin on the skin, u = across the footprint, d = into the body. */
export interface ProbeFrame {
  origin: THREE.Vector3;
  u: THREE.Vector3;
  d: THREE.Vector3;
  /** Plane normal (elevation direction). */
  e: THREE.Vector3;
}

export interface MeshTissue {
  mesh: THREE.Mesh;
  tissue: Tissue;
  /** Higher wins where structures overlap. */
  priority: number;
}

export interface AnalyticTissue {
  tissue: Tissue;
  priority: number;
  /** World-space inside test. */
  inside(p: THREE.Vector3): boolean;
}

export interface NeedleState {
  hub: THREE.Vector3;
  tip: THREE.Vector3;
  visible: boolean;
}

export interface BmodeSettings {
  widthM: number;
  depthM: number;
  freqMHz: number;
  gainDb: number;
  time: number;
}

/**
 * Colour Doppler ("Simulator model"). The scanner only measures the velocity component along the
 * beam: v_beam = v · cos θ (Oglat 2018, J Med Ultrasound, PMC6029191). At θ = 90° cos θ = 0, so a
 * vessel cut exactly in short axis shows no colour however fast it flows.
 */
export interface DopplerSettings {
  /** Colour box as fractions of the image (0–1). */
  box: { c0: number; c1: number; r0: number; r1: number };
  /**
   * Flow velocity in display units (|v| = 1 is the top of the colour scale) for a structure, by its
   * index in the mesh/analytic lists, or null if it carries no flow.
   */
  flow: (labelKey: number) => THREE.Vector3 | null;
  /** Fraction of the scale below which the wall filter removes the signal. */
  wallFilter: number;
}

export interface BmodeOutput {
  image: ImageData;
  cols: number;
  rows: number;
  /** Pixel centroid of each labelled structure present in the image (for 2D labels). */
  centroids: Partial<Record<string, { x: number; y: number; n: number }>>;
  /** Needle visibility 0..1 (for the teaching readout). */
  needleVisibility: number;
  /** Largest |beam-axis velocity| seen in the colour box (display units), 0 when Doppler is off. */
  dopplerPeak: number;
  /** Number of vessel pixels inside the colour box (0 = no vessel to sample). */
  dopplerVesselPixels: number;
}

/** Stable pseudo-random value in [0,1) from integer lattice coordinates. */
function hash3(x: number, y: number, z: number): number {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Rayleigh-distributed speckle tied to tissue position, so texture moves with the anatomy. */
function speckle(p: THREE.Vector3): number {
  const s = 1 / 0.00028; // ~0.28 mm speckle cells
  const v = hash3(Math.floor(p.x * s), Math.floor(p.y * s), Math.floor(p.z * s));
  return Math.sqrt(-2 * Math.log(1 - v * 0.999));
}

export class UltrasoundSimulator {
  readonly cols: number;
  readonly rows: number;
  labels: Uint8Array;
  private labelKey: Int16Array;
  private echo: Float32Array;
  private image: ImageData;
  private tmpA = new THREE.Vector3();
  private tmpB = new THREE.Vector3();
  private tmpC = new THREE.Vector3();
  private world = new THREE.Vector3();

  constructor(cols = 200, rows = 168) {
    this.cols = cols;
    this.rows = rows;
    this.labels = new Uint8Array(cols * rows);
    this.labelKey = new Int16Array(cols * rows);
    this.echo = new Float32Array(cols * rows);
    this.image = new ImageData(cols, rows);
  }

  /**
   * Intersect a mesh with the beam plane. Returns, per column, the sorted depths where the
   * scanline crosses the mesh surface (inside = between pairs).
   */
  private sliceMesh(mesh: THREE.Mesh, frame: ProbeFrame, s: BmodeSettings): number[][] {
    const cross: number[][] = Array.from({ length: this.cols }, () => []);
    const geo = mesh.geometry;
    const pos = geo.getAttribute('position');
    const index = geo.getIndex();
    const triCount = index ? index.count / 3 : pos.count / 3;
    mesh.updateWorldMatrix(true, false);
    const m = mesh.matrixWorld;
    const local = (i: number, out: THREE.Vector3) => {
      out.fromBufferAttribute(pos, i).applyMatrix4(m).sub(frame.origin);
      return [out.dot(frame.u), out.dot(frame.d), out.dot(frame.e)] as const;
    };
    const half = s.widthM / 2;
    for (let t = 0; t < triCount; t++) {
      const i0 = index ? index.getX(t * 3) : t * 3;
      const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
      const a = local(i0, this.tmpA);
      const b = local(i1, this.tmpB);
      const c = local(i2, this.tmpC);
      const pts: [number, number][] = [];
      const edge = (p: readonly number[], q: readonly number[]) => {
        if ((p[2] > 0) === (q[2] > 0)) return;
        const k = p[2] / (p[2] - q[2]);
        pts.push([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]);
      };
      edge(a, b);
      edge(b, c);
      edge(c, a);
      if (pts.length !== 2) continue;
      const [[u0, d0], [u1, d1]] = pts;
      if (u0 === u1) continue;
      const lo = Math.min(u0, u1);
      const hi = Math.max(u0, u1);
      const c0 = Math.max(0, Math.ceil(((lo + half) / s.widthM) * this.cols - 0.5));
      const c1 = Math.min(this.cols - 1, Math.floor(((hi + half) / s.widthM) * this.cols - 0.5));
      for (let col = c0; col <= c1; col++) {
        const u = ((col + 0.5) / this.cols) * s.widthM - half;
        if (u < lo || u >= hi) continue;
        cross[col].push(d0 + ((d1 - d0) * (u - u0)) / (u1 - u0));
      }
    }
    for (const list of cross) list.sort((x, y) => x - y);
    return cross;
  }

  render(
    frame: ProbeFrame,
    meshes: MeshTissue[],
    analytic: AnalyticTissue[],
    needle: NeedleState | null,
    s: BmodeSettings,
    labelFor: (tissueIndexInLists: number) => string | null,
    doppler?: DopplerSettings | null
  ): BmodeOutput {
    const { cols, rows, labels, labelKey, echo } = this;
    const dz = s.depthM / rows;
    const half = s.widthM / 2;

    // ── 1. Tissue labels ──────────────────────────────────────────────────
    const prio = new Int8Array(cols * rows).fill(-1);
    labels.fill(TID.soft);
    labelKey.fill(-1);
    // Superficial layers: skin 1.6 mm, subcutaneous fat to 4.5 mm.
    for (let r = 0; r < rows; r++) {
      const depth = (r + 0.5) * dz;
      const t = depth < 0.0016 ? TID.skin : depth < 0.0045 ? TID.fat : depth < 0.009 ? TID.muscle : TID.soft;
      for (let c = 0; c < cols; c++) labels[r * cols + c] = t;
    }

    meshes.forEach((mt, k) => {
      const cross = this.sliceMesh(mt.mesh, frame, s);
      for (let c = 0; c < cols; c++) {
        const list = cross[c];
        for (let j = 0; j + 1 < list.length; j += 2) {
          const r0 = Math.max(0, Math.floor(list[j] / dz));
          const r1 = Math.min(rows - 1, Math.floor(list[j + 1] / dz));
          for (let r = r0; r <= r1; r++) {
            const i = r * cols + c;
            if (mt.priority > prio[i]) {
              prio[i] = mt.priority;
              labels[i] = TID[mt.tissue];
              labelKey[i] = k;
            }
          }
        }
      }
    });

    if (analytic.length) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          this.pixelWorld(frame, c, r, s, this.world);
          analytic.forEach((at, k) => {
            if (at.priority > prio[i] && at.inside(this.world)) {
              prio[i] = at.priority;
              labels[i] = TID[at.tissue];
              labelKey[i] = meshes.length + k;
            }
          });
        }
      }
    }

    // ── 2. Echo formation, scanline by scanline ───────────────────────────
    const f = s.freqMHz;
    const tgcPerRow = Math.pow(10, (2 * ACOUSTIC.soft.att * f * (dz * 100)) / 10);
    const gain = Math.pow(10, s.gainDb / 10);
    echo.fill(0);
    const pleuraRows: number[] = new Array(cols).fill(-1);
    for (let c = 0; c < cols; c++) {
      let intensity = 1;
      let tgc = 1;
      let prev = labels[c];
      for (let r = 0; r < rows; r++) {
        const i = r * cols + c;
        const t = labels[i];
        const ac = ACOUSTIC[TISSUES[t]];
        if (t !== prev) {
          const z1 = ACOUSTIC[TISSUES[prev]].z;
          const z2 = ac.z;
          const R = ((z2 - z1) / (z2 + z1)) ** 2;
          // Specular boundary echo (bright interface), spread over two rows.
          // Vessel walls and nerve sheaths are fibrous layers: add a wall echo on top of the impedance step.
          const wall = TISSUES[t] === 'artery' || TISSUES[prev] === 'artery' ? 0.22 : TISSUES[t] === 'vein' || TISSUES[prev] === 'vein' ? 0.12 : TISSUES[t] === 'nerve' || TISSUES[prev] === 'nerve' ? 0.1 : 0;
          let spec = intensity * Math.min(1, R * 60 + 0.002 + wall);
          // Strong reflectors (bone cortex, pleura/air): near-total reflection plus the finite pulse
          // length make a thick, saturated line.
          const strong = R > 0.2;
          if (strong) spec *= 6;
          echo[i] += spec * tgc;
          if (r + 1 < rows) echo[i + cols] += spec * (strong ? 0.8 : 0.5) * tgc;
          if (strong && r + 2 < rows) echo[i + 2 * cols] += spec * 0.35 * tgc;
          intensity *= 1 - R;
          if (TISSUES[t] === 'air' && pleuraRows[c] < 0) pleuraRows[c] = r;
          prev = t;
        }
        this.pixelWorld(frame, c, r, s, this.world);
        echo[i] += intensity * ac.scatter * 0.02 * speckle(this.world) * tgc;
        intensity *= Math.pow(10, -(2 * ac.att * f * (dz * 100)) / 10);
        tgc *= tgcPerRow;
      }
    }

    // A-lines: reverberations of the pleural line at multiples of its depth, with lung "shimmer".
    for (let c = 0; c < cols; c++) {
      const pr = pleuraRows[c];
      if (pr < 0) continue;
      const shimmer = 0.75 + 0.25 * Math.sin(s.time * 7 + c * 0.35);
      echo[pr * cols + c] *= shimmer;
      for (let k = 2; k <= 4; k++) {
        const rr = pr * k;
        if (rr >= rows) break;
        const amp = echo[pr * cols + c] * Math.pow(0.35, k - 1);
        echo[rr * cols + c] += amp;
        if (rr + 1 < rows) echo[(rr + 1) * cols + c] += amp * 0.5;
      }
    }

    // ── 3. Needle (specular) ──────────────────────────────────────────────
    let needleVisibility = 0;
    if (needle?.visible) {
      const toLocal = (p: THREE.Vector3) => {
        const v = this.tmpA.copy(p).sub(frame.origin);
        return [v.dot(frame.u), v.dot(frame.d), v.dot(frame.e)];
      };
      const h = toLocal(needle.hub);
      const tp = toLocal(needle.tip);
      const du = tp[0] - h[0];
      const dd = tp[1] - h[1];
      // Angle between the shaft and the transducer face (0° = parallel = brightest).
      const inPlaneAngle = Math.abs(Math.atan2(dd, Math.abs(du) + 1e-9));
      const angleFactor = Math.exp(-Math.pow(inPlaneAngle / THREE.MathUtils.degToRad(32), 2));
      const steps = 260;
      let vis = 0;
      for (let k = 0; k <= steps; k++) {
        const a = k / steps;
        const u = h[0] + du * a;
        const d = h[1] + dd * a;
        const e = h[2] + (tp[2] - h[2]) * a;
        if (d < 0) continue;
        const beam = Math.exp(-Math.pow(e / 0.0007, 2)); // ~1.4 mm slice thickness
        const c = Math.floor(((u + half) / s.widthM) * cols);
        const r = Math.floor(d / dz);
        if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
        const amp = 0.25 * beam * (0.12 + 0.88 * angleFactor);
        vis = Math.max(vis, beam * (0.12 + 0.88 * angleFactor));
        const tgcHere = Math.pow(tgcPerRow, r);
        echo[r * cols + c] += amp * tgcHere;
        // Reverberation "comet tail" below a bright shaft.
        for (let q = 1; q <= 3; q++) {
          const rr = r + q * 3;
          if (rr < rows) echo[rr * cols + c] += amp * Math.pow(0.3, q) * Math.pow(tgcPerRow, rr);
        }
      }
      needleVisibility = vis;
    }

    // ── 4. Display: log compression, light lateral blur ───────────────────
    const out = this.image.data;
    const dr = 60;
    const centroids: BmodeOutput['centroids'] = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const e0 = echo[i];
        const el = c > 0 ? echo[i - 1] : e0;
        const er = c < cols - 1 ? echo[i + 1] : e0;
        const v = (0.25 * el + 0.5 * e0 + 0.25 * er) * gain;
        const db = 10 * Math.log10(v + 1e-12);
        let g = (db + dr - 12) / dr;
        g = g < 0 ? 0 : g > 1 ? 1 : g;
        const px = Math.round(255 * Math.pow(g, 1.15));
        const o = i * 4;
        out[o] = px;
        out[o + 1] = px;
        out[o + 2] = Math.min(255, px + 4);
        out[o + 3] = 255;
        const k = labelKey[i];
        if (k >= 0) {
          const name = labelFor(k);
          if (name) {
            const cc = (centroids[name] ??= { x: 0, y: 0, n: 0 });
            cc.x += c;
            cc.y += r;
            cc.n++;
          }
        }
      }
    }
    for (const cc of Object.values(centroids)) {
      if (!cc) continue;
      cc.x /= cc.n;
      cc.y /= cc.n;
    }

    // ── 5. Colour Doppler overlay ─────────────────────────────────────────
    let dopplerPeak = 0;
    let dopplerVesselPixels = 0;
    if (doppler) {
      const cl = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);
      const c0 = Math.floor(cl(doppler.box.c0) * cols);
      const c1 = Math.ceil(cl(doppler.box.c1) * cols);
      const r0 = Math.floor(cl(doppler.box.r0) * rows);
      const r1 = Math.ceil(cl(doppler.box.r1) * rows);
      const wf = cl(doppler.wallFilter);
      const seed = Math.floor(s.time * 30);
      const flowCache = new Map<number, number | null>();
      // Beam-axis component, positive = toward the transducer (frame.d points into the body).
      const beamVel = (k: number): number | null => {
        if (flowCache.has(k)) return flowCache.get(k) ?? null;
        const v = doppler.flow(k);
        const out = v ? -v.dot(frame.d) : null;
        flowCache.set(k, out !== null && Number.isFinite(out) ? out : null);
        return flowCache.get(k) ?? null;
      };
      for (let r = r0; r < r1; r++) {
        for (let c = c0; c < c1; c++) {
          const i = r * cols + c;
          const k = labelKey[i];
          if (k < 0) continue;
          const t = TISSUES[labels[i]];
          if (t !== 'artery' && t !== 'vein') continue;
          const vb = beamVel(k);
          if (vb === null) continue;
          dopplerVesselPixels++;
          // Slower near the wall (laminar profile, schematic): fewer same-lumen neighbours → slower.
          let same = 0;
          for (const [dc, dr2] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as const) {
            const cc = c + dc;
            const rr = r + dr2;
            if (cc >= 0 && cc < cols && rr >= 0 && rr < rows && labelKey[rr * cols + cc] === k) same++;
          }
          const profile = 0.45 + 0.55 * (same / 4);
          const jitter = 0.85 + 0.3 * hash3(c, r, seed);
          const v = vb * profile * jitter;
          const m = Math.abs(v);
          dopplerPeak = Math.max(dopplerPeak, Math.abs(vb));
          if (m < wf) continue; // wall filter: slow signal is rejected, so 90° shows no colour
          const a = Math.min(1, m);
          const o = i * 4;
          if (v > 0) {
            // Toward the probe: dark red → yellow (BART: "blue away, red toward").
            out[o] = Math.round(110 + 145 * a);
            out[o + 1] = Math.round(220 * a * a);
            out[o + 2] = 0;
          } else {
            // Away from the probe: dark blue → cyan.
            out[o] = 0;
            out[o + 1] = Math.round(200 * a * a);
            out[o + 2] = Math.round(120 + 135 * a);
          }
        }
      }
    }
    return { image: this.image, cols, rows, centroids, needleVisibility, dopplerPeak, dopplerVesselPixels };
  }

  private pixelWorld(frame: ProbeFrame, c: number, r: number, s: BmodeSettings, out: THREE.Vector3) {
    const u = ((c + 0.5) / this.cols) * s.widthM - s.widthM / 2;
    const d = ((r + 0.5) / this.rows) * s.depthM;
    return out.copy(frame.origin).addScaledVector(frame.u, u).addScaledVector(frame.d, d);
  }
}

/** Point-in-closed-mesh test (ray parity along +x), used for needle-tip safety alerts. */
export function pointInMesh(p: THREE.Vector3, mesh: THREE.Mesh): boolean {
  const geo = mesh.geometry;
  const pos = geo.getAttribute('position');
  const index = geo.getIndex();
  const triCount = index ? index.count / 3 : pos.count / 3;
  mesh.updateWorldMatrix(true, false);
  const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
  const o = p.clone().applyMatrix4(inv);
  const dir = new THREE.Vector3(1, 0.0001, 0.0002).normalize();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), pv = new THREE.Vector3(), tv = new THREE.Vector3(), qv = new THREE.Vector3();
  let hits = 0;
  for (let t = 0; t < triCount; t++) {
    a.fromBufferAttribute(pos, index ? index.getX(t * 3) : t * 3);
    b.fromBufferAttribute(pos, index ? index.getX(t * 3 + 1) : t * 3 + 1);
    c.fromBufferAttribute(pos, index ? index.getX(t * 3 + 2) : t * 3 + 2);
    e1.subVectors(b, a);
    e2.subVectors(c, a);
    pv.crossVectors(dir, e2);
    const det = e1.dot(pv);
    if (Math.abs(det) < 1e-12) continue;
    const inv = 1 / det;
    tv.subVectors(o, a);
    const uu = tv.dot(pv) * inv;
    if (uu < 0 || uu > 1) continue;
    qv.crossVectors(tv, e1);
    const vv = dir.dot(qv) * inv;
    if (vv < 0 || uu + vv > 1) continue;
    if (e2.dot(qv) * inv > 0) hits++;
  }
  return hits % 2 === 1;
}
