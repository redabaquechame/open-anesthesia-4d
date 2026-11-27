import * as THREE from 'three';

/**
 * First-person flexible-bronchoscope view, rendered by sphere-tracing a signed distance field:
 * - airway lumen = smooth union of tapered capsules along the centrelines measured on the BodyParts3D
 *   meshes (airway-map.json), so the carina and every orifice sit where the anatomy puts them;
 * - cartilage rings as a small relief on the anterior / lateral wall of the trachea and main bronchi
 *   (absent on the posterior membranous wall) — illustrative spacing;
 * - the double-lumen tube as hollow clear-PVC capsules (seen through, one transparency layer) and the
 *   bronchial (blue) and tracheal cuffs as solids;
 * - one light at the scope tip with inverse-square fall-off, wet specular, wide-angle (equidistant
 *   fisheye) optics, circular field stop and vignette.
 * Owns its canvas and WebGL context (created on mount, removed on dispose).
 */

export const MAX_AIRWAY = 48;
export const MAX_TUBE = 28;

export interface ScopeCapsule {
  a: THREE.Vector3;
  b: THREE.Vector3;
  ra: number;
  rb: number;
  /** Arc length (m) at a and b, for ring spacing; ring weight 0–1. */
  sa: number;
  sb: number;
  ring: number;
}

export interface TubeSegment {
  a: THREE.Vector3;
  b: THREE.Vector3;
  rOut: number;
  rIn: number;
  /** 0 = main body (tracheal lumen), 1 = bronchial limb */
  part: 0 | 1;
}

export interface CuffShape {
  a: THREE.Vector3;
  b: THREE.Vector3;
  r: number;
  color: THREE.Color;
  opacity: number;
}

export interface ScopePose {
  position: THREE.Vector3;
  forward: THREE.Vector3;
  up: THREE.Vector3;
}

const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform vec3 uCam; uniform vec3 uFwd; uniform vec3 uUp; uniform vec3 uRight;
uniform float uFov;
uniform int uNAir; uniform vec4 uAirA[${MAX_AIRWAY}]; uniform vec4 uAirB[${MAX_AIRWAY}]; uniform vec4 uAirS[${MAX_AIRWAY}];
uniform int uNTube; uniform vec4 uTubeA[${MAX_TUBE}]; uniform vec4 uTubeB[${MAX_TUBE}]; uniform vec2 uTubeIn[${MAX_TUBE}];
uniform vec4 uCuffA[2]; uniform vec4 uCuffB[2]; uniform vec4 uCuffC[2];
uniform float uExposure;
uniform float uTime;

float capsule(vec3 p, vec3 a, vec3 b, float ra, float rb, out float h) {
  vec3 pa = p - a, ba = b - a;
  h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-12), 0.0, 1.0);
  return length(pa - ba * h) - mix(ra, rb, h);
}
float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }

