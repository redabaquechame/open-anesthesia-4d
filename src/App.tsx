import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckSquare,
  Eye,
  EyeOff,
  Gauge,
  Globe,
  Layers,
  Pause,
  Play,
  Presentation,
  QrCode,
  RotateCcw,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  CLINICAL_GLOSSARY,
  REGIONAL_GAS_STANDARDS,
  VOLATILE_AGENTS,
  type GasStandardId,
  type LocaleCode,
  type VolatileAgentId,
} from './standards/clinicalStandards';
import { ASA_2008_CHECKLIST, MAPLESON_CIRCUITS, SFAR_FOSO_CHECKLIST } from './standards/checklists';
import { EVIDENCE_REGISTRY } from './evidence/evidenceRegistry';
import type {
  MachineAndPatientParams,
  SimulationSnapshot,
  VentilationMode,
  VentilatorDriveType,
} from './physics/circuitLungKernel';
import type { WorkerOutMessage } from './physics/physicsWorker';
import { WorkstationScene } from './modules/m1-workstation/WorkstationScene';
import { BedsideMonitorCanvas } from './components/BedsideMonitorCanvas';
import { ModuleRouter } from './modules/ModuleRouter';
import { BETA_NOTICE, ReviewDrawer, ReviewStatusChip } from './components/ReviewPanel';
import { QualitySelect } from './components/QualitySelect';
import { openPrintableDebriefCard, queueOfflineXapiEvent } from './utils/lmsAndDebrief';

type ModuleId = 'M1_M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8';
type CognitiveMode = 'guided' | 'sandbox' | 'blind_crisis';

const DEFAULT_PARAMS: MachineAndPatientParams = {
  driveType: 'ascending_bellows',
  ventMode: 'VCV',
  o2Source: 'pipeline',
  fgfO2Lpm: 1.0,
  fgfAirLpm: 1.0,
  fgfN2OLpm: 0.0,
  vaporizerDialPct: 2.0,
  vtMl: 480,
  rrBpm: 12,
  ieExpiratoryPart: 2,
  peepSetCmH2O: 5,
  pcvPinspCmH2O: 8, // above PEEP: ~480 mL at C = 60
  aplCmH2O: 10,
  resistanceCmH2OPerLps: 5,
  complianceMlPerCmH2O: 60,
  bronchospasmHeterogeneity: 0,
  metabolicVO2MlMin: 250,
  metabolicVCO2MlMin: 200,
  faults: {
    stuckInspiratoryValve: false,
    stuckExpiratoryValve: false,
    exhaustedSodaLime: false,
    circuitDisconnect: false,
    bellowsLeak: false,
    samplingLineLeak: false,
    curareCleft: false,
    scavengingObstruction: false,
    wallO2Failure: false,
    o2FlushActive: false,
  },
};

const MODULES_META: {
  id: ModuleId;
  short: string;
  titleFr: string;
  titleEn: string;
  status: 'LIVE';
  summary: string;
}[] = [
  { id: 'M1_M2', short: 'M1+M2', titleFr: 'Poste 4D, Ventilation & Capno', titleEn: '4D Workstation, Vent & Capno', status: 'LIVE', summary: '6 swappable drives (including draw-over + concentrator), APL vs CPAP, Mapleson A–F, FOSO/ASA checkouts, Equation of Motion & Capnography.' },
  { id: 'M3', short: 'M3', titleFr: 'Halogénés, Bas Débit & Afrique', titleEn: 'Volatile Kinetics & Eco-OR', status: 'LIVE', summary: 'Multi-compartment volatile uptake, Second Gas Effect, low-flow CO2e counter, Halothane-to-Sevoflurane transition.' },
  { id: 'M4', short: 'M4', titleFr: 'AIVOC/TIVA & EEG/DSA 3D→2D', titleEn: 'TIVA/TCI & 3D→2D EEG/DSA', status: 'LIVE', summary: 'Marsh/Schnider/Eleveld/Minto ghost comparison, manual-pump training, cellular synapse & 3D→2D DSA spectrogram.' },
  { id: 'M5', short: 'M5', titleFr: 'Curares TOF/PTC & Synapse 4D', titleEn: 'TOF/PTC & Cellular NMJ', status: 'LIVE', summary: 'Facial corrugator vs ulnar adductor pollicis monitoring, TOF ≥ 0.9, PTC & sugammadex encapsulation.' },
  { id: 'M6', short: 'M6', titleFr: 'Écho-ALR 3D→2D & Cœur P-V', titleEn: '3D→2D Ultrasound & Cardiac PV', status: 'LIVE', summary: '3D→2D ultrasound sonoanatomy slicer + cardiac valvular P-V loops & shock pressor drill.' },
  { id: 'M7', short: 'M7', titleFr: 'Rachis 4D & Péridurale Thor.', titleEn: '4D Thoracic Epidural & C-Arm', status: 'LIVE', summary: 'Translucent thoracic & lumbar spine, posture morphing, loss-of-resistance & virtual C-arm.' },
  { id: 'M8', short: 'M8', titleFr: 'Fibroscopie 4D & Sonde DLT', titleEn: '4D Bronchoscopy & DLT Airway', status: 'LIVE', summary: 'Split-screen tracheobronchial tree + first-person bronchoscope camera with DLT positioning.' },
];

