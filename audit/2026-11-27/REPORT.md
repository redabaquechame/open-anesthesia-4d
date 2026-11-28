# Open Anesthesia 4D — independent technical and educational audit

**Assessment date: November 27, 2026 (America/Toronto).** Local commit `c10a027977479b4f8a31630dff80c8234ced5599`, package version 1.0.0. Commission: evaluate the actual platform against the goal of free, powerful anesthesia education for students, residents and teachers, with credible physics, timing and anatomy.

**Verdict: a useful educational prototype with serious fidelity and assessment defects. It is not substantiated as a medical-grade simulator or a replacement for expensive procedural systems. It is not worthless. Its value is in explaining selected mechanisms, not in the breadth of its current claims.**

The most serious problem is not whether the objects look AI-generated. It is that the interface invites causal and clinical interpretations that several underlying models cannot support. Better rendering would not repair those defects. Conversely, a carefully designed schematic can be more educationally useful than an opaque photorealistic machine.

This audit adds reports and diagnostic probes only. It does not repair the application, change clinical content, publish, push or deploy. The findings are engineering evidence and educational-risk judgments, not signed clinical approval or a regulatory conformity assessment.

## Read this first

| Confirmed behavior | Why it matters |
|---|---|
| Gas fractions total 107.904% under accessible settings | Fundamental gas-composition invariant fails |
| pads + CPR + three immediate shock clicks → ROSC at 0.5 s | The recovery reward does not enforce the taught timing |
| Reversed critical actions at equal timestamps → order score 100% | The assessment can reward an incorrect sequence |
| Only dantrolene selected → most MH vitals normalize | Other critical actions have weak causal significance in the model |
| Bellows leak: PCV Vt stays 478 mL; VCV falls 533→366 mL | Fault mechanics are incompletely implemented across modes |
| RR/Vt changes do not change M8 gas exchange | A static shunt calculation is presented beside ventilation controls |
| No answers → ASA I and lowest risk bands | Unknown information is silently interpreted as normal |
| 201 registry entries, zero named reviewers | Source checks do not establish clinical sign-off |

Probe values are deterministic headless results from the current source, not real patient data. See `probe-results.json` and `probes.ts` alongside this report.

## What the platform actually is for

The implemented product is an offline-capable, account-free collection of anesthesia learning objects. It combines transparent-machine visualization, simplified physiology/pharmacology, anatomy exploration, checklist-based crises, preoperative score exercises and a regional curriculum/reference library. Its strongest potential is to help a learner explain why a machine or physiological signal changes, then repeat a safe fictional experiment.

| Area | Implemented teaching activity | Boundary today |
|---|---|---|
| M1–M2 workstation | Circle-system visualization, two-compartment mechanics, capnogram faults | Limited control panel and incomplete circuit/fault model |
| M3 volatiles | Multicompartment uptake, shunt/flow exploration, emissions illustration | Selected benchmarks, unverified tissue inputs, no whole-patient interaction |
| M4 TCI/EEG | Compare named PK structures and synthetic EEG patterns | Heuristic controller, hidden acceleration, synthetic signal/index |
| M5 NMJ | Occupancy/fade and monitoring/reversal concepts | Hand-tuned normalized kinetics, unsafe overbroad English badge |
| M6 ultrasound/heart | Anatomy-linked B-mode illustration; separate valve P–V loops | Schematic target structures, nonpersistent injectate/injury, no physical probe skill |
| M7 epidural | Bone/path intersection and schematic tissue layers | No tactile loss of resistance; supplied answer trajectory |
| M8 DLT | Position, cuff/orifice relations, isolation and shunt illustration | Derived lumen, illustrative cuff mechanics, ventilation/gas decoupling |
| M9 crises | Sourced action cards, timed target curves and debrief | Scripted recovery, exploitable timing/order, no action-duration/dose state |
| M10 pre-op | Three fictional cases, scores and fasting planner | Healthy defaults, policy scope and meal classification gaps |
| M11 programmes | Five regional programmes, 302 self-reported items, 89 resources | Reference/navigation aid, not official competency certification |

For students, the first product should be a small sequence of measurable tasks. For residents, it should support repeatable diagnostic cases with less guidance. For professors, it needs assignment setup, consistent cases, pause/replay and exportable evidence. The current rooms mostly share navigation and style, rather than one evolving patient.

## What was verified, and what was not

- **Repository:** all tracked files inventoried and hashed; all tracked text included in a structural/pattern scan. Finding-linked files inspected at the relevant functions, often more extensively. This is not a line-by-line certification of every file or clinical sentence. `inventory.csv` identifies the coverage category for each file.
- **Build:** `npm run build` passed. Large-chunk warning observed: index 856.20 kB; Three.js 552.00 kB before gzip. PWA build reports 41 precache entries totaling 3619.38 KiB.
- **Existing checks:** `npm run sanity` passed. They include baseline ranges, selected published references, geometry checks, crisis sequence checks and registry consistency. Passing them does not establish clinical validity; the new probes expose behaviors they do not cover.
- **New checks:** audit-only headless probes ran successfully and wrote `probe-results.json`. They inspect invariants, action timing/scoring, fault mechanics, score completeness and model consistency. They are diagnostic experiments, not a new clinical validation suite.
- **Dependencies:** a live `npm audit` reported three moderate transitive build-tool findings and no high/critical findings. Saved in `dependency-audit.json`.
- **Current local UI:** home and M1/M3/M4/M5/M6/M7/M8 DOM surfaces inspected through localhost. Some snapshots were captured during anatomy loading. M8 later caused a browser-control timeout; this is not sufficient evidence to attribute a product crash. M9–M11 were reviewed in source, and a historical M9 screenshot was inspected; their complete current UI behavior was not exercised.
- **Visual inspection:** six existing screenshots examined: home hero, workstation, ultrasound, epidural, DLT and crisis. These are historical repository captures, not fresh screenshots of this audit. Current screenshot capture was unavailable. They support qualified art-direction observations, not pixel-perfect proof of the latest running build.
- **External research:** primary guidelines, manufacturer material, model documentation, original research and official project/vendor pages checked with access limits recorded in the source ledger. No paid simulators purchased or hands-on benchmarked.
- **Not verified:** public deployed build, real-device performance, production offline upgrade/rollback, clinician acceptance, all 201 clinical claims, all 89 resource links, full paid standards, motor-skill transfer, clinical outcomes or regulatory status. No real patient dataset was downloaded.

## Why it looks unfinished

The archived workstation image is the clearest example: a large transparent cabinet, shiny generic components, floating lungs and overlapping tubes compete for attention. Realistic and schematic objects share a frame without an obvious hierarchy. Default transparency weakens silhouette and depth. Small labels and many equal-weight controls resemble a developer workbench more than a student lesson.

The home page is more coherent than that workstation: clear entry points and a genuine anatomical tree. However, the hero promises everything is calculated from physical models and real anatomy. That compresses too many different evidence levels into one assurance statement. Calculated is not synonymous with physically faithful.

The ultrasound and epidural screens have useful paired views, but too much information is simultaneously available. Labels, true positions, exact depths and green success messages can replace the reasoning the learner is supposed to practice. The solution is staged information, not simply making every object shinier.

| Visible weakness | Specific change |
|---|---|
| Generic workstation proportions/materials | Dimensioned assembly, consistent units, deliberate steel/polymer/rubber/glass materials |
| Transparency flattens the scene | Opaque orientation first; selective cutaway or exploded mechanism on demand |
| Floating anatomy and mixed scale | Clearly separated patient and machine views, or an explicit schematic connector |
| Tiny dense technical UI | Larger primary signals and controls, readable task instructions, secondary details behind inspection |
| All panels look equally important | One current objective, one action area, one observation area and feedback |
| Many visual effects imply fidelity | Show model scope and uncertainty beside the actual lesson result |
| Images teach the answer too early | Demonstration → guided practice → concealed transfer case |

