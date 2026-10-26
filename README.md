# EcoGlobal — starter landing page

A simple, dependency-free, responsive first page for **ecoglobal.in**, ready for GitHub Pages. This is intentionally a neutral brand placeholder while the EcoGlobal product direction is being developed.

## Repository

Create a **public** repository named `ecoglobal` under the GitHub account `ronitsaigr`, with default branch `main`. Add these files to the repository root:

- `index.html` — the landing page and all styles
- `favicon.svg` — brand icon
- `CNAME` — `ecoglobal.in`
- `.nojekyll` — disables unnecessary Jekyll processing

## Publish

1. In the repository: **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select `main` and `/(root)`; click **Save**.
4. In **Settings → Pages → Custom domain**, enter `ecoglobal.in` and save. Verify the domain if GitHub requests it. The `CNAME` file alone doesn't enable the domain setting.
5. Once the custom domain is saved in GitHub, change DNS **where the domain's nameservers are hosted** (often GoDaddy DNS for GoDaddy-purchased domains):

| Type | Host | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | ronitsaigr.github.io |

Remove or replace conflicting `A`, `AAAA` and `CNAME` records for the **web hosts only**. Keep any MX, SPF, DKIM, TXT, or other records used by email or third-party services. Do not add `*.ecoglobal.in` wildcard records.

6. After DNS and HTTPS certificates are ready, enable **Enforce HTTPS** in the same GitHub Pages settings.

DNS changes can take up to 24 hours. GitHub Pages automatically republishes when the tracked branch changes.

Documentation:
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site