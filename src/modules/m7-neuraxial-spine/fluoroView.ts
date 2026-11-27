import * as THREE from 'three';

/**
 * Virtual C-arm ("Simulator model").
 *
 * The same vertebra meshes as the 3D view are projected from a point source. For every pixel the
 * shader sums the path length through each object (back-face depth − front-face depth) weighted by
 * an attenuation coefficient, then the image is I = exp(−Σ μ·L) (Beer–Lambert). Overlaps,
 * pedicles, the "Scottie dog" on obliques and the needle therefore appear because they are in the
 * geometry, not because they are drawn. Fluoroscopy display convention: dense = dark.
 *
 * μ values are illustrative (bone ≈ 0.5 /cm, steel much higher), not calibrated to a kV.
 */

export type FluoroProjection = 'AP' | 'LAT' | 'OBL';

const thicknessVert = /* glsl */ `
  varying float vDepth;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const thicknessFrag = /* glsl */ `
  uniform float mu;
  uniform float refDepth;
  varying float vDepth;
  void main() {
    float s = gl_FrontFacing ? -1.0 : 1.0;
    gl_FragColor = vec4(s * (vDepth - refDepth) * mu, 0.0, 0.0, 1.0);
  }
`;

const displayVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const displayFrag = /* glsl */ `
  uniform sampler2D tThick;
  uniform float aspect;
  uniform float seed;
  uniform float fallback;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
  void main() {
    float a = texture2D(tThick, vUv).r;
    if (fallback > 0.5) a *= 6.0;
    float I = exp(-max(a, 0.0));
    // Soft-tissue background, quantum mottle, image-intensifier vignette.
    float g = 0.16 + 0.72 * I;
    g += (hash(vUv * 512.0) - 0.5) * 0.045;
    vec2 c = (vUv - 0.5) * vec2(aspect, 1.0);
    float r = length(c);
    float field = 1.0 - smoothstep(0.46, 0.49, r);
    g *= mix(1.0, 0.78, smoothstep(0.1, 0.48, r));
    gl_FragColor = vec4(vec3(clamp(g, 0.0, 1.0) * field), 1.0);
  }
