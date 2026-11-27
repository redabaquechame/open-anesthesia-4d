# Gemini ↔ Claude handoff

Agreed 2026-11-27. This folder is the only place Gemini's work enters the repo.

## Who does what

| | Gemini (design, 3D craft, research leads) | Claude (repo, verification, integration, release) |
|---|---|---|
| Design | Writes `DESIGN.md`: tokens, type, layout, controls, sound | Applies it to every module; removes generic cards and sliders |
| 3D and shaders | Standalone TS modules: lighting, tissue/X-ray, gas flow, ultrasound, sweeping monitor | Wires them to state and the 50 Hz physics, lazy-loading, disposal, offline cache, 60 FPS check |
| Clinical research | Source leads with direct URLs/DOIs | Opens every source, writes `claimRegistry.ts`; nothing unverified ships |
| Teaching design | OSCE cases, spot drills, crisis flows, CHU vs CHP/CHR fallbacks | Builds them, links them to M11 milestones |
| Engineering | Reviews architecture and physiological plausibility | Files, git, `tsc`, `npm run sanity`, GitHub Pages |

## Handoff rules

1. Gemini's code arrives through the user as files and is saved here (`handoff/gemini/<sprint>/`). Claude reviews, then moves it into `src/`. Gemini never edits `src/` directly.
2. Numbers in Gemini's text are leads. A number reaches the UI only after Claude opens the source and records it in `src/standards/claimRegistry.ts`.
3. Ratchet rule: no new unchecked number ships. The 6 existing « à vérifier » values (paywalled papers) keep their visible badge.
4. Each sprint ends with build, `npm run sanity`, publish and a live check.

## Sprint plan

1. **New look:** `DESIGN.md`, cockpit layout, tactile controls, tabular numerics, sweeping monitor, WebAudio (SpO₂ pitch, IEC 60601-1-8 alarm cadence, mute).
2. **3D upgrade:**
   - 2A: lighting and materials on M1, M7, M8.
   - 2B: M6 probe-reactive procedural ultrasound.
3. **Obstetrics and checks:** M9 already has postpartum haemorrhage (uterine atony) and eclampsia crises; this sprint adds severe pre-eclampsia, an obstetric physiology / spinal hypotension lab, and CHU vs provincial (CHP/CHR) fallback steps; clear what can be cleared of the 6 « à vérifier » values.
4. **Coupled physiology:** link our own kernels first (M1–M2 ventilation, M3 volatiles, M4 TCI, M6 haemodynamics). Then VitalDB "Take Over the OR" replay; Kitware Pulse WASM only as a later experiment.
5. **Exam engine and domains:** spot-diagnosis drills, OSCE/EVC cases, paediatrics, ICU (réanimation), drug cards, SSPI. Add the Moroccan IAR (ISPITS) and French IADE tracks alongside MAR/DESAR.

Z-Anatomy-derived meshes (CC BY-SA 4.0) go in their own credited folder.

## Sprint 1 status (2026-11-27)

Done:
- IBM Plex Sans / Mono / Sans Arabic self-hosted (`@fontsource`, SIL OFL), with `.oa-num` and tabular numbers everywhere.
- Obsidian tokens in `src/index.css`. The slate/cyan scales and radii are remapped, so every module follows.
- One 44 px top bar with a ⚙ popover; a 24 px disclaimer strip (project rule: it stays visible).
- Guides collapsed into a 36 px module bar with evidence dots.
- 3D labels off at load (M1, M7).
- Steppers replace the sliders in M1 (6 controls) and M7 (6 controls). The remaining sliders elsewhere get a flat fader style.
- M9:
  - the monitor sweeps at baseline before Start;
  - `ClinicalMonitorRenderer` and `OrAudioEngine` are wired in, with sound off by default and a 120 s alarm silence;
  - top strip with a weight stepper;
  - ISO 26825 strips on the action buttons.
- M10: sticky patient chart plus a tabbed score workbench.
- M11: sticky progress header with search and filters, and `Simuler →` links.
- Home: two-column hero, compact module directory.

How Gemini's code was integrated:
- `orAudioEngine.ts` and `clinicalMonitorRenderer.ts` were reviewed and adapted into `src/components/monitor/`; they were not saved verbatim here.
- The waveform maths stays in `monitorWaveforms.ts`.
- Fixed a first-resize bug where the canvas was never sized.

Not done, and why:
- Actions are not grouped by type in M9: trap drugs have no dose, so the grouping would give them away.
- The Home hero has no live mini-monitor with vitals: no invented numbers on the landing page.
- The mobile bottom dock and the M1 68/32 cockpit are moved to Sprint 1b.

Verified sources:
- **ISO 26825:2020 (free preview: clauses 5.2.2, 5.4.2, 5.4.4, 5.4.5 and the first page of Table 1).** Five class colours are now `sourced`. The remaining classes were not in the preview:
  - opioids;
  - neuromuscular blockers and their reversal;
  - vasopressors;
  - hypotensives.

  **Lead needed:** a free source for their RGB values.
- **PMC9767428** is Sanderson, Loeb et al., Biomed Instrum Technol 2022. Only the abstract was available. It supports one variable-pitch tone per pulse but gives no Hz values, so the pitch is `illustrative`.
- IEC 60601-1-8 was not opened (paywalled). The alarm cadence and the 120 s pause are `illustrative`.

Open question for Sprint 3: M10 shows "+1 … +6" next to the ASA classes (pre-existing). ASA is a class, not a points score, so the label should probably go.

Screenshots: `screenshots/sprint1-*.png`.

## Leads to verify (not yet opened by Claude)

- VitalDB licence: physionet.org/content/vitaldb/view-license/1.0.0/
- VitalDB AnesLLM (Nov 2026): physionet.org/content/vitaldb-anesllm/1.0/
- Morocco dantrolene availability: PMC10176993

See `CODEBASE_BRIEF.md` for what already exists, and `screenshots/` for the live site on 2026-11-27.
