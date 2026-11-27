/**
 * Bedside patient monitor: sweeping ECG II, arterial line, pleth and capnogram with tabular
 * numerics and alarm limits (ClinicalMonitorRenderer), plus the optional OR sound engine.
 * Waveform maths lives in src/physics/monitorWaveforms.ts (ECG = ECGSYN closed form; the others
 * are a simulator model). The monitor always sweeps, so a scenario never shows a dead screen.
 */
import { useEffect, useRef, useState } from 'react';
import { BellOff, Volume2, VolumeX } from 'lucide-react';
import { arterialShape, baselineMv, capnoMmHg, ecgMv, plethShape, vfMv, type MonitorRhythm } from '../physics/monitorWaveforms';
import { ClinicalMonitorRenderer, type AlarmPriority, type MonitorLimits } from './monitor/clinicalMonitorRenderer';
import { OrAudioEngine } from './monitor/orAudioEngine';

export interface MonitorVitals {
  hr: number;
  sbp: number;
  dbp: number;
  spo2: number;
  etco2: number;
  tempC: number;
  rhythm: MonitorRhythm;
}

type AlarmKey = 'hr' | 'bp' | 'spo2' | 'etco2' | 'temp';

interface Props {
  vitals: MonitorVitals;
  /** Kept for API compatibility: the trace sweeps whether or not the scenario clock runs. */
  running: boolean;
  /** Respiratory rate for the capnogram (ventilated patient). */
  rr?: number;
  alarms?: Partial<Record<AlarmKey, boolean>>;
  /** Alarm limits shown beside each number (claim m9-alarm-limits). */
  limits: MonitorLimits;
  rhythmLabel: string;
  fr: boolean;
}

const ALARM_TEXT: Record<AlarmKey, { fr: string; en: string }> = {
  hr: { fr: 'FC', en: 'HR' },
  bp: { fr: 'PA', en: 'BP' },
  spo2: { fr: 'SpO₂ BASSE', en: 'SpO₂ LOW' },
  etco2: { fr: 'EtCO₂', en: 'EtCO₂' },
  temp: { fr: 'TEMP', en: 'TEMP' },
};