There is no evidence here that all 3D assets were invented by AI. There is direct provenance for BodyParts3D anatomy. Workstation parts and several tissue/instrument structures are procedural/schematic. Their appearance should be judged against the teaching task and engineering references, not authorship guesses.

## Detailed findings

Priority is relative to this project's ambition. **High** means the issue blocks credible clinical-fidelity, assessment or safety-language claims. **Medium** means an important model limitation, usability gap or production-maintenance issue. These are not formal medical-device risk classifications. Some entries identify deliberate simplifications whose danger lies in presenting them too broadly; the report distinguishes them from reproduced defects.

### F01 · High · M1 — The circuit can contain more than 100% gas

**Evidence (Reproduced: gas-fractions-exceed-100):** The headless probe at O2 6 L/min, air 0, dial 8%, after 30 simulated minutes reports O2 100.000% plus agent 7.904%: total 107.904%. O2 and agent are integrated and clamped independently.

**Implication:** This violates a basic composition invariant within the visible control range. Any lesson relying on oxygen dilution or low-flow composition is suspect until the balance is corrected.

**Required change:** Track all species and total gas amount consistently, account for vapor addition and uptake, and enforce conservation tests rather than renormalizing an incorrect calculation at the display.

**Code:** [src/physics/circuitLungKernel.ts:318](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/physics/circuitLungKernel.ts:318>)

### F02 · High · M9 — Three instantaneous shock clicks guarantee ROSC

**Evidence (Reproduced: rapid-shocks-ROSC; primary guideline comparison [S1]):** pads, cpr and three shock actions at t=0 cause rhythm ROSC at the next 0.5-second tick. There is no minimum CPR interval, rhythm reassessment, charging state or shock-delivery prerequisite beyond the accumulated action count.

**Implication:** The recovery reward contradicts the timing the text purports to teach. RCUK 2025 ordinarily specifies a shock followed by two minutes of CPR; its narrowly defined stacked-shock exception also has different counting for drug timing.

**Required change:** Implement an explicit arrest state machine, timed CPR cycles, reassessment and appropriate exceptional branches. Treat ROSC as a scenario outcome with declared assumptions, never an automatic three-click rule.

**Code:** [src/modules/m9-crisis/protocols/arrest.ts:72](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m9-crisis/protocols/arrest.ts:72>)

### F03 · High · M9 — A reversed sequence can receive a perfect order score

**Evidence (Reproduced: reverse-order-same-time-score):** Entering every critical action in reverse order at the same simulation time produces orderScore=1. buildDebrief compares first-action timestamps using >=, rather than reading the event log sequence.

**Implication:** The assessment can reward the opposite of the intended algorithm. This invalidates the order score as evidence of learning.

**Required change:** Use monotonic event sequence numbers and a protocol dependency graph; support actions that may occur in parallel, required repeats and clinical exceptions. Re-test identical timestamps and rapid clicks.

**Code:** [src/modules/m9-crisis/crisisEngine.ts:117](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m9-crisis/crisisEngine.ts:117>)

### F04 · High · M9 — A single MH action normalizes most vital signs while the trigger stays on

**Evidence (Reproduced: mh-dantrolene-only):** With only dantrolene selected, at 180 seconds the model reports sinus rhythm, HR 92, BP 124/72, SpO2 98 and EtCO2 42. Calling for help, stopping the trigger, TIVA and cooling remain unperformed. The dantrolene target branch overrides trigger state.

**Implication:** Learners can infer that the other critical actions do not matter. This is a model-design failure, not a statement about a real patient response.

**Required change:** Have a clinician define the intended causal response to persistent triggers, incomplete treatment and recurrence; use a reviewed transition model or a coupled metabolic model within a declared domain.

**Code:** [src/modules/m9-crisis/protocols/mh.ts:109](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m9-crisis/protocols/mh.ts:109>)

### F05 · High · All — There is no recorded named clinician approval

**Evidence (Reproduced registry count; governance gap):** The executable registry has 201 entries: 156 sourced, 6 from-memory, 39 illustrative, and zero populated reviewedBy fields. Source status is not expert review or simulator validation.

**Implication:** The project cannot substantiate a claim of clinically reviewed fidelity from this repository. Absence of a recorded reviewer does not prove nobody has ever looked at it informally.

**Required change:** Assign a clinical lead and qualified module reviewers; record identity, role, scope, version, date, corrections and unresolved limitations. Start with the workstation and one student scenario.

**Code:** [src/standards/claimRegistry.ts:36](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/standards/claimRegistry.ts:36>)

### F06 · High · M1 — The main ventilator cannot be set like a ventilator

**Evidence (Source inspection plus current local DOM):** Vt=480 mL, RR=12, I:E=1:2 and PCV inspiratory pressure=8 are in DEFAULT_PARAMS, but the main settings panel exposes no controls for Vt, RR, I:E or PCV inspiratory pressure. The running DOM confirms six steppers: O2, air, vaporizer, PEEP/APL, R and C.

**Implication:** Students cannot practice basic ventilation adjustments or compare pressure and volume control on their own terms. The core machine-learning promise is missing essential interaction.

**Required change:** Expose an authentic, labeled ventilation control panel, set-versus-measured values, units, pressure limit and inspiratory timing; keep an introductory mode with a smaller initial set.

**Code:** [src/App.tsx:76](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/App.tsx:76>)

### F07 · High · M1 — The APL setting acts as an invented pressure source

**Evidence (Source inspection):** In spontaneous mode pb is assigned APL, or 0.85 times APL, without a bag-volume pressure model. There is no squeeze action. The setting directly supplies the breathing baseline instead of acting as a pressure-relief threshold.

**Implication:** This can teach that setting the APL generates pressure or CPAP by itself. The critical relationship between inflow, bag, leak, relief and patient effort is absent.

**Required change:** Model reservoir volume, manual bag compression, pressure-dependent APL outflow and patient muscle pressure. Separate spontaneous breathing, manual ventilation and turbine CPAP.

**Code:** [src/physics/circuitLungKernel.ts:276](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/physics/circuitLungKernel.ts:276>)

### F08 · High · M1 — The bellows-leak fault does nothing to PCV mechanics

**Evidence (Reproduced: bellows-leak-VCV and bellows-leak-PCV):** The probe gives 478 mL with and without the leak in PCV. In VCV the same flag changes 533 to 366 mL. leakFrac is only used in the VCV flow assignment, although the scene still indicates a leak.

**Implication:** Mode-dependent fault handling is inconsistent. The PCV path silently omits the leak rather than simulating pressure compensation, leakage flow or limits.

**Required change:** Represent a leak as a pressure-dependent circuit path shared across modes. Test delivered and expired volume, leak flow and compensation limits for each architecture.

**Code:** [src/physics/circuitLungKernel.ts:290](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/physics/circuitLungKernel.ts:290>)

### F09 · High · M8 — Gas exchange ignores the ventilation settings

**Evidence (Reproduced: dlt-ventilation-gas-decoupling):** At RR/Vt of 4/150, 12/450 and 30/900 the probe reports the same PaO2, 579.906 mmHg, and the same saturation. PaCO2 is hardcoded at 40. This is a static shunt calculation with an animated ventilation view.

**Implication:** The UI invites changes whose expected gas-exchange consequences are not modeled. It can be useful for isolation anatomy, but not for predicting the physiology of hypoventilation.