`;

export interface FluoroSource {
  object: THREE.Mesh;
  /** Linear attenuation coefficient, 1/m. */
  mu: number;
}

export class FluoroView {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(13, 1, 0.1, 3);
  private target: THREE.WebGLRenderTarget;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private displayMat: THREE.ShaderMaterial;
  private proxies: { src: THREE.Mesh; proxy: THREE.Mesh; mat: THREE.ShaderMaterial }[] = [];
  private needle: THREE.Mesh;
  private needleMat: THREE.ShaderMaterial;
  private ownGeometries: THREE.BufferGeometry[] = [];
  private canvas: HTMLCanvasElement;
  readonly supported: boolean;

  /** Creates its own canvas inside `container` (removed again in dispose). */
  constructor(container: HTMLElement) {
    const canvas = document.createElement('canvas');
    canvas.className = 'absolute inset-0 w-full h-full block';
    container.prepend(canvas);
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(1);
    const ext = this.renderer.extensions;
    this.supported = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float');
    this.target = new THREE.WebGLRenderTarget(256, 256, {
      type: this.supported ? THREE.HalfFloatType : THREE.UnsignedByteType,
      depthBuffer: false,
    });
    this.displayMat = new THREE.ShaderMaterial({
      vertexShader: displayVert,
      fragmentShader: displayFrag,
      uniforms: { tThick: { value: this.target.texture }, aspect: { value: 1 }, seed: { value: 0 }, fallback: { value: this.supported ? 0 : 1 } },
      depthTest: false,
      depthWrite: false,
    });
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.ownGeometries.push(quadGeo);
    const quad = new THREE.Mesh(quadGeo, this.displayMat);
    quad.frustumCulled = false;
    this.quadScene.add(quad);

    const needleGeo = new THREE.CylinderGeometry(0.00074, 0.00074, 1, 10, 1, false);
    needleGeo.translate(0, 0.5, 0);
    this.ownGeometries.push(needleGeo);
    this.needleMat = this.makeMat(1800);
    this.needle = new THREE.Mesh(needleGeo, this.needleMat);
    this.needle.matrixAutoUpdate = false;
    this.needle.frustumCulled = false;
    this.scene.add(this.needle);
  }

  private makeMat(mu: number): THREE.ShaderMaterial {
    const supported = this.supported;
    return new THREE.ShaderMaterial({
      vertexShader: thicknessVert,
      // Fallback (no float targets): count surface layers instead of path length.
      fragmentShader: supported ? thicknessFrag : 'uniform float mu; uniform float refDepth; void main(){ gl_FragColor = vec4(0.035 * min(mu, 200.0) / 50.0, 0.0, 0.0, 1.0); }',
      uniforms: { mu: { value: mu }, refDepth: { value: 0.6 } },
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      transparent: true,
    });
  }

  setSources(sources: FluoroSource[]): void {
    for (const p of this.proxies) {
      this.scene.remove(p.proxy);
      p.mat.dispose();
    }
    this.proxies = sources.map(({ object, mu }) => {
      const mat = this.makeMat(mu);
      const proxy = new THREE.Mesh(object.geometry, mat);
      proxy.matrixAutoUpdate = false;
      proxy.frustumCulled = false;
      this.scene.add(proxy);
      return { src: object, proxy, mat };
    });
  }

  /** Project world points to normalised [0,1] canvas coordinates (for level labels). */
  project(p: THREE.Vector3): { x: number; y: number } {
    const v = p.clone().project(this.camera);
    return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
  }

  render(view: FluoroProjection, centre: THREE.Vector3, needle: { from: THREE.Vector3; to: THREE.Vector3 } | null): void {
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    if (this.canvas.width !== w || this.canvas.height !== h) this.renderer.setSize(w, h, false);
    const tw = Math.min(512, w);
    const th = Math.max(1, Math.round((tw * h) / w));
    if (this.target.width !== tw || this.target.height !== th) this.target.setSize(tw, th);

    // C-arm: source–patient distance ~0.6 m. AP = posterior→anterior; oblique = 35° about the long axis.
    const dist = 0.6;
    const dir = new THREE.Vector3();
    if (view === 'LAT') dir.set(1, 0, 0);
    else if (view === 'OBL') dir.set(Math.sin(THREE.MathUtils.degToRad(35)), 0, -Math.cos(THREE.MathUtils.degToRad(35)));
    else dir.set(0, 0, -1);
    this.camera.aspect = w / h;
    this.camera.position.copy(centre).addScaledVector(dir, dist);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(centre);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();

    for (const p of this.proxies) {
      p.src.updateWorldMatrix(true, false);
      p.proxy.matrix.copy(p.src.matrixWorld);
      p.proxy.matrixWorld.copy(p.src.matrixWorld);
      p.proxy.visible = p.src.visible;
      p.mat.uniforms.refDepth.value = dist;
    }
    this.needleMat.uniforms.refDepth.value = dist;
    if (needle) {
      const axis = needle.to.clone().sub(needle.from);
      const len = Math.max(1e-5, axis.length());
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
      this.needle.matrix.compose(needle.from, q, new THREE.Vector3(1, len, 1));
      this.needle.matrixWorld.copy(this.needle.matrix);
      this.needle.visible = true;
    } else this.needle.visible = false;

    const r = this.renderer;
    r.setRenderTarget(this.target);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(this.scene, this.camera);
    r.setRenderTarget(null);
    this.displayMat.uniforms.aspect.value = w / h;
    this.displayMat.uniforms.seed.value = Math.random() * 10;
    r.render(this.quadScene, this.quadCam);
  }

  dispose(): void {
    for (const p of this.proxies) p.mat.dispose();
    this.needleMat.dispose();
    this.displayMat.dispose();
    for (const g of this.ownGeometries) g.dispose();
    this.target.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
