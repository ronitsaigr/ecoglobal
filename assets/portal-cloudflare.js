// EcoGlobal marketplace UI backed by Cloudflare Workers + D1 + R2.
// Token is ephemeral tab storage: API and GitHub Pages are on different sites.
(() => {
'use strict';
const $=id=>document.getElementById(id);
const cfg=window.ECOGLOBAL_CONFIG||{};
const base=String(cfg.apiBase||'').replace(/\/$/,'');
const connected=/^https:\/\/[a-z0-9.-]+(?:\.workers\.dev|\.ecoglobal\.in)$/.test(base) && location.protocol==='https:';
const cats=['Paper & board','Fiber alternatives','Flexible formats','Circular systems','Packaging components'];
let token=sessionStorage.getItem('ecoglobal_token')||'',user=null,company=null,tab='explore',signup=false;
let catalog=[],buyerRFQs=[],buyerQuotes=[],supplierRFQs=[],supplierQuotes=[],adminData={};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shown=x=>esc(x).replace(/\n/g,'<br>');
const state=x=>'<span class="status '+esc(x)+'">'+esc(x)+'</span>';
const note=(message,error=false)=>{const n=$('notice');n.hidden=false;n.textContent=message;n.classList.toggle('error',error);n.scrollIntoView({behavior:'smooth',block:'nearest'})};
const fields=form=>Object.fromEntries(new FormData(form));
async function api(path,method='GET',data=null){
 if(!connected)throw Error('Cloudflare API is not configured');
 const headers={Accept:'application/json'};
 if(token)headers.Authorization='Bearer '+token;
 if(data!==null){headers['Content-Type']='application/json';data=JSON.stringify(data)}
 const r=await fetch(base+'/api'+path,{method,headers,body:data,cache:'no-store'});
 const j=await r.json().catch(()=>({error:'Unexpected API response'}));
 if(!r.ok){if(r.status===401){token='';sessionStorage.removeItem('ecoglobal_token');user=null;renderGate()}throw Error(j.error||('HTTP '+r.status))}return j;
}
async function attempt(fn){try{$('notice').hidden=true;await fn()}catch(e){note(e.message||'Unable to complete request',true)}}
function changeTab(v){if(v==='admin'&&user?.role!=='admin')return;tab=v;document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id==='view-'+v));document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===v));window.scrollTo({top:0,behavior:'smooth'})}
function renderGate(){
 const signed=!!user;$('who').textContent=user?.name||'Visitor';$('auth-open').hidden=signed;$('logout').hidden=!signed;
 $('buyer-app').hidden=!(user?.role==='buyer');$('buyer-gate').hidden=user?.role==='buyer';
 $('supplier-app').hidden=!(user?.role==='supplier');$('supplier-gate').hidden=user?.role==='supplier';
 $('alert-panel').hidden=!signed;document.querySelector('[data-tab="admin"]').hidden=user?.role!=='admin';
 if(tab==='admin'&&user?.role!=='admin')changeTab('explore');
 if(signed&&user.role==='supplier')$('supplier-gate').textContent='Supplier workspace ready';
}
async function refreshCatalog(){catalog=(await api('/catalog')).items||[];drawCatalog()}
function drawCatalog(){
 const category=$('category-filter').value,q=$('product-search').value.toLowerCase().trim();
 const rows=catalog.filter(p=>(!category||p.category===category)&&(!q||[p.name,p.category,p.description,p.supplier_name].join(' ').toLowerCase().includes(q)));
 $('products-grid').innerHTML=rows.length?rows.map(p=>'<article class="product-card"><span class="tag">'+esc(p.category)+'</span><h3>'+esc(p.name)+'</h3><p>'+shown(p.description)+'</p><p><strong>Supplier:</strong> '+esc(p.supplier_name)+' · '+esc(p.supplier_country)+'</p><p><strong>MOQ:</strong> '+esc(p.min_order_quantity||'On request')+' '+esc(p.unit)+'</p><button class="btn outline" data-tab="buyer">Post sourcing RFQ</button></article>').join(''):'<div class="empty">No reviewed public listings match your search. EcoGlobal does not fabricate supplier inventory.</div>';
}
async function refreshBuyer(){if(user?.role!=='buyer')return;[buyerRFQs,buyerQuotes]=await Promise.all([api('/rfqs').then(x=>x.items),api('/quotes').then(x=>x.items)]);drawBuyer()}
function drawBuyer(){
 $('buyer-rfqs').innerHTML=buyerRFQs.length?buyerRFQs.map(r=>{
 const quotes=buyerQuotes.filter(q=>q.rfq_id===r.id);
 return '<article class="record"><h3>'+esc(r.title)+'</h3><p>'+esc(r.category)+' · '+esc(r.quantity)+' '+esc(r.unit)+' → '+esc(r.destination_country)+'</p><p>'+shown(r.details)+'</p><small>'+state(r.status)+'</small><div class="actions">'+(r.status==='open'?'<button class="btn outline" data-close-rfq="'+esc(r.id)+'">Close RFQ</button>':'')+'</div><p><strong>'+quotes.length+' supplier quote(s)</strong></p>'+quotes.map(q=>'<div class="record"><strong>'+esc(q.supplier_name)+'</strong><p>'+esc(q.currency)+' '+esc(q.unit_price)+' / '+esc(r.unit)+' · '+esc(q.lead_time_days)+' days lead time</p><p>'+shown(q.message)+'</p><small>'+state(q.status)+'</small>'+(q.status==='submitted'&&r.status==='open'?'<div class="actions"><button class="btn primary" data-quote="'+esc(q.id)+'" data-decision="accepted">Accept</button><button class="btn outline" data-quote="'+esc(q.id)+'" data-decision="declined">Decline</button></div>':'')+'</div>').join('')+'</article>';
 }).join(''):'<div class="empty">No buyer requests yet. Create your first RFQ.</div>';
}
async function refreshSupplier(){
 if(user?.role!=='supplier')return;
 company=(await api('/suppliers/me')).supplier;
 $('product-form').hidden=!company;$('document-form').hidden=!company;
 if(!company){$('supplier-state').textContent='Register your company before adding products.';$('my-products').textContent='No company registered';$('supplier-matches').textContent='No matches';$('my-documents').textContent='No evidence';return}
 const form=$('supplier-form');for(const key of ['name','country','website','description','contact_name','contact_email','contact_phone'])if(form.elements[key])form.elements[key].value=company[key]||'';
 $('supplier-state').innerHTML='Application: '+state(company.status)+(company.review_note?'<p>Reviewer: '+esc(company.review_note)+'</p>':'');
 const [prods,rfqs,quotes,docs]=await Promise.all([api('/products/mine').then(x=>x.items),api('/rfqs').then(x=>x.items),api('/quotes').then(x=>x.items),api('/documents').then(x=>x.items)]);
 supplierRFQs=rfqs;supplierQuotes=quotes;
 $('my-products').innerHTML=prods.length?prods.map(p=>'<div class="record"><h3>'+esc(p.name)+'</h3><p>'+esc(p.category)+' · '+state(p.status)+'</p><p>'+shown(p.description)+'</p>'+(p.review_note?'<p>Feedback: '+esc(p.review_note)+'</p>':'')+'<button class="btn small outline" data-edit-product="'+esc(p.id)+'">Update & resubmit</button></div>').join(''):'<div class="empty">No product listings yet.</div>';
 $('my-documents').innerHTML=docs.length?docs.map(d=>'<div class="record"><strong>'+esc(d.document_type)+'</strong><p>'+esc(d.original_name)+'</p><button class="btn outline small" data-document="'+esc(d.id)+'">Open evidence</button></div>').join(''):'<div class="empty">No evidence uploaded.</div>';
 $('supplier-matches').innerHTML=rfqs.length?rfqs.map(r=>{
 const quote=quotes.find(q=>q.rfq_id===r.id);
 return '<div class="record"><h3>'+esc(r.title)+'</h3><p>'+esc(r.category)+' · '+esc(r.quantity)+' '+esc(r.unit)+' → '+esc(r.destination_country)+'</p><p>'+shown(r.details)+'</p><small>'+state(r.status)+'</small>'+(quote?'<p>Submitted: '+esc(quote.currency)+' '+esc(quote.unit_price)+' · '+state(quote.status)+'</p>':r.status==='open'?'<form data-quote-rfq="'+esc(r.id)+'"><div class="pair"><label>Unit price<input name="unit_price" type="number" min="0.01" step="0.01" required></label><label>Currency<select name="currency"><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label></div><label>Lead time (days)<input name="lead_time_days" type="number" min="1" max="365" required></label><label>Commercial details<textarea name="message" maxlength="2000"></textarea></label><button class="btn primary">Submit quotation</button></form>':'<p>This RFQ is closed.</p>')+'</div>';
 }).join(''):'<div class="empty">No matched RFQs. Matching requires an approved company and approved product in the same category.</div>';
}
async function refreshAdmin(){if(user?.role!=='admin')return;
 const [data,docs]=await Promise.all([api('/admin/review'),api('/documents')]);adminData=data;
 $('review-suppliers').innerHTML=data.suppliers.map(s=>'<article class="record"><h3>'+esc(s.name)+'</h3><p>'+esc(s.country)+' · '+state(s.status)+'</p><p>'+shown(s.description)+'</p><p><strong>Contact:</strong> '+esc(s.contact_name)+' · '+esc(s.contact_email)+'</p><div class="actions"><button class="btn primary" data-review="suppliers" data-review-id="'+esc(s.id)+'" data-decision="approved">Approve</button><button class="btn outline" data-review="suppliers" data-review-id="'+esc(s.id)+'" data-decision="rejected">Reject</button></div></article>').join('')||'<div class="empty">No suppliers</div>';
 $('review-products').innerHTML=data.products.map(p=>'<article class="record"><h3>'+esc(p.name)+'</h3><p>'+esc(p.supplier_name)+' · '+esc(p.category)+' · '+state(p.status)+'</p><p>'+shown(p.description)+'</p><div class="actions"><button class="btn primary" data-review="products" data-review-id="'+esc(p.id)+'" data-decision="approved">Approve</button><button class="btn outline" data-review="products" data-review-id="'+esc(p.id)+'" data-decision="rejected">Reject</button></div></article>').join('')||'<div class="empty">No product applications</div>';
 $('review-documents').innerHTML=docs.items.map(d=>'<div class="record"><strong>'+esc(d.supplier_name)+'</strong><p>'+esc(d.document_type)+' · '+esc(d.original_name)+'</p><button class="btn outline small" data-document="'+esc(d.id)+'">Review evidence</button></div>').join('')||'<div class="empty">No evidence</div>';
 $('invite-rfq').innerHTML=data.rfqs.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.title)+'</option>').join('');$('invite-supplier').innerHTML=data.suppliers.filter(s=>s.status==='approved').map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join('');
}
async function refreshAlerts(){if(!user)return;const items=(await api('/notifications')).items;
 $('alerts').innerHTML=items.map(n=>'<div class="record"><p>'+esc(n.message)+'</p><small>'+esc(n.created_at)+(n.is_read?' · Read':' · New')+'</small>'+(n.is_read?'':'<button class="btn small outline" data-alert="'+esc(n.id)+'">Mark read</button>')+'</div>').join('')||'<p>No notifications yet.</p>';
}
async function refreshAll(){await refreshCatalog();renderGate();if(user)await Promise.all([refreshBuyer(),refreshSupplier(),refreshAdmin(),refreshAlerts()])}
async function loadIdentity(){if(!token){user=null;renderGate();await refreshCatalog();return}try{user=(await api('/me')).user;await refreshAll()}catch{token='';user=null;sessionStorage.removeItem('ecoglobal_token');renderGate();await refreshCatalog()}}
function bind(){
 $('auth-open').onclick=()=>{$('auth-modal').hidden=false};$('auth-close').onclick=()=>{$('auth-modal').hidden=true};
 $('auth-switch').onclick=()=>{signup=!signup;$('signup-fields').hidden=!signup;$('auth-submit').textContent=signup?'Create pilot account':'Sign in';$('auth-switch').textContent=signup?'Already registered? Sign in':'Have an invitation? Create account'};
 $('auth-form').onsubmit=e=>attempt(async()=>{e.preventDefault();const b=fields(e.target),result=signup?await api('/auth/register','POST',{name:b.full_name,email:b.email,password:b.password,role:b.account_type,invite_code:b.invite_code}):await api('/auth/login','POST',{email:b.email,password:b.password});token=result.token;sessionStorage.setItem('ecoglobal_token',token);user=result.user;$('auth-modal').hidden=true;await refreshAll();note('Signed in to EcoGlobal')});
 $('logout').onclick=()=>attempt(async()=>{await api('/auth/logout','POST');token='';sessionStorage.removeItem('ecoglobal_token');user=null;renderGate();changeTab('explore');note('Signed out')});
 $('rfq-form').onsubmit=e=>attempt(async()=>{e.preventDefault();const b=fields(e.target);await api('/rfqs','POST',b);e.target.reset();await refreshBuyer();note('RFQ submitted. Approved, category-matched suppliers can now respond.')});
 $('supplier-form').onsubmit=e=>attempt(async()=>{e.preventDefault();await api('/suppliers/me','POST',fields(e.target));await refreshSupplier();note('Company saved for review.')});
 $('product-form').onsubmit=e=>attempt(async()=>{e.preventDefault();await api('/products','POST',fields(e.target));e.target.reset();await refreshSupplier();note('Product listing submitted for review.')});
 $('document-form').onsubmit=e=>attempt(async()=>{e.preventDefault();const b=fields(e.target),file=b.evidence;if(!file||!file.size||file.size>5242880||!['application/pdf','image/png','image/jpeg'].includes(file.type))throw Error('Choose a PDF/JPG/PNG smaller than 5 MB');const r=await fetch(base+'/api/documents',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':file.type,'X-File-Name':encodeURIComponent(file.name).slice(0,160),'X-Document-Type':String(b.document_type||'Supporting evidence').slice(0,100)},body:file});const data=await r.json();if(!r.ok)throw Error(data.error||'Upload failed');e.target.reset();await refreshSupplier();note('Private evidence uploaded.')});
 $('invite-form').onsubmit=e=>attempt(async()=>{e.preventDefault();await api('/admin/matches','POST',{rfq_id:$('invite-rfq').value,supplier_id:$('invite-supplier').value});note('RFQ assigned to supplier.')});
 $('refresh-products').onclick=()=>attempt(refreshCatalog);$('refresh-rfqs').onclick=()=>attempt(refreshBuyer);$('refresh-supplier').onclick=()=>attempt(refreshSupplier);$('refresh-alerts').onclick=()=>attempt(refreshAlerts);
 $('product-search').oninput=drawCatalog;$('category-filter').onchange=drawCatalog;
 document.addEventListener('click',e=>{
 const t=e.target.closest('[data-tab]');if(t){changeTab(t.dataset.tab);return}
 const r=e.target.closest('[data-review]');if(r){attempt(async()=>{if(!confirm('Confirm '+r.dataset.decision+'?'))return;const comment=r.dataset.decision==='rejected'?prompt('Review feedback:')||'':'';await api('/admin/'+r.dataset.review+'/'+r.dataset.reviewId,'PATCH',{status:r.dataset.decision,note:comment});await refreshAdmin();await refreshCatalog();note('Review saved')});return}
 const close=e.target.closest('[data-close-rfq]');if(close){attempt(async()=>{if(!confirm('Close this sourcing request?'))return;await api('/rfqs/'+close.dataset.closeRfq,'PATCH',{status:'closed'});await refreshBuyer();note('RFQ closed')});return}
 const q=e.target.closest('[data-quote]');if(q){attempt(async()=>{if(!confirm('Confirm decision? This is final.'))return;await api('/quotes/'+q.dataset.quote,'PATCH',{status:q.dataset.decision});await refreshBuyer();note('Decision saved')});return}
 const edit=e.target.closest('[data-edit-product]');if(edit){attempt(async()=>{const p=(await api('/products/mine')).items.find(x=>x.id===edit.dataset.editProduct);if(!p)return;const description=prompt('Update product description (resubmits for approval)',p.description);if(description===null)return;await api('/products/'+p.id,'PATCH',{...p,description});await refreshSupplier();note('Product resubmitted')});return}
 const doc=e.target.closest('[data-document]');if(doc){attempt(async()=>{const res=await fetch(base+'/api/documents/'+doc.dataset.document,{headers:{Authorization:'Bearer '+token}});if(!res.ok)throw Error('Evidence unavailable');const blob=await res.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ecoglobal-evidence';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)});return}
 const alert=e.target.closest('[data-alert]');if(alert){attempt(async()=>{await api('/notifications/'+alert.dataset.alert,'PATCH',{});await refreshAlerts()});return}
 });
 document.addEventListener('submit',e=>{const q=e.target.closest('[data-quote-rfq]');if(!q)return;e.preventDefault();attempt(async()=>{await api('/quotes','POST',{...fields(q),rfq_id:q.dataset.quoteRfq});await refreshSupplier();note('Quotation submitted to buyer.')})});
}
function start(){
 document.querySelectorAll('.category-options').forEach(x=>x.innerHTML='<option value="">Choose category</option>'+cats.map(c=>'<option>'+esc(c)+'</option>').join(''));
 $('category-filter').innerHTML='<option value="">All categories</option>'+cats.map(c=>'<option>'+esc(c)+'</option>').join('');
 const group=$('signup-fields');group.insertAdjacentHTML('beforeend','<label>Private invitation code<input name="invite_code" type="password" autocomplete="off" placeholder="Pilot access code"></label>');
 bind();if(!connected){$('setup').hidden=false;$('setup').querySelector('p').textContent='Cloudflare API deployment is pending. Buyer accounts, supplier data and submissions are disabled until a Workers + D1 backend is configured over HTTPS.';$('auth-open').disabled=true;return}attempt(loadIdentity);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();