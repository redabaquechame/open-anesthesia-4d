# Open Anesthesia 4D — Transparent Reality Lab

Free, zero-login, offline-capable web simulator for teaching the anesthesia workstation:
a see-through 3D machine with six ventilator drive types, a circle breathing system with live gas
particles, two-compartment lungs, and a 50 Hz bedside monitor (airway pressure, flow, capnography).

> Educational simulator only. Not a medical device. Not for patient care decisions.

## Run it

```bash
npm install
npm run dev
```

## Publish it free on GitHub Pages

1. Create an empty repository on GitHub and push this folder to its `main` branch.
2. On GitHub: **Settings → Pages → Source: GitHub Actions**.
3. Every push to `main` rebuilds and publishes the site automatically.

## What is live

- **M1 + M2** — workstation, ventilation, capnography, 10 injectable faults, blind "mystery fault" mode;
  SFAR / ASA 2008 checkouts and the Mapleson A–F table
- **M3** — volatile uptake & distribution (multi-compartment simulator model), vaporizer misfill,
  low-flow O2/argon balance on a concentrator, CO2e counter (GWP values still to be verified)
- **M4** — propofol TCI (Marsh, Schnider, Eleveld structure without maturation) + Minto remifentanil,
  simulated EEG/DSA and smoothed BIS
- **M5** — TOF / PTC at corrugator vs adductor pollicis, rocuronium and sugammadex
- **M6** — 3D→2D supraclavicular ultrasound slicer, LAST checklist, valvular P–V loops
- **M7** — thoracic vs lumbar epidural with loss of resistance and a virtual C-arm
- **M8** — bronchoscope view and left double-lumen tube positioning
- Evidence drawer (peer-reviewed sources with DOIs), printable debrief card, offline xAPI log
  (stored in the browser only), QR / link sharing, 4 interface locales, 3 regional gas colour standards

Moodle LTI 1.3 is **not** supported: an LTI 1.3 tool needs a server for its OIDC/JWT launch,
and this is a static site.

## License

Apache-2.0 for the code (`LICENSE`). Anatomy models, fonts and cited clinical sources keep their own
licences: see `THIRD_PARTY_NOTICES.md`.
