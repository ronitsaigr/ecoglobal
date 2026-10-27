# EcoGlobal: Cloudflare deployment (Workers + D1 + R2)

This replaces the **previous Supabase plan**. Github Pages continues serving `ecoglobal.in` and `portal.html`; a Cloudflare Worker hosts the API. Database is Cloudflare D1 (SQLite); supporting evidence is private in Cloudflare R2. An API and migration have been committed but **are not yet deployed**.

## Account choice — IMPORTANT
The currently connected Cloudflare profile exposes only one account, **"Prashanth.r@outskill.com's Account"**, containing the `projectxcal` Worker and `xcal-analytics` D1. It is associated with the user's work email. EcoGlobal is an independent business, so **do not mix real EcoGlobal buyer/supplier data into that account without confirming ownership and long-term access**. Create or connect a separately controlled personal/business Cloudflare account. Enable MFA and keep recovery methods independent of a workplace email.

Cloudflare API currently returns **HTTP 403 / error 10042** for R2: *"Please enable R2 through the Cloudflare Dashboard."* R2 cannot be used until enabled. Do not keep attempting with existing credentials; reconnection will not fix a disabled service.

## Activate a separately owned Cloudflare account

1. Log into the independent Cloudflare account. Enable **R2 Object Storage** from the Dashboard; check billing and terms for the intended usage. D1 and Workers must be available.
2. From a local clone of `ronitsaigr/ecoglobal`, run `npm install` and `npx wrangler login`. Use the **EcoGlobal-owned account**.
3. Run `npx wrangler d1 create ecoglobal-marketplace`. Copy the database UUID into `wrangler.toml` under `database_id`. No real database ID should be committed for the wrong account.
4. Run `npx wrangler r2 bucket create ecoglobal-private-evidence`. Keep bucket private. Confirm neither public bucket access nor `r2.dev` public delivery is enabled.
5. Run `npx wrangler d1 migrations apply ecoglobal-marketplace --remote`. This applies `cloudflare/migrations/0001_initial.sql`. The old Supabase migration must not be used.
6. Choose a random **private 20+ character pilot registration code** and set it via `npx wrangler secret put REGISTRATION_CODE`. Do **not** put this secret in GitHub or `assets/config.js`. Without the secret, registration remains disabled. Use a different code after any exposure.
7. Run `npx wrangler deploy`. Note the resulting `https://ecoglobal-api.<subdomain>.workers.dev` HTTPS address. Workers may need a one-time workers.dev subdomain setup in the dashboard.
8. Test `https://<worker-url>/api/health` and confirm JSON `{"ok":true,...}`.
9. Edit `assets/config.js` to set `apiBase: "https://ecoglobal-api.<subdomain>.workers.dev"`. This URL is public and **not a secret**. Commit the change. GitHub Pages will update the browser client.
10. Confirm `https://ecoglobal.in/portal.html` loads via HTTPS. Sign up pilot users using the privately distributed invitation code, then test each workflow.

## First administrator

Only the account owner can promote a verified test user. Initially register a buyer account with an address under your control. Then use D1, **only after double-checking the email**, from Wrangler (requires privileged Cloudflare access):

```bash
npx wrangler d1 execute ecoglobal-marketplace --remote --command="SELECT id,email,role FROM users WHERE email='your-controlled-email@example.com'"
npx wrangler d1 execute ecoglobal-marketplace --remote --command="UPDATE users SET role='admin' WHERE email='your-controlled-email@example.com'"
```

This pilot auth has **no automatic email verification**, so account control cannot be assumed from signup alone. Before promoting the admin, authenticate separately that you control the email and the password; never promote an arbitrary registered email. Admin access is not achievable through the public Worker API.

## End-to-end pilot test

Use separate browser tabs/profiles and different addresses/passwords for the buyer, supplier and administrator.
- [ ] HTTPS is enabled and working for EcoGlobal and the Worker API.
- [ ] Invite-only registration and password login work; password errors are rate limited.
- [ ] Buyer A cannot read Buyer B's requests or quotes.
- [ ] Supplier A cannot read Supplier B's private evidence or pending listings.
- [ ] Supplier application starts `pending`; only admins can approve it.
- [ ] Product listing starts `pending`; only approved supplier + approved product appear in public catalogue.
- [ ] Private PDF/JPG/PNG evidence upload <=5 MB works through authenticated Worker and private R2.
- [ ] An open RFQ is matched to approved suppliers in the same category.
- [ ] Matched suppliers can submit one quote each; unassigned suppliers cannot read or quote the RFQ.
- [ ] The buyer can accept or decline a quote and notifications appear.
- [ ] Only one quote per RFQ can be accepted (D1 unique index).
- [ ] Admin can reject suppliers/products and manually match approved suppliers.
- [ ] Reediting company/product details resets listing approval for review.
- [ ] Login/registration data is not sent from the legacy corporate-site mailto forms.

## Security and launch limitations

This is an invitation-only **pilot foundation**, NOT a production-ready public marketplace. Passwords are salted PBKDF2 hashes, sessions are random tokens stored hashed in D1 with a seven-day expiry, with a rate limit on login failures. The browser keeps the session token in `sessionStorage` because the API and GitHub Pages are on separate sites. Escape and validate output; avoid external scripts and install CSP before production. Worker CORS is restricted to `ecoglobal.in`, `www.ecoglobal.in` and localhost development.

**Before open public registration:** add email ownership verification, password reset/recovery, automated bot and credential-stuffing protection, audit/alerting, a stronger invitation/onboarding system, admin MFA, R2 file scanning and document retention policy, security testing, privacy terms/consent, transaction/contract policy and production backups. Turnstile and production rate limiting should be configured at the edge. Buyer quotes are nonbinding sourcing leads; there is no checkout, escrow, shipping, tax engine, or automated legal verification.

## File guide

`cloudflare/src/worker.js` — authenticated REST API and business rules
`cloudflare/migrations/0001_initial.sql` — D1 SQLite schema
`wrangler.toml` — deployment bindings and account-specific placeholder UUID
`assets/portal-cloudflare.js` — marketplace browser app
`assets/config.js` — public Cloudflare API URL, currently blank
`portal.html` — marketplace user interface

The code is in GitHub, but operational activation and real authentication/security tests depend on an EcoGlobal-owned Cloudflare account with R2 enabled.
