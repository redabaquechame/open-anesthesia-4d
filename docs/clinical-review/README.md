# Clinical review pack

Generated 2026-11-27. One checklist per module; each takes about an hour.

## What the statuses mean

- **SOURCED** — checked against a primary source that was actually opened (paper, label, standard).
- **TO VERIFY** — standard textbook or label knowledge, entered without opening the source. Probably
  right, but it has not been checked. Dosing lines in this group matter most.
- **ILLUSTRATIVE** — a shape or number chosen by the simulator to make a mechanism visible. It should
  teach the idea correctly, but it is not measured data.

## Modules

| Checklist | Claims | Sourced | To verify | Illustrative |
|---|---|---|---|---|
| [M1 + M2 — Anaesthesia workstation, ventilation & capnography](M1-M2.md) | 20 | 15 | 1 | 4 |
| [M3 — Volatile agents, low flow & climate](M3.md) | 16 | 10 | 1 | 5 |
| [M4 — Propofol / remifentanil TCI, EEG & BIS](M4.md) | 14 | 6 | 4 | 4 |
| [M5 — Neuromuscular monitoring & reversal](M5.md) | 7 | 5 | 0 | 2 |
| [M6 — Ultrasound-guided block, LAST & cardiac loops](M6.md) | 10 | 6 | 0 | 4 |
| [M7 — Thoracic & lumbar epidural](M7.md) | 8 | 5 | 0 | 3 |
| [M8 — Bronchoscopy & double-lumen tube](M8.md) | 16 | 9 | 0 | 7 |
| [M9 — Crisis management](M9.md) | 26 | 21 | 0 | 5 |
| [M10 — Pre-operative assessment](M10.md) | 10 | 9 | 0 | 1 |
| [M11 — Official curriculum & library](M11.md) | 68 | 68 | 0 | 0 |

## How corrections flow back

1. Reviewer fills the checklist (print, PDF or reply by message), or uses **Report a mistake** in the app.
2. The maintainer updates `src/standards/claimRegistry.ts` (status, source, `reviewedBy`) and the value in code.
3. `npm run review:docs` regenerates these files.
