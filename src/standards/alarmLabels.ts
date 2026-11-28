/**
 * Plain-language alarm labels for the M1 monitor (FR / EN). The kernel emits stable codes; the
 * screen shows these words. Thresholds behind each alarm are in the claim registry (m1-low-fio2-alarm,
 * m1-high-fico2-alarm, m1-piston-nprv, m1-circuit-budget).
 */
export const ALARM_LABELS: Record<string, { fr: string; en: string }> = {
  LOW_AIRWAY_PRESSURE: { fr: 'Pression basse', en: 'Low airway pressure' },
  APNEA_LOW_VT: { fr: 'Apnée / Vt bas', en: 'Apnoea / low Vt' },
  HIGH_AIRWAY_PRESSURE: { fr: 'Pression haute', en: 'High airway pressure' },
  HIGH_EtCO2: { fr: 'EtCO₂ haute', en: 'High EtCO₂' },
  LOW_EtCO2: { fr: 'EtCO₂ basse', en: 'Low EtCO₂' },
  HIGH_FiCO2: { fr: 'CO₂ inspiré', en: 'Inspired CO₂' },
  LOW_FiO2: { fr: 'FiO₂ basse', en: 'Low FiO₂' },
  RESERVOIR_EMPTY: { fr: 'Soufflet / ballon vide', en: 'Bellows / bag empty' },
  AIR_ENTRAINED: { fr: 'Entrée d’air ambiant', en: 'Room air drawn in' },
  O2_SUPPLY_FAILURE: { fr: 'Défaut d’alimentation O₂', en: 'O₂ supply failure' },
  VENT_DRIVE_GAS_LOSS: { fr: 'Perte du gaz moteur', en: 'Drive gas lost' },
  HIGH_PEEP_SCAVENGING_SUSPECT: { fr: 'PEP haute (évacuation ?)', en: 'High PEEP (scavenging?)' },
  // Blind (OSCE) mode hides the cause.
  HIGH_PEEP_ALARM: { fr: 'PEP haute', en: 'High PEEP' },
};

export function alarmLabel(code: string, fr: boolean): string {
  const l = ALARM_LABELS[code];
  return l ? (fr ? l.fr : l.en) : code;
}
