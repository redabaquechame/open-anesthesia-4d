import * as THREE from 'three';

/**
 * Device-tiered WebGL2 renderer.
 * Picks a budget (pixel ratio, particle count, antialias) from cheap device signals so
 * budget Android phones stay smooth, and handles mobile WebGL context loss/restore.
 */

export type DeviceTier = 'HIGH' | 'MID' | 'LOW';

export interface RenderBudget {
  tier: DeviceTier;
  backend: 'webgl2';
  maxPixelRatio: number;
  maxGasParticles: number;
  antialias: boolean;
  gpuName: string;
}

export interface TieredRendererHandle {
  renderer: THREE.WebGLRenderer;
  budget: RenderBudget;
  dispose(): void;
}

function readGpuName(): string {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') as WebGL2RenderingContext | null;
    if (!gl) return 'unknown';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return 'unknown';
  }
}

function pickTier(gpuName: string): DeviceTier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memGb = nav.deviceMemory ?? 4;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(nav.userAgent);
  const weakGpu = /Mali-4|Mali-T|Adreno \(TM\) [3-5]\d\d|PowerVR|SwiftShader|llvmpipe/i.test(gpuName);

  if (weakGpu || memGb <= 2 || cores <= 2) return 'LOW';
  if (mobile || memGb <= 4 || cores <= 4) return 'MID';
  return 'HIGH';
}

const BUDGETS: Record<DeviceTier, Omit<RenderBudget, 'tier' | 'backend' | 'gpuName'>> = {
  HIGH: { maxPixelRatio: 2, maxGasParticles: 900, antialias: true },
  MID: { maxPixelRatio: 1.5, maxGasParticles: 480, antialias: true },
  LOW: { maxPixelRatio: 1, maxGasParticles: 220, antialias: false },
};

export async function createTieredRenderer(
  canvas: HTMLCanvasElement,
  onContextRestored?: () => void
): Promise<TieredRendererHandle> {
  const gpuName = readGpuName();
  const tier = pickTier(gpuName);
  const budget: RenderBudget = { tier, backend: 'webgl2', gpuName, ...BUDGETS[tier] };

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: budget.antialias,
    alpha: false,
    powerPreference: tier === 'LOW' ? 'low-power' : 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, budget.maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const onLost = (e: Event) => e.preventDefault();
  const onRestored = () => onContextRestored?.();
  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);

  return {
    renderer,
    budget,
    dispose() {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      renderer.dispose();
    },
  };
}

/**
 * Single-pass "glass": plain alpha blending, no transmission pass, so it costs one draw on
 * low-end GPUs. Higher tiers get a little clearcoat sheen through MeshPhysicalMaterial.
 */
export function createGlassChassisMaterial(budget: RenderBudget, opacity: number): THREE.Material {
  const common = {
    color: 0x9fd8ff,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    roughness: 0.12,
    metalness: 0,
  } as const;
  if (budget.tier === 'LOW') return new THREE.MeshStandardMaterial(common);
  return new THREE.MeshPhysicalMaterial({ ...common, clearcoat: 0.6, clearcoatRoughness: 0.2 });
}

/** Dispose every geometry, material and texture under a scene graph. */
export function disposeSceneResources(root: THREE.Object3D): void {
  const seen = new Set<object>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry && !seen.has(mesh.geometry)) {
      seen.add(mesh.geometry);
      // Anatomy geometry is shared with the loader cache (see loadAnatomy.ts); keep it for the next visit.
      if (!mesh.geometry.userData?.sharedAnatomy) mesh.geometry.dispose();
    }
    const mat = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
    const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
    for (const m of mats) {
      if (seen.has(m)) continue;
      seen.add(m);
      for (const value of Object.values(m)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      m.dispose();
    }
  });
}
