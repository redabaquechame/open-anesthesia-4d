import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  createGlassChassisMaterial,
  createTieredRenderer,
  disposeSceneResources,
  type TieredRendererHandle,
} from '../../engine/createTieredRenderer';
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

interface ParticleState {
  segment: 'fgf' | 'insp' | 'exp' | 'return';
  t: number; // 0..1 along spline
  speedOffset: number;
  radialJitter: THREE.Vector3;
}

const SODA_FRESH = new THREE.Color(0xf1f5f9);
const SODA_EXHAUSTED = new THREE.Color(0x7e22ce);
const O2_COLOR = new THREE.Color(0x38bdf8);
const CO2_COLOR = new THREE.Color(0xf43f5e);
const ARGON_COLOR = new THREE.Color(0xc084fc);

export class WorkstationScene {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private handle: TieredRendererHandle | null = null;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls | null = null;

  // Peel-away outer shell materials
  private shellMaterials: THREE.MeshStandardMaterial[] = [];
  private shellWireframe: THREE.LineSegments | null = null;

  // Dynamic clinical color materials
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

  // Animated mechanical meshes
  private driveGroups: Record<VentilatorDriveType, THREE.Group> = {} as Record<
    VentilatorDriveType,
    THREE.Group
  >;
  private ascendingBellowsMesh!: THREE.Mesh;
  private descendingBellowsMesh!: THREE.Mesh;
  private pistonHeadMesh!: THREE.Mesh;
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

  // Dual-compartment 3D lungs
  private leftLungFast!: THREE.Mesh;
  private rightLungSlow!: THREE.Mesh;
  private leftBronchus!: THREE.Mesh;
  private rightBronchus!: THREE.Mesh;

  // Splines & single InstancedMesh gas particle stream
  private splines!: Record<'fgf' | 'insp' | 'exp' | 'return', THREE.CatmullRomCurve3>;
  private particleMesh!: THREE.InstancedMesh;
  private particles: ParticleState[] = [];
  private dummyObj = new THREE.Object3D();
  private tmpPos = new THREE.Vector3();
  private tmpColor = new THREE.Color();
  private agentColor = new THREE.Color();

  // State references
  private latestSnapshot: SimulationSnapshot | null = null;
  private latestParams: MachineAndPatientParams | null = null;
  private activeAgent: VolatileAgentId = 'sevoflurane';
  private xrayOpacity = 0.72;
  private rafId: number | null = null;
  private lastFrameMs = performance.now();
  private resizeObserver: ResizeObserver | null = null;
  private disposed = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'block w-full h-full outline-none';
    this.container.appendChild(this.canvas);

