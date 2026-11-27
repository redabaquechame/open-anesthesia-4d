import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * Loads the meshopt-compressed anatomy models in public/models/anatomy/.
 * Each model is fetched once per session (the service worker also caches it for offline use);
 * every caller gets its own clone so modules can recolour and dispose freely.
 *
 * Model data: BodyParts3D, © The Database Center for Life Science, licensed under
 * CC Attribution 4.0 International (see public/models/anatomy/LICENSE.md).
 */
const cache = new Map<string, Promise<GLTF>>();
let loader: GLTFLoader | null = null;

function getLoader(): GLTFLoader {
  if (!loader) {
    loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}

export function anatomyUrl(file: string): string {
  return `${import.meta.env.BASE_URL}models/anatomy/${file}`;
}

/** Returns a fresh clone of the model's scene. Geometries are shared with the cache; materials are not. */
export async function loadAnatomy(file: string): Promise<THREE.Group> {
  const url = anatomyUrl(file);
  let p = cache.get(url);
  if (!p) {
    p = getLoader().loadAsync(url);
    cache.set(url, p);
    p.catch(() => cache.delete(url));
  }
  const gltf = await p;
  const root = gltf.scene.clone(true);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.material = (mesh.material as THREE.Material).clone();
      // Mark cached geometry so module dispose leaves it for the next visit.
      mesh.geometry.userData.sharedAnatomy = true;
    }
  });
  return root as THREE.Group;
}

export const ANATOMY_CREDIT = 'Anatomy: BodyParts3D, © The Database Center for Life Science (CC BY-SA 2.1 JP / CC BY 4.0)';
