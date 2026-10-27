# EcoGlobal — B2B sustainable sourcing platform

**Website:** https://ecoglobal.in
**Marketplace workspace:** https://ecoglobal.in/portal.html
**Code:** https://github.com/ronitsaigr/ecoglobal

EcoGlobal is an independent global B2B sourcing initiative, initially focused on sustainable packaging and related materials. Buyers can specify requirements; suppliers can apply for review and respond to matched RFQs.

## Current architecture

| Layer | Technology | Status |
| --- | --- | --- |
| Company website | GitHub Pages on GoDaddy-managed `ecoglobal.in` | Source committed |
| Marketplace UI | Vanilla HTML/CSS/JavaScript | Committed, backend disabled |
| API | Cloudflare Workers | Source committed, not deployed |
| Relational data | Cloudflare D1 (SQLite) | Migration committed, not applied |
| Supplier evidence | Private Cloudflare R2 bucket | Planned binding; R2 not enabled in connected account |
| Auth | Worker-managed, invitation-only login | Written, awaiting deployment |
| Data safety | Backend role checks, input validation, approved-only catalog, hashed sessions | Requires live tests |

**Cloudflare is the selected backend. There is no active Supabase dependency.**

## Code layout

- `index.html`, `assets/styles.css`, `assets/app.js` — company website, educational catalogue and mailto-based RFQ draft creator.
- `portal.html`, `assets/portal.css`, `assets/portal-cloudflare.js` — buyer, supplier and administrator workspace.
- `assets/config.js` — public Cloudflare API URL. Blank until deployment.
- `cloudflare/src/worker.js` — Workers API for accounts, invitations, companies, products, RFQs, matching, quotations, evidence, notifications and approvals.
- `cloudflare/migrations/0001_initial.sql` — D1 schema and indexes.
- `wrangler.toml` — Cloudflare deployment template with account-specific placeholder database UUID.
- `docs/CLOUDFLARE_SETUP.md` — activation, security checklist and first-admin instructions.
- `docs/OPERATING_PLAN.md` — the commercial operating plan.
- `tests/check-site.mjs` — automated JavaScript and source-contract checks.

## Important: not yet activated

The source files have been committed to GitHub, but the cloud backend has **not** been deployed. The connected Cloudflare account is named after an Outskill work email, includes Project X-Cal infrastructure, and the R2 service is currently disabled. EcoGlobal customer data should be deployed only into an account controlled by the independent business.

The portal displays a backend-not-connected message until `assets/config.js` contains a deployed HTTPS Worker URL. This avoids silently collecting buyer or supplier information.

The corporate website's forms still prepare an email draft or TXT file; they are not server submissions. `info@ecoglobal.in` is provisional and must be checked before outreach.

There are **no real onboarded suppliers, public product inventory, transactions, escrow, certification guarantees, checkout, payment processing, or logistics integrations**. The pilot is invitation-only; do not open public registration until verified email ownership, recovery, CAPTCHA/rate limiting, admin MFA, privacy notice and security tests are complete.

## Deployment steps

Follow [docs/CLOUDFLARE_SETUP.md](docs/CLOUDFLARE_SETUP.md). Keep GoDaddy as the authoritative DNS provider and GitHub Pages for the corporate site; the Worker can serve the API over its separate HTTPS workers.dev URL. Do not disrupt existing GitHub Pages DNS records.

Use a personal/EcoGlobal-owned Cloudflare account, enable R2, create D1 and R2 resources, run the migration, deploy the Worker, then set `assets/config.js` to the public Worker URL.

All pushes to `main` update GitHub Pages, but **do not** automatically deploy a Worker or apply database migrations. Those must run under the explicitly chosen independent Cloudflare account.

## Business operating guidelines

Supplier and product approvals are internal application reviews, **not independently issued certifications**. Check supporting evidence before making environmental claims. Validate trade policy, privacy, terms and tax obligations before sourcing transactions. Real RFQ email notifications and payments are not implemented.
