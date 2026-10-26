(function(){
"use strict";
var EMAIL="info@ecoglobal.in";
var materials=[
 {id:"corrugated",name:"Recycled-content corrugated packaging",family:"Paper & board",icon:"▦",tone:"gold",summary:"Shipping cartons, sleeves and protective corrugated formats with recycled-fibre options.",uses:"E-commerce shipments, transit packs, retail cartons",notes:["Board grade, flute, burst or compression requirement","Dimensions, printing, moisture resistance, load performance","Recycled-content percentage and chain-of-custody evidence where relevant"],keywords:"boxes carton cardboard corrugated shipping recycled fiber kraft"},
 {id:"molded-fiber",name:"Molded fiber cushioning",family:"Fiber alternatives",icon:"◉",tone:"clay",summary:"Formed paper or plant-fiber inserts shaped for product protection and handling.",uses:"Electronics, appliances, foodservice, fragile-item protection",notes:["Fiber feedstock, tooling and shape complexity","Impact performance, moisture and food-contact suitability if needed","Supporting documents for claimed origin, content, and end-of-life"],keywords:"pulp molded fibre tray bagasse inserts cushioning agricultural fiber"},
 {id:"paper-mailers",name:"Paper-based mailers & sleeves",family:"Paper & board",icon:"▤",tone:"blue",summary:"Mailing bags, wraps and sleeves for lightweight shipments and retail packaging.",uses:"Apparel, stationery, gift packaging and online orders",notes:["Weight and tear resistance","Coating, adhesive and closure specifications","Local recycling compatibility and content verification"],keywords:"mailers paper envelopes sleeves kraft shipping bags"},
 {id:"compostable",name:"Compostability-assessed flexible packaging",family:"Flexible formats",icon:"◌",tone:"lav",summary:"Flexible films and pouches to evaluate against defined compostability use cases and local conditions.",uses:"Selected bags, liners, retail packs and foodservice applications",notes:["Industrial versus home compostability requirement","Barrier and shelf-life performance","Applicable tests, certificate scope and actual collection infrastructure"],keywords:"compostable films pouches biodegradable flexible bag liners bio"},
 {id:"reusable",name:"Reusable transport packaging",family:"Circular systems",icon:"↺",tone:"pink",summary:"Durable crates, totes, pallets and returnable transport formats for controlled logistics loops.",uses:"Warehouse operations, closed-loop B2B freight, distribution",notes:["Expected reuse cycles and cleaning needs","Reverse-logistics and return rates","Material durability and lifecycle assumptions"],keywords:"reusable returnable crates boxes totes pallets transport"},
 {id:"labels",name:"Labels, wraps & printed components",family:"Packaging components",icon:"▧",tone:"gold",summary:"Packaging labels and print components chosen for material compatibility and performance.",uses:"Consumer packaging, cartons, parcels and traceability",notes:["Substrate, adhesives and inks","Recyclability impacts of mixed material components","Print quality, durability and chain-of-custody where relevant"],keywords:"label sticker wrapping print water-based ink adhesives"}
];
var families=["All","Paper & board","Fiber alternatives","Flexible formats","Circular systems","Packaging components"];
var activeFamily="All",searchQuery="",toastTimeout=null;
function $(id){return document.getElementById(id)}
function closeMenu(){var n=$("main-nav"),b=$("menu-toggle");n.classList.remove("open");b.setAttribute("aria-expanded","false");b.textContent="☰"}
function viewRoute(){
 var page=(location.hash||"#home").replace("#","").split("?")[0];
 if(!$(page)||!$(page).classList.contains("page"))page="home";
 document.querySelectorAll(".page").forEach(function(el){el.classList.toggle("active",el.id===page)});
 document.querySelectorAll("[data-nav]").forEach(function(el){var isActive=el.getAttribute("data-nav")===page;el.classList.toggle("active",isActive);if(isActive)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current")});
 closeMenu();window.scrollTo({top:0,behavior:"auto"});
 if(page==="discover")renderCatalog();
}
function cardHTML(m){return '<article class="category-card"><div class="category-art '+m.tone+'" aria-hidden="true">'+m.icon+'</div><div><span class="eyebrow" style="font-size:10px">'+m.family+'</span><h3>'+m.name+'</h3></div><p>'+m.summary+'</p><div class="card-bottom"><button type="button" class="btn btn-text btn-small" data-view="'+m.id+'" aria-label="Explore '+m.name+'">Explore category ↗</button><span class="material">Sourcing category</span></div></article>'}
function renderCatalog(){
 var list=materials.filter(function(m){return (activeFamily==="All"||m.family===activeFamily)&&(!searchQuery||(m.name+" "+m.family+" "+m.summary+" "+m.uses+" "+m.keywords).toLowerCase().includes(searchQuery))});
 $("directory-grid").innerHTML=list.map(cardHTML).join("");
 $("results-note").textContent=list.length+" sourcing categor"+(list.length===1?"y":"ies")+" shown · Categories are not live product inventory";
 $("directory-empty").classList.toggle("hide",list.length!==0);
}
function details(id){
 var m=materials.find(function(x){return x.id===id});if(!m)return;
 var d=$("material-detail");
 d.innerHTML='<div><button type="button" class="close-sheet" data-close-detail aria-label="Close category detail">✕</button><span class="eyebrow">Category overview</span><h3>'+m.name+'</h3><p>'+m.summary+'</p><p><strong>Common applications:</strong> '+m.uses+'</p><button class="btn btn-dark" type="button" data-source="'+m.id+'">Build an RFQ for this category ↗</button></div><div><h3 style="font-size:19px">What to specify or verify</h3><ul>'+m.notes.map(function(n){return '<li>'+n+'</li>'}).join("")+'</ul><div class="notice">These prompts are informational. They are not claims of certification, stock or supplier verification.</div></div>';
 d.classList.add("open");d.scrollIntoView({behavior:"smooth",block:"center"});
}
function showToast(message){var t=$("toast");t.textContent=message;t.classList.add("show");clearTimeout(toastTimeout);toastTimeout=setTimeout(function(){t.classList.remove("show")},4500)}
function formText(form,heading){
 var rows=[heading,"EcoGlobal | https://ecoglobal.in/","Generated: "+new Date().toISOString().slice(0,10),""];
 var labels={category:"Material category",quantity:"Estimated quantity",unit:"Unit",destination:"Delivery destination",timeline:"Required timeframe",specifications:"Application and specifications",evidence:"Evidence requested",company:"Company",contact:"Contact person",email:"Business email",country:"Operating country",materials:"Products and capabilities",moq:"Minimum order quantity",website:"Company website",documents:"Available supporting documents"};
 new FormData(form).forEach(function(v,k){if(String(v).trim())rows.push((labels[k]||k)+": "+String(v).trim())});
 rows.push("","Note: This request is prepared by the sender; supplier availability, price, and environmental claims require direct verification.");
 return rows.join("\n");
}
function valid(form){if(!form.reportValidity()){showToast("Please complete the required fields before preparing the message.");return false}return true}
function download(text,filename){var b=new Blob([text],{type:"text/plain;charset=utf-8"});var url=URL.createObjectURL(b),link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url)},4000)}
function copyText(value){
 if(navigator.clipboard&&window.isSecureContext){return navigator.clipboard.writeText(value).then(function(){showToast("Copied to clipboard.")}).catch(function(){fallbackCopy(value)})}
 fallbackCopy(value);return Promise.resolve()
}
function fallbackCopy(value){var t=document.createElement("textarea");t.value=value;t.setAttribute("readonly","");t.style.position="fixed";t.style.top="-2000px";document.body.appendChild(t);t.select();var ok=false;try{ok=document.execCommand("copy")}catch(e){}t.remove();showToast(ok?"Copied to clipboard.":"Automatic copy is unavailable. Use Download instead.")}
function emailDraft(subject,body){var url="mailto:"+EMAIL+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);if(url.length>1900){showToast("Long brief: download or copy it if your email application truncates the message.")}window.location.href=url;showToast("Email draft prepared. Review and send it in your email application; delivery is not automatic.")}
function setupForms(){
 var rfq=$("rfq-form"),supplier=$("supplier-form");
 materials.forEach(function(m){var o=document.createElement("option");o.value=m.name;o.textContent=m.name;$("r-category").appendChild(o)});
 var other=document.createElement("option");other.value="Other / custom request";other.textContent="Other / custom request";$("r-category").appendChild(other);
 rfq.addEventListener("submit",function(e){e.preventDefault();if(!valid(rfq))return;emailDraft("EcoGlobal buyer RFQ - "+$("r-category").value,formText(rfq,"BUYER REQUEST FOR QUOTATION"))});
 $("rfq-copy").addEventListener("click",function(){if(valid(rfq))copyText(formText(rfq,"BUYER REQUEST FOR QUOTATION"))});
 $("rfq-download").addEventListener("click",function(){if(valid(rfq))download(formText(rfq,"BUYER REQUEST FOR QUOTATION"),"ecoglobal-buyer-rfq.txt")});
 supplier.addEventListener("submit",function(e){e.preventDefault();if(!valid(supplier))return;emailDraft("EcoGlobal supplier introduction - "+$("s-company").value,formText(supplier,"SUPPLIER INTRODUCTION"))});
 $("supplier-copy").addEventListener("click",function(){if(valid(supplier))copyText(formText(supplier,"SUPPLIER INTRODUCTION"))});
 $("supplier-download").addEventListener("click",function(){if(valid(supplier))download(formText(supplier,"SUPPLIER INTRODUCTION"),"ecoglobal-supplier-introduction.txt")});
}
function init(){
 $("year").textContent=new Date().getFullYear();
 $("home-categories").innerHTML=materials.slice(0,3).map(cardHTML).join("");
 $("catalog-filters").innerHTML=families.map(function(f,i){return '<button class="filter-btn'+(i===0?" active":"")+'" type="button" data-family="'+f+'">'+f+'</button>'}).join("");
 $("catalog-search").addEventListener("input",function(e){searchQuery=e.target.value.trim().toLowerCase();renderCatalog()});
 $("catalog-filters").addEventListener("click",function(e){var btn=e.target.closest("[data-family]");if(!btn)return;activeFamily=btn.getAttribute("data-family");document.querySelectorAll("[data-family]").forEach(function(el){el.classList.toggle("active",el===btn)});renderCatalog()});
 document.addEventListener("click",function(e){
  var view=e.target.closest("[data-view]");if(view){var selectedId=view.getAttribute("data-view");if(location.hash!=="#discover"){location.hash="discover";setTimeout(function(){details(selectedId)},70)}else{details(selectedId)}return}
  var src=e.target.closest("[data-source]");if(src){var m=materials.find(function(x){return x.id===src.getAttribute("data-source")});if(m)$("r-category").value=m.name;location.hash="rfq";return}
  if(e.target.closest("[data-close-detail]")){$("material-detail").classList.remove("open")}
 });
 $("menu-toggle").addEventListener("click",function(){var n=$("main-nav"),open=n.classList.toggle("open");$("menu-toggle").setAttribute("aria-expanded",String(open));$("menu-toggle").textContent=open?"✕":"☰"});
 setupForms();window.addEventListener("hashchange",viewRoute);viewRoute();renderCatalog();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();