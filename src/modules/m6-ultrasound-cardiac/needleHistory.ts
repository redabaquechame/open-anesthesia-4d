/**
 * M6 needle history (audit F11, F32). Pure model, no DOM.
 *
 * - Injuries are latched: an arterial puncture stays in the procedure record after the needle is withdrawn.
 * - Injectate is deposited in world space where the tip was at the moment of injection, and stays there
 *   when the needle moves. Injecting into a vessel deposits nothing visible (washed out) and is recorded.
 * - Opening injection pressure (claim m6-injection-pressure): Gadsden 2014 measured 8.2 ± 2.4 psi with the
 *   tip 1 mm from the root and 20.9 ± 3.7 psi with needle-nerve contact; ≥ 15 psi detected contact.
 *   The simulator uses those means as fixed teaching values (Simulator model, not a pressure model).
 */
import * as THREE from 'three';

export type TipZone = 'artery' | 'vein' | 'pleura' | 'intraneural' | 'nerveContact' | 'bone' | 'tissue';

export type LatchedKind =
  | 'arterialPuncture'
  | 'venousPuncture'
  | 'pleuralBreach'
  | 'intraneural'
  | 'boneContact'
  | 'intravascularInjection'
  | 'highPressureInjection';

/** Tip zone → injury recorded on entry (edge-triggered). */
const ZONE_EVENT: Partial<Record<TipZone, LatchedKind>> = {
  artery: 'arterialPuncture',
  vein: 'venousPuncture',
  pleura: 'pleuralBreach',
  intraneural: 'intraneural',
  bone: 'boneContact',
};

/** Gadsden 2014: injections were aborted at ≥ 15 psi. */
export const OIP_THRESHOLD_PSI = 15;
/** Teaching values: the study means at 1 mm from the root and at needle-nerve contact. */
export const OIP_NEAR_PSI = 8.2;
export const OIP_CONTACT_PSI = 20.9;

/** Opening injection pressure shown for a tip zone (Simulator model built on the Gadsden 2014 means). */
export function openingPressurePsi(zone: TipZone): number {
  if (zone === 'intraneural' || zone === 'nerveContact') return OIP_CONTACT_PSI;
  if (zone === 'bone') return OIP_CONTACT_PSI; // tip against bone: injection meets resistance
  return OIP_NEAR_PSI;
}

export interface Deposit {
  center: THREE.Vector3;
  ml: number;
}

export interface LatchedEvent {
  kind: LatchedKind;
  firstSec: number;
  count: number;
}

/** Semi-axes (m) of the drawn deposit: an ellipsoid 2a × a × a holding `ml`. */
export function depositRadius(ml: number): number {
  return Math.cbrt((3 * ml * 1e-6) / (8 * Math.PI)); // V = 4/3·π·(2a)·a·a
}

export class NeedleHistory {
  events = new Map<LatchedKind, LatchedEvent>();
  deposits: Deposit[] = [];
  /** Total volume injected (including any given into a vessel). */
  totalMl = 0;
  private lastZone: TipZone = 'tissue';

  private latch(kind: LatchedKind, tSec: number) {
    const e = this.events.get(kind);
    if (e) e.count++;
    else this.events.set(kind, { kind, firstSec: tSec, count: 1 });
  }

  /** Call every frame with the tip's current zone. Entering an injury zone is recorded once per entry. */
  observe(zone: TipZone, tSec: number): void {
    if (zone !== this.lastZone) {
      const k = ZONE_EVENT[zone];
      if (k) this.latch(k, tSec);
      this.lastZone = zone;
    }
  }

  /**
   * Inject `ml` at the tip. Returns what happened. Into a vessel: recorded, nothing deposited.
   * Otherwise the volume joins the deposit that already contains the tip, or starts a new one there.
   */
  inject(ml: number, tip: THREE.Vector3, zone: TipZone, tSec: number): { deposited: boolean; pressurePsi: number } {
    const pressurePsi = openingPressurePsi(zone);
    if (!(ml > 0)) return { deposited: false, pressurePsi };
    this.totalMl += ml;
    if (pressurePsi >= OIP_THRESHOLD_PSI) this.latch('highPressureInjection', tSec);
    if (zone === 'artery' || zone === 'vein') {
      this.latch('intravascularInjection', tSec);
      return { deposited: false, pressurePsi };
    }
    const host = this.deposits.find((d) => d.center.distanceTo(tip) < depositRadius(d.ml));
    if (host) host.ml += ml;
    else this.deposits.push({ center: tip.clone(), ml });
    return { deposited: true, pressurePsi };
  }

  /** True when p lies inside any deposit (sphere of the short semi-axis, as the image test uses). */
  insideDeposit(p: THREE.Vector3): boolean {
    for (const d of this.deposits) {
      const a = depositRadius(d.ml);
      if (p.distanceToSquared(d.center) < a * a) return true;
    }
    return false;
  }

  has(kind: LatchedKind): boolean {
    return this.events.has(kind);
  }

  reset(): void {
    this.events.clear();
    this.deposits = [];
    this.totalMl = 0;
    this.lastZone = 'tissue';
  }
}
