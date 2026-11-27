import { useMemo } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  HelpCircle,
  Presentation,
  ShieldAlert,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import type { LocaleCode } from '../standards/clinicalStandards';
import type { AppModuleId } from '../standards/programmeTypes';
import { CLAIMS, claimsForModule, statusCounts } from '../standards/claimRegistry';
import { DOMAINS } from '../standards/curriculum';
import { PROGRAMMES } from '../standards/programmes';
import { OFFICIAL_RESOURCES } from '../standards/officialResources';
import { GROUPS, MODULE_GUIDES } from '../standards/moduleGuides';

interface Props {
  locale: LocaleCode;
  onOpen: (id: AppModuleId) => void;
  onOpenCurriculum: () => void;
  onOpenEvidence: () => void;
}

/** Landing page: what the app is, who it is for, how to use it, and where everything is. */
export function HomePage({ locale, onOpen, onOpenCurriculum, onOpenEvidence }: Props) {
  const fr = locale !== 'en-INT';
  const L = (f: string, e: string) => (fr ? f : e);
  const T = (x: { fr: string; en: string }) => (fr ? x.fr : x.en);

  const total = useMemo(() => statusCounts(CLAIMS), []);
  const coverage = useMemo(() => {
    const c = { covered: 0, partial: 0, gap: 0 };
    for (const d of DOMAINS) c[d.coverage]++;
    return c;
  }, []);

  const audiences = [
    {
      icon: <GraduationCap className="w-5 h-5 text-cyan-300" />,
      who: L('Résidents / internes', 'Residents'),
      what: L(
        'Suivez votre programme officiel étape par étape, comprenez la physique et la pharmacologie en manipulant, entraînez-vous aux crises et aux scores avant la garde.',
        'Follow your official programme stage by stage, understand physics and pharmacology hands-on, practise crises and scores before call.',
      ),
    },
    {
      icon: <Presentation className="w-5 h-5 text-indigo-300" />,
      who: L('Enseignants', 'Teachers'),
      what: L(
        'Projetez un appareil ouvert, une panne à l’aveugle ou une crise ; partagez le réglage exact par QR code ; débriefez avec la source de chaque étape.',
        'Project an open machine, a blind fault or a crisis; share the exact setup by QR code; debrief with the source of each step.',
      ),
    },
    {
      icon: <Stethoscope className="w-5 h-5 text-emerald-300" />,
      who: L('Anesthésistes et IADE', 'Anaesthetists and nurse anaesthetists'),
      what: L(
        'Révisez un algorithme de crise, un modèle d’AIVOC ou la vérification de l’appareil ; retrouvez les recommandations nationales dans la bibliothèque.',
        'Refresh a crisis algorithm, a TCI model or the machine checkout; find the national guidelines in the library.',
      ),
    },
  ];

  const steps = [
    {
      n: 1,
      title: L('Choisissez votre programme', 'Choose your programme'),
      text: L(
        'Maroc, France, Canada/Québec ou Europe : votre maquette officielle, découpée en étapes, avec les simulateurs à faire pour chaque compétence.',
        'Morocco, France, Canada/Québec or Europe: your official programme, split into stages, with the simulators to do for each competency.',
      ),
      action: () => onOpen('M11'),
      cta: L('Ouvrir les programmes', 'Open programmes'),
    },
    {
      n: 2,
      title: L('Travaillez un module', 'Work through a module'),
      text: L(
        'Chaque module commence par son mode d’emploi : ce que vous apprenez, comment l’utiliser, ce qu’il faut observer.',
        'Each module opens with its guide: what you learn, how to use it, what to watch for.',
      ),
      action: () => onOpen('M1_M2'),
      cta: L('Commencer par l’appareil', 'Start with the machine'),
    },
    {
      n: 3,
      title: L('Entraînez-vous aux crises', 'Train for crises'),
      text: L(
        'Crises en temps réel avec moniteur, gestes dans l’ordre, doses au poids et débriefing sourcé. Votre progression reste sur cet appareil.',
        'Real-time crises with a monitor, ordered actions, weight-based doses and a sourced debrief. Your progress stays on this device.',
      ),
      action: () => onOpen('M9'),
      cta: L('Ouvrir la gestion de crise', 'Open crisis management'),
    },
  ];

  const statusTiles: { key: keyof typeof total; label: string; text: string; cls: string }[] = [
    {
      key: 'sourced',
      label: L('Sourcé', 'Sourced'),
      text: L('Vérifié sur la source ouverte (article, recommandation, norme).', 'Checked against the opened source (paper, guideline, standard).'),
      cls: 'border-emerald-700/60 bg-emerald-950/30 text-emerald-200',
    },
    {
      key: 'from-memory',
      label: L('À vérifier', 'To verify'),
      text: L('Valeur usuelle pas encore confrontée au texte original : à prendre avec prudence.', 'Usual value not yet checked against the original text: use with caution.'),
      cls: 'border-amber-700/60 bg-amber-950/30 text-amber-200',
    },
    {
      key: 'illustrative',
      label: L('Illustratif', 'Illustrative'),
      text: L('Choix du simulateur pour l’enseignement (« modèle du simulateur »), pas une donnée clinique.', 'Simulator choice for teaching (“simulator model”), not clinical data.'),
      cls: 'border-slate-600 bg-slate-900/60 text-slate-300',
    },
  ];

  return (
    <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 py-6 space-y-8 text-slate-200">
      {/* What it is */}
      <section className="space-y-3">
        <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
          {L('Simulateur d’enseignement de l’anesthésie-réanimation', 'Anaesthesia teaching simulator')}
        </h2>
        <p className="text-sm md:text-base text-slate-300 max-w-3xl">
          {L(
            'Gratuit, sans compte, utilisable hors ligne. Il montre en 3D et en temps réel ce qui se passe dans l’appareil d’anesthésie, chez le patient et dans les médicaments, et relie chaque notion à votre programme officiel et à sa source.',
            'Free, no account, works offline. It shows in real-time 3D what happens in the anaesthesia machine, in the patient and with the drugs, and links each topic to your official programme and its source.',
          )}
        </p>
        <div className="flex items-start gap-2 rounded-xl border border-amber-600/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-100 max-w-3xl">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            {L(
              'Outil pédagogique, pas un dispositif médical. Il ne sert pas à décider d’un traitement : suivez les protocoles de votre établissement et les recommandations en vigueur.',
              'A teaching tool, not a medical device. Do not use it to make treatment decisions: follow your institution’s protocols and current guidelines.',
            )}
          </span>
        </div>
      </section>

      {/* How to use */}
      <section>
        <h3 className="text-sm uppercase tracking-wide text-cyan-300 font-semibold mb-3">
          {L('Comment l’utiliser, en 3 étapes', 'How to use it, in 3 steps')}
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl border border-slate-800 bg-[#0d1422] p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center">{s.n}</span>
                <span className="font-semibold text-white text-sm">{s.title}</span>
              </div>
              <p className="text-xs text-slate-400 flex-1">{s.text}</p>
              <button
                onClick={s.action}
                className="self-start mt-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
              >
                {s.cta} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Who it is for */}
      <section>
        <h3 className="text-sm uppercase tracking-wide text-cyan-300 font-semibold mb-3">{L('Pour qui', 'Who it is for')}</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {audiences.map((a) => (
            <div key={a.who} className="rounded-xl border border-slate-800 bg-[#0d1422] p-4">
              <div className="flex items-center gap-2 mb-1.5">
                {a.icon}
                <span className="font-semibold text-white text-sm">{a.who}</span>
              </div>
              <p className="text-xs text-slate-400">{a.what}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Module map */}
      <section>
        <h3 className="text-sm uppercase tracking-wide text-cyan-300 font-semibold mb-1">{L('Tous les modules', 'All modules')}</h3>
        <p className="text-xs text-slate-500 mb-3">
          {L(
            'Les pastilles indiquent, pour chaque module, combien de valeurs cliniques sont sourcées, à vérifier ou illustratives.',
            'Badges show, for each module, how many clinical values are sourced, to verify or illustrative.',
          )}
        </p>
        <div className="space-y-4">
          {GROUPS.map((grp) => {
            const mods = MODULE_GUIDES.filter((g) => g.group === grp.id);
            if (!mods.length) return null;
            return (
              <div key={grp.id}>
                <h4 className="text-xs font-semibold text-slate-400 mb-1.5">{T(grp.title)}</h4>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {mods.map((g) => {
                    const c = statusCounts(claimsForModule(g.id));
                    return (
                      <button
                        key={g.id}
                        onClick={() => onOpen(g.id)}
                        className="text-left rounded-xl border border-slate-800 bg-[#0d1422] hover:border-cyan-600 hover:bg-[#0f1a2c] p-3 flex flex-col gap-1.5 cursor-pointer transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-cyan-400">{g.id.replace('_', '+')}</span>
                          <span className="font-semibold text-sm text-white">{T(g.title)}</span>
                        </span>
                        <span className="text-xs text-slate-400">{T(g.purpose)}</span>
                        <span className="flex flex-wrap gap-1 text-[10px] font-mono mt-0.5">
                          <span className="px-1.5 py-0.5 rounded border border-emerald-700/60 text-emerald-300">{c.sourced} {L('sourcées', 'sourced')}</span>
                          {c['from-memory'] > 0 && (
                            <span className="px-1.5 py-0.5 rounded border border-amber-700/60 text-amber-300">{c['from-memory']} {L('à vérifier', 'to verify')}</span>
                          )}
                          {c.illustrative > 0 && (
                            <span className="px-1.5 py-0.5 rounded border border-slate-600 text-slate-400">{c.illustrative} {L('illustratives', 'illustrative')}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trust */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-[#0d1422] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {L('Comment lire la fiabilité', 'How to read reliability')}
          </h3>
          <p className="text-xs text-slate-400">
            {L(
              `Chaque valeur clinique affichée a une fiche : ${total.sourced} sourcées, ${total['from-memory']} à vérifier, ${total.illustrative} illustratives. Le bouton coloré à gauche des onglets ouvre les fiches du module, avec un bouton « Signaler une erreur ».`,
              `Every clinical value shown has a record: ${total.sourced} sourced, ${total['from-memory']} to verify, ${total.illustrative} illustrative. The coloured button left of the tabs opens the module’s records, with a “Report a mistake” button.`,
            )}
          </p>
          <div className="space-y-1.5">
            {statusTiles.map((s) => (
              <div key={s.key} className={`rounded-lg border px-2.5 py-1.5 text-xs ${s.cls}`}>
                <span className="font-semibold">{s.label}</span> — {s.text}
              </div>
            ))}
          </div>
          <button
            onClick={onOpenEvidence}
            className="px-3 py-1.5 rounded-lg border border-cyan-700 text-cyan-200 hover:bg-cyan-950/40 text-xs flex items-center gap-1 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" /> {L('Voir toutes les sources', 'See all sources')}
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0d1422] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-violet-400" />
            {L('Ce qui est couvert, honnêtement', 'What is covered, honestly')}
          </h3>
          <p className="text-xs text-slate-400">
            {L(
              `${PROGRAMMES.length} programmes officiels détaillés et ${OFFICIAL_RESOURCES.length} textes de référence. Sur les ${DOMAINS.length} grands domaines des programmes : ${coverage.covered} couverts, ${coverage.partial} partiellement, ${coverage.gap} pas encore. La carte de couverture liste ce qui manque, domaine par domaine.`,
              `${PROGRAMMES.length} official programmes in detail and ${OFFICIAL_RESOURCES.length} reference texts. Of the ${DOMAINS.length} main programme domains: ${coverage.covered} covered, ${coverage.partial} partly, ${coverage.gap} not yet. The coverage map lists what is missing, domain by domain.`,
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PROGRAMMES.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpen('M11')}
                className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:border-violet-500 text-xs cursor-pointer"
              >
                {p.flag} {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={onOpenCurriculum}
            className="px-3 py-1.5 rounded-lg border border-violet-700 text-violet-200 hover:bg-violet-950/40 text-xs flex items-center gap-1 cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5" /> {L('Carte de couverture du programme', 'Programme coverage map')}
          </button>
        </div>
      </section>

      {/* Practical */}
      <section className="rounded-xl border border-slate-800 bg-[#0d1422] p-4 grid gap-3 md:grid-cols-3 text-xs text-slate-400">
        <div>
          <h4 className="font-semibold text-white mb-1 flex items-center gap-1.5">
            <UserRound className="w-4 h-4 text-cyan-300" /> {L('Vos données', 'Your data')}
          </h4>
          {L(
            'Aucun compte. Votre progression et vos réglages restent dans ce navigateur, sur cet appareil. Rien n’est envoyé sans action de votre part.',
            'No account. Your progress and settings stay in this browser, on this device. Nothing is sent unless you choose to.',
          )}
        </div>
        <div>
          <h4 className="font-semibold text-white mb-1 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-cyan-300" /> {L('Hors ligne et téléphone', 'Offline and phone')}
          </h4>
          {L(
            'Après une première visite, l’application fonctionne sans réseau. Sur téléphone, « Ajouter à l’écran d’accueil » l’installe comme une application.',
            'After a first visit the app works without a network. On a phone, “Add to home screen” installs it like an app.',
          )}
        </div>
        <div>
          <h4 className="font-semibold text-white mb-1 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-cyan-300" /> {L('Signaler une erreur', 'Report a mistake')}
          </h4>
          {L(
            'Une valeur vous semble fausse ? Ouvrez la fiche de fiabilité du module et cliquez « Signaler une erreur » : un rapport pré-rempli s’ouvre.',
            'A value looks wrong? Open the module’s reliability records and click “Report a mistake”: a pre-filled report opens.',
          )}
        </div>
      </section>

      <p className="text-[11px] text-slate-500 pb-4">
        {L(
          'Anatomie 3D : BodyParts3D (DBCLS, CC BY-SA 2.1 JP / CC BY 4.0). Code : Apache-2.0. Les textes officiels restent la propriété de leurs auteurs : ils sont résumés et liés, jamais reproduits.',
          '3D anatomy: BodyParts3D (DBCLS, CC BY-SA 2.1 JP / CC BY 4.0). Code: Apache-2.0. Official texts remain their authors’ property: they are summarised and linked, never reproduced.',
        )}
      </p>
    </main>
  );
}
