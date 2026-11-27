/**
 * Builds the meshopt-compressed anatomy GLBs in public/models/anatomy/ from the BodyParts3D
 * PART-OF OBJ archive (partof_BP3D_4.0_obj_99.zip, https://dbarchive.biosciencedbc.jp/en/bodyparts3d/).
 *
 * Usage: npm run anatomy:build -- <folder with FJxxxx.obj files>
 *
 * - Units: BodyParts3D is in millimetres, Z up. Output is in metres, Y up (x, y, z) → (x, z, −y),
 *   re-centred on a per-model anchor so modules can place it easily.
 * - Each OBJ becomes one named node (key from SETS below) with extras { fileId, fma, name }.
 * - Licence: see public/models/anatomy/LICENSE.md (written by this script).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Document, NodeIO, type Node as GNode } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { weld, reorder, quantize, dedup, prune } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

type Part = { key: string; file: string };
type ModelSet = { out: string; title: string; anchorKey: string; parts: Part[] };

const SETS: ModelSet[] = [
  {
    out: 'supraclavicular_right.glb',
    title: 'Right supraclavicular region',
    anchorKey: 'firstRib',
    parts: [
      { key: 'clavicle', file: 'FJ3362' },
      { key: 'firstRib', file: 'FJ3334' },
      { key: 'subclavianVein', file: 'FJ3587' },
      { key: 'internalJugularVein', file: 'FJ3585' },
    ],
  },
  {
    out: 'airway.glb',
    title: 'Tracheobronchial tree and great vessels',
    anchorKey: 'trachea',
    parts: [
      { key: 'trachea', file: 'FJ2541' },
      { key: 'rightMainBronchus', file: 'FJ2539' },
      { key: 'leftMainBronchus', file: 'FJ2450' },
    ],
  },
];

/** Extra parts found by English name in the OBJ headers (exact, case-insensitive). */
const BY_NAME: Record<string, { set: string; names: Record<string, string> }> = {
  supra: {
    set: 'supraclavicular_right.glb',
    names: {
      subclavianArtery: 'right subclavian artery',
      secondRib: 'right second rib',
      t1: 'first thoracic vertebra',
      c7: 'seventh cervical vertebra',
      commonCarotid: 'right common carotid artery',
      brachiocephalicArtery: 'brachiocephalic artery',
      anteriorScalene: 'right scalenus anterior',
      middleScalene: 'right scalenus medius',
    },
  },
  // Segmental bronchial trees, keyed <lobe>_<segment> (lobe from standard bronchopulmonary nomenclature),
  // plus the vessels and oesophagus that surround the carina (context only).
  airway: {
    set: 'airway.glb',
    names: {
      RUL_apical: 'right apical segmental bronchial tree',
      RUL_posterior: 'right posterior segmental bronchial tree',
      RUL_anterior: 'right anterior segmental bronchial tree',
      RML_lateral: 'lateral segmental bronchial tree',
      RML_medial: 'medial segmental bronchial tree',
      RLL_superior: 'right superior segmental bronchial tree',
      RLL_medialBasal: 'right medial basal segmental bronchial tree',
      RLL_anteriorBasal: 'right anterior basal segmental bronchial tree',
      RLL_lateralBasal: 'right lateral basal segmental bronchial tree',
      RLL_posteriorBasal: 'right posterior basal segmental bronchial tree',
      LUL_apical: 'left apical segmental bronchial tree',
      LUL_posterior: 'left posterior segmental bronchial tree',
      LUL_anterior: 'left anterior segmental bronchial tree',
      LUL_superiorLingular: 'superior lingular bronchial tree',
      LUL_inferiorLingular: 'inferior lingular bronchial tree',
      LLL_superior: 'left superior segmental bronchial tree',
      LLL_anteriorBasal: 'left anterior basal segmental bronchial tree',
      LLL_medialBasal: 'left medial basal segmental bronchial tree',
      LLL_lateralBasal: 'left lateral basal segmental bronchial tree',
      LLL_posteriorBasal: 'left posterior basal segmental bronchial tree',
      ctx_aorticArch: 'arch of aorta',
      ctx_ascendingAorta: 'ascending aorta',
      ctx_descendingAorta: 'descending thoracic aorta',
      ctx_pulmonaryTrunk: 'pulmonary trunk',
      ctx_rightPA: 'right pulmonary artery',
      ctx_leftPA: 'left pulmonary artery',
      ctx_oesophagus: 'esophagus',
    },
  },
  spine: {
    set: 'spine.glb',
    names: {
      t4: 'fourth thoracic vertebra',
      t5: 'fifth thoracic vertebra',
      t6: 'sixth thoracic vertebra',
      t7: 'seventh thoracic vertebra',
      t8: 'eighth thoracic vertebra',
      t9: 'ninth thoracic vertebra',
      l2: 'second lumbar vertebra',
      l3: 'third lumbar vertebra',
      l4: 'fourth lumbar vertebra',
      l5: 'fifth lumbar vertebra',
      sacrum: 'sacrum',
      discT4: 'intervertebral disk of fourth thoracic vertebra',
      discT5: 'intervertebral disk of fifth thoracic vertebra',
      discT6: 'intervertebral disk of sixth thoracic vertebra',
      discT7: 'intervertebral disk of seventh thoracic vertebra',
      discT8: 'intervertebral disk of eighth thoracic vertebra',
      discL2: 'intervertebral disk of second lumbar vertebra',
      discL3: 'intervertebral disk of third lumbar vertebra',
      discL4: 'intervertebral disk of fourth lumbar vertebra',
      spinalCord: 'spinal cord',
    },
  },
};

