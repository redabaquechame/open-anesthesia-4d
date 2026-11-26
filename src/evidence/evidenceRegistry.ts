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
];
