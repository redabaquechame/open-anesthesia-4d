import type { DeviceTier } from './createTieredRenderer';

/**
 * User-facing render quality. "auto" follows the device tier and lets the stage step down
 * when the frame rate drops; the others pin a tier.
 */
export type QualityMode = 'auto' | 'high' | 'balanced' | 'saver';

const KEY = 'oa4d.quality';
const EVENT = 'oa4d-quality';

export function getQualityMode(): QualityMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'auto' || v === 'high' || v === 'balanced' || v === 'saver') return v;
  } catch {
    /* private mode */
  }
  return 'auto';
}

export function setQualityMode(mode: QualityMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent<QualityMode>(EVENT, { detail: mode }));
}

export function onQualityModeChange(fn: (mode: QualityMode) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<QualityMode>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

export function resolveTier(mode: QualityMode, deviceTier: DeviceTier): DeviceTier {
  if (mode === 'high') return 'HIGH';
  if (mode === 'balanced') return 'MID';
  if (mode === 'saver') return 'LOW';
  return deviceTier;
}

export const QUALITY_LABELS: Record<QualityMode, Record<'fr' | 'en' | 'ar', string>> = {
  auto: { fr: 'Auto', en: 'Auto', ar: 'تلقائي' },
  high: { fr: 'Haute', en: 'High', ar: 'عالية' },
  balanced: { fr: 'Équilibrée', en: 'Balanced', ar: 'متوازنة' },
  saver: { fr: 'Économie batterie', en: 'Battery saver', ar: 'توفير البطارية' },
};
