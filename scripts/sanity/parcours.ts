/**
 * Sanity checks for M11 (official programmes and resource library): every link resolves, every
 * id is unique, and any resource quoting clinical points is backed by a claim and was opened.
 */
import { PROGRAMMES } from '../../src/standards/programmes';
import { OFFICIAL_RESOURCES } from '../../src/standards/officialResources';
import { DOMAINS } from '../../src/standards/curriculum';
import { CLAIMS } from '../../src/standards/claimRegistry';
import { CLAIM_FR } from '../../src/standards/claimFr';
import { EVIDENCE_REGISTRY } from '../../src/evidence/evidenceRegistry';
import { EVIDENCE_FR } from '../../src/evidence/evidenceFr';
import { CRISES } from '../../src/modules/m9-crisis/crisisProtocols';

type Check = (name: string, ok: boolean, detail: string) => void;
const MODULES = new Set(['M1_M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11']);

export function runParcoursChecks(check: Check) {
  // French first: every evidence entry and every claim (M11 claims are already French) has a translation.
  const evNoFr = EVIDENCE_REGISTRY.filter((e) => !EVIDENCE_FR[e.id]).map((e) => e.id);
  check('FR: every evidence entry has a French translation', evNoFr.length === 0, evNoFr.join(', ') || `${EVIDENCE_REGISTRY.length} entries`);
  const clNoFr = CLAIMS.filter((c) => c.module !== 'M11' && !CLAIM_FR[c.id]).map((c) => c.id);
  check('FR: every claim has a French translation', clNoFr.length === 0, clNoFr.join(', ') || 'ok');

  const domainIds = new Set(DOMAINS.map((d) => d.id));
  const resIds = new Set<string>();
  const dupRes: string[] = [];
  for (const r of OFFICIAL_RESOURCES) {
    if (resIds.has(r.id)) dupRes.push(r.id);
    resIds.add(r.id);
  }
  check('M11 library: unique resource ids', dupRes.length === 0, dupRes.join(', ') || `${resIds.size} resources`);

  const badRes = OFFICIAL_RESOURCES.filter(
    (r) => !/^https:\/\//.test(r.url) || r.domains.some((d) => !domainIds.has(d)) || (r.modules ?? []).some((m) => !MODULES.has(m)) || r.domains.length === 0
  ).map((r) => r.id);
  check('M11 library: https links, valid domains and modules', badRes.length === 0, badRes.join(', ') || 'ok');

  const unopened = OFFICIAL_RESOURCES.filter((r) => r.reading === 'non ouvert' && (r.keyPoints?.length ?? 0) > 0).map((r) => r.id);
  check('M11 library: no clinical points quoted from an unopened document', unopened.length === 0, unopened.join(', ') || 'ok');

  const claimIds = new Set(CLAIMS.map((c) => c.id));
  const noClaim = OFFICIAL_RESOURCES.filter((r) => (r.keyPoints?.length ?? 0) > 0 && !claimIds.has(`m11-${r.id}`)).map((r) => r.id);
  check('M11 library: every quoted point is in the claim registry', noClaim.length === 0, noClaim.join(', ') || `${OFFICIAL_RESOURCES.filter((r) => r.keyPoints?.length).length} resources with points`);

  const badNotes = CRISES.flatMap((c) => (c.localNotes ?? []).filter((n) => !resIds.has(n.resourceId) || !claimIds.has(`m11-${n.resourceId}`)).map((n) => `${c.id}:${n.resourceId}`));
  check('M9 local notes: each cites a library resource backed by a claim', badNotes.length === 0, badNotes.join(', ') || `${CRISES.reduce((n, c) => n + (c.localNotes?.length ?? 0), 0)} notes`);

  const itemIds = new Set<string>();
  const problems: string[] = [];
  for (const p of PROGRAMMES) {
    if (!/^https:\/\//.test(p.url)) problems.push(`${p.id}: url`);
    if (p.stages.length === 0) problems.push(`${p.id}: no stages`);
    for (const s of p.stages)
      for (const i of s.items) {
        if (itemIds.has(i.id)) problems.push(`duplicate item ${i.id}`);
        itemIds.add(i.id);
        if (i.domain && !domainIds.has(i.domain)) problems.push(`${i.id}: domain ${i.domain}`);
        for (const m of i.modules ?? []) if (!MODULES.has(m)) problems.push(`${i.id}: module ${m}`);
        for (const r of i.resources ?? []) if (!resIds.has(r)) problems.push(`${i.id}: resource ${r}`);
      }
  }
  check('M11 programmes: ids unique, links resolve', problems.length === 0, problems.slice(0, 8).join('; ') || `${PROGRAMMES.length} programmes, ${itemIds.size} items`);

  for (const region of ['ma', 'fr', 'ca', 'eu'] as const) {
    const n = PROGRAMMES.filter((p) => p.region === region).length;
    check(`M11 programmes: ${region} has an official programme`, n > 0, `${n}`);
  }
}
