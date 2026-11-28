/**
 * Honest scope of each module (audit 2026-11-27, recovery plan Gate 0).
 *
 * A module stays « prototype » until it has passed its gates: credibility plan, adversarial tests,
 * two named clinical reviewers recorded in the claim registry, and a learner check. The line
 * « notModelled » is shown on screen at all times, so a learner never mistakes an illustration
 * for a validated simulation. Update it in the same pull request that fixes the limitation.
 */
export type ModuleStatus = 'prototype' | 'reviewed';

export interface ModuleScope {
  status: ModuleStatus;
  /** One short sentence: the most important thing this module does NOT model yet. */
  notModelled: { fr: string; en: string };
}

export const MODULE_SCOPE: Record<string, ModuleScope> = {
  M1_M2: {
    status: 'prototype',
    notModelled: {
      fr: 'Circuit en reconstruction : les gaz ne sont pas encore conservés (la somme peut dépasser 100 %), pas de vrai ballon ni de vraie valve APL, fuites et valves en partie scriptées.',
      en: 'Circuit being rebuilt: gases are not yet conserved (the sum can exceed 100%), no real bag or APL valve, leaks and valves partly scripted.',
    },
  },
  M3: {
    status: 'prototype',
    notModelled: {
      fr: 'Plusieurs paramètres tissulaires ne sont pas vérifiés ; patient isolé, sans lien avec les autres salles.',
      en: 'Several tissue parameters are unverified; isolated patient, not linked to the other rooms.',
    },
  },
  M4: {
    status: 'prototype',
    notModelled: {
      fr: 'EEG et DSA synthétiques ; contrôleur AIVOC heuristique, pas l’algorithme d’une pompe réelle. (Le temps des médicaments peut être accéléré : la vitesse est affichée.)',
      en: 'Synthetic EEG and DSA; heuristic TCI controller, not a real pump algorithm. (Drug time can be accelerated: the speed is shown.)',
    },
  },
  M5: {
    status: 'prototype',
    notModelled: {
      fr: 'Cinétiques normalisées réglées à la main : les délais en secondes ne sont pas des prédictions cliniques.',
      en: 'Hand-tuned normalised kinetics: the timings in seconds are not clinical predictions.',
    },
  },
  M6: {
    status: 'prototype',
    notModelled: {
      fr: 'Image échographique illustrative (pas une sonde calibrée), plexus schématique ; les ponctions ne laissent pas encore de trace et l’anesthésique suit la pointe.',
      en: 'Illustrative ultrasound image (not a calibrated probe), schematic plexus; punctures leave no trace yet and the anaesthetic follows the tip.',
    },
  },
  M7: {
    status: 'prototype',
    notModelled: {
      fr: 'Leçon de trajectoire : pas de perte de résistance au toucher ; la trajectoire proposée par défaut donne la réponse.',
      en: 'Trajectory lesson: no tactile loss of resistance; the default trajectory gives the answer.',
    },
  },
  M8: {
    status: 'prototype',
    notModelled: {
      fr: 'Shunt à l’équilibre : la ventilation ne change ni la PaO2 ni la PaCO2 ; tailles de lumière illustratives.',
      en: 'Steady-state shunt: ventilation changes neither PaO2 nor PaCO2; illustrative lumen sizes.',
    },
  },
  M9: {
    status: 'prototype',
    notModelled: {
      fr: 'Scénarios scriptés en reconstruction : délais de RCP, retour de circulation et score d’ordre ne suivent pas encore les recommandations.',
      en: 'Scripted scenarios being rebuilt: CPR timing, return of circulation and order score do not yet follow the guidelines.',
    },
  },
  M10: {
    status: 'prototype',
    notModelled: {
      fr: 'Scores sur cas fictifs ; jeûne limité à l’adulte en chirurgie programmée.',
      en: 'Scores on fictional cases; fasting limited to adults having elective surgery.',
    },
  },
  M11: {
    status: 'prototype',
    notModelled: {
      fr: 'Progression déclarée par l’apprenant : ce n’est pas une certification.',
      en: 'Progress is self-declared by the learner: it is not a certification.',
    },
  },
};

export function scopeFor(moduleId: string): ModuleScope | undefined {
  return MODULE_SCOPE[moduleId];
}
