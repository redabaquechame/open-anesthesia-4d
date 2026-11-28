import { useMemo } from 'react';
import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import type { LocaleCode } from '../standards/clinicalStandards';
import type { AppModuleId } from '../standards/programmeTypes';
import { CLAIMS, statusCounts } from '../standards/claimRegistry';
import { PROGRAMMES } from '../standards/programmes';
import { GROUPS, MODULE_GUIDES, type RoomId } from '../standards/moduleGuides';
import { HomeHero3D } from './HomeHero3D';

interface Props {
  locale: LocaleCode;
  onOpen: (id: AppModuleId) => void;
  onOpenCurriculum: () => void;
  onOpenEvidence: () => void;
}

/** Real screenshots of each room (captured from the app itself, see handoff/gemini/INBOX). */
const ROOM_IMAGE: Record<RoomId, string> = {
  or: 'home/room-or.webp',
  procedures: 'home/room-procedures.webp',
  crisis: 'home/room-crisis.webp',
  tools: 'home/room-tools.webp',
  learn: 'home/room-learn.webp',
};
/** Which part of the screenshot to keep when a card crops it (the 3D anatomy for procedures). */
const ROOM_FOCUS: Partial<Record<RoomId, string>> = { procedures: 'object-left', crisis: 'object-left', tools: 'object-left' };

/**
 * Landing page. Shows the product first (live 3D, real screenshots), then the five rooms,
 * then why it can be trusted. No module codes, no per-module bookkeeping.
 */