interface Obj {
  fileId: string;
  name: string;
  fma: string;
  positions: number[];
  normals: number[];
  indices: number[];
}

function parseObj(path: string, fileId: string): Obj {
  const text = readFileSync(path, 'utf8');
  const v: number[] = [];
  const vn: number[] = [];
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const map = new Map<string, number>();
  let name = fileId;
  let fma = '';
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('# English name :')) name = line.slice(16).trim();
    else if (line.startsWith('# Concept ID :')) fma = line.slice(14).trim();
    else if (line.startsWith('v ')) {
      const [, x, y, z] = line.trim().split(/\s+/).map(Number);
      // mm, Z-up → m, Y-up
      v.push(x * 0.001, z * 0.001, -y * 0.001);
    } else if (line.startsWith('vn ')) {
      const [, x, y, z] = line.trim().split(/\s+/).map(Number);
      vn.push(x, z, -y);
    } else if (line.startsWith('f ')) {
      const refs = line.trim().split(/\s+/).slice(1);
      const idx = refs.map((r) => {
        let i = map.get(r);
        if (i === undefined) {
          const [pi, , ni] = r.split('/');
          const p = (Number(pi) - 1) * 3;
          positions.push(v[p], v[p + 1], v[p + 2]);
          const n = ni ? (Number(ni) - 1) * 3 : p;
          normals.push(vn[n] ?? 0, vn[n + 1] ?? 1, vn[n + 2] ?? 0);
          i = positions.length / 3 - 1;
          map.set(r, i);
        }
        return i;
      });
      for (let k = 1; k + 1 < idx.length; k++) indices.push(idx[0], idx[k], idx[k + 1]);
    }
  }
  return { fileId, name, fma, positions, normals, indices };
}

function center(o: Obj): [number, number, number] {
  let x = 0, y = 0, z = 0;
  const n = o.positions.length / 3;
  for (let i = 0; i < n; i++) {
    x += o.positions[i * 3];
    y += o.positions[i * 3 + 1];
    z += o.positions[i * 3 + 2];
  }
  return [x / n, y / n, z / n];
}

