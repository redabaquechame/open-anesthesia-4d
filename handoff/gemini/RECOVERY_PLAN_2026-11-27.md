# Open Anesthésie 4D — recovery plan (27 Nov 2026)

Written by Claude after (1) re-checking the independent audit against the code, (2) three research passes:
reusable engines and competitors, clinical rules for each fix, and how to prove a simulator is credible.
Sprints 3–5 are frozen until Gate 2 below is passed.

## 0. What the re-check found

- **All 26 checked audit findings are real.** That is the 17 high-priority ones plus F16–F23 and F29.
  I re-ran the audit probes and got the same numbers byte for byte (107.9 % gas, ROSC at 0.5 s,
  100 % order score for reversed actions, PCV leak 478/478 mL, M8 PaO2 579.9 at every setting, unanswered = ASA I).
- **Root causes are few.**
  - The M1 kernel stores gas as fractions and clamps each one separately. It has no gas amounts, no bag volume
    and no relief valve. That single design fault explains F01, F07, F08, F16 and F18.
  - Six separate time integrators run on 8 time bases. That explains F14, F22, F23 and F24.
  - M9 recovery is a priority list of `if` branches, not states with timers. That explains F02 and F04.
  - The order score compares equal timestamps with `>=`. That explains F03.
  - Unanswered pre-op items count as option 0. That explains F36, and it also inflates M10 case marks.
- **Extra finding: M10.** The "correct answer" mark counts an unanswered item as correct whenever the right option is 0.
- **Extra finding: Glostavent.** The draw-over mode has no physics branch at all. It is a label on the circle model.

## 1. Decisions the research settled

| Question | Answer | Why |
|---|---|---|
| Port Pulse (Kitware) to the browser? | **No.** Write our own small TypeScript circuit model. Run native Pulse offline only as a second-opinion benchmark. | There is no working WebAssembly build. It would be several MB, and its anaesthesia machine has **no reservoir bag, no APL valve, no absorber exhaustion and pressure control only**, so it would not fix the audit findings. Apache-2.0, so using it as a benchmark is fine. |
| Template for gas conservation | Lerou & Booij 2001 (BJA 86:12 and 86:29): a multi-gas circle where partial pressures sum to total, validated against a real machine. Conway 1986 for breath-by-breath mixing. | Only published blueprint found. Full texts must be opened before any number enters the registry. |
| Analytic checks for the lung | Marini, Crooke & Truwit 1989: closed-form Vt and auto-PEEP for pressure control. Bukoski 2012: O2 wash-in time constant ≈ circuit volume / fresh gas flow. | These give exact answers to test against. |
| Bench data to compare against | Bachiller 2008 (delivered vs set Vt, with and without compliance compensation), Pan 1995 (bellows Vt vs PEEP and compliance), Lucangelo 2017 (circle leak: PCV keeps about 90 % of Vt, VCV much less). | This directly tests F08. |
| How should ROSC work in M9? | **Not as a rule triggered by clicks.** The outcome is set by the scenario or the teacher. The score measures adherence to timing and sequence. | No validated ROSC model exists. McEvoy 2014: correct steps and few errors predicted ROSC. |
| What proves credibility? | A one-page **credibility plan** per lesson (FDA 2023 method, scaled down): context of use, model risk, code checks, step-size convergence, validation against published curves, limits of applicability. | FDA rates "a clinician says it looks right" as weak evidence. Validation against data is strong. |
| What proves the score means something? | Kane / Messick validity argument (Cook & Hatala 2016): think-aloud with 5–8 learners to find exploits, must-pass safety items (Yudkowsky 2014), Mastery Angoff pass mark (Barsuk 2018). | The audit's "exploitable score" is a response-process failure. |
| Strongest design feature | **Seeing inside the machine.** The transparent UF Virtual Anesthesia Machine beat the opaque one on concepts, function and cause-effect (Fischler 2008, n = 74). | That is our core idea. Keep it, but make it truthful. |
| What we can honestly claim | Comparable to traditional teaching for knowledge, possibly better for skills (Cook 2011, Kononowicz 2019). Better on access, cost, languages, transparency and repeatability. **Not** a replacement for mannequins, hands-on devices or team training. | Paid systems such as CAE SimEquip are quote-only and physical. |

## 2. The phases

### Gate 0 — Stop teaching wrong things (about 1 week, 4 small PRs, each merged only with your yes)

**PR 1 — Release gate and honesty labels (S)**
- `deploy.yml` runs `tsc`, `npm run sanity` and a new **adversarial suite**. The suite is the audit probes turned into
  tests that currently *fail* and must pass before publishing.
- The build ID becomes the commit SHA (F41).
- A visible **"Prototype / Démonstration"** badge appears on every module not yet through Gate 2, with one line saying what it does *not* model.
- M5: the English "SAFE EXTUBATION" becomes "TOF ratio ≥ 0.9 (neuromuscular recovery only)". Next to it, the other
  conditions from the BRIDION label: adequate spontaneous breathing, patent airway (F12).
