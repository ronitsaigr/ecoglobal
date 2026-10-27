import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const f of ['index.html','portal.html','assets/portal-cloudflare.js','assets/config.js','assets/portal.css','assets/app.js','cloudflare/src/worker.js','cloudflare/migrations/0001_initial.sql','wrangler.toml','docs/CLOUDFLARE_SETUP.md']) {
 assert(fs.existsSync(new URL('../'+f,import.meta.url)),f+' missing');
}
for(const js of ['assets/app.js','assets/portal-cloudflare.js','assets/config.js','cloudflare/src/worker.js']) {
 execFileSync(process.execPath,['--check',new URL('../'+js,import.meta.url).pathname]);
}
assert(read('index.html').includes('href="/portal.html"'),'Corporate website links to marketplace');
assert(read('portal.html').includes('/assets/portal-cloudflare.js'),'Cloudflare browser script loaded');
assert(!read('portal.html').includes('supabase-js'),'Old Supabase browser dependency removed');
assert(read('assets/config.js').includes('apiBase'),'Public Cloudflare API configuration present');
for(const id of ['view-explore','view-buyer','view-supplier','view-admin','review-documents'])assert(read('portal.html').includes('id="'+id+'"'),id+' missing');
const s=read('cloudflare/migrations/0001_initial.sql');
for(const table of ['users','sessions','suppliers','products','rfqs','matches','quotes','documents','notifications','audit_log'])assert(s.includes('CREATE TABLE IF NOT EXISTS '+table),'Missing D1 table '+table);
assert(s.includes('one_accepted_quote'),'Quotes require single acceptance');
const w=read('cloudflare/src/worker.js');
for(const path of ['/api/auth/login','/api/auth/register','/api/catalog','/api/rfqs','/api/quotes','/api/documents','/api/admin/review'])assert(w.includes(path),'Missing Worker route '+path);
assert(w.includes('REGISTRATION_CODE')&&w.includes('PBKDF2'),'Invitation and password hashing required');
assert(read('wrangler.toml').includes('binding = "DB"')&&read('wrangler.toml').includes('binding = "EVIDENCE"'),'Cloudflare bindings required');
console.log('EcoGlobal Cloudflare source-contract checks passed. Live D1/R2 and authorization tests still required.');
