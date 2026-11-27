import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { AlertOctagon, Eye, EyeOff, RotateCcw, ScanLine } from 'lucide-react';
import { createStage, type Stage } from '../../engine/createStage';
import { createLabel, type AnatomyLabel } from '../../engine/labels';
import { loadAnatomy, ANATOMY_CREDIT } from '../../engine/loadAnatomy';
import type { MaterialKey } from '../../engine/materials';
import type { LocaleCode } from '../../standards/clinicalStandards';
import { UltrasoundSimulator, pointInMesh, type AnalyticTissue, type MeshTissue, type ProbeFrame, type Tissue } from './ultrasoundSim';

/**
 * Supraclavicular brachial plexus lab.
 * Bones and vessels: real BodyParts3D meshes (right side). Brachial plexus and pleural dome are not in
 * BodyParts3D, so they are drawn schematically, positioned relative to the real subclavian artery.
 * The ultrasound image is computed from this exact 3D scene (see ultrasoundSim.ts).
 */

interface Controls {
  slideMm: number;
  tiltDeg: number;
  compression: number;
  gainDb: number;
  needleAngleDeg: number;
  needleAdvanceMm: number;
  laMl: number;
  labels: boolean;
}

const WIDTH_M = 0.038; // 38 mm linear footprint
const DEPTH_M = 0.04; // 4 cm display depth
const FREQ_MHZ = 12;

// Derived from the BodyParts3D right subclavian artery where it is closest to the first rib
// (model frame: metres, Y up, origin = first-rib centroid). See scripts/anatomy/build-anatomy.ts.
const ARTERY_AT_RIB = new THREE.Vector3(-0.0095, 0.0012, 0.0108);
const ARTERY_TANGENT = new THREE.Vector3(0.97, 0.2, -0.16).normalize();
const ARTERY_DEPTH_M = 0.018; // illustrative skin-to-artery depth

const MESH_SPEC: Record<string, { mat: MaterialKey; tissue?: Tissue; priority?: number; label?: [string, string] }> = {
  clavicle: { mat: 'bone', tissue: 'bone', priority: 6, label: ['Clavicle', 'Clavicule'] },
  firstRib: { mat: 'bone', tissue: 'bone', priority: 6, label: ['First rib', '1re côte'] },
  secondRib: { mat: 'bone', tissue: 'bone', priority: 6 },
  t1: { mat: 'bone', tissue: 'bone', priority: 6 },
  c7: { mat: 'bone', tissue: 'bone', priority: 6 },
  subclavianArtery: { mat: 'artery', tissue: 'artery', priority: 8, label: ['Subclavian artery', 'Artère subclavière'] },
  subclavianVein: { mat: 'vein', tissue: 'vein', priority: 8, label: ['Subclavian vein', 'Veine subclavière'] },
  internalJugularVein: { mat: 'vein', tissue: 'vein', priority: 8 },
  commonCarotid: { mat: 'artery', tissue: 'artery', priority: 8 },
  brachiocephalicArtery: { mat: 'artery', tissue: 'artery', priority: 8 },
};

/** Orthonormal probe basis for a given slide and tilt. */
function probeFrame(slideMm: number, tiltDeg: number, compression: number): ProbeFrame & { center: THREE.Vector3 } {
  const e0 = ARTERY_TANGENT.clone();
  const down = new THREE.Vector3(0, -1, 0);
  const d0 = down.sub(e0.clone().multiplyScalar(down.dot(e0))).normalize();
  const u0 = new THREE.Vector3().crossVectors(e0, d0).normalize(); // points posterior (−z)
  const tilt = THREE.MathUtils.degToRad(tiltDeg);
  const d = d0.clone().applyAxisAngle(u0, tilt);
  const e = e0.clone().applyAxisAngle(u0, tilt);
  const center = ARTERY_AT_RIB.clone().addScaledVector(e0, slideMm / 1000);
  const origin = center.clone().addScaledVector(d, -(ARTERY_DEPTH_M - compression * 0.003));
  return { origin, u: u0, d, e, center };
}

