import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface CameraView {
  position: [number, number, number];
  target: [number, number, number];
}

export interface CameraRig {
  /** Fly to a named preset or an explicit view. */
  flyTo(view: string | CameraView, durationMs?: number): void;
  /** Frame an object: keep the viewing direction, move so it fills the view. */
  focusOn(obj: THREE.Object3D, durationMs?: number): void;
  reset(): void;
  presets(): string[];
  update(dt: number): void;
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createCameraRig(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls | null,
  presets: Record<string, CameraView>,
  home: CameraView
): CameraRig {
  let anim: {
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;
    toTarget: THREE.Vector3;
    t: number;
    dur: number;
  } | null = null;

  const target = () => (controls ? controls.target : new THREE.Vector3());

  const start = (toPos: THREE.Vector3, toTarget: THREE.Vector3, durationMs: number) => {
    anim = { fromPos: camera.position.clone(), fromTarget: target().clone(), toPos, toTarget, t: 0, dur: Math.max(1, durationMs) / 1000 };
  };

  const toVec = (v: [number, number, number]) => new THREE.Vector3(...v);

  return {
    flyTo(view, durationMs = 900) {
      const v = typeof view === 'string' ? presets[view] : view;
      if (!v) return;
      start(toVec(v.position), toVec(v.target), durationMs);
    },
    focusOn(obj, durationMs = 900) {
      const box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const center = box.getCenter(new THREE.Vector3());
      const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
      const dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.15;
      const dir = camera.position.clone().sub(target()).normalize();
      start(center.clone().addScaledVector(dir, dist), center, durationMs);
    },
    reset() {
      start(toVec(home.position), toVec(home.target), 900);
    },
    presets: () => Object.keys(presets),
    update(dt) {
      if (!anim) return;
      anim.t = Math.min(1, anim.t + dt / anim.dur);
      const k = easeInOutCubic(anim.t);
      camera.position.lerpVectors(anim.fromPos, anim.toPos, k);
      const tgt = new THREE.Vector3().lerpVectors(anim.fromTarget, anim.toTarget, k);
      if (controls) controls.target.copy(tgt);
      camera.lookAt(tgt);
      if (anim.t >= 1) anim = null;
    },
  };
}
