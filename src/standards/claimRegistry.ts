/**
 * Clinical claim registry — the single source of truth for "how far can this be trusted?"
 *
 * Every clinical number or statement the app shows should appear here with one of three statuses:
 *  - sourced      : checked against a primary source that was actually opened (see `source`)
 *  - from-memory  : standard textbook/label knowledge entered without opening the source this time
 *  - illustrative : a simulator shape chosen to make a mechanism visible — not measured data
 *
 * The in-app review chips and `npm run review:docs` (docs/clinical-review/*.md) are generated
 * from this list. When a clinician checks a claim, fill `reviewedBy` and (if confirmed) set the
 * status to `sourced` with the source they used. Never upgrade a status without a real source.
 */

export type ClaimStatus = 'sourced' | 'from-memory' | 'illustrative';
export type ClaimModule = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8';

export interface ClinicalClaim {
  id: string;
  module: ClaimModule;
  /** Plain-language statement as a reviewer should check it */
  claim: string;
  /** The number or setting the app uses, if any */
  value?: string;
  /** File where the value lives */
  location: string;
  status: ClaimStatus;
  /** Citation / DOI / standard, required for `sourced` */
  source?: string;
  /** Id in src/evidence/evidenceRegistry.ts when the source is shown in the Evidence drawer */
  evidenceId?: string;
  /** Why it is still unverified, or what a reviewer should look at */
  note?: string;
  /** Name / role of the clinician who checked it (empty until reviewed) */
  reviewedBy?: string;
}

const K = 'src/physics/circuitLungKernel.ts';
const CL = 'src/standards/checklists.ts';
const CS = 'src/standards/clinicalStandards.ts';
const VK = 'src/physics/volatileKineticsKernel.ts';
const AK = 'src/physics/aivocEegKernel.ts';
const M5 = 'src/modules/m5-nmj-tof/NmjTofModule.tsx';
const M6 = 'src/modules/m6-ultrasound-cardiac/UltrasoundCardiacModule.tsx';
const M7 = 'src/modules/m7-neuraxial-spine/NeuraxialSpineModule.tsx';
const M8 = 'src/modules/m8-bronchoscopy-dlt/BronchoscopyDltModule.tsx';
const DLT = 'src/modules/m8-bronchoscopy-dlt/dltModel.ts';

