# EcoGlobal — Cloudflare infrastructure and operating runbook

**Account:** personal Cloudflare login (not Outskill)  
**Cloudflare account ID:** `299d3d658aaf5f9490802917dcb4f704`  
**Provisioned:** 27 October 2026  
**Public API target:** https://ecoglobal-api.ecoglobal-prashanth.workers.dev  
**Front end:** https://ecoglobal.in/portal.html (GitHub Pages)  
**Status:** Infrastructure provisioned and Worker deployment recorded by Cloudflare; external HTTPS and full browser E2E behavior still require independent verification.

## Provisioned resources

| Component | Identifier | Status |
| --- | --- | --- |
| D1 database | `ecoglobal-db` / `3662c75f-b552-471d-aa78-284c04224a40` | Created; initial schema applied |
| R2 bucket | `ecoglobal-private-evidence` | Created privately; no public bucket hostname configured |
| Worker | `ecoglobal-api` | Uploaded as module, script bound to D1/R2 |
| Workers subdomain | `ecoglobal-prashanth.workers.dev` | Enabled for Worker |
| Worker secret | `REGISTRATION_CODE` | Set in Cloudflare; secret value NOT stored in source |
| GitHub frontend | `ronitsaigr/ecoglobal` | Uses `assets/portal-cloudflare.js`, connected in `assets/config.js` |

**The domain ecoglobal.in remains on GoDaddy / GitHub Pages.** Do not change its DNS or migrate the domain just to use Workers. The API uses the Cloudflare-managed HTTPS workers.dev hostname. CORS allows the two EcoGlobal HTTPS website origins, plus local development URLs.

## Database and deployments

Root `wrangler.toml` is the canonical Wrangler configuration. Run from the repository root:

```bash
npm install
npx wrangler whoami    # ensure personal Cloudflare account
npx wrangler d1 migrations list ecoglobal-db --remote
npx wrangler deploy
```

The `cloudflare/wrangler.toml` inside the subdirectory also has matching D1/R2 bindings for running commands from there; prefer the root config to avoid ambiguity. Never deploy to the work-associated Cloudflare account. Schema source: `cloudflare/migrations/0001_initial.sql`. It was applied through the D1 API; therefore Wrangler migration bookkeeping may not show it as applied. **Do not reapply without inspecting the existing schema.** The statements use `IF NOT EXISTS` but future migrations must be versioned and tested.

## Invite-only pilot

Worker uses a long random `REGISTRATION_CODE` secret, which is intentionally absent from GitHub. No public sign-up without this code. Worker manages password hashing (PBKDF2), sessions, login-attempt throttling, and role-based authorization. **Important: email address ownership is not yet verified automatically.** Invitation code is not a substitute for email validation. Keep the invite code private and rotate it if exposed. Do not place it in the public frontend or GitHub.

Only the owner should provision a first admin. First sign up using an invitation code from the account owner, then authenticate control of the email separately before promotion. Example privileged D1 command:

```bash
npx wrangler d1 execute ecoglobal-db --remote --command="SELECT id,email,role FROM users WHERE email='YOUR_PERSONAL_EMAIL'"
# Only when ownership is independently confirmed:
npx wrangler d1 execute ecoglobal-db --remote --command="UPDATE users SET role='admin' WHERE email='YOUR_PERSONAL_EMAIL'"
```

Never store raw passwords or direct admin-creation secrets in the public repository.

## Workflow readiness

- Buyer signup/login, RFQs, quote review, and notifications have backend endpoints.
- Supplier profile submission, listing approval, private document upload/retrieval, RFQ matching, and quoting have backend endpoints.
- Admin review, document access, manual assignment, and audit_log events are implemented.
- Database tables are deployed; no real suppliers or products have been verified or added by this setup.
- No payment handling, escrow, signed procurement contracts, shipping, email verification, automated email notifications, spam-control service or user self-service password recovery yet.

## Launch validation (required before customer onboarding)

1. Verify https://ecoglobal.in/portal.html is valid HTTPS and loads the new portal script and config.
2. Verify https://ecoglobal-api.ecoglobal-prashanth.workers.dev/api/health returns an OK JSON response; verify /api/catalog returns an empty array before approved listings exist.
3. Test invite-only signup and login in separate buyer, supplier and admin sessions. Ensure wrong invite code cannot register and login throttles repeated failures.
4. Test buyer A cannot read or update buyer B data, and supplier A cannot read supplier B data or private R2 documents.
5. Add genuine supplier documents; independently verify supplier registration and applicable certifications before approving any listing.
6. Submit RFQ, validate approved-category matching, create quote, accept/decline and close request. Verify one-accepted-quote constraint.
7. Add email verification, account recovery, CAPTCHA/Turnstile, stronger rate limiting, retention/privacy policies, legal entity and privacy/terms pages before production rollout.
8. Arrange a functioning domain mailbox (e.g. info@ecoglobal.in) and test inbound responses. Avoid claiming verified suppliers until the evidence policy is operational.

### Data handling

R2 is private; never enable public bucket delivery for supplier evidence. Only authenticated supplier-owner/admin retrieval should be possible through the Worker. No environment secrets should enter the browser. Review storage limits and malware scanning before onboarding at scale. Store only business-necessary information, publish proper terms and privacy notice, and set up backup/restore and incident processes.

## Troubleshooting

If the website loads but the workspace reports an error: verify HTTPS; inspect browser Network tab for API response; ensure D1 binding `DB`, R2 binding `EVIDENCE`, and Worker secret `REGISTRATION_CODE` remain bound. The Worker is deployed on `workers.dev` and does not require Cloudflare DNS control of ecoglobal.in.
