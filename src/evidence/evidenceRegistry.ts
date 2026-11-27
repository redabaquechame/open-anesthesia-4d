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
    moduleIds: ['M6'],
    title: 'ASRA Local Anesthetic Systemic Toxicity checklist (2020, v1.1)',
    keyFinding:
      '20% lipid emulsion. Over 70 kg: bolus ~100 mL over 2–3 min, infuse ~250 mL over 15–20 min. Under 70 kg: bolus ~1.5 mL/kg over 2–3 min, infuse ~0.25 mL/kg/min. If unstable: repeat bolus, double infusion. Continue > 15 min once stable; maximum 12 mL/kg. Epinephrine: start < 1 mcg/kg. Avoid local anaesthetics, beta-blockers, calcium-channel blockers, vasopressin.',
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
];