// Airway: returns distance to the wall measured from inside (positive in the lumen).
// attr: x = arc length, y = ring weight, zw unused; axisPt = closest axis point.
float airway(vec3 p, out vec2 attr, out vec3 axisPt) {
  float d = 1e3; float best = 1e3; attr = vec2(0.0); axisPt = p;
  for (int i = 0; i < ${MAX_AIRWAY}; i++) {
    if (i >= uNAir) break;
    float h;
    float di = capsule(p, uAirA[i].xyz, uAirB[i].xyz, uAirA[i].w, uAirB[i].w, h);
    d = smin(d, di, 0.0014);
    if (di < best) { best = di; attr = vec2(mix(uAirS[i].x, uAirS[i].y, h), uAirS[i].z); axisPt = mix(uAirA[i].xyz, uAirB[i].xyz, h); }
  }
  return -d;
}
float rings(vec3 p, vec2 attr, vec3 axisPt) {
  if (attr.y <= 0.0) return 0.0;
  vec3 radial = normalize(p - axisPt);
  // Posterior membranous wall (−Z = posterior in this model) has no cartilage.
  float anterior = smoothstep(-0.55, -0.05, radial.z);
  float c = 0.5 + 0.5 * cos(6.2831853 * attr.x / 0.0042);
  return 0.00032 * attr.y * anterior * pow(c, 5.0);
}
float tube(vec3 p) {
  // part 0 = main body (tracheal lumen), part 1 = bronchial limb; each part is hollow on its own.
  float o0 = 1e3, i0 = 1e3, o1 = 1e3, i1 = 1e3; float h;
  for (int i = 0; i < ${MAX_TUBE}; i++) {
    if (i >= uNTube) break;
    float o = capsule(p, uTubeA[i].xyz, uTubeB[i].xyz, uTubeA[i].w, uTubeB[i].w, h);
    // inner bore extended past the rounded outer cap so the ends stay open whatever the wall thickness
    vec3 ext = normalize(uTubeB[i].xyz - uTubeA[i].xyz) * max(0.0015, uTubeA[i].w - uTubeIn[i].x + 0.0005);
    float n = capsule(p, uTubeA[i].xyz - ext, uTubeB[i].xyz + ext, uTubeIn[i].x, uTubeIn[i].x, h);
    if (uTubeIn[i].y < 0.5) { o0 = min(o0, o); i0 = min(i0, n); } else { o1 = min(o1, o); i1 = min(i1, n); }
  }
  return min(max(o0, -i0), max(o1, -i1));
}
float cuff(vec3 p, out int which) {
  float h; which = -1; float d = 1e3;
  for (int i = 0; i < 2; i++) {
    if (uCuffA[i].w <= 0.0) continue;
    float di = capsule(p, uCuffA[i].xyz, uCuffB[i].xyz, uCuffA[i].w, uCuffA[i].w, h);
    if (di < d) { d = di; which = i; }
  }
  return d;
}
// Scene: 0 = wall, 1 = tube, 2/3 = cuffs
float scene(vec3 p, bool withTube, out int id, out vec2 attr, out vec3 axisPt) {
  float w = airway(p, attr, axisPt) - rings(p, attr, axisPt);
  id = 0; float d = w;
  if (withTube && uNTube > 0) { float t = tube(p); if (t < d) { d = t; id = 1; } }
  int wc; float c = cuff(p, wc); if (c < d) { d = c; id = 2 + wc; }
  return d;
}
vec3 calcNormal(vec3 p, bool withTube) {
  vec2 e = vec2(0.00012, 0.0); int id; vec2 a; vec3 ax;
  return normalize(vec3(
    scene(p + e.xyy, withTube, id, a, ax) - scene(p - e.xyy, withTube, id, a, ax),
    scene(p + e.yxy, withTube, id, a, ax) - scene(p - e.yxy, withTube, id, a, ax),
    scene(p + e.yyx, withTube, id, a, ax) - scene(p - e.yyx, withTube, id, a, ax)));
}
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }

vec3 shade(vec3 p, vec3 rd, vec3 n, int id, vec2 attr, vec3 axisPt) {
  vec3 L = uCam - p; float dist2 = dot(L, L); L = normalize(L);
  float atten = 1.0 / (1.0 + dist2 / (0.012 * 0.012));
  vec3 base;
  float gloss = 90.0; float specK = 0.55;
  if (id == 0) {
    vec3 radial = normalize(p - axisPt);
    float post = 1.0 - smoothstep(-0.55, -0.05, radial.z);
    float vessels = smoothstep(0.62, 0.7, fbm(p * 900.0)) * 0.35;
    float mottle = fbm(p * 260.0);
    base = mix(vec3(0.86, 0.46, 0.43), vec3(0.93, 0.62, 0.56), mottle * 0.6);
    base = mix(base, vec3(0.78, 0.38, 0.40), post * 0.5);          // membranous wall, slightly darker
    base = mix(base, vec3(0.62, 0.12, 0.14), vessels);              // fine submucosal vessels
    base = mix(base, vec3(0.97, 0.86, 0.80), attr.y * rings(p, attr, axisPt) / 0.00032 * 0.35); // ring crests paler
  } else if (id == 1) {
    base = vec3(0.86, 0.92, 0.95); gloss = 140.0; specK = 0.9;
  } else {
    int k = id - 2;
    base = k == 0 ? uCuffC[0].rgb : uCuffC[1].rgb; gloss = 120.0; specK = 0.8;
  }
  float wrap = max(0.0, (dot(n, L) + 0.35) / 1.35);
  vec3 H = normalize(L - rd);
  float fres = 0.04 + 0.96 * pow(1.0 - max(0.0, dot(n, -rd)), 5.0);
  float spec = pow(max(0.0, dot(n, H)), gloss) * (specK + fres);
  vec3 sss = vec3(0.35, 0.05, 0.03) * (1.0 - max(0.0, dot(n, L))) * (id == 0 ? 1.0 : 0.0);
  return (base * wrap + sss * 0.6 + vec3(1.0, 0.97, 0.92) * spec) * atten;
}

