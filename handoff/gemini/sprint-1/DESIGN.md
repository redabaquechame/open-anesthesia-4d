# Open Anesthesia 4D — Clinical Instrument Design System (`DESIGN.md`)

**Sprint 1 specification, written by Gemini (2026-11-27)** · Targets: Vite 6, React 19, Tailwind 4, three.js r172, offline PWA (`fr-FR`, `fr-CA`, `en-INT`, `ar-MA` RTL).

> Claude's integration notes are in blockquotes like this one. Tokens are implemented in `src/index.css`.

## 1. Non-negotiable visual rules

1. **Collapse every "Mode d'emploi" box by default.** Never render the 3-column *Ce que vous apprenez / Comment l'utiliser / À savoir* box open on load. Put it behind a compact `? Guide` button. The area above the fold is 100 % instrument.
   > Done: `ModuleGuidePanel` is now a 36 px bar with title, purpose, evidence dots and a Guide button.
2. **Collapse the 4 header rows into one slim bar (44 px desktop / 48 px mobile).**
   - Remove the duplicate Home disclaimer box. Keep one slim notice strip.
   - Move secondary controls (GPU tier, ISO 32, projector, QR share, coverage, checklists, debrief) into a ⚙ settings popover.
   - Move `Sourcé · À vérifier · Illustratif` out of the nav bar into a compact audit chip inside the module bar.
   > Done. Project rule: the disclaimer stays visible as a 24 px strip at the top of every page.
3. **Ban navy/cyan SaaS styling.**
   - Replace `#0B111E` navy backgrounds with matte obsidian: `#05070A` canvas, `#0B0E13` instrument surface, `#121720` raised control.
   - Bright cyan is not a brand or button colour. Cyan (`#00D4FF`) is only for SpO₂/pleth and low-priority advisories.
   - No triple-nested rounded boxes. Flat adjacent panes separated by `1px solid` hairlines (`#1E2633`), radii 2–4 px, never `rounded-2xl` pills.
   > Done globally by remapping Tailwind's slate and cyan scales and the radius tokens in `src/index.css`.
4. **No default HTML sliders in active clinical views.** Use tactile steppers (`−` / tabular readout / `+`) and preset chips (e.g. FGF `0.5 | 1 | 2 | 6 L/min`, weight `50 | 70 | 85 | 100 kg`), or direct numeric input. Drag-scrubbing on the readout is fine.
5. **3D labels default to off or hover-only.** Never show 10+ label boxes at load (M1, M7). One toggle in the viewport corner.
6. **No dead monitor.** M9's monitor sweeps from the moment a scenario opens, at the pre-crisis vitals, before Start is pressed.

## 2. Offline typography and RTL

All fonts are self-hosted (WOFF2), with no Google Fonts CDN request.

- **UI and labels:** IBM Plex Sans (400, 500, 600).
- **All numbers, vitals, doses, timers, scales:** IBM Plex Mono (500, 700), with:
  ```css
  .oa-num {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums lining-nums;
    font-feature-settings: "tnum" 1, "zero" 1;
  }
  ```
- **Arabic (`ar-MA`, `dir="rtl"`):**
  - Use CSS logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `border-s`, `border-e`, `text-start`, `text-end`). Do not use `ml-`, `mr-`, `pl-`, `pr-`.
  - Keep waveforms, monitor numerics, doses (`mg/kg`) and formulas (`EtCO₂`, `SpO₂`) explicitly `dir="ltr"` inside RTL layouts.

> Implemented with `@fontsource` packages (SIL OFL 1.1), Latin subsets plus IBM Plex Sans Arabic.

## 3. Tokens (`@theme`)

| Group | Token | Value |
|---|---|---|
| Surfaces | canvas / surface / raised / hover | `#05070A` / `#0B0F14` / `#131922` / `#1B2330` |
| Lines | hairline / strong border | `#1E2633` / `#2E3A4D` |
| Text | primary / dim / muted | `#EDF2F7` / `#94A3B8` / `#5A677A` |
| Neutral accent | accent / ink / focus ring | `#E2E8F0` / `#05070A` / `#3B82F6` |
| Signals | ECG / ART / SpO₂ / CO₂ / temp | `#00E676` / `#FF453A` / `#00D4FF` / `#FFD60A` / `#CBD5E1` |
| Alarms | high / medium / low | `#FF1744` flashing / `#FFD60A` flashing / `#00E5FF` steady |
| Agents (ISO 5360) | sevo / des / iso / halothane | `#FFD60A` / `#2979FF` / `#A855F7` / `#EF4444` |
| Evidence dots | sourced / verify / illustrative | `#10B981` / `#F59E0B` / `#64748B` |
| Fonts | sans / mono | IBM Plex Sans / IBM Plex Mono |

