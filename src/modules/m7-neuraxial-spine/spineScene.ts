import * as THREE from 'three';
import { createStage, type Stage } from '../../engine/createStage';
import { loadAnatomy } from '../../engine/loadAnatomy';
import { createLabel, type AnatomyLabel } from '../../engine/labels';
import { FluoroView, type FluoroProjection } from './fluoroView';
import * as G from './spineGeometry';
import { REGIONS, duraHalfDepthFor, type Approach, type RegionDef, type SpineRegion } from './spineRegions';

export { REGIONS, spaceName, type Approach, type SpineRegion } from './spineRegions';
export type SpineView = 'side' | 'back' | 'needle';


export interface SpineInputs {
  region: SpineRegion;
  space: number;
  approach: Approach;
  flexion: number;
  softTissueMm: number;
  entryOffsetMm: number;
  cephaladDeg: number;
  medialDeg: number;
  depthMm: number;
  cut: boolean;
  boneOpacity: number;
  labels: boolean;
  fluoro: FluoroProjection;
  fr: boolean;
}

export interface SpineOutputs {
  result: G.NeedleResult;
  boneName: string | null;
  boneStructure: 'spinous' | 'lamina' | 'other' | null;
  canalDepthMm: number;
  /** Midline skin-to-spinous-tip soft tissue used for this interspace (mm). */
  entry: G.Vec3;
}

const ALL_PARTS = [...REGIONS.lumbar.verts, ...REGIONS.lumbar.discs, ...REGIONS.lumbar.extras, ...REGIONS.thoracic.verts, ...REGIONS.thoracic.discs];

export interface SpineScene {
  update(inputs: SpineInputs): SpineOutputs;
  /** Nearest entry offset / cephalad angle (to the defaults) whose path reaches the epidural space. */
  suggestStart(inputs: SpineInputs): { entryOffsetMm: number; cephaladDeg: number } | null;
  setView(view: SpineView): void;
  setFluoroLabels(el: HTMLElement | null): void;
  dispose(): void;
}

