/**
 * Postpartum haemorrhage after vaginal birth (uterine atony), stage 1 → 2.
 * Steps and doses: SOGC Clinical Practice Guideline No. 431 (Robinson et al., JOGC 2022, full text
 * read) and the SMAR « Protocole / check-list HPP » (full text read); TXA timing also ESAIC 2023
 * (1B). Where national doses differ, the scenario shows each source side by side.
 */
import type { CrisisProtocol } from '../crisisTypes';
import { after } from './shared';

export const PPH: CrisisProtocol = {
  id: 'pph',
  title: { fr: 'Hémorragie du post-partum (atonie utérine)', en: 'Postpartum haemorrhage (uterine atony)' },
  stem: {
    fr: 'Femme de 29 ans, 70 kg, accouchement par voie basse il y a 20 min, oxytocine prophylactique faite. Le sac de recueil indique 900 ml et le saignement continue ; utérus mou. FC 118, PA 96/58.',
    en: '29-year-old woman, 70 kg, vaginal birth 20 min ago, prophylactic oxytocin given. The collection bag shows 900 mL and bleeding continues; the uterus is soft. HR 118, BP 96/58.',
  },
  caseWeightKg: 70,
  recognition: [
    {
      fr: 'Stade fondé sur les pertes mesurées (sac gradué, pesée), pas sur les constantes : la tachycardie et l’hypotension sont tardives chez la femme jeune.',
      en: 'Stage by measured blood loss (graduated bag, weighing), not by vital signs: tachycardia and hypotension come late in young women.',
    },
    { fr: 'Causes : les 4 T — tonus, tissu, traumatisme, thrombine.', en: 'Causes: the four Ts — tone, tissue, trauma, thrombin.' },
  ],
  actions: [
    {
      id: 'help',
      label: { fr: 'Noter l’heure, appeler l’équipe (obstétricien, anesthésiste, sage-femme), lancer la check-list HPP', en: 'Note the time, call the team (obstetrician, anaesthetist, midwife), start the PPH checklist' },
      detail: { fr: 'SMAR stade 1 : T0, appel de l’équipe, travail en équipe avec la check-list.', en: 'SMAR stage 1: T0, call the team, work through the checklist.' },
      critical: true,
      targetSec: 60,
      claimId: 'm9-pph-steps',
    },
    {
      id: 'massage',
      label: { fr: 'Massage utérin, compression bimanuelle, vidange vésicale', en: 'Uterine massage, bimanual compression, empty the bladder' },
      detail: { fr: 'SOGC : la compression bimanuelle peut sauver la vie en attendant les médicaments ; une vessie pleine empêche l’utérus de se contracter.', en: 'SOGC: bimanual compression can be life-saving while drugs take effect; a full bladder stops the uterus contracting.' },
      critical: true,
      targetSec: 90,
      claimId: 'm9-pph-steps',
    },
    {
      id: 'access',
      label: { fr: '2 voies veineuses de gros calibre, bilan (NFS, hémostase, fibrinogène, groupe), O₂, réchauffement', en: 'Two large-bore IV lines, bloods (FBC, coagulation, fibrinogen, group), O₂, warming' },
      detail: { fr: 'SMAR : 2 VVP 14–16 G. SOGC : O₂ 8–10 L/min ; patiente au sec, couvertures chaudes, solutés réchauffés.', en: 'SMAR: two 14–16 G cannulas. SOGC: O₂ 8–10 L/min; keep her dry, warm blankets, warmed fluids.' },
      critical: true,
      targetSec: 180,
      claimId: 'm9-pph-steps',
    },
    {
      id: 'oxytocin',
      label: { fr: 'Ocytocine en perfusion', en: 'Oxytocin infusion' },
      detail: {
        fr: 'SOGC : bolus IV de 3 UI au plus (ou 10 UI IM), perfusion ≤ 1 UI/min pendant 4 min puis 7,5–15 UI/h. SMAR : 40 UI sur 30 min.',
        en: 'SOGC: IV bolus no more than 3 IU (or 10 IU IM), infusion ≤ 1 IU/min for 4 min then 7.5–15 IU/h. SMAR: 40 IU over 30 min.',
      },
      critical: true,
      targetSec: 180,
      dose: { fixed: 3, max: 3, unit: 'IU', route: { fr: 'IV lente (SOGC), puis perfusion', en: 'slow IV (SOGC), then infusion' } },
      claimId: 'm9-pph-oxytocin',
    },
    {
      id: 'txa',
      label: { fr: 'Acide tranexamique 1 g IV', en: 'Tranexamic acid 1 g IV' },
      detail: {
        fr: 'Dans les 3 h suivant la naissance (ESAIC 1B ; OMS 2017, recommandation forte). SOGC : 1 g IV en 30–60 s, renouvelable après 30 min, 2 doses au plus. OMS / essai WOMAN : 1 g IV à 1 ml/min (10 min), 2e dose si le saignement continue après 30 min ou reprend dans les 24 h.',
        en: 'Within 3 h of birth (ESAIC 1B; WHO 2017, strong recommendation). SOGC: 1 g IV over 30–60 s, may repeat after 30 min, 2 doses at most. WHO / WOMAN trial: 1 g IV at 1 mL/min (10 min), second dose if bleeding continues after 30 min or restarts within 24 h.',
      },
      critical: true,
      targetSec: 300,
      dose: { fixed: 1, unit: 'g', route: { fr: 'IV (SOGC 30–60 s ; OMS 10 min)', en: 'IV (SOGC 30–60 s; WHO 10 min)' } },
      claimId: 'm9-pph-txa',
    },
    {
      id: 'cause',
      label: { fr: 'Chercher la cause : révision utérine (caillots, débris), examen sous valves (déchirures)', en: 'Find the cause: uterine exploration (clots, tissue), speculum exam (tears)' },
      detail: { fr: 'SMAR : délivrance artificielle si placenta en place, révision utérine, examen sous valves, 4 T. SOGC : libérer le segment inférieur des caillots.', en: 'SMAR: manual removal if the placenta is in, uterine exploration, speculum exam, the 4 Ts. SOGC: clear clots from the lower segment.' },
      critical: true,
      claimId: 'm9-pph-steps',
    },
    {
      id: 'second',
      label: { fr: 'Utérotonique de 2e ligne si pas de tonus', en: 'Second-line uterotonic if tone does not return' },
      detail: {
        fr: 'SOGC : si le premier agent n’a pas rétabli le tonus en 4 min. Ergométrine contre-indiquée en cas d’hypertension ; carboprost jamais IV (bronchospasme). France : sulprostone dans les 30 min. Maroc : méthylergométrine 0,2 mg IM ou misoprostol à 15 min.',
        en: 'SOGC: if the first agent has not restored tone within 4 min. Ergometrine is contraindicated in hypertension; carboprost never IV (bronchospasm). France: sulprostone within 30 min. Morocco: methylergometrine 0.2 mg IM or misoprostol at 15 min.',
      },
      critical: true,
      claimId: 'm9-pph-second',
    },
    {
      id: 'blood',
      label: { fr: 'Transfuser : CGR puis protocole de transfusion massive si le saignement persiste', en: 'Transfuse: red cells, then the massive haemorrhage protocol if bleeding continues' },
      detail: {
        fr: 'SOGC : Hb 70–90 g/l pendant l’hémorragie active ; protocole 1:1:1 ou 2:1:1 ; fibrinogène à remplacer s’il est < 2 g/l.',
        en: 'SOGC: Hb 70–90 g/L during active bleeding; protocol 1:1:1 or 2:1:1; replace fibrinogen if < 2 g/L.',
      },
      critical: true,
      repeatable: true,
      claimId: 'm9-pph-blood',
    },
    {
      id: 'tamponade',
      label: { fr: 'Échec : ballonnet intra-utérin, puis embolisation ou chirurgie', en: 'Failure: intrauterine balloon, then embolisation or surgery' },
      detail: { fr: 'SOGC : ballonnet de Bakri rempli de 300–500 ml ; évite d’autres gestes dans 75–95 % des cas. Compression bimanuelle maintenue pendant la préparation du bloc.', en: 'SOGC: Bakri balloon filled with 300–500 mL; avoids further procedures in 75–95 % of cases. Keep bimanual compression while theatre is prepared.' },
      critical: false,
      claimId: 'm9-pph-second',
    },
  ],
  distractors: [
    {
      id: 'bolus10',
      label: { fr: 'Ocytocine 10 UI en IV directe rapide', en: 'Oxytocin 10 IU rapid IV push' },
      why: { fr: 'SOGC : 3 UI au plus en IV ; une dose rapide plus forte risque une hypotension sur une patiente déjà hypovolémique.', en: 'SOGC: no more than 3 IU IV; a larger rapid dose risks hypotension in an already hypovolaemic patient.' },
      claimId: 'm9-pph-oxytocin',
    },
    {
      id: 'carboIV',
      label: { fr: 'Carboprost en IV', en: 'Carboprost IV' },
      why: { fr: 'SOGC : carboprost uniquement IM ou intramyométrial, jamais IV.', en: 'SOGC: carboprost IM or intramyometrial only, never IV.' },
      claimId: 'm9-pph-second',
    },
    {
      id: 'crystal',
      label: { fr: '4 L de cristalloïdes avant tout produit sanguin', en: '4 L of crystalloid before any blood product' },
      why: { fr: 'SOGC : Ringer lactate 1–2 ml par ml perdu au début ; les grands volumes causent une coagulopathie de dilution.', en: 'SOGC: Ringer’s lactate 1–2 mL per mL lost at first; large volumes cause dilutional coagulopathy.' },
      claimId: 'm9-pph-blood',
    },
    {
      id: 'waitVitals',
      label: { fr: 'Attendre que la PA baisse pour déclencher l’alerte', en: 'Wait for the blood pressure to fall before raising the alarm' },
      why: { fr: 'SOGC : stade selon les pertes mesurées quelles que soient les constantes ; se fier aux constantes retarde le traitement.', en: 'SOGC: stage by measured loss regardless of vital signs; relying on vitals delays treatment.' },
      claimId: 'm9-pph-steps',
    },
  ],
  initial: { hr: 118, sbp: 96, dbp: 58, spo2: 98, etco2: 32, tempC: 36.4, rhythm: 'sinusTachy' },
  target: (t, done) => {
    // Simulator model: tone returns with massage + oxytocin (± second line); TXA and blood limit the slide.
    const tone = after(done, 'massage', t, 30) && (after(done, 'oxytocin', t, 120) || after(done, 'second', t, 120));
    const fixed = tone && done.has('cause');
    const blood = after(done, 'blood', t, 60);
    const warm = done.has('access');
    const temp = warm ? 36.4 : Math.max(35.0, 36.4 - t / 600);
    if (fixed && (blood || done.has('txa'))) return { hr: 96, sbp: 112, dbp: 68, spo2: 99, etco2: 35, tempC: temp, rhythm: 'sinus' };
    if (tone) return { hr: 108, sbp: blood ? 104 : 98, dbp: 60, spo2: 98, etco2: 33, tempC: temp, rhythm: 'sinusTachy' };
    if (t > 360 && !blood) return { hr: 0, sbp: 0, dbp: 0, spo2: 70, etco2: 10, tempC: temp, rhythm: 'PEA' };
    if (t > 180) return { hr: blood ? 128 : 142, sbp: blood ? 82 : 64, dbp: blood ? 46 : 34, spo2: 96, etco2: 26, tempC: temp, rhythm: 'sinusTachy' };
    return { hr: 126, sbp: 88, dbp: 52, spo2: 98, etco2: 30, tempC: temp, rhythm: 'sinusTachy' };
  },
  modelSequence: ['help', 'massage', 'access', 'oxytocin', 'txa', 'cause', 'second', 'blood'],
  durationSec: 540,
  claimIds: ['m9-pph-steps', 'm9-pph-oxytocin', 'm9-pph-txa', 'm9-pph-second', 'm9-pph-blood', 'm9-dynamics'],
  evidenceId: 'sogc-pph-2022',
  localNotes: [
    {
      region: 'ma',
      resourceId: 'ma-smaar-hpp',
      text: {
        fr: 'Maroc (check-list SMAR) : stade 1 (500–1000 ml) ocytocine 40 UI sur 30 min ; sans réponse à 15 min, méthylergométrine 0,2 mg IM, misoprostol, acide tranexamique 1 g, calcium 1 g. Cibles : PAS 80–90 mmHg, fibrinogène > 2 g/l, température > 35 °C.',
        en: 'Morocco (SMAR checklist): stage 1 (500–1000 mL) oxytocin 40 IU over 30 min; no response at 15 min, methylergometrine 0.2 mg IM, misoprostol, tranexamic acid 1 g, calcium 1 g. Targets: SBP 80–90 mmHg, fibrinogen > 2 g/L, temperature > 35 °C.',
      },
    },
    {
      region: 'fr',
      resourceId: 'fr-cngof-hpp-2014',
      text: {
        fr: 'France (CNGOF/SFAR 2014) : HPP ≥ 500 ml, sévère ≥ 1000 ml ; ocytocine 5–10 UI IV ou IM, au plus 40 UI cumulées ; sulprostone dans les 30 min ; Hb > 8 g/dl, fibrinogène ≥ 2 g/l ; acide tranexamique 1 g, renouvelable une fois.',
        en: 'France (CNGOF/SFAR 2014): PPH ≥ 500 mL, severe ≥ 1000 mL; oxytocin 5–10 IU IV or IM, at most 40 IU in total; sulprostone within 30 min; Hb > 8 g/dL, fibrinogen ≥ 2 g/L; tranexamic acid 1 g, repeatable once.',
      },
    },
    {
      region: 'ca',
      resourceId: 'ca-sogc-431',
      text: {
        fr: 'Canada (SOGC 431) : bolus IV d’ocytocine de 3 UI au plus ; 2e ligne si pas de tonus à 4 min ; escalade à 500, 1000 et 1500 ml ; protocole 1:1:1 ou 2:1:1.',
        en: 'Canada (SOGC 431): oxytocin IV bolus no more than 3 IU; second line if no tone at 4 min; escalate at 500, 1000 and 1500 mL; protocol 1:1:1 or 2:1:1.',
      },
    },
  ],
};
