# EcoGlobal — operating plan for a real B2B business
_Last updated: 26 October 2026. Working proposal, not a statement that operations or supplier verification have begun._

## 1. Positioning
EcoGlobal is a **documentation-first global B2B sourcing platform**, starting with **sustainable packaging and adjacent materials**. Initial supply-side outreach can prioritize manufacturers in India, with buyers in India and overseas, subject to actual supply routes and laws.

**Buyer job:** "I need a packaging/material option that meets my functional, commercial and environmental requirements, without wasting weeks finding and screening suppliers."

**Supplier job:** "I want relevant B2B sourcing enquiries with specifications, not anonymous low-quality leads."

**Deliberate focus:** become useful for procurement before trying to become a broad consumer eco-products store or general listing directory.

## 2. Pilot categories
- Recycled-content corrugated packaging
- Molded fiber protective inserts
- Paper mailers and sleeves
- Compostability-assessed flexible films (only with correct test and application context)
- Reusable transit packaging
- Labels, wraps and print components

These are sourcing **areas**. Do not publish product prices, availability, certifications, manufacturer names, logos, transaction counts or customer testimonials unless backed by permission and current evidence.

## 3. Initial go-to-market loop
1. Recruit and interview **5–10 real packaging buyers**, identify repeat requirements and their current supplier evaluation process.
2. Find **5–10 relevant suppliers** concentrated in two initial categories; collect consent for publishing.
3. Collect and assess capability info, sample specs, minimum order quantities, locations, product evidence and quote turnaround times.
4. Take structured RFQs, screen for completeness, and only introduce buyers to relevant suppliers.
5. Track qualification, first quote, sample requested, trial purchase, repeat order and dispute resolution.
6. Iterate on material families and commercial fees using actual demand, not hypothetical traffic.

These sample counts are goals, not current platform metrics.

## 4. Commercial hypotheses to test
- Supplier subscription for approved listings and stronger enquiry tools
- Sourcing/service fee when a buyer explicitly engages EcoGlobal to coordinate requirements
- A transparent transaction commission (illustratively **2–5%**, not committed pricing) for transactions that EcoGlobal actually facilitates
- Supplier enablement services: digital catalog preparation and documentation workflow

Choose a model after testing willingness to pay, supplier economics and applicable invoicing/tax rules. Avoid charging for unverifiable leads.

## 5. Real product workflow
**Buyer:** sign in → create private RFQ → select materials and quantity → provide location and evidence criteria → submit → progress/status → receive genuine quotes → compare → samples/order.

**Supplier:** apply → provide corporate and product identity → verification workflow → approve scoped listings → respond to matched private RFQs → quote revisions and status.

**Admin:** review applications → request missing documents → track document expiry → approve listings only in their supported scope → manage enquiries, matching, disputes, fraud flags and audit history.

## 6. Trust and claims policy
- Ask what exact environmental claim is being made and **to which product variant** it applies.
- Require evidence proportional to the claim, jurisdiction and end use.
- Store issuer, date, document scope, expiration date (if applicable), source and reviewer notes.
- Do not assume a material is sustainable merely because it is paper-based, plant-derived, compostable-labelled or recycled-labelled.
- Avoid invented impact statistics and don't label a supplier 'verified' before evidence review.
- Communicate end-of-life and collection/reuse infrastructure limits clearly.

## 7. Technical rollout

### Phase A — deployed now: public discovery MVP
GitHub Pages static interface with material search, documentation guides, browser-side RFQ generation and supplier introduction forms. No backend. All exchanges require manual copy/download/email by the visitor.

### Phase B — first revenue-capable release
- Create an **EcoGlobal-controlled** production backend, not a corporate/employer Cloudflare account.
- Buyer/supplier intake API with bot protection, validation, spam controls and strict rate limits
- Transactional email service / active domain inbox; test mail routing and spam placement
- DB for enquiries, suppliers, products and audit log; private admin console
- Consent and privacy notice consistent with actual data flows
- Status notifications, assignment, follow-ups and response times

### Phase C — B2B marketplace
- User identity and roles for buyers/suppliers/admin
- Verified supplier catalog, product variants, controlled documents and expiry review
- Private RFQ matching, quotations, messaging, samples and decision history
- Fees, invoicing and payments only after compliance, trust, dispute and seller-of-record rules are defined
- Reporting for demand, quality, quotes, time-to-value, repeat procurement and unit economics

## 8. Business health metrics
- Visitors → material search → RFQ starts → **valid submitted enquiries**
- Suppliers contacted → responses → documentation completed → verified eligible offers
- RFQs → suppliers matched → quotes received → samples → paid orders → repeats
- Time to first qualified quote, quote acceptance, acquisition cost, retention, gross revenue and contribution after sourcing costs

Do **not** measure downloaded RFQs or mailto clicks as guaranteed submitted leads.

## 9. Launch blockers before commercial traffic
- Confirm public domain loads with valid HTTPS.
- Confirm **info@ecoglobal.in** can receive mail; domain screenshot showed no MX record. Verify mail provider before changing DNS.
- Deploy actual form backend; consent and anti-abuse setup.
- Identify the company/operating entity, verified official contact methods, jurisdiction-appropriate legal/privacy/terms details.
- Recruit real suppliers and request permission + documentary evidence before presenting specific products as available.

## 10. Founder decision points
- Commit the first one or two verticals (suggest paper/corrugated and molded fiber).
- Select a working buyer/supplier correspondence inbox and backend owner.
- Set baseline supplier screening and documentation policy.
- Define buyer price discovery and fee policy, including who invoices whom.
