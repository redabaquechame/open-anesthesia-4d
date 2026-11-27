import * as THREE from 'three';
import { createStage, type Stage } from '../../engine/createStage';
import { anatomyUrl, loadAnatomy } from '../../engine/loadAnatomy';
import { createLabel, type AnatomyLabel } from '../../engine/labels';
import { BronchoscopeView, type CuffShape, type ScopeCapsule, type TubeSegment } from './bronchoscopeView';
import { pathFrom, pointAt, type AirwayMap, type Lobe, type Path, type V3 } from './airwayGeometry';
import * as D from './dltModel';

export type AirwayMapJson = AirwayMap & { lobeHullVolume: Record<Lobe, number> };
export type AirwayView = 'front' | 'carina' | 'left';

export interface ScopeInputs {
  lumen: 'tracheal' | 'bronchial';
  /** mm relative to the lumen opening (negative = still inside the tube). */
  advanceMm: number;
  /** Bronchus to enter beyond the carina when the scope is out of the tracheal lumen. */
  steer: 'left' | 'right';
  flexDeg: number;
  twistDeg: number;
}

export interface AirwaySceneInputs {
  dlt: D.DltInputs;
  out: D.DltOutputs;
  scope: ScopeInputs;
  labels: boolean;
  fr: boolean;
}

export interface ScopeOverlay {
  /** Screen angles (rad, 0 = right, CCW) of the patient's left and anterior directions in the scope image. */
  leftAngle: number | null;
  anteriorAngle: number | null;
  /** Where the scope tip is. */
  where: 'inTube' | 'trachea' | 'leftBronchus' | 'rightBronchus';
}

export interface AirwayScene {
  map: AirwayMapJson;
  lobeShare: Record<Lobe, number>;
  update(inp: AirwaySceneInputs): ScopeOverlay;
  setView(v: AirwayView): void;
  dispose(): void;
}

const LOBE_COLORS = { vent: new THREE.Color(0xf4a9b0), off: new THREE.Color(0x6f7f99), part: new THREE.Color(0xf5b04a) };
const v3 = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);

interface Route {
  path: Path;
  sigmaCarina: number;
}

/** Tube/scope route: 15 cm straight above the model trachea, then the trachea, then one main path. */
function buildRoute(map: AirwayMapJson, side: 'left' | 'right'): Route {
  const t = map.trachea;
  const top = t.pts[0];
  const dir = [t.pts[0][0] - t.pts[4][0], t.pts[0][1] - t.pts[4][1], t.pts[0][2] - t.pts[4][2]] as V3;
  const l = Math.hypot(...dir);
  const u = dir.map((x) => x / l) as V3;
  const pre: { p: V3; d: number }[] = [];
  for (let k = 15; k >= 1; k--) pre.push({ p: [top[0] + u[0] * k * 0.01, top[1] + u[1] * k * 0.01, top[2] + u[2] * k * 0.01], d: t.d[0] });
  const main = side === 'left' ? map.left : map.right;
  const pts = [...pre, ...t.pts.map((p, i) => ({ p, d: t.d[i] })), ...main.pts.slice(1).map((p, i) => ({ p, d: main.d[i + 1] }))];
  const path = pathFrom(pts);
  // The bronchial paths start at the junction J (end of the trachea path) with arc length main.s[0] < 0; 0 = carina level.
  const sigmaCarina = path.s[pre.length + t.pts.length - 1] - main.s[0];
  return { path, sigmaCarina };
}

