import * as THREE from 'three';

/**
 * Gas-flow ribbons and granular soda-lime for M1 (Sprint 2A, adapted from Gemini's circuitFlowShaders.ts).
 *
 * Changes from the handoff:
 * - Agent colours come from VOLATILE_AGENTS[..].iso5360ColorHex (claim m3-iso5360-colours); there is
 *   no second colour table here.
 * - A tube carries two gas mixes (upstream / downstream of a point along it), so the fresh-gas line
 *   shows agent only after the vaporizer and the return line shows CO₂ only before the absorber
 *   (unless the absorbent is exhausted), as the particle view did.
 * - Shaders end with tone mapping and colour-space output, so colours match the lit scene.
 * - LOW tier: the dead `roughness` cast on MeshLambertMaterial is removed (Gemini Part A); on LOW
 *   the scene keeps its instanced particles instead of these shaders.
 * - Non-finite inputs are clamped, so a bad snapshot cannot blank the scene.
 *
 * All tints are schematic (claim m1-flow-tints): they show where gas goes and what it carries,
 * not a measured concentration, and they are not the ISO 32 cylinder colours.
 */

const fin = (x: number, lo: number, hi: number) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo);

export interface GasMix {
  /** 0–1 */
  o2: number;
  /** 0–0.1 (5 % ≈ 38 mmHg) */
  co2: number;
  /** 0–0.1 volatile agent fraction */
  agent: number;
  /** 0–1 argon fraction */
  argon: number;
}

export interface GasFlowSnapshot {
  /** Signed flow along the tube in L/min (negative = backwards, e.g. a stuck valve). */
  flowLpm: number;
  /** Mix upstream of `split` (0–1 along the tube). */
  upstream: GasMix;
  /** Mix downstream of `split`; defaults to `upstream`. */
  downstream?: GasMix;
  split?: number;
  /** 1 = intact circuit, lower dims the ribbon (disconnection). */
  integrity?: number;
}

const BASE = new THREE.Color(0x94a3b8);
const O2 = new THREE.Color(0x38bdf8);
const CO2 = new THREE.Color(0xf43f5e);
const ARGON = new THREE.Color(0xc084fc);

