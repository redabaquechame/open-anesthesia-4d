# Open Anesthesia 4D: coverage, gaps and roadmap

Status on 2026-11-27. This file records what the app teaches today, measured against official training programmes. It also lists what is still missing and what is planned next.

The rule behind every line below is the one in `CLAUDE.md`. A number is shown in the app only if it has an entry in `src/standards/claimRegistry.ts`. An entry is marked `sourced` only if someone opened the source.

## 1. Programmes the coverage map is measured against

All eight documents were opened. They are listed in `src/standards/curriculum.ts` and shown in the app's **Programme / Curriculum** drawer.

| Region | Document | Notes |
|---|---|---|
| Europe | UEMS/EBA European Training Requirements in Anaesthesiology, 2022 update | The EDAIC exam follows it |
| France | Arrêté du 21 avril 2017 (maquette du DES Anesthésie-Réanimation) | Later amendments not checked |
| Canada | Royal College Anesthesiology Competencies (CBD) 2017, revised 2021 | Reproduction not allowed, so domains are summarised in our own words |
| Morocco | SMAAR / Collège Marocain, Référentiel de compétences (jalons), 2023 | No national DES programme is published; this is the closest official framework |
| Senegal (francophone Africa) | UCAD Dakar, maquette du DES | 8 semesters |
| UK | RCoA 2021 CCT curriculum | Read via the web archive |
| USA | ABA BASIC and ADVANCED blueprints | |
| International | WHO–WFSA International Standards for a Safe Practice of Anesthesia (2018) | |

## 2. Coverage today (27 domains)

**Covered (2):** anaesthesia machine and physics (M1, M3); crises and complications (M1, M9).

**Partial (15):**
- **Physiology:** respiratory mechanics, volatile kinetics, P-V loops and one-lung ventilation are in. Renal, hepatic, acid–base and thermoregulation are missing.
- **Anatomy:** real BodyParts3D models of the supraclavicular region, spine and bronchi. The upper airway and other block sites are missing.
- **Pharmacology:** volatiles, propofol/remifentanil TCI and rocuronium/sugammadex are in. Opioids, ketamine, dexmedetomidine, local anaesthetics, vasopressors, antiemetics and anticoagulants are missing.
- **Monitoring:** capnography, EEG, TOF/PTC and P-V loops are in. ECG, invasive arterial pressure and cardiac output monitors are missing.
- **Pre-op (M10):** ASA, RCRI, STOP-Bang, Apfel, ARISCAT, fasting and GLP-1 agonists are in. Anticoagulants, frailty, anaemia and difficult-airway prediction are missing.
- **General anaesthesia:** emergence and the recovery room are missing.
- **Airway:** bronchoscopy, double-lumen tubes and DAS 2025 CICO are in. 3D laryngoscopy, videolaryngoscopy and extubation are missing.
- **Regional:** supraclavicular block, epidural and LAST are in. Spinal, lower-limb and truncal blocks are missing.
- **POCUS:** lung, cardiac and gastric ultrasound are missing.
- **Resuscitation:** VF arrest is in. Trauma and transfer are missing.
- **Fluids:** massive bleeding is in. Fluid strategy and viscoelastic tests are missing.
- **Cardiothoracic:** cardiopulmonary bypass is missing.
- **Non-technical skills, safety and education:** partial.

**Gap (10):** sedation, postoperative care and acute pain, chronic pain, intensive care, obstetrics, paediatrics, neuroanaesthesia, other specialties (ambulatory and geriatric), organ disease, ethics and medico-legal.

## 3. What was added in this round

- **M9 Crisis management.** Six timed scenarios, each with sourced steps and doses, traps, a weight-based dose calculator, a "blind case" mode and a debrief:
  - **LAST:** ASRA checklist 2020 v1.1, PDF opened.
  - **Malignant hyperthermia:** Association of Anaesthetists QRH 3-8 v.2. The EMHG 2024 differences are stated.
  - **Anaphylaxis grade III:** Garvey et al. BJA 2019 and QRH 3-1 v.5.
  - **Unanticipated difficult intubation to CICO:** DAS 2025, paraphrased; figures not reproduced.
  - **VF cardiac arrest:** RCUK 2025 ALS, which adapts ERC 2025. Three shocks are counted before ROSC.
  - **Massive peri-operative bleeding:** ESAIC 2023.
