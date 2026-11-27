import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createTieredRenderer, disposeSceneResources, type DeviceTier, type RenderBudget } from './createTieredRenderer';
import { createPostFx, type BloomOptions, type PostFx } from './postFx';
import { createCameraRig, type CameraRig, type CameraView } from './cameraRig';
import { createMaterialLibrary, type MaterialLibrary } from './materials';
import { getQualityMode, onQualityModeChange, resolveTier, type QualityMode } from './quality';

export interface StageOptions {
  container: HTMLElement;
  background?: THREE.ColorRepresentation;
  fov?: number;
  near?: number;
  far?: number;
  home: CameraView;
  presets?: Record<string, CameraView>;
  controls?: { minDistance?: number; maxDistance?: number; enablePan?: boolean; maxPolarAngle?: number } | false;
  /** Soft-bloom settings (HIGH/MID only). null disables bloom. */
  bloom?: BloomOptions | null;
  /** Shadow-casting key light on HIGH/MID. */
  shadows?: boolean;
  /** Image-based light intensity (RoomEnvironment). */
  envIntensity?: number;
  /** Show HTML labels (CSS2DRenderer). */
  labels?: boolean;
}

export interface FrameInfo {
  dt: number;
  time: number;
}

export interface Stage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls | null;
  budget: RenderBudget;
  /** Effective tier after the user's quality choice. */
  tier: DeviceTier;
  materials: MaterialLibrary;
  rig: CameraRig;
  keyLight: THREE.DirectionalLight;
  /** Register a per-frame callback; returns an unsubscribe function. */
  onFrame(fn: (f: FrameInfo) => void): () => void;
  setLabelsVisible(v: boolean): void;
  /** Smoothed frames per second (for the debug overlay). */
  fps(): number;
  /** Width/height of the drawing area in CSS pixels. */
  size(): { w: number; h: number };
  dispose(): void;
}

/**
 * One helper for every 3D module: canvas, tiered renderer, image-based lighting, post-processing,
 * labels, orbit controls, camera rig, resize, off-screen pause and adaptive quality.
 * Call it inside a React effect and call stage.dispose() in the cleanup.
 */
