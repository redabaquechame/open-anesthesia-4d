/** Node-side loader: every mesh node of a meshopt GLB as world-space positions (metres) + index. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

export interface GlbPart {
  name: string;
  positions: Float64Array;
  index: ArrayLike<number> | null;
}

export async function loadGlbParts(file: string): Promise<GlbPart[]> {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(file);
  const parts: GlbPart[] = [];
  for (const node of doc.getRoot().listNodes()) {
    const prim = node.getMesh()?.listPrimitives()[0];
    if (!prim) continue;
    const acc = prim.getAttribute('POSITION')!;
    const m = node.getWorldMatrix();
    const n = acc.getCount();
    const pos = new Float64Array(n * 3);
    const el: number[] = [];
    for (let i = 0; i < n; i++) {
      acc.getElement(i, el);
      pos[i * 3] = m[0] * el[0] + m[4] * el[1] + m[8] * el[2] + m[12];
      pos[i * 3 + 1] = m[1] * el[0] + m[5] * el[1] + m[9] * el[2] + m[13];
      pos[i * 3 + 2] = m[2] * el[0] + m[6] * el[1] + m[10] * el[2] + m[14];
    }
    parts.push({ name: node.getName(), positions: pos, index: prim.getIndices()?.getArray() ?? null });
  }
  return parts;
}