export async function createAirwayScene(container: HTMLElement, scopeContainer: HTMLElement): Promise<AirwayScene> {
  const [map, anatomy, stage] = await Promise.all([
    fetch(anatomyUrl('airway-map.json')).then((r) => {
      if (!r.ok) throw new Error('airway-map.json');
      return r.json() as Promise<AirwayMapJson>;
    }),
    loadAnatomy('airway.glb'),
    createStage({
      container,
      background: '#050913',
      fov: 32,
      near: 0.005,
      far: 5,
      home: { position: [0.02, -0.02, 0.36], target: [0.004, -0.045, -0.012] },
      presets: {
        front: { position: [0.02, -0.02, 0.36], target: [0.004, -0.045, -0.012] },
        carina: { position: [0.06, -0.01, 0.13], target: [0.004, -0.055, -0.012] },
        left: { position: [0.34, -0.03, -0.02], target: [0.004, -0.05, -0.012] },
      },
      controls: { minDistance: 0.05, maxDistance: 1.2 },
      bloom: { strength: 0.25, radius: 0.5, threshold: 0.85 },
      envIntensity: 0.6,
    }),
  ]);
  const scope = new BronchoscopeView(scopeContainer, stage.tier === 'LOW');
  const totalHull = Object.values(map.lobeHullVolume).reduce((a, b) => a + b, 0);
  const lobeShare = Object.fromEntries(Object.entries(map.lobeHullVolume).map(([k, v]) => [k, v / totalHull])) as Record<Lobe, number>;

  // ── Anatomy ────────────────────────────────────────────────────────────
  const root = new THREE.Group();
  stage.scene.add(root);
  const airwayMat = stage.materials.clone('mucosa');
  Object.assign(airwayMat, { transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  airwayMat.color.set(0xe9a6a0);
  // Each lobe's segmental bronchial tree is tinted by its ventilation state (no invented lung surfaces).
  const lobeState3d = {} as Record<Lobe, { mat: THREE.MeshStandardMaterial; collapse: number }>;
  for (const lobe of D.LOBE_LIST) {
    const mat = airwayMat.clone();
    Object.assign(mat, { opacity: 0.55, emissive: new THREE.Color(0x000000) });
    mat.color.copy(LOBE_COLORS.vent);
    lobeState3d[lobe] = { mat, collapse: 0 };
  }
  const ctxMats: Record<string, THREE.MeshStandardMaterial> = {
    artery: stage.materials.clone('artery'),
    vein: stage.materials.clone('vein'),
    muscle: stage.materials.clone('muscle'),
  };
  for (const m of Object.values(ctxMats)) Object.assign(m, { transparent: true, opacity: 0.14, depthWrite: false });
  anatomy.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  anatomy.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) meshes.push(m);
  });
  for (const m of meshes) {
    const n = m.name;
    (m.material as THREE.Material).dispose();
    if (n.startsWith('ctx_')) {
      m.material = n.includes('Aort') || n.includes('aort') ? ctxMats.artery : n.includes('PA') || n.includes('Pulmonary') || n.includes('pulmonary') ? ctxMats.vein : ctxMats.muscle;
      m.renderOrder = 1;
    } else {
      const lobe = /^(RUL|RML|RLL|LUL|LLL)_/.exec(n)?.[1] as Lobe | undefined;
      m.material = lobe ? lobeState3d[lobe].mat : airwayMat;
      m.renderOrder = 2;
    }
  }
  root.add(anatomy);

  // ── Double-lumen tube (rebuilt when its geometry changes) ───────────────
  const tubeGroup = new THREE.Group();
  root.add(tubeGroup);
  const tubeMat = stage.materials.clone('plastic');
  Object.assign(tubeMat, { transparent: true, opacity: 0.85, depthWrite: true });
  tubeMat.color.set(0xeef6ff);
  const limbMat = tubeMat.clone();
  const blueMat = stage.materials.clone('plastic');
  blueMat.color.set(0x1d6fe0);
  Object.assign(blueMat, { emissive: new THREE.Color(0x0b3b8a), emissiveIntensity: 0.35 });
  const clearCuffMat = tubeMat.clone();
  clearCuffMat.opacity = 0.3;

  const scopeLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x111827, linewidth: 2 }));
  const scopeTip = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff1b8 }));
  const scopeCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.008, 0.016, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })
  );
  root.add(scopeLine, scopeTip, scopeCone);

  // Gravity indicator
  const gravity = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-0.09, 0.03, 0.03), 0.04, 0x94a3b8, 0.012, 0.007);
  root.add(gravity);

  // ── Scope lumen capsules (static) ──────────────────────────────────────
  const airCaps: ScopeCapsule[] = [];
  {
    const acc: Record<string, number> = { trachea: 0, LMB: 0, RMB: 0 };
    for (const c of map.capsules) {
      const a = v3(c.a);
      const b = v3(c.b);
      const L = a.distanceTo(b);
      const ring = c.region === 'trachea' ? 1 : c.region === 'LMB' || c.region === 'RMB' ? 0.7 : 0;
      const sa = acc[c.region] ?? 0;
      if (c.region in acc) acc[c.region] = sa + L;
      airCaps.push({ a, b, ra: c.ra, rb: c.rb, sa, sb: sa + L, ring });
    }
  }

  // ── Labels ─────────────────────────────────────────────────────────────
  let labels: AnatomyLabel[] = [];
  const labelGroup = new THREE.Group();
  root.add(labelGroup);
  let labelKey = '';
  const buildLabels = (fr: boolean, lm: D.Landmarks) => {
    for (const l of labels) {
      l.group.traverse((o) => {
        const css = o as unknown as { isCSS2DObject?: boolean; element?: HTMLElement };
        if (css.isCSS2DObject) css.element?.remove();
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
      labelGroup.remove(l.group);
    }
    labels = [];
    const specLm = D.landmarksFor('specimen', map);
    const at = (side: 'left' | 'right', s: number) => v3(pointAt(side === 'left' ? map.left : map.right, D.toModelArc(s, side, lm, specLm)).p);
    const add = (anchor: THREE.Vector3, off: [number, number, number], text: string, color: string) =>
      labels.push(createLabel({ anchor, offset: new THREE.Vector3(...off), text, color, dotRadius: 0.0011 }));
    add(v3(map.carina), [-0.005, 0.03, 0.03], fr ? 'Carène' : 'Carina', '#fde68a');
    add(at('left', lm.leftMain * 0.5), [0.035, 0.012, 0.02], fr ? 'Bronche souche gauche' : 'Left main bronchus', '#93c5fd');
    add(at('right', lm.rul[0] * 0.5), [-0.045, 0.012, 0.02], fr ? 'Bronche souche droite' : 'Right main bronchus', '#93c5fd');
    add(at('right', (lm.rul[0] + lm.rul[1]) / 2), [-0.04, 0.025, 0.015], fr ? 'Orifice lobaire sup. D' : 'RUL orifice', '#f9a8d4');
    add(at('left', lm.leftMain), [0.04, -0.02, 0.02], fr ? 'Éperon lobaire G (LSG / LIG)' : 'Left secondary carina (LUL / LLL)', '#f9a8d4');
    for (const l of labels) labelGroup.add(l.group);
  };

  // ── Update ─────────────────────────────────────────────────────────────
  let tubeKey = '';
  let tubeSegs: TubeSegment[] = [];
  let cuffs: (CuffShape | null)[] = [null, null];
  let lobeState: Record<Lobe, D.LobeState> | null = null;
  let rr = 12;
  let scopeDirty = true;
  let lastPose: { position: THREE.Vector3; forward: THREE.Vector3; up: THREE.Vector3 } | null = null;

  const lateralAxis = (tan: THREE.Vector3) => {
    const x = new THREE.Vector3(1, 0, 0);
    return x.sub(tan.clone().multiplyScalar(x.dot(tan))).normalize();
  };

  const disposeTube = () => {
    tubeGroup.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
    tubeGroup.clear();
  };

  const update = (inp: AirwaySceneInputs): ScopeOverlay => {
    const { dlt, out } = inp;
    const lm = out.landmarks;
    const specLm = D.landmarksFor('specimen', map);
    const dev = D.DLT_SPECS[dlt.size];
    const sideSign = dlt.side === 'left' ? 1 : -1;
    const route = buildRoute(map, dlt.side);
    const sig = (s: number) => route.sigmaCarina + (s <= 0 ? s : D.toModelArc(s, dlt.side, lm, specLm));
    const sOpen = sig(out.trachealOpening);
    const sTip = sig(out.sTip);
    const limbOffset = (s: number) => {
      const w = s <= sOpen ? 1 : Math.max(0, 1 - (s - sOpen) / 0.012);
      // bronchial limb hugs the ipsilateral wall (bulging 0.8 mm as it angles toward the bronchus)
      return (dev.od / 2000 - dev.bronchialOd / 2000 + 0.0008) * w * sideSign;
    };
    const posOn = (s: number, offset: number) => {
      const q = pointAt(route.path, s);
      const p = v3(q.p);
      if (offset) p.addScaledVector(lateralAxis(v3(q.dir)), offset);
      return p;
    };

    // Tube geometry
    const key = [dlt.size, dlt.side, sOpen.toFixed(4), sTip.toFixed(4), out.cuffDiameter.toFixed(4), out.airwayDiameter.toFixed(4), dlt.bronchialCuffMl].join('|');
    if (key !== tubeKey) {
      tubeKey = key;
      disposeTube();
      tubeSegs = [];
      const mainPts: THREE.Vector3[] = [];
      for (let s = 0; s <= sOpen + 1e-9; s += 0.004) mainPts.push(posOn(Math.min(s, sOpen), 0));
      const limbPts: THREE.Vector3[] = [];
      for (let s = Math.max(0, sOpen - 0.002); s <= sTip + 1e-9; s += 0.003) limbPts.push(posOn(Math.min(s, sTip), limbOffset(s)));
      if (limbPts.length < 2) limbPts.push(posOn(sTip, 0));
      for (let i = 0; i + 1 < mainPts.length; i++) tubeSegs.push({ a: mainPts[i], b: mainPts[i + 1], rOut: dev.od / 2000, rIn: dev.od / 2000 - 0.0009, part: 0 });
      for (let i = 0; i + 1 < limbPts.length; i++) tubeSegs.push({ a: limbPts[i], b: limbPts[i + 1], rOut: dev.bronchialOd / 2000, rIn: dev.bronchialId / 2000, part: 1 });
      if (mainPts.length > 1) tubeGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mainPts), mainPts.length * 2, dev.od / 2000, 24, false), tubeMat));
      if (limbPts.length > 1) tubeGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(limbPts), limbPts.length * 2, dev.bronchialOd / 2000, 20, false), limbMat));
      // Bronchial cuff (blue)
      const ca = posOn(sig(out.cuffTop), limbOffset(sig(out.cuffTop)));
      const cb = posOn(sig(out.cuffBottom), limbOffset(sig(out.cuffBottom)));
      const inflated = dlt.bronchialCuffMl > 0.05;
      const rC = inflated ? Math.min(out.cuffDiameter, out.airwayDiameter * 0.985) / 2 : dev.bronchialOd / 2000 + 0.0002;
      const axis = cb.clone().sub(ca);
      const len = Math.max(0.001, axis.length() - rC * 2);
      const capsule = new THREE.Mesh(new THREE.CapsuleGeometry(rC, len, 8, 24), blueMat);
      capsule.position.copy(ca).add(cb).multiplyScalar(0.5);
      capsule.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
      tubeGroup.add(capsule);
      // capsule ends shrunk by r so the cuff spans exactly cuffTop → cuffBottom
      const shrink = axis.clone().normalize().multiplyScalar(Math.min(rC, axis.length() / 2 - 1e-4));
      cuffs[0] = { a: ca.clone().add(shrink), b: cb.clone().sub(shrink), r: rC, color: new THREE.Color(0.12, 0.38, 0.92), opacity: 1 };
      // Tracheal cuff (clear), inflated in the trachea
      const ta = posOn(sig(out.sTip - 0.11), 0);
      const tb = posOn(sig(out.sTip - 0.08), 0);
      const rT = (lm.tracheaD * 0.985) / 2;
      const tAxis = tb.clone().sub(ta);
      const tc = new THREE.Mesh(new THREE.CapsuleGeometry(rT, Math.max(0.001, tAxis.length() - rT * 2), 8, 24), clearCuffMat);
      tc.position.copy(ta).add(tb).multiplyScalar(0.5);
      tc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tAxis.clone().normalize());
      tubeGroup.add(tc);
      const tShrink = tAxis.clone().normalize().multiplyScalar(Math.min(rT, tAxis.length() / 2 - 1e-4));
      cuffs[1] = { a: ta.clone().add(tShrink), b: tb.clone().sub(tShrink), r: rT, color: new THREE.Color(0.85, 0.9, 0.95), opacity: 1 };
      scopeDirty = true;
    }

    // Lobes
    lobeState = out.lobes;
    rr = dlt.rr;

    // Labels
    const lk = `${inp.fr}|${dlt.anatomy}`;
    if (lk !== labelKey) {
      labelKey = lk;
      buildLabels(inp.fr, lm);
    }
    labelGroup.visible = inp.labels;
    stage.setLabelsVisible(inp.labels);

    // Gravity arrow: posterior when supine; towards the dependent side when lateral.
    const gdir = !dlt.lateral ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(dlt.upSide === 'left' ? -1 : 1, 0, 0);
    gravity.setDirection(gdir);

    // Scope
    const sc = inp.scope;
    const scopeSide = sc.lumen === 'bronchial' ? dlt.side : sc.steer;
    const sr = sc.lumen === 'bronchial' ? route : buildRoute(map, scopeSide);
    const sigS = (s: number) => sr.sigmaCarina + (s <= 0 ? s : D.toModelArc(s, scopeSide, lm, specLm));
    // the tube follows dlt.side; until the carina both routes coincide
    const openRef = sc.lumen === 'tracheal' ? sOpen : sTip;
    const end = sr.path.s[sr.path.s.length - 1] - 0.002;
    const sigma = Math.min(end, openRef + sc.advanceMm / 1000);
    const scopeOff = (s: number) => {
      if (sc.lumen === 'bronchial') return limbOffset(s);
      // The tracheal-lumen opening faces the contralateral side: keep the scope clear of the bronchial limb.
      const rIn = dev.od / 2000 - 0.0009;
      const w = s <= sOpen ? 1 : Math.max(0, 1 - (s - sOpen) / 0.012);
      return -sideSign * (rIn - 0.0015) * w;
    };
    const q = pointAt(sr.path, sigma);
    const pos = v3(q.p).addScaledVector(lateralAxis(v3(q.dir)), scopeOff(sigma));
    let fwd = v3(q.dir);
    let up = new THREE.Vector3(0, 0, 1);
    up.sub(fwd.clone().multiplyScalar(up.dot(fwd))).normalize();
    let right = new THREE.Vector3().crossVectors(fwd, up).normalize();
    fwd = fwd.applyAxisAngle(right, THREE.MathUtils.degToRad(sc.flexDeg)).normalize();
    up = up.applyAxisAngle(right, THREE.MathUtils.degToRad(sc.flexDeg)).normalize();
    up = up.applyAxisAngle(fwd, THREE.MathUtils.degToRad(sc.twistDeg)).normalize();
    right = new THREE.Vector3().crossVectors(fwd, up).normalize();
    const pose = { position: pos, forward: fwd, up };
    if (!lastPose || lastPose.position.distanceTo(pos) > 1e-6 || lastPose.forward.angleTo(fwd) > 1e-5 || lastPose.up.angleTo(up) > 1e-5) scopeDirty = true;
    lastPose = pose;
    void sigS;

    // External scope rendering
    const linePts: THREE.Vector3[] = [];
    for (let s = Math.max(0, sigma - 0.3); s <= sigma; s += 0.004) {
      const qq = pointAt(sr.path, s);
      linePts.push(v3(qq.p).addScaledVector(lateralAxis(v3(qq.dir)), scopeOff(s)));
    }
    linePts.push(pos.clone());
    scopeLine.geometry.dispose();
    scopeLine.geometry = new THREE.BufferGeometry().setFromPoints(linePts);
    scopeTip.position.copy(pos);
    scopeCone.position.copy(pos).addScaledVector(fwd, 0.008);
    scopeCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), fwd);

    // Overlay markers: patient's left (+X) and anterior (+Z) projected on the image plane.
    const proj = (d: THREE.Vector3) => {
      const x = d.dot(right);
      const y = d.dot(up);
      return Math.hypot(x, y) < 0.2 ? null : Math.atan2(y, x);
    };
    const where: ScopeOverlay['where'] =
      sigma < openRef - 0.001 ? 'inTube' : sigma <= sr.sigmaCarina ? 'trachea' : scopeSide === 'left' ? 'leftBronchus' : 'rightBronchus';
    return { leftAngle: proj(new THREE.Vector3(1, 0, 0)), anteriorAngle: proj(new THREE.Vector3(0, 0, 1)), where };
  };

  // ── Frame loop: breathing / collapse, scope render on change ───────────
  const unsub = stage.onFrame(({ dt, time }) => {
    if (lobeState) {
      const phase = ((time * rr) / 60) % 1;
      const insp = phase < 1 / 3 ? phase * 3 : Math.exp(-(phase - 1 / 3) * 6);
      for (const lobe of D.LOBE_LIST) {
        const st = lobeState[lobe];
        const lm = lobeState3d[lobe];
        lm.collapse += ((st.ventilated ? 0 : 1) - lm.collapse) * Math.min(1, dt * 0.6);
        const col = st.ventilated ? (st.patency < 0.95 ? LOBE_COLORS.part : LOBE_COLORS.vent) : LOBE_COLORS.off;
        lm.mat.color.lerp(col, Math.min(1, dt * 3));
        lm.mat.opacity = 0.2 + 0.4 * (1 - lm.collapse);
        // inspiration glow, scaled by the lobe's patency
        lm.mat.emissive.copy(lm.mat.color).multiplyScalar(st.ventilated ? 0.35 * insp * st.patency : 0);
      }
    }
    if (scopeDirty && lastPose) {
      scopeDirty = false;
      scope.render(lastPose, airCaps, tubeSegs, cuffs, time);
    }
  });

  return {
    map,
    lobeShare,
    update,
    setView(v) {
      stage.rig.flyTo(v);
    },
    dispose() {
      unsub();
      for (const l of labels) {
        l.group.traverse((o) => {
          const css = o as unknown as { isCSS2DObject?: boolean; element?: HTMLElement };
          if (css.isCSS2DObject) css.element?.remove();
        });
      }
      disposeTube();
      scopeLine.geometry.dispose();
      scope.dispose();
      stage.dispose();
    },
  };
}
