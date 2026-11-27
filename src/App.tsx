import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  CheckSquare,
  ChevronDown,
  Eye,
  EyeOff,
  Layers,
  Pause,
  Play,
  Presentation,
  Printer,
  QrCode,
  RotateCcw,
  Settings,
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
import { EVIDENCE_FR } from './evidence/evidenceFr';
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
import { CurriculumDrawer } from './components/CurriculumDrawer';
import { BETA_NOTICE, ReviewDrawer } from './components/ReviewPanel';
import { QualitySelect } from './components/QualitySelect';
import { HomePage } from './components/HomePage';
import { ModuleGuidePanel } from './components/ModuleGuidePanel';
import { ClinicalStepper } from './components/ClinicalStepper';
import { UpdateToast } from './components/UpdateToast';
import { MobileDock } from './components/MobileDock';
import { GROUPS, MODULE_GUIDES } from './standards/moduleGuides';
import { openPrintableDebriefCard, queueOfflineXapiEvent } from './utils/lmsAndDebrief';

type ModuleId = 'HOME' | 'M1_M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9' | 'M10' | 'M11';
const MODULE_IDS = ['M1_M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11'] as const;

/** Landing view: a shared machine state opens M1, `#M9`-style links open that module, otherwise the home page. */
function initialModule(): ModuleId {
  if (typeof window === 'undefined') return 'HOME';
  const h = window.location.hash;
  if (h.startsWith('#state=')) return 'M1_M2';
  const id = h.slice(1).toUpperCase().replace('+', '_');
  return (MODULE_IDS as readonly string[]).includes(id) ? (id as ModuleId) : 'HOME';
}
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

/** Navigation order follows the workflow: programme, pre-op, machine, drugs, airway, regional, crisis. */
const NAV_ORDER: Exclude<ModuleId, 'HOME'>[] = ['M11', 'M10', 'M1_M2', 'M3', 'M4', 'M5', 'M8', 'M6', 'M7', 'M9'];
const MODULES_META = NAV_ORDER.map((id) => {
  const g = MODULE_GUIDES.find((x) => x.id === id)!;
  return { id, short: id.replace('_', '+'), titleFr: g.title.fr, titleEn: g.title.en };
});

