(function () {
"use strict";
const cats=["Paper & board","Fiber alternatives","Flexible formats","Circular systems","Packaging components"];
const cfg=window.ECOGLOBAL_CONFIG||{};
const secure=location.protocol==="https:"||location.hostname==="localhost"||location.hostname==="127.0.0.1";
const ready=secure && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg.url||"") && typeof cfg.anonKey==="string" && cfg.anonKey.length>30 && !!window.supabase;
const db=ready?window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{detectSessionInUrl:true}}):null;
const $=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const text=value=>esc(value).replace(/\n/g,"<br>");
let session=null,profile=null,admin=false,company=null,mode="login",currentTab="explore";
let catalog=[],buyerRFQs=[],myQuotes=[],supplierRFQs=[],notifications=[];
function notice(message,error=false){const n=$("notice");n.textContent=message;n.classList.toggle("error",error);n.hidden=false;n.scrollIntoView({block:"nearest",behavior:"smooth"});}
function quiet(){ $("notice").hidden=true; }
function status(x){return '<span class="status '+esc(x)+'">'+esc(x)+'</span>';}
function fmtDate(d){return d?new Date(d).toLocaleDateString():"Not specified";}
function categoryOptions(){document.querySelectorAll(".category-options").forEach(select=>{select.innerHTML='<option value="">Choose a category</option>'+cats.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("");});$("category-filter").innerHTML='<option value="">All categories</option>'+cats.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("");}
function showTab(tab){if(!["explore","buyer","supplier","admin"].includes(tab))tab="explore";if(tab==="admin"&&!admin)return;currentTab=tab;document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+tab));document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.getAttribute("data-tab")===tab));window.scrollTo({top:0,behavior:"smooth"});}
async function unwrap(p){const r=await p;if(r.error)throw r.error;return r.data;}
async function run(fn){try{quiet();await fn();}catch(e){console.error("EcoGlobal",e);notice(e?.message||"Operation failed. Please try again.",true);}}
function gate(){const signed=!!session?.user;$("who").textContent=signed?(profile?.full_name||session.user.email||"Member"):"Visitor";$("auth-open").hidden=signed;$("logout").hidden=!signed;$("alert-panel").hidden=!signed;$("buyer-app").hidden=!(signed&&(profile?.account_type==="buyer"||admin));$("buyer-gate").hidden=!$("buyer-app").hidden;$("supplier-app").hidden=!(signed&&(profile?.account_type==="supplier"||admin));$("supplier-gate").hidden=!$("supplier-app").hidden;document.querySelector('[data-tab="admin"]').hidden=!admin; if(currentTab==="admin"&&!admin)showTab("explore");}
async function refreshUser(){
 if(!db){gate();return;}
 const {data:{session:s},error}=await db.auth.getSession();if(error)throw error;session=s;profile=null;admin=false;company=null;
 if(s?.user){profile=await unwrap(db.from("profiles").select("*").eq("id",s.user.id).single());
 const admins=await unwrap(db.from("platform_admins").select("user_id").eq("user_id",s.user.id));admin=admins.length>0;}
 gate();await Promise.all([refreshCatalog(),refreshBuyer(),refreshSupplier(),refreshAdmin(),refreshAlerts()]);
}
async function refreshCatalog(){
 if(!db)return;
 const data=await unwrap(db.from("products").select("id,name,category,description,min_order_quantity,unit,suppliers(name,country,website)").eq("status","approved").order("created_at",{ascending:false}).limit(100));
 catalog=data;renderCatalog();
}
function renderCatalog(){
 const q=$("product-search").value.trim().toLowerCase(),cat=$("category-filter").value;
 const shown=catalog.filter(p=>(!cat||p.category===cat)&&(!q||[p.name,p.category,p.description,p.suppliers?.name,p.suppliers?.country].join(" ").toLowerCase().includes(q)));
 $("products-grid").innerHTML=shown.length?shown.map(p=>'<article class="product-card"><span class="tag">'+esc(p.category)+'</span><h3>'+esc(p.name)+'</h3><p>'+text(p.description||"Description not supplied")+'</p><p><strong>Supplier:</strong> '+esc(p.suppliers?.name||"")+' · '+esc(p.suppliers?.country||"")+'</p><p><strong>Minimum order:</strong> '+esc(p.min_order_quantity||"Ask supplier")+' '+esc(p.unit||"")+'</p><button class="btn outline" data-tab="buyer">Request comparable quotes →</button></article>').join(""):'<div class="empty">No approved listings found for these filters. Listings only appear after administrator review.</div>';
}
async function refreshBuyer(){
 if(!db||!session?.user||(profile?.account_type!=="buyer"&&!admin))return;
 buyerRFQs=await unwrap(db.from("rfqs").select("*").eq("buyer_id",session.user.id).order("created_at",{ascending:false}).limit(100));
 const ids=buyerRFQs.map(r=>r.id);
 myQuotes=ids.length?await unwrap(db.from("quotes").select("*,suppliers(name,country)").in("rfq_id",ids).order("created_at",{ascending:false})):[];renderBuyer();
}
function renderBuyer(){
 $("buyer-rfqs").innerHTML=buyerRFQs.length?buyerRFQs.map(r=>{
  const quotes=myQuotes.filter(q=>q.rfq_id===r.id);
  return '<article class="record"><h3>'+esc(r.title)+'</h3><p>'+esc(r.category)+' · '+esc(r.quantity)+' '+esc(r.unit)+' · '+esc(r.destination_country)+'</p><p>'+text(r.details)+'</p><small>Needed: '+esc(fmtDate(r.needed_by))+' · '+status(r.status)+'</small>'
  +'<div class="actions">'+(r.status==="open"?'<button class="btn outline" data-close-rfq="'+esc(r.id)+'">Close RFQ</button>':'')+'</div>'
  +'<p><strong>'+quotes.length+' quotation(s)</strong></p>'+quotes.map(q=>'<div class="record"><strong>'+esc(q.suppliers?.name||"Supplier")+'</strong><p>'+esc(q.currency)+' '+esc(q.unit_price)+' / '+esc(r.unit)+' · Lead time: '+esc(q.lead_time_days)+' days</p><p>'+text(q.message)+'</p><small>'+status(q.status)+'</small><div class="actions">'+(q.status==="submitted"&&r.status==="open"?'<button class="btn primary" data-quote-decision="accepted" data-quote-id="'+esc(q.id)+'">Accept</button><button class="btn outline" data-quote-decision="declined" data-quote-id="'+esc(q.id)+'">Decline</button>':'')+'</div></div>').join("")+'</article>';
 }).join(""):'<div class="empty">You have not submitted any RFQs yet. Create your first requirement using the form.</div>';
}
async function refreshSupplier(){
 if(!db||!session?.user||(profile?.account_type!=="supplier"&&!admin))return;
 const all=await unwrap(db.from("suppliers").select("*").eq("owner_id",session.user.id).order("created_at",{ascending:true}).limit(1));
 company=all[0]||null;const exist=!!company;$("product-form").hidden=!exist;$("document-form").hidden=!exist;
 if(!exist){$("supplier-state").innerHTML="Your profile will be reviewed before any listings become public.";$("my-products").innerHTML="Create a supplier profile first.";$("supplier-matches").innerHTML="A supplier profile is required.";$("my-documents").innerHTML="No documents yet.";return;}
 const form=$("supplier-form");const privateArr=await unwrap(db.from("supplier_private").select("*").eq("supplier_id",company.id));
 const priv=privateArr[0]||{};for(const key of ["name","country","website","description","contact_name","contact_email","contact_phone"]){if(form.elements[key])form.elements[key].value=company[key]??priv[key]??"";}
 $("supplier-state").innerHTML="Current application status: "+status(company.status)+(company.review_note?'<p>Review feedback: '+esc(company.review_note)+'</p>':"");
 const [products,documents,matches]=await Promise.all([
 unwrap(db.from("products").select("*").eq("supplier_id",company.id).order("created_at",{ascending:false})),
 unwrap(db.from("supplier_documents").select("*").eq("supplier_id",company.id).order("created_at",{ascending:false})),
 unwrap(db.from("rfq_matches").select("*").eq("supplier_id",company.id).order("created_at",{ascending:false}))
 ]);
 $("my-products").innerHTML=products.length?products.map(p=>'<div class="record"><h3>'+esc(p.name)+'</h3><p>'+esc(p.category)+' · '+status(p.status)+'</p>'+(p.review_note?'<p>Feedback: '+esc(p.review_note)+'</p>':'')+'</div>').join(""):'<div class="empty">No products yet. New product listings require review.</div>';
 $("my-documents").innerHTML=documents.length?documents.map(d=>'<div class="record"><strong>'+esc(d.document_type)+'</strong><p>'+esc(d.object_path.split("/").pop())+'</p><button class="btn outline" data-document="'+esc(d.object_path)+'">Open private file</button></div>').join(""):'<div class="empty">No evidence uploaded.</div>';
 const rid=matches.map(m=>m.rfq_id);supplierRFQs=rid.length?await unwrap(db.from("rfqs").select("*").in("id",rid).order("created_at",{ascending:false})):[];const quotes=rid.length?await unwrap(db.from("quotes").select("*").eq("supplier_id",company.id)):[];
 $("supplier-matches").innerHTML=supplierRFQs.length?supplierRFQs.map(r=>{
 const quoted=quotes.find(q=>q.rfq_id===r.id);
 return '<div class="record"><h3>'+esc(r.title)+'</h3><p>'+esc(r.category)+' · '+esc(r.quantity)+' '+esc(r.unit)+' · Deliver to '+esc(r.destination_country)+'</p><p>'+text(r.details)+'</p><small>Needed: '+esc(fmtDate(r.needed_by))+' · '+status(r.status)+'</small>'
 +(quoted?'<p>Your quote: '+esc(quoted.currency)+' '+esc(quoted.unit_price)+' · '+status(quoted.status)+'</p>':
 r.status==="open"?'<form data-quote-form="'+esc(r.id)+'"><div class="pair"><label>Unit price<input type="number" name="unit_price" min="0.01" step="0.01" required></label><label>Currency<select name="currency"><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label></div><label>Lead time (days)<input type="number" name="lead_time_days" required min="1" max="365"></label><label>Commercial notes<textarea name="message" rows="2" maxlength="2000"></textarea></label><button class="btn primary" type="submit">Submit quotation</button></form>':'<p>Request closed.</p>')+'</div>';
 }).join(""):'<div class="empty">No matched RFQs. Matching requires an approved supplier and an approved listing in the RFQ category.</div>';
}
async function refreshAdmin(){
 if(!db||!admin)return;
 const [suppliers,products,rfqs]=await Promise.all([
 unwrap(db.from("suppliers").select("*").order("created_at",{ascending:false}).limit(100)),
 unwrap(db.from("products").select("*,suppliers(name)").order("created_at",{ascending:false}).limit(100)),
 unwrap(db.from("rfqs").select("*").eq("status","open").order("created_at",{ascending:false}).limit(100))
 ]);
 $("review-suppliers").innerHTML=suppliers.length?suppliers.map(s=>'<article class="record"><h3>'+esc(s.name)+'</h3><p>'+esc(s.country)+' · '+status(s.status)+'</p><p>'+text(s.description)+'</p><div class="actions"><button class="btn primary" data-review="supplier" data-id="'+esc(s.id)+'" data-decision="approved">Approve</button><button class="btn outline" data-review="supplier" data-id="'+esc(s.id)+'" data-decision="rejected">Reject</button></div></article>').join(""):'No applications.';
 $("review-products").innerHTML=products.length?products.map(p=>'<article class="record"><h3>'+esc(p.name)+'</h3><p>'+esc(p.suppliers?.name||"Supplier")+' · '+esc(p.category)+' · '+status(p.status)+'</p><p>'+text(p.description)+'</p><div class="actions"><button class="btn primary" data-review="product" data-id="'+esc(p.id)+'" data-decision="approved">Approve</button><button class="btn outline" data-review="product" data-id="'+esc(p.id)+'" data-decision="rejected">Reject</button></div></article>').join(""):'No applications.';
 $("invite-rfq").innerHTML=rfqs.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.title)+'</option>').join("");
 $("invite-supplier").innerHTML=suppliers.filter(s=>s.status==="approved").map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join("");
}
async function refreshAlerts(){
 if(!db||!session?.user)return;
 notifications=await unwrap(db.from("notifications").select("*").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(25));
 $("alerts").innerHTML=notifications.length?notifications.map(n=>'<div class="record"><p>'+esc(n.message)+'</p><small>'+esc(fmtDate(n.created_at))+(n.is_read?" · Read":" · New")+'</small>'+(n.is_read?"":'<button class="btn small outline" data-read="'+esc(n.id)+'">Mark read</button>')+'</div>').join(""):'No notifications yet.';
}
function bindForms(){
 $("auth-open").onclick=()=>{$("auth-modal").hidden=false};$("auth-close").onclick=()=>{$("auth-modal").hidden=true};
 $("auth-switch").onclick=()=>{mode=mode==="login"?"signup":"login";$("signup-fields").hidden=mode!=="signup";$("auth-submit").textContent=mode==="signup"?"Create account":"Sign in";$("auth-switch").textContent=mode==="signup"?"Already registered? Sign in":"New here? Create an account";};
 $("auth-form").onsubmit=e=>run(async()=>{e.preventDefault();if(!db)throw Error("Backend is not connected");const f=new FormData(e.target),email=String(f.get("email")||"").trim(),password=String(f.get("password")||"");if(mode==="signup"){const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:location.origin+"/portal.html",data:{full_name:String(f.get("full_name")||"").trim(),account_type:f.get("account_type")==="supplier"?"supplier":"buyer"}}});if(error)throw error;$("auth-modal").hidden=true;notice(data.session?"Account created.":"Account created. Confirm your email, then sign in.");if(data.session)await refreshUser();}else{await unwrap(db.auth.signInWithPassword({email,password}));$("auth-modal").hidden=true;await refreshUser();}});
 $("logout").onclick=()=>run(async()=>{await unwrap(db.auth.signOut());await refreshUser();notice("Signed out.");});
 $("rfq-form").onsubmit=e=>run(async()=>{e.preventDefault();if(!session?.user)throw Error("Please sign in");const f=new FormData(e.target);await unwrap(db.from("rfqs").insert({buyer_id:session.user.id,title:String(f.get("title")).trim(),category:f.get("category"),details:String(f.get("details")).trim(),quantity:Number(f.get("quantity")),unit:String(f.get("unit")).trim(),destination_country:String(f.get("destination_country")).trim(),needed_by:f.get("needed_by")||null}));e.target.reset();await refreshBuyer();notice("Your RFQ has been submitted. Eligible suppliers will see it in their workspace.");});
 $("supplier-form").onsubmit=e=>run(async()=>{e.preventDefault();if(!session?.user)throw Error("Please sign in");const f=new FormData(e.target),details={name:String(f.get("name")).trim(),country:String(f.get("country")).trim(),website:String(f.get("website")||"").trim(),description:String(f.get("description")||"").trim()};if(company){await unwrap(db.from("suppliers").update(details).eq("id",company.id));}else{const row=await unwrap(db.from("suppliers").insert({...details,owner_id:session.user.id}).select().single());company=row;}
 const priv={contact_name:String(f.get("contact_name")||"").trim(),contact_email:String(f.get("contact_email")||"").trim(),contact_phone:String(f.get("contact_phone")||"").trim()};
 await unwrap(db.from("supplier_private").upsert({...priv,supplier_id:company.id},{onConflict:"supplier_id"}));
 await refreshSupplier();notice("Company details saved. Approval is subject to administrator review.");});
 $("product-form").onsubmit=e=>run(async()=>{e.preventDefault();if(!company)throw Error("Save a company profile first");const f=new FormData(e.target);await unwrap(db.from("products").insert({supplier_id:company.id,name:String(f.get("name")).trim(),category:f.get("category"),description:String(f.get("description")||"").trim(),min_order_quantity:f.get("min_order_quantity")?Number(f.get("min_order_quantity")):null,unit:String(f.get("unit")||"units").trim()}));e.target.reset();await refreshSupplier();notice("Product listing submitted for review; it is not public yet.");});
 $("document-form").onsubmit=e=>run(async()=>{e.preventDefault();if(!company)throw Error("Save a supplier company first");const f=new FormData(e.target),file=f.get("evidence");if(!(file instanceof File)||!file.size)throw Error("Select a document");if(file.size>5*1024*1024)throw Error("File limit is 5 MB");if(!["application/pdf","image/png","image/jpeg"].includes(file.type))throw Error("PDF, JPG or PNG only");const path=session.user.id+"/"+company.id+"/"+crypto.randomUUID()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");await unwrap(db.storage.from("supplier-evidence").upload(path,file,{contentType:file.type,upsert:false}));await unwrap(db.from("supplier_documents").insert({supplier_id:company.id,object_path:path,document_type:String(f.get("document_type")||"Supporting evidence").trim()}));e.target.reset();await refreshSupplier();notice("Private document uploaded for review.");});
 $("invite-form").onsubmit=e=>run(async()=>{e.preventDefault();await unwrap(db.rpc("invite_supplier",{rid:$("invite-rfq").value,sid:$("invite-supplier").value}));notice("Supplier added to matching list.");});
 $("refresh-products").onclick=()=>run(refreshCatalog);
 $("refresh-rfqs").onclick=()=>run(refreshBuyer);
 $("refresh-supplier").onclick=()=>run(refreshSupplier);
 $("refresh-alerts").onclick=()=>run(refreshAlerts);
 $("category-filter").onchange=renderCatalog;$("product-search").oninput=renderCatalog;
}
function bindDelegates(){
 document.addEventListener("click",e=>{
 const tab=e.target.closest("[data-tab]");if(tab){showTab(tab.dataset.tab);return;}
 const review=e.target.closest("[data-review]");if(review){run(async()=>{if(!admin)throw Error("Admin access required");const decision=review.dataset.decision;if(!confirm("Confirm "+decision+" for this "+review.dataset.review+"?"))return;const note=decision==="rejected"?prompt("Review feedback (optional)","")||"":"";if(review.dataset.review==="supplier")await unwrap(db.rpc("review_supplier",{sid:review.dataset.id,decision,note}));else await unwrap(db.rpc("review_product",{pid:review.dataset.id,decision,note}));await refreshAdmin();await refreshCatalog();notice("Review decision saved.");});return;}
 const close=e.target.closest("[data-close-rfq]");if(close){run(async()=>{if(!confirm("Close this RFQ to new quotes?"))return;await unwrap(db.from("rfqs").update({status:"closed"}).eq("id",close.dataset.closeRfq));await refreshBuyer();notice("RFQ closed.");});return;}
 const decision=e.target.closest("[data-quote-decision]");if(decision){run(async()=>{if(!confirm("Confirm this quotation decision? It cannot be changed."))return;await unwrap(db.from("quotes").update({status:decision.dataset.quoteDecision}).eq("id",decision.dataset.quoteId));await refreshBuyer();notice("Quotation decision recorded. Final procurement and payments happen outside the platform.");});return;}
 const doc=e.target.closest("[data-document]");if(doc){run(async()=>{const d=await unwrap(db.storage.from("supplier-evidence").createSignedUrl(doc.dataset.document,90));window.open(d.signedUrl,"_blank","noopener,noreferrer");});return;}
 const read=e.target.closest("[data-read]");if(read){run(async()=>{await unwrap(db.from("notifications").update({is_read:true}).eq("id",read.dataset.read));await refreshAlerts();});return;}
 });
 document.addEventListener("submit",e=>{const form=e.target.closest("[data-quote-form]");if(!form)return;e.preventDefault();run(async()=>{if(!company)throw Error("Company account required");const f=new FormData(form);await unwrap(db.from("quotes").insert({rfq_id:form.dataset.quoteForm,supplier_id:company.id,unit_price:Number(f.get("unit_price")),currency:f.get("currency"),lead_time_days:Number(f.get("lead_time_days")),message:String(f.get("message")||"").trim()}));await refreshSupplier();notice("Quotation submitted to the buyer.");});});
}
async function start(){categoryOptions();bindForms();bindDelegates();if(!ready){$("setup").hidden=false;$("auth-open").disabled=true;gate();return;}
 try{await refreshUser();db.auth.onAuthStateChange((_event,s)=>{if((s?.user?.id||null)!==(session?.user?.id||null))setTimeout(()=>run(refreshUser),0);});}catch(e){console.error(e);notice("Backend connection error: "+(e.message||"Unknown error"),true);}
 if(location.hash==="#buyer")showTab("buyer");else if(location.hash==="#supplier")showTab("supplier");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
