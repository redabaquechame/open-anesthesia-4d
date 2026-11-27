# What already exists (for Gemini, who cannot see the repo)

Written 2026-11-27 so Gemini's code fits what is there instead of rebuilding it.

## Stack
- Vite 6, React 19, TypeScript, Tailwind 4, **three r172** (WebGLRenderer; no R3F). PWA, offline-first, GitHub Pages.
- Locales: fr-FR, fr-CA, en-INT, ar-MA (Arabic is right-to-left). All UI text must be bilingual at minimum (FR + EN).
- Body font today: system UI stack (`src/index.css`). No web fonts are loaded yet. Any font must be self-hosted (offline, no Google Fonts CDN).

## 3D pipeline already in place (please extend, not replace)
- `src/engine/createTieredRenderer.ts`: device tiers HIGH / MID / LOW; already **ACESFilmic tone mapping** (exposure 1.05) and MeshPhysicalMaterial with clearcoat on HIGH/MID.
- `src/engine/createStage.ts`: **PMREM + RoomEnvironment** image-based light, OrbitControls.
- `src/engine/postFx.ts`: HIGH = MSAA×4 + GTAO + soft bloom; MID = MSAA + bloom; LOW = none; `degrade()` drops effects when FPS falls.
- `src/engine/materials.ts`: tissue materials by tier. `src/engine/cameraRig.ts`, `labels.ts`, `loadAnatomy.ts` (BodyParts3D glb).
- So what is missing is art direction and specific effects (Fresnel X-ray, clipping, gas-flow, ultrasound), not the basic lighting rig. Every new effect needs a LOW-tier fallback.
- Every module disposes its renderer and ResizeObserver on unmount. Your modules need a `dispose()`.

## Monitor already in place
- `src/components/PatientMonitor.tsx`: Canvas2D sweeping ECG II / ART / Pleth / CO₂ at 110 px/s with numerics; trace colours today `#4ade80 / #f87171 / #22d3ee / #facc15`.
- Waveform maths in `src/physics/monitorWaveforms.ts` (ECG = ECGSYN closed form; others are a labelled simulator model). Please keep the maths there and deliver rendering only: an upgraded renderer for the same `MonitorVitals` input `{hr, sbp, dbp, spo2, etco2, tempC, rhythm}`.
- `src/components/BedsideMonitorCanvas.tsx`: M1 ventilator traces (Paw / flow / capnogram).
- No audio anywhere yet.

## Physics
- M1/M2 kernel runs in a Web Worker at 50 Hz (`src/physics/circuitLungKernel.ts`); the scene only reads snapshots.
- M3 volatile kinetics, M4 Marsh/Schnider/Eleveld/Minto TCI + EEG, M5 TOF, M6 haemodynamics/PV loop: separate pure-TS kernels, not yet coupled.

## Clinical-number rule
Every clinical number in the UI has an entry in `src/standards/claimRegistry.ts`, with a status of sourced, à vérifier or illustrative. If your code contains a number with clinical meaning (alarm limits, tone frequencies, drug colours), list it with its source so Claude can verify it.

## Delivery format that integrates fastest
- One folder per piece, `.ts` files with no React inside the 3D/audio code. Pure classes with `constructor(canvas | scene, opts)`, `update(snapshot, dt)`, `dispose()`.
- No new npm dependencies without saying why (offline bundle size matters).