const DRIVE_LABELS: Record<VentilatorDriveType, { label: string; tag: string }> = {
  ascending_bellows: { label: 'Ascending Bellows', tag: 'Collapses visibly on disconnect • ~2–3 cmH2O inherent PEEP • FGF adds to Vt' },
  descending_bellows: { label: 'Descending Bellows (Legacy)', tag: 'Keeps refilling by gravity on disconnect: silent trap' },
  piston_fgd: { label: 'Electric Piston + Fresh Gas Decoupling', tag: 'Electric drive (no drive gas) • FGD blocks flush volutrauma' },
  turbine: { label: 'High-Speed Turbine / Blower', tag: 'Leak compensation • Active CPAP in spontaneous mode' },
  volume_reflector: { label: 'Volume Reflector', tag: 'Leak compensation • Live reflector gas front' },
  glostavent_drawover: { label: 'Draw-Over + O2 Concentrator', tag: 'Low-resource setting • Runs without wall O2' },
};

const FAULT_KEYS: { key: keyof MachineAndPatientParams['faults']; fr: string; en: string }[] = [
  { key: 'stuckInspiratoryValve', fr: 'Valve inspiratoire bloquée (angle β)', en: 'Stuck Inspiratory Valve (beta angle)' },
  { key: 'stuckExpiratoryValve', fr: 'Valve expiratoire bloquée (DGF inefficace)', en: 'Stuck Expiratory Valve (FGF fails)' },
  { key: 'exhaustedSodaLime', fr: 'Chaux sodée épuisée (DGF corrige temp.)', en: 'Exhausted Soda Lime (high FGF clears)' },
  { key: 'circuitDisconnect', fr: 'Déconnexion circuit patient', en: 'Circuit Disconnect' },
  { key: 'bellowsLeak', fr: 'Fuite soufflet / bocal fêlé', en: 'Bellows / Cracked Canister Leak' },
  { key: 'samplingLineLeak', fr: 'Fuite ligne EtCO2 (pic en clocher)', en: 'Sample-Line Leak (Steeple Peak)' },
  { key: 'curareCleft', fr: 'Incisure de curare (reprise spont.)', en: 'Curare Cleft (Spontaneous Effort)' },
  { key: 'scavengingObstruction', fr: 'Obstruction SEGA (auto-PEP cachée)', en: 'Scavenging Obstruction (Auto-PEEP)' },
  { key: 'wallO2Failure', fr: 'Panne réseau mural O2', en: 'Wall O2 Pipeline Failure' },
  { key: 'o2FlushActive', fr: 'Bypass / Flush O2 actif (45 L/min)', en: 'O2 Flush Active (45 L/min)' },
];

