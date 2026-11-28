import { lazy, Suspense } from 'react';
import type { LocaleCode } from '../standards/clinicalStandards';
import type { AppModuleId } from '../standards/programmeTypes';

// Code-split each module so the initial PWA shell stays small
const VolatileEcoModule = lazy(() =>
  import('./m3-volatile-eco/VolatileEcoModule').then((m) => ({ default: m.VolatileEcoModule }))
);
const AivocEegModule = lazy(() =>
  import('./m4-aivoc-eeg/AivocEegModule').then((m) => ({ default: m.AivocEegModule }))
);
const NmjTofModule = lazy(() =>
  import('./m5-nmj-tof/NmjTofModule').then((m) => ({ default: m.NmjTofModule }))
);
const UltrasoundCardiacModule = lazy(() =>
  import('./m6-ultrasound-cardiac/UltrasoundCardiacModule').then((m) => ({
    default: m.UltrasoundCardiacModule,
  }))
);
const NeuraxialSpineModule = lazy(() =>
  import('./m7-neuraxial-spine/NeuraxialSpineModule').then((m) => ({
    default: m.NeuraxialSpineModule,
  }))
);
const BronchoscopyDltModule = lazy(() =>
  import('./m8-bronchoscopy-dlt/BronchoscopyDltModule').then((m) => ({
    default: m.BronchoscopyDltModule,
  }))
);
const CrisisModule = lazy(() =>
  import('./m9-crisis/CrisisModule').then((m) => ({ default: m.CrisisModule }))
);
const PreopModule = lazy(() =>
  import('./m10-preop/PreopModule').then((m) => ({ default: m.PreopModule }))
);
const ParcoursModule = lazy(() =>
  import('./m11-parcours/ParcoursModule').then((m) => ({ default: m.ParcoursModule }))
);

export function ModuleRouter({
  activeModule,
  locale,
  onNavigate,
}: {
  activeModule: 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9' | 'M10' | 'M11';
  locale: LocaleCode;
  onNavigate?: (m: AppModuleId) => void;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-10 text-xs font-mono text-cyan-300">
          {locale !== 'en-INT' ? 'Chargement du module' : 'Loading module'}…
        </div>
      }
    >
      {activeModule === 'M3' && <VolatileEcoModule locale={locale} />}
      {activeModule === 'M4' && <AivocEegModule locale={locale} />}
      {activeModule === 'M5' && <NmjTofModule locale={locale} />}
      {activeModule === 'M6' && <UltrasoundCardiacModule locale={locale} />}
      {activeModule === 'M7' && <NeuraxialSpineModule locale={locale} />}
      {activeModule === 'M8' && <BronchoscopyDltModule locale={locale} />}
      {activeModule === 'M9' && <CrisisModule locale={locale} />}
      {activeModule === 'M10' && <PreopModule locale={locale} />}
      {activeModule === 'M11' && <ParcoursModule locale={locale} onNavigate={onNavigate} />}
    </Suspense>
  );
}

