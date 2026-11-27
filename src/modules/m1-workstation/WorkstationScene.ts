import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createStage, type Stage } from '../../engine/createStage';
import { loadAnatomy } from '../../engine/loadAnatomy';
import { createLabel, type AnatomyLabel } from '../../engine/labels';
import {
  REGIONAL_GAS_STANDARDS,
  VOLATILE_AGENTS,
  type GasStandardId,
  type VolatileAgentId,
} from '../../standards/clinicalStandards';
import type {
  MachineAndPatientParams,
  SimulationSnapshot,
  VentilatorDriveType,
} from '../../physics/circuitLungKernel';

/**
 * M1 anaesthesia workstation, drawn on the shared stage (image-based light, soft shadows, bloom,
 * adaptive quality). Geometry is procedural but follows the real parts: Thorpe flowmeter tubes
 * with floats, Bourdon pipeline gauges, a dial vaporizer, accordion bellows in a graduated
 * housing, corrugated breathing limbs, a granular CO₂ absorber, a lathe-turned reservoir bag and
 * the BodyParts3D tracheobronchial tree (CC BY) inside lungs fitted to it.
 * Everything that moves reads the physics snapshot; nothing here computes physiology.
 */

interface ParticleState {
  segment: 'fgf' | 'insp' | 'exp' | 'return';
  t: number;
  speedOffset: number;
  radialJitter: THREE.Vector3;
}

type GasKey = 'o2' | 'air' | 'n2o';

const SODA_FRESH = new THREE.Color(0xf1f5f9);
const SODA_EXHAUSTED = new THREE.Color(0x7e22ce);
const O2_COLOR = new THREE.Color(0x38bdf8);
const CO2_COLOR = new THREE.Color(0xf43f5e);
const ARGON_COLOR = new THREE.Color(0xc084fc);

const BAY = new THREE.Vector3(-1.25, 0.55, 0);
const ABSORBER = new THREE.Vector3(0.32, -0.92, 0);
const TRACHEA_TOP = new THREE.Vector3(3.75, 0.55, 0);
const AIRWAY_SCALE = 7.5; // model metres → scene units (patient drawn at ~2/3 of circuit scale so both fit the view)

// ── Geometry helpers ────────────────────────────────────────────────────────

/** Tube whose radius ripples along its length: corrugated breathing-circuit hose. */
function corrugatedTube(curve: THREE.Curve<THREE.Vector3>, radius: number, pitch: number, depth: number, radial = 14): THREE.BufferGeometry {
  const len = curve.getLength();
  const tubular = Math.max(32, Math.ceil((len / pitch) * 6));
  const geo = new THREE.TubeGeometry(curve, tubular, radius, radial, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const c = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular;
    curve.getPointAt(u, c);
    const k = 1 + depth * Math.sin(((u * len) / pitch) * Math.PI * 2);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      p.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(k).add(c);
      pos.setXYZ(idx, p.x, p.y, p.z);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/** Accordion bellows, base at y = 0 (or top at y = 0 when `hanging`), closed at the far end. */
function bellowsGeometry(rOuter: number, rInner: number, height: number, folds: number, hanging: boolean): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = folds * 10;
  const sign = hanging ? -1 : 1;
  pts.push(new THREE.Vector2(0.001, 0));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = rInner + (rOuter - rInner) * (0.5 - 0.5 * Math.cos(t * folds * Math.PI * 2));
    pts.push(new THREE.Vector2(r, sign * t * height));
  }
  pts.push(new THREE.Vector2(rInner * 0.98, sign * height * 1.005));
  pts.push(new THREE.Vector2(0.001, sign * height * 1.005));
  if (hanging) pts.reverse();
  return new THREE.LatheGeometry(pts, 48);
}

/** Rebreathing bag: neck at y = 0, bulb hanging below. */
function bagGeometry(size: number): THREE.BufferGeometry {
  const prof: [number, number][] = [
    [0.085, 0], [0.09, -0.04], [0.075, -0.09], [0.08, -0.16], [0.15, -0.24], [0.27, -0.34], [0.37, -0.48],
    [0.42, -0.64], [0.43, -0.8], [0.4, -0.96], [0.32, -1.1], [0.2, -1.2], [0.08, -1.25], [0.001, -1.26],
  ];
  const pts = prof.map(([r, y]) => new THREE.Vector2(r * size, y * size));
  return new THREE.LatheGeometry(pts.reverse(), 40);
}

