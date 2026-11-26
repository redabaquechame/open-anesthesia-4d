import { EVIDENCE_REGISTRY } from '../evidence/evidenceRegistry';
import type { LocaleCode } from '../standards/clinicalStandards';

export interface XApiStatement {
  id: string;
  timestamp: string;
  actor: { objectType: 'Agent'; name: string; account: { homePage: string; name: string } };
  verb: { id: string; display: Record<string, string> };
  object: { id: string; definition: { name: Record<string, string>; type: string } };
  result?: { score?: { scaled: number }; success?: boolean; completion?: boolean; response?: string };
}

const DB_NAME = 'open-anesthesia-4d-xapi';
const STORE_NAME = 'statements';

function openXapiDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Base URL of wherever this copy is hosted (e.g. GitHub Pages), used for xAPI IRIs. */
function siteBase(): string {
  const { origin, pathname } = window.location;
  return origin + pathname.replace(/[^/]*$/, '');
}

/** Queues standardized xAPI (IEEE 9274.1.1-2023) interaction statements offline in IndexedDB. */
export async function queueOfflineXapiEvent(
  moduleId: string,
  verbKey: 'completed' | 'diagnosed' | 'practiced',
  summary: string,
  success = true
): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const stmt: XApiStatement = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    actor: { objectType: 'Agent', name: 'Anonymous learner', account: { homePage: siteBase(), name: 'anonymous' } },
    verb: {
      id: `http://adlnet.gov/expapi/verbs/${verbKey}`,
      display: { 'en-US': verbKey, 'fr-FR': verbKey },
    },
    object: {
      id: `${siteBase()}modules/${encodeURIComponent(moduleId)}`,
      definition: {
        name: { 'en-US': `Open Anesthesia 4D — ${moduleId}` },
        type: 'http://adlnet.gov/expapi/activities/simulation',
      },
    },
    result: { success, completion: true, response: summary },
  };
  const db = await openXapiDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(stmt);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Flushes queued offline xAPI statements to an institutional Apache 2.0 SQL LRS when online. */
