# EcoGlobal — Sustainable sourcing platform

**Live target:** https://ecoglobal.in  
**Repository:** https://github.com/ronitsaigr/ecoglobal  
**Delivery:** GitHub Pages, publishing the \`main\` branch from the repository root

EcoGlobal is being developed as a global B2B sourcing marketplace, beginning with sustainable packaging and adjacent materials. Its working principles are clear requirements, accurate product documentation, and practical buyer–supplier conversations.

## What is implemented

- Responsive company website with dedicated home, catalogue, how-it-works, supplier, buyer RFQ, and about sections
- Browse/search/filter across six **sourcing categories**, not real-time product inventory
- Material descriptions, likely applications, and a documentation checklist for buyer due diligence
- Buyer RFQ creator with required fields, email-draft option, clipboard copy, and downloadable TXT
- Supplier introduction form with the same email-draft / clipboard / download options
- Category-to-RFQ preselection, FAQ, basic SEO metadata, sitemap, mobile navigation and accessibility features
- Custom domain and GitHub Pages static hosting

### Important current limitations

**This is a public-facing, interactive MVP; it is not yet a production transaction marketplace.**

- There are **no registered or verified suppliers** and no live product offers.
- There is **no backend, user account, database, automated RFQ submission, supplier matching, payment, checkout, quotation exchange or order status**.
- An email button creates a mail draft on the visitor's device. It does **not** store or transmit a form submission on EcoGlobal's servers.
- The provisional contact destination in the code is \`info@ecoglobal.in\`. **Verify that this mailbox is active and can receive external email before inviting real buyers/suppliers to contact the business.** The GoDaddy DNS screenshot from Oct 26 showed no MX record; check the actual mail service.
- Material descriptions are examples of sourcing **categories**, not certified environmental claims or inventory guarantees.
- Never label suppliers 'verified' until an established evidence-review procedure has been applied to those suppliers and the results documented.

## Site layout

\`\`\`
index.html           B2B platform interface
assets/styles.css    Responsive visual system
assets/app.js        Category search/filter and browser-side RFQ tools
favicon.svg          Brand icon
CNAME                Custom GitHub Pages domain
.nojekyll            Static hosting setting
404.html             Error page
robots.txt           Crawler directive
sitemap.xml          Site map
docs/OPERATING_PLAN.md  Go-to-market and product roadmap
\`\`\`

## Publishing

Every push to \`main\` republishes GitHub Pages (if Pages remains set to deploy from \`main\`, root). In **Settings → Pages** the custom domain should be \`ecoglobal.in\`.

Current recommended DNS (at the authoritative DNS provider):

| Type | Host | Destination |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | ronitsaigr.github.io |

Do not remove mail-related DNS records. Enable **Enforce HTTPS** when the certificate has been provisioned.

## Next steps to make this an operating business

1. Set up a working domain inbox or a backend intake service; test a complete enquiry from a different email account.
2. Decide the legal business identity, applicable buyer/supplier terms and a suitable privacy notice, with professional review.
3. Stand up authentication, database, file/document storage, notifications, abuse controls and audit trail.
4. Start actual suppliers in one tight vertical, verify documentation within a defined standard and review cadence, and publish only approved offers.
5. Enable private RFQs, supplier matching, quote requests, comparisons, follow-up status and business dashboards.
6. Validate pricing, contracts, returns / disputes, cross-border trade requirements and payment flows before any transaction feature goes live.

See [docs/OPERATING_PLAN.md](docs/OPERATING_PLAN.md).

## No build step

The site uses vanilla HTML/CSS/JS. To preview locally run any static HTTP server in the repository directory. Form data is only used within the current page and in user-initiated copy/download/mail actions.