export async function createSpineScene(container: HTMLElement, fluoroContainer: HTMLElement): Promise<SpineScene> {
  const stage: Stage = await createStage({
    container,
    background: '#060a12',
    fov: 32,
    near: 0.003,
    far: 4,
    home: { position: [0.3, 0.02, -0.08], target: [0, -0.02, 0] },
    controls: { minDistance: 0.05, maxDistance: 1.2 },
    shadows: true,
    bloom: { strength: 0.2, radius: 0.4, threshold: 0.92 },
  });
  let model: THREE.Group;
  try {
    model = await loadAnatomy('spine.glb');
  } catch (e) {
    stage.dispose();
    throw e;
  }
  const { scene, renderer, materials: M, rig } = stage;
  renderer.localClippingEnabled = true;

  // ── Materials (private copies: clipping + opacity) ─────────────────────────
  const cutPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.0015);
  const boneMat = M.clone('bone');
  const discMat = M.clone('disc');
  const flavumMat = M.clone('ligament');
  flavumMat.color.set(0xf5b041);
  const duraMat = M.clone('dura');
  duraMat.opacity = 0.5;
  const epiMat = M.clone('fat');
  epiMat.color.set(0x34d399);
  epiMat.opacity = 0.14;
  const cordMat = M.clone('nerve');
  cordMat.color.set(0xf5e6c8);
  cordMat.emissiveIntensity = 0.15;
  const caudaMat = M.clone('nerve');
  const skinMat = M.clone('skin');
  skinMat.opacity = 0.14;
  skinMat.side = THREE.DoubleSide;
  const fatMat = M.clone('fat');
  fatMat.opacity = 0.1;
  fatMat.emissive.set(0x3a2a10);
  const clipped = [boneMat, discMat, flavumMat, duraMat, epiMat, cordMat, caudaMat];
  const steel = M.get('steel');
  const hubMat = M.clone('plastic');
  hubMat.color.set(0xfbbf24);
  hubMat.transparent = true;
  hubMat.opacity = 0.85;
  const markMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  const aimMat = new THREE.LineDashedMaterial({ color: 0x67e8f9, dashSize: 0.002, gapSize: 0.0015, transparent: true, opacity: 0.8, depthTest: false });
  const hitMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, depthTest: false });
  const own: { dispose(): void }[] = [markMat, aimMat, hitMat];

  // ── Real vertebrae: flatten under one identity group so matrices are world matrices ──
  const spine = new THREE.Group();
  scene.add(spine);
  model.updateMatrixWorld(true);
  const meshes: Record<string, THREE.Mesh> = {};
  const meshList: THREE.Mesh[] = [];
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) meshList.push(m);
  });
  for (const m of meshList) {
    // GLTFLoader names a single-mesh node's Mesh after the node; fall back to the parent's name.
    const name = ALL_PARTS.includes(m.name) ? m.name : m.parent && ALL_PARTS.includes(m.parent.name) ? m.parent.name : m.name;
    spine.attach(m);
    m.name = name;
    (m.material as THREE.Material).dispose();
    m.material = name.startsWith('disc') ? discMat : boneMat;
    m.castShadow = true;
    m.receiveShadow = true;
    m.updateMatrix();
    m.matrixAutoUpdate = false;
    m.userData.base = m.matrix.clone();
    meshes[name] = m;
  }
  const ownerOf = new Map<string, number>();
  const names = Object.keys(meshes);
  names.forEach((n, i) => ownerOf.set(n, i));

  // Local positions (denormalised) and the original posterior tip of each vertebra.
  const localPos: Record<string, Float32Array> = {};
  const tipBase: Record<string, G.Vec3> = {};
  const centreBase: Record<string, G.Vec3> = {};
  for (const n of names) {
    const g = meshes[n].geometry;
    const a = g.getAttribute('position');
    const arr = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) {
      arr[i * 3] = a.getX(i);
      arr[i * 3 + 1] = a.getY(i);
      arr[i * 3 + 2] = a.getZ(i);
    }
    localPos[n] = arr;
    const base = (meshes[n].userData.base as THREE.Matrix4).elements;
    let tip: G.Vec3 = [0, 0, Infinity];
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < a.count; i++) {
      const w = G.transformPoint(base, [arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]]);
      if (w[2] < tip[2]) tip = w;
      cx += w[0];
      cy += w[1];
      cz += w[2];
    }
    tipBase[n] = tip;
    centreBase[n] = [cx / a.count, cy / a.count, cz / a.count];
  }

  // ── Derived soft tissues, labels and needle ────────────────────────────────
  const soft = new THREE.Group();
  scene.add(soft);
  const skinGroup = new THREE.Group();
  scene.add(skinGroup);
  let labels: AnatomyLabel[] = [];

  const needle = new THREE.Group();
  const shaftGeo = new THREE.CylinderGeometry(0.00074, 0.00074, 1, 14, 1);
  shaftGeo.translate(0, 0.5, 0);
  const shaft = new THREE.Mesh(shaftGeo, steel);
  shaft.castShadow = true;
  const hubGeo = new THREE.CylinderGeometry(0.0035, 0.0028, 0.022, 20);
  const hub = new THREE.Mesh(hubGeo, hubMat);
  const markGeo = new THREE.CylinderGeometry(0.00082, 0.00082, 0.0006, 12);
  const marks: THREE.Mesh[] = [];
  for (let k = 1; k <= 8; k++) {
    const mk = new THREE.Mesh(markGeo, markMat);
    marks.push(mk);
    needle.add(mk);
  }
  // Tuohy tip: short curved bevel.
  const tipGeo = new THREE.CylinderGeometry(0.0003, 0.00074, 0.0022, 12);
  const tipMesh = new THREE.Mesh(tipGeo, steel);
  needle.add(shaft, hub, tipMesh);
  scene.add(needle);
  const aimGeo = new THREE.BufferGeometry();
  const aim = new THREE.Line(aimGeo, aimMat);
  aim.renderOrder = 5;
  scene.add(aim);
  const hitGeo = new THREE.SphereGeometry(0.0012, 12, 8);
  const hitDot = new THREE.Mesh(hitGeo, hitMat);
  hitDot.renderOrder = 6;
  scene.add(hitDot);
  own.push(shaftGeo, hubGeo, markGeo, tipGeo, aimGeo, hitGeo);

  // ── Fluoroscopy ────────────────────────────────────────────────────────────
  const fluoro = new FluoroView(fluoroContainer);
  let fluoroLabelsEl: HTMLElement | null = null;
  let fluoroDirty = true;

  // ── State caches ───────────────────────────────────────────────────────────
  let anatomyKey = '';
  let soup: G.TriSoup | null = null;
  let profile: G.CanalProfile | null = null;
  let duraHalfDepth = 0.006;
  let tips: Record<string, G.Vec3> = {};
  let regionCentre = new THREE.Vector3();
  let regionHeight = 0.14;
  let current: SpineInputs | null = null;
  let lastNeedle: { from: THREE.Vector3; to: THREE.Vector3 } | null = null;
  let lastEntry: G.Vec3 = [0, 0, 0];
  let lastDir: G.Vec3 = [0, 0, 1];
  let currentRegion: SpineRegion | null = null;

  const disposeGroup = (g: THREE.Group) => {
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
    g.clear();
  };

  const clearLabels = () => {
    for (const l of labels) {
      l.group.parent?.remove(l.group);
      l.group.traverse((o) => {
        // Removing the parent group does not fire 'removed' on the CSS2DObject child: drop its element here.
        const css = o as unknown as { isCSS2DObject?: boolean; element?: HTMLElement };
        if (css.isCSS2DObject) css.element?.remove();
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | undefined;
        mat?.dispose();
      });
    }
    labels = [];
  };

  const applyFlex = (def: RegionDef, flexion: number) => {
    const pivots: G.Vec3[] = def.discs.map((d) => centreBase[d]);
    const seg = THREE.MathUtils.degToRad(def.flexMaxDeg * flexion);
    const { vert, disc } = G.flexionChain(def.verts.length, def.anchor, pivots, seg);
    const set = (n: string, m: G.Mat4) => {
      const mesh = meshes[n];
      if (!mesh) return;
      mesh.matrix.fromArray(G.multiply(m, (mesh.userData.base as THREE.Matrix4).elements));
      mesh.matrixWorldNeedsUpdate = true;
    };
    def.verts.forEach((n, k) => {
      set(n, vert[k]);
      tips[n] = G.transformPoint(vert[k], tipBase[n]);
    });
    def.extras.forEach((n) => set(n, vert[def.verts.length - 1]));
    def.discs.forEach((n, k) => set(n, disc[k]));
  };

  const rebuildAnatomy = (inp: SpineInputs) => {
    const def = REGIONS[inp.region];
    for (const n of names) meshes[n].visible = def.verts.includes(n) || def.discs.includes(n) || def.extras.includes(n);
    tips = {};
    applyFlex(def, inp.flexion);
    spine.updateMatrixWorld(true);
    const parts = [...def.verts, ...def.discs, ...def.extras];
    soup = new G.TriSoup(
      parts.map((n) => ({
        owner: ownerOf.get(n)!,
        positions: localPos[n],
        index: meshes[n].geometry.getIndex()?.array ?? null,
        matrix: meshes[n].matrix.elements,
      }))
    );
    const boxes = def.verts.map((v) => soup!.ownerBox(ownerOf.get(v)!)!);
    const yMin = Math.min(...boxes.map((b) => b[1]));
    const yMax = Math.max(...boxes.map((b) => b[4]));
    profile = G.canalProfile(soup, yMin, yMax, [...def.verts, ...def.discs].map((n) => ownerOf.get(n)!));
    duraHalfDepth = duraHalfDepthFor(def, profile.depth);

    // Soft tissues from the profile.
    disposeGroup(soft);
    const p = profile;
    const n = p.zA.length;
    const yAt = (i: number) => p.y0 + i * p.step;
    // Ligamentum flavum: one slab per interlaminar window.
    let i = 0;
    const windows: { y: number; z: number }[] = [];
    while (i < n) {
      if (!p.gap[i]) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < n && p.gap[j + 1]) j++;
      if (j - i >= 3) {
        const geo = slabGeometry(
          Array.from({ length: j - i + 1 }, (_, k) => ({ y: yAt(i + k), zFront: p.zP[i + k], zBack: p.zP[i + k] - def.soft.flavumThickness })),
          def.soft.flavumHalfWidth
        );
        const slab = new THREE.Mesh(geo, flavumMat);
        slab.castShadow = true;
        soft.add(slab);
        const mid = Math.floor((i + j) / 2);
        windows.push({ y: yAt(mid), z: p.zP[mid] - def.soft.flavumThickness / 2 });
      }
      i = j + 1;
    }
    // Dural sac, epidural space shell, cord / cauda equina.
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k < n; k += 4) pts.push(new THREE.Vector3(0, yAt(k), p.zP[k] + def.soft.epiDorsal + duraHalfDepth));
    const curve = new THREE.CatmullRomCurve3(pts);
    const segs = Math.max(8, pts.length * 3);
    const dura = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, duraHalfDepth, 28, false), duraMat);
    dura.scale.x = def.soft.duraHalfWidth / duraHalfDepth;
    dura.renderOrder = 2;
    soft.add(dura);
    const epiR = duraHalfDepth + def.soft.epiDorsal * 0.9;
    const epi = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, epiR, 28, false), epiMat);
    epi.scale.x = def.soft.canalHalfWidth / epiR;
    epi.renderOrder = 3;
    soft.add(epi);
    if (def.soft.cord) {
      const cord = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, def.soft.cord[1], 20, false), cordMat);
      cord.scale.x = def.soft.cord[0] / def.soft.cord[1];
      soft.add(cord);
    } else {
      for (let r = 0; r < 10; r++) {
        const ox = (((r % 5) - 2) / 2.4) * def.soft.duraHalfWidth * 0.7;
        const oz = (r < 5 ? 0.35 : -0.15) * duraHalfDepth;
        const strand = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(ox, q.y, q.z + oz)));
        soft.add(new THREE.Mesh(new THREE.TubeGeometry(strand, segs, 0.0006, 6, false), caudaMat));
      }
    }

    // Labels.
    clearLabels();
    const L = (fr: string, en: string) => (inp.fr ? fr : en);
    const add = (anchor: G.Vec3, offset: G.Vec3, text: string, color: string) => {
      const l = createLabel({ anchor: new THREE.Vector3(...anchor), offset: new THREE.Vector3(...offset), text, color });
      l.setVisible(inp.labels);
      scene.add(l.group);
      labels.push(l);
    };
    for (const v of def.verts) add(tips[v], [0.004, 0.004, -0.016], v.toUpperCase(), '#e2e8f0');
    const mid = Math.floor(n / 2);
    const w = windows[Math.floor(windows.length / 2)];
    if (w) add([def.soft.flavumHalfWidth, w.y, w.z], [0.02, 0.012, -0.012], L('Ligament jaune', 'Ligamentum flavum'), '#f5b041');
    const zc = p.zP[mid] + def.soft.epiDorsal + duraHalfDepth;
    add([def.soft.duraHalfWidth, yAt(mid) - 0.01, zc], [0.024, -0.006, 0.006], L('Dure-mère (sac dural)', 'Dura (dural sac)'), '#93c5fd');
    add([0, yAt(mid) + 0.012, p.zP[mid] + def.soft.epiDorsal * 0.5], [0.024, 0.014, -0.004], L('Espace péridural', 'Epidural space'), '#34d399');
    if (def.soft.cord) add([def.soft.cord[0], yAt(mid) - 0.025, zc], [0.02, -0.01, 0.01], L('Moelle spinale', 'Spinal cord'), '#fde68a');
    else add([def.soft.duraHalfWidth * 0.4, yAt(mid) - 0.025, zc], [0.02, -0.01, 0.01], L('Queue de cheval (LCS)', 'Cauda equina (CSF)'), '#fde68a');

    regionCentre = new THREE.Vector3(0, (p.y0 + yAt(n - 1)) / 2, p.zP[mid] - 0.01);
    regionHeight = yAt(n - 1) - p.y0;

    // C-arm sources.
    fluoro.setSources([
      ...def.verts.map((v) => ({ object: meshes[v], mu: 55 })),
      ...def.extras.map((v) => ({ object: meshes[v], mu: 55 })),
      ...def.discs.map((d) => ({ object: meshes[d], mu: 18 })),
    ]);
  };

  const viewFor = (view: SpineView): { position: [number, number, number]; target: [number, number, number] } => {
    const c = regionCentre;
    const k = Math.max(1, regionHeight / 0.14);
    if (view === 'back') return { position: [c.x + 0.12 * k, c.y + 0.06, c.z - 0.3 * k], target: [c.x, c.y, c.z] };
    if (view === 'needle') {
      const e = new THREE.Vector3(...lastEntry);
      const d = new THREE.Vector3(...lastDir);
      const pos = e.clone().addScaledVector(d, -0.11).add(new THREE.Vector3(0.05, 0.02, 0));
      const tgt = e.clone().addScaledVector(d, 0.04);
      return { position: pos.toArray() as [number, number, number], target: tgt.toArray() as [number, number, number] };
    }
    return { position: [c.x + 0.24 * k, c.y + 0.015, c.z - 0.035 * k], target: [c.x, c.y, c.z + 0.012] };
  };

  const placeSkin = (skinZ: number, fatDepth: number) => {
    disposeGroup(skinGroup);
    if (!profile) return;
    const h = profile.zA.length * profile.step + 0.04;
    const yC = profile.y0 + (profile.zA.length * profile.step) / 2;
    const skin = new THREE.Mesh(new THREE.PlaneGeometry(0.1, h), skinMat);
    skin.position.set(0, yC, skinZ);
    skinGroup.add(skin);
    const fat = new THREE.Mesh(new THREE.BoxGeometry(0.1, h, fatDepth), fatMat);
    fat.position.set(0, yC, skinZ + fatDepth / 2);
    skinGroup.add(fat);
  };

  interface Prep {
    def: RegionDef;
    softParams: G.SoftTissueParams;
    boneOwners: number[];
    /** Palpated reference level for the entry point (y, m). */
    baseY: number;
  }

  const prepare = (inp: SpineInputs): Prep => {
    const def = REGIONS[inp.region];
    const space = Math.min(inp.space, def.verts.length - 2);
    const U = tips[def.verts[space]];
    const Lw = tips[def.verts[space + 1]];
    const softT = inp.softTissueMm / 1000;
    const skinZ = Math.min(U[2], Lw[2]) - softT;
    const fatDepth = Math.max(0.004, softT - 0.003);
    const softParams: G.SoftTissueParams = { ...def.soft, skinZ, fatDepth, duraHalfDepth };
    const boneOwners = [...def.verts, ...def.extras].map((n) => ownerOf.get(n)!);
    // "Palpate" the interspinous depression: the longest run of levels between the two spinous
    // processes where a perpendicular midline needle passes clearly deeper than the tips; take its middle.
    const ys: number[] = [];
    const ds: number[] = [];
    for (let y = U[1] + 0.005; y >= Lw[1]; y -= 0.0005) {
      const h = soup!.firstHit([0, y, skinZ], [0, 0, 1], 0.12, (o) => boneOwners.includes(o));
      ys.push(y);
      ds.push(h ? h.t : 0.12);
    }
    const dMin = Math.min(...ds);
    let gapY = (U[1] + Lw[1]) / 2;
    let runStart = -1;
    let bestLen = 0;
    for (let k = 0; k <= ds.length; k++) {
      const free = k < ds.length && ds[k] > dMin + 0.008;
      if (free && runStart < 0) runStart = k;
      if (!free && runStart >= 0) {
        if (k - runStart > bestLen) {
          bestLen = k - runStart;
          gapY = (ys[runStart] + ys[k - 1]) / 2;
        }
        runStart = -1;
      }
    }
    const lumbar = inp.region === 'lumbar';
    // Midline: lumbar, middle of the depression; thoracic, just below the caudal tip of the upper spinous process.
    // Paramedian (both regions): ~1 cm lateral and ~1 cm caudal (claim m7-paramedian; PMC9346204, PMC10797981).
    const baseY = inp.approach === 'midline' ? (lumbar ? gapY : U[1] - 0.003) : lumbar ? gapY - 0.008 : U[1] - 0.01;
    return { def, softParams, boneOwners, baseY };
  };

  const needlePose = (prep: Prep, inp: SpineInputs, offsetMm: number, ceph: number) => {
    const entry: G.Vec3 = [inp.approach === 'paramedian' ? 0.01 : 0, prep.baseY + offsetMm / 1000, prep.softParams.skinZ];
    const dir = G.needleDirection(ceph, inp.approach === 'paramedian' ? inp.medialDeg : 0, 1);
    return { entry, dir };
  };

  const unsubFrame = stage.onFrame(() => {
    if (fluoroDirty && current) {
      fluoroDirty = false;
      fluoro.render(current.fluoro, regionCentre.clone().setZ(regionCentre.z + 0.02), lastNeedle);
      if (fluoroLabelsEl) {
        fluoroLabelsEl.replaceChildren();
        const def = REGIONS[current.region];
        for (const v of def.verts) {
          const c = meshes[v];
          const box = new THREE.Box3().setFromObject(c);
          const p = fluoro.project(box.getCenter(new THREE.Vector3()));
          if (p.x < 0.08 || p.x > 0.92 || p.y < 0.06 || p.y > 0.94) continue;
          const s = document.createElement('span');
          s.textContent = v.toUpperCase();
          s.style.cssText = `position:absolute;left:${(current.fluoro === 'LAT' ? 0.06 : Math.min(0.86, p.x + 0.16)) * 100}%;top:${p.y * 100}%;transform:translateY(-50%);font:600 10px ui-monospace,monospace;color:#fde047;text-shadow:0 0 3px #000`;
          fluoroLabelsEl.append(s);
        }
      }
    }
  });

  return {
    update(inp) {
      const def = REGIONS[inp.region];
      const key = `${inp.region}|${inp.flexion.toFixed(3)}|${inp.fr}`;
      if (key !== anatomyKey) {
        anatomyKey = key;
        rebuildAnatomy(inp);
      }
      if (currentRegion !== inp.region) {
        const first = currentRegion === null;
        currentRegion = inp.region;
        if (first) {
          const v = viewFor('side');
          stage.camera.position.set(...v.position);
          stage.controls?.target.set(...v.target);
        } else rig.flyTo(viewFor('side'));
      }
      for (const l of labels) l.setVisible(inp.labels);
      for (const m of clipped) m.clippingPlanes = inp.cut ? [cutPlane] : [];
      boneMat.transparent = inp.boneOpacity < 0.99;
      boneMat.opacity = inp.boneOpacity;
      boneMat.depthWrite = inp.boneOpacity >= 0.99;
      boneMat.needsUpdate = true;

      const prep = prepare(inp);
      const { entry, dir } = needlePose(prep, inp, inp.entryOffsetMm, inp.cephaladDeg);
      const result = G.traceNeedle(soup!, prep.boneOwners, profile!, prep.softParams, entry, dir, inp.depthMm / 1000, 0.09);
      placeSkin(prep.softParams.skinZ, prep.softParams.fatDepth);

      // Needle mesh: 9 cm shaft, tip at the reached depth, hub outside the skin.
      const e = new THREE.Vector3(...entry);
      const d = new THREE.Vector3(...dir);
      const tip = e.clone().addScaledVector(d, result.reached);
      const back = tip.clone().addScaledVector(d, -0.09);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      shaft.position.copy(back);
      shaft.quaternion.copy(q);
      shaft.scale.set(1, 0.09 - 0.0011, 1);
      tipMesh.position.copy(tip).addScaledVector(d, -0.0011);
      tipMesh.quaternion.copy(q);
      hub.position.copy(back).addScaledVector(d, -0.011);
      hub.quaternion.copy(q);
      marks.forEach((mk, k) => {
        mk.position.copy(tip).addScaledVector(d, -(k + 1) * 0.01);
        mk.quaternion.copy(q);
      });
      // Aim line to the first bone (or 9 cm), and the contact point.
      const aimEnd = result.boneAt ?? 0.09;
      aimGeo.setFromPoints([tip, e.clone().addScaledVector(d, aimEnd)]);
      aim.computeLineDistances();
      aim.visible = aimEnd > result.reached + 0.001;
      hitDot.visible = result.boneAt !== null;
      if (result.boneAt !== null) hitDot.position.copy(e).addScaledVector(d, result.boneAt);

      lastEntry = entry;
      lastDir = dir;
      lastNeedle = { from: back, to: tip };
      current = inp;
      fluoroDirty = true;

      let boneName: string | null = null;
      let boneStructure: SpineOutputs['boneStructure'] = null;
      if (result.boneAt !== null && result.boneOwner !== null) {
        boneName = names[result.boneOwner].toUpperCase();
        const hp = e.clone().addScaledVector(d, result.boneAt);
        const f = (hp.y - profile!.y0) / profile!.step;
        const k = Math.max(0, Math.min(profile!.zP.length - 1, Math.round(f)));
        const zP = profile!.zP[k];
        boneStructure = Math.abs(hp.x) > def.soft.canalHalfWidth ? 'other' : hp.z < zP - 0.009 ? 'spinous' : 'lamina';
      }
      return { result, boneName, boneStructure, canalDepthMm: profile!.depth * 1000, entry };
    },
    suggestStart(inp) {
      if (`${inp.region}|${inp.flexion.toFixed(3)}|${inp.fr}` !== anatomyKey) {
        anatomyKey = `${inp.region}|${inp.flexion.toFixed(3)}|${inp.fr}`;
        rebuildAnatomy(inp);
      }
      const prep = prepare(inp);
      const ceph0 = REGIONS[inp.region].defaults[inp.approach].ceph;
      let best: { entryOffsetMm: number; cephaladDeg: number } | null = null;
      let bestCost = Infinity;
      for (let off = -10; off <= 10; off++) {
        for (let c = Math.max(0, ceph0 - 16); c <= Math.min(70, ceph0 + 16); c += 2) {
          const cost = Math.abs(off) + Math.abs(c - ceph0) / 2;
          if (cost >= bestCost) continue;
          const { entry, dir } = needlePose(prep, inp, off, c);
          const r = G.traceNeedle(soup!, prep.boneOwners, profile!, prep.softParams, entry, dir, 0, 0.09, 0.0005);
          const epi = r.path.find((s) => s.tissue === 'epidural');
          // A forgiving path: at least 1.5 mm of epidural space before anything else.
          if (r.epiduralAt !== null && epi && epi.to - epi.from >= 0.0015) {
            best = { entryOffsetMm: off, cephaladDeg: c };
            bestCost = cost;
          }
        }
      }
      return best;
    },
    setView(view) {
      rig.flyTo(viewFor(view));
    },
    setFluoroLabels(el) {
      fluoroLabelsEl = el;
      fluoroDirty = true;
    },
    dispose() {
      unsubFrame();
      clearLabels();
      disposeGroup(soft);
      disposeGroup(skinGroup);
      for (const o of own) o.dispose();
      fluoro.dispose();
      stage.dispose();
    },
  };
}

/** Closed slab between two z-profiles along y, ±hw in x. */
function slabGeometry(pts: { y: number; zFront: number; zBack: number }[], hw: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  for (const p of pts) {
    pos.push(-hw, p.y, p.zFront, hw, p.y, p.zFront, hw, p.y, p.zBack, -hw, p.y, p.zBack);
  }
  const quad = (a: number, b: number, c: number, d: number) => idx.push(a, b, c, a, c, d);
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = i * 4;
    const b = (i + 1) * 4;
    quad(a, a + 1, b + 1, b); // front (anterior)
    quad(a + 3, b + 3, b + 2, a + 2); // back
    quad(a + 1, a + 2, b + 2, b + 1); // +x side
    quad(a, b, b + 3, a + 3); // −x side
  }
  const last = (pts.length - 1) * 4;
  quad(0, 3, 2, 1);
  quad(last, last + 1, last + 2, last + 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