export function HomePage({ locale, onOpen, onOpenCurriculum, onOpenEvidence }: Props) {
  const fr = locale !== 'en-INT';
  const L = (f: string, e: string) => (fr ? f : e);
  const T = (x: { fr: string; en: string }) => (fr ? x.fr : x.en);
  const base = import.meta.env.BASE_URL;

  const total = useMemo(() => statusCounts(CLAIMS), []);
  // Within a room, the most representative screen first (it is the one the card opens).
  const ORDER: AppModuleId[] = ['M1_M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11'];
  const rooms = GROUPS.map((room) => ({
    room,
    mods: MODULE_GUIDES.filter((g) => g.group === room.id).sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id)),
  })).filter((r) => r.mods.length > 0);
  const [featured, ...others] = rooms;

  const RoomCard = ({ room, mods, big = false }: (typeof rooms)[number] & { big?: boolean }) => (
    <article className={`group bg-oa-surface border border-oa-hairline rounded overflow-hidden flex flex-col hover:border-oa-border-strong transition-colors ${big ? 'md:col-span-2' : ''}`}>
      <button onClick={() => onOpen(mods[0].id)} className={`text-start cursor-pointer flex flex-col ${big ? '' : 'flex-1'}`} aria-label={T(room.title)}>
        {/* Small cards let the picture take the spare height, so a card beside the large one has no empty band. */}
        <div className={`relative overflow-hidden bg-black ${big ? 'aspect-[16/9]' : 'flex-1 min-h-[180px]'}`}>
          <img
            src={`${base}${ROOM_IMAGE[room.id]}`}
            alt=""
            loading={big ? 'eager' : 'lazy'}
            decoding="async"
            className={`absolute inset-0 w-full h-full object-cover ${ROOM_FOCUS[room.id] ?? 'object-center'} opacity-90 group-hover:opacity-100 group-hover:scale-[1.015] transition duration-500`}
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-oa-surface to-transparent" />
        </div>
      </button>
      <div className={`p-4 pt-2 flex flex-col gap-2 ${big ? 'flex-1' : ''}`}>
        <h3 className={`font-semibold text-oa-text ${big ? 'text-xl' : 'text-base'}`}>{T(room.title)}</h3>
        <p className="text-sm text-oa-text-dim">{T(room.tagline)}</p>
        <ul className="mt-auto pt-1 flex flex-wrap gap-1.5">
          {mods.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => onOpen(m.id)}
                className="px-2.5 py-1 rounded border border-oa-hairline bg-oa-raised hover:bg-oa-hover hover:border-oa-border-strong text-xs text-slate-200 cursor-pointer"
              >
                {T(m.title)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );

  return (
    <main className="flex-1 w-full text-slate-200">
      {/* ── Hero: the product itself ───────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-oa-hairline bg-oa-canvas">
        <div className="absolute inset-0 lg:start-[38%]">
          <HomeHero3D label={L('Arbre bronchique humain réel en 3D, en rotation lente', 'Real human bronchial tree in 3D, slowly turning')} />
        </div>
        {/* Keeps the text readable over the model on narrow screens. */}
        <div className="absolute inset-0 bg-gradient-to-r from-oa-canvas via-oa-canvas/85 to-transparent lg:via-oa-canvas/40 pointer-events-none rtl:bg-gradient-to-l" />
        {/* On phones the model sits behind the text: dim it further. */}
        <div className="absolute inset-0 bg-oa-canvas/55 lg:hidden pointer-events-none" />
        <div className="relative max-w-[1200px] mx-auto px-4 py-16 md:py-24 min-h-[460px] md:min-h-[560px] flex flex-col justify-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-oa-text-dim">
            {L('Anesthésie-réanimation · gratuit · sans compte · hors ligne', 'Anaesthesia · free · no account · offline')}
          </p>
          <h1 className="mt-3 text-4xl md:text-6xl font-semibold tracking-tight text-white leading-[1.05] max-w-[14ch]">
            {L('Voir l’anesthésie de l’intérieur.', 'See anaesthesia from the inside.')}
          </h1>
          <p className="mt-5 text-base md:text-lg text-slate-300 max-w-[52ch]">
            {L(
              'Le gaz dans l’appareil, l’image échographique, la concentration des médicaments : tout est calculé en direct à partir de modèles physiques et d’une anatomie humaine réelle. Chaque valeur clinique renvoie à sa source.',
              'Gas inside the machine, the ultrasound image, drug concentrations: all computed live from physical models and real human anatomy. Every clinical value links to its source.',
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => onOpen('M1_M2')}
              className="h-11 px-5 rounded bg-white hover:bg-slate-100 text-oa-canvas text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              {L('Entrer au bloc', 'Enter the OR')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
            <button
              onClick={() => onOpen('M6')}
              className="h-11 px-5 rounded border border-slate-500 hover:border-slate-300 hover:bg-white/5 text-white text-sm font-medium cursor-pointer"
            >
              {L('Bloc échoguidé', 'Ultrasound-guided block')}
            </button>
            <button
              onClick={() => onOpen('M9')}
              className="h-11 px-5 rounded border border-slate-500 hover:border-slate-300 hover:bg-white/5 text-white text-sm font-medium cursor-pointer"
            >
              {L('Urgences du bloc', 'OR emergencies')}
            </button>
          </div>
          <p className="mt-10 text-[11px] text-oa-text-muted">
            {L('Ci-contre : arbre bronchique humain réel (BodyParts3D), celui du module de fibroscopie.', 'Shown: a real human bronchial tree (BodyParts3D), the one used in the bronchoscopy module.')}
          </p>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-4 py-12 space-y-14">
        {/* ── The five rooms ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-2xl font-semibold text-white">{L('Cinq salles', 'Five rooms')}</h2>
          <p className="mt-1 text-sm text-oa-text-dim">{L('Choisissez où commencer. Chaque écran s’ouvre sur son mode d’emploi.', 'Pick where to start. Every screen opens with a short guide.')}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featured && <RoomCard {...featured} big />}
            {others.map((r) => (
              <RoomCard key={r.room.id} {...r} />
            ))}
          </div>
        </section>

        {/* ── Why trust it ───────────────────────────────────────────── */}
        <section className="grid md:grid-cols-3 gap-px bg-oa-hairline border border-oa-hairline rounded overflow-hidden">
          <div className="bg-oa-surface p-5">
            <h3 className="text-sm font-semibold text-white">{L('Calculé, pas filmé', 'Computed, not filmed')}</h3>
            <p className="mt-2 text-sm text-oa-text-dim">
              {L(
                'Les courbes, l’image échographique et les concentrations sortent de modèles physiques et pharmacologiques qui réagissent à vos réglages, pas d’animations préenregistrées.',
                'The waveforms, the ultrasound image and the concentrations come from physical and pharmacological models that respond to your settings, not from pre-recorded animations.',
              )}
            </p>
          </div>
          <div className="bg-oa-surface p-5">
            <h3 className="text-sm font-semibold text-white">{L('Chaque valeur a sa fiche', 'Every value has a record')}</h3>
            <p className="mt-2 text-sm text-oa-text-dim">
              <span className="oa-num text-slate-100">{total.sourced}</span> {L('valeurs vérifiées sur la source ouverte,', 'values checked against the opened source,')}{' '}
              <span className="oa-num text-slate-100">{total['from-memory']}</span> {L('encore à vérifier et', 'still to verify and')}{' '}
              <span className="oa-num text-slate-100">{total.illustrative}</span> {L('choix pédagogiques signalés comme tels.', 'teaching choices labelled as such.')}
            </p>
            <button onClick={onOpenEvidence} className="mt-3 text-sm text-slate-100 hover:text-white underline underline-offset-4 decoration-slate-600 hover:decoration-slate-300 flex items-center gap-1.5 cursor-pointer">
              <BookOpen className="w-4 h-4" /> {L('Voir toutes les sources', 'See all sources')}
            </button>
          </div>
          <div className="bg-oa-surface p-5">
            <h3 className="text-sm font-semibold text-white">{L('Libre, et à vous', 'Free, and yours')}</h3>
            <p className="mt-2 text-sm text-oa-text-dim">
              {L(
                'Aucun compte, rien n’est envoyé : votre progression reste sur votre appareil. Après une première visite, l’application fonctionne sans réseau et s’installe sur téléphone.',
                'No account, nothing is sent: your progress stays on your device. After a first visit the app works without a network and installs on a phone.',
              )}
            </p>
          </div>
        </section>

        {/* ── Official programmes ────────────────────────────────────── */}
        <section className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{L('Relié à votre programme officiel', 'Linked to your official programme')}</h2>
            <p className="mt-1 text-sm text-oa-text-dim">{L('Chaque compétence de votre maquette pointe vers le simulateur qui la travaille.', 'Each competency in your programme points to the simulator that trains it.')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PROGRAMMES.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpen('M11')}
                className="px-3 py-1.5 rounded border border-oa-hairline bg-oa-surface hover:bg-oa-hover hover:border-oa-border-strong text-sm text-slate-200 cursor-pointer"
              >
                {p.flag} {p.label}
              </button>
            ))}
            <button onClick={onOpenCurriculum} className="px-3 py-1.5 rounded text-sm text-oa-text-dim hover:text-white flex items-center gap-1.5 cursor-pointer">
              <GraduationCap className="w-4 h-4" /> {L('Ce qui est couvert', 'What is covered')}
            </button>
          </div>
        </section>

        <footer className="pt-6 border-t border-oa-hairline space-y-1 text-[11px] text-oa-text-muted">
          <p>
            {L(
              'Outil pédagogique, pas un dispositif médical. Il ne sert pas à décider d’un traitement : suivez les protocoles de votre établissement et les recommandations en vigueur. Une valeur vous semble fausse ? Le bouton de fiabilité de chaque module ouvre « Signaler une erreur ».',
              'A teaching tool, not a medical device. Do not use it to make treatment decisions: follow your institution’s protocols and current guidelines. A value looks wrong? Each module’s reliability button opens “Report a mistake”.',
            )}
          </p>
          <p>
            {L(
              'Anatomie 3D : BodyParts3D (DBCLS, CC BY-SA 2.1 JP). Code : Apache-2.0. Les textes officiels restent la propriété de leurs auteurs : ils sont résumés et liés, jamais reproduits.',
              '3D anatomy: BodyParts3D (DBCLS, CC BY-SA 2.1 JP). Code: Apache-2.0. Official texts remain their authors’ property: they are summarised and linked, never reproduced.',
            )}
          </p>
        </footer>
      </div>
    </main>
  );
}
