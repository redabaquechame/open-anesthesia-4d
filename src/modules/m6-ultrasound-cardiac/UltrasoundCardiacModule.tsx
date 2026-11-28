import { useState } from 'react';
import { HeartPulse, ScanLine } from 'lucide-react';
import type { LocaleCode } from '../../standards/clinicalStandards';
import { SonoLab } from './SonoLab';
import { PvLoopLab } from './PvLoopLab';

// Simulator teaching sequence (not an official society framework)
const BLOCK_STEPS: Record<'fr' | 'en', string[]> = {
  fr: [
    '1. Réglages : profondeur, gain, compression (la veine s’écrase, l’artère reste ronde et pulsatile)',
    '2. Repérage : artère subclavière sur la 1re côte, plexus postéro-latéral et superficiel, plèvre en profondeur',
    '3. Aiguille dans le plan : garder la pointe visible ; une bascule de quelques degrés la fait disparaître',
    '4. Injection fractionnée autour du plexus, sans ponction vasculaire ni pleurale',
    '5. Surveillance et conduite à tenir en cas de LAST (émulsion lipidique 20 %)',
  ],
  en: [
    '1. Settings: depth, gain, compression (the vein collapses; the artery stays round and pulsatile)',
    '2. Landmarks: subclavian artery on the first rib, plexus posterolateral and superficial, pleura deep',
    '3. In-plane needle: keep the tip visible; a few degrees of tilt makes it disappear',
    '4. Incremental injection around the plexus, avoiding vessels and pleura',
    '5. Monitoring and LAST rescue (20% lipid emulsion)',
  ],
};

export function UltrasoundCardiacModule({ locale }: { locale: LocaleCode }) {
  const [subTab, setSubTab] = useState<'ultrasound' | 'cardiac'>('ultrasound');
  const fr = locale !== 'en-INT';

  const tabBtn = (id: 'ultrasound' | 'cardiac', icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setSubTab(id)}
      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
        subTab === id ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {tabBtn('ultrasound', <ScanLine className="w-4 h-4" />, fr ? 'Bloc supraclaviculaire échoguidé' : 'Ultrasound-guided supraclavicular block')}
        {tabBtn('cardiac', <HeartPulse className="w-4 h-4" />, fr ? 'Boucles P–V valvulaires & choc' : 'Valvular P–V loops & shock')}
      </div>

      {subTab === 'ultrasound' ? (
        <>
          <SonoLab locale={locale} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
            <div className="bg-oa-surface border border-slate-800 rounded-xl p-3 space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">{fr ? 'Séquence en 5 étapes' : '5-step sequence'}</h3>
              <ul className="space-y-1 text-[11px] text-slate-300">
                {BLOCK_STEPS[fr ? 'fr' : 'en'].map((st) => (
                  <li key={st}>{st}</li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-[11px] text-rose-200 leading-relaxed">
              {fr ? (
                <>
                  <strong>LAST (check-list ASRA) :</strong> appeler à l’aide, apporter le kit LAST, envisager d’alerter l’équipe de CEC, et donner tôt l’<strong>émulsion lipidique à 20 %</strong> : plus de 70 kg → bolus ~100 mL en 2–3 min, puis perfusion ~250 mL en 15–20 min ; moins de 70 kg → bolus ~1,5 mL/kg en 2–3 min, puis ~0,25 mL/kg/min. Toujours instable → répéter le bolus et doubler la perfusion. Poursuivre ≥ 15 min après stabilisation ; maximum 12 mL/kg. Convulsions : assurer les voies aériennes, benzodiazépine de préférence (si seulement du propofol, petites doses, p. ex. 20 mg). Adrénaline : doses plus faibles que d’habitude, commencer à ≤ 1 µg/kg. Éviter anesthésiques locaux, bêtabloquants, inhibiteurs calciques et vasopressine. (Check-list LAST de l’ASRA 2020 v1.1 — en révision, mise à jour attendue en 2027.)
                </>
              ) : (
                <>
                    <strong>LAST (ASRA checklist):</strong> call for help, get the LAST rescue kit, consider the cardiopulmonary bypass team, and give <strong>20% lipid emulsion</strong> early: over 70 kg → bolus ~100 mL over 2–3 min, then infuse ~250 mL over 15–20 min; under 70 kg → bolus ~1.5 mL/kg over 2–3 min, then ~0.25 mL/kg/min. Still unstable → repeat bolus and double the infusion. Continue ≥15 min once stable; maximum 12 mL/kg. Seizure: ensure an adequate airway, benzodiazepine preferred (if only propofol, small doses, e.g. 20 mg). Epinephrine: smaller than usual, start with ≤1 mcg/kg. Avoid local anaesthetics, beta-blockers, calcium-channel blockers and vasopressin. (ASRA LAST checklist 2020 v1.1 — under review, update expected 2027.)
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <PvLoopLab locale={locale} />
      )}
    </main>
  );
}