**Required change:** Either couple alveolar ventilation, CO2, FRC and oxygen stores over time, or explicitly limit the screen to an equilibrium shunt illustration and remove misleading physiological controls/readouts.

**Code:** [src/modules/m8-bronchoscopy-dlt/dltModel.ts:379](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m8-bronchoscopy-dlt/dltModel.ts:379>)

### F10 · High · M6 — Green perineural feedback does not require a visible needle tip

**Evidence (Source inspection):** The positive note depends on proximity within nerve radius +2 mm and absence of the current collision message. It is selected before ultrasound needle visibility is computed, and has no visibility condition.

**Implication:** A learner may receive an encouraging position cue while the needle is out of the beam. The caveat that the cue is educational helps, but the feedback still rewards an incomplete safety behavior.

**Required change:** Require a visible, localized tip and a reviewed sequence of checks for positive feedback; distinguish position illustration from acceptable procedural performance. Retain the uncertainty warning.

**Code:** [src/modules/m6-ultrasound-cardiac/SonoLab.tsx:394](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m6-ultrasound-cardiac/SonoLab.tsx:394>)

### F11 · High · M6 — Needle injury disappears when the tip is moved away

**Evidence (Source inspection):** Safety checks evaluate the current point. There is no persistent vessel/pleura/nerve injury state or path history in SonoLab. Withdrawing from a hazardous point clears the message; local anesthetic volume remains an independent slider.

**Implication:** This teaches collision avoidance at one instant rather than consequences of puncture or unsafe injection. It must not be assessed as a procedure or complication-management simulation.

**Required change:** Record path crossings and injections as events, latch injuries with explicit scenario consequences, and separate exploration reset from clinical recovery.

**Code:** [src/modules/m6-ultrasound-cardiac/SonoLab.tsx:376](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m6-ultrasound-cardiac/SonoLab.tsx:376>)

### F12 · High · M5 — The English interface declares safe extubation from TOF alone

**Evidence (Source inspection; label comparison [S2]):** thumbSafeToExtubate is just ratio >=0.9 and the English badge reads SAFE EXTUBATION >=0.90. The French wording is more conditional. The model has no airway patency, respiratory recovery or consciousness assessment.

**Implication:** TOF recovery is one necessary neuromuscular condition, not a complete extubation decision. The manufacturer label separately requires adequate respiration and a patent airway [S2].

**Required change:** Change the badge to a narrowly scoped statement about measured neuromuscular recovery; present other extubation considerations in reviewed teaching content and never issue an overall safety verdict from this variable.

**Code:** [src/modules/m5-nmj-tof/NmjTofModule.tsx:429](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m5-nmj-tof/NmjTofModule.tsx:429>)

### F13 · High · M5 — The sugammadex explanation contradicts the model compartment

**Evidence (Source inspection; mechanism comparison [S2]):** The English and French success text locates encapsulation in the synaptic cleft, and the gold rings animate there. The numerical binding calculation instead operates on rocPlasma. This confuses complex formation and redistribution away from the junction.

**Implication:** The visual mechanism and the implemented compartment teach different stories. The label describes complex formation that reduces NMBA available for junctional binding [S2]; the original population PK-PD paper describes plasma capture and the resulting concentration gradient [S21].

**Required change:** Have a pharmacology reviewer correct the text and spatial diagram; distinguish plasma/extracellular binding, concentration gradients, receptor unbinding and elimination.

**Code:** [src/modules/m5-nmj-tof/NmjTofModule.tsx:328](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m5-nmj-tof/NmjTofModule.tsx:328>)

### F14 · High · M4 — Drug time runs at hidden 15x speed

**Evidence (Source inspection plus current local DOM):** dtMin=(dtSec/60)*15 and BIS smoothing uses dtSec*15, while EEG synthesis uses simTimeSec advanced by wall dtSec. The current module DOM has no speed control or 15x clock badge.

**Implication:** Students can mislearn drug onset and lag. Drug transport, smoothing and displayed waveform time are not on one visible simulation clock.

**Required change:** Use one named clock with real and simulated time, visible speed and pause controls, and feed the same simulation time to PK, PD, waveforms and event records.

**Code:** [src/modules/m4-aivoc-eeg/AivocEegModule.tsx:228](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m4-aivoc-eeg/AivocEegModule.tsx:228>)

### F15 · High · Release — Publishing bypasses the clinical sanity checks

**Evidence (Source inspection):** The deployment workflow runs npm ci and npm run build, then publishes. It does not run npm run sanity, validate reviewer status or detect generated review-document drift.

**Implication:** A type-correct change can publish a physiological regression. Local green checks from a previous change are not a release gate.

**Required change:** Gate publication on numerical/regression tests, claim consistency, explicit release identity and review status appropriate to the changed module; preserve preview deployment for unreviewed work.

**Code:** [.github/workflows/deploy.yml:27](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/.github/workflows/deploy.yml:27>)

### F16 · Medium · M1 — Valve faults change the capnogram without changing the flow network

**Evidence (Reproduced: fault-mechanics-stuckInspiratoryValve and stuckExpiratoryValve):** Both stuck-valve probes produce identical Vt, Paw and flow to baseline. The flags add inspired CO2 using constants; visual ribbons reverse separately. They do not alter the pressure-flow solve.

**Implication:** The diagram looks causal, but reverse circuit flow is not responsible for the resulting CO2. This restricts interpretation of combined faults and quantitative comparisons.

**Required change:** Use directional valve resistances in a shared gas-transport network, or present these as explicitly scripted pattern-recognition examples.

**Code:** [src/physics/circuitLungKernel.ts:335](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/physics/circuitLungKernel.ts:335>)

### F17 · Medium · M1 — The curare cleft is drawn without a spontaneous effort

**Evidence (Reproduced: fault-mechanics-curareCleft):** The fault subtracts a sine-shaped notch from capnogram target during a fixed phase. The mechanics probe is unchanged from the fully controlled case.

**Implication:** It demonstrates a waveform label, not the coupled effect of a patient breathing against ventilation. The distinction matters for interpreting causes.

**Required change:** Inject a patient-effort signal into pressure/flow and transport its effect to the capnogram, or label the notch as an isolated waveform illustration.

**Code:** [src/physics/circuitLungKernel.ts:362](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/physics/circuitLungKernel.ts:362>)

### F18 · Medium · M1 — The finite breathing gas reservoir never runs out mechanically

**Evidence (Reproduced: zero-fresh-gas-piston-30-min):** With an electrically driven piston and zero fresh gas for 30 minutes, the headless model still delivers 478 mL every breath, FiO2 is clamped to 2%, and bag fill remains 0.3. No finite reservoir depletion is solved. Zero inflow can also result from a supply fault with air off; the normal O2 stepper itself has a 0.2 minimum.

**Implication:** This is outside the validity of the fixed-volume mixing assumption. The low-FiO2 alarm exists, but the breathing circuit still behaves as an inexhaustible reservoir.

**Required change:** Track total gas volume and reservoir collapse/air entrainment according to the chosen device topology, including loss of supply and disconnection tests.

**Code:** [src/physics/circuitLungKernel.ts:391](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/physics/circuitLungKernel.ts:391>)

### F19 · Medium · M1 — Six machine architectures share too much undifferentiated physics

**Evidence (Source inspection):** The kernel switches a few features: bellows coupling, piston decoupling, leak fraction, turbine CPAP and bellows motion. Draw-over still uses the same circle gas/absorber model; the volume-reflector gas front is a visual interpolation.

**Implication:** These are six schematic variants, not six verified device implementations. Naming a technology does not establish faithful internals.