- **M10 Pre-operative assessment.** Three graded cases, five risk scores with their bands, and a fasting planner for adults and children with GLP-1 guidance.
- **Programme drawer.** Eight official programmes, 27 domains and an honest coverage rating for each. It opens on the user's region by default.
- **`npm run sanity`.** It now checks:
  - every crisis step has a claim and an evidence entry;
  - the guideline sequence leads to a better state than doing nothing;
  - dose arithmetic: lipid, dantrolene range, caps;
  - three shocks are needed to reach ROSC;
  - M10 risk tables have no gaps and the answer keys are valid.

## 3b. M11 Official curriculum and library (this round)

- **Five official programmes, in French, with checkable items (302) and saved progress, a printable portfolio and a JSON export:**
  - **Maroc:** SMAAR/MBACC « Jalons » 2023 (20 jalons × 5 phases, paraphrased: SMAAR forbids reproduction). Residency length 4 years from décret 2-92-182, art. 2. No published *plan d'études* (arrêté conjoint) was found.
  - **France:** DES d'anesthésie-réanimation, arrêté du 21 avril 2017 (JORF 20/12/2017), with the 3 March 2022 and 5 June 2026 amendments (paediatric stage and minimum case numbers, consolidation in two semesters, from 1 September 2026).
  - **Canada:** Royal College CBD (Competencies 2017/2021, Training Experiences 2022 v4.0) and the five CanNASC certification simulations. The EPA guide forbids sharing, so the EPA list is **not** reproduced: our own labels plus a link.
  - **Québec:** Université de Montréal DES (R1–R5 rotations). Laval, Sherbrooke (image only) and McGill are linked.
  - **Europe:** UEMS/EBA ETR 2022 (17 domains, A–D levels) and EDAIC 2025 (French available for Part I and the online Part II).
- **Library of 88 opened documents** (Maroc 16, France 33, Canada 13, Europe 20, other 6), searchable and filterable. Every quoted number is a claim `m11-<id>` (67 resources), and documents that were not opened cannot carry numbers (sanity check).
- **Local context in M9.** 13 notes across the six crises, for example: dantrolene and 20 % lipid emulsion listed as unavailable in Morocco (SMAR 2016); SFAR dantrolene stock and lipid bag rules; CAFG ≤ 3 attempts; Moroccan massive transfusion protocol.
- **French by default.** Every evidence entry and claim has a French translation; Arabic (ar-MA) now shows French clinical text instead of English.
- **Permissions worth asking for** (to quote rather than paraphrase): SMAAR (written consent required), Royal College (EPA guide), UEMS (ETR). SFAR has no open licence; HAS-labelled guidelines are reusable with attribution.

## 4. Sources still to open (flags kept in the registry)

| Item | Why it is flagged | What to do |
|---|---|---|
| Hopkins PM et al. *Anaesthesia* 2021 (MH guideline) | Wiley bot check; abstract only | Open in a browser; compare with the QRH 3-8 regimen |
| ERC 2025 ALS and Special Circumstances chapters | Journal bot check; abstracts only | Check the RCUK-based arrest steps against the ERC text |
| RCUK 2025 BLS and Special circumstances pages | Only a model summary was read (`m9-arrest-cpr` is `from-memory`) | Read the pages directly |
| Canet 2010 ARISCAT table | Points come from a secondary table (`m10-ariscat` is `from-memory`) | Check Table 4 of the paper |
| ASA physical status 2026 statement | The redirect target refused automated access | Read the statement |
| Gan 2020 PONV consensus | Number of prophylactic agents per risk level not verified, so not shown | Read the guideline |
| Légifrance consolidated maquette | Cloudflare bot check; arrêtés read from JORF PDF copies (universities, FHF) | Confirm on legifrance.gouv.fr |
| SOGC 431 French version, CMQ specialist-certificate regulation, Sherbrooke rotation table | Not opened (403 or image only) | Open and add |
| Canadian Blood Services ch. 11 | Only a fetch summary (`m11-ca-cbs-massive` is `from-memory`) | Read the page |
| ESAIC preop 2025, RA & antithrombotics 2022, NMB children 2026 | Full text closed; abstract only (no hour intervals quoted) | Read the full texts |
| Items already listed in `CLAUDE.md` | GWP set, tissue partitions, Eleveld covariates, Schnider/Minto/Marsh/Al-Sallami, PTC spacing, DLT sizes, 2 Hz filter, drug prices | Unchanged |

## 5. Leads from the external research brief (checked 2026-11-26)

A research brief generated by another AI tool was pasted into the session. Each lead was then opened at the primary source where possible. Only what was read is used in the app.