export async function flushXapiQueueToLrs(lrsEndpoint: string, authHeader: string): Promise<number> {
  if (!navigator.onLine || typeof indexedDB === 'undefined') return 0;
  const db = await openXapiDb();
  const items: XApiStatement[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as XApiStatement[]);
    req.onerror = () => reject(req.error);
  });
  if (items.length === 0) return 0;

  const res = await fetch(`${lrsEndpoint.replace(/\/$/, '')}/statements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Experience-API-Version': '1.0.3',
      Authorization: authHeader,
    },
    body: JSON.stringify(items),
  });
  if (!res.ok) throw new Error(`LRS sync failed (${res.status})`);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return items.length;
}

/**
 * Reference notes for a FUTURE IMS LTI 1.3 integration with Moodle.
 * NOT functional today: an LTI 1.3 tool must answer the OIDC login and validate signed JWT launches,
 * which needs a server. This static GitHub Pages build cannot do that on its own.
 */
export const MOODLE_LTI_13_TEMPLATE = {
  status: 'not implemented — requires a backend for OIDC/JWT',
  protocol: 'IMS LTI 1.3 Advantage (OIDC + Assignment & Grade Services)',
  moodleAdminPath: 'Site Administration -> Plugins -> Activity Modules -> External Tool -> Manage Tools',
  requiredPlatformFields: [
    'Platform ID (iss)',
    'Client ID',
    'Deployment ID',
    'Public Keyset URL (/mod/lti/certs.php)',
    'Access Token URL (/mod/lti/token.php)',
    'Authentication Request URL (/mod/lti/auth.php)',
  ],
  exampleLrs: 'Yet Analytics SQL LRS (open-source LRS; check its licence before deploying)',
};

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Opens a printable 1-page briefing/debriefing sheet (reaction → analysis → summary structure). */
export function openPrintableDebriefCard(moduleId: string, locale: LocaleCode): void {
  const tag = moduleId === 'M1_M2' ? ['M1', 'M2'] : [moduleId];
  const refs = EVIDENCE_REGISTRY.filter((e) => e.moduleIds.some((m) => tag.includes(m)));
  const isFr = locale.startsWith('fr');

  const html = `<!doctype html><html lang="${isFr ? 'fr' : 'en'}"><head><meta charset="utf-8"/>
  <title>Debriefing Card — Open Anesthesia 4D (${moduleId})</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #111; max-width: 780px; margin: 24px auto; padding: 0 16px; line-height: 1.45; }
    h1 { font-size: 18px; border-bottom: 2px solid #0284c7; padding-bottom: 6px; margin-bottom: 10px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #0369a1; margin: 14px 0 6px; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; background: #f8fafc; font-size: 12px; }
    .warn { border-left: 4px solid #d97706; background: #fffbeb; padding: 8px 12px; font-size: 11px; margin-bottom: 12px; }
    ul { margin: 4px 0 0 18px; padding: 0; font-size: 12px; }
    @media print { button { display: none; } }
  </style></head><body>
  <button onclick="window.print()" style="float:right;padding:6px 12px;background:#0284c7;color:#fff;border:0;border-radius:4px;cursor:pointer;">Print / PDF</button>
  <h1>${isFr ? 'Fiche de briefing & débriefing structuré' : 'Structured Briefing & Debriefing Card'} — ${moduleId}</h1>
  <div class="warn">${isFr ? 'Simulation numérique pédagogique uniquement (patients fictifs) — Ne pas utiliser pour les soins réels.' : 'Educational digital simulation only (fictional avatars) — Not for real clinical decision-making.'}</div>
  <h2>1. ${isFr ? 'Briefing & Sécurité Psychologique (2 min)' : 'Briefing & Psychological Safety (2 min)'}</h2>
  <div class="box">${isFr ? 'Rappeler la confidentialité, le droit à l’erreur (« jamais la première fois sur le patient »), les objectifs d’apprentissage et la durée du scénario (10–15 min).' : 'Establish confidentiality, safe learning environment ("never the first time on the patient"), explicit learning objectives, and 10–15 min simulation window.'}</div>
  <h2>2. ${isFr ? 'Débriefing en 3 Phases (Réaction → Analyse → Synthèse)' : '3-Phase Debriefing (Reaction → Analysis → Summary)'}</h2>
  <div class="box"><ul>
    <li><strong>${isFr ? 'Phase 1 — Réaction :' : 'Phase 1 — Reaction:'}</strong> ${isFr ? 'Comment avez-vous vécu la situation face aux courbes avant d’ouvrir le mode rayons X ?' : 'How did you experience diagnosing the curves before revealing X-Ray mode?'}</li>
    <li><strong>${isFr ? 'Phase 2 — Analyse (Débriefing avec bon jugement) :' : 'Phase 2 — Analysis (Good Judgment):'}</strong> ${isFr ? 'Quel modèle mental physique a guidé votre première action ? Rejouer le mécanisme avec le mode rayons X.' : 'Which physical mental model drove your initial action? Replay the mechanism with X-Ray mode on.'}</li>
    <li><strong>${isFr ? 'Phase 3 — Synthèse & Transfert au bloc :' : 'Phase 3 — Summary & OR Transfer:'}</strong> ${isFr ? 'Quel message clé unique retenez-vous pour votre prochaine garde ?' : 'What single concrete clinical takeaway will you apply on your next OR shift?'}</li>
  </ul></div>
  <h2>3. ${isFr ? 'Références Scientifiques & Équations Clés' : 'Grounded Peer-Reviewed Evidence & Equations'}</h2>
  ${refs.map((r) => `<div class="box"><strong>${esc(r.title)}</strong><br/>${esc(r.keyFinding)}<br/><em>${esc(r.sourceCitation)}</em></div>`).join('') || `<div class="box">${isFr ? 'Aucune référence encore associée à ce module.' : 'No evidence entries tagged for this module yet.'}</div>`}
  </body></html>`;

  // A Blob URL works with noopener (window.open then returns null but still opens the page).
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