**Required change:** Define a sourced topology and validity envelope for each architecture. Start with one well-documented workstation; expand after topology-specific fault and bench comparisons.

**Code:** [src/physics/circuitLungKernel.ts:175](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/physics/circuitLungKernel.ts:175>)

### F20 · Medium · M1 — Choosing another volatile mainly changes the appearance in the workstation

**Evidence (Source inspection):** The M1 worker parameter type contains dial percentage but no agent identity. Selecting the agent changes the scene and display data, so agent-specific uptake/solubility cannot enter that kernel. M3 has a different kinetic model.

**Implication:** A user can mistake a visual agent change for an agent-specific physiological experiment.

**Required change:** Expose the limited purpose of M1 agent selection, or integrate one reviewed kinetic model shared with the volatile lesson.

**Code:** [src/physics/circuitLungKernel.ts:49](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/physics/circuitLungKernel.ts:49>)

### F21 · Medium · M1 — Gas-flow visuals use requested supply rather than actual supply

**Evidence (Source inspection):** updateFlowRibbons computes fresh flow from requested O2/air/N2O and adds 45 L/min for flush. It does not apply the worker's wall-supply failure or concentrator 10 L/min flush limit. Fresh argon is also set to zero there.

**Implication:** The diagram can imply supply persists after a failure or exaggerate concentrator flush. The visual explanation can disagree with the numbers.

**Required change:** Publish actual flow and species composition for each circuit edge in the simulation snapshot. Render that data without independently reconstructing supply logic.

**Code:** [src/modules/m1-workstation/WorkstationScene.ts:935](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m1-workstation/WorkstationScene.ts:935>)

### F22 · Medium · Timing — The 50 Hz worker is a nominal callback schedule, not verified real time

**Evidence (Source inspection):** The worker advances exactly PHYSICS_DT*speed per 20 ms setInterval callback; it does not account for elapsed monotonic time or suspended/throttled execution. The crisis clock similarly advances a fixed 0.5*speed per callback.

**Implication:** Under scheduling delay, simulated time falls behind wall time. This may be acceptable when declared, but LIVE 50 Hz is not proof of timing accuracy.

**Required change:** Decide whether hidden tabs pause or catch up, use a fixed-step accumulator and explicit simulated time, and measure clock error/jitter under load. Avoid huge uncontrolled catch-up steps.

**Code:** [src/physics/physicsWorker.ts:41](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/physics/physicsWorker.ts:41>)

### F23 · Medium · Timing — Rendering performance determines pharmacology progression

**Evidence (Source inspection):** M3, M4 and M5 integrate in requestAnimationFrame and clamp elapsed frame time to 0.05 seconds. At a sustained 10 fps they integrate only about half of elapsed wall time. Paused/background frames lose time by design.

**Implication:** The same scenario can progress at different rates on different student devices, undermining democratized access and timing comparisons.

**Required change:** Move numerical integration to a clock independent of drawing, use bounded fixed substeps and documented pause behavior, and verify convergence across render rates and speed settings.

**Code:** [src/modules/m3-volatile-eco/VolatileEcoModule.tsx:219](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m3-volatile-eco/VolatileEcoModule.tsx:219>)

### F24 · Medium · M4 — Raw EEG sampling rate and time axis vary with the display frame rate

**Evidence (Source inspection):** One sample is appended each animation frame, and the plot displays the last 220 samples with equally spaced x coordinates. The raw signal includes a 22 Hz component. At 30 fps its Nyquist limit is 15 Hz, so it aliases; the buffer represents different time spans on different devices.

**Implication:** A raw EEG lesson can show materially different frequency content for the same state. There is no calibrated horizontal axis to reveal this.

**Required change:** Generate EEG on a fixed, documented sample clock above the required bandwidth with anti-aliasing; plot against timestamps and show seconds and microvolts.

**Code:** [src/modules/m4-aivoc-eeg/AivocEegModule.tsx:246](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m4-aivoc-eeg/AivocEegModule.tsx:246>)

### F25 · Medium · M4 — The displayed DSA is not a spectrum computed from the raw EEG

**Evidence (Source inspection):** The 30-bin spectrum is assembled from Gaussian bands plus Math.random. The raw trace is independently synthesized from three sine waves. The DSA grid is updated on another wall-time interval.

**Implication:** Raw EEG, spectral display and depth labels may look mutually confirming although they do not share a measured signal. This is a concept illustration, not an EEG instrument emulator.

**Required change:** Derive a spectrogram from a shared signal with a defined window, overlap, units and color scale, and compare expert-labeled real recordings. If teaching bands only, label that boundary clearly.

**Code:** [src/physics/aivocEegKernel.ts:300](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/physics/aivocEegKernel.ts:300>)

### F26 · Medium · M4 — Two different BIS models coexist

**Evidence (Reproduced: m4-two-different-BIS-models):** ThreeCompartmentEngine predicts BIS using model-specific gammaLow/gammaHigh; synthesizeEegSpectrum recomputes an index using fixed exponent 1.65 and other heuristics. The probe at Ce~6 gives 20.54 versus raw displayed 23. The latter is what the UI smooths.

**Implication:** Selecting a named PK-PD model does not guarantee its PD output is the displayed index. Source PD parameters and illustrative artifact behavior are blended.

**Required change:** Use one explicitly versioned PD path, keep artifact demonstrations separate and show uncertainty. Resolve the paper-equation/Table-3 gamma discrepancy against supplementary code before asserting full parity [S11].

**Code:** [src/physics/aivocEegKernel.ts:316](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/physics/aivocEegKernel.ts:316>)

### F27 · Medium · M4 — The TCI controller and manual pump lesson are not validated pump implementations

**Evidence (Source inspection):** stepTci uses a proportional-feedforward heuristic with numeric gains and a cap. The manual bolus is targetCe*V1*0.85, with clearance-derived step-down rates. The code admits these are simulator heuristics; the prominent lesson still uses clinical pump terminology and dose units.

**Implication:** Reaching a target concentration eventually does not validate the infusion trajectory, induction dose or a commercial TCI algorithm.

**Required change:** Retain a conceptual controller only with a visible limitation; benchmark complete trajectories against an independently implemented reference and do not present heuristic rates as a clinical regimen.

**Code:** [src/physics/aivocEegKernel.ts:204](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/physics/aivocEegKernel.ts:204>)

### F28 · Medium · M4 — Avatar/model validity and opioid state are inadequately constrained

**Evidence (Source inspection):** The six-year-old avatar can be combined with all listed models; Minto uses a 30 kg lean-mass floor. Every avatar has opioidCoAdmin=true even when the remifentanil target is turned to zero. Some covariate equations remain from-memory.

**Implication:** The app can compare models outside demonstrated domains without making the extrapolation visible, and the opioid-associated PK setting is not derived from the current remifentanil control.

**Required change:** Give each model an explicit eligible population, route/units, coadministration meaning and extrapolation policy. Provide reference cases across ages, sex and body size, not only the standard adult.

**Code:** [src/physics/aivocEegKernel.ts:155](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/physics/aivocEegKernel.ts:155>)

### F29 · Medium · Architecture — There is no common patient across the rooms

**Evidence (Source inspection):** ModuleRouter passes locale and navigation, not shared physiological state. Circuit, volatile, TCI, NMJ, heart, DLT and crisis models have separate parameters, clocks and reset behavior.

**Implication:** The current product is a collection of learning objects. It cannot support the claim that all machine, drug, airway and patient changes interact as one anesthesia simulation.

