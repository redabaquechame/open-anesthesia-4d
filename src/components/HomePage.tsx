import { useMemo } from 'react';
import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
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

const code = (id: string) => id.replace('_', '+');

/** Evidence dot colours (DESIGN.md §3): sourced / to verify / illustrative. */
const DOT = {
  sourced: 'bg-emerald-500',
  'from-memory': 'bg-amber-500',
  illustrative: 'bg-slate-500',
} as const;

function Dot({ cls }: { cls: string }) {
  return <span aria-hidden className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${cls}`} />;
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

  const groups = GROUPS.map((grp) => ({ grp, mods: MODULE_GUIDES.filter((g) => g.group === grp.id) })).filter(
    (x) => x.mods.length > 0,
  );

  const audiences = [
    {
      who: L('Résidents / internes', 'Residents'),
      what: L(
        'Suivez votre programme officiel étape par étape, comprenez la physique et la pharmacologie en manipulant, entraînez-vous aux crises et aux scores avant la garde.',
        'Follow your official programme stage by stage, understand physics and pharmacology hands-on, practise crises and scores before call.',
      ),
    },
    {
      who: L('Enseignants', 'Teachers'),
      what: L(
        'Projetez un appareil ouvert, une panne à l’aveugle ou une crise ; partagez le réglage exact par QR code ; débriefez avec la source de chaque étape.',
        'Project an open machine, a blind fault or a crisis; share the exact setup by QR code; debrief with the source of each step.',
      ),
    },
    {
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

  const statusRows: { key: keyof typeof DOT; label: string; text: string }[] = [
    {
      key: 'sourced',
      label: L('Sourcé', 'Sourced'),
      text: L('Vérifié sur la source ouverte (article, recommandation, norme).', 'Checked against the opened source (paper, guideline, standard).'),
    },
    {
      key: 'from-memory',
      label: L('À vérifier', 'To verify'),
      text: L('Valeur usuelle pas encore confrontée au texte original : à prendre avec prudence.', 'Usual value not yet checked against the original text: use with caution.'),
    },
    {
      key: 'illustrative',
      label: L('Illustratif', 'Illustrative'),
      text: L('Choix du simulateur pour l’enseignement (« modèle du simulateur »), pas une donnée clinique.', 'Simulator choice for teaching (“simulator model”), not clinical data.'),
    },
  ];

  const practical = [
    {
      title: L('Vos données', 'Your data'),
      text: L(
        'Aucun compte. Votre progression et vos réglages restent dans ce navigateur, sur cet appareil. Rien n’est envoyé sans action de votre part.',
        'No account. Your progress and settings stay in this browser, on this device. Nothing is sent unless you choose to.',
      ),
    },
    {
      title: L('Hors ligne et téléphone', 'Offline and phone'),
      text: L(
        'Après une première visite, l’application fonctionne sans réseau. Sur téléphone, « Ajouter à l’écran d’accueil » l’installe comme une application.',
        'After a first visit the app works without a network. On a phone, “Add to home screen” installs it like an app.',
      ),
    },
    {
      title: L('Signaler une erreur', 'Report a mistake'),
      text: L(
        'Une valeur vous semble fausse ? Ouvrez la fiche de fiabilité du module et cliquez « Signaler une erreur » : un rapport pré-rempli s’ouvre.',
        'A value looks wrong? Open the module’s reliability records and click “Report a mistake”: a pre-filled report opens.',
      ),
    },
  ];

  const sectionTitle = 'text-[11px] uppercase tracking-wider text-oa-text-dim font-semibold';

  return (
    <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 py-6 space-y-8 text-slate-200">
      {/* Hero: title + actions | what's inside */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
        <div className="space-y-4 min-w-0">
          <h2 className="text-2xl md:text-3xl font-semibold text-oa-text leading-tight">
            {L('Simulateur d’enseignement de l’anesthésie-réanimation', 'Anaesthesia teaching simulator')}
          </h2>
          <p className="text-sm md:text-base text-oa-text-dim max-w-2xl">
            {L(
              'Gratuit, sans compte, utilisable hors ligne. Il montre en 3D et en temps réel ce qui se passe dans l’appareil d’anesthésie, chez le patient et dans les médicaments, et relie chaque notion à votre programme officiel et à sa source.',
              'Free, no account, works offline. It shows in real-time 3D what happens in the anaesthesia machine, in the patient and with the drugs, and links each topic to your official programme and its source.',
            )}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-oa-text-muted me-1">{L('Programmes officiels', 'Official programmes')}</span>
            {PROGRAMMES.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpen('M11')}
                className="px-2 py-0.5 rounded border border-oa-hairline bg-oa-surface hover:bg-oa-hover hover:border-oa-border-strong text-xs text-slate-300 cursor-pointer"
              >
                {p.flag} {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => onOpen('M1_M2')}
              className="px-4 py-2 rounded bg-slate-100 hover:bg-white text-oa-canvas text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              {L('Lancer le bloc', 'Open the OR')} <span className="font-mono text-xs">(M1)</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
            <button
              onClick={() => onOpen('M9')}
              className="px-4 py-2 rounded border border-oa-border-strong hover:bg-oa-hover text-oa-text text-sm font-medium flex items-center gap-1.5 cursor-pointer"
            >
              {L('S’entraîner aux crises', 'Train for crises')} <span className="font-mono text-xs">(M9)</span>
            </button>
          </div>
        </div>

        {/* What's inside: typographic instrument panel, no invented values */}
        <aside className="bg-oa-surface border border-oa-hairline rounded text-xs min-w-0">
          <div className="flex items-center justify-between px-3 h-8 border-b border-oa-hairline">
            <span className={sectionTitle}>{L('Contenu', 'What’s inside')}</span>
            <span className="font-mono text-[10px] text-oa-text-muted">
              <span className="oa-num">{MODULE_GUIDES.length}</span> {L('modules', 'modules')}
            </span>
          </div>
          <ul className="divide-y divide-oa-hairline">
            {groups.map(({ grp, mods }) => (
              <li key={grp.id} className="px-3 py-2 flex gap-3">
                <span className="w-28 shrink-0 text-oa-text-dim">{T(grp.title)}</span>
                <span className="flex-1 min-w-0 space-y-0.5">
                  {mods.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => onOpen(g.id)}
                      className="w-full flex items-baseline gap-2 text-start hover:text-oa-text text-slate-300 cursor-pointer"
                    >
                      <span className="font-mono text-[10px] text-oa-text-muted w-10 shrink-0" dir="ltr">
                        {code(g.id)}
                      </span>
                      <span className="truncate">{T(g.title)}</span>
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      {/* How to use */}
      <section>
        <h3 className={`${sectionTitle} mb-2`}>{L('Comment l’utiliser, en 3 étapes', 'How to use it, in 3 steps')}</h3>
        <ol className="grid md:grid-cols-3 border border-oa-hairline rounded bg-oa-surface divide-y md:divide-y-0 md:divide-x rtl:md:divide-x-reverse divide-oa-hairline">
          {steps.map((s) => (
            <li key={s.n} className="p-3 flex flex-col gap-1.5">
              <span className="flex items-baseline gap-2">
                <span className="oa-num text-xs text-oa-text-muted">{s.n}</span>
                <span className="font-semibold text-oa-text text-sm">{s.title}</span>
              </span>
              <p className="text-xs text-oa-text-dim flex-1">{s.text}</p>
              <button
                onClick={s.action}
                className="self-start text-xs text-slate-200 hover:text-white underline-offset-2 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {s.cta} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </li>
          ))}
        </ol>
      </section>

      {/* Who it is for */}
      <section>
        <h3 className={`${sectionTitle} mb-2`}>{L('Pour qui', 'Who it is for')}</h3>
        <ul className="border border-oa-hairline rounded bg-oa-surface divide-y divide-oa-hairline">
          {audiences.map((a) => (
            <li key={a.who} className="px-3 py-2 text-xs sm:flex sm:gap-3">
              <span className="block sm:w-56 shrink-0 font-semibold text-oa-text">{a.who}</span>
              <span className="text-oa-text-dim">{a.what}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Module directory */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-2">
          <h3 className={sectionTitle}>{L('Tous les modules', 'All modules')}</h3>
          <p className="text-[11px] text-oa-text-muted">
            {L(
              'Les pastilles indiquent, pour chaque module, combien de valeurs cliniques sont sourcées, à vérifier ou illustratives.',
              'Dots show, for each module, how many clinical values are sourced, to verify or illustrative.',
            )}
          </p>
        </div>
        <div className="border border-oa-hairline rounded bg-oa-surface divide-y divide-oa-hairline">
          {groups.map(({ grp, mods }) => (
            <div key={grp.id}>
              <h4 className="px-3 pt-2 pb-1 text-[11px] font-semibold text-oa-text-muted">{T(grp.title)}</h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3">
                {mods.map((g) => {
                  const c = statusCounts(claimsForModule(g.id));
                  return (
                    <button
                      key={g.id}
                      onClick={() => onOpen(g.id)}
                      className="text-start px-3 py-2 flex flex-col gap-1 hover:bg-oa-hover cursor-pointer transition-colors"
                    >
                      <span className="flex items-baseline gap-2 min-w-0">
                        <span className="font-mono text-[10px] text-oa-text-muted shrink-0" dir="ltr">
                          {code(g.id)}
                        </span>
                        <span className="font-semibold text-sm text-oa-text truncate">{T(g.title)}</span>
                      </span>
                      <span className="text-xs text-oa-text-dim line-clamp-1">{T(g.purpose)}</span>
                      <span className="flex items-center gap-3 text-[10px] text-oa-text-dim">
                        <span className="flex items-center gap-1" title={L('sourcées', 'sourced')}>
                          <Dot cls={DOT.sourced} />
                          <span className="oa-num">{c.sourced}</span>
                          <span className="sr-only">{L('sourcées', 'sourced')}</span>
                        </span>
                        {c['from-memory'] > 0 && (
                          <span className="flex items-center gap-1" title={L('à vérifier', 'to verify')}>
                            <Dot cls={DOT['from-memory']} />
                            <span className="oa-num">{c['from-memory']}</span>
                            <span className="sr-only">{L('à vérifier', 'to verify')}</span>
                          </span>
                        )}
                        {c.illustrative > 0 && (
                          <span className="flex items-center gap-1" title={L('illustratives', 'illustrative')}>
                            <Dot cls={DOT.illustrative} />
                            <span className="oa-num">{c.illustrative}</span>
                            <span className="sr-only">{L('illustratives', 'illustrative')}</span>
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="grid lg:grid-cols-2 border border-oa-hairline rounded bg-oa-surface divide-y lg:divide-y-0 lg:divide-x rtl:lg:divide-x-reverse divide-oa-hairline">
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-oa-text">{L('Comment lire la fiabilité', 'How to read reliability')}</h3>
          <p className="text-xs text-oa-text-dim">
            {L('Chaque valeur clinique affichée a une fiche : ', 'Every clinical value shown has a record: ')}
            <span className="oa-num text-slate-200">{total.sourced}</span> {L('sourcées', 'sourced')},{' '}
            <span className="oa-num text-slate-200">{total['from-memory']}</span> {L('à vérifier', 'to verify')},{' '}
            <span className="oa-num text-slate-200">{total.illustrative}</span> {L('illustratives', 'illustrative')}.{' '}
            {L(
              'Le bouton coloré à gauche des onglets ouvre les fiches du module, avec un bouton « Signaler une erreur ».',
              'The coloured button left of the tabs opens the module’s records, with a “Report a mistake” button.',
            )}
          </p>
          <ul className="space-y-1.5 text-xs">
            {statusRows.map((s) => (
              <li key={s.key} className="flex items-baseline gap-2">
                <Dot cls={`${DOT[s.key]} translate-y-[-1px]`} />
                <span>
                  <span className="font-semibold text-slate-200">{s.label}</span>
                  <span className="text-oa-text-dim"> — {s.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={onOpenEvidence}
            className="px-3 py-1.5 rounded border border-oa-border-strong hover:bg-oa-hover text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" /> {L('Voir toutes les sources', 'See all sources')}
          </button>
        </div>

        <div className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-oa-text">{L('Ce qui est couvert, honnêtement', 'What is covered, honestly')}</h3>
          <p className="text-xs text-oa-text-dim">
            <span className="oa-num text-slate-200">{PROGRAMMES.length}</span>{' '}
            {L('programmes officiels détaillés et', 'official programmes in detail and')}{' '}
            <span className="oa-num text-slate-200">{OFFICIAL_RESOURCES.length}</span>{' '}
            {L('textes de référence. Sur les', 'reference texts. Of the')}{' '}
            <span className="oa-num text-slate-200">{DOMAINS.length}</span>{' '}
            {L('grands domaines des programmes :', 'main programme domains:')}{' '}
            <span className="oa-num text-slate-200">{coverage.covered}</span> {L('couverts', 'covered')},{' '}
            <span className="oa-num text-slate-200">{coverage.partial}</span> {L('partiellement', 'partly')},{' '}
            <span className="oa-num text-slate-200">{coverage.gap}</span> {L('pas encore', 'not yet')}.{' '}
            {L(
              'La carte de couverture liste ce qui manque, domaine par domaine.',
              'The coverage map lists what is missing, domain by domain.',
            )}
          </p>
          <button
            onClick={onOpenCurriculum}
            className="px-3 py-1.5 rounded border border-oa-border-strong hover:bg-oa-hover text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5" /> {L('Carte de couverture du programme', 'Programme coverage map')}
          </button>
        </div>
      </section>

      {/* Practical */}
      <section className="grid md:grid-cols-3 border border-oa-hairline rounded bg-oa-surface divide-y md:divide-y-0 md:divide-x rtl:md:divide-x-reverse divide-oa-hairline text-xs text-oa-text-dim">
        {practical.map((p) => (
          <div key={p.title} className="p-3">
            <h4 className="font-semibold text-oa-text mb-1">{p.title}</h4>
            {p.text}
          </div>
        ))}
      </section>

      <footer className="space-y-1 pb-4 text-[11px] text-oa-text-muted">
        <p>
          {L(
            'Outil pédagogique, pas un dispositif médical. Il ne sert pas à décider d’un traitement : suivez les protocoles de votre établissement et les recommandations en vigueur.',
            'A teaching tool, not a medical device. Do not use it to make treatment decisions: follow your institution’s protocols and current guidelines.',
          )}
        </p>
        <p>
          {L(
            'Anatomie 3D : BodyParts3D (DBCLS, CC BY-SA 2.1 JP / CC BY 4.0). Code : Apache-2.0. Les textes officiels restent la propriété de leurs auteurs : ils sont résumés et liés, jamais reproduits.',
            '3D anatomy: BodyParts3D (DBCLS, CC BY-SA 2.1 JP / CC BY 4.0). Code: Apache-2.0. Official texts remain their authors’ property: they are summarised and linked, never reproduced.',
          )}
        </p>
      </footer>
    </main>
  );
}
