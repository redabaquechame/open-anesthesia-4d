/**
 * Generates printable clinical-review checklists from src/standards/claimRegistry.ts.
 * Run: npm run review:docs   →   docs/clinical-review/*.md
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { CLAIMS, type ClaimStatus, type ClinicalClaim } from '../src/standards/claimRegistry.ts';

const OUT = new URL('../docs/clinical-review/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const GROUPS: { file: string; title: string; modules: string[] }[] = [
  { file: 'M1-M2.md', title: 'M1 + M2 — Anaesthesia workstation, ventilation & capnography', modules: ['M1', 'M2'] },
  { file: 'M3.md', title: 'M3 — Volatile agents, low flow & climate', modules: ['M3'] },
  { file: 'M4.md', title: 'M4 — Propofol / remifentanil TCI, EEG & BIS', modules: ['M4'] },
  { file: 'M5.md', title: 'M5 — Neuromuscular monitoring & reversal', modules: ['M5'] },
  { file: 'M6.md', title: 'M6 — Ultrasound-guided block, LAST & cardiac loops', modules: ['M6'] },
  { file: 'M7.md', title: 'M7 — Thoracic & lumbar epidural', modules: ['M7'] },
  { file: 'M8.md', title: 'M8 — Bronchoscopy & double-lumen tube', modules: ['M8'] },
];

const LABEL: Record<ClaimStatus, string> = {
  sourced: 'SOURCED',
  'from-memory': 'TO VERIFY',
  illustrative: 'ILLUSTRATIVE',
};

const esc = (t: string) => t.replace(/\|/g, '\\|').replace(/\n/g, ' ');

function row(c: ClinicalClaim, i: number): string {
  const detail = [c.value ? `Value: \`${esc(c.value)}\`` : '', c.source ? `Source: ${esc(c.source)}` : '', c.note ? `Note: ${esc(c.note)}` : '']
    .filter(Boolean)
    .join('<br>');
  return `| ${i + 1} | ${LABEL[c.status]} | ${esc(c.claim)}${detail ? `<br><sub>${detail}</sub>` : ''}<br><sub>\`${c.id}\` · ${c.location}</sub> | ☐ Correct ☐ Wrong ☐ Unsure | |`;
}

const date = new Date().toISOString().slice(0, 10);
const index: string[] = [];

for (const g of GROUPS) {
  const claims = CLAIMS.filter((c) => g.modules.includes(c.module));
  const counts = { sourced: 0, 'from-memory': 0, illustrative: 0 } as Record<ClaimStatus, number>;
  claims.forEach((c) => counts[c.status]++);
  index.push(`| [${g.title}](${g.file}) | ${claims.length} | ${counts.sourced} | ${counts['from-memory']} | ${counts.illustrative} |`);

  const md = `# Clinical review — ${g.title}

Open Anesthesia 4D · generated ${date} from \`src/standards/claimRegistry.ts\` — do not edit by hand.

**For the reviewer.** Please open this module in the app, then mark each line. Items marked
**TO VERIFY** and **ILLUSTRATIVE** need the most attention. If something is wrong, write what it
should be and, if you can, the guideline or paper. About 1 hour.

| # | Status | Claim | Your verdict | Correction / source |
|---|---|---|---|---|
${claims.map(row).join('\n')}

## General impression

- Would you show this module to trainees as it is?  ☐ Yes  ☐ After the corrections above  ☐ No
- Anything misleading that is not in the list above:

&nbsp;

## Sign-off

Name: ______________________  Role / specialty: ______________________  Country: ____________

Date: ____________  Signature: ______________________
`;
  writeFileSync(new URL(g.file, OUT), md);
}

writeFileSync(
  new URL('README.md', OUT),
  `# Clinical review pack

Generated ${date}. One checklist per module; each takes about an hour.

## What the statuses mean

- **SOURCED** — checked against a primary source that was actually opened (paper, label, standard).
- **TO VERIFY** — standard textbook or label knowledge, entered without opening the source. Probably
  right, but it has not been checked. Dosing lines in this group matter most.
- **ILLUSTRATIVE** — a shape or number chosen by the simulator to make a mechanism visible. It should
  teach the idea correctly, but it is not measured data.

## Modules

| Checklist | Claims | Sourced | To verify | Illustrative |
|---|---|---|---|---|
${index.join('\n')}

## How corrections flow back

1. Reviewer fills the checklist (print, PDF or reply by message), or uses **Report a mistake** in the app.
2. The maintainer updates \`src/standards/claimRegistry.ts\` (status, source, \`reviewedBy\`) and the value in code.
3. \`npm run review:docs\` regenerates these files.
`
);

console.log(`Wrote ${GROUPS.length} checklists + README to docs/clinical-review/ (${CLAIMS.length} claims).`);