**Required change:** Keep independent lessons where educationally useful; for integrated scenarios define a small authoritative patient state, units, clock and explicit adapters, then validate the couplings rather than merging everything at once.

**Code:** [src/modules/ModuleRouter.tsx:58](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/ModuleRouter.tsx:58>)

### F30 · Medium · M5 — The NMJ time courses and PTC are hand-tuned mappings

**Evidence (Source inspection):** Rocuronium and sugammadex use normalized reservoirs and fixed coefficients, not molar mass balance or a referenced PK-PD model. Twitch heights use clipped linear occupancy curves; PTC is calculated continuously from occupancy even before a tetanic test. Cooldown blocks a button rather than modeling post-tetanic facilitation.

**Implication:** The module can teach qualitative monitoring concepts, but its seconds, dose-response and recurrence trajectories are not established quantitative drug predictions.

**Required change:** Define the teaching boundary, remove exact response-time implications until benchmarked, and use reviewed PK-PD/monitoring response datasets if quantitative behavior is required.

**Code:** [src/modules/m5-nmj-tof/NmjTofModule.tsx:23](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m5-nmj-tof/NmjTofModule.tsx:23>)

### F31 · Medium · M6 — The ultrasound is an acoustic illustration, not calibrated scanner physics

**Evidence (Source inspection):** A correct squared impedance reflection coefficient is combined with R*60, added wall echoes, a sixfold strong-reflector gain, analytic speckle and drawn reverberation terms. There is no calibrated transducer/RF acquisition chain or reference-image error analysis.

**Implication:** Some physical mechanisms are represented, but a realistic-looking image is not evidence that anatomy recognition or needle visibility transfers to a scanner.

**Required change:** Use paired real/virtual images reviewed by regional anesthetists, calibrate depth and orientation first, and state what artifacts and acquisition behavior the renderer does and does not emulate.

**Code:** [src/modules/m6-ultrasound-cardiac/ultrasoundSim.ts:273](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m6-ultrasound-cardiac/ultrasoundSim.ts:273>)

### F32 · Medium · M6 — Injected anesthetic teleports with the needle tip

**Evidence (Source inspection):** Each frame assigns laCenter=tip.clone() and sizes one ellipsoid from the current volume slider. Moving the needle moves the entire prior injectate; reducing the slider removes it. No prior deposits, tissue planes or injection pressure are retained.

**Implication:** The displayed spread does not represent injection history or hydrodissection, so it can teach an incorrect procedure mechanism.

**Required change:** Deposit fluid at injection events in world coordinates and model or illustrate reviewed compartment boundaries. Show volume/rate, retain prior deposits, and handle unsafe injection sites explicitly.

**Code:** [src/modules/m6-ultrasound-cardiac/SonoLab.tsx:365](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m6-ultrasound-cardiac/SonoLab.tsx:365>)

### F33 · Medium · M7 — Loss of resistance is a tissue label and bar, without procedural force fidelity

**Evidence (Source inspection):** Real vertebral intersections are combined with synthetic soft tissues and illustrative syringe resistance values. The interaction is a depth/angle stepper, with no tactile device, syringe compliance, pressure input or physical force feedback.

**Implication:** This is useful for spatial understanding, but it cannot demonstrate that a learner can feel or safely perform an epidural. A browser alone does not reproduce that task.

**Required change:** Name it a trajectory/anatomy lesson. Validate a separate low-cost physical trainer or optional measured haptic interface for the motor skill; do not award procedural competence from the screen.

**Code:** [src/modules/m7-neuraxial-spine/NeuraxialSpineModule.tsx:341](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m7-neuraxial-spine/NeuraxialSpineModule.tsx:341>)

### F34 · Medium · M7 — The default trajectory and readouts reveal the solution

**Evidence (Source inspection):** On initialization/reset the app searches for a typical successful trajectory. The panel exposes exact flavum and epidural depths. These aids remain part of the ordinary experience rather than a staged assessment.

**Implication:** The learner can advance to a supplied answer without interpreting landmarks, uncertainty or the loss-of-resistance cue.

**Required change:** Keep explicit demonstration mode, then offer faded guidance and a separate practice case with concealed answer depths, variable anatomy and reviewed feedback.

**Code:** [src/modules/m7-neuraxial-spine/NeuraxialSpineModule.tsx:79](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m7-neuraxial-spine/NeuraxialSpineModule.tsx:79>)

### F35 · Medium · Anatomy — Real source meshes do not establish representative or complete anatomy

**Evidence (Source inspection):** The asset pipeline uses reduced BodyParts3D meshes. Plexus, pleural dome and neuraxial soft tissues are schematic. The bronchoscope lumen is a capsule-based reconstruction from extracted centerlines; cuff dimensions/compliance include illustrative values. M7 describes one adult male standing specimen.

**Implication:** Dataset provenance is real, but procedural landmarks, deformability, patient variability and instrument fit still need validation. The broad phrase real human anatomy hides those distinctions.

**Required change:** Maintain a structure-level provenance map and clinician-approved landmark measurements, normal variants and pathology cases. Visibly distinguish measured mesh, derived geometry and schematic additions.

**Code:** [src/modules/m8-bronchoscopy-dlt/bronchoscopeView.ts:5](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m8-bronchoscopy-dlt/bronchoscopeView.ts:5>)

### F36 · High · M10 — Unanswered questions produce apparently healthy results

**Evidence (Reproduced: unanswered-risk-scores):** scoreTotal treats every missing answer as option zero. The headless probe returns ASA I and the lowest bands for RCRI, STOP-Bang, Apfel and ARISCAT. The UI preselects those options and displays a band immediately.

**Implication:** Unknown information becomes negative findings, which is a poor habit to teach in assessment. This is especially problematic if a user enters a real patient despite the disclaimer.

**Required change:** Represent unknown separately, require completeness before a final band, and distinguish a fictional worked case from free scoring.

**Code:** [src/modules/m10-preop/preopMath.ts:5](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m10-preop/preopMath.ts:5>)

### F37 · High · M10 — Fasting rules flatten meal type and regional differences

**Evidence (Source inspection; primary consensus comparison [S12]):** adultSolid is a single generic Solids=6 h rule. The definitions mix adult ASA-associated advice and pediatric ESAIC intervals; changing interface locale does not select a clinical fasting policy. The 2026 international consensus distinguishes large/fatty meals and notes institutional protocols [S12].

**Implication:** A generic planner may imply one universal timing rule. The defect is missing scope and meal classification; it is not a recommendation to impose a blanket eight-hour rule everywhere.

**Required change:** Choose an explicit guideline/jurisdiction/version, healthy-elective eligibility and meal type; teach exceptions and institutional variation with a reviewer. Keep a planner for synthetic cases, not patient instructions.

**Code:** [src/modules/m10-preop/preopScores.ts:179](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m10-preop/preopScores.ts:179>)

### F38 · Medium · Learning — The first-use flow is designed around exploring controls

**Evidence (Source inspection):** M1 starts in sandbox, 75% transparency, labels off; the guide is closed unless remembered open. Home says every screen opens on its instructions, but ModuleGuidePanel intentionally defaults closed. There is no first student objective/prediction/feedback loop.

**Implication:** Novices must discover the instrument and its educational purpose simultaneously. More modules increase confusion rather than learning power.

**Required change:** Start with a short task: predict what disconnect will change, run it, observe the right signals, explain the mechanism and repeat a transfer case. Offer sandbox after the first guided exercise.

**Code:** [src/components/ModuleGuidePanel.tsx:27](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/components/ModuleGuidePanel.tsx:27>)

### F39 · Medium · Learning — The learning record does not substantiate competence

