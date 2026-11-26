import {
  CircuitLungKernel,
  PHYSICS_DT,
  type MachineAndPatientParams,
  type SimulationSnapshot,
} from './circuitLungKernel';

/**
 * Dedicated 50 Hz physics Web Worker.
 * Runs off the main thread so 3D orbiting on mid-range phones never stalls the physics clock,
 * and needs no SharedArrayBuffer (works inside Moodle / LMS iframes).
 */

export type WorkerInMessage =
  | { type: 'INIT'; params: MachineAndPatientParams }
  | { type: 'UPDATE_PARAMS'; params: MachineAndPatientParams }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'SET_PAUSED'; paused: boolean }
  | { type: 'RESET' };

export type WorkerOutMessage = {
  type: 'SNAPSHOT';
  snapshot: SimulationSnapshot;
};

// Minimal typing of the dedicated-worker global, so this file type-checks alongside the DOM lib.
const ctx = self as unknown as {
  postMessage(message: WorkerOutMessage): void;
  onmessage: ((event: MessageEvent<WorkerInMessage>) => void) | null;
};

const kernel = new CircuitLungKernel();
let currentParams: MachineAndPatientParams | null = null;
let paused = false;
let simSpeed = 1.0; // 1.0x real-time or 0.25x teaching slow-motion
let timerId: ReturnType<typeof setInterval> | null = null;

function startLoop(): void {
  if (timerId !== null) clearInterval(timerId);
  // Tick at 50 Hz (every 20 ms) advancing physics by PHYSICS_DT * simSpeed
  timerId = setInterval(() => {
    if (paused || !currentParams) return;
    const snapshot = kernel.step(currentParams, PHYSICS_DT * simSpeed);
    ctx.postMessage({ type: 'SNAPSHOT', snapshot });
  }, 20);
}

ctx.onmessage = (event) => {
  const msg = event.data;
  switch (msg.type) {
    case 'INIT':
      currentParams = msg.params;
      kernel.reset();
      startLoop();
      break;
    case 'UPDATE_PARAMS':
      currentParams = msg.params;
      break;
    case 'SET_SPEED':
      simSpeed = Math.max(0.1, Math.min(2.0, msg.speed));
      break;
    case 'SET_PAUSED':
      paused = msg.paused;
      break;
    case 'RESET':
      kernel.reset();
      break;
  }
};
