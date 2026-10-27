# EcoGlobal — B2B sustainable sourcing marketplace

**Website:** https://ecoglobal.in  
**Marketplace:** https://ecoglobal.in/portal.html  
**Backend:** https://ecoglobal-api.ecoglobal-prashanth.workers.dev/api/health  
**Repository:** https://github.com/ronitsaigr/ecoglobal

EcoGlobal is an independent B2B platform for sustainable packaging and materials. Buyers create sourcing requests; suppliers submit applications and evidence, list materials, and quote on eligible matched requests. This implementation is a controlled pilot, not yet a production-ready commercial marketplace.

## Current deployment — 27 October 2026

| Service | Implementation | Verified |
| --- | --- | --- |
| Corporate website | GitHub Pages with GoDaddy-managed domain | Code committed; HTTPS/public reachability still needs independent testing |
| Marketplace frontend | HTML/CSS/JS on GitHub Pages | Cloudflare API URL configured in `assets/config.js` |
| Workers API | `ecoglobal-api` in **personal** Cloudflare account | Script deployment, bindings and workers.dev subdomain enabled via Cloudflare API |
| D1 database | `ecoglobal-db` | Database created and schema applied; tables confirmed |
| Supplier evidence | Private R2 `ecoglobal-private-evidence` | Created; public R2.dev delivery disabled; no custom domains |
| Auth | Worker-managed, PBKDF2-hashed passwords, sessions, invite code | Deployed; end-to-end tests and email verification pending |
| Private pilot access | `REGISTRATION_CODE` secret | Stored in Cloudflare, not committed to GitHub |
| Domain email | `info@ecoglobal.in` | Not independently confirmed to accept mail |

No Supabase services or keys are used. **Do not deploy EcoGlobal to the Cloudflare account associated with Outskill.**

## Features implemented

Buyer and supplier account endpoints; material catalogue displaying only approved listings; supplier onboarding, products and private evidence uploads; buyer RFQs and deterministic category matching; quotations and acceptance; admin review actions, manual matching, internal notifications and audit records. Suppliers remain pending until approved.

The existing corporate site's simple RFQ creator still prepares a mail draft or TXT file. **Real backend RFQ submission is in the /portal.html marketplace.**

## Layout

- `index.html`, `assets/styles.css`, `assets/app.js` — corporate site, category guide and email draft tools
- `portal.html`, `assets/portal.css`, `assets/portal-cloudflare.js` — marketplace pilot interface
- `assets/config.js` — public HTTPS Worker API origin; no credentials
- `cloudflare/src/worker.js` — Workers API
- `cloudflare/migrations/0001_initial.sql` — D1 schema
- `wrangler.toml` — canonical deployment config for personal account
- `docs/CLOUDFLARE_SETUP.md` — operations and security runbook
- `docs/OPERATING_PLAN.md` — business operating strategy
- `tests/check-site.mjs`, `tests/worker-smoke.mjs` — source and simulated Worker checks

## Required before accepting live customers

1. Verify real browser reachability and HTTPS for the domain and Worker; perform complete buyer/supplier/admin test with separate accounts.
2. Verify email ownership, implement password reset and multi-factor controls for admins, and add Turnstile/rate limiting at scale.
3. Publish legal terms, privacy notice, data retention/deletion policy and contact routes; confirm the domain mailbox works.
4. Onboard genuine suppliers with evidence checks; do not invent listings, sales, testimonials or certification claims.
5. Validate cross-border trade terms, applicable tax requirements, contract and dispute policies before purchases or payments.

At deployment verification, D1 held **zero real users, suppliers, products, RFQs, quotations or documents**. The backend script is deployed, but actual HTTP requests from an external client could not be independently executed in this session. The code is **not yet certified ready for production**.

See [Cloudflare setup and verification](docs/CLOUDFLARE_SETUP.md). GitHub Pages deploys from `main`; Worker code must be deployed separately through the correct Cloudflare account.