/** Cylinder with a ridged (knurled) rim, for control knobs. */
function knurledCylinder(r: number, h: number, ridges: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(r, r, h, ridges * 4, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const rr = Math.hypot(x, z);
    if (rr < r * 0.5) continue;
    const a = Math.atan2(z, x);
    const k = 1 + 0.045 * Math.sign(Math.sin(a * ridges));
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Lung envelope: unit sphere with a flattened mediastinal face, concave diaphragmatic base and narrow apex. */
function lungGeometry(side: 'left' | 'right'): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 48, 32);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const medial = side === 'right' ? 1 : -1; // right lung sits at −x; its medial face points +x
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    if (x * medial > 0) x *= 0.5;
    if (y > 0) {
      const k = 1 - 0.42 * y;
      x *= k;
      z *= k;
    } else {
      const r = Math.min(1, Math.hypot(x, z));
      y *= 0.5 + 0.5 * r;
    }
    if (z < 0) z *= 1.1; // deeper posteriorly
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function gaugeFaceTexture(label: string, ring: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f8fafc';
  g.beginPath();
  g.arc(128, 128, 124, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 10;
  g.strokeStyle = ring;
  g.beginPath();
  g.arc(128, 128, 118, 0, Math.PI * 2);
  g.stroke();
  // 270° scale with a green operating band (no numbers: the needle is qualitative)
  const a0 = Math.PI * 0.75;
  const a1 = Math.PI * 2.25;
  g.lineWidth = 14;
  g.strokeStyle = '#22c55e';
  g.beginPath();
  g.arc(128, 128, 92, a0 + (a1 - a0) * 0.5, a0 + (a1 - a0) * 0.72);
  g.stroke();
  g.strokeStyle = '#0f172a';
  for (let i = 0; i <= 20; i++) {
    const a = a0 + ((a1 - a0) * i) / 20;
    const r0 = i % 5 === 0 ? 74 : 82;
    g.lineWidth = i % 5 === 0 ? 4 : 2;
    g.beginPath();
    g.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0);
    g.lineTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100);
    g.stroke();
  }
  g.fillStyle = '#0f172a';
  g.font = 'bold 34px Inter, system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText(label, 128, 190);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── Scene ───────────────────────────────────────────────────────────────────

export class WorkstationScene {
  private container: HTMLElement;
  private stage: Stage | null = null;
  private root = new THREE.Group();
  private unsubFrame: (() => void) | null = null;
  private disposed = false;
  private fr = true;

  // Peel-away outer shell
  private shellMaterials: THREE.MeshStandardMaterial[] = [];
  private shellWireframe: THREE.LineSegments | null = null;

  // Clinical colour materials
  private o2PipeMat!: THREE.MeshStandardMaterial;
  private airPipeMat!: THREE.MeshStandardMaterial;
  private n2oPipeMat!: THREE.MeshStandardMaterial;
  private wagdPipeMat!: THREE.MeshStandardMaterial;
  private vaporizerCollarMat!: THREE.MeshStandardMaterial;
  private vaporizerLiquidMat!: THREE.MeshStandardMaterial;
  private sodaLimeMat!: THREE.MeshStandardMaterial;
  private fgdIndicatorMat!: THREE.MeshStandardMaterial;
  private scavengingBagMat!: THREE.MeshStandardMaterial;
  private bronchusMat!: THREE.MeshStandardMaterial;
  private gaugeRings: Record<GasKey, THREE.MeshStandardMaterial> = {} as Record<GasKey, THREE.MeshStandardMaterial>;

  // Mechanics
  private driveGroups = {} as Record<VentilatorDriveType, THREE.Group>;
  private ascendingBellowsMesh!: THREE.Mesh;
  private descendingBellowsMesh!: THREE.Mesh;
  private pistonHeadMesh!: THREE.Group;
  private turbineBladeGroup!: THREE.Group;
  private vriGasFrontMesh!: THREE.Mesh;
  private glostaventLedMat!: THREE.MeshStandardMaterial;
  private inspValveDisc!: THREE.Mesh;
  private expValveDisc!: THREE.Mesh;
  private inspValveMat!: THREE.MeshStandardMaterial;
  private expValveMat!: THREE.MeshStandardMaterial;
  private manualBagMesh!: THREE.Mesh;
  private aplKnobMesh!: THREE.Mesh;
  private scavengingBagMesh!: THREE.Mesh;
  private vapDial!: THREE.Group;
  private bobbins: { mesh: THREE.Mesh; gas: GasKey; y0: number; h: number }[] = [];
  private needles: { pivot: THREE.Object3D; gas: GasKey; a: number }[] = [];
  private granules: THREE.InstancedMesh | null = null;
  private granuleDepth: Float32Array = new Float32Array(0);
  private lastExhaustion = -1;

  // Lungs and airway
  private leftLungFast!: THREE.Mesh;
  private rightLungSlow!: THREE.Mesh;
  private lungBase = { left: new THREE.Vector3(0.45, 0.8, 0.45), right: new THREE.Vector3(0.48, 0.8, 0.47) };
  private fallbackAirway: THREE.Mesh[] = [];
  private treeMat: THREE.MeshStandardMaterial | null = null;

  // Ventilator screen
  private screen: {
    canvas: HTMLCanvasElement;
    g: CanvasRenderingContext2D;
    tex: THREE.CanvasTexture;
    x: number;
    prev: [number, number] | null;
    acc: number;
    numAcc: number;
    peak: number;
    peakShown: number;
    wasInsp: boolean;
  } | null = null;

  // Particles
  private splines!: Record<'fgf' | 'insp' | 'exp' | 'return', THREE.CatmullRomCurve3>;
  private particleMesh!: THREE.InstancedMesh;
  private particles: ParticleState[] = [];
  private dummyObj = new THREE.Object3D();
  private tmpPos = new THREE.Vector3();
  private tmpColor = new THREE.Color();
  private agentColor = new THREE.Color();

  // Labels
  private labels: { l: AnatomyLabel; fr: string; en: string }[] = [];

  private latestSnapshot: SimulationSnapshot | null = null;
  private latestParams: MachineAndPatientParams | null = null;
  private activeAgent: VolatileAgentId = 'sevoflurane';
  private xrayOpacity = 0.72;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public async init(
    initialGasStandard: GasStandardId,
    initialAgent: VolatileAgentId,
    initialDrive: VentilatorDriveType
  ): Promise<{ tier: string; backend: string } | null> {
    this.activeAgent = initialAgent;
    const stage = await createStage({
      container: this.container,
      background: '#070b14',
      fov: 42,
      near: 0.1,
      far: 80,
      home: { position: [0.3, 2.3, 9.8], target: [0.15, 0.15, 0] },
      controls: { minDistance: 3.0, maxDistance: 17, maxPolarAngle: Math.PI * 0.82 },
      bloom: { strength: 0.22, radius: 0.45, threshold: 0.95 },
      shadows: true,
      envIntensity: 0.75,
      labels: true,
    });
    // React StrictMode or a quick module switch can dispose us while the stage boots.
    if (this.disposed) {
      stage.dispose();
      return null;
    }
    this.stage = stage;
    stage.scene.add(this.root);
    // Portrait or narrow viewports (phones): back the camera off so the whole machine and patient fit.
    const aspect = this.container.clientWidth / Math.max(1, this.container.clientHeight);
    if (aspect < 1.35) {
      const target = new THREE.Vector3(0.15, 0.15, 0);
      stage.camera.position.sub(target).multiplyScalar(Math.min(1.7, 1.35 / aspect)).add(target);
      stage.controls?.update();
    }
    stage.scene.fog = new THREE.Fog('#070b14', 16, 34);

    this.setupLighting(stage);
    this.buildWorkstationAndCircuit(stage);
    this.buildLungs(stage);
    this.buildScreen();
    this.buildInstancedParticles(stage.budget.maxGasParticles);
    this.buildLabels();
    this.setGasStandard(initialGasStandard);
    this.setVolatileAgent(initialAgent);
    this.setDriveType(initialDrive);
    this.setXrayLevel(this.xrayOpacity);
    this.enableShadows(this.root);

    this.unsubFrame = stage.onFrame(({ dt }) => this.frame(dt));
    void this.loadAirway(stage);

    return { tier: stage.tier, backend: stage.budget.backend };
  }

  // ── Build ────────────────────────────────────────────────────────────────

  private setupLighting(stage: Stage): void {
    const key = stage.keyLight;
    key.position.set(3.5, 8, 6.5);
    const cam = key.shadow.camera;
    cam.left = -7;
    cam.right = 7;
    cam.top = 6;
    cam.bottom = -6;
    cam.near = 1;
    cam.far = 26;
    cam.updateProjectionMatrix();

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(16, 64),
      new THREE.MeshStandardMaterial({ color: 0x0c1320, roughness: 0.9, metalness: 0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.62;
    floor.receiveShadow = true;
    floor.userData.noCast = true;
    this.root.add(floor);
    const grid = new THREE.GridHelper(20, 40, 0x1b2538, 0x131b2b);
    grid.position.y = -2.612;
    const gm = grid.material as THREE.Material;
    gm.transparent = true;
    gm.opacity = 0.45;
    this.root.add(grid);
  }

  private buildWorkstationAndCircuit(stage: Stage): void {
    const M = stage.materials;
    const glassMat = M.get('glass');
    const steel = M.get('steel');
    const darkPlastic = M.get('plasticDark');
    const whitePlastic = M.get('plastic');
    const rubberMat = new THREE.MeshPhysicalMaterial({ color: 0x1f2937, roughness: 0.62, sheen: 0.5, sheenColor: new THREE.Color(0x64748b) });

    // ── 1. Chassis (peel-away shell) ─────────────────────────────────────
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0xdfe4ea,
      roughness: 0.42,
      metalness: 0.05,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this.shellMaterials.push(shellMat);
    const chassisGeo = new RoundedBoxGeometry(5.2, 4.1, 2.35, 4, 0.14);
    const chassis = new THREE.Mesh(chassisGeo, shellMat);
    chassis.position.set(-1.35, -0.25, 0);
    this.root.add(chassis);
    this.shellWireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(5.2, 4.1, 2.35)),
      new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.3 })
    );
    this.shellWireframe.position.copy(chassis.position);
    this.root.add(this.shellWireframe);

    // Drawer fronts (part of the shell) with steel pulls
    for (const y of [-1.25, -1.85]) {
      const drawer = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.52, 0.06, 2, 0.03), shellMat);
      drawer.position.set(-2.55, y, 1.2);
      this.root.add(drawer);
      const pull = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.5, 4, 8), steel);
      pull.rotation.z = Math.PI / 2;
      pull.position.set(-2.55, y + 0.12, 1.26);
      this.root.add(pull);
    }

    // Work shelf and base with castors
    const shelf = new THREE.Mesh(new RoundedBoxGeometry(5.6, 0.12, 2.7, 2, 0.05), darkPlastic);
    shelf.position.set(-1.35, 1.86, 0.08);
    this.root.add(shelf);
    const plinth = new THREE.Mesh(new RoundedBoxGeometry(5.4, 0.25, 2.55, 2, 0.06), darkPlastic);
    plinth.position.set(-1.35, -2.22, 0);
    this.root.add(plinth);
    for (const [x, z] of [[-3.75, 1.05], [1.05, 1.05], [-3.75, -1.05], [1.05, -1.05]]) {
      const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10), steel);
      fork.position.set(x, -2.4, z);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 20), rubberMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, -2.49, z);
      this.root.add(fork, wheel);
    }
    // Side handles
    for (const x of [-4.08, 1.38]) {
      const handle = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(x * 0.985, 1.55, 0.9),
            new THREE.Vector3(x, 1.55, 0.75),
            new THREE.Vector3(x, 1.55, -0.75),
            new THREE.Vector3(x * 0.985, 1.55, -0.9),
          ]),
          24,
          0.035,
          8
        ),
        steel
      );
      this.root.add(handle);
    }

    // ── 2. Pipeline supply: hoses, inlets and Bourdon gauges ──────────────
    this.o2PipeMat = new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.35, clearcoat: 0.4 });
    this.airPipeMat = new THREE.MeshPhysicalMaterial({ color: 0x111827, roughness: 0.35, clearcoat: 0.4 });
    this.n2oPipeMat = new THREE.MeshPhysicalMaterial({ color: 0x2563eb, roughness: 0.35, clearcoat: 0.4 });
    this.wagdPipeMat = new THREE.MeshPhysicalMaterial({ color: 0xeab308, roughness: 0.4, clearcoat: 0.3 });
    const pipeMats: Record<GasKey, THREE.MeshStandardMaterial> = { o2: this.o2PipeMat, air: this.airPipeMat, n2o: this.n2oPipeMat };
    const inletZ: Record<GasKey, number> = { o2: 0.55, air: 0, n2o: -0.55 };
    (Object.keys(inletZ) as GasKey[]).forEach((gas, i) => {
      const z = inletZ[gas];
      const hose = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(-4.05, 0.15, z),
            new THREE.Vector3(-4.55, -0.2, z),
            new THREE.Vector3(-4.85, -1.6, z * 1.2),
            new THREE.Vector3(-5.2, -2.5, z * 1.5 - 0.3),
            new THREE.Vector3(-6.6, -2.56, z * 2 - 1.2 - i * 0.2),
          ]),
          60,
          0.065,
          12
        ),
        pipeMats[gas]
      );
      const fitting = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 6), steel);
      fitting.rotation.z = Math.PI / 2;
      fitting.position.set(-4.02, 0.15, z);
      this.root.add(hose, fitting);
    });

    const gaugeX: Record<GasKey, number> = { n2o: -3.55, air: -3.15, o2: -2.75 };
    const gaugeLabel: Record<GasKey, string> = { o2: 'O₂', air: 'AIR', n2o: 'N₂O' };
    (Object.keys(gaugeX) as GasKey[]).forEach((gas) => {
      const g = new THREE.Group();
      g.position.set(gaugeX[gas], 1.47, 1.2);
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 32), steel);
      bezel.rotation.x = Math.PI / 2;
      const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
      this.gaugeRings[gas] = ringMat;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 8, 32), ringMat);
      ring.position.z = 0.03;
      const face = new THREE.Mesh(
        new THREE.CircleGeometry(0.15, 32),
        new THREE.MeshBasicMaterial({ map: gaugeFaceTexture(gaugeLabel[gas], '#94a3b8'), toneMapped: false })
      );
      face.position.z = 0.032;
      const pivot = new THREE.Group();
      pivot.position.z = 0.04;
      const needle = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.12, 0.006), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
      needle.position.y = 0.05;
      pivot.add(needle);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 12), darkPlastic);
      hub.rotation.x = Math.PI / 2;
      hub.position.z = 0.045;
      g.add(bezel, ring, face, pivot, hub);
      this.root.add(g);
      this.needles.push({ pivot, gas, a: 0 });
    });

    // ── 3. Flowmeter bank (Thorpe tubes, O₂ furthest downstream) ─────────
    const fmBack = new THREE.Mesh(new RoundedBoxGeometry(1.3, 1.05, 0.08, 2, 0.03), darkPlastic);
    fmBack.position.set(-3.15, 0.68, 1.17);
    this.root.add(fmBack);
    const tubeGlass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.28, clearcoat: 1, depthWrite: false });
    (Object.keys(gaugeX) as GasKey[]).forEach((gas) => {
      const x = gaugeX[gas];
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.82, 20, 1, true), tubeGlass);
      tube.position.set(x, 0.72, 1.25);
      const capT = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 16), steel);
      capT.position.set(x, 1.15, 1.25);
      const capB = capT.clone();
      capB.position.y = 0.29;
      // Graduations
      for (let k = 0; k <= 6; k++) {
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.006, 0.004), whitePlastic);
        tick.position.set(x + 0.09, 0.34 + k * 0.125, 1.22);
        this.root.add(tick);
      }
      const bob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), gas === 'o2' ? steel : M.get('steel'));
      bob.position.set(x, 0.36, 1.25);
      this.bobbins.push({ mesh: bob, gas, y0: 0.36, h: 0.74 });
      // Colour-coded flow-control knob (O₂ knob is fluted in real machines)
      const knob = new THREE.Mesh(knurledCylinder(0.075, 0.11, gas === 'o2' ? 10 : 18), pipeMats[gas]);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(x, 0.12, 1.28);
      this.root.add(tube, capT, capB, bob, knob);
    });

    // ── 4. Vaporizer on the back bar (dial, ISO 5360 collar, sight glass) ─
    const vap = new THREE.Group();
    vap.position.set(-3.0, 1.92, 0.15);
    const vapBody = new THREE.Mesh(new RoundedBoxGeometry(0.78, 1.05, 0.72, 3, 0.08), M.get('steel'));
    vapBody.position.y = 0.55;
    this.vaporizerCollarMat = new THREE.MeshPhysicalMaterial({ color: 0xfacc15, roughness: 0.3, clearcoat: 0.6 });
    const collar = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.16, 0.74, 2, 0.05), this.vaporizerCollarMat);
    collar.position.y = 0.78;
    this.vapDial = new THREE.Group();
    this.vapDial.position.y = 1.12;
    const dial = new THREE.Mesh(knurledCylinder(0.3, 0.16, 36), whitePlastic);
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.18), this.vaporizerCollarMat);
    marker.position.set(0, 0.085, 0.17);
    this.vapDial.add(dial, marker);
    const release = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.08), darkPlastic);
    release.position.set(0.2, 1.1, 0.25);
    this.vaporizerLiquidMat = new THREE.MeshPhysicalMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.25, roughness: 0.05, transparent: true, opacity: 0.8 });
    const sight = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.42, 0.03, 2, 0.01), this.vaporizerLiquidMat);
    sight.position.set(-0.2, 0.32, 0.365);
    const sightFrame = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.5, 0.02, 2, 0.01), darkPlastic);
    sightFrame.position.set(-0.2, 0.36, 0.355);
    const filler = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 16), this.vaporizerCollarMat);
    filler.rotation.x = Math.PI / 2;
    filler.position.set(0.18, 0.25, 0.4);
    vap.add(vapBody, collar, this.vapDial, release, sightFrame, sight, filler);
    this.root.add(vap);

    // ── 5. Ventilator drive bay (only the active drive is visible) ────────
    const housingGlass = glassMat;
    const housing = (r: number, h: number) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40, 1, true), housingGlass));
      for (let k = 1; k <= 5; k++) {
        const tick = new THREE.Mesh(new THREE.TorusGeometry(r + 0.004, 0.004, 4, 40, 0.5), whitePlastic);
        tick.rotation.set(Math.PI / 2, 0, Math.PI / 2 - 0.25);
        tick.position.y = -h / 2 + (k * h) / 6;
        g.add(tick);
      }
      return g;
    };
    const bellowsMat = new THREE.MeshPhysicalMaterial({ color: 0x9fb7cf, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0xdbeafe), side: THREE.DoubleSide });

    const asc = new THREE.Group();
    asc.position.copy(BAY);
    const ascBase = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.7, 0.14, 40), darkPlastic);
    ascBase.position.y = -0.9;
    this.ascendingBellowsMesh = new THREE.Mesh(bellowsGeometry(0.5, 0.42, 1.55, 11, false), bellowsMat);
    this.ascendingBellowsMesh.position.y = -0.83;
    asc.add(housing(0.62, 1.75), ascBase, this.ascendingBellowsMesh);
    this.root.add(asc);
    this.driveGroups.ascending_bellows = asc;

    const desc = new THREE.Group();
    desc.position.copy(BAY);
    const descTop = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.68, 0.14, 40), darkPlastic);
    descTop.position.y = 0.9;
    const descBellowsMat = bellowsMat.clone();
    descBellowsMat.color.set(0xd6c58a);
    this.descendingBellowsMesh = new THREE.Mesh(bellowsGeometry(0.5, 0.42, 1.55, 11, true), descBellowsMat);
    this.descendingBellowsMesh.position.y = 0.83;
    const weight = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 8, 32), steel);
    weight.rotation.x = Math.PI / 2;
    this.descendingBellowsMesh.add(weight);
    weight.position.y = -1.5;
    desc.add(housing(0.62, 1.75), descTop, this.descendingBellowsMesh);
    this.root.add(desc);
    this.driveGroups.descending_bellows = desc;

    const piston = new THREE.Group();
    piston.position.copy(BAY);
    this.pistonHeadMesh = new THREE.Group();
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.18, 40), steel);
    const seal = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 8, 40), rubberMat);
    seal.rotation.x = Math.PI / 2;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 12), steel);
    rod.position.y = -0.65;
    this.pistonHeadMesh.add(head, seal, rod);
    const motor = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.45, 0.6, 2, 0.05), darkPlastic);
    motor.position.y = -1.1;
    this.fgdIndicatorMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 0.6 });
    const fgd = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.26, 0.42, 2, 0.04), this.fgdIndicatorMat);
    fgd.position.set(0.72, 0.55, 0);
    piston.add(housing(0.56, 1.7), this.pistonHeadMesh, motor, fgd);
    this.root.add(piston);
    this.driveGroups.piston_fgd = piston;

    const turbine = new THREE.Group();
    turbine.position.copy(BAY);
    const volute = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.16, 16, 48), M.get('glass'));
    const backPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.04, 40), darkPlastic);
    backPlate.rotation.x = Math.PI / 2;
    backPlate.position.z = -0.14;
    this.turbineBladeGroup = new THREE.Group();
    const hubT = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.2, 20), steel);
    hubT.rotation.x = Math.PI / 2;
    this.turbineBladeGroup.add(hubT);
    for (let i = 0; i < 11; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.16), steel);
      const a = (i / 11) * Math.PI * 2;
      blade.position.set(Math.cos(a) * 0.27, Math.sin(a) * 0.27, 0);
      blade.rotation.z = a - Math.PI / 2 + 0.5; // backward-curved impeller
      this.turbineBladeGroup.add(blade);
    }
    turbine.add(volute, backPlate, this.turbineBladeGroup);
    this.root.add(turbine);
    this.driveGroups.turbine = turbine;

    const vr = new THREE.Group();
    vr.position.copy(BAY);
    const channel = new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.7, 0.55, 3, 0.08), M.get('glass'));
    this.vriGasFrontMesh = new THREE.Mesh(
      new RoundedBoxGeometry(0.76, 0.85, 0.42, 2, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.45, transparent: true, opacity: 0.72 })
    );
    vr.add(channel, this.vriGasFrontMesh);
    this.root.add(vr);
    this.driveGroups.volume_reflector = vr;

    const glost = new THREE.Group();
    glost.position.copy(BAY);
    const conc = new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.45, 0.85, 3, 0.08), new THREE.MeshPhysicalMaterial({ color: 0x0f766e, roughness: 0.45, clearcoat: 0.4 }));
    conc.position.set(-0.08, -0.35, 0);
    this.glostaventLedMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.2 });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), this.glostaventLedMat);
    led.position.set(0.28, 0.2, 0.44);
    const resTube = new THREE.Mesh(corrugatedTube(new THREE.LineCurve3(new THREE.Vector3(-0.9, 0.62, 0), new THREE.Vector3(0.5, 0.62, 0)), 0.11, 0.06, 0.12), new THREE.MeshPhysicalMaterial({ color: 0x94a3b8, roughness: 0.5 }));
    glost.add(conc, led, resTube);
    this.root.add(glost);
    this.driveGroups.glostavent_drawover = glost;

    // ── 6. CO₂ absorber: clear canister, steel end caps, granules ─────────
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.3, 40, 1, true), glassMat);
    can.position.copy(ABSORBER);
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 40), steel);
    capTop.position.copy(ABSORBER).add(new THREE.Vector3(0, 0.69, 0));
    const capBot = capTop.clone();
    capBot.position.copy(ABSORBER).add(new THREE.Vector3(0, -0.69, 0));
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.38, 0.06), darkPlastic);
    latch.position.copy(ABSORBER).add(new THREE.Vector3(0.5, 0, 0));
    this.sodaLimeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.12, 32), this.sodaLimeMat);
    core.position.copy(ABSORBER);
    this.root.add(can, capTop, capBot, latch, core);
    const nGran = stage.tier === 'HIGH' ? 900 : stage.tier === 'MID' ? 450 : 0;
    if (nGran > 0) {
      core.scale.setScalar(0.92);
      const gm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.042, 0), new THREE.MeshStandardMaterial({ roughness: 0.85 }), nGran);
      this.granuleDepth = new Float32Array(nGran);
      for (let i = 0; i < nGran; i++) {
        const r = 0.43 * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        const y = (Math.random() - 0.5) * 1.12;
        this.dummyObj.position.set(ABSORBER.x + Math.cos(a) * r, ABSORBER.y + y, ABSORBER.z + Math.sin(a) * r);
        this.dummyObj.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        this.dummyObj.scale.setScalar(0.7 + Math.random() * 0.6);
        this.dummyObj.updateMatrix();
        gm.setMatrixAt(i, this.dummyObj.matrix);
        // Exhaled gas enters at the top, so the indicator front moves downward.
        this.granuleDepth[i] = (0.56 - y) / 1.12 + (Math.random() - 0.5) * 0.08;
        gm.setColorAt(i, SODA_FRESH);
      }
      this.granules = gm;
      this.root.add(gm);
    }

    // ── 7. Unidirectional valves: clear domes over discs ──────────────────
    const domeGeo = new THREE.SphereGeometry(0.28, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const discGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.02, 32);
    const valve = (pos: THREE.Vector3, color: number, emissive: number) => {
      const dome = new THREE.Mesh(domeGeo, glassMat);
      dome.position.copy(pos);
      const seat = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 10, 32), steel);
      seat.rotation.x = Math.PI / 2;
      seat.position.copy(pos).add(new THREE.Vector3(0, -0.02, 0));
      const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 32), darkPlastic);
      cage.position.copy(pos).add(new THREE.Vector3(0, -0.09, 0));
      const mat = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.35, roughness: 0.3 });
      const disc = new THREE.Mesh(discGeo, mat);
      disc.position.copy(pos).add(new THREE.Vector3(0, 0.02, 0));
      this.root.add(dome, seat, cage, disc);
      return { disc, mat };
    };
    const iv = valve(new THREE.Vector3(0.55, 0.88, 0.22), 0x38bdf8, 0x0284c7);
    this.inspValveDisc = iv.disc;
    this.inspValveMat = iv.mat;
    const ev = valve(new THREE.Vector3(0.55, 0.08, -0.22), 0xf97316, 0xea580c);
    this.expValveDisc = ev.disc;
    this.expValveMat = ev.mat;

    // ── 8. APL valve, reservoir bag, scavenging ───────────────────────────
    const apl = new THREE.Vector3(-0.35, -0.35, 1.3);
    const aplBody = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.2, 24), darkPlastic);
    aplBody.rotation.x = Math.PI / 2;
    aplBody.position.copy(apl).add(new THREE.Vector3(0, 0, -0.1));
    this.aplKnobMesh = new THREE.Mesh(knurledCylinder(0.2, 0.18, 20), new THREE.MeshPhysicalMaterial({ color: 0xe2e8f0, roughness: 0.35, clearcoat: 0.5 }));
    this.aplKnobMesh.rotation.x = Math.PI / 2;
    this.aplKnobMesh.position.copy(apl).add(new THREE.Vector3(0, 0, 0.06));
    const aplMark = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.02), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    aplMark.position.set(0, 0.09, 0.1);
    this.aplKnobMesh.add(aplMark);
    aplMark.rotation.x = -Math.PI / 2;
    this.root.add(aplBody, this.aplKnobMesh);

    const bagMount = new THREE.Vector3(-0.9, -0.7, 1.45);
    const bagArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 16), steel);
    bagArm.rotation.x = Math.PI / 2;
    bagArm.position.copy(bagMount).add(new THREE.Vector3(0, 0, -0.2));
    this.manualBagMesh = new THREE.Mesh(bagGeometry(0.95), new THREE.MeshPhysicalMaterial({ color: 0x1e293b, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color(0x475569), clearcoat: 0.15 }));
    this.manualBagMesh.position.copy(bagMount);
    this.root.add(bagArm, this.manualBagMesh);

    this.scavengingBagMat = new THREE.MeshPhysicalMaterial({ color: 0xeab308, roughness: 0.55, sheen: 0.4 });
    this.scavengingBagMesh = new THREE.Mesh(bagGeometry(0.62), this.scavengingBagMat);
    this.scavengingBagMesh.position.set(-2.35, -0.85, -0.75);
    const wagdHose = new THREE.Mesh(
      corrugatedTube(
        new THREE.CatmullRomCurve3([
          apl.clone().add(new THREE.Vector3(0, 0, -0.2)),
          new THREE.Vector3(-0.9, -0.5, 0.6),
          new THREE.Vector3(-1.8, -0.6, -0.2),
          new THREE.Vector3(-2.35, -0.85, -0.75),
        ]),
        0.055,
        0.045,
        0.14,
        10
      ),
      this.wagdPipeMat
    );
    this.root.add(this.scavengingBagMesh, wagdHose);

    // ── 9. Gas paths ─────────────────────────────────────────────────────
    this.splines = {
      fgf: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.75, 1.18, 1.22),
        new THREE.Vector3(-2.9, 1.7, 0.7),
        new THREE.Vector3(-3.0, 2.15, 0.15),
        new THREE.Vector3(-3.0, 2.75, 0.15),
        new THREE.Vector3(-2.55, 2.2, 0.1),
        new THREE.Vector3(-1.6, 1.4, 0.12),
        new THREE.Vector3(0.55, 0.9, 0.22),
      ]),
      insp: new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.55, 0.9, 0.22),
        new THREE.Vector3(1.55, 1.15, 0.35),
        new THREE.Vector3(2.45, 0.82, 0.18),
        new THREE.Vector3(3.15, 0.45, 0.0),
      ]),
      exp: new THREE.CatmullRomCurve3([
        new THREE.Vector3(3.15, 0.45, 0.0),
        new THREE.Vector3(2.45, -0.15, -0.22),
        new THREE.Vector3(1.45, -0.08, -0.26),
        new THREE.Vector3(0.55, 0.1, -0.22),
      ]),
      return: new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.55, 0.1, -0.22),
        new THREE.Vector3(0.32, -0.25, -0.1),
        new THREE.Vector3(0.32, -1.45, 0.0),
        new THREE.Vector3(-0.9, -0.65, 0.2),
        new THREE.Vector3(-1.25, 0.55, 0.0),
        new THREE.Vector3(0.55, 0.9, 0.22),
      ]),
    };
    // Corrugated patient limbs; internal manifold ducts are smooth and thinner.
    const limbMat = new THREE.MeshPhysicalMaterial({ color: 0xd6ecff, roughness: 0.22, clearcoat: 1, transparent: true, opacity: 0.36, depthWrite: false });
    const ductMat = new THREE.MeshPhysicalMaterial({ color: 0xcbd5e1, roughness: 0.3, transparent: true, opacity: 0.18, depthWrite: false });
    this.root.add(
      new THREE.Mesh(corrugatedTube(this.splines.insp, 0.11, 0.07, 0.09), limbMat),
      new THREE.Mesh(corrugatedTube(this.splines.exp, 0.11, 0.07, 0.09), limbMat),
      new THREE.Mesh(new THREE.TubeGeometry(this.splines.fgf, 80, 0.06, 10, false), ductMat),
      new THREE.Mesh(new THREE.TubeGeometry(this.splines.return, 80, 0.08, 10, false), ductMat)
    );

    // Y-piece, angle connector and tracheal tube
    const yMat = new THREE.MeshPhysicalMaterial({ color: 0xe0f2fe, roughness: 0.15, transparent: true, opacity: 0.7, clearcoat: 1 });
    const yBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 20), yMat);
    yBody.rotation.z = Math.PI / 2;
    yBody.position.set(3.28, 0.45, 0);
    this.root.add(yBody);
    const ett = new THREE.CatmullRomCurve3([
      new THREE.Vector3(3.45, 0.45, 0),
      new THREE.Vector3(3.62, 0.62, 0),
      new THREE.Vector3(3.75, 0.85, 0),
      new THREE.Vector3(3.75, 0.55, 0),
      new THREE.Vector3(3.75, 0.0, 0),
    ]);
    const ettMesh = new THREE.Mesh(new THREE.TubeGeometry(ett, 48, 0.05, 14, false), new THREE.MeshPhysicalMaterial({ color: 0xf1f5f9, roughness: 0.1, transparent: true, opacity: 0.55, clearcoat: 1, depthWrite: false }));
    const cuff = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 12), M.get('cuff'));
    cuff.scale.set(1, 1.6, 1);
    cuff.position.set(3.75, 0.12, 0);
    this.root.add(ettMesh, cuff);
  }

  private buildLungs(stage: Stage): void {
    this.bronchusMat = new THREE.MeshPhysicalMaterial({ color: 0xd9a39c, roughness: 0.4, clearcoat: 0.6, emissive: 0x000000 });
    // Placeholder airway until the BodyParts3D tree loads (and if it cannot).
    const trachea = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 1.05, 20), this.bronchusMat);
    trachea.position.set(3.75, 0.02, 0);
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.72, 14), this.bronchusMat);
    lb.position.set(4.05, -0.72, -0.05);
    lb.rotation.set(0, 0, 0.8);
    const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.6, 14), this.bronchusMat);
    rb.position.set(3.5, -0.72, -0.05);
    rb.rotation.set(0, 0, -0.55);
    this.fallbackAirway = [trachea, lb, rb];
    this.root.add(trachea, lb, rb);

    const lungMat = (c: number) =>
      new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55, clearcoat: 0.8, clearcoatRoughness: 0.35, sheen: 0.5, sheenColor: new THREE.Color(0xffd1dc), transparent: true, opacity: 0.32, depthWrite: false });
    void stage;
    this.leftLungFast = new THREE.Mesh(lungGeometry('left'), lungMat(0xf3a3b6));
    this.leftLungFast.position.set(4.2, -0.55, -0.05);
    this.rightLungSlow = new THREE.Mesh(lungGeometry('right'), lungMat(0xf7a1a1));
    this.rightLungSlow.position.set(3.3, -0.55, -0.05);
    this.leftLungFast.renderOrder = 3;
    this.rightLungSlow.renderOrder = 3;
    this.root.add(this.leftLungFast, this.rightLungSlow);
  }

  /** Swap the placeholder for the real tracheobronchial tree and fit the lungs around it. */
  private async loadAirway(stage: Stage): Promise<void> {
    let model: THREE.Group;
    try {
      model = await loadAnatomy('airway.glb');
    } catch {
      return; // keep the placeholder
    }
    if (this.disposed || this.stage !== stage) return;
    const meshes: THREE.Mesh[] = [];
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) meshes.push(m);
    });
    const trachea = meshes.find((m) => m.name === 'trachea');
    if (!trachea) return;
    this.treeMat = new THREE.MeshPhysicalMaterial({ color: 0xe3a59c, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.25, emissive: 0x000000 });
    for (const m of meshes) {
      (m.material as THREE.Material).dispose();
      if (m.name.startsWith('ctx_')) {
        m.visible = false;
        m.material = this.treeMat;
        continue;
      }
      m.material = this.treeMat;
      m.castShadow = true;
    }
    const tb = new THREE.Box3().setFromObject(trachea);
    const top = new THREE.Vector3((tb.min.x + tb.max.x) / 2, tb.max.y, (tb.min.z + tb.max.z) / 2);
    const holder = new THREE.Group();
    holder.scale.setScalar(AIRWAY_SCALE);
    holder.position.copy(TRACHEA_TOP).addScaledVector(top, -AIRWAY_SCALE);
    holder.add(model);
    this.root.add(holder);
    holder.updateMatrixWorld(true);

    const side = (m: THREE.Mesh) =>
      m.name === 'rightMainBronchus' || /^R(UL|ML|LL)_/.test(m.name) ? 'right' : m.name === 'leftMainBronchus' || /^L(UL|LL)_/.test(m.name) ? 'left' : null;
    const boxes = { left: new THREE.Box3(), right: new THREE.Box3() };
    for (const m of meshes) {
      const s = side(m);
      if (s && m.visible) boxes[s].expandByObject(m);
    }
    for (const s of ['left', 'right'] as const) {
      const b = boxes[s];
      if (b.isEmpty()) continue;
      const c = b.getCenter(new THREE.Vector3());
      const size = b.getSize(new THREE.Vector3());
      const lung = s === 'left' ? this.leftLungFast : this.rightLungSlow;
      const lateral = s === 'left' ? 1 : -1;
      lung.position.set(c.x + lateral * size.x * 0.18, c.y + size.y * 0.05, c.z);
      this.lungBase[s].set(size.x * 0.85, size.y * 0.72, Math.max(size.z * 1.2, size.x * 0.75));
    }
    for (const m of this.fallbackAirway) m.visible = false;
    this.labelLungs?.();
  }

  private labelLungs: (() => void) | null = null;

  private buildScreen(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 384;
    const g = canvas.getContext('2d')!;
    g.fillStyle = '#020617';
    g.fillRect(0, 0, canvas.width, canvas.height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 12), this.stage!.materials.get('steel'));
    arm.position.set(-1.35, 2.2, 0.35);
    const bezel = new THREE.Mesh(new RoundedBoxGeometry(2.05, 1.3, 0.1, 3, 0.05), this.stage!.materials.get('plasticDark'));
    bezel.position.set(-1.35, 2.85, 0.45);
    bezel.rotation.x = -0.1;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.14), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    panel.position.set(0, 0, 0.052);
    bezel.add(panel);
    panel.userData.noCast = true;
    this.root.add(arm, bezel);
    this.screen = { canvas, g, tex, x: 12, prev: null, acc: 0, numAcc: 1, peak: 0, peakShown: 0, wasInsp: false };
  }

  private buildInstancedParticles(count: number): void {
    const geo = new THREE.SphereGeometry(0.036, 8, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(geo, mat, count);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.userData.noCast = true;
    const segments: ParticleState['segment'][] = ['fgf', 'insp', 'exp', 'return'];
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        segment: segments[i % segments.length],
        t: Math.random(),
        speedOffset: 0.78 + Math.random() * 0.44,
        radialJitter: new THREE.Vector3((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08),
      });
      this.particleMesh.setColorAt(i, O2_COLOR);
    }
    this.root.add(this.particleMesh);
  }

  private buildLabels(): void {
    const add = (anchor: THREE.Vector3, offset: THREE.Vector3, fr: string, en: string, color?: string) => {
      const l = createLabel({ anchor, offset, text: this.fr ? fr : en, color, dotRadius: 0.035 });
      this.root.add(l.group);
      this.labels.push({ l, fr, en });
      return l;
    };
    add(new THREE.Vector3(-3.15, 0.95, 1.28), new THREE.Vector3(-1.0, -0.9, 0.3), 'Débitmètres', 'Flowmeters', '#38bdf8');
    add(new THREE.Vector3(-3.15, 1.47, 1.24), new THREE.Vector3(-1.1, 0.35, 0.2), 'Manomètres réseau', 'Pipeline gauges', '#e2e8f0');
    add(new THREE.Vector3(-3.0, 3.1, 0.15), new THREE.Vector3(-0.9, 0.35, 0), 'Évaporateur', 'Vaporizer', '#facc15');
    add(new THREE.Vector3(-0.6, 1.0, 0.3), new THREE.Vector3(0.1, 0.0, 1.0), 'Ventilateur', 'Ventilator drive', '#a5b4fc');
    add(new THREE.Vector3(0.55, 1.05, 0.22), new THREE.Vector3(0.45, 0.75, 0.3), 'Valve inspiratoire', 'Inspiratory valve', '#38bdf8');
    add(new THREE.Vector3(0.75, 0.1, -0.22), new THREE.Vector3(0.9, -0.25, 0.5), 'Valve expiratoire', 'Expiratory valve', '#f97316');
    add(new THREE.Vector3(0.32, -1.3, 0.4), new THREE.Vector3(0.9, -0.55, 0.6), 'Absorbeur de CO₂', 'CO₂ absorber', '#c084fc');
    add(new THREE.Vector3(-0.35, -0.35, 1.45), new THREE.Vector3(0.6, 0.45, 0.4), 'Valve APL', 'APL valve', '#e2e8f0');
    add(new THREE.Vector3(-0.9, -1.4, 1.55), new THREE.Vector3(-0.8, -0.45, 0.3), 'Ballon réservoir', 'Reservoir bag', '#94a3b8');
    add(new THREE.Vector3(-2.35, -1.2, -0.75), new THREE.Vector3(-1.2, -0.5, 0.8), 'Évacuation (AGSS)', 'Scavenging (AGSS)', '#eab308');
    const lungLabel = add(new THREE.Vector3(4.3, -0.6, 0.4), new THREE.Vector3(0.7, 0.6, 0.3), 'Poumons : 2 compartiments', 'Lungs: 2 compartments', '#f9a8d4');
    this.labelLungs = () => {
      // Re-anchor after the lungs were refitted to the real airway.
      const a = this.leftLungFast.position.clone().add(new THREE.Vector3(0.1, 0.3, this.lungBase.left.z * 0.8));
      const pts = lungLabel.group.children;
      const label = pts[0];
      const dot = pts[1];
      const line = pts[2] as THREE.Line;
      dot.position.copy(a);
      label.position.copy(a).add(new THREE.Vector3(0.7, 0.6, 0.3));
      line.geometry.setFromPoints([a, label.position.clone()]);
    };
  }

  private enableShadows(root: THREE.Object3D): void {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m.userData.noCast) return;
      const mat = m.material as THREE.Material;
      const opaque = !mat.transparent;
      m.castShadow = opaque;
      m.receiveShadow = true;
    });
  }

  // ── Public API (unchanged) ──────────────────────────────────────────────

  public setGasStandard(standardId: GasStandardId): void {
    if (!this.o2PipeMat) return;
    const std = REGIONAL_GAS_STANDARDS[standardId];
    this.o2PipeMat.color.set(std.gases.O2.hex);
    this.airPipeMat.color.set(std.gases.AIR.hex);
    this.n2oPipeMat.color.set(std.gases.N2O.hex);
    this.wagdPipeMat.color.set(std.gases.WAGD.hex);
    this.scavengingBagMat.color.set(std.gases.WAGD.hex);
    this.gaugeRings.o2?.color.set(std.gases.O2.hex);
    this.gaugeRings.air?.color.set(std.gases.AIR.hex);
    this.gaugeRings.n2o?.color.set(std.gases.N2O.hex);
  }

  public setVolatileAgent(agentId: VolatileAgentId): void {
    this.activeAgent = agentId;
    const hex = VOLATILE_AGENTS[agentId].iso5360ColorHex;
    this.agentColor.set(hex);
    if (!this.vaporizerCollarMat) return;
    this.vaporizerCollarMat.color.set(hex);
    this.vaporizerLiquidMat.color.set(hex);
    this.vaporizerLiquidMat.emissive.set(hex);
  }

  public setDriveType(drive: VentilatorDriveType): void {
    (Object.keys(this.driveGroups) as VentilatorDriveType[]).forEach((key) => {
      this.driveGroups[key].visible = key === drive;
    });
  }

  public setXrayLevel(xray0To1: number): void {
    this.xrayOpacity = THREE.MathUtils.clamp(xray0To1, 0, 1);
    // 0 % = opaque machine (0.94); 100 % = clear cut-away (0.04)
    const shellAlpha = THREE.MathUtils.lerp(0.94, 0.04, this.xrayOpacity);
    this.shellMaterials.forEach((m) => {
      m.opacity = shellAlpha;
      m.depthWrite = shellAlpha > 0.85;
      m.needsUpdate = true;
    });
    if (this.shellWireframe) {
      (this.shellWireframe.material as THREE.LineBasicMaterial).opacity = THREE.MathUtils.lerp(0.06, 0.4, this.xrayOpacity);
    }
  }

  /** Label language: French for fr-FR / fr-CA / ar-MA, English otherwise. */
  public setLanguage(fr: boolean): void {
    this.fr = fr;
    for (const { l, fr: f, en } of this.labels) l.setText(fr ? f : en);
  }

  public setLabelsVisible(v: boolean): void {
    this.stage?.setLabelsVisible(v);
    for (const { l } of this.labels) l.setVisible(v);
  }

  public pushSimulationState(snapshot: SimulationSnapshot, params: MachineAndPatientParams): void {
    this.latestSnapshot = snapshot;
    this.latestParams = params;
  }

  // ── Per-frame ────────────────────────────────────────────────────────────

  private frame(dt: number): void {
    const s = this.latestSnapshot;
    const p = this.latestParams;
    if (!s || !p) return;
    this.updateMechanicalVisuals(s, p, dt);
    this.updateGasParticles(s, p, dt);
    this.updateScreen(s, p, dt);
  }

  private updateMechanicalVisuals(s: SimulationSnapshot, p: MachineAndPatientParams, dt: number): void {
    const lvl = s.bellowsOrPistonPos;
    // Bellows compress fold by fold: scale along the axis from the fixed end.
    this.ascendingBellowsMesh.scale.y = Math.max(0.1, lvl);
    this.descendingBellowsMesh.scale.y = Math.max(0.12, lvl);
    this.pistonHeadMesh.position.y = -0.62 + lvl * 1.24;
    this.fgdIndicatorMat.color.set(s.fgdValveClosed ? 0xf59e0b : 0x22d3ee);
    this.fgdIndicatorMat.emissive.set(s.fgdValveClosed ? 0xd97706 : 0x06b6d4);
    this.turbineBladeGroup.rotation.z -= dt * (6 + Math.abs(s.flowLps) * 24);
    this.vriGasFrontMesh.scale.y = Math.max(0.15, s.vriGasFrontNorm);
    this.vriGasFrontMesh.position.y = -0.78 + 0.78 * Math.max(0.15, s.vriGasFrontNorm);
    const argonHigh = s.circuitArgonPct > 8;
    this.glostaventLedMat.color.set(argonHigh ? 0xf59e0b : 0x22c55e);
    this.glostaventLedMat.emissive.set(argonHigh ? 0xf59e0b : 0x22c55e);

    // Valve discs lift with flow; a stuck valve tilts and turns red.
    this.inspValveDisc.position.y = 0.9 + s.inspValveOpenNorm * 0.14;
    this.inspValveDisc.rotation.z = p.faults.stuckInspiratoryValve ? 0.42 : 0;
    this.inspValveMat.color.set(p.faults.stuckInspiratoryValve ? 0xef4444 : 0x38bdf8);
    this.expValveDisc.position.y = 0.1 + s.expValveOpenNorm * 0.14;
    this.expValveDisc.rotation.z = p.faults.stuckExpiratoryValve ? -0.42 : 0;
    this.expValveMat.color.set(p.faults.stuckExpiratoryValve ? 0xef4444 : 0xf97316);

    // Absorbent indicator: white → violet, front moving down from the inlet.
    const ex = s.sodaLimeExhaustionNorm;
    this.sodaLimeMat.color.lerpColors(SODA_FRESH, SODA_EXHAUSTED, ex);
    if (this.granules && Math.abs(ex - this.lastExhaustion) > 0.005) {
      this.lastExhaustion = ex;
      for (let i = 0; i < this.granuleDepth.length; i++) {
        const k = THREE.MathUtils.clamp((ex * 1.1 - this.granuleDepth[i]) / 0.08 + 0.5, 0, 1);
        this.tmpColor.lerpColors(SODA_FRESH, SODA_EXHAUSTED, k);
        this.granules.setColorAt(i, this.tmpColor);
      }
      if (this.granules.instanceColor) this.granules.instanceColor.needsUpdate = true;
    }

    // Flowmeter floats (display scale only) and pipeline gauges.
    const flows: Record<GasKey, number> = { o2: p.fgfO2Lpm, air: p.fgfAirLpm, n2o: p.fgfN2OLpm };
    for (const b of this.bobbins) {
      const f = Math.max(0, flows[b.gas]);
      const target = b.y0 + b.h * Math.min(1, Math.log1p(f * 2) / Math.log1p(30));
      b.mesh.position.y += (target - b.mesh.position.y) * Math.min(1, dt * 6) + (f > 0 ? Math.sin(performance.now() / 90 + b.y0) * 0.0015 : 0);
      b.mesh.rotation.y += dt * f * 2;
    }
    const supplied: Record<GasKey, boolean> = { o2: !p.faults.wallO2Failure, air: true, n2o: true };
    for (const n of this.needles) {
      const target = supplied[n.gas] ? 0.6 : 0;
      n.a += (target - n.a) * Math.min(1, dt * 2.5);
      n.pivot.rotation.z = Math.PI * 0.75 - n.a * Math.PI * 1.5;
    }
    this.vapDial.rotation.y += (-Math.min(p.vaporizerDialPct, 18) * 0.22 - this.vapDial.rotation.y) * Math.min(1, dt * 5);

    // Bag, APL, scavenging
    const fill = s.bagFillNorm;
    this.manualBagMesh.scale.set(0.72 + fill * 0.42, 0.92 + fill * 0.12, 0.72 + fill * 0.42);
    this.aplKnobMesh.rotation.y = (p.aplCmH2O / 70) * Math.PI * 1.8;
    const scav = p.faults.scavengingObstruction ? 1.45 : 0.9;
    this.scavengingBagMesh.scale.set(scav, 0.9 + (scav - 0.9) * 0.4, scav);
    this.scavengingBagMat.emissive.set(p.faults.scavengingObstruction ? 0xdc2626 : 0x000000);
    this.scavengingBagMat.emissiveIntensity = p.faults.scavengingObstruction ? 0.65 : 0;

    // Two-compartment lungs; the slow compartment lags under bronchospasm.
    const volScale = 1 + (s.lungVolumeMl / 700) * 0.2;
    const slowLag = 1 + (s.lungVolumeMl / 700) * 0.2 * (1 - p.bronchospasmHeterogeneity * 0.35);
    this.leftLungFast.scale.copy(this.lungBase.left).multiplyScalar(volScale);
    this.rightLungSlow.scale.copy(this.lungBase.right).multiplyScalar(slowLag);
    const spasm = p.bronchospasmHeterogeneity;
    for (const mat of [this.bronchusMat, this.treeMat]) {
      if (!mat) continue;
      mat.emissive.set(spasm > 0.35 ? 0xea580c : 0x000000);
      mat.emissiveIntensity = spasm * 0.7;
    }
    const constriction = 1 - spasm * 0.42;
    for (const m of this.fallbackAirway.slice(1)) m.scale.set(constriction, 1, constriction);
  }

  private updateScreen(s: SimulationSnapshot, p: MachineAndPatientParams, dt: number): void {
    const sc = this.screen;
    if (!sc) return;
    const g = sc.g;
    const W = sc.canvas.width;
    const traceW = 440;
    // Peak pressure of the last breath
    if (s.isInspiration && !sc.wasInsp) {
      sc.peakShown = sc.peak;
      sc.peak = 0;
    }
    sc.wasInsp = s.isInspiration;
    sc.peak = Math.max(sc.peak, s.pawCmH2O);

    const dx = dt * 70;
    const yPaw = 40 + (1 - THREE.MathUtils.clamp(s.pawCmH2O / 40, 0, 1)) * 140;
    const yFlow = 270 - THREE.MathUtils.clamp(s.flowLps, -1.2, 1.2) * 70;
    g.fillStyle = '#020617';
    g.fillRect(sc.x, 30, 16, 330);
    if (sc.prev) {
      g.lineWidth = 2.5;
      g.strokeStyle = '#facc15';
      g.beginPath();
      g.moveTo(sc.x - dx, sc.prev[0]);
      g.lineTo(sc.x, yPaw);
      g.stroke();
      g.strokeStyle = '#4ade80';
      g.beginPath();
      g.moveTo(sc.x - dx, sc.prev[1]);
      g.lineTo(sc.x, yFlow);
      g.stroke();
    }
    sc.prev = [yPaw, yFlow];
    sc.x += dx;
    if (sc.x > traceW) {
      sc.x = 12;
      sc.prev = null;
    }

    sc.numAcc += dt;
    if (sc.numAcc > 0.33) {
      sc.numAcc = 0;
      const fr = this.fr;
      g.fillStyle = '#020617';
      g.fillRect(0, 0, W, 30);
      g.fillRect(traceW + 18, 30, W - traceW - 18, 354);
      g.font = '600 15px Inter, system-ui, sans-serif';
      g.fillStyle = '#facc15';
      g.fillText('Paw cmH₂O', 14, 50);
      g.fillStyle = '#4ade80';
      g.fillText(fr ? 'Débit L/s' : 'Flow L/s', 14, 214);
      g.strokeStyle = '#1e293b';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(12, 270);
      g.lineTo(traceW + 12, 270);
      g.stroke();
      const alarm = s.alarms[0];
      g.fillStyle = alarm ? '#dc2626' : '#0f172a';
      g.fillRect(0, 0, W, 28);
      g.fillStyle = '#f8fafc';
      g.font = '700 15px Inter, system-ui, sans-serif';
      g.fillText(alarm ?? (fr ? 'Ventilation · ' : 'Ventilation · ') + p.ventMode.toUpperCase(), 12, 19);
      const rows: [string, string, string][] = [
        [fr ? 'Ppic' : 'Ppeak', sc.peakShown.toFixed(0), '#facc15'],
        [fr ? 'PEP' : 'PEEP', s.peepBaseCmH2O.toFixed(0), '#facc15'],
        ['VTe', s.deliveredVtMl.toFixed(0), '#4ade80'],
        [fr ? 'FR' : 'RR', p.rrBpm.toFixed(0), '#4ade80'],
        ['FiO₂', s.circuitFiO2Pct.toFixed(0), '#e2e8f0'],
        ['EtCO₂', s.etco2MmHg.toFixed(0), '#fde047'],
        [VOLATILE_AGENTS[this.activeAgent].name.slice(0, 4), s.circuitAgentPct.toFixed(1), '#' + this.agentColor.getHexString()],
      ];
      rows.forEach(([k, v, c], i) => {
        const y = 62 + i * 46;
        g.fillStyle = '#64748b';
        g.font = '500 13px Inter, system-ui, sans-serif';
        g.fillText(k, traceW + 30, y - 14);
        g.fillStyle = c;
        g.font = '700 28px ui-monospace, monospace';
        g.fillText(v, traceW + 30, y + 14);
      });
    }
    sc.acc += dt;
    if (sc.acc > 1 / 30) {
      sc.acc = 0;
      sc.tex.needsUpdate = true;
    }
  }

  private updateGasParticles(s: SimulationSnapshot, p: MachineAndPatientParams, dt: number): void {
    const fgfTotal = p.fgfO2Lpm + p.fgfAirLpm + p.fgfN2OLpm + (p.faults.o2FlushActive ? 45 : 0);
    const agentMix = Math.min(s.circuitAgentPct / 5, 0.7);

    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      let dirSpeed = 0;
      if (pt.segment === 'fgf') {
        dirSpeed = (0.12 + Math.min(fgfTotal, 15) * 0.08) * pt.speedOffset;
      } else if (pt.segment === 'insp') {
        if (s.isInspiration) dirSpeed = (0.28 + Math.abs(s.flowLps) * 1.1) * pt.speedOffset;
        else if (p.faults.stuckInspiratoryValve) dirSpeed = -0.48 * pt.speedOffset; // exhaled gas pushed back up the inspiratory limb
        else dirSpeed = 0.02;
      } else if (pt.segment === 'exp') {
        if (!s.isInspiration) dirSpeed = (0.3 + Math.abs(s.flowLps) * 1.05) * pt.speedOffset;
        else if (p.faults.stuckExpiratoryValve) dirSpeed = -0.52 * pt.speedOffset; // exhaled gas drawn back on inspiration
        else dirSpeed = 0.02;
      } else {
        dirSpeed = (0.18 + Math.min(fgfTotal, 10) * 0.05) * pt.speedOffset;
      }
      pt.t = (pt.t + dirSpeed * dt) % 1;
      if (pt.t < 0) pt.t += 1;

      this.splines[pt.segment].getPoint(pt.t, this.tmpPos);
      this.tmpPos.add(pt.radialJitter);
      this.dummyObj.position.copy(this.tmpPos);
      this.dummyObj.rotation.set(0, 0, 0);
      this.dummyObj.scale.setScalar(p.faults.circuitDisconnect && pt.segment === 'insp' && pt.t > 0.8 ? 1.5 : 1.0);
      this.dummyObj.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummyObj.matrix);

      if (pt.segment === 'exp') {
        this.tmpColor.copy(CO2_COLOR);
      } else if (pt.segment === 'return') {
        // Past the absorber (t > 0.45) CO₂ clears only if the absorbent still works
        if (pt.t < 0.45 || s.sodaLimeExhaustionNorm > 0.6) this.tmpColor.copy(CO2_COLOR);
        else if (s.circuitArgonPct > 6 && i % 5 === 0) this.tmpColor.copy(ARGON_COLOR);
        else this.tmpColor.copy(O2_COLOR).lerp(this.agentColor, agentMix);
      } else if (pt.segment === 'insp' && (s.fico2MmHg > 3.5 || p.faults.stuckInspiratoryValve) && i % 3 === 0) {
        this.tmpColor.copy(CO2_COLOR);
      } else if (s.circuitArgonPct > 6 && i % 6 === 0) {
        this.tmpColor.copy(ARGON_COLOR);
      } else if (pt.segment === 'fgf' && pt.t < 0.4) {
        this.tmpColor.copy(O2_COLOR); // upstream of the vaporizer: no agent yet
      } else {
        this.tmpColor.copy(O2_COLOR).lerp(this.agentColor, Math.min(agentMix, 0.65));
      }
      this.particleMesh.setColorAt(i, this.tmpColor);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
  }

  public dispose(): void {
    this.disposed = true;
    this.unsubFrame?.();
    this.screen?.tex.dispose();
    this.stage?.dispose();
    this.stage = null;
  }
}