const FLOW_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FLOW_FRAG = /* glsl */ `
  uniform float uPhase;
  uniform float uAbsFlow;
  uniform float uRepeat;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uSplit;
  uniform float uDensity;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  void main() {
    // vUv.x runs along the tube, vUv.y around it.
    float u = vUv.x * uRepeat - uPhase;
    float turb = clamp(uAbsFlow / 35.0, 0.0, 1.0);
    float swirl = sin(vUv.y * 18.85 + u * 1.6) * (0.12 + turb * 0.28);
    float n1 = vnoise(vec2(u * 2.2, vUv.y * 6.0 + swirl));
    float n2 = vnoise(vec2(u * 5.0 - 0.3, vUv.y * 12.0 - swirl));
    // Pulses travel along the tube, so the direction of flow (and its reversal) is visible.
    float wave = 0.5 + 0.5 * sin(u * 6.2831853 + n1 * 1.4);
    float streak = smoothstep(0.28, 0.92, wave * 0.65 + n2 * 0.45);
    float core = pow(clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 0.85);
    float boost = mix(0.28, 1.0, clamp(uAbsFlow / 8.0, 0.0, 1.0));
    float alpha = clamp((0.34 + streak * 0.55 * boost) * core * uDensity, 0.0, 0.9);
    vec3 gas = mix(uColorA, uColorB, smoothstep(uSplit - 0.03, uSplit + 0.03, vUv.x));
    // Kept below 1 so ACES tone mapping does not wash the tint out to white.
    gl_FragColor = vec4(gas * (0.55 + streak * 0.3), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Volumetric-looking flow inside one breathing-circuit tube. Phase is integrated, so reversals never jump. */
export class GasFlowTubeController {
  readonly material: THREE.ShaderMaterial;
  private phase = 0;
  private flow = 0;
  private a = new THREE.Color();
  private b = new THREE.Color();
  private agentColor = new THREE.Color(0xfacc15);

  /** `flowToSpeed`: pattern cycles per second per L/min (display scale only). */
  constructor(private flowToSpeed = 0.085, repeat = 6) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: FLOW_VERT,
      fragmentShader: FLOW_FRAG,
      uniforms: {
        uPhase: { value: 0 },
        uAbsFlow: { value: 0 },
        uRepeat: { value: repeat },
        uColorA: { value: new THREE.Color() },
        uColorB: { value: new THREE.Color() },
        uSplit: { value: 0 },
        uDensity: { value: 0.9 },
      },
      transparent: true,
      depthWrite: false,
    });
  }

  setAgentColor(hex: string): void {
    this.agentColor.set(hex);
  }

  private mixColor(m: GasMix, out: THREE.Color): THREE.Color {
    // Full blue from ~60 % O₂; room air (21 %) stays mostly grey.
    out.copy(BASE).lerp(O2, fin(m.o2 * 1.6, 0, 1));
    out.lerp(CO2, fin(m.co2 / 0.06, 0, 0.85));
    const ag = fin(m.agent, 0, 0.12);
    if (ag > 0.001) out.lerp(this.agentColor, fin(ag / 0.04, 0, 0.72));
    const ar = fin(m.argon, 0, 1);
    if (ar > 0.06) out.lerp(ARGON, fin((ar - 0.06) / 0.2, 0, 0.5));
    return out;
  }

  update(s: GasFlowSnapshot, dtSec: number): void {
    const dt = fin(dtSec, 0, 0.1);
    const k = 1 - Math.exp(-dt * 24);
    this.flow += (fin(s.flowLpm, -120, 120) - this.flow) * k;
    this.phase = (this.phase + this.flow * this.flowToSpeed * dt) % 1000;
    const u = this.material.uniforms;
    u.uPhase.value = this.phase;
    u.uAbsFlow.value = Math.abs(this.flow);
    this.mixColor(s.upstream, this.a);
    this.mixColor(s.downstream ?? s.upstream, this.b);
    (u.uColorA.value as THREE.Color).copy(this.a);
    (u.uColorB.value as THREE.Color).copy(this.b);
    u.uSplit.value = fin(s.split ?? 0, 0, 1);
    u.uDensity.value = 0.9 * fin(s.integrity ?? 1, 0, 1);
  }

  dispose(): void {
    this.material.dispose();
  }
}

const SODA_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    vUv = uv;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SODA_FRAG = /* glsl */ `
  uniform float uExhaustion;
  uniform float uTopDown;
  uniform float uScale;
  uniform vec3 uFresh;
  uniform vec3 uSpent;
  varying vec2 vUv;
  varying vec3 vN;

  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }
  // Voronoi cells: packed granules.
  vec2 cell(vec2 x) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float md = 1.0;
    float id = 0.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash22(n + g);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < md) { md = d; id = o.x; }
      }
    }
    return vec2(sqrt(md), id);
  }

  void main() {
    vec2 c = cell(vec2(vUv.x * uScale * 1.8, vUv.y * uScale));
    float crown = smoothstep(0.55, 0.12, c.x);
    // CylinderGeometry: uv.y = 1 at the top. Exhaled gas enters at the top, so the front moves down.
    float depth = mix(vUv.y, 1.0 - vUv.y, uTopDown);
    float front = uExhaustion * 1.1 + sin(vUv.x * 12.566) * 0.035 + (c.y - 0.5) * 0.09;
    float spent = smoothstep(front + 0.06, front - 0.06, depth);
    vec3 col = mix(uFresh, uSpent, spent);
    float diff = 0.55 + 0.45 * max(dot(normalize(vN), normalize(vec3(0.4, 0.8, 0.6))), 0.0);
    gl_FragColor = vec4(col * diff * (0.72 + 0.28 * crown), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Granular absorbent with an indicator front (claim m1-soda-lime-indicator: illustrative). */
export class SodaLimeCanisterController {
  readonly material: THREE.ShaderMaterial;
  private ex = 0;

  constructor(fresh: THREE.Color, spent: THREE.Color, granuleScale = 26) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: SODA_VERT,
      fragmentShader: SODA_FRAG,
      uniforms: {
        uExhaustion: { value: 0 },
        uTopDown: { value: 1 },
        uScale: { value: granuleScale },
        uFresh: { value: fresh.clone() },
        uSpent: { value: spent.clone() },
      },
    });
  }

  update(exhaustion01: number, dtSec: number): void {
    const k = 1 - Math.exp(-fin(dtSec, 0, 0.1) * 8);
    this.ex += (fin(exhaustion01, 0, 1) - this.ex) * k;
    this.material.uniforms.uExhaustion.value = this.ex;
  }

  dispose(): void {
    this.material.dispose();
  }
}