    this.scene.background = new THREE.Color('#090e17');
    this.camera = new THREE.PerspectiveCamera(42, 16 / 10, 0.1, 100);
    this.camera.position.set(0.6, 2.35, 8.6);
  }

  public async init(
    initialGasStandard: GasStandardId,
    initialAgent: VolatileAgentId,
    initialDrive: VentilatorDriveType
  ): Promise<{ tier: string; backend: string } | null> {
    this.activeAgent = initialAgent;
    const handle = await createTieredRenderer(this.canvas, () => {
      // Trigger resize re-sync if mobile WebGL context restores
      this.handleResize();
    });

    // React StrictMode (and fast module switching) can dispose us while the renderer is
    // still being created: release it instead of leaking a WebGL context.
    if (this.disposed) {
      handle.dispose();
      return null;
    }
    this.handle = handle;

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0.5, 0.2, 0);
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 16;
    this.controls.maxPolarAngle = Math.PI * 0.82;

    this.setupLighting();
    this.buildWorkstationAndCircuit();
    this.buildLungs();
    this.buildInstancedParticles(this.handle.budget.maxGasParticles);
    this.setGasStandard(initialGasStandard);
    this.setVolatileAgent(initialAgent);
    this.setDriveType(initialDrive);
    this.setXrayLevel(this.xrayOpacity);

    this.handleResize();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.lastFrameMs = performance.now();
    this.animate();

    return {
      tier: this.handle.budget.tier,
      backend: this.handle.budget.backend,
    };
  }

  private setupLighting(): void {
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.9);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(5, 8, 6);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rim.position.set(-6, 4, -5);
    this.scene.add(rim);

    // Subtle dark clinical studio grid floor
    const grid = new THREE.GridHelper(18, 24, 0x1e293b, 0x111a2b);
    grid.position.y = -2.35;
    this.scene.add(grid);
  }

  private buildWorkstationAndCircuit(): void {
    const budget = this.handle!.budget;
    const glassMat = createGlassChassisMaterial(budget, 0.24);
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.55,
      roughness: 0.35,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.4,
      roughness: 0.5,
    });

    // --- 1. Peel-Away Workstation Outer Chassis (Left/Center) ---
    const chassisGeo = new THREE.BoxGeometry(5.2, 4.1, 2.35);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.28,
      roughness: 0.45,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this.shellMaterials.push(chassisMat);
    const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
    chassisMesh.position.set(-1.35, -0.25, 0);
    this.scene.add(chassisMesh);

    const edges = new THREE.EdgesGeometry(chassisGeo);
    this.shellWireframe = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 })
    );
    this.shellWireframe.position.copy(chassisMesh.position);
    this.scene.add(this.shellWireframe);

    // Workstation base plinth (always solid)
    const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.25, 2.55), darkMetalMat);
    basePlinth.position.set(-1.35, -2.22, 0);
    this.scene.add(basePlinth);

    // --- 2. High/Intermediate-Pressure Regional Gas Supply Pipelines (Far Left) ---
    this.o2PipeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    this.airPipeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3 });
    this.n2oPipeMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 });
    this.wagdPipeMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3 });

    const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 12);
    const o2Pipe = new THREE.Mesh(pipeGeo, this.o2PipeMat);
    o2Pipe.position.set(-3.55, -0.5, -0.45);
    const airPipe = new THREE.Mesh(pipeGeo, this.airPipeMat);
    airPipe.position.set(-3.55, -0.5, 0.0);
    const n2oPipe = new THREE.Mesh(pipeGeo, this.n2oPipeMat);
    n2oPipe.position.set(-3.55, -0.5, 0.45);
    this.scene.add(o2Pipe, airPipe, n2oPipe);

    // Scavenging (AGSS/WAGD) transfer hose from the APL valve to the scavenging reservoir
    const wagdHose = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.35, -0.35, 0.72),
          new THREE.Vector3(-1.2, -0.9, 0.2),
          new THREE.Vector3(-2.35, -1.1, -0.75),
        ]),
        20,
        0.05,
        8,
        false
      ),
      this.wagdPipeMat
    );
    this.scene.add(wagdHose);

    // Flowmeter block above pipelines
    const flowBlock = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.9, 1.2), glassMat);
    flowBlock.position.set(-3.55, 1.05, 0);
    this.scene.add(flowBlock);

    // --- 3. ISO 5360 Color-Coded Variable-Bypass Vaporizer ---
    const vapBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 1.35, 20), metalMat);
    vapBody.position.set(-2.55, 0.72, 0);
    this.scene.add(vapBody);

    this.vaporizerCollarMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.25,
      metalness: 0.2,
    });
    const vapCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.32, 20),
      this.vaporizerCollarMat
    );
    vapCollar.position.set(-2.55, 1.25, 0);
    this.scene.add(vapCollar);

    this.vaporizerLiquidMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xfacc15,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.65,
    });
    const vapWindow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.52, 16),
      this.vaporizerLiquidMat
    );
    vapWindow.position.set(-2.55, 0.42, 0.14);
    this.scene.add(vapWindow);

    // --- 4. Swappable Ventilator Drive Bay (Center-Left: x = -1.25, y = 0.55) ---
    const bayOrigin = new THREE.Vector3(-1.25, 0.55, 0);

    // 4a. Ascending (Standing) Bellows
    const ascGroup = new THREE.Group();
    ascGroup.position.copy(bayOrigin);
    const ascGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.75, 24), glassMat);
    const ascBase = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.14, 24), darkMetalMat);
    ascBase.position.y = -0.9;
    this.ascendingBellowsMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.5, 1.3, 20),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55, metalness: 0.05 })
    );
    this.ascendingBellowsMesh.position.y = -0.15;
    ascGroup.add(ascGlass, ascBase, this.ascendingBellowsMesh);
    this.scene.add(ascGroup);
    this.driveGroups.ascending_bellows = ascGroup;

    // 4b. Descending (Hanging) Bellows
    const descGroup = new THREE.Group();
    descGroup.position.copy(bayOrigin);
    const descGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.75, 24), glassMat);
    const descTop = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.14, 24), darkMetalMat);
    descTop.position.y = 0.9;
    this.descendingBellowsMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.5, 1.25, 20),
      new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.5 })
    );
    this.descendingBellowsMesh.position.y = 0.15;
    descGroup.add(descGlass, descTop, this.descendingBellowsMesh);
    this.scene.add(descGroup);
    this.driveGroups.descending_bellows = descGroup;

    // 4c. Electric Piston + Fresh Gas Decoupling (FGD) Valve
    const pistonGroup = new THREE.Group();
    pistonGroup.position.copy(bayOrigin);
    const pistonSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 1.7, 24), glassMat);
    this.pistonHeadMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.26, 20),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.25 })
    );
    const motorHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.55, 16), darkMetalMat);
    motorHousing.position.y = -1.1;
    this.fgdIndicatorMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.5,
    });
    const fgdBlock = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.45), this.fgdIndicatorMat);
    fgdBlock.position.set(0.68, 0.55, 0);
    pistonGroup.add(pistonSleeve, this.pistonHeadMesh, motorHousing, fgdBlock);
    this.scene.add(pistonGroup);
    this.driveGroups.piston_fgd = pistonGroup;

    // 4d. High-Speed Turbine / Blower
    const turbineGroup = new THREE.Group();
    turbineGroup.position.copy(bayOrigin);
    const blowerShell = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.45, 28), glassMat);
    blowerShell.rotation.x = Math.PI / 2;
    this.turbineBladeGroup = new THREE.Group();
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.65,
      roughness: 0.2,
    });
    for (let i = 0; i < 6; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.08), bladeMat);
      const angle = (i / 6) * Math.PI * 2;
      blade.position.set(Math.cos(angle) * 0.24, Math.sin(angle) * 0.24, 0);
      blade.rotation.z = angle;
      this.turbineBladeGroup.add(blade);
    }
    turbineGroup.add(blowerShell, this.turbineBladeGroup);
    this.scene.add(turbineGroup);
    this.driveGroups.turbine = turbineGroup;

    // 4e. Volume Reflector with live gas-front pillar
    const vrGroup = new THREE.Group();
    vrGroup.position.copy(bayOrigin);
    const vrChannel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.55), glassMat);
    this.vriGasFrontMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.85, 0.42),
      new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.72,
      })
    );
    vrGroup.add(vrChannel, this.vriGasFrontMesh);
    this.scene.add(vrGroup);
    this.driveGroups.volume_reflector = vrGroup;

    // 4f. Draw-over + integral O2 concentrator (low-resource)
    const glostGroup = new THREE.Group();
    glostGroup.position.copy(bayOrigin);
    const concBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 1.45, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x0f766e, metalness: 0.2, roughness: 0.5 })
    );
    concBody.position.set(-0.08, -0.35, 0);
    this.glostaventLedMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.8,
    });
    const concLed = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), this.glostaventLedMat);
    concLed.position.set(0.28, 0.2, 0.45);
    const reservoirTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 1.4, 14),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 })
    );
    reservoirTube.rotation.z = Math.PI / 2;
    reservoirTube.position.set(-0.2, 0.62, 0);
    glostGroup.add(concBody, concLed, reservoirTube);
    this.scene.add(glostGroup);
    this.driveGroups.glostavent_drawover = glostGroup;

    // --- 5. CO2 Absorber Canister (Soda Lime) ---
    const absCanister = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.3, 20), glassMat);
    absCanister.position.set(0.32, -0.92, 0);
    this.sodaLimeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.85,
      metalness: 0.0,
    });
    const sodaCore = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.05, 18), this.sodaLimeMat);
    sodaCore.position.set(0.32, -0.94, 0);
    this.scene.add(absCanister, sodaCore);

    // --- 6. Translucent Unidirectional Valve Domes (Inspiratory Top, Expiratory Bottom) ---
    const domeGeo = new THREE.SphereGeometry(0.28, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const discGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.04, 16);

    const inspDome = new THREE.Mesh(domeGeo, glassMat);
    inspDome.position.set(0.55, 0.88, 0.22);
    this.inspValveMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
    });
    this.inspValveDisc = new THREE.Mesh(discGeo, this.inspValveMat);
    this.inspValveDisc.position.set(0.55, 0.9, 0.22);
    this.scene.add(inspDome, this.inspValveDisc);

    const expDome = new THREE.Mesh(domeGeo, glassMat);
    expDome.position.set(0.55, 0.08, -0.22);
    this.expValveMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.3,
    });
    this.expValveDisc = new THREE.Mesh(discGeo, this.expValveMat);
    this.expValveDisc.position.set(0.55, 0.1, -0.22);
    this.scene.add(expDome, this.expValveDisc);

    // --- 7. Manual Reservoir Bag, APL Valve Dial & Scavenging Bag ---
    this.manualBagMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 18, 16),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.65 })
    );
    this.manualBagMesh.scale.set(0.85, 1.35, 0.85);
    this.manualBagMesh.position.set(-0.9, -1.25, 0.72);
    this.scene.add(this.manualBagMesh);

    this.aplKnobMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.22, 0.24, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 })
    );
    this.aplKnobMesh.position.set(-0.35, -0.35, 0.72);
    this.scene.add(this.aplKnobMesh);

    this.scavengingBagMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.6,
    });
    this.scavengingBagMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), this.scavengingBagMat);
    this.scavengingBagMesh.scale.set(0.8, 1.2, 0.8);
    this.scavengingBagMesh.position.set(-2.35, -1.35, -0.75);
    this.scene.add(this.scavengingBagMesh);

    // --- 8. Translucent Breathing Circuit Splines & Limbs ---
    this.splines = {
      fgf: new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.4, 1.0, 0),
        new THREE.Vector3(-2.55, 1.05, 0),
        new THREE.Vector3(-1.25, 1.25, 0.12),
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
        new THREE.Vector3(0.32, -0.45, -0.1),
        new THREE.Vector3(0.32, -1.45, 0.0),
        new THREE.Vector3(-0.9, -0.65, 0.2),
        new THREE.Vector3(-1.25, 0.55, 0.0),
        new THREE.Vector3(0.55, 0.9, 0.22),
      ]),
    };

    const tubeMat = createGlassChassisMaterial(budget, 0.22);
    (['fgf', 'insp', 'exp', 'return'] as const).forEach((key) => {
      const geo = new THREE.TubeGeometry(this.splines[key], 32, 0.11, 10, false);
      const mesh = new THREE.Mesh(geo, tubeMat);
      this.scene.add(mesh);
    });

    // Y-Piece connector
    const yPiece = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.48, 12), metalMat);
    yPiece.rotation.z = Math.PI / 2;
    yPiece.position.set(3.25, 0.45, 0);
    this.scene.add(yPiece);
  }

  private buildLungs(): void {
    this.bronchusMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      emissive: 0x0f172a,
      roughness: 0.4,
    });

    const trachea = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 1.05, 14), this.bronchusMat);
    trachea.position.set(3.75, 0.0, 0);
    this.scene.add(trachea);

    this.leftBronchus = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.72, 12), this.bronchusMat);
    this.leftBronchus.position.set(3.45, -0.65, 0.26);
    this.leftBronchus.rotation.set(0.45, 0, -0.55);

    this.rightBronchus = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.65, 12), this.bronchusMat);
    this.rightBronchus.position.set(4.02, -0.62, -0.22);
    this.rightBronchus.rotation.set(-0.35, 0, 0.48);
    this.scene.add(this.leftBronchus, this.rightBronchus);

    const lungFastMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xbe185d,
      emissiveIntensity: 0.18,
      roughness: 0.35,
      transparent: true,
      opacity: 0.62,
    });
    const lungSlowMat = new THREE.MeshStandardMaterial({
      color: 0xfb7185,
      emissive: 0xe11d48,
      emissiveIntensity: 0.18,
      roughness: 0.35,
      transparent: true,
      opacity: 0.62,
    });

    const lungGeo = new THREE.SphereGeometry(0.68, 22, 18);
    this.leftLungFast = new THREE.Mesh(lungGeo, lungFastMat);
    this.leftLungFast.position.set(3.25, -1.22, 0.48);
    this.leftLungFast.scale.set(0.82, 1.32, 0.78);

    this.rightLungSlow = new THREE.Mesh(lungGeo, lungSlowMat);
    this.rightLungSlow.position.set(4.25, -1.22, -0.42);
    this.rightLungSlow.scale.set(0.88, 1.32, 0.82);

    this.scene.add(this.leftLungFast, this.rightLungSlow);
  }

  private buildInstancedParticles(count: number): void {
    const geo = new THREE.SphereGeometry(0.042, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(geo, mat, count);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const segments: ParticleState['segment'][] = ['fgf', 'insp', 'exp', 'return'];
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const seg = segments[i % segments.length];
      this.particles.push({
        segment: seg,
        t: Math.random(),
        speedOffset: 0.78 + Math.random() * 0.44,
        radialJitter: new THREE.Vector3(
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.08
        ),
      });
      this.particleMesh.setColorAt(i, O2_COLOR);
    }
    this.scene.add(this.particleMesh);
  }

  public setGasStandard(standardId: GasStandardId): void {
    if (!this.o2PipeMat) return;
    const std = REGIONAL_GAS_STANDARDS[standardId];
    this.o2PipeMat.color.set(std.gases.O2.hex);
    this.airPipeMat.color.set(std.gases.AIR.hex);
    this.n2oPipeMat.color.set(std.gases.N2O.hex);
    this.wagdPipeMat.color.set(std.gases.WAGD.hex);
    this.scavengingBagMat.color.set(std.gases.WAGD.hex);
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
    // 0% X-Ray => opaque realistic workstation shell (opacity 0.94); 100% X-Ray => clear cutaway (0.04)
    const shellAlpha = THREE.MathUtils.lerp(0.94, 0.04, this.xrayOpacity);
    this.shellMaterials.forEach((m) => {
      m.opacity = shellAlpha;
      m.depthWrite = shellAlpha > 0.85;
      m.needsUpdate = true;
    });
    if (this.shellWireframe) {
      (this.shellWireframe.material as THREE.LineBasicMaterial).opacity = THREE.MathUtils.lerp(
        0.1,
        0.48,
        this.xrayOpacity
      );
    }
  }

  public pushSimulationState(snapshot: SimulationSnapshot, params: MachineAndPatientParams): void {
    this.latestSnapshot = snapshot;
    this.latestParams = params;
  }

  private onVisibilityChange = (): void => {
    if (document.hidden && this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    } else if (!document.hidden && !this.disposed && this.rafId === null) {
      this.lastFrameMs = performance.now();
      this.animate();
    }
  };

  private handleResize(): void {
    if (!this.handle) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.handle.renderer.setSize(w, h, false);
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min((now - this.lastFrameMs) / 1000, 0.05);
    this.lastFrameMs = now;

    if (this.latestSnapshot && this.latestParams) {
      this.updateMechanicalVisuals(this.latestSnapshot, this.latestParams, dt);
      this.updateGasParticles(this.latestSnapshot, this.latestParams, dt);
    }

    this.controls?.update();
    this.handle?.renderer.render(this.scene, this.camera);
  };

  private updateMechanicalVisuals(s: SimulationSnapshot, p: MachineAndPatientParams, dt: number): void {
    // 1. Ventilator drive motion
    const lvl = s.bellowsOrPistonPos;
    this.ascendingBellowsMesh.scale.y = Math.max(0.12, lvl);
    this.ascendingBellowsMesh.position.y = -0.82 + 0.65 * Math.max(0.12, lvl);

    this.descendingBellowsMesh.scale.y = Math.max(0.15, lvl);
    this.descendingBellowsMesh.position.y = 0.82 - 0.62 * Math.max(0.15, lvl);

    this.pistonHeadMesh.position.y = -0.62 + lvl * 1.24;
    this.fgdIndicatorMat.color.set(s.fgdValveClosed ? 0xf59e0b : 0x22d3ee);
    this.fgdIndicatorMat.emissive.set(s.fgdValveClosed ? 0xd97706 : 0x06b6d4);

    this.turbineBladeGroup.rotation.z -= dt * (6 + Math.abs(s.flowLps) * 24);

    this.vriGasFrontMesh.scale.y = Math.max(0.15, s.vriGasFrontNorm);
    this.vriGasFrontMesh.position.y = -0.78 + 0.78 * Math.max(0.15, s.vriGasFrontNorm);

    this.glostaventLedMat.color.set(s.circuitArgonPct > 8 ? 0xf59e0b : 0x22c55e);
    this.glostaventLedMat.emissive.set(s.circuitArgonPct > 8 ? 0xf59e0b : 0x22c55e);

    // 2. Unidirectional valve discs (warp/tilt bright red when stuck open)
    this.inspValveDisc.position.y = 0.88 + s.inspValveOpenNorm * 0.14;
    this.inspValveDisc.rotation.z = p.faults.stuckInspiratoryValve ? 0.42 : 0;
    this.inspValveMat.color.set(p.faults.stuckInspiratoryValve ? 0xef4444 : 0x38bdf8);

    this.expValveDisc.position.y = 0.08 + s.expValveOpenNorm * 0.14;
    this.expValveDisc.rotation.z = p.faults.stuckExpiratoryValve ? -0.42 : 0;
    this.expValveMat.color.set(p.faults.stuckExpiratoryValve ? 0xef4444 : 0xf97316);

    // 3. Soda lime color shift: clinical white -> exhausted ethyl violet
    this.sodaLimeMat.color.lerpColors(SODA_FRESH, SODA_EXHAUSTED, s.sodaLimeExhaustionNorm);

    // 4. Manual bag, APL dial rotation & scavenging bag
    const bagScale = 0.72 + s.bagFillNorm * 0.48;
    this.manualBagMesh.scale.set(0.85 * bagScale, 1.3 * bagScale, 0.85 * bagScale);
    this.aplKnobMesh.rotation.y = (p.aplCmH2O / 70) * Math.PI * 1.8;

    const scavScale = p.faults.scavengingObstruction ? 1.52 : 0.9;
    this.scavengingBagMesh.scale.set(0.8 * scavScale, 1.2 * scavScale, 0.8 * scavScale);
    this.scavengingBagMat.emissive.set(p.faults.scavengingObstruction ? 0xdc2626 : 0x000000);
    this.scavengingBagMat.emissiveIntensity = p.faults.scavengingObstruction ? 0.65 : 0;

    // 5. Dual-compartment reactive 3D lungs & bronchospasm airway constriction
    const volScale = 1 + (s.lungVolumeMl / 700) * 0.34;
    const slowLag = 1 + (s.lungVolumeMl / 700) * 0.34 * (1 - p.bronchospasmHeterogeneity * 0.35);
    this.leftLungFast.scale.set(0.82 * volScale, 1.32 * volScale, 0.78 * volScale);
    this.rightLungSlow.scale.set(0.88 * slowLag, 1.32 * slowLag, 0.82 * slowLag);

    const constriction = 1 - p.bronchospasmHeterogeneity * 0.42;
    this.leftBronchus.scale.set(constriction, 1, constriction);
    this.rightBronchus.scale.set(constriction, 1, constriction);
    this.bronchusMat.emissive.set(p.bronchospasmHeterogeneity > 0.35 ? 0xea580c : 0x0f172a);
    this.bronchusMat.emissiveIntensity = p.bronchospasmHeterogeneity * 0.6;
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
        if (s.isInspiration) {
          dirSpeed = (0.28 + Math.abs(s.flowLps) * 1.1) * pt.speedOffset;
        } else if (p.faults.stuckInspiratoryValve) {
          // Retrograde exhaled gas pushed back into the inspiratory limb on exhalation
          dirSpeed = -0.48 * pt.speedOffset;
        } else {
          dirSpeed = 0.02;
        }
      } else if (pt.segment === 'exp') {
        if (!s.isInspiration) {
          dirSpeed = (0.3 + Math.abs(s.flowLps) * 1.05) * pt.speedOffset;
        } else if (p.faults.stuckExpiratoryValve) {
          // Exhaled gas pulled back from the expiratory limb on inspiration
          dirSpeed = -0.52 * pt.speedOffset;
        } else {
          dirSpeed = 0.02;
        }
      } else {
        dirSpeed = (0.18 + Math.min(fgfTotal, 10) * 0.05) * pt.speedOffset;
      }

      pt.t = (pt.t + dirSpeed * dt) % 1;
      if (pt.t < 0) pt.t += 1;

      this.splines[pt.segment].getPoint(pt.t, this.tmpPos);
      this.tmpPos.add(pt.radialJitter);

      this.dummyObj.position.copy(this.tmpPos);
      const scale = p.faults.circuitDisconnect && pt.segment === 'insp' && pt.t > 0.8 ? 1.5 : 1.0;
      this.dummyObj.scale.setScalar(scale);
      this.dummyObj.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummyObj.matrix);

      // Color coding by gas species & fault state
      if (pt.segment === 'exp') {
        this.tmpColor.copy(CO2_COLOR);
      } else if (pt.segment === 'return') {
        // Past the absorber (t > 0.45) CO2 clears only if the soda lime still works
        if (pt.t < 0.45 || s.sodaLimeExhaustionNorm > 0.6) {
          this.tmpColor.copy(CO2_COLOR);
        } else if (s.circuitArgonPct > 6 && i % 5 === 0) {
          this.tmpColor.copy(ARGON_COLOR);
        } else {
          this.tmpColor.copy(O2_COLOR).lerp(this.agentColor, agentMix);
        }
      } else if (pt.segment === 'insp' && (s.fico2MmHg > 3.5 || p.faults.stuckInspiratoryValve) && i % 3 === 0) {
        this.tmpColor.copy(CO2_COLOR);
      } else if (s.circuitArgonPct > 6 && i % 6 === 0) {
        this.tmpColor.copy(ARGON_COLOR);
      } else {
        this.tmpColor.copy(O2_COLOR).lerp(this.agentColor, Math.min(agentMix, 0.65));
      }

      this.particleMesh.setColorAt(i, this.tmpColor);
    }

    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.disposed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    disposeSceneResources(this.scene);
    this.handle?.dispose();
    this.canvas.remove();
  }
}