export const CLAIMS: ClinicalClaim[] = [
  // ---------------------------------------------------------------- M1 — workstation
  { id: 'm1-eom', module: 'M1', claim: 'Airway pressure = PEEP + V/C + R·flow (equation of motion).', location: K, status: 'sourced', source: 'Hess DR. Respir Care 2014;59:1773-94. doi:10.4187/respcare.03410', evidenceId: 'equation-of-motion' },
  { id: 'm1-two-compartment', module: 'M1', claim: 'Lungs modelled as two parallel compartments (C/2 each; second resistance raised by bronchospasm heterogeneity).', location: K, status: 'illustrative', note: 'Simulator model structure, not a published parameter set.' },
  { id: 'm1-bellows-fgf', module: 'M1', claim: 'With bellows ventilators fresh gas adds to delivered tidal volume; piston with fresh-gas decoupling does not.', location: K, status: 'sourced', source: 'Jain RK, Swaminathan S. Indian J Anaesth 2013;57:525-32. doi:10.4103/0019-5049.120150', evidenceId: 'anaesthesia-ventilators' },
  { id: 'm1-ascending-disconnect', module: 'M1', claim: 'Ascending (standing) bellows collapse on disconnection; descending (hanging) bellows keep refilling and hide it.', location: K, status: 'sourced', source: 'Jain & Swaminathan 2013 (as above)', evidenceId: 'anaesthesia-ventilators' },
  { id: 'm1-flush-flow', module: 'M1', claim: 'O2 flush delivers about 35–75 L/min; the simulator uses 45 L/min.', value: '45 L/min', location: K, status: 'from-memory', note: 'Check against ISO 80601-2-13 / machine manuals.' },
  { id: 'm1-concentrator-argon', module: 'M1', claim: 'Concentrator O2 is ~95% O2 with ~4.5% argon; argon accumulates in a low-flow circle.', value: '0.95 / 0.045', location: K, status: 'sourced', source: 'Parker CJ, Snowdon SL. Br J Anaesth 1988;61:397-402. doi:10.1093/bja/61.4.397', evidenceId: 'argon-concentrator', note: 'Exact percentages vary by concentrator model.' },
  { id: 'm1-dead-space', module: 'M1', claim: 'Anatomical dead space about 150 mL in an adult.', value: '150 mL', location: K, status: 'from-memory' },
  { id: 'm1-co2-store', module: 'M1', claim: 'PaCO2 rises roughly 8–9 mmHg in the first minute of apnoea, then slower (lumped CO2 store).', value: '20 L store', location: K, status: 'illustrative', note: 'Tuned to textbook apnoea rise; not a published compartment value.' },
  { id: 'm1-low-fio2-alarm', module: 'M1', claim: 'Low inspired O2 alarm threshold.', value: '25%', location: K, status: 'from-memory', note: 'Alarm defaults differ between machines.' },
  { id: 'm1-high-fico2-alarm', module: 'M1', claim: 'Inspired CO2 above ~3 mmHg suggests rebreathing (exhausted absorbent, stuck valve).', value: '3 mmHg', location: K, status: 'from-memory' },
  { id: 'm1-sfar-reserve', module: 'M1', claim: 'SFAR checkout: replace the reserve O2 cylinder when content ≤ 150 L.', value: '150 L', location: CL, status: 'from-memory', note: 'From the original Pack text; not yet checked against the current SFAR document.' },
  { id: 'm1-leak-test', module: 'M1', claim: 'Fresh-gas leak ≤ 50 mL/min at 30 cmH2O (pasted as ISO 5358).', value: '50 mL/min @ 30 cmH2O', location: CL, status: 'from-memory', note: 'ISO 5358 was superseded by ISO 80601-2-13; check the current requirement.' },
  { id: 'm1-alarm-mix', module: 'M1', claim: 'Low-O2 alarm test with O2 2 L/min + N2O 4 L/min (≈ 33% O2) should trigger a 40% alarm.', location: CL, status: 'from-memory', note: 'Check against the SFAR checkout text.' },
  { id: 'm1-asa-2008', module: 'M1', claim: 'ASA 2008 Recommendations for Pre-Anesthesia Checkout Procedures (15 items).', location: CL, status: 'from-memory', note: 'Item wording paraphrased; compare against the ASA 2008 document.' },
  { id: 'm1-gas-colours', module: 'M1', claim: 'Medical gas colours: ISO 32 (O2 white), NFPA/CGA (O2 green), CSA Z7396.1.', location: CS, status: 'from-memory', note: 'Scavenging (WAGD/AGSS) colours are flagged unverified in the code.' },
  { id: 'm1-mapleson', module: 'M1', claim: 'Mapleson efficiency: spontaneous A > D/E/F > C > B; controlled D/E/F > B > C > A.', location: CL, status: 'sourced', source: 'Kaul TK, Mittal G. Indian J Anaesth 2013;57:507-15. doi:10.4103/0019-5049.120148', evidenceId: 'mapleson-systems' },

  // ---------------------------------------------------------------- M2 — capnography
  { id: 'm2-capno-shapes', module: 'M2', claim: 'Raised capnogram baseline = rebreathing; sloped upstroke = obstructed expiration; curare cleft = spontaneous effort.', location: K, status: 'sourced', source: 'Kodali BS. Anesthesiology 2013;118:192-201. doi:10.1097/ALN.0b013e318278c8b6', evidenceId: 'capnography-waveform' },
  { id: 'm2-etco2-normal', module: 'M2', claim: 'Normal EtCO2 about 35–45 mmHg.', location: K, status: 'from-memory' },
  { id: 'm2-low-flow-fio2', module: 'M2', claim: 'At low flow, inspired O2 falls below fresh-gas O2 because the patient keeps consuming O2.', location: K, status: 'sourced', source: 'Parthasarathy S. Indian J Anaesth 2013;57:516-24. doi:10.4103/0019-5049.120149', evidenceId: 'circle-low-flow' },

  // ---------------------------------------------------------------- M3 — volatile agents
  { id: 'm3-mac', module: 'M3', claim: 'MAC (adult ~40 y, in O2): sevo 2.0, des 6.0, iso 1.15, halothane 0.75, enflurane 1.7 vol%.', location: CS, status: 'from-memory' },
  { id: 'm3-blood-gas', module: 'M3', claim: 'Blood:gas partition: sevo 0.65, des 0.45, iso 1.4, halothane 2.4, enflurane 1.9.', location: CS, status: 'from-memory' },
  { id: 'm3-svp', module: 'M3', claim: 'SVP at 20 °C: sevo 157, des 669, iso 238, halothane 243, enflurane 175 mmHg.', location: CS, status: 'from-memory' },
  { id: 'm3-tissue-partitions', module: 'M3', claim: 'Brain/muscle/fat:blood partition coefficients per agent.', location: CS, status: 'from-memory', note: 'Entered from textbook tables; flagged VOLATILE_AGENT_DATA_UNVERIFIED.' },
  { id: 'm3-liquid-data', module: 'M3', claim: 'Vapour yield per mL liquid and liquid density per agent (e.g. sevo 182 mL, 1.52 g/mL).', location: CS, status: 'from-memory' },
  { id: 'm3-iso5360-colours', module: 'M3', claim: 'Agent colour codes (ISO 5360): sevo yellow, des blue, iso purple, halothane red, enflurane orange.', location: CS, status: 'from-memory' },
  { id: 'm3-gwp-ar6', module: 'M3', claim: 'GWP100 (IPCC AR6 values): des 2590, iso 539, sevo 195, N2O 273.', location: CS, status: 'sourced', source: 'Regulation (EU) 2024/573 Annex II s.2 (anaesthetics) and Annex VI (N2O), which state the values are AR6-based', evidenceId: 'eu-fgas-2024', note: 'Read in the EU regulation; the IPCC table itself (AR6 WG1 Table 7.SM.7) refused automated access.' },
  { id: 'm3-gwp-andersen', module: 'M3', claim: 'GWP100 (Sulbaek Andersen 2012, J Phys Chem A): iso 510, des 2540, sevo 130.', location: CS, status: 'from-memory', note: 'Seen in the NASA ESPO listing of the paper; check the paper itself.' },
  { id: 'm3-eu-desflurane', module: 'M3', claim: 'EU Regulation 2024/573 Art. 13(8): desflurane prohibited from 1 Jan 2026 except where strictly required and no other anaesthetic can be used on medical grounds; the institution keeps the justification.', location: VK, status: 'sourced', source: 'Regulation (EU) 2024/573, Article 13(8) (EUR-Lex)', evidenceId: 'eu-fgas-2024' },
  { id: 'm3-misfill', module: 'M3', claim: 'Wrong liquid in a variable-bypass vaporizer: output follows the SVP/(Patm−SVP) ratio; halothane in an isoflurane vaporizer gives a similar % but more MAC.', location: VK, status: 'illustrative', note: 'Physics-derived simulator model; check against a vaporizer physics text.' },
  { id: 'm3-compartments', module: 'M3', claim: 'Uptake model: circuit, lung, heart, brain, kidney, liver, muscle, fat, poorly perfused; flows and volumes scaled with W^0.75 / W.', location: VK, status: 'illustrative', note: 'Structure and parameters are simulator choices. The output is checked against measured data: see m3-fafi-yasuda.' },
  { id: 'm3-fafi-yasuda', module: 'M3', claim: 'FA/FI after 30 min of constant inspired agent: sevoflurane 0.85, isoflurane 0.73 (volunteers). The simulator gives 0.865 and 0.731.', location: VK, status: 'sourced', source: 'Yasuda N et al. Anesth Analg 1991;72:316-24. doi:10.1213/00000539-199103000-00007', evidenceId: 'yasuda-sevo-iso', note: 'Checked automatically by npm run sanity (tolerance ±0.06).' },
  { id: 'm3-second-gas', module: 'M3', claim: 'Second-gas effect: early N2O uptake raises volatile FA/FI.', location: VK, status: 'illustrative', note: 'Direction correct; magnitude is a simulator choice.' },
  { id: 'm3-prices', module: 'M3', claim: 'Drug cost per mL in MAD/EUR/CAD/FCFA.', location: 'src/modules/m3-volatile-eco/VolatileEcoModule.tsx', status: 'illustrative', note: 'Not sourced; labelled "illustrative" in the UI.' },

  // ---------------------------------------------------------------- M4 — TCI / EEG
  { id: 'm4-marsh', module: 'M4', claim: 'Marsh propofol: V1 0.228 L/kg, k10 0.119, k12 0.112, k13 0.0419, k21 0.055, k31 0.0033 /min, ke0 0.26.', location: AK, status: 'from-memory' },
  { id: 'm4-schnider', module: 'M4', claim: 'Schnider propofol covariate equations (V1 4.27 L, V3 238 L, CL1, CL2, CL3, ke0 0.456).', location: AK, status: 'from-memory' },
  { id: 'm4-eleveld-ref', module: 'M4', claim: 'Eleveld 2018 reference individual (35 y, 170 cm, 70 kg male, no concomitant drugs): V1 6.28, V2 25.5, V3 273 L; CL 1.79, Q2 1.75, Q3 1.11 L/min; ke0 0.146 /min.', location: AK, status: 'sourced', source: 'Eleveld DJ et al. Br J Anaesth 2018;120:942-59. doi:10.1016/j.bja.2018.01.018', evidenceId: 'eleveld-propofol', note: 'Reproduced exactly by the simulator (npm run sanity).' },
  { id: 'm4-eleveld', module: 'M4', claim: 'Eleveld covariate terms: female CL 2.10 L/min, age and opioid terms, weight scaling of ke0, Ce50 3.08 µg/mL.', location: AK, status: 'from-memory', note: 'Only the abstract was readable (no free full text). Maturation terms omitted (valid from early childhood). Check against Table 2 of the paper.' },
  { id: 'm4-al-sallami', module: 'M4', claim: 'Al-Sallami fat-free mass equations used for Eleveld V3.', location: AK, status: 'from-memory', note: 'Paper found (Clin Pharmacokinet 2015;54:1169-78, doi:10.1007/s40262-015-0277-z); the abstract does not give the equations.' },
  { id: 'm4-minto', module: 'M4', claim: 'Minto remifentanil covariate equations (age, LBM).', location: AK, status: 'from-memory', note: 'The abstract gives only the simple model (V1 4.98, V2 9.01, V3 6.54 L; Cl1 2.46, Cl2 1.69, Cl3 0.065 L/min; ke0 0.516). Covariate equations need the full paper (doi:10.1097/00000542-199701000-00004).' },
  { id: 'm4-james-lbm', module: 'M4', claim: 'James lean body mass formula (fails at high BMI).', location: AK, status: 'from-memory' },
  { id: 'm4-bis-nmb', module: 'M4', claim: 'In awake volunteers given only neuromuscular block, BIS fell to values as low as 44 and 47.', value: '47', location: AK, status: 'sourced', source: 'Schuller PJ et al. Br J Anaesth 2015;115 Suppl 1:i95-i103. doi:10.1093/bja/aev072', evidenceId: 'bis-nmb-awake' },
  { id: 'm4-eeg-signatures', module: 'M4', claim: 'Propofol EEG: frontal alpha + slow/delta power; alpha weaker in the elderly; burst suppression at deep levels.', location: AK, status: 'illustrative', evidenceId: 'purdon-propofol-eeg', note: 'The frontal alpha + slow-wave pattern is described by Purdon 2013; the simulated spectrum amplitudes and the age effect are not yet calibrated.' },
  { id: 'm4-alpha-pain', module: 'M4', claim: 'Untreated nociception reduces frontal alpha ("alpha dropout").', location: AK, status: 'illustrative', note: 'Needs a primary source before being presented as fact.' },
  { id: 'm4-2hz-filter', module: 'M4', claim: 'A 2 Hz high-pass display filter hides slow waves.', location: AK, status: 'illustrative', note: 'Unverified claim from the original pack.' },
  { id: 'm4-tci-controller', module: 'M4', claim: 'Effect-site TCI controller logic.', location: AK, status: 'illustrative', note: 'Simulator controller, not a commercial pump algorithm.' },

  // ---------------------------------------------------------------- M5 — neuromuscular
  { id: 'm5-onset-sites', module: 'M5', claim: 'Rocuronium onset is faster at orbicularis oculi / corrugator supercilii than at adductor pollicis.', location: M5, status: 'sourced', source: 'Lee HJ et al. Br J Anaesth 2009;102:869-74. doi:10.1093/bja/aep064', evidenceId: 'corrugator-vs-adductor' },
  { id: 'm5-tof-09', module: 'M5', claim: 'Exclude residual block with quantitative monitoring at the adductor pollicis; continue until TOF ratio > 0.9.', value: '0.9', location: M5, status: 'sourced', source: 'Fuchs-Buder T et al. ESAIC guideline. Eur J Anaesthesiol 2023;40:82-94. doi:10.1097/EJA.0000000000001769', evidenceId: 'esaic-nmb-2023' },
  { id: 'm5-occupancy', module: 'M5', claim: 'Fade starts near ~75% receptor occupancy; twitches vanish near 90–95% (margin of safety).', location: M5, status: 'illustrative', note: 'Classic Paton & Waud teaching; mapping curves are simulator choices.' },
  { id: 'm5-sugammadex-doses', module: 'M5', claim: 'Sugammadex (adults): 4 mg/kg if recovery has reached at least 1–2 PTC; 2 mg/kg at reappearance of T2; 16 mg/kg for immediate reversal (studied 3 min after rocuronium 1.2 mg/kg). Obese: dose on actual body weight.', location: M5, status: 'sourced', source: 'EMA Bridion SmPC section 4.2 (last updated 06/11/2025)', evidenceId: 'bridion-smpc' },
  { id: 'm5-sugammadex-renal', module: 'M5', claim: 'Sugammadex not recommended in severe renal impairment, including dialysis (CrCl < 30 mL/min).', location: M5, status: 'sourced', source: 'EMA Bridion SmPC sections 4.2 and 4.4', evidenceId: 'bridion-smpc' },
  { id: 'm5-ptc-spacing', module: 'M5', claim: 'Tetanic stimulation potentiates later responses; the simulator spaces PTCs by 6 minutes.', value: '6 min', location: M5, status: 'from-memory', note: 'Interval unverified; guidance varies.' },
  { id: 'm5-recurarization', module: 'M5', claim: 'Under-dosed sugammadex (e.g. a fixed 200 mg vial in a large patient with deep block) can allow recurarisation.', location: M5, status: 'illustrative', note: 'Kinetic constants are simulator choices.' },

  // ---------------------------------------------------------------- M6 — ultrasound / cardiac
  { id: 'm6-sono-anatomy', module: 'M6', claim: 'Supraclavicular view: subclavian artery, plexus lateral/superficial, first rib and pleura deep.', location: 'src/modules/m6-ultrasound-cardiac/SonoLab.tsx', status: 'illustrative', note: 'Clavicle, ribs, subclavian artery and vein are real BodyParts3D meshes; the plexus trunks, their position and the pleural dome are schematic (not in the archive).' },
  { id: 'm6-anatomy-meshes', module: 'M6', claim: 'Bone and vessel shapes come from the BodyParts3D adult male model (right side).', location: 'public/models/anatomy/LICENSE.md', status: 'sourced', source: 'Mitsuhashi N et al. Nucleic Acids Res 2009;37:D782-5. doi:10.1093/nar/gkn613', evidenceId: 'bodyparts3d', note: 'One adult male body: real patients differ in size and position.' },
  { id: 'm6-us-physics', module: 'M6', claim: 'The B-mode image is computed: reflection R = ((Z2 − Z1)/(Z2 + Z1))² at each interface, attenuation in dB/cm/MHz, speckle, time-gain compensation, log compression. Bone shadow, pleural line, A-lines and enhancement behind vessels come out of these rules.', location: 'src/modules/m6-ultrasound-cardiac/ultrasoundSim.ts', status: 'illustrative', note: 'Simulator model. Impedance, attenuation and scatter values are typical textbook figures entered from memory; the A-line and strong-reflector rules are simplifications.' },
  { id: 'm6-anisotropy', module: 'M6', claim: 'The needle is bright only when close to perpendicular to the beam; probe tilt makes it vanish.', location: 'src/modules/m6-ultrasound-cardiac/ultrasoundSim.ts', status: 'illustrative', note: 'Simulator model: brightness falls with exp(−(angle/32°)²) and with distance from a ~1.4 mm slice; both constants are illustrative.' },
  { id: 'm6-vein-compress', module: 'M6', claim: 'Veins compress under probe pressure; arteries stay round and pulsatile.', location: M6, status: 'from-memory' },
  { id: 'm6-last-lipid', module: 'M6', claim: 'LAST: 20% lipid emulsion. Over 70 kg: bolus ~100 mL over 2–3 min, infuse ~250 mL over 15–20 min. Under 70 kg: bolus ~1.5 mL/kg over 2–3 min, infuse ~0.25 mL/kg/min. Unstable: repeat bolus, double infusion. Max 12 mL/kg. Epinephrine < 1 mcg/kg; avoid vasopressin, beta-blockers, calcium-channel blockers, local anaesthetics.', location: M6, status: 'sourced', source: 'ASRA LAST checklist 2020 v1.1 (Neal, Neal, Weinberg; RAPM 2021;46:81-82)', evidenceId: 'asra-last-2020', note: 'ASRA says the checklist is under review, update expected early 2027. Earlier text said 200–250 mL and ideal body weight; corrected to the checklist wording.' },
  { id: 'm6-pv-loops', module: 'M6', claim: 'Pressure–volume loops for normal, AS, AR, MS, MR are computed by a time-varying elastance ventricle, orifice valves and a 3-element Windkessel.', location: 'src/physics/cardiovascularKernel.ts', status: 'illustrative', note: 'Simulator model. The concepts are sourced (Suga 1973 elastance; Westerhof 2009 Windkessel); the parameter values (Ees 3.0, valve areas, R, C) are tuned by hand to typical adult values and are not from those papers.', evidenceId: 'suga-elastance' },
  { id: 'm6-elastance-concept', module: 'M6', claim: 'The end-systolic pressure–volume ratio (elastance) is largely load-independent and rises with inotropy.', location: 'src/physics/cardiovascularKernel.ts', status: 'sourced', source: 'Suga H, Sagawa K, Shoukas AA. Circ Res 1973;32:314-22. doi:10.1161/01.res.32.3.314', evidenceId: 'suga-elastance', note: 'Canine study; abstract not available on PubMed, claim based on the title. Full text should be checked by a reviewer.' },
  { id: 'm6-windkessel', module: 'M6', claim: 'Afterload modelled as a 3-element Windkessel (characteristic impedance + peripheral resistance + compliance).', location: 'src/physics/cardiovascularKernel.ts', status: 'sourced', source: 'Westerhof N, Lankhaar JW, Westerhof BE. Med Biol Eng Comput 2009;47:131-41. doi:10.1007/s11517-008-0359-2', evidenceId: 'westerhof-windkessel' },
  { id: 'm6-shock-matrix', module: 'M6', claim: 'First-line agents by shock type (anaphylaxis: adrenaline; septic: fluids + noradrenaline, add vasopressin; haemorrhage: stop bleeding + blood).', location: M6, status: 'from-memory', note: 'Check against Surviving Sepsis 2021 and anaphylaxis guidelines.' },

  // ---------------------------------------------------------------- M7 — neuraxial
  { id: 'm7-anatomy-meshes', module: 'M7', claim: 'Vertebrae T4–T9, L2–L5, sacrum and discs are real BodyParts3D meshes; bone contact is found by ray-casting the needle against them.', location: 'src/modules/m7-neuraxial-spine/spineGeometry.ts', status: 'sourced', source: 'Mitsuhashi N et al. Nucleic Acids Res 2009;37:D782-5. doi:10.1093/nar/gkn613', evidenceId: 'bodyparts3d', note: 'One adult male in standing posture; the spinal canal is measured from these bones.' },
  { id: 'm7-shingling', module: 'M7', claim: 'Mid-thoracic spinous processes slope steeply downward (a perpendicular midline needle meets bone); lumbar ones are nearly horizontal.', location: 'src/modules/m7-neuraxial-spine/spineGeometry.ts', status: 'from-memory', note: 'Emerges from the real meshes and is checked by npm run sanity (3/3 thoracic interspaces); the teaching statement itself still needs a textbook reference.' },
  { id: 'm7-paramedian', module: 'M7', claim: 'Paramedian approach: entry ~1 cm lateral (lumbar ~1 cm caudal), ~12° medial, touch the lamina then walk off its upper edge into the ligamentum flavum.', location: 'src/modules/m7-neuraxial-spine/spineRegions.ts', status: 'from-memory' },
  { id: 'm7-depths', module: 'M7', claim: 'Skin-to-epidural depth is computed along the needle; with 15 mm of soft tissue over the spinous processes the default L3–L4 path reaches the epidural space at ~44 mm. Reference: median 4.7 cm (L3–4: 4.93 cm) in 1000 parturients.', location: 'src/modules/m7-neuraxial-spine/spineGeometry.ts', status: 'sourced', source: 'Harrison GR, Clowes NW. Anaesthesia 1985;40:685-7. doi:10.1111/j.1365-2044.1985.tb10953.x', evidenceId: 'harrison-epidural-depth', note: 'The published value is for comparison; the simulated depth depends on the soft-tissue slider and the model anatomy.' },
  { id: 'm7-soft-tissue-dims', module: 'M7', claim: 'Soft tissues placed from the measured canal: flavum 4 mm (lumbar) / 2.5 mm (thoracic), dorsal epidural space 5 / 3 mm, dural sac half-width 8 / 7 mm, cord 9 × 7 mm.', location: 'src/modules/m7-neuraxial-spine/spineRegions.ts', status: 'illustrative', note: 'VERIFY against MRI/cadaver measurements. Not in the anatomy archive.' },
  { id: 'm7-flexion', module: 'M7', claim: 'Flexion adds up to 6° per lumbar and 2° per thoracic motion segment, rotating each vertebra about its disc; this opens the interlaminar windows.', location: 'src/modules/m7-neuraxial-spine/spineRegions.ts', status: 'illustrative', note: 'Rotation centre and ranges are simplifications.' },
  { id: 'm7-lor', module: 'M7', claim: 'Loss of resistance on entering the epidural space after the ligamentum flavum; syringe resistances shown are relative (0–100).', location: 'src/modules/m7-neuraxial-spine/spineGeometry.ts', status: 'from-memory', note: 'Resistance numbers are illustrative.' },
  { id: 'm7-fluoro', module: 'M7', claim: 'C-arm image = Beer–Lambert projection (I = exp(−Σ μ·L)) of the same meshes from a point source 0.6 m away; dense = dark.', location: 'src/modules/m7-neuraxial-spine/fluoroView.ts', status: 'illustrative', note: 'Simulator model; attenuation coefficients are illustrative, not calibrated to a tube voltage.' },

  // ---------------------------------------------------------------- M8 — airway / DLT
  { id: 'm8-bronchus-lengths', module: 'M8', claim: 'Main bronchus length: male 49 ± 8 mm left / 19 ± 6 mm right; female 44 ± 7 / 15 ± 5 mm. Used as the "Average male / female" anatomy (the 3D path is rescaled to these lengths). "Short left main bronchus" uses 38 mm.', value: '49 / 19 mm (male)', location: DLT, status: 'sourced', source: 'Benumof JL et al. Anesthesiology 1987;67:729-38. doi:10.1097/00000542-198711000-00018', evidenceId: 'benumof-dlt-margin', note: 'The 38 mm "short" variant is a teaching choice below the 40 mm threshold of Yao 2019.' },
  { id: 'm8-margin', module: 'M8', claim: 'Left-DLT margin of safety = left main bronchus length − 30 mm (proximal left cuff → left lumen tip); average 16–19 mm.', value: '30 mm', location: DLT, status: 'sourced', source: 'Benumof JL et al. Anesthesiology 1987;67:729-38. doi:10.1097/00000542-198711000-00018', evidenceId: 'benumof-dlt-margin' },
  { id: 'm8-dlt-depth', module: 'M8', claim: 'Average left DLT depth 29 cm at 170 cm height; ±1 cm for each 10 cm of height, with the top of the bronchial cuff just below the carina. The simulator places the cuff top 5 mm below the carina at that depth.', value: '29 cm', location: DLT, status: 'sourced', source: 'Brodsky JB et al. Anesth Analg 1991;73:570-2. doi:10.1213/00000539-199111000-00010', evidenceId: 'brodsky-dlt-depth', note: 'The 5 mm offset used to calibrate incisor-to-carina distance is a simulator choice.' },
  { id: 'm8-roll-shift', module: 'M8', claim: 'Turning supine → lateral pulls the DLT back by 6.3 ± 5.5 mm (tracheal opening ↔ carina; 2.4 ± 3.6 mm bronchial side); > 5 mm in 48 %. Default migration 6.3 mm, adjustable 0–20 mm.', value: '6.3 mm', location: M8, status: 'sourced', source: 'Yoon TG et al. Can J Anaesth 2005;52:413-7. doi:10.1007/BF03016286', evidenceId: 'yoon-dlt-displacement', note: 'The simulator moves the whole tube rigidly by the tracheal-side value.' },
  { id: 'm8-short-lmb', module: 'M8', claim: 'Left main bronchus < 40 mm is associated with desaturation during one-lung ventilation (OR 8.087).', location: M8, status: 'sourced', source: 'Yao HY et al. Braz J Anesthesiol 2019;69:390-5. doi:10.1016/j.bjan.2019.03.012', evidenceId: 'yao-lmb-desaturation' },
  { id: 'm8-left-preferred', module: 'M8', claim: 'Left-sided DLTs are preferred because they have a much wider margin of safety than right-sided tubes (right upper lobe origin close to the carina).', location: M8, status: 'sourced', source: 'Benumof JL et al. Anesthesiology 1987;67:729-38. doi:10.1097/00000542-198711000-00018', evidenceId: 'benumof-dlt-margin' },
  { id: 'm8-severinghaus', module: 'M8', claim: 'SaO2 from PaO2: S = 1 / (23400 / (PO2³ + 150·PO2) + 1).', location: DLT, status: 'sourced', source: 'Severinghaus JW. J Appl Physiol 1979;46:599-602. doi:10.1152/jappl.1979.46.3.599', evidenceId: 'severinghaus-odc' },
  { id: 'm8-gas-exchange', module: 'M8', claim: 'PaO2 = alveolar gas equation (PB 760, PH2O 47, PaCO2 40, R 0.8) + shunt mixing: CaO2 = Cc′O2 − Qs/Qt · VO2/Qt, with Hb 13.5 g/dL, VO2 250 mL/min, Qt 5 L/min, baseline shunt 5 %.', location: DLT, status: 'illustrative', note: 'Simulator model built from textbook equations; Hb, VO2, Qt and the 5 % baseline shunt are fixed illustrative values.' },
  { id: 'm8-perfusion', module: 'M8', claim: 'Lobar perfusion ∝ lobe size; lateral position weights the dependent lung 1.4× and the upper lung 0.75×; HPV removes up to 80 % of the flow to an unventilated lobe (slider 0–100 %).', location: DLT, status: 'illustrative', note: 'Direction of the effects is textbook (Lumb & Slinger 2015, doi:10.1097/ALN.0000000000000569); the weights are not measured values.' },
  { id: 'm8-lobe-share', module: 'M8', claim: 'Lobe sizes = convex-hull volume of each lobe\'s segmental bronchial tree in the 3D specimen (RUL 13 %, RML 8 %, RLL 28 %, LUL 23 %, LLL 28 %).', location: 'scripts/anatomy/build-airway-map.ts', status: 'illustrative', note: 'Derived from one specimen\'s airways, not lung volumes.' },
  { id: 'm8-mechanics', module: 'M8', claim: 'Volume control, square flow, I:E 1:2: Pplat = PEEP + Vt / C (C 50 mL/cmH2O for both lungs, shared by ventilated lobes); Ppeak adds the lumen pressure drop (max of Poiseuille and Blasius) and an airway resistance of 5 cmH2O/L/s ÷ patency²; pressure limit 60 cmH2O.', location: DLT, status: 'illustrative', note: 'Compliance, resistance and lumen length (0.38 m) are illustrative.' },
  { id: 'm8-cuff', module: 'M8', claim: 'Bronchial cuff: 15 mm sleeve, V = π/4 (D² − d0²) L; seals when its free diameter reaches the bronchus; pressure rises 1 cmH2O per 0.04 mL beyond contact; > 30 cmH2O flagged.', location: DLT, status: 'illustrative', note: 'Cuff length, compliance and the 45 mm cuff-to-tracheal-opening spacing are illustrative.' },
  { id: 'm8-lumen-sizes', module: 'M8', claim: 'DLT sizes 35/37/39/41 Fr: outer diameter = Fr / 3 mm; bronchial-limb OD 9.5/10.0/10.1/10.6 mm; tracheal lumen ID 4.5/4.7/4.9/5.4 mm; bronchial lumen ID 4.3/4.5/4.7/4.8 mm.', location: DLT, status: 'from-memory', note: 'VERIFY against a manufacturer datasheet. French gauge definition (OD = Fr/3) is standard.' },
  { id: 'm8-anatomy', module: 'M8', claim: '3D airway: BodyParts3D trachea, main, lobar and segmental bronchi of one adult male; centrelines, calibres, carina and lobar orifices measured from the meshes (trachea 110 mm, left main 62 mm, RUL orifice 25–34 mm from the carina).', location: 'scripts/anatomy/build-airway-map.ts', status: 'sourced', source: 'Mitsuhashi N et al. Nucleic Acids Res 2009;37:D782-5. doi:10.1093/nar/gkn613', evidenceId: 'bodyparts3d', note: 'Measurements are of one specimen. Trachea length is close to the male mean 109.5 ± 8.9 mm (Adhikari 2025, doi:10.1186/s13037-025-00450-2).' },
  { id: 'm8-scope-optics', module: 'M8', claim: 'Bronchoscope image: 120° wide-angle (equidistant fisheye) lens, light at the tip with inverse-square fall-off, cartilage rings 4.2 mm apart, absent on the posterior membranous wall; SpO2 follows PaO2 with a 30 s lag.', location: 'src/modules/m8-bronchoscopy-dlt/bronchoscopeView.ts', status: 'illustrative', note: 'Rendering choices; ring spacing and SpO2 lag are not measured values.' },
];

export function claimsForModule(tab: string): ClinicalClaim[] {
  const tags = tab === 'M1_M2' ? ['M1', 'M2'] : [tab];
  return CLAIMS.filter((c) => tags.includes(c.module));
}

export function statusCounts(claims: ClinicalClaim[]): Record<ClaimStatus, number> {
  const out: Record<ClaimStatus, number> = { sourced: 0, 'from-memory': 0, illustrative: 0 };
  for (const c of claims) out[c.status]++;
  return out;
}