| Lead | Result | Used in the app |
|---|---|---|
| VitalDB (PhysioNet) | **Verified.** 6,388 non-cardiac surgical cases, Seoul National University Hospital 2016–2017. CC BY 4.0, open access, no data-use agreement. Tracks include ECG II (500 Hz), ART (500 Hz), PLETH (500 Hz), CO₂ (62.5 Hz) and AWP | Not yet. Next step: replay a real case in the M9 monitor and the M1 screen, with attribution (DOI 10.13026/czw8-9p62) |
| Moroccan antidote survey (Eljaoudi, EJHP 2021, PMC10176993) | **Verified with corrections.** Dantrolene in 3 of 17 hospitals, listed for neuroleptic malignant syndrome; lipid emulsion and sugammadex were not surveyed | Yes: M11 resource `ma-antidotes-2021` and the Moroccan note in the M9 malignant hyperthermia crisis |
| WOMAN trial, WHO TXA 2017 | **Verified.** 1 g IV at 1 mL/min, second dose if bleeding continues after 30 min or restarts within 24 h; within 3 h is a WHO recommendation and a WOMAN subgroup finding | Yes: PPH tranexamic acid step and claim `m9-pph-txa` |
| WHO MCPC 2017 (eclampsia) | **Verified.** Box S-4, Box S-5, Table S-13 read in full. The brief's "4–6 g / 1–2 g/h" is not the WHO eclampsia regimen | Yes: new M9 eclampsia crisis |
| PyTCI, tivatci | **Verified MIT licences.** tivatci ships a Schnider reference run (`result.csv`) | Not yet: add a parity test in `npm run sanity` (library output, not an independent reference) |
| STOP-Bang 43 / 41 cm | **Corrected.** stopbang.ca uses 40 cm for both sexes; 43/41 cm is a UHN-licensed variant | Note on `m10-stopbang`; the app keeps 40 cm |
| Gan 2020 PONV agent counts | **Not verified** (closed access). Only a secondary summary was read | Note on `m10-apfel`; not shown in the score |
| ARISCAT Table 4 | **Not verified** (closed access). Second secondary table writes Hb < 10 g/dL | Note on `m10-ariscat`; stays `from-memory` |
| CapnoBase | Not checked | — |
| IEC 60601-1-8, MDCG 2019-11, FDA CDS guidance | Not checked (paid or needs regulatory review) | — |
| Licence hygiene | Applied | Third-party text is paraphrased; WHO MCPC (CC BY-NC-SA) and EJHP (no commercial reuse) are quoted as facts only |

## 6. Proposed next modules (by curriculum gap, most-listed first)

1. **Obstetric anaesthesia.** Labour epidural, spinal for caesarean, postpartum haemorrhage and pre-eclampsia (6 programmes list it). Sources are now in the library and opened: SMAR HPP protocol and pre-eclampsia document (Maroc), CNGOF/SFAR HPP 2014, SFAR labour analgesia 2025 and haemodynamics 2024 (France), SOGC 431 and CAS 2026 (Canada), ESAIC failing epidural 2025. M9 now has postpartum haemorrhage (SOGC 431, SMAR, CNGOF/SFAR) and eclampsia (WHO MCPC 2017). Next: labour epidural and spinal for caesarean.
2. **Paediatric anaesthesia.** Weight-based dosing across ages, airway sizes, fasting (already in M10), and paediatric ALS/ERC.
3. **Intensive care.** ICU ventilation (ARDS), sepsis and organ support (6 programmes).
4. **Postoperative care and acute pain.** Recovery room criteria, multimodal analgesia, PONV prophylaxis once Gan 2020 is verified.
5. **Pharmacology library.** One sourced card per drug: label (SmPC/FDA) dose, onset, offset and interactions.
6. **Airway 3D.** Laryngoscopy and videolaryngoscopy views on the existing anatomy pipeline, plus extubation (DAS 2011).
7. **Neuro, cardiac bypass, sedation, chronic pain.**
8. **Arabic (ar-MA) content.** Clinical text now falls back to French. A full Arabic translation needs a Moroccan clinician reviewer.

## 7. Before calling any of this "medical grade"

The app is an educational simulator, not a medical device, and the banner says so. To be trusted by residents and teachers it still needs:

- **Named clinician review.** Every claim needs a reviewer, recorded in `reviewedBy`. The checklists to sign are in `docs/clinical-review/`.
- **Local governance.** Each crisis card must say "follow your institution's protocol" (it does today). Regional variants (SFAR, CAS/CAFG, SMAAR) are shown as "local context" in each M9 crisis; extend them as new scenarios are added.
- **Release discipline.** Releases are versioned, every change goes to the change log, and the "Report an error" GitHub link must stay working.
