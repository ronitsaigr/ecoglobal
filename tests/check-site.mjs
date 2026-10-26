import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
for (const file of ['index.html','portal.html','assets/styles.css','assets/app.js','assets/portal.css','assets/portal.js','assets/config.js','supabase/migrations/202610260001_marketplace.sql','docs/PHASE_2_3_SETUP.md']) {
 assert(fs.existsSync(new URL('../'+file,import.meta.url)),file+' is missing');
}
for(const p of ['assets/app.js','assets/portal.js','assets/config.js']) execFileSync(process.execPath,['--check',new URL('../'+p,import.meta.url).pathname]);
assert(read('index.html').includes('href="/portal.html"'),'The business site must link to the marketplace');
for(const id of ['view-explore','view-buyer','view-supplier','view-admin','review-documents']) assert(read('portal.html').includes('id="'+id+'"'),id+' view is missing');
const sql=read('supabase/migrations/202610260001_marketplace.sql');
for(const table of ['profiles','platform_admins','suppliers','supplier_private','products','rfqs','rfq_matches','quotes','supplier_documents','notifications']) assert(sql.includes('alter table public.'+table+' enable row level security;'),table+' must have RLS');
assert(sql.includes('m.rfq_id=rfqs.id'),'RFQ access policy must correlate correctly');
assert(sql.includes('m.rfq_id=quotes.rfq_id'),'Quote access policy must correlate correctly');
assert(sql.includes('create unique index if not exists only_one_accepted_quote_per_rfq'),'At most one accepted quote is required');
assert(read('portal.html').includes('src="/assets/config.js"'),'Portal must load backend config');
console.log('EcoGlobal source smoke checks passed. Live auth/RLS/database must still be tested on Supabase.');
