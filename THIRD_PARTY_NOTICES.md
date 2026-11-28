# Third-party notices

The **application code** of Open Anesthésie 4D is licensed under the Apache License 2.0 (see `LICENSE`).
That licence covers only code written for this project. The items below keep their own licences.

## 1. 3D anatomy models (`public/models/anatomy/`)

- **BodyParts3D**, © The Database Center for Life Science (DBCLS).
  - The licence page says CC BY 4.0; the original OBJ headers say CC BY-SA 2.1 Japan.
  - To respect both, the derived GLB files are shared under **CC BY-SA 2.1 JP** with attribution.
  - Details and changes made: `public/models/anatomy/LICENSE.md`.
  - Reference: Mitsuhashi N et al. Nucleic Acids Res 2009;37:D782-5. doi:10.1093/nar/gkn613.

## 2. Software dependencies shipped in the app

| Package | Licence |
|---|---|
| three | MIT |
| react, react-dom | MIT |
| lucide-react | ISC |
| qrcode | MIT |
| workbox-window | MIT |
| @fontsource/ibm-plex-sans, ibm-plex-mono, ibm-plex-sans-arabic (IBM Plex fonts) | SIL Open Font License 1.1 |

Build tools (Vite, TypeScript, Tailwind, vite-plugin-pwa, glTF Transform, meshoptimizer, esbuild) are not
shipped as source; their licences are in `node_modules/*/LICENSE*`.

## 3. Clinical sources with non-commercial or no-derivatives terms

The app **summarises and cites** these sources: short paraphrased steps with a reference and a link.
It does not reproduce their pages, figures or algorithms. These sources keep their own terms, and the
Apache-2.0 licence of the code does not extend to them. Anyone reusing this project commercially must
check these terms or replace the content.

| Source | Licence | Where used |
|---|---|---|
| Association of Anaesthetists, Quick Reference Handbook (QRH), cards 3-1 and 3-8 | CC BY-NC-SA 4.0 | M9 anaphylaxis and malignant hyperthermia |
| WHO, *Managing complications in pregnancy and childbirth*, 2nd ed., 2017 | CC BY-NC-SA 3.0 IGO | M9 eclampsia |
| Ahmad I et al., DAS 2025 difficult airway guideline, Br J Anaesth 2026;136:283-307 | CC BY-NC-ND 4.0 (figures not reproduced) | M9 airway |

Open-access articles under CC BY 4.0 (for example, PMC full texts cited in the claim registry) are cited with
attribution in `src/standards/claimRegistry.ts` and `src/evidence/evidenceRegistry.ts`.

## 4. Rules for adding material

- **No GPL code.** Do not copy code from GPL projects (for example SimTIVA, GPLv3) into this repository.
  Published papers and such programs may be used only as **external reference values** for `npm run sanity`.
- **Share-alike assets get their own folder.** A future asset under a share-alike licence (for example
  Z-Anatomy, CC BY-SA 4.0) goes in its own folder with its own `LICENSE.md`, like the BodyParts3D models.
- **Record a dataset's licence when it is added.** A future dataset (for example VitalDB clips) gets an entry
  here, with its licence, on the day it is added, not before.
- **No trade dress.** 3D models of equipment must be generic and must not copy a manufacturer's design,
  logo or trade dress.