- Sugammadex text and gold rings move to plasma capture plus redistribution out of the junction (Kleijn 2011; F13).
- M8: "Static shunt illustration. Changing Vt/RR does not change the blood gas here" (F09). The Vt and RR controls are hidden
  until the model is coupled.
- M10: a third state, "not answered". No band is shown until every item is answered. The case-marking bug is fixed (F36).
  Fasting is scoped to "healthy adult, elective, Rüggeberg 2026", with meal type (light, large/fatty, non-clear liquid,
  clear) and a note that institutional protocols vary (F37).
- M6: the green cue needs the needle tip to be inside the ultrasound beam (F10).

**PR 2 — M9 crises rebuilt as state machines (M)**
- Each action has a sequence number. The order score uses the sequence number and the protocol's dependency graph, not timestamps (F03).
- **Arrest** follows RCUK/ERC 2025:
  - one shock → 2-minute CPR cycle with a timer → rhythm check;
  - adrenaline 1 mg after the 3rd shock, then every 3–5 min;
  - amiodarone 300 mg after 3 shocks, 150 mg after 5;
  - the stacked-shock exception (monitored, witnessed arrest), where the set of up to three counts as the first shock;
  - non-shockable path: adrenaline as soon as possible;
  - the 8 reversible causes;
  - the theatre rule: start compressions if systolic < 50 mmHg together with a fall in EtCO2.
- ROSC is decided by the scenario, never by a click count (F02).
- **MH** follows the QRH card 3-8: with the trigger still on, the patient keeps getting worse whatever else is done (F04).
  - stop the vaporiser, maximum fresh gas flow, ventilate at 2–3× minute volume, charcoal filters;
  - dantrolene 2–3 mg/kg, then 1 mg/kg every 5 min until EtCO2 < 6 kPa and T < 38.5 °C;
  - cooling, and management of potassium and acidosis.
  - The link between continued trigger and worsening is labelled "Simulator model"; Burkman 2007 gives 20 % recrudescence.
- Distractors now cause harm in the vitals (the probe showed they did nothing).

**PR 3 — One simulation clock (M)**
- A shared `SimClock`: a fixed-step accumulator on `performance.now()` with a cap on catch-up. It pauses when the tab is hidden
  and shows "paused". Visible speed control. One clock feeds pharmacokinetics, pharmacodynamics, the waveforms and the event log.
- Used in M1, M3, M4, M5, M8 and M9 (F14, F22, F23).
- The M4 EEG is generated at a fixed 128 Hz and plotted in seconds, which ends the aliasing (F24).
- Test: the same scenario gives the same result at 30, 60 and 144 fps and at step sizes dt, dt/2 and dt/4.

**PR 4 — M6 needle history (M)**
- Vessel, pleura and nerve contacts are latched as events and listed in a "complications" panel.
- Injectate is laid down as world-space deposits at the time of injection, and stays where it was laid when the needle moves (F11, F32).
- Injection-pressure cue at 15 psi, labelled "Simulator model (Gadsden 2014)".

### Gate 1 — One reference-grade lesson: the M1 workstation (about 3–4 weeks)

**PR 5 — Circuit kernel v2 (L, Claude)**
- **State:** amounts of O2, N2O, N2, Ar, agent and CO2 in the circle node, plus a reservoir bag volume. Fractions are amount ÷ total,
  so they always sum to 100 %.
- **Vaporiser:** output = carrier × d / (1 − d).
- **Agent identity:** the agent name enters the parameters, and uptake reuses the M3 kernel's agent data (F20).
- **Bag:** three-zone pressure-volume curve (very compliant → plateau → stiff). The parameters come from Johnstone 1973
  and Smith 1992 once the full texts are opened; until then they are marked `illustrative`.
- **APL** is a relief valve: opening pressure plus resistance, venting to the scavenger. It is never a pressure source (F07).
  A "squeeze the bag" action is added.
- **Valves** behave like diodes, with leak and obstruction severities, so the CO2 change *comes from* reverse flow (F16).
- **Leaks and disconnection** are pressure-dependent paths shared by VCV and PCV (F08).
- **Absorber** has a capacity that runs down.
- **Zero fresh gas** empties the bag. The architecture then either loses Vt or entrains air (F18).
- **Snapshot** publishes the real flow and composition on every edge. WorkstationScene stops rebuilding the supply itself (F21).
- **Architectures:** one documented architecture first (generic ascending-bellows circle). The other five carry a
  "schematic variant" label until each has a sourced topology (F19). Glostavent draw-over is hidden until it has its own physics.
- **Tests:**
  - Property tests with fast-check: sum = 1, no negative amounts, gas in = gas out + uptake + change in storage,
    pressures stay finite, disconnect → Vt 0 + alarm within N s.
  - Analytic tests: Marini 1989 and τ = V / FGF.
  - Step-size convergence table.
  - Comparisons with Bachiller, Pan and Lucangelo.
  - Pulse CSV trend comparisons for EtCO2 and Vt after disconnect, valve fault and absorber failure.