vec3 trace(vec3 ro, vec3 rd, bool withTube, out int hitId, out float hitT) {
  float t = 0.0; int id = -1; vec2 attr; vec3 ax; hitId = -1; hitT = 0.15;
  for (int i = 0; i < 120; i++) {
    vec3 p = ro + rd * t;
    float d = scene(p, withTube, id, attr, ax);
    if (d < 0.00006) { hitId = id; hitT = t; break; }
    t += max(d * 0.85, 0.00004);
    if (t > 0.15) break;
  }
  if (hitId < 0) return vec3(0.0);
  vec3 p = ro + rd * hitT;
  scene(p, withTube, id, attr, ax);
  vec3 n = calcNormal(p, withTube);
  return shade(p, rd, n, hitId, attr, ax);
}

void main() {
  vec2 q = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float r = length(q) / 0.47;
  if (r > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  // Equidistant fisheye: angle from axis proportional to image radius.
  float theta = r * uFov * 0.5;
  float phi = atan(q.y, q.x);
  vec3 rd = normalize(uFwd * cos(theta) + (uRight * cos(phi) + uUp * sin(phi)) * sin(theta));
  int id; float t;
  vec3 col = trace(uCam, rd, true, id, t);
  if (id == 1) {
    // see through the clear tube wall (one layer)
    int id2; float t2;
    vec3 behind = trace(uCam + rd * (t + 0.0016), rd, false, id2, t2);
    col = mix(behind, col, 0.32);
  }
  col *= uExposure;
  col = col / (1.0 + col);                         // Reinhard
  col = pow(col, vec3(1.0 / 2.2));
  float vig = smoothstep(1.0, 0.55, r);
  col *= mix(0.35, 1.0, vig);
  col *= smoothstep(1.0, 0.985, r);                // field stop
  // orientation notch at 12 o'clock
  if (q.y > 0.445 && q.y < 0.47 && abs(q.x) < 0.012 * (0.47 - q.y) / 0.025) col = vec3(0.9);
  col += (hash(vec3(gl_FragCoord.xy, uTime)) - 0.5) * 0.02;
  gl_FragColor = vec4(col, 1.0);
}
`;

export class BronchoscopeView {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cam = new THREE.Camera();
  private mat: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private ro: ResizeObserver;
  private scale: number;

  constructor(private container: HTMLElement, lowTier = false) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'absolute inset-0 w-full h-full';
    container.prepend(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }); // renders on change only: keep the last frame
    this.scale = lowTier ? 0.55 : 0.85;
    const v4 = (n: number) => Array.from({ length: n }, () => new THREE.Vector4());
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uRes: { value: new THREE.Vector2(1, 1) },
        uCam: { value: new THREE.Vector3() },
        uFwd: { value: new THREE.Vector3(0, -1, 0) },
        uUp: { value: new THREE.Vector3(0, 0, 1) },
        uRight: { value: new THREE.Vector3(1, 0, 0) },
        uFov: { value: THREE.MathUtils.degToRad(120) },
        uNAir: { value: 0 },
        uAirA: { value: v4(MAX_AIRWAY) },
        uAirB: { value: v4(MAX_AIRWAY) },
        uAirS: { value: v4(MAX_AIRWAY) },
        uNTube: { value: 0 },
        uTubeA: { value: v4(MAX_TUBE) },
        uTubeB: { value: v4(MAX_TUBE) },
        uTubeIn: { value: Array.from({ length: MAX_TUBE }, () => new THREE.Vector2()) },
        uCuffA: { value: v4(2) },
        uCuffB: { value: v4(2) },
        uCuffC: { value: v4(2) },
        uExposure: { value: 1.6 },
        uTime: { value: 0 },
      },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
  }

  private resize() {
    const w = Math.max(2, this.container.clientWidth);
    const h = Math.max(2, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * this.scale);
    this.renderer.setSize(w, h, false);
    this.mat.uniforms.uRes.value.set(w, h);
  }

  setFov(deg: number) {
    this.mat.uniforms.uFov.value = THREE.MathUtils.degToRad(deg);
  }

  render(pose: ScopePose, airway: ScopeCapsule[], tube: TubeSegment[], cuffs: (CuffShape | null)[], time: number) {
    const u = this.mat.uniforms;
    const f = pose.forward.clone().normalize();
    const right = new THREE.Vector3().crossVectors(f, pose.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, f).normalize();
    u.uCam.value.copy(pose.position);
    u.uFwd.value.copy(f);
    u.uRight.value.copy(right);
    u.uUp.value.copy(up);
    // nearest capsules first (cull to the view neighbourhood)
    const near = airway
      .map((c) => ({ c, d: distToSegment(pose.position, c.a, c.b) - Math.max(c.ra, c.rb) }))
      .filter((x) => x.d < 0.075)
      .sort((a, b) => a.d - b.d)
      .slice(0, MAX_AIRWAY);
    u.uNAir.value = near.length;
    near.forEach(({ c }, i) => {
      u.uAirA.value[i].set(c.a.x, c.a.y, c.a.z, c.ra);
      u.uAirB.value[i].set(c.b.x, c.b.y, c.b.z, c.rb);
      u.uAirS.value[i].set(c.sa, c.sb, c.ring, 0);
    });
    const tnear = tube
      .map((t) => ({ t, d: distToSegment(pose.position, t.a, t.b) }))
      .filter((x) => x.d < 0.08)
      .sort((a, b) => a.d - b.d)
      .slice(0, MAX_TUBE);
    u.uNTube.value = tnear.length;
    tnear.forEach(({ t }, i) => {
      u.uTubeA.value[i].set(t.a.x, t.a.y, t.a.z, t.rOut);
      u.uTubeB.value[i].set(t.b.x, t.b.y, t.b.z, t.rOut);
      u.uTubeIn.value[i].set(t.rIn, t.part);
    });
    for (let i = 0; i < 2; i++) {
      const c = cuffs[i];
      if (!c) {
        u.uCuffA.value[i].set(0, 0, 0, 0);
        continue;
      }
      u.uCuffA.value[i].set(c.a.x, c.a.y, c.a.z, c.r);
      u.uCuffB.value[i].set(c.b.x, c.b.y, c.b.z, c.r);
      u.uCuffC.value[i].set(c.color.r, c.color.g, c.color.b, c.opacity);
    }
    u.uTime.value = time;
    this.renderer.render(this.scene, this.cam);
  }

  dispose() {
    this.ro.disconnect();
    this.quad.geometry.dispose();
    this.mat.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}

export function distToSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const ab = new THREE.Vector3().subVectors(b, a);
  const t = THREE.MathUtils.clamp(new THREE.Vector3().subVectors(p, a).dot(ab) / Math.max(ab.lengthSq(), 1e-12), 0, 1);
  return a.clone().addScaledVector(ab, t).distanceTo(p);
}