export function PatientMonitor({ vitals, rr = 12, alarms = {}, limits, rhythmLabel, fr }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vRef = useRef(vitals);
  const aRef = useRef(alarms);
  const labelRef = useRef(rhythmLabel);
  const frRef = useRef(fr);
  const audioRef = useRef<OrAudioEngine | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [silenced, setSilenced] = useState(0);
  vRef.current = vitals;
  aRef.current = alarms;
  labelRef.current = rhythmLabel;
  frRef.current = fr;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const audio = new OrAudioEngine();
    audioRef.current = audio;

    let t = 0;
    let cPhase = 0;
    let rPhase = 0;
    const sample = (dt: number) => {
      const v = vRef.current;
      t += dt;
      const pulse = (v.rhythm === 'sinus' || v.rhythm === 'sinusTachy' || v.rhythm === 'ROSC') && v.hr > 0 && v.sbp > 0;
      const rate = v.rhythm === 'PEA' ? 40 : Math.max(v.hr, 1);
      if (v.rhythm !== 'VF' && v.rhythm !== 'asystole') cPhase = (cPhase + (rate / 60) * dt) % 1;
      rPhase = (rPhase + (rr / 60) * dt) % 1;
      let ecg = baselineMv(t);
      if (v.rhythm === 'VF') ecg += vfMv(t);
      else if (v.rhythm !== 'asystole') ecg += ecgMv(cPhase, rate);
      return {
        ecg,
        art: pulse ? v.dbp + (v.sbp - v.dbp) * arterialShape(cPhase - 0.05) : 4 + 2 * Math.sin(t * 1.3),
        pleth: pulse && v.spo2 > 0 ? plethShape(cPhase - 0.12) : 0.02 * Math.sin(t * 2),
        co2: capnoMmHg(rPhase, v.etco2),
      };
    };

    const L = (f: boolean) => ({ hr: f ? 'FC' : 'HR', art: 'ART mmHg', spo2: 'SpO₂ %', co2: 'EtCO₂ mmHg', temp: 'T °C' });
    const renderer = new ClinicalMonitorRenderer(canvas, {
      sample,
      limits,
      labels: L(frRef.current),
      onRWave: () => {
        const v = vRef.current;
        const perfusing = v.rhythm !== 'VF' && v.rhythm !== 'PEA' && v.rhythm !== 'asystole' && v.spo2 > 0;
        if (perfusing) audio.beat(v.spo2);
      },
    });

    let raf = 0;
    let last = performance.now();
    let uiTick = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const v = vRef.current;
      const a = aRef.current;
      const noOutput = v.rhythm === 'VF' || v.rhythm === 'PEA' || v.rhythm === 'asystole';
      const active = (Object.keys(a) as AlarmKey[]).filter((k) => a[k]);
      // Priority from the module's own limits: no output = high, any other limit breach = medium.
      const priority: AlarmPriority = noOutput ? 'high' : active.length ? 'medium' : 'none';
      const f = frRef.current;
      const banner = noOutput
        ? labelRef.current
        : active.map((k) => (f ? ALARM_TEXT[k].fr : ALARM_TEXT[k].en)).join(' · ');
      audio.update(priority, dt);
      renderer.setLabels(L(f));
      renderer.update(
        { vitals: v, noOutput, rhythmLabel: labelRef.current, alarms: a, priority, bannerText: banner, silencedRemainingSec: audio.silencedRemaining(), rr },
        dt,
      );
      uiTick += dt;
      if (uiTick > 0.5) {
        uiTick = 0;
        setSilenced(Math.ceil(audio.silencedRemaining()));
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      audio.dispose();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rr]);

  const toggleSound = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!soundOn) {
      await audio.unlock();
      audio.setMuted(false);
      setSoundOn(true);
    } else {
      audio.setMuted(true);
      setSoundOn(false);
    }
  };

  const v = vitals;
  const summary = fr
    ? `FC ${Math.round(v.hr)}, PA ${Math.round(v.sbp)}/${Math.round(v.dbp)}, SpO₂ ${Math.round(v.spo2)} %, EtCO₂ ${Math.round(v.etco2)}, T ${v.tempC.toFixed(1)} °C`
    : `HR ${Math.round(v.hr)}, BP ${Math.round(v.sbp)}/${Math.round(v.dbp)}, SpO₂ ${Math.round(v.spo2)}%, EtCO₂ ${Math.round(v.etco2)}, T ${v.tempC.toFixed(1)} °C`;

  return (
    <div className="flex flex-col gap-1" dir="ltr">
      <canvas ref={canvasRef} className="w-full h-64 sm:h-72 bg-black border border-oa-hairline" role="img" aria-label={summary} />
      <div className="flex items-center gap-1.5 text-[11px]">
        <button
          onClick={toggleSound}
          className={`h-7 px-2 rounded border flex items-center gap-1.5 cursor-pointer ${soundOn ? 'border-slate-400 bg-oa-hover text-white' : 'border-oa-hairline bg-oa-raised text-slate-300 hover:bg-oa-hover'}`}
          aria-pressed={soundOn}
          title={fr ? 'Son du bloc : bip de SpO₂ et alarmes' : 'OR sound: SpO₂ tone and alarms'}
        >
          {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          {soundOn ? (fr ? 'Son activé' : 'Sound on') : fr ? 'Activer le son' : 'Turn sound on'}
        </button>
        <button
          onClick={() => audioRef.current?.silence(120)}
          disabled={!soundOn}
          className="h-7 px-2 rounded border border-oa-hairline bg-oa-raised text-slate-300 hover:bg-oa-hover disabled:opacity-40 flex items-center gap-1.5 cursor-pointer disabled:cursor-default"
          title={fr ? 'Couper les alarmes 120 s (le bip de pouls continue)' : 'Silence alarms for 120 s (pulse tone continues)'}
        >
          <BellOff className="w-3.5 h-3.5" />
          {silenced > 0 ? <span className="font-mono">{silenced} s</span> : fr ? 'Alarmes 120 s' : 'Alarms 120 s'}
        </button>
        <span className="ms-auto text-[10px] text-slate-500 hidden sm:inline">
          {fr ? 'Hauteur du bip et rythme des alarmes : illustratifs' : 'Tone pitch and alarm cadence: illustrative'}
        </span>
      </div>
    </div>
  );
}
