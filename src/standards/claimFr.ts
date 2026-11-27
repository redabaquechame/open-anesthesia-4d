/** Traductions françaises des énoncés du registre des données cliniques (claimRegistry.ts). Les nombres, unités et seuils sont identiques à l'original. */
export interface ClaimFr { claim: string; note?: string }
export const CLAIM_FR: Record<string, ClaimFr> = {
  // ── M1 ─────────────────────────────────────────────────────────────
  'm1-eom': {
    claim: 'Pression des voies aériennes = PEP + V/C + R·débit (équation du mouvement).',
  },
  'm1-two-compartment': {
    claim: 'Poumons modélisés en deux compartiments parallèles (C/2 chacun ; résistance du second augmentée par l’hétérogénéité du bronchospasme).',
    note: 'Structure du modèle du simulateur, pas un jeu de paramètres publié.',
  },
  'm1-bellows-fgf': {
    claim: 'Avec les ventilateurs à soufflet, le gaz frais s’ajoute au volume courant délivré ; ce n’est pas le cas d’un piston avec découplage du gaz frais.',
  },
  'm1-ascending-disconnect': {
    claim: 'Les soufflets ascendants (debout) s’affaissent lors d’une déconnexion ; les soufflets descendants (suspendus) continuent de se remplir et la masquent.',
  },
  'm1-flush-flow': {
    claim: 'Le by-pass d’O2 délivre un débit élevé d’O2 pur sans traverser les évaporateurs : la SFAR demande au moins 30 L/min ; un poste Dräger actuel (Atlan A100) annonce 25–75 L/min. Le simulateur utilise 45 L/min.',
    note: 'L’ancien texte indiquait 35–75 L/min : valeur introuvable dans les sources ouvertes, corrigée. ISO 80601-2-13 (payante) non consultée.',
  },
  'm1-concentrator-argon': {
    claim: 'L’O2 de concentrateur contient ~95 % d’O2 et ~4,5 % d’argon ; l’argon s’accumule dans un circuit filtre à bas débit.',
    note: 'Les pourcentages exacts varient selon le modèle de concentrateur.',
  },
  'm1-dead-space': {
    claim: 'Espace mort anatomique d’environ 150 mL chez l’adulte sain (près de 30 % d’un volume courant de 500 mL).',
    note: 'StatPearls est sous licence CC BY-NC-ND : texte paraphrasé.',
  },
  'm1-co2-store': {
    claim: 'La PaCO2 augmente d’environ 8–9 mmHg pendant la première minute d’apnée, puis plus lentement (réservoir de CO2 global).',
    note: 'Ajusté sur l’augmentation pendant l’apnée décrite dans les manuels ; pas une valeur de compartiment publiée.',
  },
  'm1-low-fio2-alarm': {
    claim: 'Le simulateur déclenche l’alarme FiO2 basse sous 25 % (réglage pédagogique, modèle du simulateur). Sur un vrai appareil, ce seuil est réglé par l’utilisateur : la série A de Mindray est livrée à 18 %, son réglage minimal ; un Dräger Julian est réglable à partir de 18 %.',
    note: 'Aucune source ouverte ne donne 25 % comme réglage standard. ISO 80601-2-55 (payante) non consultée.',
  },
  'm1-high-fico2-alarm': {
    claim: 'Le CO2 inspiré doit être proche de zéro en circuit filtre ; une ligne de base qui monte signe une réinhalation (chaux épuisée, valve défaillante). Le simulateur alarme au-dessus de 3 mmHg (réglage pédagogique, modèle du simulateur) ; les seuils réels diffèrent, par exemple 5 mmHg fixe sur un Dräger Julian.',
    note: 'Aucune source ouverte n’indique un seuil de 3 mmHg. Un cas clinique qui définirait la réinhalation au-delà de 2 mmHg (PMID 10754643) n’a pas pu être ouvert et n’est pas cité.',
  },
  'm1-sfar-reserve': {
    claim: 'Vérification SFAR : contenu de la bouteille de réserve (L) = contenance gravée × pression en bars ; la remplacer dès qu’il reste 150 L ou moins, puis la refermer et vérifier que la pression se maintient.',
    note: 'Le texte SFAR date de 1994.',
  },
  'm1-leak-test': {
    claim: 'SFAR (citant l’ancienne norme ISO 5358) : fuite du système d’alimentation en gaz frais ≤ 50 mL/min à 30 cmH2O. En anesthésie à faible débit, une fuite du système anesthésique jusqu’à 100–200 mL/min à 30 cmH2O est tolérée chez l’adulte.',
    note: 'L’ISO 5358 a été remplacée par l’ISO 80601-2-13 (payante, non consultée) : la limite ISO actuelle n’est pas vérifiée.',
  },
  'm1-alarm-mix': {
    claim: 'Vérification SFAR : l’analyseur lit 21 ± 2 % à l’air et plus de 90 % en O2 pur ; régler l’alarme basse à 40 % et afficher O2 2 L/min + N2O 4 L/min (≈ 33 % d’O2) : l’alarme doit sonner.',
    note: '≈ 33 % est un calcul (2/6), non écrit par la SFAR. Sans N2O, ce test ne peut pas être fait tel quel.',
  },
  'm1-asa-2008': {
    claim: 'Vérification ASA 2008 : 15 items chaque jour (les items 2, 4, 7, 11, 12, 13, 14 et 15 avant chaque patient). Item 6 : pressions des réseaux ≥ 50 psig.',
    note: 'Item 6 corrigé de ≈ 50 à ≥ 50 psig. Le PDF de l’ASA n’était pas accessible ; vérifié dans l’article du groupe de travail. Intitulés paraphrasés.',
  },
  'm1-gas-colours': {
    claim: 'Couleurs des bouteilles de gaz médicaux : ISO 32 (O2 blanc, N2O bleu, air blanc + noir) ; États-Unis, 21 CFR 201.328 (O2 vert, air médical jaune, N2O bleu).',
    note: 'Couleurs des bouteilles uniquement.',
  },
  'm1-gas-colours-csa': {
    claim: 'Couleurs canadiennes (CSA Z7396.1) et couleurs des canalisations de vide et d’évacuation (SEGA/WAGD).',
    note: 'Les normes CSA sont payantes et aucune source libre n’a été trouvée ; le vide et l’évacuation restent signalés « non vérifiés » dans le code.',
  },
  'm1-mapleson': {
    claim: 'Efficacité des systèmes de Mapleson : en ventilation spontanée A > D/E/F > C > B ; en ventilation contrôlée D/E/F > B > C > A.',
  },

  // ── M2 ─────────────────────────────────────────────────────────────
  'm2-capno-shapes': {
    claim: 'Ligne de base du capnogramme surélevée = réinhalation ; montée inclinée = obstruction expiratoire ; encoche de curare = effort spontané.',
  },
  'm2-etco2-normal': {
    claim: 'EtCO2 normale d’environ 35–45 mmHg.',
    note: 'Revue narrative, pas une norme.',
  },
  'm2-low-flow-fio2': {
    claim: 'En bas débit, la FiO2 devient inférieure à la fraction d’O2 du gaz frais car le patient continue de consommer de l’O2.',
  },

  // ── M3 ─────────────────────────────────────────────────────────────
  'm3-mac': {
    claim: 'CAM dans l’O2 (adulte) : sévoflurane 2,1 % (40 ans), desflurane 6,0 % (45 ans), isoflurane 1,15 % (44 ans), halothane 0,76 % (42 ans), enflurane 1,68 % (âge non précisé).',
    note: 'Corrigé le 27/11/2026 : sévoflurane était à 2,0, halothane à 0,75, enflurane à 1,7.',
  },
  'm3-blood-gas': {
    claim: 'Coefficient sang/gaz à 37 °C : sévoflurane 0,63–0,69 (simulateur 0,65), desflurane 0,424, isoflurane 1,43, halothane 2,5, enflurane 1,91.',
    note: 'Corrigé le 27/11/2026 : desflurane était à 0,45, halothane à 2,4.',
  },
  'm3-svp': {
    claim: 'Pression de vapeur saturante à 20 °C : sévoflurane 157, desflurane 669, isoflurane 238, halothane 243, enflurane 175 mmHg.',
    note: 'La notice canadienne 2012 de l’enflurane donne 180 mmHg.',
  },
  'm3-brain-blood': {
    claim: 'Coefficient cerveau/sang (tissu humain) : desflurane 1,29, isoflurane 1,57, sévoflurane 1,70, halothane 1,94.',
    note: 'Corrigé le 27/11/2026 : isoflurane était à 2,6, halothane à 2,9.',
  },
  'm3-tissue-partitions': {
    claim: 'Coefficients muscle/sang et graisse/sang de tous les agents, et cerveau/sang de l’enflurane.',
    note: 'Yasuda 1989 a mesuré muscle et graisse, mais les valeurs ne sont que dans le texte intégral payant ; l’enflurane n’y est pas étudié. Valeurs de manuel, toujours signalées.',
  },
  'm3-liquid-data': {
    claim: 'Densité du liquide (g/mL) : sévoflurane 1,52, desflurane 1,465, isoflurane 1,50 (1,496 à 25 °C), halothane 1,875 (1,872–1,877), enflurane 1,52 (1,517 à 25 °C).',
    note: 'Corrigé le 27/11/2026 : halothane était à 1,86.',
  },
  'm3-vapour-yield': {
    claim: 'Vapeur produite par mL de liquide à 20 °C : sévoflurane 183, desflurane 210, isoflurane 195, halothane 228, enflurane 198 mL (modèle du simulateur : densité ÷ masse molaire × 24,06 L/mol).',
    note: 'Aucune notice ne donne ce chiffre ; calculé à partir de la densité et de la masse molaire.',
  },
  'm3-iso5360-colours': {
    claim: 'Codes couleur des agents (ISO 5360) : halothane rouge, enflurane orange, isoflurane violet, desflurane bleu, sévoflurane jaune. Les couleurs à l’écran approchent les références Munsell.',
    note: 'Vérifié dans l’édition 1993 ; l’édition 2016 est payante. Sévoflurane lu via sa référence Munsell (6,25Y, un jaune).',
  },
  'm3-gwp-ar6': {
    claim: 'PRG à 100 ans (GWP100, valeurs IPCC AR6) : des 2590, iso 539, sévo 195, N2O 273.',
    note: 'Lu dans le règlement UE ; le tableau de l’IPCC lui-même (AR6 WG1 Table 7.SM.7) a refusé l’accès automatisé.',
  },
  'm3-gwp-andersen': {
    claim: 'PRG à 100 ans (Sulbaek Andersen 2012, J Phys Chem A) : isoflurane 510, desflurane 2540, sévoflurane 130.',
    note: 'Article complet payant ; vérifié dans le résumé des auteurs. L’article BJA 2010 du même groupe donnait d’autres valeurs (desflurane 1620, sévoflurane 210) : ne pas les mélanger.',
  },
  'm3-eu-desflurane': {
    claim: 'Règlement (UE) 2024/573, art. 13(8) : desflurane interdit à partir du 1er janvier 2026, sauf lorsqu’il est strictement nécessaire et qu’aucun autre anesthésique ne peut être utilisé pour des raisons médicales ; l’établissement conserve la justification.',
  },
  'm3-misfill': {
    claim: 'Mauvais liquide dans un vaporisateur à dérivation variable : la concentration délivrée suit le rapport PVS/(Patm−PVS) ; de l’halothane dans un vaporisateur d’isoflurane donne un % similaire mais davantage de CAM.',
    note: 'Modèle du simulateur dérivé de la physique ; à vérifier dans un ouvrage de physique des vaporisateurs.',
  },
  'm3-compartments': {
    claim: 'Modèle de captation : circuit, poumon, cœur, cerveau, rein, foie, muscle, graisse, tissus peu perfusés ; débits et volumes mis à l’échelle selon W^0,75 / W.',
    note: 'Structure et paramètres sont des choix du simulateur. Le résultat est vérifié par rapport à des données mesurées : voir m3-fafi-yasuda.',
  },
  'm3-fafi-yasuda': {
    claim: 'FA/FI après 30 min de concentration inspirée constante : sévoflurane 0,85, isoflurane 0,73 (volontaires). Le simulateur donne 0,865 et 0,731.',
    note: 'Vérifié automatiquement par npm run sanity (tolérance ±0,06).',
  },
  'm3-second-gas': {
    claim: 'Effet second gaz : la captation précoce du N2O augmente le FA/FI de l’halogéné.',
    note: 'Sens de l’effet correct ; son amplitude est un choix du simulateur.',
  },
  'm3-prices': {
    claim: 'Coût des médicaments par mL en MAD/EUR/CAD/FCFA.',
    note: 'Non sourcé ; étiqueté « illustratif » dans l’interface.',
  },

  // ── M4 ─────────────────────────────────────────────────────────────
  'm4-marsh': {
    claim: 'Propofol Marsh (jeu adulte) : V1 0,228 L/kg, k10 0,119, k12 0,112, k13 0,0419, k21 0,055, k31 0,0033 /min.',
    note: 'Certains logiciels utilisent k12 = 0,114 ; l’article donne 0,112.',
  },
  'm4-marsh-ke0': {
    claim: 'ke0 de Marsh 0,26 /min (valeur du Diprifusor ; ne figure pas dans Marsh 1991).',
    note: 'Aucune source primaire du ke0 du Diprifusor n’a encore été ouverte.',
  },
  'm4-schnider-ke0': {
    claim: 'ke0 du propofol selon Schnider : 0,456 /min.',
  },
  'm4-schnider': {
    claim: 'Équations de covariables de Schnider (propofol) : V1 4,27 L, V2 18,9 − 0,391(âge − 53) L, V3 238 L, CL1 1,89 + 0,0456(P − 77) − 0,0681(MM − 59) + 0,0264(T − 177), CL2 1,29 − 0,024(âge − 53), CL3 0,836 L/min.',
    note: 'Schnider 1998 est payant : seul le résumé a été ouvert. Trois sources secondaires (tivatci, PyTCI, Westover 2015) concordent exactement avec le code. Les planchers Math.max sont des garde-fous du simulateur.',
  },
  'm4-eleveld-ref': {
    claim: 'Individu de référence d’Eleveld 2018 (35 ans, 170 cm, homme de 70 kg, sans médicament associé) : V1 6,28, V2 25,5, V3 273 L ; CL 1,79, Q2 1,75, Q3 1,11 L/min ; ke0 0,146 /min.',
    note: 'Reproduit par le simulateur (npm run sanity), sauf Q2 : les équations complètes donnent 1,83 L/min pour cet individu, car le facteur d’immaturité de Q2 (1 + 1,30(1 − fQ3mat)) n’est pas normalisé à la référence (même résultat dans tivatci). Vérifié sur le texte intégral le 27/11/2026.',
  },
  'm4-eleveld': {
    claim: 'Propofol Eleveld 2018 (artériel ; référence homme 35 ans, 70 kg, 170 cm) : V1 6,28 L × f(P)/f(70), f = P/(P + 33,6) ; V2 25,5 L × P/70 × exp(−0,0156(âge − 35)) ; V3 273 L × MMG/MMGréf (× exp(−0,0138 âge) avec opioïdes) ; CL 1,79 homme / 2,10 femme × (P/70)^0,75 (× exp(−0,00286 âge) avec opioïdes) ; Q2 1,75 et Q3 1,11 L/min avec allométrie, maturation de Q3 et terme d’immaturité de Q2 ; ke0 0,146 × (P/70)^−0,25 ; Ce50 3,08 × exp(−0,00635(âge − 35)) µg/mL.',
    note: 'Corrigé le 27/11/2026 : Q2 et Q3 n’avaient pas leurs termes de maturation (Q2 trop bas de 4,6 % à la référence, Q3 trop haut de 13 % pour l’enfant de 6 ans). La maturation de la clairance reste omise (≈ 1 dès 1 an). Gamma : l’équation de l’article donne 1,47 jusqu’à Ce50 et 1,89 au-delà, mais le tableau 3 les inverse ; le code suit l’équation (à vérifier dans le supplément).',
  },
  'm4-al-sallami': {
    claim: 'Masse maigre d’Al-Sallami, telle que donnée dans Eleveld 2018 : homme [0,88 + 0,12/(1 + (âge/13,4)^−12,7)] × 9270P/(6680 + 216 IMC) ; femme [1,11 − 0,11/(1 + (âge/7,1)^−1,1)] × 9270P/(8780 + 244 IMC). Sert à ajuster le V3 d’Eleveld.',
    note: 'Vérifiée telle qu’imprimée dans les méthodes d’Eleveld 2018 ; l’article original (Clin Pharmacokinet 2015) est en accès fermé.',
  },
  'm4-minto': {
    claim: 'Équations de covariables de Minto (rémifentanil ; âge, masse maigre de James) : V1 5,1 − 0,0201(âge − 40) + 0,072(MM − 55) L ; V2 9,82 − 0,0811(âge − 40) + 0,108(MM − 55) L ; V3 5,42 L ; CL1 2,6 − 0,0162(âge − 40) + 0,0191(MM − 55) ; CL2 2,05 − 0,0301(âge − 40) ; CL3 0,076 − 0,00113(âge − 40) L/min ; ke0 0,595 − 0,007(âge − 40).',
    note: 'Minto 1997 est payant ; le résumé ne donne que le modèle simple. tivatci et PyTCI concordent avec tous les coefficients. Les planchers Math.max et le plancher de 30 kg de masse maigre sont des garde-fous du simulateur.',
  },
  'm4-james-lbm': {
    claim: 'Masse maigre de James : homme 1,1P − 128(P/T)², femme 1,07P − 148(P/T)² (P kg, T cm). D’après la formule elle-même : la masse maigre culmine vers un IMC de 43 (homme) et 36 (femme), puis diminue quand le poids augmente (dérivation du simulateur).',
    note: 'Le rapport James 1976 (HMSO) n’est pas consultable ; Westover 2015 (PMC4517835) cite la même formule. Les pics d’IMC sont un calcul, pas une donnée publiée.',
  },
  'm4-bis-nmb': {
    claim: 'Chez des volontaires éveillés ayant reçu uniquement un bloc neuromusculaire, le BIS est descendu jusqu’à 44 et 47.',
  },
  'm4-eeg-signatures': {
    claim: 'EEG sous propofol : puissance alpha frontale + ondes lentes/delta ; alpha plus faible chez le sujet âgé ; bouffées-suppressions (burst suppression) aux niveaux profonds.',
    note: 'Le profil alpha frontal + ondes lentes est décrit par Purdon 2013 ; les amplitudes du spectre simulé et l’effet de l’âge ne sont pas encore calibrés.',
  },
  'm4-alpha-pain': {
    claim: 'Une nociception non traitée réduit l’alpha frontal (« alpha dropout »).',
    note: 'Nécessite une source primaire avant d’être présenté comme un fait.',
  },
  'm4-2hz-filter': {
    claim: 'Un filtre passe-haut d’affichage à 2 Hz masque les ondes lentes.',
    note: 'Affirmation non vérifiée issue du pack d’origine.',
  },
  'm4-tci-controller': {
    claim: 'Logique du contrôleur d’AIVOC au site effet.',
    note: 'Contrôleur du simulateur, pas un algorithme de pompe commerciale.',
  },

  // ── M5 ─────────────────────────────────────────────────────────────
  'm5-onset-sites': {
    claim: 'Le délai d’action du rocuronium est plus court à l’orbiculaire de l’œil / au corrugateur du sourcil qu’à l’adducteur du pouce.',
  },
  'm5-tof-09': {
    claim: 'Exclure une curarisation résiduelle par un monitorage quantitatif à l’adducteur du pouce ; poursuivre jusqu’à un rapport de TOF > 0,9.',
  },
  'm5-occupancy': {
    claim: 'L’épuisement (fade) apparaît vers ~75 % d’occupation des récepteurs ; les réponses disparaissent vers 90–95 % (marge de sécurité).',
    note: 'Enseignement classique de Paton & Waud ; les courbes de correspondance sont des choix du simulateur.',
  },
  'm5-sugammadex-doses': {
    claim: 'Sugammadex (adulte) : 4 mg/kg si la récupération a atteint au moins 1–2 PTC ; 2 mg/kg à la réapparition de T2 ; 16 mg/kg pour une décurarisation immédiate (étudiée 3 min après rocuronium 1,2 mg/kg). Obèse : dose calculée sur le poids réel.',
  },
  'm5-sugammadex-renal': {
    claim: 'Sugammadex non recommandé en cas d’insuffisance rénale sévère, y compris en dialyse (clairance de la créatinine < 30 mL/min).',
  },
  'm5-ptc-spacing': {
    claim: 'La stimulation tétanique potentialise les réponses suivantes : il faut espacer les PTC. Le standard de recherche GCRP 2023 sépare les mesures de PTC d’au moins 2 minutes ; le simulateur utilise 2 min.',
    note: 'Corrigé le 27/11/2026 (était 6 min). Standard de recherche, pas une règle clinique.',
  },
  'm5-recurarization': {
    claim: 'Un sugammadex sous-dosé (p. ex. un flacon fixe de 200 mg chez un patient corpulent avec un bloc profond) peut permettre une recurarisation.',
    note: 'Les constantes cinétiques sont des choix du simulateur.',
  },

  // ── M6 ─────────────────────────────────────────────────────────────
  'm6-sono-anatomy': {
    claim: 'Coupe sus-claviculaire : artère subclavière, plexus latéral/superficiel, première côte et plèvre en profondeur.',
    note: 'Clavicule, côtes, artère et veine subclavières sont de vrais maillages BodyParts3D ; les troncs du plexus, leur position et le dôme pleural sont schématiques (absents de l’archive).',
  },
  'm6-anatomy-meshes': {
    claim: 'Les formes des os et des vaisseaux proviennent du modèle BodyParts3D d’homme adulte (côté droit).',
    note: 'Un seul corps d’homme adulte : les vrais patients diffèrent en taille et en position.',
  },
  'm6-us-physics': {
    claim: 'L’image en mode B est calculée : réflexion R = ((Z2 − Z1)/(Z2 + Z1))² à chaque interface, atténuation en dB/cm/MHz, speckle, compensation gain-temps, compression logarithmique. Le cône d’ombre osseux, la ligne pleurale, les lignes A et le renforcement postérieur derrière les vaisseaux découlent de ces règles.',
    note: 'Modèle du simulateur. Les valeurs d’impédance, d’atténuation et de diffusion sont des chiffres typiques de manuels saisis de mémoire ; les règles des lignes A et des réflecteurs forts sont des simplifications.',
  },
  'm6-anisotropy': {
    claim: 'L’aiguille n’est brillante que lorsqu’elle est presque perpendiculaire au faisceau ; une inclinaison de la sonde la fait disparaître.',
    note: 'Modèle du simulateur : la brillance diminue selon exp(−(angle/32°)²) et avec la distance à une coupe de ~1,4 mm ; les deux constantes sont illustratives.',
  },
  'm6-vein-compress': {
    claim: 'La pression de la sonde écrase une veine perméable ; l’artère reste ronde, pulsatile et incompressible. En hypotension profonde (PAS < 60 mmHg), l’artère peut aussi s’écraser : vérifier au Doppler couleur en cas de doute.',
  },
  'm6-last-lipid': {
    claim: 'LAST : émulsion lipidique à 20 %. Plus de 70 kg : bolus ~100 mL en 2–3 min, perfusion ~250 mL en 15–20 min. Moins de 70 kg : bolus ~1,5 mL/kg en 2–3 min, perfusion ~0,25 mL/kg/min. Instable : répéter le bolus, doubler la perfusion. Poursuivre ≥ 15 min après stabilisation ; max 12 mL/kg. Adrénaline : commencer à ≤ 1 µg/kg ; éviter vasopressine, bêtabloquants, inhibiteurs calciques, anesthésiques locaux.',
    note: 'L’ASRA indique que la check-list est en cours de révision, mise à jour attendue début 2027. Le texte antérieur indiquait 200–250 mL et le poids idéal ; corrigé selon la formulation de la check-list. PDF de la check-list relu le 2026-11-27 : l’adrénaline est ≤ 1 µg/kg (était écrit < 1).',
  },
  'm6-pv-loops': {
    claim: 'Les boucles pression–volume (normale, rétrécissement aortique, insuffisance aortique, rétrécissement mitral, insuffisance mitrale) sont calculées par un ventricule à élastance variable dans le temps, des valves de type orifice et un Windkessel à 3 éléments.',
    note: 'Modèle du simulateur. Les concepts sont sourcés (élastance : Suga 1973 ; Windkessel : Westerhof 2009) ; les valeurs des paramètres (Ees 3,0, surfaces valvulaires, R, C) sont ajustées à la main sur des valeurs adultes typiques et ne proviennent pas de ces articles.',
  },
  'm6-elastance-concept': {
    claim: 'Le rapport pression/volume télésystolique (élastance) est largement indépendant de la charge et augmente avec l’inotropisme.',
    note: 'Étude chez le chien ; résumé non disponible sur PubMed, affirmation fondée sur le titre. Le texte intégral doit être vérifié par un relecteur.',
  },
  'm6-windkessel': {
    claim: 'Postcharge modélisée par un Windkessel à 3 éléments (impédance caractéristique + résistance périphérique + compliance).',
  },
  'm6-shock-matrix': {
    claim: 'Agents de première ligne selon le choc : anaphylaxie, adrénaline (vasoconstricteur, inotrope, inhibe l’activation mastocytaire) ; choc septique, cristalloïdes puis noradrénaline, avec ajout de vasopressine si les doses de noradrénaline augmentent ; hémorragie, arrêter le saignement et transfuser, noradrénaline seulement transitoire si les cibles d’hypotension permissive ne sont pas atteintes.',
    note: 'La ligne « choc cardiogénique » (inotrope selon le contexte) n’a pas été vérifiée dans une recommandation.',
  },

  // ── M7 ─────────────────────────────────────────────────────────────
  'm7-anatomy-meshes': {
    claim: 'Les vertèbres T4–T9, L2–L5, le sacrum et les disques sont de vrais maillages BodyParts3D ; le contact osseux est détecté par lancer de rayons (ray-casting) de l’aiguille sur ces maillages.',
    note: 'Un seul homme adulte en position debout ; le canal rachidien est mesuré à partir de ces os.',
  },
  'm7-shingling': {
    claim: 'Au niveau thoracique moyen, les épineuses sont très inclinées : une aiguille médiane guidée par la pointe de l’épineuse bute souvent sur l’os, on préfère en général un abord paramédian ; en lombaire, elles sont presque horizontales.',
    note: 'Partie thoracique sourcée ; la partie lombaire est sous-entendue, pas écrite, dans les sources ouvertes. La géométrie découle aussi des maillages réels (npm run sanity).',
  },
  'm7-paramedian': {
    claim: 'Abord paramédian : point d’entrée à environ 1 cm en dehors et 1 cm sous l’épineuse (lombaire et thoracique), aiguille orientée d’environ 10–15° vers la ligne médiane (simulateur 12°) ; toucher la lame puis glisser au-dessus de son bord supérieur dans le ligament jaune. Distances et angles varient selon les sources et la morphologie.',
    note: 'Corrigé le 27/11/2026 : l’entrée thoracique est aussi 1 cm plus bas ; angle médial donné en fourchette.',
  },
  'm7-depths': {
    claim: 'La profondeur peau–espace péridural est calculée le long de l’aiguille ; avec 15 mm de tissus mous en regard des apophyses épineuses, le trajet L3–L4 par défaut atteint l’espace péridural à ~44 mm. Référence : médiane 4,7 cm (L3–4 : 4,93 cm) chez 1000 parturientes.',
    note: 'La valeur publiée sert de comparaison ; la profondeur simulée dépend du curseur de tissus mous et de l’anatomie du modèle.',
  },
  'm7-soft-tissue-dims': {
    claim: 'Tissus mous placés à partir du canal mesuré : ligament jaune 4 mm (lombaire) / 2,5 mm (thoracique), espace péridural postérieur 5 / 3 mm, demi-largeur du sac dural 8 / 7 mm, moelle 9 × 7 mm.',
    note: 'VERIFY : à comparer à des mesures IRM/cadavériques. Absent de l’archive anatomique.',
  },
  'm7-flexion': {
    claim: 'La flexion ajoute jusqu’à 6° par segment mobile lombaire et 2° par segment thoracique, en faisant pivoter chaque vertèbre autour de son disque ; cela ouvre les fenêtres interlamaires.',
    note: 'Le centre de rotation et les amplitudes sont des simplifications.',
  },
  'm7-lor': {
    claim: 'La résistance à l’injection est forte dans le ligament jaune et chute brutalement à l’entrée dans l’espace péridural (perte de résistance). Elle peut être faussement positive (ex. espace paravertébral). Les résistances affichées (0–100) sont illustratives.',
    note: 'Énoncé qualitatif sourcé ; l’échelle 0–100 est celle du simulateur.',
  },
  'm7-fluoro': {
    claim: 'Image de l’amplificateur de brillance = projection de Beer–Lambert (I = exp(−Σ μ·L)) des mêmes maillages depuis une source ponctuelle située à 0,6 m ; dense = sombre.',
    note: 'Modèle du simulateur ; les coefficients d’atténuation sont illustratifs, non calibrés pour une tension de tube.',
  },

  // ── M8 ─────────────────────────────────────────────────────────────
  'm8-bronchus-lengths': {
    claim: 'Longueur de la bronche souche : homme 49 ± 8 mm à gauche / 19 ± 6 mm à droite ; femme 44 ± 7 / 15 ± 5 mm. Utilisée pour l’anatomie « Homme moyen / Femme moyenne » (le trajet 3D est remis à l’échelle à ces longueurs). « Bronche souche gauche courte » utilise 38 mm.',
    note: 'La variante « courte » à 38 mm est un choix pédagogique sous le seuil de 40 mm de Yao 2019.',
  },
  'm8-margin': {
    claim: 'Marge de sécurité d’une DLT gauche = longueur de la bronche souche gauche − 30 mm (bord proximal du ballonnet gauche → extrémité de la lumière gauche) ; en moyenne 16–19 mm.',
  },
  'm8-dlt-depth': {
    claim: 'Profondeur moyenne d’une DLT gauche : 29 cm pour une taille de 170 cm ; ±1 cm par tranche de 10 cm de taille, avec le bord supérieur du ballonnet bronchique juste sous la carène. Le simulateur place le bord supérieur du ballonnet 5 mm sous la carène à cette profondeur.',
    note: 'Le décalage de 5 mm utilisé pour calibrer la distance incisives–carène est un choix du simulateur.',
  },
  'm8-roll-shift': {
    claim: 'Le passage du décubitus dorsal au décubitus latéral fait reculer la DLT de 6,3 ± 5,5 mm (orifice trachéal ↔ carène ; 2,4 ± 3,6 mm côté bronchique) ; > 5 mm dans 48 % des cas. Migration par défaut 6,3 mm, réglable de 0 à 20 mm.',
    note: 'Le simulateur déplace toute la sonde en bloc de la valeur mesurée côté trachéal.',
  },
  'm8-short-lmb': {
    claim: 'Une bronche souche gauche < 40 mm est associée à une désaturation pendant la ventilation unipulmonaire (OR 8,087).',
  },
  'm8-left-preferred': {
    claim: 'Les DLT gauches sont préférées car leur marge de sécurité est beaucoup plus large que celle des sondes droites (origine de la bronche lobaire supérieure droite proche de la carène).',
  },
  'm8-severinghaus': {
    claim: 'SaO2 à partir de la PaO2 : S = 1 / (23400 / (PO2³ + 150·PO2) + 1).',
  },
  'm8-gas-exchange': {
    claim: 'PaO2 = équation des gaz alvéolaires (PB 760, PH2O 47, PaCO2 40, R 0,8) + mélange par le shunt : CaO2 = Cc′O2 − Qs/Qt · VO2/Qt, avec Hb 13,5 g/dL, VO2 250 mL/min, Qt 5 L/min, shunt de base 5 %.',
    note: 'Modèle du simulateur construit à partir d’équations de manuels ; Hb, VO2, Qt et le shunt de base de 5 % sont des valeurs illustratives fixes.',
  },
  'm8-perfusion': {
    claim: 'Perfusion lobaire ∝ taille du lobe ; le décubitus latéral pondère le poumon déclive ×1,4 et le poumon supérieur ×0,75 ; la vasoconstriction pulmonaire hypoxique (HPV) supprime jusqu’à 80 % du débit vers un lobe non ventilé (curseur 0–100 %).',
    note: 'Le sens des effets est classique (Lumb & Slinger 2015, doi:10.1097/ALN.0000000000000569) ; les pondérations ne sont pas des valeurs mesurées.',
  },
  'm8-lobe-share': {
    claim: 'Taille des lobes = volume de l’enveloppe convexe de l’arbre bronchique segmentaire de chaque lobe dans le spécimen 3D (LSD 13 %, LMD 8 %, LID 28 %, LSG 23 %, LIG 28 %).',
    note: 'Dérivé des voies aériennes d’un seul spécimen, pas de volumes pulmonaires.',
  },
  'm8-mechanics': {
    claim: 'Volume contrôlé, débit carré, I:E 1:2 : Pplat = PEP + VT / C (C 50 mL/cmH2O pour les deux poumons, partagée entre les lobes ventilés) ; Ppic ajoute la chute de pression dans la lumière (la plus grande des valeurs de Poiseuille et de Blasius) et une résistance des voies aériennes de 5 cmH2O/L/s ÷ perméabilité² ; limite de pression 60 cmH2O.',
    note: 'La compliance, la résistance et la longueur de la lumière (0,38 m) sont illustratives.',
  },
  'm8-cuff': {
    claim: 'Ballonnet bronchique : manchon de 15 mm, V = π/4 (D² − d0²) L ; étanche lorsque son diamètre libre atteint celui de la bronche ; la pression augmente de 1 cmH2O par 0,04 mL au-delà du contact ; > 30 cmH2O signalé.',
    note: 'La longueur du ballonnet, sa compliance et l’espacement de 45 mm entre le ballonnet et l’orifice trachéal sont illustratifs.',
  },
  'm8-dlt-od': {
    claim: 'Diamètre externe de la sonde double lumière = Fr / 3 : 35/37/39/41 Fr = 11,7/12,3/13,0/13,7 mm.',
    note: 'Shiley donne un seul diamètre interne limitant par taille : 4,8/5,1/5,3/5,4 mm.',
  },
  'm8-lumen-sizes': {
    claim: 'Diamètres internes par lumière (trachéale 4,5/4,7/4,9/5,4, bronchique 4,3/4,5/4,7/4,8 mm) et diamètre externe du segment bronchique (9,5/10,0/10,1/10,6 mm), utilisés pour la résistance des lumières et la sonde 3D.',
    note: 'Les fabricants ne publient pas de diamètres séparés par lumière ; les dimensions varient selon la marque. Hegland 2019 a mesuré 9,0–11,2 mm pour le segment bronchique.',
  },
  'm8-anatomy': {
    claim: 'Voies aériennes 3D : trachée, bronches souches, lobaires et segmentaires BodyParts3D d’un homme adulte ; lignes centrales, calibres, carène et orifices lobaires mesurés sur les maillages (trachée 110 mm, bronche souche gauche 62 mm, orifice lobaire supérieur droit à 25–34 mm de la carène).',
    note: 'Mesures d’un seul spécimen. La longueur de la trachée est proche de la moyenne masculine de 109,5 ± 8,9 mm (Adhikari 2025, doi:10.1186/s13037-025-00450-2).',
  },
  'm8-scope-optics': {
    claim: 'Image du bronchoscope : objectif grand-angle 120° (fisheye équidistant), lumière à l’extrémité avec décroissance en inverse du carré de la distance, anneaux cartilagineux espacés de 4,2 mm, absents sur la paroi membraneuse postérieure ; la SpO2 suit la PaO2 avec un retard de 30 s.',
    note: 'Choix de rendu ; l’espacement des anneaux et le retard de la SpO2 ne sont pas des valeurs mesurées.',
  },

  // ── M9 ─────────────────────────────────────────────────────────────
  'm9-dynamics': {
    claim: 'Dans les scénarios de crise, les signes vitaux tendent de façon exponentielle (constantes de temps 20–240 s) vers des cibles scriptées : sans traitement → dégradation, étapes conformes aux recommandations → amélioration.',
    note: 'Formes pédagogiques, pas des évolutions temporelles mesurées. Seules les étapes et les doses proviennent des recommandations.',
  },
  'm9-last-steps': {
    claim: 'LAST : appeler à l’aide, apporter le kit LAST, envisager d’alerter l’équipe de CEC, envisager tôt l’émulsion lipidique. Convulsions : assurer la liberté des voies aériennes, benzodiazépine préférée ; si seul le propofol est disponible, petites doses (p. ex. par paliers de 20 mg). Une fois stable, surveiller 2 h après une convulsion et 4–6 h après une instabilité cardiovasculaire.',
    note: '« Arrêter l’injection » ne figure pas sur la check-list et n’est pas utilisé comme étape.',
  },
  'm9-mh-steps': {
    claim: 'HM : augmentation inexpliquée de l’EtCO2 avec tachycardie et augmentation de la consommation d’O2 (l’élévation de la température est tardive) ; les agents déclenchants sont tous les halogénés et la succinylcholine. Appeler à l’aide, noter l’heure, apporter le dantrolène, viser à terminer la chirurgie ; vaporisateurs fermés et retirés, O2 100 % au débit maximal, ventilation minute × 2–3, filtres à charbon activé (changer la chaux sodée/le circuit n’est pas une priorité) ; passer à une TIVA + curare non dépolarisant ; refroidissement actif (solutés IV froids, glace aux aisselles et aux plis inguinaux) ; monitorage invasif, diurèse > 2 mL/kg/h et pH urinaire > 7 ; gaz du sang artériel, K+, CK (pic à 12–24 h) ; soins critiques et adressage à un centre de référence.',
    note: 'Hopkins PM et al. Anaesthesia 2021;76:655-64 (la recommandation complète de l’Association) n’a pas pu être ouverte (contrôle anti-robot) ; seul son résumé a été lu.',
  },
  'm9-mh-dantrolene': {
    claim: 'Dantrolène 2–3 mg/kg IV (adulte ~200 mg), puis 1 mg/kg toutes les 5 min jusqu’à EtCO2 < 6 kPa et T < 38,5 °C ; la dose de 10 mg/kg peut être dépassée. Bicarbonate 50 mmol si pH < 7,2 malgré l’hyperventilation ; hyperkaliémie : 50 mL de glucosé à 50 % + 10 UI d’insuline, calcium 0,1 mmol/kg uniquement in extremis ; arythmie : amiodarone ou bêtabloquant, éviter les inhibiteurs calciques.',
    note: 'L’EMHG v2024 diffère : 2–2,5 mg/kg (poids réel, ≤ 300 mg par dose) répétés en dose complète toutes les 10 min jusqu’à PaCO2 < 6 kPa et baisse de la température centrale (contenu obtenu sous forme résumée — à vérifier avant de citer). L’application affiche le schéma du QRH et indique la différence avec l’EMHG.',
  },
  'm9-anaph-steps': {
    claim: 'Anaphylaxie : appeler à l’aide, noter l’heure, arrêter la chirurgie non essentielle ; retirer les déclencheurs probables (antibiotiques, curares, bleu patenté, chlorhexidine, colloïdes) et entretenir l’anesthésie avec un halogéné ; O2 100 %, sécuriser les voies aériennes, surélever les jambes ; bolus d’adrénaline, perfusion après trois bolus ; remplissage rapide par cristalloïdes ; tryptase, soins critiques, signalement de l’allergie et adressage en allergologie. L’hydrocortisone et la chlorphénamine ne font plus partie du traitement aigu.',
  },
  'm9-anaph-adrenaline': {
    claim: 'Grade III (adulte, IV) : adrénaline 50 µg (100 µg en l’absence de réponse aux autres vasopresseurs ou bronchodilatateurs) ; pas de réponse à 2 min → 200 µg toutes les 2 min ; cristalloïde 1 L, à répéter jusqu’à 30 mL/kg. Perfusion 0,05–0,1 µg/kg/min après > 3 bolus. Grade IV : 1 mg selon l’ALS. RCP si PAS < 50 mmHg (à envisager si EtCO2 < 20 mmHg). Réfractaire (> 10 min) : noradrénaline 0,05–0,5 µg/kg/min, vasopressine 1–2 UI, glucagon 1–2 mg si traitement par bêtabloquant, ECLS. Le sugammadex n’a pas de rôle immédiat ; éviter la prométhazine IV. Tryptase à 1 h et à 2–4 h, valeur de base ≥ 24 h ; surveillance ≥ 6 h.',
    note: 'L’ANZAAG 2022 utilise des fourchettes légèrement différentes (grade 3 : 50–100 µg, jusqu’à 200 µg toutes les 1–2 min).',
  },
  'm9-das-plans': {
    claim: 'DAS 2025 (adulte) : Plan A ≤ 3 tentatives + 1 par un collègue plus expérimenté, confirmer par capnographie (courbe) ; déclarer l’échec à la fin de chaque plan ; Plan B DSG de 2e génération (≤ 3 tentatives), pas d’intubation à l’aveugle à travers le DSG, si l’oxygénation est assurée, s’arrêter et réfléchir ; Plan C dernière tentative de ventilation au masque facial, réveiller le patient si elle réussit ; en cas d’échec, assurer une curarisation complète et déclarer la situation CICO ; Plan D scalpel–bougie–sonde (lame n° 10, bougie béquillée, sonde à ballonnet 6,0 mm), cou en extension, poursuivre l’O2 par les voies aériennes supérieures ; incision cutanée verticale (jusqu’à 8 cm) par défaut lorsque la membrane n’est pas clairement palpable.',
    note: 'CC BY-NC-ND 4.0 ; les figures de l’algorithme DAS sont exclues de la licence et ne sont pas reproduites. Étapes paraphrasées.',
  },
  'm9-arrest-als': {
    claim: 'Rythme choquable : appeler l’équipe ; chocs uniques avec cycles de RCP de 2 min (premier choc biphasique ≥ 150 J, augmenter en cas d’échec) ; adrénaline 1 mg IV après le 3e choc, puis toutes les 3–5 min (patient monitoré avec un cathéter artériel : paliers de 50–100 µg) ; amiodarone 300 mg après 3 chocs, 150 mg après 5 (ou lidocaïne 100 mg, + 50 mg) ; 10 insufflations/min avec une sonde d’intubation ou un DSG et capnographie (courbe) ; pas de calcium, de bicarbonate ni de corticoïdes en routine.',
    note: 'Adaptation britannique ; le chapitre ALS de l’ERC 2025 lui-même était bloqué par un contrôle anti-robot. À vérifier par rapport au texte de l’ERC avant tout enseignement hors Royaume-Uni.',
  },
  'm9-arrest-cpr': {
    claim: 'Compressions 100–120/min, 5–6 cm, relâchement complet, 30:2 sans voie aérienne avancée ; pauses minimales (< 5 s pour le choc et l’intubation). Causes réversibles : hypoxie, hypovolémie, troubles électrolytiques, hypothermie ; tamponnade, pneumothorax sous tension, thrombose, toxiques.',
    note: 'Les chapitres ERC 2025 eux-mêmes n’ont pas été ouverts (adaptation RCUK lue).',
  },
  'm9-bleed-esaic': {
    claim: 'Saignement périopératoire grave (ESAIC 2023) : saignement massif précoce non contrôlé en chirurgie programmée → transfusion massive avec un rapport plasma:CGR ≥ 1:1 (2C) ; passer dès que possible à une stratégie guidée par objectifs (1C) ; CCP plutôt que PFC en cas de déficit en facteurs (1B) ; calcium pendant la transfusion massive pour le maintenir > 0,9 mmol/L ; maintenir la normothermie ; Hb 7–9 g/dL pendant le saignement actif (1B) ; cristalloïdes balancés (2C) ; rFVIIa uniquement pour un saignement incoercible avec correction du pH (2B). Acide tranexamique (TXA) : post-partum 1 g IV dans les 3 h (1B), chirurgie gynécologique 1 g ou 10–15 mg/kg (1C) ; pas de dose générale unique.',
    note: 'Le seuil de fibrinogène ≤ 1,5 g/L de l’ESAIC figure dans la section de chirurgie cardiaque ; il n’est donc pas affiché ici sous forme de nombre.',
  },
  'm9-ecl-steps': { claim: 'Éclampsie (OMS MCPC 2017, S-49–S-58) : appeler à l’aide, ne jamais laisser la femme seule ; si elle convulse, décubitus latéral gauche, la protéger sans la contenir ; voies aériennes, O₂ 4–6 L/min (ballon-masque si elle ne respire pas) ; traiter les convulsions comme une éclampsie tant qu’une autre cause n’est pas trouvée ; pré-éclampsie sévère et éclampsie se traitent de la même façon, mais la naissance doit avoir lieu dans les 12 h suivant le début des convulsions ; sonde urinaire et bilan hydrique strict ; diurèse < 30 ml/h → suspendre le magnésium et perfuser 1 L en 8 h ; crépitants → arrêter les apports, furosémide 40 mg IV une fois.' },
  'm9-ecl-mg': { claim: 'Sulfate de magnésium (OMS MCPC 2017, encadré S-4), médicament de choix des convulsions de la pré-éclampsie sévère et de l’éclampsie. Schéma IM : 4 g de solution à 20 % IV en 5 min, puis 10 g à 50 % IM (5 g dans chaque fesse avec 1 ml de lidocaïne 2 %) ; entretien 5 g IM toutes les 4 h. Schéma IV : charge de 4 g à 50 % IV, puis 1 g/h. Récidive après 15 min : 2 g à 50 % IV en 5 min. Poursuivre 24 h après la naissance ou la dernière convulsion (la plus tardive).', note: 'Les valeurs nationales diffèrent (Maroc 2014 : 4,5 g en 20–30 min) : affichées dans la note locale.' },
  'm9-ecl-tox': { claim: 'Toxicité du magnésium (OMS MCPC 2017, encadré S-5) : avant chaque dose, vérifier FR ≥ 16/min, réflexes rotuliens présents, diurèse ≥ 30 ml/h sur 4 h ; sinon suspendre ou retarder. Arrêt respiratoire : ventilation assistée et gluconate de calcium 1 g (10 ml à 10 %) IV lente en 3 min.' },
  'm9-ecl-bp': { claim: 'Hypertension sévère de la grossesse (OMS MCPC 2017, tableau S-13) : traiter si PAS ≥ 160 et/ou PAD ≥ 110 mmHg ; garder la PA au-dessus des limites basses de la normale. Hydralazine 5 mg IV lente, toutes les 5 min jusqu’à l’objectif, 20 mg/24 h au plus. Labétalol 10 mg IV, 20 mg à 10 min si insuffisant, puis 40 et 80 mg toutes les 10 min, 300 mg au plus (pas en cas d’insuffisance cardiaque, de choc hypovolémique ou d’asthme). Nifédipine LI 5–10 mg per os, à renouveler à 30 min, 30 mg au plus.' },
  'm9-pph-steps': { claim: 'HPP : stade selon les pertes mesurées quelles que soient les constantes (se fier aux constantes retarde le traitement) ; causes = 4 T (tonus, tissu, traumatisme, thrombine) ; compression bimanuelle en attendant l’effet des médicaments ; vidange vésicale ; évacuer les caillots du segment inférieur ; 2 voies veineuses de gros calibre, O₂ 8–10 L/min, réchauffement de la patiente et des solutés. Check-list SMAR stade 1 (500–1000 ml) : noter l’heure, appeler obstétricien, sage-femme, anesthésie ; 2 VVP 14–16 G ; délivrance artificielle, révision utérine, examen sous valves.' },
  'm9-pph-oxytocin': { claim: 'Ocytocine dans l’HPP (SOGC 431, tableau 3) : 3 UI en IV rapide ou 10 UI IM ; perfusion de 20–40 UI/l, au plus 1 UI/min pendant 4 min, puis 7,5–15 UI/h une fois le tonus obtenu. SMAR : 40 UI en 30 min.', note: 'Les doses nationales diffèrent (CNGOF/SFAR 5–10 UI, ≤ 40 UI cumulées) : affichées côte à côte ; le simulateur utilise le plafond SOGC du bolus IV.' },
  'm9-pph-txa': { claim: 'Acide tranexamique dans l’HPP : 1 g IV dans les 3 h suivant la naissance (ESAIC 2023, 1B) ; SOGC : 1 g IV en 30–60 s, renouvelable toutes les 30 min, 2 doses au plus ; associé aux utérotoniques de 2e ligne dans toute HPP active.' },
  'm9-pph-second': { claim: 'Utérotonique de 2e ligne si le premier agent n’a pas rétabli le tonus en 4 min (SOGC). Ergométrine : pas en cas d’hypertension essentielle ou gravidique ni sous inhibiteurs de protéase du VIH. Carboprost : IM ou intramyométrial uniquement, jamais IV ; risque de bronchospasme. Ballonnet de Bakri 300–500 ml : évite d’autres gestes dans 75–95 % des cas ; puis embolisation ou chirurgie, en maintenant la compression bimanuelle.' },
  'm9-monitor-ecg': { claim: 'L’ECG D2 du moniteur suit le modèle ECGSYN : cinq ondes gaussiennes (P, Q, R, S, T) dans la phase cardiaque, angles par défaut −60, −15, 0, 15, 90°, amplitudes 1,2, −5, 30, −7,5, 0,75 et largeurs 0,25, 0,1, 0,1, 0,1, 0,4 rad ; les largeurs varient avec √(FC/60), donc le QT raccourcit quand la fréquence monte.', note: 'Réimplémentation indépendante de l’équation. Le texte de la page PhysioNet donne P et T à −70° et 100° ; le code de référence utilise −60° et 90°, valeurs retenues ici.' },
  'm9-monitor-waves': { claim: 'Tracés de pression artérielle, de pléthysmographie et de capnographie : la forme reproduit les repères classiques (montée systolique, incisure dicrote, décroissance diastolique ; phases I–III du capnogramme et descente inspiratoire, I:E ≈ 1:2), mise à l’échelle des valeurs affichées.', note: 'Forme seulement, pas un modèle physiologique ajusté ; les valeurs viennent du modèle du scénario.' },
  'm9-pph-blood': { claim: 'Réanimation de l’HPP (SOGC 431) : Ringer lactate 1–2 ml par ml perdu au début (les grands volumes de cristalloïdes causent une coagulopathie de dilution) ; Hb 70–90 g/l pendant l’hémorragie active ; protocole de transfusion massive 1:1:1 ou 2:1:1 ; fibrinogène à remplacer s’il est < 2 g/l.' },
  'm9-bleed-team': {
    claim: 'En cas d’hémorragie massive : appeler à l’aide et noter l’heure, déclencher le protocole de transfusion massive (une personne dédiée au lien avec la banque de sang), contrôler tout saignement visible et convenir d’un plan avec l’équipe chirurgicale (radiologie interventionnelle si besoin).',
  },

  // ── M10 ────────────────────────────────────────────────────────────
  'm10-asa': {
    claim: 'Classe ASA : I patient normal en bonne santé ; II maladie systémique légère ; III maladie systémique sévère ; IV maladie systémique sévère constituant une menace vitale permanente ; V moribond, ne devant pas survivre sans l’intervention ; VI mort encéphalique déclarée, prélèvement d’organes. Ajouter « E » lorsqu’un délai augmenterait nettement la menace pour la vie ou un membre.',
    note: 'Vérifier que la réédition 2026 garde ces définitions.',
  },
  'm10-rcri': {
    claim: 'RCRI : 6 facteurs, 1 point chacun (chirurgie à haut risque = intrapéritonéale, intrathoracique ou vasculaire sus-inguinale ; cardiopathie ischémique ; insuffisance cardiaque ; maladie cérébrovasculaire ; insuline ; créatinine > 2,0 mg/dL). Taux de complications cardiaques majeures intrahospitalières dans la cohorte de validation : 0 → 0,4 %, 1 → 0,9 %, 2 → 6,6 %, ≥ 3 → 11,0 %.',
    note: 'Cohorte ≥ 50 ans, chirurgie programmée, un seul hôpital.',
  },
  'm10-rcri-esc': {
    claim: 'ESC 2022 : aucun score de risque unique recommandé ; RCRI 0/1/2/≥3 → 4/6/10/15 % de décès, infarctus du myocarde ou arrêt cardiaque à 30 jours ; l’incapacité à monter deux étages apporte une information supplémentaire ; ECG chez les ≥ 65 ans ou en cas de maladie ou de facteurs de risque cardiovasculaires avant une chirurgie à risque intermédiaire/élevé ; troponine hs (classe I) et/ou BNP/NT-proBNP (classe IIa).',
  },
  'm10-stopbang': {
    claim: 'STOP-Bang : 8 items oui/non (ronflement, fatigue, apnées observées, hypertension, IMC > 35, âge > 50 ans, tour de cou ≥ 40 cm, sexe masculin). 0–2 faible, 3–4 intermédiaire, 5–8 élevé ; également élevé si ≥ 2 items STOP + sexe masculin, IMC > 35 ou tour de cou ≥ 40 cm. Score ≥ 3 : sensibilité 93 % (IAH > 15), spécificité 31 %.',
    note: 'Seuil du tour de cou à 40 cm comme sur stopbang.ca ; aucun seuil spécifique au sexe n’a été trouvé dans les sources consultées.',
  },
  'm10-apfel': {
    claim: 'Score simplifié d’Apfel (NVPO) : sexe féminin, antécédent de NVPO ou de mal des transports, non-fumeur, opioïdes postopératoires. 0/1/2/3/4 facteurs → 10/21/39/61/79 % de nausées ou vomissements dans les 24 h (anesthésie par inhalation, sans prophylaxie) ; les auteurs suggèrent une prophylaxie à partir de 2 facteurs.',
    note: 'Le nombre d’agents prophylactiques selon le risque (Gan 2020) n’est pas encore vérifié, donc non affiché.',
  },
  'm10-ariscat': {
    claim: 'ARISCAT : âge (51–80 : 3 ; > 80 : 16), SpO2 (91–95 % : 8 ; ≤ 90 % : 24), infection respiratoire le mois précédent 17, Hb ≤ 10 g/dL 11, incision abdominale haute 15 / intrathoracique 24, durée 2–3 h 16 / > 3 h 23, urgence 8. < 26 faible (1,6 %), 26–44 intermédiaire (13,3 %), ≥ 45 élevé (42,1 %) dans le sous-échantillon de validation.',
    note: 'Taux du sous-échantillon de validation (échantillon de développement : 0,7 / 6,3 / 44,9 %). Le tableau 6 indique Hb ≤ 10.',
  },
  'm10-fasting-adult': {
    claim: 'Adultes : liquides clairs jusqu’à 2 h (thé/café avec jusqu’à ~1/5 de lait comptent comme liquides clairs), solides 6 h ; ne pas annuler pour un chewing-gum, un bonbon ou le tabac. Les adultes en bonne santé peuvent boire des liquides clairs glucidiques (jusqu’à 400 mL) jusqu’à 2 h avant la chirurgie.',
    note: 'La mise à jour adulte de l’ESAIC n’est encore qu’un protocole (2026).',
  },
  'm10-fasting-child': {
    claim: 'Enfants : liquides clairs jusqu’à 1 h, lait maternel 3 h, lait infantile ou lait non humain 4 h avant l’induction.',
  },
  'm10-glp1': {
    claim: 'Agonistes des récepteurs du GLP-1 : décision partagée ; poursuivre en l’absence de critères de haut risque (phase d’augmentation de dose, dose élevée, administration hebdomadaire, symptômes digestifs, autres causes de vidange gastrique retardée). En cas d’interruption : le jour de la chirurgie (traitements quotidiens) ou une semaine avant (hebdomadaires). Régime liquide ≥ 24 h en cas de doute ; envisager une échographie gastrique ; en cas de contenu gastrique résiduel, discuter une induction en séquence rapide ou un report.',
  },
  'm10-cases': {
    claim: 'Les trois cas cliniques sont des cas pédagogiques fictifs ; les corrigés leur appliquent les scores publiés.',
  },
};
