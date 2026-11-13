# PawCare — Product, Design & AI Systems Intern Assignment

An end-to-end submission for the **Product Development, Design & AI Systems Intern** assignment: a **Practo-for-animals** discovery MVP, an **AI education/course landing page**, and a working **AI-powered social carousel pipeline**.

Design language is inspired by [armandev.space](https://armandev.space) (warm monochrome surfaces, dashed borders, retro badges, Geist/Caveat typography).

## ✨ What's inside

### 1. Animal-care discovery MVP (`pawcare/`)
A mobile-first prototype for pet owners to find and book animal care:
- **8 categories** — vet clinics, hospitals, boarding, diagnostics, ambulance, grooming, training, NGOs
- **Search + filters** — species (cat/dog/bird/small animal), emergency, 24×7, open-now, sort by distance/rating/fee
- **Map view** with pins synced to results
- **CTAs** — Find a Vet, Explore Services, List Your Business, Submit a Correction, Book / Call / Dispatch
- Booking modal with validation, detail sheets with "last verified" dates

### 2. AI course landing page (`academy/`)
Lead-capture landing page for an AI education program:
- Track switcher (Python · Web Dev · AI/ML), curriculum per track
- 3-step funnel with partial-lead capture
- INR pricing + EMI options, application flow

### 3. Idea → carousel AI pipeline (`carousel/`)
A Python pipeline that turns **one typed sentence** into a researched, branded, editable 7-slide social carousel:
```
idea → research → copy → art direction → render → review (--render-only) → export
```
- **Renders 1080×1350 PNGs + PDF** via HTML + Playwright
- Editable via `carousel.json` (re-render in ~30s without an LLM)
- Sample output: `carousel/sample/` (7 slides + LinkedIn PDF)

## 🧪 Verification
- Playwright E2E suite: **50/50 passing**, zero JS errors, zero horizontal-overflow offenders on mobile.

## 🛠 Stack
Static HTML/CSS/JS (no build step), Python + Playwright for the carousel pipeline.

## 🚀 Run locally
```bash
python3 -m http.server 8093
# open http://localhost:8093
```

## 📁 Project structure
```
index.html            # hub page
assets/               # shared design system (style.css, shell.js, icons.js)
pawcare/              # animal-care discovery MVP
academy/              # AI course landing page
carousel/             # idea→carousel pipeline + sample renders
.e2e.py               # Playwright test suite
```

---
*Built for the Product, Design & AI Systems Intern assignment. © 2026 Vaibhav*
