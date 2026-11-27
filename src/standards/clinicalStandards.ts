/**
 * Regional standards, agent data and UI glossary.
 *
 * Every value here is either well-established reference data or marked `unverified`
 * so a reviewer knows what still needs checking against the primary standard text.
 */

export type LocaleCode = 'fr-FR' | 'fr-CA' | 'en-INT' | 'ar-MA';
export type GasStandardId = 'ISO_EU_AF' | 'CSA_CA_QC' | 'NFPA_US';
export type GasKey = 'O2' | 'AIR' | 'N2O' | 'VAC' | 'WAGD';
export type VolatileAgentId = 'sevoflurane' | 'desflurane' | 'isoflurane' | 'halothane' | 'enflurane';

export interface GasColor {
  hex: string;
  label: string;
  /** true when this colour has not yet been checked against the standard's own text */
  unverified?: boolean;
}

export interface RegionalGasStandard {
  id: GasStandardId;
  name: string;
  region: string;
  gases: Record<GasKey, GasColor>;
  safetyBanner: Record<LocaleCode, string>;
}

const COLOUR_WARNING: Record<LocaleCode, string> = {
  'fr-FR': 'Les codes couleur varient selon le pays : lisez toujours l’étiquette, ne vous fiez jamais à la couleur seule.',
  'fr-CA': 'Les codes de couleur varient selon le pays : lisez toujours l’étiquette, jamais la couleur seule.',
  'en-INT': 'Gas colour codes differ by country: always read the label, never rely on colour alone.',
  'ar-MA': 'تختلف رموز ألوان الغازات حسب البلد: اقرأ الملصق دائماً ولا تعتمد على اللون وحده.',
};

export const REGIONAL_GAS_STANDARDS: Record<GasStandardId, RegionalGasStandard> = {
  ISO_EU_AF: {
    id: 'ISO_EU_AF',
    name: 'ISO 32 / EN ISO 7396-1',
    region: 'Europe, Maghreb, Francophone Africa',
    gases: {
      O2: { hex: '#f8fafc', label: 'O2 — white' },
      AIR: { hex: '#1f2937', label: 'Medical air — black/white' },
      N2O: { hex: '#2563eb', label: 'N2O — blue' },
      VAC: { hex: '#eab308', label: 'Vacuum — yellow' },
      WAGD: { hex: '#c026d3', label: 'AGSS / SEGA', unverified: true },
    },
    safetyBanner: COLOUR_WARNING,
  },
  CSA_CA_QC: {
    id: 'CSA_CA_QC',
    name: 'CSA Z7396.1',
    region: 'Canada / Québec',
    gases: {
      O2: { hex: '#f8fafc', label: 'O2 — white' },
      AIR: { hex: '#1f2937', label: 'Medical air — black/white' },
      N2O: { hex: '#2563eb', label: 'N2O — blue' },
      VAC: { hex: '#eab308', label: 'Vacuum — yellow' },
      WAGD: { hex: '#c026d3', label: 'AGSS', unverified: true },
    },
    safetyBanner: COLOUR_WARNING,
  },
  NFPA_US: {
    id: 'NFPA_US',
    name: 'NFPA 99 / CGA C-9',
    region: 'United States',
    gases: {
      O2: { hex: '#16a34a', label: 'O2 — green' },
      AIR: { hex: '#eab308', label: 'Medical air — yellow' },
      N2O: { hex: '#2563eb', label: 'N2O — blue' },
      VAC: { hex: '#f8fafc', label: 'Vacuum — white' },
      WAGD: { hex: '#7c3aed', label: 'WAGD — violet', unverified: true },
    },
    safetyBanner: COLOUR_WARNING,
  },
};

/**
 * GWP100 sources.
 * - IPCC_AR6: desflurane 2590, isoflurane 539, sevoflurane 195, enflurane 654 (Regulation (EU) 2024/573
 *   Annex II section 2) and N2O 273 (Annex VI). The regulation states these are AR6-based. Checked on
 *   EUR-Lex 2026-11-26; the IPCC table itself (AR6 WG1 Table 7.SM.7) refused automated access.
 * - SULBAEK_ANDERSEN_2012: Sulbaek Andersen et al., J Phys Chem A 2012 (isoflurane 510,
 *   desflurane 2540, sevoflurane 130): checked 2026-11-27 in the authors' abstract (PMID 22146013);
 *   the full paper (ACS) is paywalled.
 *   That paper does not cover N2O, so the AR4 N2O value (298) is used alongside it.
 * Halothane has no GWP here (null) rather than an invented number; enflurane has only the AR6 value.
 */
export type GwpStandardId = 'IPCC_AR6' | 'SULBAEK_ANDERSEN_2012';

export const GWP_STANDARDS: Record<GwpStandardId, { label: string; unverified: boolean }> = {
  IPCC_AR6: { label: 'IPCC AR6 (as listed in EU Reg. 2024/573)', unverified: false },
  SULBAEK_ANDERSEN_2012: { label: 'Sulbaek Andersen 2012 + AR4 N2O', unverified: false },
};

export const N2O_CLIMATE: { gwp100: Record<GwpStandardId, number> } = {
  gwp100: { IPCC_AR6: 273, SULBAEK_ANDERSEN_2012: 298 },
};