**Evidence (Source inspection):** The located xAPI call records opening the debrief as practiced. The helper defaults success=true and completion=true. The printable debrief is a generic prompt sheet, not an event-based replay. M11 progress is explicitly self-declared.

**Implication:** A source-linked library and progress ticks are useful, but they do not prove procedural performance, mastery or an accredited curriculum outcome.

**Required change:** Define observable objectives and formative rubrics, capture action/time/reasoning evidence and export a clearly labeled learner attempt. Preserve self-declared curriculum progress as a separate feature.

**Code:** [src/utils/lmsAndDebrief.ts:58](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/utils/lmsAndDebrief.ts:58>)

### F40 · Medium · Evidence — Source counts create more assurance than they establish

**Evidence (Reproduced registry breakdown; evidence-system review):** Of the 156 sourced entries, 68 belong to M11 reference/library summaries. Entries cover heterogeneous claims, sometimes from abstracts. The registry points mostly to files and groups of values, not executable constant-to-source assertions.

**Implication:** 156 sourced is not 156 validated simulation behaviors. It is also not a count of independently reviewed sources. Remaining unverified model inputs affect some of the most ambitious modules.

**Required change:** Separate source checked, equation transcribed, code verified, externally validated and clinician reviewed. Link each material coefficient or rule to a versioned source passage and tests; keep illustrative choices explicit.

**Code:** [src/standards/claimRegistry.ts:221](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/standards/claimRegistry.ts:221>)

### F41 · Medium · Release — Offline copies can retain obsolete clinical content

**Evidence (Source inspection):** The update toast is dismissible and checks hourly only while online. There is no content expiry or withdrawn-lesson mechanism. BUILD_ID combines package version 1.0.0 and date, so multiple builds on one day share the same displayed identity.

**Implication:** A reported error or reviewed correction may be difficult to tie to an exact build, and an offline learner can keep outdated content indefinitely.

**Required change:** Use immutable commit/content identities, display last-review dates and offline status, and define a proportionate withdrawal/update policy for serious educational errors.

**Code:** [src/config.ts:11](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/config.ts:11>)

### F42 · Medium · UX — Small dense controls and canvases limit access

**Evidence (Source inspection):** Many labels use 9–11 px styles, steppers are 28 px high and presets 20 px high, with multiple scroll regions and unlabeled 3D canvases. Some monitor canvases have text summaries, but interactive 3D concepts lack equivalent nonvisual tasks. The archived phone captures show stacked layouts, not proven usability.

**Implication:** This conflicts with use on inexpensive phones, projectors and assistive technologies. This is a usability/accessibility concern, not a completed WCAG conformance audit.

**Required change:** Test keyboard, screen reader, zoom, contrast and touch tasks; use larger key controls, readable text and a non-3D schematic/text path for the same learning objective.

**Code:** [src/components/ClinicalStepper.tsx:53](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/components/ClinicalStepper.tsx:53>)

### F43 · Medium · Localization — Arabic selection is not a complete Arabic clinical interface

**Evidence (Source inspection):** The shell offers ar-MA and RTL, while most modules choose French whenever locale is not en-INT. M11 programme/library labels are largely French even in English mode.

**Implication:** The language menu implies a degree of localization the clinical learning content does not provide. RTL French content can be harder to read.

**Required change:** Label language coverage honestly, separate region from language, and have a medical translator plus a clinician review Arabic terminology, numbers, reading direction and task comprehension.

**Code:** [src/modules/m4-aivoc-eeg/AivocEegModule.tsx:44](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m4-aivoc-eeg/AivocEegModule.tsx:44>)

### F44 · Medium · Visual design — The machine reads as a schematic prop rather than a coherent instrument

**Evidence (Source inspection plus historical image review):** The workstation is procedural Three.js geometry. The historical workstation capture shows a large translucent slab, generic gauges/knobs, exposed floating lungs, cluttered overlap and mixed physical scales. The code explicitly scales the patient differently from the circuit. Mesh controls are not directly operated; settings live beside the scene.

**Implication:** The viewer sees effort and technical detail, but has weak spatial hierarchy and little sense of operating a real workstation. This is an art-direction and interaction judgment, not proof that AI generated every object.

**Required change:** Build one dimensioned generic workstation from documented engineering references; use consistent real-world units, distinct material families, clear assembly, readable labels and click-to-inspect components. Use a separate schematic cutaway view when physical scale obscures a mechanism.

**Code:** [src/modules/m1-workstation/WorkstationScene.ts:47](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/modules/m1-workstation/WorkstationScene.ts:47>)

### F45 · Medium · Performance — The free/offline promise lacks a documented low-end device acceptance test

**Evidence (Observed build output; source inspection; device validation gap):** The production build passes but warns about large chunks: index 856.20 kB and three 552.00 kB before gzip. The PWA precache is 41 entries / 3619.38 KiB. M7 and M8 create additional WebGL views, and ultrasound computes slices on the main thread. Adaptive tiers exist, but there is no measured target-device report in the inspected test suite.

**Implication:** Bundle size alone does not prove slow performance. The gap is evidence that cold start, heat, battery and task responsiveness work for the phones the mission targets.

**Required change:** Define a representative low-end Android, mid-range device and desktop test matrix; measure loading, sustained frame/physics rates, interactions and offline recovery. Keep numerical behavior invariant when visual quality drops.

**Code:** [src/engine/createTieredRenderer.ts:40](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/src/engine/createTieredRenderer.ts:40>)

### F46 · Medium · Dependencies — The dependency audit has three moderate findings

**Evidence (Live npm registry audit, saved JSON):** npm audit reports moderate findings for glob, minimatch and workbox-build; no high or critical findings. They are transitive build-tool findings. Full advisory paths and suggested fixes are preserved in dependency-audit.json.

**Implication:** This is maintenance work, not evidence of an exploitable deployed patient-data service. The static app and build pipeline have different exposure.

**Required change:** Review the actual advisories, update compatible build dependencies in an isolated change and rerun build, PWA/offline and simulator checks. Do not apply a blind force update.

**Code:** [package.json:43](<C:/Users/redab/OneDrive/Bureau/three.j anesthesia platform/package.json:43>)

## The route to a credible free tool

The defensible mission is: **make high-quality anesthesia reasoning practice and transparent mechanism lessons freely accessible, then demonstrate exactly which learning tasks they support.** Broad superiority over every costly simulator is neither necessary nor currently measurable.

Three separate kinds of fidelity need evidence:

1. **Physical/visual:** correct dimensions, components, topology, anatomy and instrument behavior within a stated reference model.
2. **Functional/temporal:** correct response to an action, realistic delays and sensor behavior, conservation, stable integration and consistent time.
3. **Educational:** students understand, retain and apply the intended concept without acquiring a harmful misconception. Appearance alone establishes none of these.

INACSL's design summary supports expert involvement, measurable objectives, prebriefing, feedback/debriefing, evaluation and pilot testing [S3]. It does not require every teaching object to be photorealistic. The FDA credibility guidance provides a useful risk-informed model-evidence approach, but its scope is device submissions; adopting its reasoning does not make this app certified [S4].

### Build one complete reference lesson first

**Proposed first lesson: identify and respond to a patient-circuit disconnection.** A student sees a fictional ventilated adult and one documented workstation architecture, predicts what airway pressure, expired volume, CO2 and bellows will do, observes the event, selects diagnostic checks and explains the mechanism. A teacher can pause, reveal the cutaway and replay the action record. The debrief explicitly distinguishes machine evidence, patient assessment and model limits.