async function main() {
  const src = process.argv[2];
  if (!src) throw new Error('Pass the folder containing FJxxxx.obj files');
  // Run from the project root (npm run anatomy:build).
  const outDir = pathToFileURL(resolve(process.cwd(), 'public/models/anatomy') + '/');
  mkdirSync(outDir, { recursive: true });

  // Index headers once (English name → file ids).
  const byName = new Map<string, string[]>();
  for (const f of readdirSync(src)) {
    if (!f.endsWith('.obj')) continue;
    const head = readFileSync(join(src, f), 'utf8').slice(0, 1200);
    const m = head.match(/# English name : (.+)/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), f.replace('.obj', '')]);
  }

  // Merge name-based parts into the sets.
  for (const group of Object.values(BY_NAME)) {
    let set = SETS.find((s) => s.out === group.set);
    if (!set) {
      set = { out: group.set, title: 'Thoracic and lumbar spine', anchorKey: 'l3', parts: [] };
      SETS.push(set);
    }
    for (const [key, name] of Object.entries(group.names)) {
      const ids = byName.get(name.toLowerCase());
      if (!ids) {
        console.warn(`  (not in archive) ${name}`);
        continue;
      }
      ids.forEach((id, i) => set!.parts.push({ key: ids.length > 1 ? `${key}_${i}` : key, file: id }));
    }
  }

  await MeshoptEncoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const manifest: Record<string, { title: string; parts: Record<string, { fileId: string; fma: string; name: string }> }> = {};

  for (const set of SETS) {
    const objs = set.parts.map((p) => ({ key: p.key, obj: parseObj(join(src, `${p.file}.obj`), p.file) }));
    const anchor = objs.find((o) => o.key === set.anchorKey)?.obj;
    const [ax, ay, az] = anchor ? center(anchor) : [0, 0, 0];

    const doc = new Document();
    const buffer = doc.createBuffer();
    const scene = doc.createScene(set.title);
    const parts: (typeof manifest)[string]['parts'] = {};
    for (const { key, obj } of objs) {
      for (let i = 0; i < obj.positions.length; i += 3) {
        obj.positions[i] -= ax;
        obj.positions[i + 1] -= ay;
        obj.positions[i + 2] -= az;
      }
      const prim = doc
        .createPrimitive()
        .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(obj.positions)).setBuffer(buffer))
        .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(obj.normals)).setBuffer(buffer))
        .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(obj.indices)).setBuffer(buffer))
        .setMaterial(doc.createMaterial(key));
      const node: GNode = doc.createNode(key).setMesh(doc.createMesh(key).addPrimitive(prim));
      node.setExtras({ fileId: obj.fileId, fma: obj.fma, name: obj.name });
      scene.addChild(node);
      parts[key] = { fileId: obj.fileId, fma: obj.fma, name: obj.name };
    }
    doc.getRoot().setDefaultScene(scene);
    doc.getRoot().getAsset().copyright = 'BodyParts3D, © The Database Center for Life Science (CC BY-SA 2.1 JP in file headers; CC BY 4.0 on the licence page)';
    doc.getRoot().getAsset().extras = { anchorMetres: [ax, ay, az], anchorKey: set.anchorKey };

    await doc.transform(dedup(), weld(), reorder({ encoder: MeshoptEncoder }), quantize(), prune());
    doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
    const glb = await io.writeBinary(doc);
    writeFileSync(new URL(set.out, outDir), glb);
    manifest[set.out] = { title: set.title, parts };
    console.log(`${set.out}: ${objs.length} parts, ${(glb.byteLength / 1024).toFixed(0)} KB`);
  }

  writeFileSync(new URL('manifest.json', outDir), JSON.stringify(manifest, null, 2));
  writeFileSync(
    new URL('LICENSE.md', outDir),
    `# Anatomy models

These GLB files are derived from **BodyParts3D** (PART-OF tree, version 4.0, 99 % reduced OBJ):

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International
> — https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html (licence page updated 2025-02-27)

Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. BodyParts3D: 3D structure database
for anatomical concepts. Nucleic Acids Res. 2009;37(Database issue):D782-5. doi:10.1093/nar/gkn613
(PMID 18835852). Dataset DOI: 10.18908/lsdba.nbdc00837-000

The original OBJ file headers state "Creative Commons Attribution-Share Alike 2.1 Japan". To respect
both statements, these derived files are shared under **CC BY-SA 2.1 JP** with the attribution above.
This licence applies to the files in this folder only; the application code is licensed separately.

Changes made: converted from millimetres (Z up) to metres (Y up), re-centred, welded, quantised and
compressed with EXT_meshopt_compression. Geometry was not reshaped. \`manifest.json\` lists each node with
its BodyParts3D file id, FMA concept id and English name.
`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