export interface VolatileAgentSpec {
  id: VolatileAgentId;
  name: string;
  /** ISO 5360 agent-specific vaporizer / filler colour */
  iso5360ColorHex: string;
  /** MAC in O2, adult ~40–45 years, vol % — US labels (checked 2026-11-27, claim m3-mac) */
  macPct: number;
  /** Blood:gas at 37 °C — US labels (claim m3-blood-gas) */
  bloodGasPartition: number;
  /** Brain:blood — Yasuda 1989 (enflurane: VERIFY). Muscle and fat: textbook values, VERIFY (claim m3-tissue-partitions). */
  brainBloodPartition: number;
  muscleBloodPartition: number;
  fatBloodPartition: number;
  /** Saturated vapour pressure at 20 °C, mmHg */
  svpMmHgAt20C: number;
  /** mL of vapour per mL of liquid at 20 °C — Simulator model: density / MW × 24.06 L/mol (claim m3-liquid-data). */
  vaporMlPerLiquidMl: number;
  /** Liquid density, g/mL — US labels (isoflurane and enflurane at 25 °C). */
  liquidDensityGPerMl: number;
  /** null = no value in that source */
  gwp100: Record<GwpStandardId, number | null>;
}

// Checked 2026-11-27: MAC, blood:gas, SVP and density against US labels; brain:blood against Yasuda 1989
// (sevo, des, iso, halothane). Still unverified: muscle and fat partitions, all enflurane tissue values.
export const VOLATILE_AGENT_DATA_UNVERIFIED = true;

export const VOLATILE_AGENTS: Record<VolatileAgentId, VolatileAgentSpec> = {
  sevoflurane: {
    id: 'sevoflurane', name: 'Sevoflurane', iso5360ColorHex: '#facc15', macPct: 2.1, bloodGasPartition: 0.65,
    brainBloodPartition: 1.7, muscleBloodPartition: 3.1, fatBloodPartition: 48,
    svpMmHgAt20C: 157, vaporMlPerLiquidMl: 183, liquidDensityGPerMl: 1.52,
    gwp100: { IPCC_AR6: 195, SULBAEK_ANDERSEN_2012: 130 },
  },
  desflurane: {
    id: 'desflurane', name: 'Desflurane', iso5360ColorHex: '#2563eb', macPct: 6.0, bloodGasPartition: 0.424,
    brainBloodPartition: 1.29, muscleBloodPartition: 2.0, fatBloodPartition: 27,
    svpMmHgAt20C: 669, vaporMlPerLiquidMl: 210, liquidDensityGPerMl: 1.465,
    gwp100: { IPCC_AR6: 2590, SULBAEK_ANDERSEN_2012: 2540 },
  },
  isoflurane: {
    id: 'isoflurane', name: 'Isoflurane', iso5360ColorHex: '#9333ea', macPct: 1.15, bloodGasPartition: 1.43,
    brainBloodPartition: 1.57, muscleBloodPartition: 4.0, fatBloodPartition: 45,
    svpMmHgAt20C: 238, vaporMlPerLiquidMl: 195, liquidDensityGPerMl: 1.5,
    gwp100: { IPCC_AR6: 539, SULBAEK_ANDERSEN_2012: 510 },
  },
  halothane: {
    id: 'halothane', name: 'Halothane', iso5360ColorHex: '#dc2626', macPct: 0.76, bloodGasPartition: 2.5,
    brainBloodPartition: 1.94, muscleBloodPartition: 3.5, fatBloodPartition: 60,
    svpMmHgAt20C: 243, vaporMlPerLiquidMl: 228, liquidDensityGPerMl: 1.875,
    gwp100: { IPCC_AR6: null, SULBAEK_ANDERSEN_2012: null },
  },
  enflurane: {
    id: 'enflurane', name: 'Enflurane', iso5360ColorHex: '#f97316', macPct: 1.68, bloodGasPartition: 1.91,
    brainBloodPartition: 1.4, muscleBloodPartition: 1.7, fatBloodPartition: 36,
    svpMmHgAt20C: 175, vaporMlPerLiquidMl: 198, liquidDensityGPerMl: 1.52,
    gwp100: { IPCC_AR6: 654, SULBAEK_ANDERSEN_2012: null },
  },
};

export const CLINICAL_GLOSSARY: Record<string, Record<LocaleCode, string>> = {
  appTitle: {
    'fr-FR': 'Open Anesthésie 4D — simulateur d’enseignement',
    'fr-CA': 'Open Anesthésie 4D — simulateur d’enseignement',
    'en-INT': 'Open Anesthesia 4D — teaching simulator',
    'ar-MA': 'التخدير المفتوح 4D — محاكي تعليمي',
  },
  eduDisclaimer: {
    'fr-FR': 'Outil pédagogique uniquement — pas un dispositif médical. Ne pas utiliser pour la prise en charge de patients.',
    'fr-CA': 'Outil pédagogique seulement — pas un instrument médical. Ne pas utiliser pour les soins aux patients.',
    'en-INT': 'Educational simulator only — not a medical device. Do not use for patient care decisions.',
    'ar-MA': 'أداة تعليمية فقط — ليست جهازاً طبياً. لا تُستخدم لاتخاذ قرارات علاج المرضى.',
  },
  xraySlider: {
    'fr-FR': 'Rayons X (transparence)',
    'fr-CA': 'Rayons X (transparence)',
    'en-INT': 'X-Ray Peel-Away',
    'ar-MA': 'الأشعة السينية (الشفافية)',
  },
  aplValve: {
    'fr-FR': 'Valve APL',
    'fr-CA': 'Valve APL',
    'en-INT': 'APL Valve',
    'ar-MA': 'صمام APL',
  },
};