The lesson should have three passes: a two-minute demonstration, a guided practice case and an unfamiliar transfer case. Actual durations and pass criteria require pilot testing; they are proposed design choices, not measured learning outcomes. Keep the internal circuit visible only when it answers a question. Display the relevant alarm and acknowledge/silence behavior. Avoid filling the screen with every gas, organ and curriculum reference at once.

### A small architecture that can be checked

| Layer | Required behavior | Evidence before acceptance |
|---|---|---|
| Clock | One simulation time, pause/speed policy, timestamped events | Same event results across display frame rates and tested numerical steps |
| Machine | Explicit nodes/edges, compliant reservoir, valves, leak paths and gas supply | Analytic cases plus documented topology/bench comparisons |
| Patient | Scoped lung mechanics and gas stores; later add reviewed circulation/drug couplings | Independent physiological time-series comparisons over declared ranges |
| Sensors | Sampling location/rate, transport lag, smoothing and failure model | Signal/replay comparison and fault tests |
| Scenario | Action prerequisites, durations, repeats, parallel tasks and consequences | Clinician-authored state/transition and adverse-path review |
| Presentation | Read-only rendering from authoritative state | Every displayed motion/flow traceable to a state value or labeled illustration |
| Learning record | Versioned objective, events, rationale, feedback and export | Rubric review, reproducible replay and learner pilot |

Use physical laws where they materially govern the task; use declared approximations elsewhere. A basic circle model needs conservation of total gas and species, pressure-flow-resistance relationships, lung compliance and appropriate valve directionality. Low-flow lessons additionally need realistic mixing volumes, uptake and reservoir behavior. Sensor transport and smoothing must be distinct from physiology. Avoid exact-looking clinical outputs where the modeled variables cannot determine them.

### Validation plan with reviewable outputs

| Domain | Necessary tests | Comparator and acceptance decision |
|---|---|---|
| Numerical integrity | Gas sums, nonnegative amounts, mass balance, dt/speed/frame-rate convergence, reset reproducibility | Analytic solutions/invariants; tolerances set for each task before testing |
| Workstation | VCV/PCV, pressure limiting, FGF coupling/decoupling, APL/bag, leaks, obstruction, disconnection and supply loss | Manufacturer IFU/topology and appropriate bench traces; account for device-specific behavior [S19] |
| Gas exchange | Apnea, hypoventilation, FRC/O2 depletion, shunt and washout | Published time courses in comparable populations; do not infer from one normal endpoint |
| PK-PD | Full infusion trajectories, targets raised/lowered, washout, multiple ages/body sizes and coadministration states | Original equations/supplements plus independent implementations; separate model parity from clinical validity [S11] |
| Monitoring | Fixed-rate samples, calibrated axes, EEG→DSA consistency, delays, invalid signal states and alarms | Real recordings such as VitalDB for morphology/timing, not causal treatment validation [S10] |
| Anatomy/procedures | Landmark measurements, orientation, device clearance, variants, spread/injury history | Named anatomy/procedure experts and paired real/reference images |
| Education | Misconception checks, objective attainment, retention and transfer tasks | Formative student/resident pilots with transparent methodology and uncertainty |
| Accessibility/devices | Keyboard/screen reader, zoom, low-end phone, reduced effects, offline restart/update | Target-device acceptance records; no score equivalence inferred from desktops |

The present sanity suite is worth retaining. Add adversarial tests and independent benchmark curves around it. Do not tune a model to one reference point and then describe that point as broad validation. Do not prescribe an arbitrary universal percentage-error tolerance across drugs, gases, anatomy and learning outcomes.

### Sequence work by release gates

| Order | Work package | Exit evidence |
|---|---|---|
| 1 | Contain false confidence | Scope wording corrected; extubation badge narrowed; crisis/order exploits and healthy defaults addressed; unreviewed claims visible |
| 2 | Repair the first workstation lesson | Gas conservation, real settings, consistent fault paths, clock and sensor behavior; reviewed adult reference case |
| 3 | Rebuild its visual/interaction design | Dimensioned generic assembly, selective cutaway, readable controls, one complete student task |
| 4 | Independent technical and clinician review | Named sign-off tied to commit, numerical benchmark report and unresolved-limitation list |
| 5 | Pilot with students and teachers | Observed completion, explanation and transfer results; errors and feedback documented |
| 6 | Release discipline | CI gates, immutable build/content ID, changelog, rollback and offline correction policy |
| 7 | Expand one module at a time | Each module meets its own defined purpose and evidence gates; integration follows validated coupling contracts |

Do not expand the module count while the core lesson cannot meet these gates. Priorities here are recommendations, not implementation already completed by this audit.

## What to reuse, and what expensive systems actually provide

| Reference | What can inform this project | Boundary |
|---|---|---|
| Pulse [S8] | Circuit/component organization, coupled patient/equipment model, validation matrices | Its documented anesthesia model has scope limits; do not inherit a blanket validation claim |
| BioGears [S9] | System documentation and validation approach; possible offline comparison engine | Integration/performance/license due diligence still required; no swap was tested here |
| VitalDB [S10] | Authentic monitor morphology, timing and replay cases | Observational recordings do not tell what would happen under a different action |
| BodyParts3D [S13] | Existing anatomy provenance and geometry pipeline | One dataset cannot establish all anatomical variants or procedural safety |
| Original PK-PD literature [S11] | Equations, parameter provenance and reference cases | Model predictions have domains and variability; an implementation must still be verified |
| Manufacturer IFUs [S19] | Real machine component relationships and behavior | Specific model/version matters; no certification or trade-dress copying implied |
| UF VAM [S17] | Historical evidence that transparent mechanism explanations are a legitimate teaching direction | The inspected site is a legacy Shockwave archive, not a modern tested alternative |

The market is not simply all tools cost thousands. Anesoft's inspected catalog lists individual options at $99 and $198, and departmental options at $999 and $1,998, through January 2028 [S14]. Its service description includes self-study/evaluation cases and learner logs [S15]. These are vendor descriptions, not a hands-on efficacy comparison.

Open Sim Lab describes a free browser alternative with assignment/replay features while explicitly reporting no clinician-approved content in the inspected build [S16]. This is useful transparency, not evidence that its models are clinically superior. Physical systems such as CAE HPS provide mannequin/equipment interactions beyond this browser app's current capabilities [S18]; no current public price was verified here.

Free access can outperform paid products on availability, repeatability, language access, transparent explanations and low-friction classroom distribution. It cannot automatically replace tactile skill, physical equipment handling, supervised team behavior or independently validated assessment. Compare competitors task by task, with the same learners and outcome measures, before making superiority claims.

## What medical rigor and production quality mean here

The app's educational-only notice is appropriate. The terms medical grade and production grade do not by themselves specify evidence. Decide and publish the intended use first: fictional-case education, rather than dosing or treatment recommendations for real patients. Health Canada and MDCG guidance place intended purpose at the center of software qualification [S5–S6]. This audit does not determine the product's legal classification.

For the educational product, require named clinical ownership, source/implementation traceability, quantitative checks suited to the lesson, a learner-safety hazard log, release review, incident correction and readable limits. A serious hazard log should include misleading reassurance, wrong timing, unit confusion, obsolete offline content, incorrect assessment feedback and overgeneralization from one anatomy/model.

If the intended purpose later includes individual-patient diagnosis, treatment or device control, commission a jurisdiction-specific regulatory assessment before building or claiming that use. Device software lifecycle, risk, usability and quality standards may then be relevant according to the assessed scope. ISO 80601-2-13 concerns anesthesia workstation safety/performance [S7]; its existence does not certify a web visualization. The full paid standard and its 2026 amendment were not reviewed in this audit.

