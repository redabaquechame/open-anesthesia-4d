import type * as THREE from 'three';
import type { ProbeFrame } from './ultrasoundSim';

/** Elevation half-width used by the B-mode renderer for the needle (Gaussian, 1/e at 0.7 mm: ~1.4 mm slice). */
export const BEAM_ELEVATION_1E_M = 0.0007;
/** The tip counts as "seen" when its beam weight is at least this (|elevation| ≤ ~0.58 mm). Simulator rule. */
export const TIP_VISIBLE_WEIGHT = 0.5;

/** Beam weight of the needle tip (0 = outside the image or the slice, 1 = in the centre of the slice). */
export function tipBeamWeight(frame: ProbeFrame, tip: THREE.Vector3, widthM: number, depthM: number): number {
  const vx = tip.x - frame.origin.x;
  const vy = tip.y - frame.origin.y;
  const vz = tip.z - frame.origin.z;
  const u = vx * frame.u.x + vy * frame.u.y + vz * frame.u.z;
  const d = vx * frame.d.x + vy * frame.d.y + vz * frame.d.z;
  const e = vx * frame.e.x + vy * frame.e.y + vz * frame.e.z;
  if (d < 0 || d > depthM || Math.abs(u) > widthM / 2) return 0;
  return Math.exp(-Math.pow(e / BEAM_ELEVATION_1E_M, 2));
}

export type PerineuralCue = 'none' | 'tip-not-seen' | 'perineural' | 'perineural-spread';

/**
 * Positive feedback is only given when the tip itself is visible on the image (audit F10): a
 * perineural position that the operator cannot see is not a teaching success. Teaching cue only,
 * never proof of a safe or successful block.
 */
export function perineuralCue(args: { hazard: boolean; nearNerve: boolean; tipVisible: boolean; laMl: number }): PerineuralCue {
  if (args.hazard || !args.nearNerve) return 'none';
  if (!args.tipVisible) return 'tip-not-seen';
  return args.laMl > 0 ? 'perineural-spread' : 'perineural';
}