export function SonoLab({ locale }: { locale: LocaleCode }) {
  const fr = locale !== 'en-INT';
  const [c, setC] = useState<Controls>({
    slideMm: 0,
    tiltDeg: 0,
    compression: 0,
    gainDb: 0,
    needleAngleDeg: 22,
    needleAdvanceMm: 12,
    laMl: 0,
    labels: true,
  });
  const [alert, setAlert] = useState<string | null>(null);
  const [needleVis, setNeedleVis] = useState(1);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const ctrlRef = useRef(c);
  ctrlRef.current = c;
  const viewRef = useRef<HTMLDivElement | null>(null);
  const usRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<Stage | null>(null);

  useEffect(() => {
    const container = viewRef.current;
    if (!container) return;
    let stage: Stage | null = null;
    let cancelled = false;
    const labels: AnatomyLabel[] = [];

    createStage({
      container,
      background: '#05080f',
      fov: 35,
      near: 0.002,
      far: 3,
      home: { position: [-0.1, 0.13, 0.21], target: [-0.008, 0.002, 0.008] },
      presets: {
        probe: { position: [-0.16, 0.012, 0.01], target: [0, 0.0, 0.01] },
        above: { position: [-0.02, 0.2, 0.03], target: [0, 0, 0.01] },
      },
      controls: { minDistance: 0.04, maxDistance: 0.6 },
      shadows: true,
      bloom: { strength: 0.25, radius: 0.4, threshold: 0.9 },
    }).then(async (s) => {
      if (cancelled) {
        s.dispose();
        return;
      }
      stage = s;
      stageRef.current = s;
      const M = s.materials;

      let model: THREE.Group;
      try {
        model = await loadAnatomy('supraclavicular_right.glb');
      } catch {
        setStatus('error');
        return;
      }
      if (cancelled) return;
      s.scene.add(model);

      const meshes: Record<string, THREE.Mesh> = {};
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const key = (m.parent && m.parent !== model ? m.parent.name : m.name) || m.name;
        const spec = MESH_SPEC[key] ?? MESH_SPEC[m.name];
        const matKey = spec?.mat ?? 'bone';
        (m.material as THREE.Material).dispose();
        m.material = M.get(matKey);
        m.castShadow = true;
        m.receiveShadow = true;
        meshes[spec ? key : m.name] = m;
      });

      // Pivots so the vein can be compressed and the artery can pulse along the probe axes.
      const f0 = probeFrame(0, 0, 0);
      // Right-handed basis: u × d = −e.
      const basis = new THREE.Matrix4().makeBasis(f0.u, f0.d, f0.e.clone().negate());
      const pivotQuat = new THREE.Quaternion().setFromRotationMatrix(basis);
      const makePivot = (mesh: THREE.Mesh | undefined, anchor: THREE.Vector3) => {
        if (!mesh) return null;
        const pivot = new THREE.Object3D();
        pivot.position.copy(anchor);
        pivot.quaternion.copy(pivotQuat);
        model.add(pivot);
        pivot.updateMatrixWorld(true);
        pivot.attach(mesh);
        return pivot;
      };
      const veinBox = meshes.subclavianVein ? new THREE.Box3().setFromObject(meshes.subclavianVein) : null;
      const veinTop = veinBox ? veinBox.getCenter(new THREE.Vector3()).setY(veinBox.max.y) : new THREE.Vector3();
      const veinPivot = makePivot(meshes.subclavianVein, veinTop);
      const arteryPivot = makePivot(meshes.subclavianArtery, ARTERY_AT_RIB.clone());

      // ── Schematic brachial plexus: trunks/divisions posterior-superficial to the artery ──
      const plexusOffsets: [number, number, number][] = [
        // [u (posterior) m, d (depth) m, radius m]
        [0.0075, -0.0035, 0.0021],
        [0.0105, -0.0058, 0.0019],
        [0.0128, -0.0025, 0.0018],
        [0.0098, -0.0002, 0.0017],
        [0.0142, -0.0052, 0.0016],
        [0.0072, -0.0072, 0.0015],
      ];
      const nerveSegs = plexusOffsets.map(([ou, od, r]) => {
        const mid = ARTERY_AT_RIB.clone().addScaledVector(f0.u, ou).addScaledVector(f0.d, od);
        const a = mid.clone().addScaledVector(ARTERY_TANGENT, -0.03).addScaledVector(f0.d, -0.004);
        const b = mid.clone().addScaledVector(ARTERY_TANGENT, 0.03).addScaledVector(f0.d, 0.003);
        const curve = new THREE.CatmullRomCurve3([a, mid, b]);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 12, false), M.get('nerve'));
        tube.castShadow = true;
        s.scene.add(tube);
        return { a, mid, b, r };
      });
      const segTmp = new THREE.Line3();
      const qTmp = new THREE.Vector3();
      const distToPolyline = (p: THREE.Vector3, pts: THREE.Vector3[]) => {
        let best = Infinity;
        for (let i = 0; i + 1 < pts.length; i++) {
          segTmp.set(pts[i], pts[i + 1]);
          segTmp.closestPointToPoint(p, true, qTmp);
          best = Math.min(best, qTmp.distanceTo(p));
        }
        return best;
      };
      const plexusCenter = ARTERY_AT_RIB.clone().addScaledVector(f0.u, 0.011).addScaledVector(f0.d, -0.004);
      const insidePlexus = (p: THREE.Vector3) => {
        if (p.distanceToSquared(plexusCenter) > 0.04 * 0.04) return false;
        for (const n of nerveSegs) if (distToPolyline(p, [n.a, n.mid, n.b]) < n.r) return true;
        return false;
      };

      // ── Schematic pleural dome (cervical pleura over the lung apex) ──
      const domeCenter = ARTERY_AT_RIB.clone().add(new THREE.Vector3(0.012, -0.041, -0.004));
      const domeRadii = new THREE.Vector3(0.042, 0.03, 0.032);
      // Only the upper half (the cupola) is drawn, faint, so it does not hide the vessels and rib.
      const domeMat = M.clone('pleura');
      domeMat.transparent = true;
      domeMat.opacity = 0.28;
      domeMat.depthWrite = false;
      domeMat.side = THREE.DoubleSide;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
      dome.renderOrder = 2;
      dome.scale.copy(domeRadii);
      dome.position.copy(domeCenter);
      s.scene.add(dome);
      const insideDome = (p: THREE.Vector3) => {
        const x = (p.x - domeCenter.x) / domeRadii.x;
        const y = (p.y - domeCenter.y) / domeRadii.y;
        const z = (p.z - domeCenter.z) / domeRadii.z;
        return x * x + y * y + z * z < 1;
      };

      // ── Skin patch, probe, beam plane with the live image, needle, local anaesthetic ──
      const skin = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12, 1, 1), M.get('skin'));
      s.scene.add(skin);

      const probe = new THREE.Group();
      const probeBody = new THREE.Mesh(new RoundedBoxGeometry(WIDTH_M + 0.008, 0.05, 0.014, 4, 0.004), M.get('plasticDark'));
      probeBody.position.y = 0.026;
      const lens = new THREE.Mesh(new RoundedBoxGeometry(WIDTH_M + 0.002, 0.004, 0.009, 2, 0.0015), M.get('plastic'));
      lens.position.y = 0.0015;
      probe.add(probeBody, lens);
      s.scene.add(probe);

      const usTexCanvas = document.createElement('canvas');
      const sim = new UltrasoundSimulator(200, 168);
      usTexCanvas.width = sim.cols;
      usTexCanvas.height = sim.rows;
      const usTex = new THREE.CanvasTexture(usTexCanvas);
      usTex.colorSpace = THREE.SRGBColorSpace;
      const beam = new THREE.Mesh(
        new THREE.PlaneGeometry(WIDTH_M, DEPTH_M),
        new THREE.MeshBasicMaterial({ map: usTex, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
      );
      s.scene.add(beam);

      const needleShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.00036, 0.00036, 1, 12), M.get('steel'));
      const needleHub = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0012, 0.008, 16), M.get('plastic'));
      s.scene.add(needleShaft, needleHub);

      const laMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), M.get('localAnaesthetic'));
      laMesh.visible = false;
      s.scene.add(laMesh);

      // Labels
      const L = (en: string, frL: string) => (fr ? frL : en);
      const addLabel = (anchor: THREE.Vector3, offset: THREE.Vector3, text: string, color: string) => {
        const l = createLabel({ anchor, offset, text, color });
        s.scene.add(l.group);
        labels.push(l);
      };
      const centerOf = (m?: THREE.Object3D) => (m ? new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()) : new THREE.Vector3());
      addLabel(ARTERY_AT_RIB.clone().addScaledVector(ARTERY_TANGENT, -0.02), new THREE.Vector3(-0.01, 0.022, 0.01), L('Subclavian artery', 'Artère subclavière'), '#f87171');
      if (meshes.subclavianVein) addLabel(centerOf(meshes.subclavianVein), new THREE.Vector3(-0.02, 0.012, 0.025), L('Subclavian vein', 'Veine subclavière'), '#60a5fa');
      if (meshes.clavicle) addLabel(centerOf(meshes.clavicle), new THREE.Vector3(-0.02, -0.015, 0.03), L('Clavicle', 'Clavicule'), '#e2e8f0');
      if (meshes.firstRib) addLabel(centerOf(meshes.firstRib).add(new THREE.Vector3(0, 0, -0.015)), new THREE.Vector3(-0.015, -0.025, -0.02), L('First rib', '1re côte'), '#e2e8f0');
      addLabel(nerveSegs[0].a.clone(), new THREE.Vector3(-0.012, 0.02, -0.02), L('Brachial plexus (schematic)', 'Plexus brachial (schéma)'), '#facc15');
      addLabel(domeCenter.clone().add(new THREE.Vector3(-0.02, 0.022, -0.02)), new THREE.Vector3(-0.02, -0.02, -0.02), L('Pleura / lung apex (schematic)', 'Plèvre / apex pulmonaire (schéma)'), '#f472b6');

      // Tissue lists for the simulator
      const meshTissues: MeshTissue[] = [];
      const labelNames: (string | null)[] = [];
      for (const [key, mesh] of Object.entries(meshes)) {
        const spec = MESH_SPEC[key];
        if (!spec?.tissue) continue;
        meshTissues.push({ mesh, tissue: spec.tissue, priority: spec.priority ?? 5 });
        labelNames.push(spec.label ? L(...spec.label) : null);
      }
      let laCenter = new THREE.Vector3();
      let laRadii = new THREE.Vector3(1e-6, 1e-6, 1e-6);
      const analytic: AnalyticTissue[] = [
        {
          tissue: 'nerve',
          priority: 7,
          inside: insidePlexus,
        },
        { tissue: 'air', priority: 4, inside: insideDome },
        {
          tissue: 'la',
          priority: 9,
          inside: (p) => {
            const x = (p.x - laCenter.x) / laRadii.x;
            const y = (p.y - laCenter.y) / laRadii.y;
            const z = (p.z - laCenter.z) / laRadii.z;
            return x * x + y * y + z * z < 1;
          },
        },
      ];
      labelNames.push(L('Brachial plexus', 'Plexus brachial'), L('Pleura', 'Plèvre'), L('Local anaesthetic', 'Anesthésique local'));

      const usCanvas = usRef.current;
      let usAccum = 0;
      let lastAlert: string | null = null;
      let lastVis = -1;
      setStatus('ready');

      s.onFrame(({ dt, time }) => {
        const u = ctrlRef.current;
        const frame = probeFrame(u.slideMm, u.tiltDeg, u.compression);
        const frameNoTilt = probeFrame(u.slideMm, 0, u.compression);

        // Probe pose: face on the skin, long axis along u, pointing along d.
        const basisM = new THREE.Matrix4().makeBasis(frame.u, frame.d.clone().negate(), frame.e);
        probe.quaternion.setFromRotationMatrix(basisM);
        probe.position.copy(frame.origin);
        skin.position.copy(frameNoTilt.origin).addScaledVector(frameNoTilt.d, 0.0004);
        skin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), frameNoTilt.d.clone().negate());

        beam.position.copy(frame.origin).addScaledVector(frame.d, DEPTH_M / 2);
        beam.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(frame.u, frame.d.clone().negate(), frame.e));
        beam.material.opacity = u.labels ? 0.9 : 0.75;

        // Vein compression and arterial pulsation (along probe axes)
        if (veinPivot) veinPivot.scale.set(1 + u.compression * 0.25, Math.max(0.12, 1 - u.compression * 0.85), 1);
        const pulse = 1 + 0.05 * Math.pow(Math.max(0, Math.sin(time * 7.2)), 4);
        if (arteryPivot) arteryPivot.scale.set(pulse, pulse, 1);

        // Needle: in-plane, from the posterior end of the probe, held in the untilted plane.
        const ang = THREE.MathUtils.degToRad(u.needleAngleDeg);
        const entry = frameNoTilt.origin.clone().addScaledVector(frameNoTilt.u, WIDTH_M / 2 + 0.004);
        const dir = frameNoTilt.u.clone().multiplyScalar(-Math.cos(ang)).addScaledVector(frameNoTilt.d, Math.sin(ang)).normalize();
        const hub = entry.clone().addScaledVector(dir, -0.012);
        const tip = entry.clone().addScaledVector(dir, u.needleAdvanceMm / 1000);
        const len = hub.distanceTo(tip);
        needleShaft.position.copy(hub).add(tip).multiplyScalar(0.5);
        needleShaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        needleShaft.scale.set(1, len, 1);
        needleHub.position.copy(hub).addScaledVector(dir, -0.004);
        needleHub.quaternion.copy(needleShaft.quaternion);

        // Local anaesthetic spreads around the tip, elongated along the plexus sheath.
        if (u.laMl > 0) {
          const a = Math.cbrt((3 * u.laMl * 1e-6) / (8 * Math.PI)); // V = 4/3·π·(2a)·a·a
          laCenter = tip.clone();
          laMesh.visible = true;
          laMesh.position.copy(laCenter);
          laMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), ARTERY_TANGENT);
          laMesh.scale.set(2 * a, a, a);
          laRadii = new THREE.Vector3(a, a, a); // simulator test uses a sphere of the short radius
        } else {
          laMesh.visible = false;
          laRadii = new THREE.Vector3(1e-6, 1e-6, 1e-6);
        }

        // Safety: where is the tip?
        let msg: string | null = null;
        if (meshes.subclavianArtery && pointInMesh(tip, meshes.subclavianArtery))
          msg = fr ? 'PONCTION ARTÉRIELLE (artère subclavière) — retirer ; ne pas injecter (risque de LAST).' : 'ARTERIAL PUNCTURE (subclavian artery) — withdraw; do not inject (LAST risk).';
        else if (meshes.subclavianVein && pointInMesh(tip, meshes.subclavianVein))
          msg = fr ? 'Ponction veineuse (veine subclavière) — retirer.' : 'Venous puncture (subclavian vein) — withdraw.';
        else if (insideDome(tip))
          msg = fr ? 'PLÈVRE FRANCHIE — risque de pneumothorax. Retirer immédiatement.' : 'PLEURA BREACHED — pneumothorax risk. Withdraw immediately.';
        else if (nerveSegs.some((n) => distToPolyline(tip, [n.a, n.mid, n.b]) < n.r * 0.8))
          msg = fr ? 'Pointe intraneurale probable — ne pas injecter contre résistance.' : 'Tip probably intraneural — do not inject against resistance.';
        else if (meshes.firstRib && pointInMesh(tip, meshes.firstRib)) msg = fr ? 'Contact osseux (1re côte).' : 'Bone contact (first rib).';
        if (msg !== lastAlert) {
          lastAlert = msg;
          setAlert(msg);
        }

        // Ultrasound at ~30 Hz
        usAccum += dt;
        if (usAccum < 1 / 30) return;
        usAccum = 0;
        const out = sim.render(frame, meshTissues, analytic, { hub, tip, visible: true }, { widthM: WIDTH_M, depthM: DEPTH_M, freqMHz: FREQ_MHZ, gainDb: u.gainDb, time }, (k) => labelNames[k] ?? null);
        const tctx = usTexCanvas.getContext('2d');
        tctx?.putImageData(out.image, 0, 0);
        usTex.needsUpdate = true;
        drawDisplay(usCanvas, usTexCanvas, out.centroids, out.cols, out.rows, u.labels, fr);
        const vis = Math.round(out.needleVisibility * 100) / 100;
        if (vis !== lastVis) {
          lastVis = vis;
          setNeedleVis(vis);
        }
      });
    });

    return () => {
      cancelled = true;
      stageRef.current = null;
      stage?.dispose();
    };
  }, [fr]);

  useEffect(() => {
    stageRef.current?.setLabelsVisible(c.labels);
  }, [c.labels]);

  const set = <K extends keyof Controls>(k: K, v: Controls[K]) => setC((p) => ({ ...p, [k]: v }));
  const slider = (k: keyof Controls, label: string, min: number, max: number, step: number, unit: string, accent = 'text-slate-200') => (
    <label className="block">
      <div className="flex justify-between text-[11px]">
        <span>{label}</span>
        <span className={`font-mono ${accent}`}>
          {c[k] as number}
          {unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={c[k] as number} onChange={(e) => set(k, parseFloat(e.target.value) as never)} className="w-full" />
    </label>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      <section className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-[#05080f] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-[#0b1220] border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-cyan-300">{fr ? 'Anatomie 3D réelle — région supraclaviculaire droite' : 'Real 3D anatomy — right supraclavicular region'}</span>
            <div className="flex gap-1">
              <button onClick={() => stageRef.current?.rig.flyTo('probe')} className="px-1.5 py-0.5 rounded border border-slate-700 hover:border-cyan-500 text-[10px] cursor-pointer">
                {fr ? 'Vue sonde' : 'Probe view'}
              </button>
              <button onClick={() => stageRef.current?.rig.reset()} className="px-1.5 py-0.5 rounded border border-slate-700 hover:border-cyan-500 cursor-pointer" aria-label="Reset view">
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div ref={viewRef} className="w-full h-[360px] touch-none relative">
            {status !== 'ready' && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 pointer-events-none">
                {status === 'loading' ? (fr ? 'Chargement de l’anatomie…' : 'Loading anatomy…') : fr ? 'Modèle anatomique introuvable.' : 'Anatomy model could not be loaded.'}
              </div>
            )}
          </div>
          {alert && (
            <div className="px-3 py-1.5 bg-rose-950/90 border-t border-rose-500 text-[11px] font-bold text-rose-200 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
              {alert}
            </div>
          )}
          <div className="px-3 py-1 text-[9px] text-slate-500 border-t border-slate-800">{ANATOMY_CREDIT}. {fr ? 'Plexus et dôme pleural : schématiques.' : 'Plexus and pleural dome: schematic.'}</div>
        </div>

        <div className="bg-black border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-[#0b1220] border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5 text-cyan-400" /> {fr ? 'Image échographique calculée (linéaire 12 MHz)' : 'Computed ultrasound image (linear 12 MHz)'}
            </span>
            <button onClick={() => set('labels', !c.labels)} className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
              {c.labels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} Labels
            </button>
          </div>
          <canvas ref={usRef} className="w-full h-[360px] block bg-black" />
          <div className="px-3 py-1.5 bg-[#0b1220] border-t border-slate-800 text-[10px] text-slate-400 flex justify-between gap-2">
            <span>{fr ? 'Ombre osseuse, renforcement postérieur et lignes A sont calculés, pas dessinés.' : 'Bone shadow, posterior enhancement and A-lines are computed, not drawn.'}</span>
            <span className={`font-mono shrink-0 ${needleVis > 0.5 ? 'text-emerald-300' : needleVis > 0.15 ? 'text-amber-300' : 'text-rose-300'}`}>
              {fr ? 'Aiguille' : 'Needle'} {Math.round(needleVis * 100)}%
            </span>
          </div>
        </div>
      </section>

      <aside className="lg:col-span-4 flex flex-col gap-3 text-xs">
        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">{fr ? 'Sonde' : 'Probe'}</h3>
          {slider('slideMm', fr ? 'Glissement le long de l’artère' : 'Slide along the artery', -14, 14, 1, ' mm')}
          {slider('tiltDeg', fr ? 'Bascule (sort l’aiguille du plan)' : 'Tilt (takes the needle out of plane)', -10, 10, 1, '°', 'text-amber-300')}
          {slider('compression', fr ? 'Compression (test veineux)' : 'Compression (vein test)', 0, 1, 0.05, '')}
          {slider('gainDb', fr ? 'Gain' : 'Gain', -12, 12, 1, ' dB')}
        </div>
        <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">{fr ? 'Aiguille (dans le plan, postéro-latérale)' : 'Needle (in-plane, from posterolateral)'}</h3>
          {slider('needleAngleDeg', fr ? 'Angle avec la peau' : 'Angle to the skin', 10, 60, 1, '°')}
          {slider('needleAdvanceMm', fr ? 'Progression' : 'Advance', 0, 45, 0.5, ' mm', 'text-cyan-300')}
          {slider('laMl', fr ? 'Injection d’anesthésique local' : 'Local anaesthetic injected', 0, 20, 1, ' mL', 'text-cyan-300')}
          <p className="text-[10px] text-slate-400 leading-relaxed">
            {fr
              ? 'Une aiguille raide renvoie moins d’écho vers la sonde (réflexion spéculaire) ; une bascule de quelques degrés la sort du faisceau fin.'
              : 'A steep needle returns less echo to the probe (specular reflection); a few degrees of tilt moves it out of the thin beam.'}
          </p>
        </div>
      </aside>
    </div>
  );
}

