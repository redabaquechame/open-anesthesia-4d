import * as THREE from 'three';

/**
 * Fresnel "X-ray" rim for see-through shells (Sprint 2A, adapted from Gemini's fresnelXraySystem.ts).
 *
 * Gemini's version was a separate unlit ShaderMaterial. Here the same idea is injected into the
 * existing lit material (MeshStandard / MeshPhysical) with onBeforeCompile, so the shell keeps its
 * image-based lighting, shadows, tone mapping, fog and clipping planes on every tier, and nothing
 * has to be swapped when the quality tier changes.
 *
 * Effect: where the surface faces the camera its own opacity is kept (the inside shows through);
 * towards the silhouette the opacity rises to `rimAlpha`, so the outline stays readable even when
 * the shell is almost fully cleared. `strength` 0 leaves the material exactly as it was.
 * This is a drawing aid only: it carries no clinical information.
 */
export interface FresnelRimOptions {
  /** Falloff exponent: higher = thinner rim (2–4). */
  power?: number;
  /** Opacity reached at the silhouette. */
  rimAlpha?: number;
  /** 0 = no effect, 1 = full rim. */
  strength?: number;
  /** Colour the rim leans toward (a light tint, not a glow). */
  rimColor?: THREE.ColorRepresentation;
}

export interface FresnelRimHandle {
  setStrength(v: number): void;
  setRimAlpha(v: number): void;
}

export function applyFresnelRim(mat: THREE.MeshStandardMaterial, opts: FresnelRimOptions = {}): FresnelRimHandle {
  const uniforms = {
    uOaRimPower: { value: opts.power ?? 2.6 },
    uOaRimAlpha: { value: THREE.MathUtils.clamp(opts.rimAlpha ?? 0.6, 0, 1) },
    uOaRimStrength: { value: THREE.MathUtils.clamp(opts.strength ?? 1, 0, 1) },
    uOaRimColor: { value: new THREE.Color(opts.rimColor ?? 0xdbeafe) },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uOaRimPower;\nuniform float uOaRimAlpha;\nuniform float uOaRimStrength;\nuniform vec3 uOaRimColor;'
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          float oaF = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), uOaRimPower) * uOaRimStrength;
          outgoingLight = mix(outgoingLight, uOaRimColor * max(0.35, length(outgoingLight)), oaF * 0.3);
          diffuseColor.a = mix(diffuseColor.a, max(diffuseColor.a, uOaRimAlpha), oaF);
        }
        #include <opaque_fragment>`
      );
  };
  mat.customProgramCacheKey = () => 'oa-fresnel-rim';
  mat.needsUpdate = true;
  return {
    setStrength: (v) => {
      uniforms.uOaRimStrength.value = THREE.MathUtils.clamp(Number.isFinite(v) ? v : 0, 0, 1);
    },
    setRimAlpha: (v) => {
      uniforms.uOaRimAlpha.value = THREE.MathUtils.clamp(Number.isFinite(v) ? v : 0, 0, 1);
    },
  };
}
