/**
 * M5 neuromuscular-junction dynamics (Simulator model, illustrative shape), moved out of the render loop
 * so it runs on the shared SimClock in fixed steps and can be tested without a browser.
 * Same equations as before; only the time base changed (fixed simulated steps instead of frame time).
 */
export interface NmjSim {
  tSec: number;
  rocPlasma: number;
  rocPeripheral: number;
  sugaFree: number;
  eyelidOcc: number;
  thumbOcc: number;
  ptcCooldown: number;
  banner: string;
}

/** Simulated seconds per M5 physics step. */
export const NMJ_STEP_SEC = 0.1;

export function freshNmj(banner: string): NmjSim {
  return { tSec: 0, rocPlasma: 0, rocPeripheral: 0, sugaFree: 0, eyelidOcc: 0, thumbOcc: 0, ptcCooldown: 0, banner };
}

/** Advance the NMJ state in place by dtSim simulated seconds. */
export function stepNmj(s: NmjSim, dtSim: number): void {
  s.tSec += dtSim;
  s.ptcCooldown = Math.max(0, s.ptcCooldown - dtSim);

  // Sugammadex 1:1 encapsulation of plasma rocuronium (leaves the peripheral reservoir if underdosed).
  if (s.sugaFree > 0.001 && s.rocPlasma > 0.001) {
    const bind = Math.min(s.sugaFree, s.rocPlasma) * Math.min(1, dtSim * 0.14);
    s.sugaFree -= bind;
    s.rocPlasma -= bind;
  }
  // Redistribution between peripheral reservoir and plasma (recurarisation if sugammadex underdosed).
  const flux = (s.rocPeripheral - s.rocPlasma) * 0.0045 * dtSim;
  s.rocPlasma = Math.max(0, s.rocPlasma + flux - s.rocPlasma * 0.00055 * dtSim);
  s.rocPeripheral = Math.max(0, s.rocPeripheral - flux * 0.35);

  // Site-specific equilibration: corrugator (eyelid) about 3× faster than adductor pollicis.
  const targetOccEyelid = Math.min(0.99, (s.rocPlasma * 1.15) / (s.rocPlasma * 1.15 + 0.28));
  const targetOccThumb = Math.min(0.99, (s.rocPlasma * 1.35) / (s.rocPlasma * 1.35 + 0.18));
  s.eyelidOcc += (targetOccEyelid - s.eyelidOcc) * Math.min(1, dtSim * 0.045);
  s.thumbOcc += (targetOccThumb - s.thumbOcc) * Math.min(1, dtSim * 0.015);
}