function decodeHashState(): Partial<MachineAndPatientParams> | null {
  try {
    if (!window.location.hash.startsWith('#state=')) return null;
    const raw = decodeURIComponent(window.location.hash.slice(7));
    return JSON.parse(atob(raw)) as Partial<MachineAndPatientParams>;
  } catch {
    return null;
  }
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('M1_M2');
  const [locale, setLocale] = useState<LocaleCode>('fr-FR');
  const [gasStandard, setGasStandard] = useState<GasStandardId>('ISO_EU_AF');
  const [agent, setAgent] = useState<VolatileAgentId>('sevoflurane');
  const [cogMode, setCogMode] = useState<CognitiveMode>('sandbox');
  const [xrayOpacity, setXrayOpacity] = useState<number>(0.75);
  const [slowMo, setSlowMo] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [showEqZones, setShowEqZones] = useState<boolean>(true);
  const [projectorMode, setProjectorMode] = useState<boolean>(false);

  const [params, setParams] = useState<MachineAndPatientParams>(() => {
    const restored = decodeHashState();
    return restored
      ? { ...DEFAULT_PARAMS, ...restored, faults: { ...DEFAULT_PARAMS.faults, ...restored.faults } }
      : DEFAULT_PARAMS;
  });

  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [gpuBadge, setGpuBadge] = useState<string>('Initializing 3D...');
  const [mysteryFaultName, setMysteryFaultName] = useState<string | null>(null);
  const [mysteryRevealed, setMysteryRevealed] = useState<boolean>(false);

  // Drawers & Modals
  const [showEvidence, setShowEvidence] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(false);
  const [showChecklist, setShowChecklist] = useState<boolean>(false);
  const [checklistType, setChecklistType] = useState<'SFAR' | 'ASA' | 'MAPLESON'>('SFAR');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [cylSizeL, setCylSizeL] = useState<number>(5);
  const [cylBar, setCylBar] = useState<number>(80);

  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<WorkstationScene | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const paramsRef = useRef<MachineAndPatientParams>(params);
  paramsRef.current = params;

  const t = (key: string) => CLINICAL_GLOSSARY[key]?.[locale] ?? key;
  const isRtl = locale === 'ar-MA';

  // Boot 50 Hz Physics Web Worker
  useEffect(() => {
    const worker = new Worker(new URL('./physics/physicsWorker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    worker.postMessage({ type: 'INIT', params: paramsRef.current });

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      if (e.data.type === 'SNAPSHOT') {
        setSnapshot(e.data.snapshot);
        sceneRef.current?.pushSimulationState(e.data.snapshot, paramsRef.current);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Push param / speed / pause updates to Worker
  useEffect(() => {
    workerRef.current?.postMessage({ type: 'UPDATE_PARAMS', params });
    sceneRef.current?.setDriveType(params.driveType);
  }, [params]);

  useEffect(() => {
    workerRef.current?.postMessage({ type: 'SET_SPEED', speed: slowMo ? 0.25 : 1.0 });
  }, [slowMo]);

  useEffect(() => {
    workerRef.current?.postMessage({ type: 'SET_PAUSED', paused });
  }, [paused]);

  // Boot Three.js 4D Workstation Scene when M1_M2 is active
  useEffect(() => {
    if (activeModule !== 'M1_M2' || !viewportRef.current) return;
    const ws = new WorkstationScene(viewportRef.current);
    sceneRef.current = ws;

    ws.init(gasStandard, agent, paramsRef.current.driveType).then((info) => {
      if (!info) return; // scene was disposed while the renderer was booting
      setGpuBadge(`${info.backend.toUpperCase()} • ${info.tier}`);
      ws.setXrayLevel(xrayOpacity);
    });

    return () => {
      ws.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule]);

  useEffect(() => {
    sceneRef.current?.setGasStandard(gasStandard);
  }, [gasStandard]);

  useEffect(() => {
    sceneRef.current?.setVolatileAgent(agent);
  }, [agent]);

  useEffect(() => {
    sceneRef.current?.setXrayLevel(xrayOpacity);
  }, [xrayOpacity]);

  const handleReset = () => {
    setParams(DEFAULT_PARAMS);
    setMysteryFaultName(null);
    setMysteryRevealed(false);
    setCogMode('sandbox');
    setXrayOpacity(0.75);
    workerRef.current?.postMessage({ type: 'RESET' });
  };

  const launchBlindMysteryFault = () => {
    const pool = FAULT_KEYS.filter((f) => f.key !== 'o2FlushActive');
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const cleanFaults = { ...DEFAULT_PARAMS.faults };
    cleanFaults[chosen.key] = true;

    setParams((prev) => ({
      ...prev,
      ventMode: 'VCV',
      bronchospasmHeterogeneity: 0,
      resistanceCmH2OPerLps: 5,
      faults: cleanFaults,
    }));
    setCogMode('blind_crisis');
    setXrayOpacity(0.0); // Lock opaque workstation faceplate
    setMysteryFaultName(locale.startsWith('fr') ? chosen.fr : chosen.en);
    setMysteryRevealed(false);
  };

  const revealMysteryXray = () => {
    setMysteryRevealed(true);
    setXrayOpacity(0.88);
  };

  const openShareQr = async () => {
    const encoded = btoa(JSON.stringify(params));
    const url = `${window.location.origin}${window.location.pathname}#state=${encodeURIComponent(encoded)}`;
    setShareUrl(url);
    const dataUrl = await QRCode.toDataURL(url, { width: 220, margin: 2 });
    setQrDataUrl(dataUrl);
    setShowQrModal(true);
  };

  const toggleFault = (key: keyof MachineAndPatientParams['faults']) => {
    setParams((prev) => ({
      ...prev,
      faults: { ...prev.faults, [key]: !prev.faults[key] },
    }));
  };

  const cylReserveLiters = cylSizeL * cylBar;

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col bg-[#090e17] text-slate-100">
      {/* Persistent educational safety banner */}
      <div className="bg-amber-950/60 border-b border-amber-500/30 px-3 py-1 text-[11px] text-amber-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>{t('eduDisclaimer')}</span>
          <span className="hidden sm:inline text-amber-300/90">• {BETA_NOTICE[locale]}</span>
        </div>
        <span className="hidden md:inline font-mono text-[10px] text-amber-300/80">
          Apache-2.0 • Zero Login • Offline PWA
        </span>
      </div>

      {/* Top Global Header & Standards Bar */}
      <header className="sticky top-0 z-30 bg-[#0d1422]/95 backdrop-blur border-b border-slate-800 px-3 py-2">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-none">{t('appTitle')}</h1>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{gpuBadge}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {/* Locale Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 gap-1">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as LocaleCode)}
                className="bg-transparent text-slate-100 text-xs outline-none cursor-pointer"
                aria-label="Language"
              >
                <option value="fr-FR" className="bg-slate-900">FR (Europe / Maroc / Afrique)</option>
                <option value="fr-CA" className="bg-slate-900">FR (Québec / OQLF)</option>
                <option value="en-INT" className="bg-slate-900">English (Intl)</option>
                <option value="ar-MA" className="bg-slate-900">العربية (المغرب / إفريقيا)</option>
              </select>
            </div>

            <QualitySelect locale={locale} />

            {/* Regional Gas Standard Switcher */}
            <select
              value={gasStandard}
              onChange={(e) => setGasStandard(e.target.value as GasStandardId)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 outline-none cursor-pointer"
              aria-label="Medical Gas Standard"
            >
              <option value="ISO_EU_AF" className="bg-slate-900">ISO 32 (White O2)</option>
              <option value="CSA_CA_QC" className="bg-slate-900">CSA Z7396.1 Québec (White O2)</option>
              <option value="NFPA_US" className="bg-slate-900">NFPA 99 US (Green O2)</option>
            </select>

            {/* Educator & Study Tools */}
            <button
              onClick={() => setSlowMo((s) => !s)}
              className={`px-2 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer ${
                slowMo
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              {slowMo ? '0.25x Slow' : '1.0x'}
            </button>

            <button
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Resume' : 'Pause'}
              className="px-2 py-1 rounded-lg border bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500 flex items-center gap-1 cursor-pointer"
            >
              {paused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setProjectorMode((p) => !p)}
              className={`px-2 py-1 rounded-lg border flex items-center gap-1 cursor-pointer ${
                projectorMode
                  ? 'bg-indigo-500/25 border-indigo-400 text-indigo-200'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
              title="Chalk-Talk Projector Mode"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Projector</span>
            </button>

            <button
              onClick={() => setShowChecklist(true)}
              className="px-2.5 py-1 rounded-lg border bg-slate-900 border-slate-700 text-emerald-300 hover:border-emerald-500 flex items-center gap-1 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>FOSO / ASA</span>
            </button>

            <button
              onClick={() => setShowEvidence(true)}
              className="px-2.5 py-1 rounded-lg border bg-slate-900 border-slate-700 text-cyan-300 hover:border-cyan-500 flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Evidence</span>
            </button>

            <button
              onClick={() => {
                openPrintableDebriefCard(activeModule, locale);
                queueOfflineXapiEvent(activeModule, 'practiced', `Opened structured debrief card (${locale})`).catch(() => {});
              }}
              className="px-2.5 py-1 rounded-lg border bg-slate-900 border-slate-700 text-amber-300 hover:border-amber-500 flex items-center gap-1 cursor-pointer"
              title="Printable debriefing card"
            >
              <span>Debrief</span>
            </button>

            <button
              onClick={openShareQr}
              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center gap-1 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">QR Share</span>
            </button>
          </div>
        </div>

        {/* Permanent 8-Module Navigation Strip */}
        <nav className="max-w-[1600px] mx-auto mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
          <ReviewStatusChip moduleTab={activeModule} locale={locale} onOpen={() => setShowReview(true)} />
          {MODULES_META.map((m) => {
            const active = activeModule === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveModule(m.id)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs border transition flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-cyan-500/20 border-cyan-400 text-white font-semibold'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="font-mono text-[10px] text-cyan-400">{m.short}</span>
                <span>{locale.startsWith('fr') ? m.titleFr : m.titleEn}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Workspace */}
      {activeModule === 'M1_M2' ? (
        <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* LEFT / MAIN COLUMN: 4D Three.js Viewport + OR Monitor */}
          <section className="lg:col-span-8 flex flex-col gap-3">
            <div className="relative bg-[#070b14] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="px-3 py-2 bg-[#0b1220]/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-slate-100">{t('xraySlider')}</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={xrayOpacity}
                    disabled={cogMode === 'blind_crisis' && !mysteryRevealed}
                    onChange={(e) => setXrayOpacity(parseFloat(e.target.value))}
                    className="w-28 sm:w-40"
                    aria-label={t('xraySlider')}
                  />
                  <span className="font-mono text-[11px] text-cyan-300 w-9">{Math.round(xrayOpacity * 100)}%</span>
                </div>

                {/* Cognitive Mode Switcher */}
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                  {(['guided', 'sandbox', 'blind_crisis'] as CognitiveMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setCogMode(mode);
                        if (mode === 'blind_crisis') launchBlindMysteryFault();
                      }}
                      className={`px-2 py-0.5 rounded-md cursor-pointer ${
                        cogMode === mode ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mode === 'guided' ? 'Guided' : mode === 'sandbox' ? 'Sandbox' : 'Blind ECOS'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Three.js Canvas Mount */}
              <div ref={viewportRef} className="w-full h-[360px] sm:h-[430px] relative touch-none" />

              {/* Blind Crisis Overlay Banner */}
              {cogMode === 'blind_crisis' && (
                <div className="px-3 py-2 bg-rose-950/90 border-t border-rose-500/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-100">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    {mysteryRevealed ? (
                      <span>
                        <strong>Diagnosis Revealed:</strong> {mysteryFaultName} — inspect the glowing 3D component above!
                      </span>
                    ) : (
                      <span>
                        <strong>Blind Mystery Fault Active:</strong> Chassis locked opaque. Diagnose from bellows motion, Paw curve, and capnogram!
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {!mysteryRevealed && (
                      <button
                        onClick={revealMysteryXray}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Reveal X-Ray & Debrief
                      </button>
                    )}
                    <button
                      onClick={launchBlindMysteryFault}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                    >
                      Next Mystery Fault
                    </button>
                  </div>
                </div>
              )}

              {/* Safety Gas-Code Reminder Footer */}
              <div className="px-3 py-1.5 bg-[#0b1220] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>{REGIONAL_GAS_STANDARDS[gasStandard].safetyBanner[locale]}</span>
                <span className="font-mono text-[10px] text-cyan-400/90">
                  Drag to orbit • Pinch/Scroll to zoom • O2 Blue | CO2 Red | Agent ISO 5360 | Argon Violet
                </span>
              </div>
            </div>

            {/* Bedside Monitor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-300">
                  Live Synchronized OR Monitor (50 Hz Equation of Motion & Capnography)
                </span>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showEqZones}
                    onChange={(e) => setShowEqZones(e.target.checked)}
                    className="rounded"
                  />
                  Color-Code Equation of Motion (F*R vs V/C)
                </label>
              </div>
              <BedsideMonitorCanvas
                snapshot={snapshot}
                showEquationZones={showEqZones}
                projectorMode={projectorMode}
                blindMode={cogMode === 'blind_crisis' && !mysteryRevealed}
              />
            </div>
          </section>

          {/* RIGHT COLUMN: Controls, Drives & Fault Injector */}
          <aside className="lg:col-span-4 flex flex-col gap-3">
            {/* 1. Swappable Ventilator Drive */}
            <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  1. Swappable Workstation Drive (6 Architectures)
                </h2>
                <button
                  onClick={handleReset}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>

              <select
                value={params.driveType}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    driveType: e.target.value as VentilatorDriveType,
                    o2Source: e.target.value === 'glostavent_drawover' ? 'concentrator' : p.o2Source,
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white outline-none"
                aria-label="Ventilator drive"
              >
                {(Object.keys(DRIVE_LABELS) as VentilatorDriveType[]).map((d) => (
                  <option key={d} value={d} className="bg-slate-900">
                    {DRIVE_LABELS[d].label}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-cyan-300/90 bg-cyan-950/30 border border-cyan-500/20 rounded-lg px-2.5 py-1.5">
                {DRIVE_LABELS[params.driveType].tag}
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {(['VCV', 'PCV', 'MANUAL_APL_SPONT'] as VentilationMode[]).map((vm) => (
                  <button
                    key={vm}
                    onClick={() => setParams((p) => ({ ...p, ventMode: vm }))}
                    className={`py-1.5 px-1 rounded-lg border text-[11px] font-medium cursor-pointer ${
                      params.ventMode === vm
                        ? 'bg-cyan-600 border-cyan-400 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {vm === 'MANUAL_APL_SPONT' ? 'Spont + APL' : vm}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">O2 Supply Source</label>
                  <select
                    value={params.o2Source}
                    onChange={(e) => setParams((p) => ({ ...p, o2Source: e.target.value as 'pipeline' | 'concentrator' }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                  >
                    <option value="pipeline">Wall Pipeline (100% O2)</option>
                    <option value="concentrator">O2 Concentrator (~95% + Argon)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">ISO 5360 Vaporizer</label>
                  <select
                    value={agent}
                    onChange={(e) => setAgent(e.target.value as VolatileAgentId)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                  >
                    {(Object.keys(VOLATILE_AGENTS) as VolatileAgentId[]).map((a) => (
                      <option key={a} value={a}>
                        {VOLATILE_AGENTS[a].name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Fresh Gas, Ventilator & Lung Mechanics */}
            <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2.5 text-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400">2. Gas Flow, APL & Lung Mechanics</h2>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span>O2 Flow</span>
                    <span className="font-mono text-sky-300">{params.fgfO2Lpm.toFixed(1)} L/m</span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={10}
                    step={0.1}
                    value={params.fgfO2Lpm}
                    onChange={(e) => setParams((p) => ({ ...p, fgfO2Lpm: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span>Air Flow</span>
                    <span className="font-mono text-slate-300">{params.fgfAirLpm.toFixed(1)} L/m</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.1}
                    value={params.fgfAirLpm}
                    onChange={(e) => setParams((p) => ({ ...p, fgfAirLpm: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span>Vaporizer Dial</span>
                    <span className="font-mono text-yellow-300">{params.vaporizerDialPct.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.2}
                    value={params.vaporizerDialPct}
                    onChange={(e) => setParams((p) => ({ ...p, vaporizerDialPct: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span>{params.ventMode === 'MANUAL_APL_SPONT' ? t('aplValve') : 'PEEP Set'}</span>
                    <span className="font-mono text-amber-300">
                      {params.ventMode === 'MANUAL_APL_SPONT' ? params.aplCmH2O : params.peepSetCmH2O} cmH2O
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={params.ventMode === 'MANUAL_APL_SPONT' ? 40 : 18}
                    step={1}
                    value={params.ventMode === 'MANUAL_APL_SPONT' ? params.aplCmH2O : params.peepSetCmH2O}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setParams((p) =>
                        p.ventMode === 'MANUAL_APL_SPONT' ? { ...p, aplCmH2O: val } : { ...p, peepSetCmH2O: val }
                      );
                    }}
                    className="w-full"
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span>Airway Resistance (R)</span>
                    <span className="font-mono text-amber-300">{params.resistanceCmH2OPerLps}</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={30}
                    step={1}
                    value={params.resistanceCmH2OPerLps}
                    onChange={(e) => {
                      const r = parseFloat(e.target.value);
                      setParams((p) => ({
                        ...p,
                        resistanceCmH2OPerLps: r,
                        bronchospasmHeterogeneity: r > 10 ? Math.min(1, (r - 10) / 16) : 0,
                      }));
                    }}
                    className="w-full"
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span>Lung Compliance (C)</span>
                    <span className="font-mono text-cyan-300">{params.complianceMlPerCmH2O} mL/cmH2O</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={90}
                    step={2}
                    value={params.complianceMlPerCmH2O}
                    onChange={(e) => setParams((p) => ({ ...p, complianceMlPerCmH2O: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </label>
              </div>

              {/* Guided Discovery Quick Presets */}
              <div className="pt-1 flex flex-wrap gap-1.5">
                <button
                  onClick={() =>
                    setParams((p) => ({
                      ...DEFAULT_PARAMS,
                      driveType: p.driveType,
                      resistanceCmH2OPerLps: 24,
                      bronchospasmHeterogeneity: 0.9,
                    }))
                  }
                  className="px-2 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] hover:bg-amber-500/25 cursor-pointer"
                >
                  Bronchospasm (Shark Fin)
                </button>
                <button
                  onClick={() => setParams((p) => ({ ...DEFAULT_PARAMS, driveType: p.driveType, complianceMlPerCmH2O: 26 }))}
                  className="px-2 py-1 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-[11px] hover:bg-cyan-500/25 cursor-pointer"
                >
                  Pneumoperitoneum (Low C)
                </button>
                <button
                  onClick={() =>
                    setParams(() => ({
                      ...DEFAULT_PARAMS,
                      driveType: 'ascending_bellows',
                      ventMode: 'MANUAL_APL_SPONT',
                      aplCmH2O: 12,
                      fgfO2Lpm: 2.0,
                      fgfAirLpm: 0,
                    }))
                  }
                  className="px-2 py-1 rounded bg-purple-500/15 border border-purple-500/30 text-purple-200 text-[11px] hover:bg-purple-500/25 cursor-pointer"
                >
                  APL vs CPAP Demo
                </button>
                <button
                  onClick={() =>
                    setParams(() => ({
                      ...DEFAULT_PARAMS,
                      driveType: 'glostavent_drawover',
                      o2Source: 'concentrator',
                      fgfO2Lpm: 0.5,
                      fgfAirLpm: 0,
                    }))
                  }
                  className="px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-[11px] hover:bg-emerald-500/25 cursor-pointer"
                >
                  Low-Flow Argon Trap
                </button>
              </div>
            </div>

            {/* 3. Fault Injection Lab */}
            <div className="bg-[#0d1422] border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-rose-400">3. Interactive Clinical Fault Lab</h2>
                <button
                  onClick={launchBlindMysteryFault}
                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <EyeOff className="w-3 h-3" /> Blind Mystery
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5">
                {FAULT_KEYS.map((f) => {
                  const active = params.faults[f.key];
                  const hideLabel = cogMode === 'blind_crisis' && !mysteryRevealed;
                  return (
                    <button
                      key={f.key}
                      disabled={hideLabel}
                      onClick={() => toggleFault(f.key)}
                      className={`text-left px-2.5 py-1.5 rounded-lg border text-[11px] transition flex items-center justify-between cursor-pointer disabled:opacity-40 ${
                        active && !hideLabel
                          ? 'bg-rose-500/20 border-rose-400 text-rose-100 font-semibold'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <span>{locale.startsWith('fr') ? f.fr : f.en}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${active && !hideLabel ? 'bg-rose-400 animate-pulse' : 'bg-slate-700'}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </main>
      ) : (
        <ModuleRouter activeModule={activeModule} locale={locale} />
      )}

      {/* SLIDE-OVER: SFAR FOSO / ASA / Mapleson Drawer */}
      {showChecklist && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-end" onClick={() => setShowChecklist(false)}>
          <div
            className="w-full max-w-lg bg-[#0d1422] border-l border-slate-800 h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Pre-Use Checkouts & Mapleson Circuits</h3>
              <button onClick={() => setShowChecklist(false)} aria-label="Close" className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-800 flex gap-1.5 text-xs">
              {(['SFAR', 'ASA', 'MAPLESON'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setChecklistType(tab)}
                  className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer ${
                    checklistType === tab ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {tab === 'SFAR' ? 'SFAR FOSO' : tab === 'ASA' ? 'ASA 2008 (15 items)' : 'Mapleson A–F'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {checklistType === 'SFAR' && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 space-y-2">
                  <div className="font-semibold text-cyan-300">Reserve O2 Cylinder Math (L = Size x Bar)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <label>
                      <span className="text-[10px] text-slate-400">Cylinder Capacity (L)</span>
                      <input
                        type="number"
                        value={cylSizeL}
                        onChange={(e) => setCylSizeL(Number(e.target.value) || 0)}
                        className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded px-2 py-1"
                      />
                    </label>
                    <label>
                      <span className="text-[10px] text-slate-400">Gauge Pressure (bar)</span>
                      <input
                        type="number"
                        value={cylBar}
                        onChange={(e) => setCylBar(Number(e.target.value) || 0)}
                        className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded px-2 py-1"
                      />
                    </label>
                  </div>
                  <div
                    className={`font-mono text-xs px-2 py-1 rounded ${
                      cylReserveLiters <= 150
                        ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                    }`}
                  >
                    Reserve = {cylReserveLiters} L —{' '}
                    {cylReserveLiters <= 150 ? 'REPLACE CYLINDER (<= 150 L threshold)' : 'ADEQUATE RESERVE'}
                  </div>
                </div>
              )}

              {checklistType !== 'MAPLESON'
                ? (checklistType === 'SFAR' ? SFAR_FOSO_CHECKLIST : ASA_2008_CHECKLIST).map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checkedItems[item.id])}
                        onChange={() => setCheckedItems((c) => ({ ...c, [item.id]: !c[item.id] }))}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-100">
                          #{item.number} {item.label[locale]}
                          {item.betweenCases && (
                            <span className="ml-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                              Between Cases
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400">{item.passCriterion[locale]}</p>
                      </div>
                    </label>
                  ))
                : MAPLESON_CIRCUITS.map((mc) => (
                    <div key={mc.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-cyan-300">
                          Mapleson {mc.id} ({mc.eponym})
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          Spont #{mc.spontaneousEfficiencyRank} | PPV #{mc.controlledEfficiencyRank}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Spont FGF: {mc.spontaneousFgfRule} • Controlled FGF: {mc.controlledFgfRule}
                      </div>
                      <p className="text-slate-400">{mc.clinicalNote[locale]}</p>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}

      {showReview && <ReviewDrawer moduleTab={activeModule} locale={locale} onClose={() => setShowReview(false)} />}

      {/* SLIDE-OVER: Evidence & Equations Drawer */}
      {showEvidence && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-end" onClick={() => setShowEvidence(false)}>
          <div
            className="w-full max-w-lg bg-[#0d1422] border-l border-slate-800 h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Evidence, Equations & Open Provenance</h3>
              <button onClick={() => setShowEvidence(false)} aria-label="Close" className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {EVIDENCE_REGISTRY.map((ev) => (
                <div key={ev.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="font-bold text-cyan-300">{ev.title}</span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">{ev.moduleIds.join(', ')}</span>
                  </div>
                  {ev.equationLatex && (
                    <div className="font-mono text-[11px] bg-slate-950 px-2 py-1.5 rounded text-amber-300 overflow-x-auto">
                      {ev.equationLatex}
                    </div>
                  )}
                  <p className="text-slate-300 leading-relaxed">{ev.keyFinding}</p>
                  <p className="text-emerald-300/90">Takeaway: {ev.clinicalTakeaway}</p>
                  <div className="flex justify-between items-center pt-1 text-[10px] text-slate-400">
                    <span>{ev.sourceCitation}</span>
                    <a href={ev.sourceUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline shrink-0 ml-2">
                      Source
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Stateful URL & QR Code Share */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4" onClick={() => setShowQrModal(false)}>
          <div
            className="bg-[#0d1422] border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Educator Scenario Share & QR Code</h3>
              <button onClick={() => setShowQrModal(false)} aria-label="Close" className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Scan from any trainee smartphone to open this exact workstation drive, gas flow, and active fault setup.
            </p>
            {qrDataUrl && <img src={qrDataUrl} alt="Scenario QR Code" className="mx-auto rounded-xl bg-white p-2" />}
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-mono text-slate-300"
              />
              <button
                onClick={() => navigator.clipboard?.writeText(shareUrl)}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