## 4. ISO 26825:2020 drug buttons (M9 actions, syringe trays)

Use a 4–6 px class strip on the leading edge of dark buttons, so classes are recognisable without a rainbow screen. **Trap drugs keep their real class colour, so the colour never gives the answer away.**

Gemini's proposed classes: induction, benzodiazepines, opioids, NMBA, vasopressors, local anaesthetics, antiemetics, anticholinergics, antidotes. Plus a high-alert black cap (adrenaline, suxamethonium) and 45° white stripes for antagonists.

> Verified by Claude in the ISO 26825:2020 preview (clauses 5.2.2, 5.4.2, 5.4.4, 5.4.5, Table 1 first page):
> - induction yellow 255.255.0;
> - benzodiazepines orange 255.102.0 with white lettering;
> - local anaesthetics grey 194.184.171;
> - anti-emetics salmon 237.194.130;
> - anticholinergics green 163.217.99;
> - antagonists: white stripes at 45°;
> - suxamethonium and adrenaline: black bar with white lettering on the upper half;
> - no all-caps (tall-man allowed).
>
> Not in the preview: opioids, NMBA and reversal, vasopressors, hypotensives. These show no colour until verified. Gemini's hex values were not used; the standard's RGB values were.

## 5. Layout: zero-scroll cockpit (`100dvh`)

**Top rail (44 px, one row, sticky):**

| Slot | Contents |
|---|---|
| Start | ECG mark and name (links to Home), then a grouped module switcher |
| Centre (active simulation only) | Status (`LIVE 50 Hz` / `PAUSED`) and speed |
| End | Sound and alarm silence, region selector, `? Guide`, ⚙ settings |

> Sound and silence live on the monitor itself (M9), since other modules have no monitor yet.

**Narrow screens (< 768 px):**
- One 48 px row: menu, module name, mute, Guide.
- The 3D viewport or monitor appears immediately below, taking the top 42 dvh.
- Controls sit in a bottom tabbed dock:
  - M1: `Réglages` · `Pannes` · `Courbes`
  - M9: `Actions` · `Journal` · `Contexte`

## 6. Screen by screen

### Home: "Instrument first, not marketing copy"

**Above the fold:**
- Left: title, a one-line subtitle, region pills, and two actions: `Lancer le bloc (M1)` (primary) and `S'entraîner aux crises (M9)`.
- Right: a live mini monitor, or a hero frame of the workstation.

**Below:** a compact module grid with small verification dots. Delete the big "3 steps" and "For whom" boxes.

### M1 workstation

**Desktop, locked cockpit:**
- **Left 68%:**
  - 3D view on top: matte backdrop, soft floor shadow, labels off, camera presets and an X-ray toggle.
  - Ventilator curves docked underneath, so both are always visible.
- **Right 32%:** a console with tabs `Ventilateur & Gaz` (steppers) · `Pannes` · `Check-list`.

### M7 spine and C-arm

- Keep the dual viewports (3D spine and round C-arm view) and the tissue-layer bar.
- Replace the stacked sliders with steppers (level, approach, needle advance, cephalad angle, bone opacity).

### M9 crises

- **Top strip:** scenario pills, a weight stepper, Start / Pause / Debrief.
- **Three panes:**
  - Monitor plus sound, with local context.
  - Actions with ISO strips.
  - Live timeline.

> Grouping actions under "drugs / airway / monitoring" headers was not done: trap drugs have no dose, so the grouping would reveal them.

### M10 pre-op

- Sticky patient chart on the left.
- Tabbed score workbench on the right: ASA · RCRI · STOP-Bang · Apfel · ARISCAT · fasting.
- One-line rows separated by hairlines, with no nested boxes.

### M11 curriculum

- Sticky progress header: programme selector, completion bar, search, filters (All / To do / Done), export, print.
- A hairline checklist table where linked milestones show `Simuler →`.
