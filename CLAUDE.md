# Open Anesthesia 4D — project rules

Free, zero-login, offline-first PWA that teaches anesthesia workstation physics with a live
Three.js scene. Vite 6 + React 19 + TypeScript + Tailwind 4 + three.js. Deployed to GitHub
Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Commands
- `npm run dev` — local dev server (add `-- --host` to test on a phone on the same Wi-Fi)
- `npm run build` — type-check (`tsc -b`) then production build into `dist/`

## Layout
- `src/physics/circuitLungKernel.ts` — the physics. Pure TS, no DOM; runs in `physicsWorker.ts` at 50 Hz.
- `src/modules/m1-workstation/WorkstationScene.ts` — Three.js scene; reads snapshots, never computes physics.
- `src/components/BedsideMonitorCanvas.tsx` — 2D monitor (Paw / flow / capnogram).
- `src/standards/` — gas colour standards, agents, checklists, UI glossary (4 locales: fr-FR, fr-CA, en-INT, ar-MA).
- `src/evidence/evidenceRegistry.ts` — sources shown in the Evidence drawer.
- `src/physics/volatileKineticsKernel.ts` (M3) and `src/physics/aivocEegKernel.ts` (M4) — pure TS kernels.
- Modules M3–M8 live in `src/modules/mN-name/`, are lazy-loaded by `src/modules/ModuleRouter.tsx`,
  and are listed in `MODULES_META` in `App.tsx`. Each module owns its renderer and must dispose it
  (and disconnect its ResizeObserver) in the effect cleanup.
- `src/utils/lmsAndDebrief.ts` — printable debrief card (Blob URL) and offline xAPI queue in IndexedDB.

## Clinical content rules
- This is an educational simulator, not a medical device. Keep the disclaimer banner.
- Every evidence entry needs a real source that was actually opened (PubMed PMID/DOI or the standard itself).
  Never attach an equation or claim to a paper that does not contain it; label derived formulas "Simulator model".
- Values not yet checked against the primary text carry `unverified: true` or a VERIFY comment. Do not remove
  those markers without checking.
- Still unverified (keep the flags): GWP100 values (`GWP_STANDARDS`), tissue partitions / liquid data
  (`VOLATILE_AGENT_DATA_UNVERIFIED`), Eleveld parameter table, PTC 6-min spacing, DLT 1.5 cm roll shift,
  2 Hz filter illustration, illustrative drug prices.
- After changing the kernel, re-run the headless sanity checks (baseline EtCO2 ≈ 35–45, disconnect → Vt 0 + alarms,
  ascending bellows collapse on disconnect, descending does not).