Keep the existing source registry, disclaimers, pure kernels, anatomy attribution, lazy loading and sanity checks. They are useful foundations. Their next job is to make limitations testable and reviewable, rather than to decorate an assurance claim.

## Additional documentation drift

README describes only M1–M8 and says Eleveld lacks maturation, although the code includes Q2/Q3 maturation and the product has M9–M11. ROADMAP contains older counts and verification-status descriptions mixed with later updates. These documents should be regenerated from the release manifest where possible. Historical screenshot filenames and newer home assets also represent different revisions; do not use any old image as proof of a current deployment.

## Source ledger

The following records distinguish opened documents from search-extracted material and access failures. Dates, prices and product descriptions are a November 27, 2026 research snapshot. Short paraphrases are used; no third-party diagrams, full articles or paid source texts are republished.

- **S1 — [Resuscitation Council UK, Adult advanced life support, 2025](https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/adult-advanced-life-support-guidelines).** Opened guideline. Shock/CPR timing and stacked-shock exception used for F02; this audit is not a complete crisis-guideline review.

- **S2 — [Merck, BRIDION prescribing information, revised March 2026](https://www.merck.com/product/usa/pi_circulars/b/bridion/bridion_pi.pdf).** Opened PDF, especially sections 2, 5 and 12. Mechanism, monitoring and recovery requirements used for F12–F13; not a dosing endorsement.

- **S3 — [INACSL, Simulation Design, 2025 summary](https://inacsl.memberclicks.net/assets/Simfographics/25simfographics/INACSL_SIMULATION%20DESIGN_2025.pdf).** Opened official one-page standard summary. Expert input, measurable objectives, prebrief/debrief, evaluation and pilot testing inform the proposed learning process; full standard not audited clause by clause.

- **S4 — [FDA, Credibility of Computational Modeling and Simulation, 2023](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/assessing-credibility-computational-modeling-and-simulation-medical-device-submissions).** Opened guidance landing page; scope and risk-informed credibility approach used as an engineering reference. It is guidance for device submissions, not a certification of this education app.

- **S5 — [Health Canada, SaMD definition and classification](https://www.canada.ca/en/health-canada/services/drugs-health-products/medical-devices/application-information/guidance-documents/software-medical-device-guidance-document.html).** Official guidance search text examined: intended purpose is central. No legal classification decision made for this product.

- **S6 — [MDCG 2019-11 revision 1, June 2025](https://health.ec.europa.eu/system/files/2025-06/mdcg_2019_11_en.pdf).** Opened PDF, scope/intended-purpose sections. Education and real-patient decision support must have clear boundaries; no MDR conformity assessment performed.

- **S7 — [ISO 80601-2-13:2022, including listed 2026 amendment](https://www.iso.org/standard/76679.html).** Official catalog abstract examined, covering workstation safety/performance scope. Full paid standard and amendment not read; no ISO limits inferred from the abstract.

- **S8 — [Kitware Pulse, Anesthesia Machine Methodology](https://pulse.kitware.com/_anesthesia_machine_methodology.html).** Opened methodology, validation matrix and limitations. A useful reference model and test style, with manual-bag and spontaneous-synchronization limitations; not a drop-in universal solution.

- **S9 — [BioGears, model documentation](https://www.biogearsengine.com/documentation/index.html).** Official documentation search text examined. Closed-loop model/validation approach and declared resource limits; no code integration or independent validation in this audit.

- **S10 — [PhysioNet, VitalDB 1.0.0](https://physionet.org/content/vitaldb/1.0.0/).** Opened dataset page. Real waveform reference/replay candidate; observational data cannot by itself validate counterfactual drug or fault responses. No patient records downloaded.

- **S11 — [Eleveld et al., propofol PK-PD paper, 2018](https://pure.rug.nl/ws/portalfiles/portal/57897999/Pharmacokinetic_pharmacodynamic_model.pdf).** Opened publisher-version PDF hosted by the authors institution; inspected reference values, Table 3 and limitations. Full supplementary NONMEM parity and all covariate equations remain unverified here.

- **S12 — [Rüggeberg et al., International adult fasting consensus, 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13161736/).** Opened full text; recommendations distinguish meal type and institutional policies. Used only to demonstrate missing planner scope, not to issue individual fasting instructions.

- **S13 — [BodyParts3D official license page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html).** Opened page, updated 2025-02-27; it states CC BY 4.0. Local legacy-header/BY-SA handling is disclosed. This verifies provenance/licensing context, not anatomical fitness for every procedure.

- **S14 — [Anesoft official license catalog](https://anesoft.com/?post_type=product).** Opened current catalog: individual $99/$198 and departmental $999/$1,998, labeled through Jan 2028. Vendor-listed dollar prices, not quotes or evidence of comparable efficacy.

- **S15 — [Anesoft terms/service description](https://anesoft.com/terms/).** Official search text: regular 40 self-study cases and Pro additional 40 evaluation cases plus logs/CME offering. Describes vendor claims; no paid account or hands-on comparison.

- **S16 — [Open Sim Lab, educator page](https://opensimlab.com/for-educators).** Opened current educator page. Vendor/project self-description of free browser use, assignment/replay and absent clinician approval; useful comparison of transparency, not validated clinical superiority.

- **S17 — [University of Florida Virtual Anesthesia Machine archive](https://tr.anest.ufl.edu/index.html).** Official archived page, updated 2016. Historical transparent-reality precedent and legacy Shockwave limitation; not represented as a tested modern browser competitor.

- **S18 — [CAE HPS official product page](https://www.caehealthcare.com/patient-simulation/hps/).** Official product search text: integrated physical anesthesia/gas and physiological training capabilities. No current public price verified and no hands-on quality comparison.

- **S19 — [Dräger Atlan instructions for use](https://www.draeger.com/Content/Documents/Content/atlan-a300-a300-xl-a350-a350-xl-ifu-9056001-en.pdf).** Search-extracted manufacturer section 17.3.3 describes fresh-gas decoupling and bag routing. Full PDF fetch failed because it exceeded the web tool size limit. Do not treat as a complete IFU review.

- **S20 — [ASA, Standards for Basic Anesthetic Monitoring](https://www.asahq.org/standards-and-practice-parameters/standards-for-basic-anesthetic-monitoring).** Search-extracted ASA-hosted content (October 2025 amendment) supports separating oxygenation, ventilation, circulation and temperature. Not used to assert that a teaching app must be a bedside monitor.

- **S21 — [Kleijn et al., population PK-PD analysis of sugammadex reversal, 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3175511/).** Opened original modeling study. Describes plasma capture and concentration-gradient redistribution; used to check the mechanism explanation, not to validate this app or supply an individual dose.

## Reproduce and inspect the evidence

Run from the repository root:

```powershell
npm run sanity
npm run build
npx esbuild audit/2026-11-27/probes.ts --bundle --platform=node --format=esm --packages=external --outfile=node_modules/.cache/audit-probes.mjs --log-level=warning
node node_modules/.cache/audit-probes.mjs
```

The probes intentionally reproduce model failures and therefore do not use passing clinical assertions. Their process exit status only means the probe script ran. The JSON records observed outputs. The ordinary sanity suite passing is compatible with these failures because it checks different behavior.

Files in this audit folder: `REPORT.md` (complete analysis), `REPORT.html` (reading edition with historical image appendix), `findings.csv` (prioritized implementation backlog), `probe-results.json`, `probes.ts`, `dependency-audit.json`, `inventory.csv`, `asset-summary.json`, `validation-record.json` and `manifest.json`. `build_report.py` regenerates the report and snapshot inventory; review results against the recorded source hashes if the application changes.
