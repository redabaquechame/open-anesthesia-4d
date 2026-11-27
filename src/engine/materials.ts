import * as THREE from 'three';
import type { DeviceTier } from './createTieredRenderer';

/**
 * Shared physically based palette. Colours follow common anatomical illustration
 * conventions (artery red, vein blue, nerve yellow); they are teaching colours, not
 * measured tissue optics. HIGH/MID get MeshPhysicalMaterial (clearcoat for wet tissue,
 * sheen for nerve sheaths, transmission for glass); LOW falls back to MeshStandardMaterial.
 */
export type MaterialKey =
  | 'bone'
  | 'cartilage'
  | 'disc'
  | 'ligament'
  | 'dura'
  | 'csf'
  | 'fat'
  | 'muscle'
  | 'skin'
  | 'artery'
  | 'vein'
  | 'nerve'
  | 'pleura'
  | 'lung'
  | 'mucosa'
  | 'heart'
  | 'steel'
  | 'plastic'
  | 'plasticDark'
  | 'glass'
  | 'cuff'
  | 'localAnaesthetic';

type Spec = THREE.MeshPhysicalMaterialParameters;

const SPECS: Record<MaterialKey, Spec> = {
  bone: { color: 0xe9dfc8, roughness: 0.62, clearcoat: 0.08, sheen: 0.25, sheenColor: 0xfff4e0 },
  cartilage: { color: 0xc8d8dc, roughness: 0.35, clearcoat: 0.4 },
  disc: { color: 0xb9c9d6, roughness: 0.4, clearcoat: 0.35 },
  ligament: { color: 0xd8c98f, roughness: 0.45, sheen: 0.6, sheenColor: 0xfff1b8 },
  dura: { color: 0xcfd9e0, roughness: 0.3, clearcoat: 0.6, transparent: true, opacity: 0.6, depthWrite: false },
  csf: { color: 0x9ad7f5, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false },
  fat: { color: 0xeccb7a, roughness: 0.5, clearcoat: 0.3, transparent: true, opacity: 0.55, depthWrite: false },
  muscle: { color: 0xa2453b, roughness: 0.55, sheen: 0.4, sheenColor: 0xff9e8a },
  skin: { color: 0xe3b196, roughness: 0.55, sheen: 0.5, sheenColor: 0xffd9c4, transparent: true, opacity: 0.16, depthWrite: false },
  artery: { color: 0xc4282b, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.25 },
  vein: { color: 0x2c4f9e, roughness: 0.32, clearcoat: 0.55, clearcoatRoughness: 0.3 },
  nerve: { color: 0xf1d35c, roughness: 0.42, sheen: 0.9, sheenColor: 0xfff6c8, emissive: 0x3b2c00, emissiveIntensity: 0.4 },
  pleura: { color: 0xf3a5c2, roughness: 0.2, clearcoat: 0.9, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide },
  lung: { color: 0xe7a1a8, roughness: 0.7, transparent: true, opacity: 0.35, depthWrite: false },
  mucosa: { color: 0xd36f6c, roughness: 0.32, clearcoat: 1.0, clearcoatRoughness: 0.18, side: THREE.DoubleSide },
  heart: { color: 0xa83232, roughness: 0.4, clearcoat: 0.6 },
  steel: { color: 0xdfe4ea, metalness: 1, roughness: 0.16 },
  plastic: { color: 0xe2e8f0, roughness: 0.38, clearcoat: 0.3 },
  plasticDark: { color: 0x1e293b, roughness: 0.45, clearcoat: 0.2 },
  glass: { color: 0xdff3ff, roughness: 0.04, transmission: 0.92, thickness: 0.15, ior: 1.5, transparent: true, opacity: 1 },
  cuff: { color: 0x7cc4ff, roughness: 0.15, transmission: 0.6, thickness: 0.1, transparent: true, opacity: 0.85 },
  localAnaesthetic: { color: 0x22d3ee, roughness: 0.1, emissive: 0x0e7490, emissiveIntensity: 0.6, transparent: true, opacity: 0.5, depthWrite: false },
};

const PHYSICAL_ONLY: (keyof Spec)[] = ['clearcoat', 'clearcoatRoughness', 'sheen', 'sheenColor', 'transmission', 'thickness', 'ior'];

export interface MaterialLibrary {
  get(key: MaterialKey): THREE.MeshStandardMaterial;
  /** A private copy you may tint or animate (e.g. highlight on hover). */
  clone(key: MaterialKey): THREE.MeshStandardMaterial;
  dispose(): void;
}

export function createMaterialLibrary(tier: DeviceTier): MaterialLibrary {
  const cache = new Map<MaterialKey, THREE.MeshStandardMaterial>();
  const owned: THREE.Material[] = [];

  const build = (key: MaterialKey): THREE.MeshStandardMaterial => {
    const spec = { ...SPECS[key] };
    if (tier === 'LOW') {
      const lowSpec: Record<string, unknown> = { ...spec };
      for (const k of PHYSICAL_ONLY) delete lowSpec[k];
      // Glass without transmission: plain alpha.
      if (key === 'glass' || key === 'cuff') Object.assign(lowSpec, { transparent: true, opacity: 0.3, depthWrite: false });
      return new THREE.MeshStandardMaterial(lowSpec as THREE.MeshStandardMaterialParameters);
    }
    if (tier === 'MID' && spec.transmission) {
      // Transmission needs an extra render pass; MID uses alpha instead.
      delete spec.transmission;
      delete spec.thickness;
      Object.assign(spec, { opacity: 0.35, depthWrite: false });
    }
    return new THREE.MeshPhysicalMaterial(spec);
  };

  return {
    get(key) {
      let m = cache.get(key);
      if (!m) {
        m = build(key);
        cache.set(key, m);
        owned.push(m);
      }
      return m;
    },
    clone(key) {
      const m = build(key);
      owned.push(m);
      return m;
    },
    dispose() {
      for (const m of owned) m.dispose();
      owned.length = 0;
      cache.clear();
    },
  };
}
