/**
 * Evidence & Equations registry.
 *
 * Rule for this file: every entry must point at a real, checkable source. The journal
 * entries below were confirmed in PubMed (PMID + DOI) on 2026-11-26. Do not add an entry
 * without a source you have opened yourself.
 */

export interface EvidenceEntry {
  id: string;
  moduleIds: string[];
  title: string;
  equationLatex?: string;
  keyFinding: string;
  clinicalTakeaway: string;
  sourceCitation: string;
  sourceUrl: string;
}

export const EVIDENCE_REGISTRY: EvidenceEntry[] = [
  {
    id: 'equation-of-motion',
    moduleIds: ['M1', 'M2'],
    title: 'Equation of motion of the respiratory system',
    equationLatex: 'Paw = PEEP + V/C + R · V\'',
    keyFinding:
      'Airway pressure is the sum of an elastic term (volume over compliance), a resistive term (resistance times flow) and end-expiratory pressure. Plateau pressure isolates the elastic part; peak minus plateau reflects resistance.',
    clinicalTakeaway:
      'A rising peak with a stable plateau points to resistance (bronchospasm, kinked tube); a rising plateau points to compliance (pneumoperitoneum, stiff lungs).',
    sourceCitation: 'Hess DR. Respir Care. 2014;59(11):1773-94. PMID 25336536',
    sourceUrl: 'https://doi.org/10.4187/respcare.03410',
  },
  {
    id: 'capnography-waveform',
    moduleIds: ['M2'],
    title: 'Capnography: waveform phases and patterns',
    keyFinding:
      'Review of time capnography and its use outside the operating room, including waveform interpretation and patterns seen with airway and circuit problems.',
    clinicalTakeaway:
      'Read the shape, not just the number: an elevated baseline means rebreathing; a sloped "shark-fin" upstroke means obstructed expiration.',
    sourceCitation: 'Kodali BS. Anesthesiology. 2013;118(1):192-201. PMID 23221867',
    sourceUrl: 'https://doi.org/10.1097/ALN.0b013e318278c8b6',
  },
  {
    id: 'argon-concentrator',
    moduleIds: ['M1', 'M3'],
    title: 'Argon accumulates in low-flow circles fed by concentrator O2',
    equationLatex: 'Simulator model: F_Ar,ss = Ar_in / (FGF − VO2)',
    keyFinding:
      'Zeolite concentrator oxygen contained about 5% argon, which accumulates in partially and fully closed circle systems. The authors recommend a fresh O2 flow of at least twice O2 consumption, and periodic opening of a totally closed circuit.',
    clinicalTakeaway:
      'With concentrator O2 at very low flows, watch FiO2 drift down; keep O2 flow at least 2 × VO2 or flush the circuit periodically.',
    sourceCitation: 'Parker CJ, Snowdon SL. Br J Anaesth. 1988;61(4):397-402. PMID 2973341',
    sourceUrl: 'https://doi.org/10.1093/bja/61.4.397',
  },
  {
    id: 'anaesthesia-ventilators',
    moduleIds: ['M1'],
    title: 'Anaesthesia ventilators: bellows, pistons and fresh-gas decoupling',
    equationLatex: 'Simulator model: Vt_delivered ≈ Vt_set + FGF · Ti (no decoupling)',
    keyFinding:
      'Ascending bellows are safer than descending bellows; piston ventilators are electrically driven, need no drive gas and deliver accurate tidal volumes. Fresh-gas decoupling was added to piston and descending-bellows designs to reduce ventilator-induced volutrauma.',
    clinicalTakeaway:
      'Know your machine: a descending bellows keeps moving after a disconnect, and pressing the O2 flush during inspiration on an un-decoupled bellows adds volume to the breath.',
    sourceCitation: 'Jain RK, Swaminathan S. Indian J Anaesth. 2013;57(5):525-32. PMID 24249886',
    sourceUrl: 'https://doi.org/10.4103/0019-5049.120150',
  },
  {
    id: 'mapleson-systems',
    moduleIds: ['M1'],
    title: 'Mapleson breathing systems A–F',
    keyFinding:
      'For adults, Mapleson A is the circuit of choice for spontaneous breathing, while Mapleson D and its Bain modification are best for controlled ventilation. For neonates and children, Mapleson E and F (Jackson-Rees) are preferred.',
    clinicalTakeaway: 'Spontaneous: A > D/E/F > C > B. Controlled: D/E/F > B > C > A.',
    sourceCitation: 'Kaul TK, Mittal G. Indian J Anaesth. 2013;57(5):507-15. PMID 24249884',
    sourceUrl: 'https://doi.org/10.4103/0019-5049.120148',
  },
  {
    id: 'circle-low-flow',
    moduleIds: ['M1', 'M3'],
    title: 'The circle system, closed circuit and low-flow anaesthesia',
    equationLatex: 'Simulator model: FiO2,ss ≈ (FGF_O2 − VO2) / (FGF − VO2)',
    keyFinding:
      'A circle system with a CO2 absorber can run at flows as low as 250–500 mL/min. Unidirectional valves must sit on both limbs, fresh gas must not enter between the expiratory valve and the patient, and the APL valve must not sit between the patient and the inspiratory valve.',
    clinicalTakeaway:
      'At low flow, inspired O2 falls below the fresh-gas O2 fraction because the patient keeps consuming O2: always monitor FiO2.',
    sourceCitation: 'Parthasarathy S. Indian J Anaesth. 2013;57(5):516-24. PMID 24249885',
    sourceUrl: 'https://doi.org/10.4103/0019-5049.120149',
  },
  {
    id: 'bis-nmb-awake',
    moduleIds: ['M4'],
    title: 'BIS falls under neuromuscular block in awake volunteers',
    keyFinding:
      'In 10 fully awake volunteers given suxamethonium and rocuronium (no anaesthetic), BIS fell to values as low as 44 and 47 on two current monitor versions and did not recover until movement returned.',
    clinicalTakeaway:
      'BIS needs muscle activity as well as an awake EEG to read "awake": a low BIS in a paralysed patient does not exclude awareness.',
    sourceCitation: 'Schuller PJ et al. Br J Anaesth. 2015;115 Suppl 1:i95-i103. PMID 26174308',
    sourceUrl: 'https://doi.org/10.1093/bja/aev072',
  },
  {
    id: 'corrugator-vs-adductor',
    moduleIds: ['M5'],
    title: 'Corrugator supercilii vs adductor pollicis after rocuronium',
    keyFinding:
      'In 201 patients given rocuronium 0.6 or 1.0 mg/kg, onset was significantly shorter at the orbicularis oculi and corrugator supercilii than at the adductor pollicis.',
    clinicalTakeaway:
      'Facial-site monitoring lets intubation proceed earlier; the adductor pollicis remains the site for judging recovery before extubation.',
    sourceCitation: 'Lee HJ et al. Br J Anaesth. 2009;102(6):869-74. PMID 19376787',
    sourceUrl: 'https://doi.org/10.1093/bja/aep064',
  },
  {
    id: 'eleveld-propofol',
    moduleIds: ['M4'],
    title: 'Eleveld propofol PK-PD model (broad population)',
    keyFinding:
      'Built from 30 studies (1033 individuals, 27 weeks post-menstrual age to 88 years, 0.68–160 kg). For a 35-year-old, 170 cm, 70 kg male without concomitant drugs: V1 6.28, V2 25.5, V3 273 L; CL 1.79, Q2 1.75, Q3 1.11 L/min; ke0 0.146 /min.',
    clinicalTakeaway:
      'One model covers children, adults, the elderly and high-BMI patients and predicts BIS; the simulator reproduces these reference values exactly (npm run sanity).',
    sourceCitation: 'Eleveld DJ, Colin P, Absalom AR, Struys MMRF. Br J Anaesth. 2018;120(5):942-59. PMID 29661412',
    sourceUrl: 'https://doi.org/10.1016/j.bja.2018.01.018',
  },
  {
    id: 'yasuda-sevo-iso',
    moduleIds: ['M3'],
    title: 'Uptake of sevoflurane vs isoflurane in volunteers',
    keyFinding:
      'At 30 min of constant inspired concentration, FA/FI was 0.986 for nitrous oxide, 0.850 for sevoflurane and 0.733 for isoflurane (mean, 7 volunteers).',
    clinicalTakeaway:
      'Lower blood solubility gives a faster rise of alveolar concentration. The simulator gives 0.865 (sevo) and 0.731 (iso) under the same conditions (npm run sanity).',
    sourceCitation: 'Yasuda N et al. Anesth Analg. 1991;72(3):316-24. PMID 1994760',
    sourceUrl: 'https://doi.org/10.1213/00000539-199103000-00007',
  },
  {
    id: 'esaic-nmb-2023',
    moduleIds: ['M5'],
    title: 'ESAIC guideline: peri-operative management of neuromuscular block',
    keyFinding:
      'Recommends ulnar nerve stimulation with quantitative monitoring at the adductor pollicis to exclude residual paralysis (1B); sugammadex to antagonise deep, moderate and shallow aminosteroid block (1A); TOF ratio > 0.2 before neostigmine and monitoring until TOF ratio > 0.9 (1C).',
    clinicalTakeaway: 'Do not extubate on clinical signs: measure a TOF ratio above 0.9 at the adductor pollicis.',
    sourceCitation: 'Fuchs-Buder T et al. Eur J Anaesthesiol. 2023;40(2):82-94. PMID 36377554',
    sourceUrl: 'https://doi.org/10.1097/EJA.0000000000001769',
  },
  {
    id: 'bridion-smpc',
    moduleIds: ['M5'],
    title: 'Sugammadex (Bridion) EU Summary of Product Characteristics, section 4.2',
    keyFinding:
      'Adults: 4 mg/kg if recovery has reached at least 1–2 post-tetanic counts; 2 mg/kg at reappearance of T2; 16 mg/kg for immediate reversal (studied 3 min after rocuronium 1.2 mg/kg). Not recommended in severe renal impairment (CrCl < 30 mL/min, including dialysis). Obese patients: dose on actual body weight. Recurrence of block after 2 or 4 mg/kg: repeat 4 mg/kg.',
    clinicalTakeaway: 'Dose to the measured depth of block, never to the vial size.',
    sourceCitation: 'European Medicines Agency. Bridion EPAR – Product Information (SmPC), last updated 06/11/2025.',
    sourceUrl: 'https://www.ema.europa.eu/en/documents/product-information/bridion-epar-product-information_en.pdf',
  },
  {
    id: 'asra-last-2020',
    moduleIds: ['M6', 'M9'],
    title: 'ASRA Local Anesthetic Systemic Toxicity checklist (2020, v1.1)',
    keyFinding:
      '20% lipid emulsion. Over 70 kg: bolus ~100 mL over 2–3 min, infuse ~250 mL over 15–20 min. Under 70 kg: bolus ~1.5 mL/kg over 2–3 min, infuse ~0.25 mL/kg/min. If unstable: repeat bolus, double infusion. Continue ≥ 15 min once stable; maximum 12 mL/kg. Seizures: ensure an adequate airway, benzodiazepine preferred. Epinephrine: start with ≤ 1 mcg/kg. Avoid local anaesthetics, beta-blockers, calcium-channel blockers, vasopressin.',
    clinicalTakeaway: 'LAST resuscitation is different from standard ACLS: give lipid early and use small epinephrine doses. ASRA states the checklist is under review (update expected early 2027).',
    sourceCitation: 'Neal JM, Neal EJ, Weinberg GL. Reg Anesth Pain Med. 2021;46(1):81-82. PMID 33148630 (checklist PDF © 2020 ASRA, v1.1)',
    sourceUrl: 'https://www.asra.com/guidelines-articles/guidelines/guideline-item/guidelines/2020/11/01/checklist-for-treatment-of-local-anesthetic-systemic-toxicity',
  },
  {
    id: 'brodsky-dlt-depth',
    moduleIds: ['M8'],
    title: 'Depth of placement of left double-lumen tubes',
    equationLatex: 'depth ≈ 29 cm + (height − 170 cm) / 10',
    keyFinding:
      'In 101 adults, average insertion depth was 29 cm at 170 cm height (men and women); each 10 cm of height changed the average depth by 1 cm. Depth was normally distributed at any height.',
    clinicalTakeaway: 'Height predicts the starting depth only: always confirm position with a bronchoscope.',
    sourceCitation: 'Brodsky JB, Benumof JL, Ehrenwerth J, Ozaki GT. Anesth Analg. 1991;73(5):570-2. PMID 1952136',
    sourceUrl: 'https://doi.org/10.1213/00000539-199111000-00010',
  },
  {
    id: 'benumof-dlt-margin',
    moduleIds: ['M8'],
    title: 'Margin of safety in positioning double-lumen tubes',
    equationLatex: 'margin (left DLT) = left main bronchus length − (proximal left cuff → left lumen tip, 30 mm)',
    keyFinding:
      'Main bronchus length, male 49 ± 8 mm left / 19 ± 6 mm right; female 44 ± 7 / 15 ± 5 mm. Right upper lobe bronchus diameter 11 mm. Average left-DLT margin of safety 16–19 mm; Mallinckrodt right-sided DLT 8 mm.',
    clinicalTakeaway: 'Left-sided tubes leave a much wider margin than right-sided tubes, and the margin is still only millimetres: confirm with a bronchoscope.',
    sourceCitation: 'Benumof JL, Partridge BL, Salvatierra C, Keating J. Anesthesiology. 1987;67(5):729-38. PMID 3674473',
    sourceUrl: 'https://doi.org/10.1097/00000542-198711000-00018',
  },
  {
    id: 'yoon-dlt-displacement',
    moduleIds: ['M8'],
    title: 'Double-lumen tube displacement when turning the patient lateral',
    keyFinding:
      '100 patients, left DLT, measured with a bronchoscope: supine → lateral displacement 6.3 ± 5.5 mm (tracheal opening ↔ carina) and 2.4 ± 3.6 mm (bronchial opening ↔ bronchial carina) without a neck brace; > 5 mm in 48 % (12 % with a brace).',
    clinicalTakeaway: 'Head and neck movement moves the tube: re-check its position with the bronchoscope after every position change.',
    sourceCitation: 'Yoon TG, Chang HW, Ryu HG, Kwon TD, Bahk JH. Can J Anaesth. 2005;52(4):413-7. PMID 15814758',
    sourceUrl: 'https://doi.org/10.1007/BF03016286',
  },
  {
    id: 'yao-lmb-desaturation',
    moduleIds: ['M8'],
    title: 'Short left main bronchus and desaturation during one-lung ventilation',
    keyFinding:
      '360 patients with a left DLT (CT-measured bronchus): a left main bronchus < 40 mm was associated with desaturation during one-lung ventilation (OR 8.087); also diabetes, right-lung collapse surgery and BMI.',
    clinicalTakeaway: 'A short left main bronchus narrows the margin before the tip blocks the left upper lobe orifice.',
    sourceCitation: 'Yao HY, Liu TJ, Lai HC. Braz J Anesthesiol. 2019;69(4):390-5. PMID 31387740',
    sourceUrl: 'https://doi.org/10.1016/j.bjan.2019.03.012',
  },
  {
    id: 'severinghaus-odc',
    moduleIds: ['M8'],
    title: 'Oxyhaemoglobin dissociation curve equation',
    equationLatex: 'S = 1 / (23400 / (PO₂³ + 150·PO₂) + 1)',
    keyFinding: 'A modified Hill equation fits the standard human O₂ dissociation curve within ± 0.0055 saturation.',
    clinicalTakeaway: 'Used here to turn the simulated PaO₂ into SaO₂ (standard curve: pH 7.40, 37 °C).',
    sourceCitation: 'Severinghaus JW. J Appl Physiol. 1979;46(3):599-602. PMID 35496',
    sourceUrl: 'https://doi.org/10.1152/jappl.1979.46.3.599',
  },
  {
    id: 'bodyparts3d',
    moduleIds: ['M6', 'M7', 'M8'],
    title: 'BodyParts3D: 3D anatomy database (source of the bone and vessel meshes)',
    keyFinding:
      'Dictionary-type anatomy database: each anatomical concept is a 3D segment of one adult male whole-body model, with FMA concept identifiers.',
    clinicalTakeaway: 'Real shapes, one body: sizes, depths and relations differ from patient to patient. Plexus and pleura in M6 are schematic.',
    sourceCitation: 'Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. Nucleic Acids Res. 2009;37:D782-5. PMID 18835852. Meshes: BodyParts3D © DBCLS (see public/models/anatomy/LICENSE.md)',
    sourceUrl: 'https://doi.org/10.1093/nar/gkn613',
  },
  {
    id: 'harrison-epidural-depth',
    moduleIds: ['M7'],
    title: 'Depth of the lumbar epidural space from the skin',
    keyFinding:
      'In 1000 parturients the median skin-to-epidural distance was 4.7 cm; it was greatest at L3–4 (4.93 cm) and least at L1–2 (4.23 cm).',
    clinicalTakeaway: 'Expect loss of resistance around 4–5 cm in many adults, but depth varies with the interspace and the patient: never rely on a fixed depth.',
    sourceCitation: 'Harrison GR, Clowes NW. Anaesthesia. 1985;40(7):685-7. PMID 4025774',
    sourceUrl: 'https://doi.org/10.1111/j.1365-2044.1985.tb10953.x',
  },
  {
    id: 'suga-elastance',
    moduleIds: ['M6'],
    title: 'Time-varying elastance: load independence of the pressure–volume ratio',
    equationLatex: 'Simulator model: P_LV(t) = E(t) · (V(t) − V0)',
    keyFinding:
      'In the canine left ventricle the instantaneous pressure–volume ratio was load-independent, and it changed with epinephrine and heart rate.',
    clinicalTakeaway: 'End-systolic elastance (ESPVR slope) reflects contractility separately from preload and afterload.',
    sourceCitation: 'Suga H, Sagawa K, Shoukas AA. Circ Res. 1973;32(3):314-22. PMID 4691336',
    sourceUrl: 'https://doi.org/10.1161/01.res.32.3.314',
  },
  {
    id: 'westerhof-windkessel',
    moduleIds: ['M6'],
    title: 'The arterial Windkessel (three-element model)',
    keyFinding:
      'The two-element Windkessel (resistance + compliance) explains diastolic decay but not systole; adding characteristic impedance gives a simple, fairly accurate approximation of ventricular afterload.',
    clinicalTakeaway: 'Afterload is more than resistance: compliance and characteristic impedance shape aortic pressure.',
    sourceCitation: 'Westerhof N, Lankhaar JW, Westerhof BE. Med Biol Eng Comput. 2009;47(2):131-41. PMID 18543011',
    sourceUrl: 'https://doi.org/10.1007/s11517-008-0359-2',
  },
  {
    id: 'eu-fgas-2024',
    moduleIds: ['M3'],
    title: 'EU F-gas Regulation 2024/573: desflurane restriction and GWP values',
    keyFinding:
      'Art. 13(8): desflurane as an inhalation anaesthetic is prohibited from 1 January 2026 except where strictly required and no other anaesthetic can be used on medical grounds; the institution keeps evidence of the justification. Annex II (AR6-based): desflurane GWP 2590, isoflurane 539, sevoflurane 195, enflurane 654. Annex VI: N2O GWP-100 273.',
    clinicalTakeaway: 'In the EU, routine desflurane use is no longer lawful; low-flow sevoflurane is the default low-carbon volatile.',
    sourceCitation: 'Regulation (EU) 2024/573, OJ L 2024/573, Article 13(8), Annex II section 2, Annex VI.',
    sourceUrl: 'https://eur-lex.europa.eu/eli/reg/2024/573/oj/eng',
  },
  {
    id: 'purdon-propofol-eeg',
    moduleIds: ['M4'],
    title: 'EEG signatures of loss and recovery of consciousness from propofol',
    keyFinding:
      'Loss of consciousness was marked by increased low-frequency power (< 1 Hz), loss of coherent occipital alpha (8–12 Hz) and appearance of coherent frontal alpha; these reversed on recovery.',
    clinicalTakeaway: 'Frontal alpha plus slow waves is the propofol signature to look for on the density spectral array.',
    sourceCitation: 'Purdon PL et al. Proc Natl Acad Sci U S A. 2013;110(12):E1142-51. PMID 23487781',
    sourceUrl: 'https://doi.org/10.1073/pnas.1221180110',
  },
  // ── M10 pre-operative assessment (opened 2026-11-27; full text or abstract as stated)
  {
    id: 'lee-rcri-1999',
    moduleIds: ['M10'],
    title: 'Revised Cardiac Risk Index (Lee 1999)',
    keyFinding:
      'Six independent predictors of major cardiac complications after elective non-cardiac surgery in 4,315 patients aged 50 or more. Validation-cohort rates: 0 factors 0.4%, 1 factor 0.9%, 2 factors 6.6%, 3 or more 11.0%.',
    clinicalTakeaway: 'Count the six factors; three or more puts the patient in class IV. Validated in elective surgery only.',
    sourceCitation: 'Lee TH et al. Circulation. 1999;100(10):1043-9. PMID 10477528 (full text)',
    sourceUrl: 'https://doi.org/10.1161/01.cir.100.10.1043',
  },
  {
    id: 'esc-noncardiac-2022',
    moduleIds: ['M10'],
    title: '2022 ESC guidelines on cardiovascular assessment for non-cardiac surgery',
    keyFinding:
      'The Task Force recommends no single risk score. Self-reported inability to climb two flights of stairs adds value to RCRI. Biomarkers: high-sensitivity troponin (class I) and/or BNP/NT-proBNP (class IIa) in selected patients.',
    clinicalTakeaway: 'Combine a risk score, functional capacity and, in at-risk patients, ECG and biomarkers.',
    sourceCitation: 'Halvorsen S et al. Eur Heart J. 2022;43(39):3826-3924. PMID 36017553',
    sourceUrl: 'https://doi.org/10.1093/eurheartj/ehac270',
  },
  {
    id: 'stopbang',
    moduleIds: ['M10'],
    title: 'STOP-Bang questionnaire for obstructive sleep apnoea',
    keyFinding:
      'Eight yes/no items. A score of 3 or more is 93% sensitive for moderate-to-severe OSA (AHI > 15) and 100% for severe OSA, but only about 31% specific. The probability of severe OSA rises from 4% at 0–2 to 38% at 7–8.',
    clinicalTakeaway: 'A low score is reassuring; a high score calls for OSA precautions (opioid-sparing, monitoring).',
    sourceCitation: 'Chung F et al. Chest. 2016;149(3):631-8. PMID 26378880 (abstract); stopbang.ca (official site)',
    sourceUrl: 'https://www.stopbang.ca/osa/screening.php',
  },
  {
    id: 'apfel-1999',
    moduleIds: ['M10'],
    title: 'Simplified risk score for postoperative nausea and vomiting (Apfel 1999)',
    keyFinding: 'Four predictors (female, PONV or motion-sickness history, non-smoker, postoperative opioids). 0–4 factors give 10, 21, 39, 61 and 79% incidence within 24 h.',
    clinicalTakeaway: 'From two factors, consider prophylaxis.',
    sourceCitation: 'Apfel CC et al. Anesthesiology. 1999;91(3):693-700. PMID 10485781 (abstract)',
    sourceUrl: 'https://doi.org/10.1097/00000542-199909000-00022',
  },
  {
    id: 'ariscat-canet-2010',
    moduleIds: ['M10'],
    title: 'ARISCAT: predicting postoperative pulmonary complications (Canet 2010)',
    keyFinding:
      'Seven predictors in 2,464 patients from 59 hospitals: low SpO2, recent respiratory infection, age, anaemia, upper abdominal or intrathoracic surgery, surgery of 2 h or more, emergency. Pulmonary complications occurred in 5% and raised 30-day mortality from 0.5% to 19.5%.',
    clinicalTakeaway: 'High-risk patients (≥ 45 points) need a lung-protective plan. Point values in the app still need checking against the paper.',
    sourceCitation: 'Canet J et al. Anesthesiology. 2010;113(6):1338-50. PMID 21045639 (abstract)',
    sourceUrl: 'https://doi.org/10.1097/ALN.0b013e3181fc6e0a',
  },
  {
    id: 'esa-fasting-2011',
    moduleIds: ['M10'],
    title: 'Peri-operative fasting in adults and children (ESA 2011) + ASA 2023 update',
    keyFinding:
      'ESA 2011: clear fluids up to 2 h, solids 6 h; do not cancel for chewing gum, a sweet or smoking. ASA 2023: healthy adults may drink carbohydrate-containing clear liquids (up to 400 mL) until 2 h before surgery.',
    clinicalTakeaway: 'Encourage clear fluids up to 2 h before surgery; long fasts are not safer.',
    sourceCitation: 'Smith I et al. Eur J Anaesthesiol. 2011;28(8):556-69. PMID 21712716; Joshi GP et al. Anesthesiology. 2023;138(2):132-51. PMID 36629465',
    sourceUrl: 'https://doi.org/10.1097/EJA.0b013e3283495ba1',
  },
  {
    id: 'esaic-paed-fasting-2022',
    moduleIds: ['M10'],
    title: 'ESAIC guideline: pre-operative fasting in children (2022)',
    keyFinding: 'Clear fluids until 1 h before induction, breast milk until 3 h, formula or non-human milk until 4 h.',
    clinicalTakeaway: 'Shorter fasts in children reduce thirst, discomfort and hypotension at induction.',
    sourceCitation: 'Frykholm P et al. Eur J Anaesthesiol. 2022;39(1):4-25. PMID 34857683 (abstract)',
    sourceUrl: 'https://doi.org/10.1097/EJA.0000000000001599',
  },
  {
    id: 'glp1-multisociety-2024',
    moduleIds: ['M10'],
    title: 'GLP-1 receptor agonists before surgery: multisociety guidance (2024)',
    keyFinding:
      'Shared decision. Continue when there are no high-risk features; when held, stop on the day (daily drugs) or one week before (weekly). Liquid diet for 24 h when concerned; gastric ultrasound can help.',
    clinicalTakeaway: 'Ask about GLP-1 agonists at every pre-operative visit and plan around delayed gastric emptying.',
    sourceCitation: 'Kindel TL et al. (AGA, ASMBS, ASA, ISPCOP, SAGES). Surg Endosc 2024. PMC11666732 (full text)',
    sourceUrl: 'https://doi.org/10.1007/s00464-024-11263-2',
  },
  {
    id: 'aoa-qrh-mh-2021',
    moduleIds: ['M9'],
    title: 'Malignant hyperthermia crisis — Association of Anaesthetists QRH card 3-8 (v.2, 2021)',
    keyFinding:
      'Recognise: unexplained rising EtCO2, tachycardia, rising O2 use (temperature is late). Remove triggers (vaporiser off, 100% O2 high flow, 2–3 × ventilation, charcoal filters), TIVA, dantrolene 2–3 mg/kg then 1 mg/kg every 5 min until EtCO2 < 6 kPa and T < 38.5 °C, active cooling, treat acidosis and hyperkalaemia.',
    clinicalTakeaway: 'Dantrolene early is the treatment. EMHG 2024 uses 2–2.5 mg/kg repeated every 10 min; follow your local MH card.',
    sourceCitation: 'Association of Anaesthetists Quick Reference Handbook, card 3-8 v.2 (2021), CC BY-NC-SA 4.0. Full guideline: Hopkins PM et al. Anaesthesia 2021;76(5):655-664, PMID 33399225 (abstract only). EMHG v2024 recommendation, emhg.org (4 Nov 2024).',
    sourceUrl: 'https://anaesthetists.org/Portals/0/PDFs/QRH/QRH_complete_June_2023.pdf',
  },
  {
    id: 'garvey-anaphylaxis-2019',
    moduleIds: ['M9'],
    title: 'Suspected immediate perioperative allergic reactions: international consensus (2019)',
    keyFinding:
      'Grades I–IV (modified Ring & Messmer). Adult IV adrenaline: grade II 20 µg → 50 µg; grade III 50 µg → 200 µg every 2 min; grade IV 1 mg per ALS. Fluids: grade III 1 L, up to 30 mL/kg. CPR if SBP < 50 mmHg. Steroids and antihistamines only after adrenaline and fluids. Tryptase at 1 h and 2–4 h, baseline ≥ 24 h.',
    clinicalTakeaway: 'Titrated IV adrenaline and fluid are first-line; skin signs are often absent in severe reactions.',
    sourceCitation: 'Garvey LH, Dewachter P, Hepner DL, et al. Br J Anaesth. 2019;123(1):e50-e64. PMID 31130272. Steps also from QRH card 3-1 v.5 (2022).',
    sourceUrl: 'https://doi.org/10.1016/j.bja.2019.04.044',
  },
  {
    id: 'das-2025',
    moduleIds: ['M9', 'M8'],
    title: 'Difficult Airway Society 2025 guidelines: unanticipated difficult tracheal intubation in adults',
    keyFinding:
      'Plans A (≤ 3 + 1 attempts) → B (second-generation SAD, ≤ 3 attempts) → C (final facemask attempt) → declare CICO → D (scalpel–bougie–tube front-of-neck access, vertical incision by default when the membrane is not clearly palpable). Declare failure at each step; continue oxygen throughout.',
    clinicalTakeaway: 'Limit attempts, declare each failure out loud, and move to front-of-neck access without delay once CICO is declared.',
    sourceCitation: 'Ahmad I, El-Boghdadly K, Iliff H, et al. Br J Anaesth. 2026;136(1):283-307. PMID 41203471 (CC BY-NC-ND 4.0; algorithm figures not reproduced). Previous version: Frerk C et al. BJA 2015;115:827-48.',
    sourceUrl: 'https://doi.org/10.1016/j.bja.2025.10.006',
  },
  {
    id: 'rcuk-als-2025',
    moduleIds: ['M9'],
    title: 'Adult advanced life support 2025 (Resuscitation Council UK, adapting ERC 2025)',
    keyFinding:
      'Shockable rhythm: single shocks with 2-min CPR cycles; adrenaline 1 mg after the 3rd shock, then every 3–5 min; amiodarone 300 mg after 3 shocks and 150 mg after 5 (or lidocaine 100 mg + 50 mg). Compressions 100–120/min, 5–6 cm. Treat the 4 Hs and 4 Ts. No routine calcium or bicarbonate.',
    clinicalTakeaway: 'High-quality CPR and early defibrillation come first; drugs come after the third shock.',
    sourceCitation: 'Resuscitation Council UK. Adult advanced life support guidelines 2025. Adapts Soar J et al. ERC Guidelines 2025 Adult ALS. Resuscitation 2025;215 Suppl 1:110769, PMID 41117572 (abstract only).',
    sourceUrl: 'https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/',
  },
  {
    id: 'esaic-bleeding-2023',
    moduleIds: ['M9'],
    title: 'Management of severe peri-operative bleeding: ESAIC guidelines, second update 2022',
    keyFinding:
      'Massive bleeding in elective surgery: plasma:RBC ≥ 1:1 (2C), then goal-directed therapy as soon as possible (1C). Keep calcium > 0.9 mmol/L and normothermia; Hb 7–9 g/dL during active bleeding (1B); PCC rather than FFP (1B); balanced crystalloids (2C). TXA 1 g IV within 3 h for postpartum haemorrhage (1B).',
    clinicalTakeaway: 'Control the source, give balanced blood products early, and switch to targeted treatment guided by tests.',
    sourceCitation: 'Kietaibl S, Ahmed A, Afshari A, et al. Eur J Anaesthesiol. 2023;40(4):226-304. PMID 36855941.',
    sourceUrl: 'https://doi.org/10.1097/EJA.0000000000001803',
  },
  {
    id: 'sogc-pph-2022',
    moduleIds: ['M9'],
    title: 'Guideline No. 431: Postpartum Hemorrhage and Hemorrhagic Shock',
    keyFinding:
      'Stage PPH by quantitative blood loss, not vital signs. Oxytocin first line (≤ 3 IU IV bolus or 10 IU IM, then infusion); second-line uterotonic if no tone within 4 min; TXA 1 g IV, may repeat once after 30 min; bimanual compression, bladder emptying, Bakri balloon, then embolisation or surgery. Hb 70–90 g/L while bleeding; 1:1:1 or 2:1:1 protocol; fibrinogen if < 2 g/L.',
    clinicalTakeaway: 'Measure the loss, call early, restore uterine tone, give TXA, and transfuse before the lethal triad sets in.',
    sourceCitation: 'Robinson D, Basso M, Chan C, Duckitt K, Lett R. J Obstet Gynaecol Can. 2022;44(12):1293-1310.e1. PMID 36567097.',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/36567097/',
  },
  {
    id: 'sfar-machine-checkout',
    moduleIds: ['M1'],
    title: 'SFAR — the anaesthesia machine and its pre-use check',
    keyFinding:
      'French recommendations on the anaesthesia machine and the user checkout: O2 flush of at least 30 L/min; reserve cylinder content = engraved capacity × bar, replace at 150 L or less; O2 analyser 21 ± 2% in air and > 90% in O2, low alarm tested at 40% with O2 2 + N2O 4 L/min; fresh-gas supply leak ≤ 50 mL/min at 30 cmH2O (citing ISO 5358).',
    clinicalTakeaway: 'Check the machine before every list with the written procedure; the text dates from 1994, so newer machines may self-test parts of it.',
    sourceCitation: 'Société Française d’Anesthésie et de Réanimation. Recommandations concernant l’appareil d’anesthésie et sa vérification avant utilisation (1994; web page updated 2019).',
    sourceUrl: 'https://sfar.org/lappareil-danesthesie-et-sa-verification-avant-utilisation/',
  },
  {
    id: 'asa-pac-2008',
    moduleIds: ['M1'],
    title: 'ASA 2008 Recommendations for Pre-Anesthesia Checkout Procedures',
    keyFinding:
      'Fifteen items to check each day (or after service, a move or a vaporiser change), eight of them again before every case; each item names who may do it (provider, technician or machine self-test).',
    clinicalTakeaway: 'Adapt the list to your machine model; the backup ventilation device and suction are checked before every case.',
    sourceCitation: 'Feldman JM, Olympio MA, Martin D, Striker A. New guidelines available for pre-anesthesia checkout. APSF Newsletter, Spring 2008.',
    sourceUrl: 'https://www.apsf.org/article/new-guidelines-available-for-pre-anesthesia-checkout/',
  },
  {
    id: 'who-mcpc-2017',
    moduleIds: ['M9'],
    title: 'Managing complications in pregnancy and childbirth (WHO, 2nd ed.)',
    keyFinding:
      'Convulsions in pregnancy are managed as eclampsia until proven otherwise. Magnesium sulfate is the drug of choice: 4 g IV loading (IM or IV regimen), 2 g IV for recurrence after 15 min, maintenance for 24 h; withhold if RR < 16/min, absent patellar reflexes or urine < 30 mL/h; calcium gluconate 1 g IV as antidote. Treat BP ≥ 160/110 (hydralazine, labetalol, nifedipine) without going below normal. Birth within 12 h of the onset of eclamptic convulsions.',
    clinicalTakeaway: 'Magnesium first, then blood pressure, then birth; check breathing, reflexes and urine before every dose.',
    sourceCitation: 'World Health Organization. Managing complications in pregnancy and childbirth: a guide for midwives and doctors. 2nd ed. Geneva: WHO; 2017. ISBN 978-92-4-156549-3. CC BY-NC-SA 3.0 IGO.',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241565493',
  },
];