export async function createStage(opts: StageOptions): Promise<Stage> {
  const { container } = opts;
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  const canvas = document.createElement('canvas');
  canvas.className = 'block w-full h-full outline-none';
  canvas.style.touchAction = 'none';
  container.appendChild(canvas);

  let restoreHandler: (() => void) | null = null;
  const handle = await createTieredRenderer(canvas, () => restoreHandler?.());
  const { renderer, budget } = handle;
  let mode: QualityMode = getQualityMode();
  let tier = resolveTier(mode, budget.tier);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(opts.background ?? '#060a12');
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 40, 16 / 10, opts.near ?? 0.05, opts.far ?? 200);
  camera.position.set(...opts.home.position);
  camera.lookAt(new THREE.Vector3(...opts.home.target));

  // ── Lighting: studio IBL + key + rim ─────────────────────────────────────
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTex = pmrem.fromScene(room, 0.04).texture;
  room.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    (m.material as THREE.Material | undefined)?.dispose();
  });
  pmrem.dispose();
  scene.environment = envTex;
  scene.environmentIntensity = opts.envIntensity ?? 0.55;

  const keyLight = new THREE.DirectionalLight(0xfff5e8, 1.6);
  keyLight.position.set(4, 7, 5);
  scene.add(keyLight);
  const rim = new THREE.DirectionalLight(0x9cc9ff, 0.9);
  rim.position.set(-5, 3, -6);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0b1220, 0.35));

  const applyShadows = () => {
    const on = !!opts.shadows && tier !== 'LOW';
    renderer.shadowMap.enabled = on;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    keyLight.castShadow = on;
    keyLight.shadow.mapSize.set(tier === 'HIGH' ? 2048 : 1024, tier === 'HIGH' ? 2048 : 1024);
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;
  };
  applyShadows();

  // ── Controls, rig, labels ────────────────────────────────────────────────
  let controls: OrbitControls | null = null;
  if (opts.controls !== false) {
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(...opts.home.target);
    const c = opts.controls ?? {};
    if (c.minDistance !== undefined) controls.minDistance = c.minDistance;
    if (c.maxDistance !== undefined) controls.maxDistance = c.maxDistance;
    if (c.enablePan !== undefined) controls.enablePan = c.enablePan;
    if (c.maxPolarAngle !== undefined) controls.maxPolarAngle = c.maxPolarAngle;
    controls.update();
  }
  const rig = createCameraRig(camera, controls, opts.presets ?? {}, opts.home);

  let labelRenderer: CSS2DRenderer | null = null;
  if (opts.labels !== false) {
    labelRenderer = new CSS2DRenderer();
    const el = labelRenderer.domElement;
    el.style.position = 'absolute';
    el.style.inset = '0';
    el.style.pointerEvents = 'none';
    container.appendChild(el);
  }

  const materials = createMaterialLibrary(tier);

  // ── Post-processing ──────────────────────────────────────────────────────
  const bloom = opts.bloom === undefined ? { strength: 0.35, radius: 0.55, threshold: 0.82 } : opts.bloom;
  let postFx: PostFx = createPostFx(renderer, scene, camera, tier, tier === 'LOW' ? null : bloom);
  let pixelRatio = Math.min(window.devicePixelRatio || 1, budget.maxPixelRatio);
  const tierPixelCap: Record<DeviceTier, number> = { HIGH: 2, MID: 1.5, LOW: 1 };

  let w = 1;
  let h = 1;
  const resize = () => {
    w = Math.max(1, container.clientWidth);
    h = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const buf = renderer.getDrawingBufferSize(new THREE.Vector2());
    postFx.setSize(buf.x, buf.y);
    labelRenderer?.setSize(w, h);
  };

  const rebuildForTier = () => {
    postFx.dispose();
    pixelRatio = Math.min(window.devicePixelRatio || 1, tierPixelCap[tier]);
    postFx = createPostFx(renderer, scene, camera, tier, tier === 'LOW' ? null : bloom);
    applyShadows();
    resize();
  };

  const unsubQuality = onQualityModeChange((m) => {
    mode = m;
    tier = resolveTier(mode, budget.tier);
    rebuildForTier();
  });

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ── Loop with off-screen pause and adaptive quality ──────────────────────
  const frameFns = new Set<(f: FrameInfo) => void>();
  const clock = new THREE.Clock();
  let rafId = 0;
  let onScreen = true;
  let pageVisible = !document.hidden;
  let running = false;
  let smoothedFps = 60;
  let slowWindows = 0;
  let windowTime = 0;
  let windowFrames = 0;
  let disposed = false;

  const adapt = (dt: number) => {
    windowTime += dt;
    windowFrames++;
    if (windowTime < 2) return;
    const fps = windowFrames / windowTime;
    smoothedFps = fps;
    windowTime = 0;
    windowFrames = 0;
    if (mode !== 'auto') return;
    slowWindows = fps < 40 ? slowWindows + 1 : 0;
    if (slowWindows < 2) return;
    slowWindows = 0;
    // Step down: effects first, then resolution.
    if (postFx.degrade()) return;
    if (pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      resize();
    }
  };

  const loop = () => {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    rig.update(dt);
    controls?.update();
    for (const fn of frameFns) fn({ dt, time });
    postFx.render(dt);
    labelRenderer?.render(scene, camera);
    adapt(dt);
  };

  const updateRunning = () => {
    const shouldRun = !disposed && onScreen && pageVisible;
    if (shouldRun && !running) {
      running = true;
      clock.getDelta();
      rafId = requestAnimationFrame(loop);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(rafId);
    }
  };

  const io = new IntersectionObserver((entries) => {
    onScreen = entries.some((e) => e.isIntersecting);
    updateRunning();
  });
  io.observe(container);
  const onVis = () => {
    pageVisible = !document.hidden;
    updateRunning();
  };
  document.addEventListener('visibilitychange', onVis);
  restoreHandler = () => rebuildForTier();
  updateRunning();

  return {
    scene,
    camera,
    renderer,
    controls,
    budget,
    get tier() {
      return tier;
    },
    materials,
    rig,
    keyLight,
    onFrame(fn) {
      frameFns.add(fn);
      return () => frameFns.delete(fn);
    },
    setLabelsVisible(v) {
      if (labelRenderer) labelRenderer.domElement.style.display = v ? '' : 'none';
    },
    fps: () => smoothedFps,
    size: () => ({ w, h }),
    dispose() {
      disposed = true;
      running = false;
      cancelAnimationFrame(rafId);
      unsubQuality();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      frameFns.clear();
      controls?.dispose();
      postFx.dispose();
      disposeSceneResources(scene);
      materials.dispose();
      envTex.dispose();
      labelRenderer?.domElement.remove();
      handle.dispose();
      canvas.remove();
    },
  } satisfies Stage;
}
