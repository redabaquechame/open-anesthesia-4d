import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { DeviceTier } from './createTieredRenderer';

export interface BloomOptions {
  strength: number;
  radius: number;
  threshold: number;
}

export interface PostFx {
  render(dt: number): void;
  setSize(w: number, h: number): void;
  /** Drop the most expensive effect still running. Returns false when nothing is left to drop. */
  degrade(): boolean;
  dispose(): void;
}

/**
 * Tiered post-processing.
 * HIGH: MSAA ×4 → ambient occlusion (GTAO) → soft bloom → tone-map/output.
 * MID:  MSAA ×4 → soft bloom → output.
 * LOW:  no composer; the renderer draws straight to the canvas.
 */
export function createPostFx(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  tier: DeviceTier,
  bloom: BloomOptions | null
): PostFx {
  if (tier === 'LOW') {
    return {
      render: () => renderer.render(scene, camera),
      setSize: () => {},
      degrade: () => false,
      dispose: () => {},
    };
  }

  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { samples: 4, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));

  let gtao: GTAOPass | null = null;
  if (tier === 'HIGH') {
    gtao = new GTAOPass(scene, camera, size.x, size.y);
    gtao.blendIntensity = 0.85;
    composer.addPass(gtao);
  }

  let bloomPass: UnrealBloomPass | null = null;
  if (bloom) {
    bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), bloom.strength, bloom.radius, bloom.threshold);
    composer.addPass(bloomPass);
  }
  composer.addPass(new OutputPass());

  return {
    render: (dt) => composer.render(dt),
    setSize: (w, h) => composer.setSize(w, h),
    degrade() {
      if (gtao?.enabled) {
        gtao.enabled = false;
        return true;
      }
      if (bloomPass?.enabled) {
        bloomPass.enabled = false;
        return true;
      }
      return false;
    },
    dispose() {
      for (const p of composer.passes) (p as { dispose?: () => void }).dispose?.();
      composer.dispose();
      target.dispose();
    },
  };
}