**PR 6 — A real ventilator panel (M, layout by Gemini)**
- Vt, RR, I:E, Pinsp, Pmax / pressure limit, PEEP, mode (VCV / PCV / manual-spontaneous), bag/ventilator switch.
- Set and measured values side by side, with units.
- A simple mode showing four controls, and a full mode.
- Controls 44 px, text ≥ 12 px (F06, F42).

**PR 7 — Machine design pass (L, design by Gemini, wiring by Claude)**
- One dimensioned generic workstation built from published engineering references, in consistent real-world units.
- Opaque by default; cutaway on demand.
- Patient and machine kept in separate, clearly linked views.
- Every animation traceable to a snapshot value (F44, F21).

**PR 8 — The "patient-circuit disconnection" lesson, 15 minutes (M)**
1. Prebrief (1 min).
2. **Predict**: Paw, flow, capnogram and bellows over the first 10 s; the prediction is stored.
3. Worked example with the gas flow visible and narrated.
4. Faded example: a leak at the absorber, where the learner does the last steps.
5. Independent case: random site and mode. Must-pass safety items. Time to detection counts; clicking everything does not.
6. PEARLS-style automated debrief: the stored prediction next to the real trace, self-assessment first, then teaching on the gap.
7. Mastery: repeat with a new variant until the pass mark set by the clinician panel is reached.
8. Teacher view: pause, cutaway, replay of the event log. Export of the learner attempt, clearly labelled "formative" (F38, F39).

### Gate 2 — Evidence (runs in parallel with Gate 1 once PR 5 lands)

- `docs/credibility/M1-disconnection.md`: the one-page credibility plan, filled in with the real test results.
- **Named review.** Two independent clinicians check the M1 lesson and the PR 2 crises. Their names, roles, the commit reviewed,
  the claim IDs checked, conflicts of interest and verdict go into `reviewedBy` and a `REVIEW.md`. The app shows
  "Revu par … le …, version …" (F05).
- Public errata log (GitHub issues labelled `erratum`). Safety errata are released immediately.
- **Learner pilot**: 5–8 think-aloud sessions to find exploits, then a pre/post knowledge test with 20–30 residents.
- **Device test** on a Galaxy A51-class phone (or a throttled profile). Budget: about 365 KiB of compressed JavaScript on first load (F45).
- `npm audit` fixes without force flags (F46). README and ROADMAP regenerated from the real repo state.

### Gate 3 — Expand, one module at a time

Each module goes through the same gates as M1: credibility plan, adversarial tests, two named reviewers, learner check.
Then its Prototype badge is removed.

Suggested order:
1. M9 crises (most teaching value, already rebuilt in PR 2).
2. M3 volatiles.
3. M4 TCI (one PD path, model eligibility per population: F26–F28).
4. M5.
5. M6.
6. M8 (couple ventilation to gas exchange with a shunt + dead-space model; the Nottingham simulator is a precedent).
7. M7 (rename it a trajectory lesson; hidden-answer practice case: F33, F34).

Only after that: obstetrics, a shared patient across modules, VitalDB, paediatrics. That was the old Sprints 3–5.

## 3. Where Gemini's plan was changed

- Gemini's PR A was too big to review safely. It is split into PR 1–4.
- ROSC: the guideline does not "require" a model. We use a scenario-set outcome plus an adherence score, because no validated ROSC model exists.
- Fasting: the consensus says 8 h or more "may be necessary" after a large or fatty meal; it is not a fixed rule. It sets no volume limit for clear liquids.
- MH dantrolene: the UK QRH says 2–3 mg/kg, MHAUS says 2.5 mg/kg. The app cites the QRH and notes the MHAUS difference.
- Pulse: used as a benchmark only, not as the engine (no browser build, and no bag or APL model).

## 4. Licences to respect

- QRH: CC BY-NC-SA 4.0 (adapt with attribution, share-alike).
- Association of Anaesthetists MH guideline: CC BY-NC-ND (cite only, no adapted versions).
- RCUK, ERC, ASA, ESAIC, MHAUS, ASRA, BRIDION label: all rights reserved, so paraphrase and cite.
- Pulse and BioGears: Apache-2.0. SimTIVA: GPL, reference values only.

## 5. Still unverified (do not ship numbers from these until the full text is opened)

- ASA 2023 neuromuscular-block and fasting full texts; ESAIC full texts; ERC 2025 papers.
- Association of Anaesthetists MH paper (only the QRH card was read); EMHG 2020; SFAR fasting; ASA physical status 2026.
- How missing items are handled in RCRI, Apfel, STOP-Bang and ARISCAT.
- ASRA/ESRA needle-tip guidance.
- Bag compliance and APL pressure-flow numbers (abstracts only).
- Lerou, Conway, Marini, Bachiller, Pan and Lucangelo full texts.

## 6. What only the owner can do

- Find **two practising anaesthesiologists per reviewed lesson** (SFAR, SMAR or CAS education committees, or residency
  directors). Offer a one-hour task, a citable credit and the printable checklist.
- Find **one cohort of 20–30 residents or students** for the pilot.
- Say yes or no to each PR before it merges and publishes.