const DRIVE_LABELS: Record<VentilatorDriveType, { fr: string; en: string; tagFr: string; tagEn: string }> = {
  ascending_bellows: { fr: 'Soufflet ascendant', en: 'Ascending bellows', tagFr: 'S’affaisse visiblement en cas de déconnexion • le débit de gaz frais s’ajoute au volume courant', tagEn: 'Collapses visibly on disconnect • fresh gas flow adds to tidal volume' },
  descending_bellows: { fr: 'Soufflet descendant (ancien)', en: 'Descending bellows (legacy)', tagFr: 'Continue de se remplir par gravité en cas de déconnexion : piège silencieux', tagEn: 'Keeps refilling by gravity on disconnect: silent trap' },
  piston_fgd: { fr: 'Piston électrique + découplage du gaz frais', en: 'Electric piston + fresh gas decoupling', tagFr: 'Entraînement électrique (pas de gaz moteur) • le découplage évite le volotraumatisme au flush', tagEn: 'Electric drive (no drive gas) • decoupling prevents flush volutrauma' },
  turbine: { fr: 'Turbine haute vitesse', en: 'High-speed turbine / blower', tagFr: 'Compensation des fuites • CPAP active en ventilation spontanée', tagEn: 'Leak compensation • active CPAP in spontaneous mode' },
  volume_reflector: { fr: 'Réflecteur de volume', en: 'Volume reflector', tagFr: 'Compensation des fuites • front gazeux du réflecteur visible', tagEn: 'Leak compensation • reflector gas front visible' },
  glostavent_drawover: { fr: 'Draw-over + concentrateur d’O₂', en: 'Draw-over + O₂ concentrator', tagFr: 'Contexte à ressources limitées • fonctionne sans O₂ mural', tagEn: 'Low-resource setting • runs without wall O₂' },
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
  const [activeModule, setActiveModule] = useState<ModuleId>(initialModule);
  const [locale, setLocale] = useState<LocaleCode>('fr-FR');
  const [gasStandard, setGasStandard] = useState<GasStandardId>('ISO_EU_AF');
  const [agent, setAgent] = useState<VolatileAgentId>('sevoflurane');
  const [cogMode, setCogMode] = useState<CognitiveMode>('sandbox');
  const [xrayOpacity, setXrayOpacity] = useState<number>(0.75);
  // DESIGN.md §1.5: 3D labels start off; one toggle in the viewport turns them on.
  const [showLabels3d, setShowLabels3d] = useState(false);
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
  const [showCurriculum, setShowCurriculum] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(false);
  const [showChecklist, setShowChecklist] = useState<boolean>(false);
  const [checklistType, setChecklistType] = useState<'SFAR' | 'ASA' | 'MAPLESON'>('SFAR');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [cylSizeL, setCylSizeL] = useState<number>(5);
  const [cylBar, setCylBar] = useState<number>(80);

  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showModMenu, setShowModMenu] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<WorkstationScene | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const paramsRef = useRef<MachineAndPatientParams>(params);
  paramsRef.current = params;

  const t = (key: string) => CLINICAL_GLOSSARY[key]?.[locale] ?? key;
  const isRtl = locale === 'ar-MA';
  const fr = locale !== 'en-INT';
  const L = (f: string, e: string) => (fr ? f : e);
  const isM1 = activeModule === 'M1_M2';
  const goTo = (m: ModuleId) => {
    setActiveModule(m);
    window.scrollTo({ top: 0 });
  };

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
      ws.setLanguage(locale !== 'en-INT');
      ws.setLabelsVisible(showLabels3d);
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

  useEffect(() => {
    sceneRef.current?.setLanguage(locale !== 'en-INT');
  }, [locale]);

  useEffect(() => {
    sceneRef.current?.setLabelsVisible(showLabels3d);
  }, [showLabels3d]);

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
    setMysteryFaultName(locale !== 'en-INT' ? chosen.fr : chosen.en);
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
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col bg-oa-canvas text-slate-100">
      <UpdateToast fr={fr} />
      {/* Persistent educational safety notice (project rule: keep the disclaimer) */}
      <div className="bg-oa-canvas border-b border-amber-500/20 px-3 h-6 text-[10.5px] text-amber-200/85 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldAlert className="w-3 h-3 shrink-0 text-amber-400" />
          <span className="truncate">{t('eduDisclaimer')}</span>
          <span className="hidden lg:inline text-amber-300/70 truncate">• {BETA_NOTICE[locale]}</span>
        </div>
        <span className="hidden md:inline font-mono text-[10px] text-slate-500 shrink-0">
          {L('Apache-2.0 • sans compte • hors ligne', 'Apache-2.0 • no login • offline')}
        </span>
      </div>

      {/* One-row instrument bar */}
      <header className="relative md:sticky md:top-0 z-30 bg-oa-surface border-b border-oa-hairline h-11 px-2 sm:px-3">
        <div className="max-w-[1600px] h-full mx-auto flex items-center gap-2">
          <button onClick={() => goTo('HOME')} className="flex items-center gap-2 text-start cursor-pointer shrink-0" title={L('Accueil', 'Home')}>
            <div className="w-6 h-6 rounded border border-oa-border-strong flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-sig-ecg" />
            </div>
            <span className="hidden md:inline text-[13px] font-semibold tracking-tight text-white">Open Anesthésie 4D</span>
          </button>

          <div className="w-px h-5 bg-oa-hairline hidden sm:block" />

          {/* Module switcher, grouped by clinical workflow */}
          <div className="relative min-w-0">
            <button
              onClick={() => { setShowModMenu((s) => !s); setShowSettings(false); }}
              className="h-8 max-w-[62vw] sm:max-w-none px-2.5 rounded border border-oa-hairline bg-oa-raised hover:bg-oa-hover flex items-center gap-2 text-xs text-slate-100 cursor-pointer"
              aria-expanded={showModMenu}
              aria-haspopup="menu"
            >
              {activeModule === 'HOME' ? (
                <span>{L('Modules', 'Modules')}</span>
              ) : (
                <>
                  <span className="font-mono text-[10px] text-slate-400">{activeModule.replace('_', '+')}</span>
                  <span className="truncate">{fr ? MODULES_META.find((m) => m.id === activeModule)?.titleFr : MODULES_META.find((m) => m.id === activeModule)?.titleEn}</span>
                </>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
            {showModMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowModMenu(false)} />
                <div role="menu" className="absolute z-50 mt-1 start-0 w-[min(92vw,560px)] max-h-[75vh] overflow-y-auto bg-oa-surface border border-oa-border-strong rounded shadow-2xl p-2 grid sm:grid-cols-2 gap-x-3 gap-y-2">
                  {GROUPS.map((g) => {
                    const items = MODULES_META.filter((m) => MODULE_GUIDES.find((x) => x.id === m.id)?.group === g.id);
                    if (!items.length) return null;
                    return (
                      <div key={g.id}>
                        <div className="px-2 pt-1 pb-0.5 text-[10px] uppercase tracking-wider text-slate-500">{fr ? g.title.fr : g.title.en}</div>
                        {items.map((m) => (
                          <button
                            key={m.id}
                            role="menuitem"
                            onClick={() => { goTo(m.id); setShowModMenu(false); }}
                            className={`w-full text-start px-2 py-1.5 rounded flex items-center gap-2 text-xs cursor-pointer ${activeModule === m.id ? 'bg-oa-hover text-white' : 'text-slate-300 hover:bg-oa-raised hover:text-white'}`}
                          >
                            <span className="font-mono text-[10px] text-slate-500 w-9 shrink-0">{m.short}</span>
                            <span>{fr ? m.titleFr : m.titleEn}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Simulation status (M1 only) */}
          {isM1 && (
            <div className="hidden sm:flex items-center gap-1 ms-1">
              <span className={`px-1.5 h-6 rounded border text-[10px] font-mono flex items-center ${paused ? 'border-amber-500/40 text-amber-300' : 'border-oa-hairline text-sig-ecg'}`}>
                {paused ? L('PAUSE', 'PAUSED') : 'LIVE 50 Hz'}
              </span>
              <button
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? L('Reprendre', 'Resume') : L('Pause', 'Pause')}
                title={paused ? L('Reprendre', 'Resume') : L('Pause', 'Pause')}
                className="w-7 h-7 rounded border border-oa-hairline bg-oa-raised hover:bg-oa-hover flex items-center justify-center cursor-pointer"
              >
                {paused ? <Play className="w-3.5 h-3.5 text-sig-ecg" /> : <Pause className="w-3.5 h-3.5 text-slate-300" />}
              </button>
              <button
                onClick={() => setSlowMo((s) => !s)}
                className={`h-7 px-2 rounded border text-[11px] font-mono cursor-pointer ${slowMo ? 'border-slate-400 bg-oa-hover text-white' : 'border-oa-hairline bg-oa-raised text-slate-300 hover:bg-oa-hover'}`}
                title={L('Vitesse de simulation', 'Simulation speed')}
              >
                {slowMo ? '×0,25' : '×1'}
              </button>
            </div>
          )}

          <div className="flex-1" />

          <button
            onClick={() => setShowEvidence(true)}
            className="h-8 px-2.5 rounded border border-oa-hairline bg-oa-raised hover:bg-oa-hover text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer"
            title={L('Sources et équations', 'Evidence and equations')}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{L('Sources', 'Evidence')}</span>
          </button>

          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as LocaleCode)}
            className="h-8 w-[4.5rem] sm:w-auto bg-oa-raised border border-oa-hairline rounded px-1.5 text-xs text-slate-100 outline-none cursor-pointer"
            aria-label="Language"
            title={L('Langue et région', 'Language and region')}
          >
            <option value="fr-FR" className="bg-oa-surface">FR · Europe / Maroc / Afrique</option>
            <option value="fr-CA" className="bg-oa-surface">FR · Québec</option>
            <option value="en-INT" className="bg-oa-surface">EN · International</option>
            <option value="ar-MA" className="bg-oa-surface">AR · المغرب</option>
          </select>

          {/* Settings and tools popover */}
          <div className="relative">
            <button
              onClick={() => { setShowSettings((s) => !s); setShowModMenu(false); }}
              className="w-8 h-8 rounded border border-oa-hairline bg-oa-raised hover:bg-oa-hover flex items-center justify-center cursor-pointer"
              aria-label={L('Réglages et outils', 'Settings and tools')}
              title={L('Réglages et outils', 'Settings and tools')}
              aria-expanded={showSettings}
            >
              <Settings className="w-4 h-4 text-slate-300" />
            </button>
            {showSettings && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                <div className="absolute z-50 mt-1 end-0 w-72 bg-oa-surface border border-oa-border-strong rounded shadow-2xl p-2 text-xs flex flex-col gap-1.5">
                  <div className="px-1 text-[10px] uppercase tracking-wider text-slate-500">{L('Affichage', 'Display')}</div>
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className="text-slate-300">{L('Qualité 3D', '3D quality')}</span>
                    <QualitySelect locale={locale} />
                  </div>
                  {isM1 && (
                    <>
                      <div className="flex items-center justify-between gap-2 px-1">
                        <span className="text-slate-300">{L('Couleurs des gaz', 'Gas colours')}</span>
                        <select
                          value={gasStandard}
                          onChange={(e) => setGasStandard(e.target.value as GasStandardId)}
                          className="bg-oa-raised border border-oa-hairline rounded px-1.5 py-1 text-xs text-slate-100 outline-none cursor-pointer"
                          aria-label={L('Norme des couleurs des gaz médicaux', 'Medical gas colour standard')}
                        >
                          <option value="ISO_EU_AF" className="bg-oa-surface">{L('ISO 32 (O₂ blanc)', 'ISO 32 (white O₂)')}</option>
                          <option value="CSA_CA_QC" className="bg-oa-surface">{L('CSA Québec (O₂ blanc)', 'CSA Québec (white O₂)')}</option>
                          <option value="NFPA_US" className="bg-oa-surface">{L('NFPA 99 É.-U. (O₂ vert)', 'NFPA 99 US (green O₂)')}</option>
                        </select>
                      </div>
                      <button onClick={() => setProjectorMode((p) => !p)} className={`text-start px-2 py-1.5 rounded flex items-center gap-2 cursor-pointer ${projectorMode ? 'bg-oa-hover text-white' : 'text-slate-300 hover:bg-oa-raised'}`}>
                        <Presentation className="w-3.5 h-3.5" />
                        {L('Mode projecteur (gros caractères)', 'Projector mode (large text)')}{projectorMode ? ' ✓' : ''}
                      </button>
                    </>
                  )}
                  <div className="h-px bg-oa-hairline my-0.5" />
                  <div className="px-1 text-[10px] uppercase tracking-wider text-slate-500">{L('Outils', 'Tools')}</div>
                  {isM1 && (
                    <button onClick={() => { setShowChecklist(true); setShowSettings(false); }} className="text-start px-2 py-1.5 rounded flex items-center gap-2 text-slate-300 hover:bg-oa-raised cursor-pointer">
                      <CheckSquare className="w-3.5 h-3.5" />{L('Check-lists de l’appareil (SFAR, ASA)', 'Machine checklists (SFAR, ASA)')}
                    </button>
                  )}
                  <button onClick={() => { setShowCurriculum(true); setShowSettings(false); }} className="text-start px-2 py-1.5 rounded flex items-center gap-2 text-slate-300 hover:bg-oa-raised cursor-pointer">
                    <GraduationCap className="w-3.5 h-3.5" />{L('Couverture du programme', 'Curriculum coverage')}
                  </button>
                  {activeModule !== 'HOME' && (
                    <button
                      onClick={() => {
                        openPrintableDebriefCard(activeModule, locale);
                        queueOfflineXapiEvent(activeModule, 'practiced', `Opened structured debrief card (${locale})`).catch(() => {});
                        setShowSettings(false);
                      }}
                      className="text-start px-2 py-1.5 rounded flex items-center gap-2 text-slate-300 hover:bg-oa-raised cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />{L('Fiche de débriefing imprimable', 'Printable debriefing card')}
                    </button>
                  )}
                  {isM1 && (
                    <button onClick={() => { openShareQr(); setShowSettings(false); }} className="text-start px-2 py-1.5 rounded flex items-center gap-2 text-slate-300 hover:bg-oa-raised cursor-pointer">
                      <QrCode className="w-3.5 h-3.5" />{L('Partager ce réglage (QR code)', 'Share this setup (QR code)')}
                    </button>
                  )}
                  <div className="h-px bg-oa-hairline my-0.5" />
                  <div className="px-2 text-[10px] text-slate-500 font-mono">{isM1 ? gpuBadge : L('Gratuit • sans compte • hors ligne', 'Free • no account • offline')}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {activeModule !== 'HOME' && <ModuleGuidePanel key={activeModule} moduleId={activeModule} locale={locale} onOpenReview={() => setShowReview(true)} />}

      {/* Main Workspace */}
      {activeModule === 'HOME' ? (
        <HomePage
          locale={locale}
          onOpen={(m) => goTo(m)}
          onOpenCurriculum={() => setShowCurriculum(true)}
          onOpenEvidence={() => setShowEvidence(true)}
        />
      ) : activeModule === 'M1_M2' ? (
        <main className="flex-1 lg:flex-none max-w-[1600px] w-full mx-auto p-3 pb-16 md:pb-3 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] gap-3 lg:h-[calc(100dvh_-_106px)] lg:min-h-[640px]">
          {/* LEFT / MAIN COLUMN (≈ 68 %, DESIGN.md §6): 3D view above, ventilator curves docked below.
              On desktop both stay on screen together; the 3D view takes the height left over. */}
          <section id="m1-view" className="lg:col-span-8 flex flex-col gap-3 lg:min-h-0 scroll-mt-2">
            <div className="relative bg-oa-canvas border border-slate-800 rounded-xl overflow-hidden flex flex-col lg:flex-1 lg:min-h-0">
              <div className="px-3 py-2 bg-oa-surface2/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
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
                  <label className="flex items-center gap-1 ml-2 text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={showLabels3d} onChange={(e) => setShowLabels3d(e.target.checked)} />
                    {L('Légendes', 'Labels')}
                  </label>
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
                      {mode === 'guided' ? L('Guidé', 'Guided') : mode === 'sandbox' ? L('Libre', 'Sandbox') : L('ECOS à l’aveugle', 'Blind OSCE')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Three.js Canvas Mount */}
              <div ref={viewportRef} className="w-full h-[42dvh] min-h-[260px] sm:h-[430px] lg:h-auto lg:flex-1 lg:min-h-[220px] relative touch-none" />

              {/* Blind Crisis Overlay Banner */}
              {cogMode === 'blind_crisis' && (
                <div className="px-3 py-2 bg-rose-950/90 border-t border-rose-500/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-100">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    {mysteryRevealed ? (
                      <span>
                        <strong>{L('Diagnostic : ', 'Diagnosis: ')}</strong> {mysteryFaultName} — {L('repérez la pièce en surbrillance dans la vue 3D.', 'find the highlighted part in the 3D view.')}
                      </span>
                    ) : (
                      <span>
                        <strong>{L('Panne cachée active : ', 'Hidden fault active: ')}</strong>{L('capot verrouillé opaque. Faites le diagnostic à partir du mouvement du soufflet, de la courbe de pression et du capnogramme.', 'casing locked opaque. Diagnose from bellows motion, the pressure curve and the capnogram.')}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {!mysteryRevealed && (
                      <button
                        onClick={revealMysteryXray}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> {L('Révéler et débriefer', 'Reveal and debrief')}
                      </button>
                    )}
                    <button
                      onClick={launchBlindMysteryFault}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                    >
                      {L('Panne suivante', 'Next fault')}
                    </button>
                  </div>
                </div>
              )}

              {/* Safety Gas-Code Reminder Footer */}
              <div className="px-3 py-1.5 bg-oa-surface2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>{REGIONAL_GAS_STANDARDS[gasStandard].safetyBanner[locale]}</span>
                <span className="font-mono text-[10px] text-cyan-400/90">
                  {L('Glisser pour tourner • pincer ou molette pour zoomer • particules : O₂ bleu | CO₂ rouge | halogéné couleur ISO 5360 | argon violet', 'Drag to orbit • pinch or scroll to zoom • particles: O₂ blue | CO₂ red | agent ISO 5360 colour | argon violet')}
                </span>
              </div>
            </div>

            {/* Bedside Monitor */}
            <div id="m1-curves" className="space-y-1.5 shrink-0 scroll-mt-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-300">
                  {L('Moniteur synchronisé : pression, débit et capnogramme (équation du mouvement, 50 Hz)', 'Synchronised monitor: pressure, flow and capnogram (equation of motion, 50 Hz)')}
                </span>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showEqZones}
                    onChange={(e) => setShowEqZones(e.target.checked)}
                    className="rounded"
                  />
                  {L('Colorer l’équation du mouvement (débit×R / V/C)', 'Colour the equation of motion (flow×R / V/C)')}
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
          <aside id="m1-settings" className="lg:col-span-4 flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:pe-1 scroll-mt-2">
            {/* 1. Swappable Ventilator Drive */}
            <div className="bg-oa-surface border border-slate-800 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  {L('1. Type de ventilateur (6 architectures)', '1. Ventilator drive (6 architectures)')}
                </h2>
                <button
                  onClick={handleReset}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> {L('Réinitialiser', 'Reset')}
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
                aria-label={L('Type de ventilateur', 'Ventilator drive')}
              >
                {(Object.keys(DRIVE_LABELS) as VentilatorDriveType[]).map((d) => (
                  <option key={d} value={d} className="bg-slate-900">
                    {fr ? DRIVE_LABELS[d].fr : DRIVE_LABELS[d].en}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-cyan-300/90 bg-cyan-950/30 border border-cyan-500/20 rounded-lg px-2.5 py-1.5">
                {fr ? DRIVE_LABELS[params.driveType].tagFr : DRIVE_LABELS[params.driveType].tagEn}
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
                    {vm === 'MANUAL_APL_SPONT' ? L('Spontanée + APL', 'Spont + APL') : fr ? (vm === 'VCV' ? 'VC (volume)' : 'PC (pression)') : vm}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{L('Source d’O₂', 'O₂ supply')}</label>
                  <select
                    value={params.o2Source}
                    onChange={(e) => setParams((p) => ({ ...p, o2Source: e.target.value as 'pipeline' | 'concentrator' }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                  >
                    <option value="pipeline">{L('Réseau mural (O₂ 100 %)', 'Wall pipeline (100% O₂)')}</option>
                    <option value="concentrator">{L('Concentrateur d’O₂ (~95 % + argon)', 'O₂ concentrator (~95% + argon)')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{L('Évaporateur (ISO 5360)', 'Vaporizer (ISO 5360)')}</label>
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
            <div className="bg-oa-surface border border-slate-800 rounded-xl p-3 space-y-2.5 text-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400">{L('2. Débits, APL et mécanique pulmonaire', '2. Gas flow, APL and lung mechanics')}</h2>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                <ClinicalStepper
                  label={L('Débit O₂', 'O₂ flow')}
                  value={params.fgfO2Lpm}
                  min={0.2}
                  max={10}
                  step={0.1}
                  decimals={1}
                  unit="L/min"
                  presets={[0.5, 1, 2, 6]}
                  onChange={(v) => setParams((p) => ({ ...p, fgfO2Lpm: v }))}
                />
                <ClinicalStepper
                  label={L('Débit air', 'Air flow')}
                  value={params.fgfAirLpm}
                  min={0}
                  max={10}
                  step={0.1}
                  decimals={1}
                  unit="L/min"
                  presets={[0, 0.5, 1, 2]}
                  onChange={(v) => setParams((p) => ({ ...p, fgfAirLpm: v }))}
                />
                <ClinicalStepper
                  label={L('Réglage évaporateur', 'Vaporizer dial')}
                  value={params.vaporizerDialPct}
                  min={0}
                  max={8}
                  step={0.2}
                  decimals={1}
                  unit="%"
                  tone="text-yellow-300"
                  onChange={(v) => setParams((p) => ({ ...p, vaporizerDialPct: v }))}
                />
                <ClinicalStepper
                  label={params.ventMode === 'MANUAL_APL_SPONT' ? t('aplValve') : L('PEP réglée', 'PEEP set')}
                  value={params.ventMode === 'MANUAL_APL_SPONT' ? params.aplCmH2O : params.peepSetCmH2O}
                  min={0}
                  max={params.ventMode === 'MANUAL_APL_SPONT' ? 40 : 18}
                  step={1}
                  unit="cmH₂O"
                  onChange={(val) =>
                    setParams((p) => (p.ventMode === 'MANUAL_APL_SPONT' ? { ...p, aplCmH2O: val } : { ...p, peepSetCmH2O: val }))
                  }
                />
                <ClinicalStepper
                  label={L('Résistance des voies aériennes (R)', 'Airway resistance (R)')}
                  value={params.resistanceCmH2OPerLps}
                  min={3}
                  max={30}
                  step={1}
                  unit="cmH₂O/L/s"
                  onChange={(r) =>
                    setParams((p) => ({
                      ...p,
                      resistanceCmH2OPerLps: r,
                      bronchospasmHeterogeneity: r > 10 ? Math.min(1, (r - 10) / 16) : 0,
                    }))
                  }
                />
                <ClinicalStepper
                  label={L('Compliance pulmonaire (C)', 'Lung compliance (C)')}
                  value={params.complianceMlPerCmH2O}
                  min={20}
                  max={90}
                  step={2}
                  unit="mL/cmH₂O"
                  onChange={(v) => setParams((p) => ({ ...p, complianceMlPerCmH2O: v }))}
                />
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
                  {L('Bronchospasme (aileron de requin)', 'Bronchospasm (shark fin)')}
                </button>
                <button
                  onClick={() => setParams((p) => ({ ...DEFAULT_PARAMS, driveType: p.driveType, complianceMlPerCmH2O: 26 }))}
                  className="px-2 py-1 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-[11px] hover:bg-cyan-500/25 cursor-pointer"
                >
                  {L('Pneumopéritoine (C basse)', 'Pneumoperitoneum (low C)')}
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
                  {L('Démo APL / CPAP', 'APL vs CPAP demo')}
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
                  {L('Piège de l’argon à bas débit', 'Low-flow argon trap')}
                </button>
              </div>
            </div>

            {/* 3. Fault Injection Lab */}
            <div id="m1-faults" className="bg-oa-surface border border-slate-800 rounded-xl p-3 space-y-2 scroll-mt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-rose-400">{L('3. Pannes à déclencher', '3. Fault lab')}</h2>
                <button
                  onClick={launchBlindMysteryFault}
                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <EyeOff className="w-3 h-3" /> {L('Panne cachée', 'Hidden fault')}
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
                      <span>{fr ? f.fr : f.en}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${active && !hideLabel ? 'bg-rose-400 animate-pulse' : 'bg-slate-700'}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
          <MobileDock
            items={[
              { id: 'm1-view', label: L('Vue 3D', '3D view') },
              { id: 'm1-curves', label: L('Courbes', 'Curves') },
              { id: 'm1-settings', label: L('Réglages', 'Settings') },
              { id: 'm1-faults', label: L('Pannes', 'Faults') },
            ]}
          />
        </main>
      ) : (
        <ModuleRouter activeModule={activeModule} locale={locale} onNavigate={(m) => goTo(m)} />
      )}

      {/* SLIDE-OVER: SFAR FOSO / ASA / Mapleson Drawer */}
      {showChecklist && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-end" onClick={() => setShowChecklist(false)}>
          <div
            className="w-full max-w-lg bg-oa-surface border-l border-slate-800 h-full flex flex-col"
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
      {showCurriculum && <CurriculumDrawer locale={locale} onClose={() => setShowCurriculum(false)} />}
      {showEvidence && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-end" onClick={() => setShowEvidence(false)}>
          <div
            className="w-full max-w-lg bg-oa-surface border-l border-slate-800 h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">{locale !== 'en-INT' ? 'Preuves, équations et sources' : 'Evidence, Equations & Open Provenance'}</h3>
              <button onClick={() => setShowEvidence(false)} aria-label="Close" className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {EVIDENCE_REGISTRY.map((src) => {
                const tr = locale !== 'en-INT' ? EVIDENCE_FR[src.id] : undefined;
                const ev = tr ? { ...src, ...tr } : src;
                return (
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
                  <p className="text-emerald-300/90">{tr ? 'À retenir' : 'Takeaway'} : {ev.clinicalTakeaway}</p>
                  <div className="flex justify-between items-center pt-1 text-[10px] text-slate-400">
                    <span>{ev.sourceCitation}</span>
                    <a href={ev.sourceUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline shrink-0 ml-2">
                      Source
                    </a>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Stateful URL & QR Code Share */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4" onClick={() => setShowQrModal(false)}>
          <div
            className="bg-oa-surface border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 text-center"
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