function drawDisplay(
  canvas: HTMLCanvasElement | null,
  src: HTMLCanvasElement,
  centroids: Partial<Record<string, { x: number; y: number; n: number }>>,
  cols: number,
  rows: number,
  labels: boolean,
  fr: boolean
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  // Keep the true aspect ratio (38 mm × 40 mm).
  const scale = Math.min((w - 34) / WIDTH_M, (h - 10) / DEPTH_M);
  const iw = WIDTH_M * scale;
  const ih = DEPTH_M * scale;
  const ox = (w - 28 - iw) / 2;
  const oy = 5;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, ox, oy, iw, ih);

  // Depth scale (cm) on the right
  ctx.strokeStyle = '#64748b';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px ui-monospace, monospace';
  for (let mm = 0; mm <= DEPTH_M * 1000; mm += 5) {
    const y = oy + (mm / 1000) * scale;
    const major = mm % 10 === 0;
    ctx.beginPath();
    ctx.moveTo(ox + iw + 3, y);
    ctx.lineTo(ox + iw + (major ? 10 : 6), y);
    ctx.stroke();
    if (major && mm > 0) ctx.fillText(`${mm / 10}`, ox + iw + 12, y + 3);
  }
  ctx.fillText('cm', ox + iw + 12, oy + 10);
  // Orientation marker
  ctx.fillStyle = '#22d3ee';
  ctx.beginPath();
  ctx.arc(ox + iw - 8, oy + 8, 3.5, 0, Math.PI * 2);
  ctx.fill();

  if (labels) {
    ctx.font = '600 10px Inter, system-ui, sans-serif';
    const colors: Record<string, string> = {};
    for (const [name, cc] of Object.entries(centroids)) {
      if (!cc || cc.n < 25) continue;
      const x = ox + (cc.x / cols) * iw;
      const y = oy + (cc.y / rows) * ih;
      const col = colors[name] ?? (/(artery|artère)/i.test(name) ? '#f87171' : /(vein|veine)/i.test(name) ? '#60a5fa' : /plexus/i.test(name) ? '#fde047' : /(pleura|plèvre)/i.test(name) ? '#f472b6' : /(anaesthetic|anesthésique)/i.test(name) ? '#22d3ee' : '#e2e8f0');
      const tw = ctx.measureText(name).width;
      ctx.fillStyle = 'rgba(2,6,23,0.7)';
      ctx.fillRect(x - tw / 2 - 3, y - 18, tw + 6, 13);
      ctx.fillStyle = col;
      ctx.fillText(name, x - tw / 2, y - 8);
    }
    ctx.fillStyle = '#64748b';
    ctx.fillText(fr ? '← antérieur   postérieur →' : '← anterior   posterior →', ox + 4, oy + ih - 4);
  }
}
