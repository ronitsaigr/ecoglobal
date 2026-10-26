# EcoGlobal — Activate the combined Phase 2 + Phase 3 marketplace
_Last updated: 26 October 2026_

## What has been coded

The public corporate website now links to [the marketplace workspace](https://ecoglobal.in/portal.html). The workspace includes:
- Email/password signup and sign-in (Supabase Auth); permanent buyer/supplier account category
- Buyer RFQ creation, request history, matched supplier quotations and quote decisions
- Supplier registration, private contact information, evidence upload, draft listings and quotation submission
- Administrator approvals/rejections with review notes; document review and direct supplier invitations
- Automatic matching based on category **and approved supplier/product status**, including backfilling open RFQs on product approval
- Private evidence bucket, row-level security, in-app notifications and approved-only public listing search
- Basic audit fields (created_at), status records, indexes and public/owner/admin access separation

### What is NOT active yet

The connected GitHub repository is static-hosted on GitHub Pages. It cannot operate an authentication or database backend by itself. `assets/config.js` intentionally contains empty public connection values. **Until you connect a personal Supabase project, no buyer/supplier data will be submitted or stored through the workspace.**

The public website's original RFQ form is still a **mailto draft**, not a server submission; direct real RFQ submission is in `portal.html` once activated. The placeholder mailbox `info@ecoglobal.in` is not verified. Do not begin paid marketing or invite sensitive submissions until HTTPS, identity, contact and legal readiness checks pass.

## Activate in your OWN Supabase project

1. Create a Supabase project controlled by **your independent EcoGlobal business**, not an employer or third party. Enable MFA on the owner account.
2. Open **SQL Editor**, then run the complete script in `supabase/migrations/202610260001_marketplace.sql` ONCE against this new project. It creates the database schema, review functions, access policies and a private Storage bucket.
3. In **Authentication → URL Configuration**, set **Site URL** to `https://ecoglobal.in` and add `https://ecoglobal.in/portal.html` to your allowed redirect URLs. If necessary include `https://www.ecoglobal.in/portal.html` after verifying that address works.
4. In your Supabase project dashboard, copy the **Project URL** and the **public/anon or publishable client key** (never a service-role/secret key). Edit `assets/config.js` in GitHub:
   ```js
   window.ECOGLOBAL_CONFIG = {
     url: "https://YOUR_PROJECT_REF.supabase.co",
     anonKey: "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY"
   };
   ```
   Publishing an anon/publishable key to the browser is expected; authorization is enforced server-side with RLS. NEVER publish a service-role key, database password or API secret.
5. Ensure **Enforce HTTPS** is enabled in GitHub Pages before accepting customer logins, evidence or RFQs. The app refuses backend connection over ordinary HTTP.
6. Visit `https://ecoglobal.in/portal.html` and create your personal account using an email you control. Complete any email confirmation.
7. **Bootstrap the first admin** using SQL Editor only, after verifying the precise user account:
   ```sql
   select id,email,email_confirmed_at from auth.users where email='YOUR_VERIFIED_EMAIL';
   -- Check exactly one verified result before executing:
   insert into public.platform_admins(user_id)
   select id from auth.users
   where email='YOUR_VERIFIED_EMAIL' and email_confirmed_at is not null;
   ```
   Refresh/re-sign in and check that your Admin tab is visible. Regular signups cannot grant themselves admin rights.
8. Register a separate supplier test account and a buyer test account using **different email addresses**. Don't enter fictional suppliers as real public inventory.
9. Test the full loop in the checklist below before onboarding real counterparties.

### Operational test checklist

- [ ] TLS/HTTPS is valid at ecoglobal.in, including the browser portal.
- [ ] Buyer and supplier accounts can confirm emails, log in and sign out.
- [ ] A supplier can create a company profile; the profile is *pending* and is not publicly listed.
- [ ] Supplier can add a material listing and upload PDF/PNG/JPG evidence (5 MB maximum); other suppliers cannot read this evidence.
- [ ] Admin can view private evidence, reject with feedback, or approve a genuine company.
- [ ] Admin can approve a genuine listing only after its parent supplier has been approved.
- [ ] The public catalogue shows approved listings and never shows pending/rejected listings.
- [ ] Buyer submits an RFQ with category, quantity, delivery country, date and requirements.
- [ ] An approved supplier with an approved listing in that category receives an RFQ match.
- [ ] Supplier can submit one quotation to the matched RFQ; another supplier cannot access it unless matched.
- [ ] Buyer can review the quote and accept/decline once; a second accepted quote for the same RFQ is blocked.
- [ ] Closing an RFQ blocks new quotation submissions.
- [ ] Revising a supplier/company or product listing returns it to pending review.
- [ ] Admin can manually invite another approved supplier to an open RFQ.
- [ ] In-app notifications appear when a match or quote is created.

### Critical access checks

Use independent buyer/supplier sessions in separate browser profiles to confirm:
- Visitors cannot read RFQs, contacts, supplier evidence or quotes.
- Supplier A cannot see Supplier B's pending profile, private contact records, documents, RFQs or quotations.
- Buyer A cannot access Buyer B's RFQs or quotes.
- Neither buyer nor supplier can promote its own review status or admin membership from the browser.
- A service role key never appears in HTML, CSS, JS, GitHub commits or browser network responses.

### Supplier review SOP (mandatory before public launch)

Require: business identity and ownership check; representative authorization; website/domain consistency; relevant product spec sheets; supporting certificates or test results with exact scope, issuer, validity and product mapping; supply capability/MOQ/lead-time confirmation; explicit approved/rejected decision with reasons. Internal 'approved' **does not mean third-party certified**. Claims about recycled content, compostability, safety or food-contact suitability must be verified for the precise product and jurisdiction. Maintain a review log in the business's own records.

### Commercial / legal readiness

This MVP does **not** process payments, guarantee suppliers, facilitate legally binding electronic contracts, calculate shipping/taxes, or provide escrow. Before commercial transactions: decide the company's legal entity, terms, privacy notice, return/dispute policies, consent handling, cross-border compliance, export restrictions, and tax obligations with professional assistance. Add rate limiting/CAPTCHA, abuse moderation, backup/restore testing, retention rules, privacy requests, deliverability and email notifications before a wider production rollout. Set up an actual domain mailbox or an authenticated backend contact channel. GitHub Pages is fine for the static frontend but is **not a replacement for the backend**.

## Data model

`profiles` → `suppliers` + `supplier_private` + `products` + `supplier_documents`; buyer `rfqs` → `rfq_matches` → `quotes`; `notifications` for recipient-only alerts; `platform_admins` for explicit grants. Auth credentials are managed by Supabase Auth, not stored in these tables.

## Deployment behavior

- GitHub Pages serves the corporate site and `portal.html`.
- Pushing `main` updates the static client.
- SQL migrations do **not** apply automatically. Only run them on the intentionally selected personal Supabase project.
- Public listings, account signups, evidence, reviews and RFQs stay disabled until backend setup.
- When the app is active, modify SQL with versioned migrations and test them in a staging environment before production changes.

## Known current MVP constraints

No email/SMS alerts (only in-app), integrated checkout, supplier performance scores, logistics booking, quote attachments, admin activity-log UI, advanced ranking, fraud detection or cross-border automated contracts. No verified suppliers or real buyer activity has been seeded. Matching is deterministic by category, not AI or quality ranking. Suppliers' independently provided documents are not inherently trusted.
