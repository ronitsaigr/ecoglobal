// EcoGlobal Cloudflare Worker - invitation-only pilot API.
// D1 and R2 bindings defined in wrangler.toml; never store secrets in frontend.
const CATS=['Paper & board','Fiber alternatives','Flexible formats','Circular systems','Packaging components'];
const enc=new TextEncoder();
const id=()=>crypto.randomUUID();
const str=(v,n=200)=>String(v??'').trim().slice(0,n);
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const ok=(cond,msg,status=400)=>{if(!cond)fail(msg,status)};
const hex=a=>Array.from(new Uint8Array(a),b=>b.toString(16).padStart(2,'0')).join('');
const unhex=s=>Uint8Array.from(s.match(/../g),x=>parseInt(x,16));
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
async function hashPassword(p,salt){const key=await crypto.subtle.importKey('raw',enc.encode(p),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(salt),iterations:260000,hash:'SHA-256'},key,256));}
function safeEq(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return !n;}
const one=(d,q,...b)=>d.prepare(q).bind(...b).first();
const many=async(d,q,...b)=>(await d.prepare(q).bind(...b).all()).results||[];
const run=(d,q,...b)=>d.prepare(q).bind(...b).run();
function txt(x,n,min=0){const s=str(x,n+1);ok(s.length<=n&&s.length>=min,'Invalid or missing field');return s}
function number(x,min=0){const v=Number(x);ok(Number.isFinite(v)&&v>=min,'Invalid number');return v}
function cat(x){ok(CATS.includes(x),'Invalid material category');return x}
async function parse(req){const s=await req.text();ok(s.length<=60000,'Request too large',413);try{return JSON.parse(s||'{}')}catch{fail('Invalid JSON')}}
function hd(origin){return {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',...(origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization, Content-Type, X-File-Name, X-Document-Type','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS'}:{})}}
const respond=(x,s=200,o='')=>new Response(JSON.stringify(x),{status:s,headers:hd(o)});
function role(user,...types){ok(types.includes(user.role),'Access denied',403)}
async function auth(req,env){const h=req.headers.get('Authorization')||'';ok(/^Bearer [a-f0-9]{64}$/.test(h),'Sign in required',401);const token=h.slice(7);const u=await one(env.DB,'SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',await sha(token),Date.now());ok(u,'Session expired',401);return u}
async function token(env,u){const key=hex(crypto.getRandomValues(new Uint8Array(32)));await run(env.DB,'INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',await sha(key),u.id,Date.now()+7*86400000);return {token:key,user:{id:u.id,name:u.name,email:u.email,role:u.role}}}
const ownSupplier=(e,u)=>one(e.DB,'SELECT * FROM suppliers WHERE owner_id=?',u.id);
async function notification(env,userId,message,relatedId){await run(env.DB,'INSERT INTO notifications(id,user_id,message,related_id) VALUES(?,?,?,?)',id(),userId,message,relatedId||null)}
async function audit(env,u,action,target,note){await run(env.DB,'INSERT INTO audit_log(id,actor_id,action,target_id,note) VALUES(?,?,?,?,?)',id(),u.id,action,target,note||'')}
async function match(env,rfq,category){const rows=await many(env.DB,"SELECT DISTINCT s.id,s.owner_id FROM suppliers s JOIN products p ON p.supplier_id=s.id WHERE s.status='approved' AND p.status='approved' AND p.category=? LIMIT 25",category);for(const s of rows){const x=await run(env.DB,'INSERT OR IGNORE INTO matches(rfq_id,supplier_id) VALUES(?,?)',rfq,s.id);if(x.meta?.changes)await notification(env,s.owner_id,'Sourcing request matched to your company',rfq)}}
async function endpoint(req,env,p,u){const method=req.method;
if(p==='/api/health'&&method==='GET'){await one(env.DB,'SELECT 1 AS ok');return {ok:true,stack:'Cloudflare Workers + D1 + R2',registration:'invite-only'}}
if(p==='/api/catalog'&&method==='GET')return {items:await many(env.DB,"SELECT p.id,p.name,p.category,p.description,p.min_order_quantity,p.unit,s.name AS supplier_name,s.country AS supplier_country FROM products p JOIN suppliers s ON s.id=p.supplier_id WHERE p.status='approved' AND s.status='approved' ORDER BY p.created_at DESC LIMIT 100")};
if(p==='/api/auth/register'&&method==='POST'){
 ok(env.REGISTRATION_CODE?.length>=16,'Invitations not enabled',503);const b=await parse(req);
 ok(safeEq(await sha(String(b.invite_code||'')),await sha(env.REGISTRATION_CODE)),'Invalid invite code',403);
 const email=txt(b.email,180,5).toLowerCase(),password=String(b.password||''),name=txt(b.name,120,2);ok(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Valid email required');ok(password.length>=12&&password.length<=128,'Password must have 12–128 characters');role({role:b.role},'buyer','supplier');ok(!(await one(env.DB,'SELECT id FROM users WHERE email=?',email)),'Email already exists',409);
 const salt=hex(crypto.getRandomValues(new Uint8Array(16))),uid=id();await run(env.DB,'INSERT INTO users(id,email,name,role,password_salt,password_hash) VALUES(?,?,?,?,?,?)',uid,email,name,b.role,salt,await hashPassword(password,salt));return token(env,{id:uid,email,name,role:b.role})}
if(p==='/api/auth/login'&&method==='POST'){
 const b=await parse(req),email=str(b.email,180).toLowerCase(),password=String(b.password||'');ok(password.length<129,'Invalid credentials',401);
 const key=await sha((req.headers.get('CF-Connecting-IP')||'ip')+':'+email),current=await one(env.DB,'SELECT failures,reset_at FROM login_attempts WHERE key=?',key),now=Date.now();ok(!current||current.reset_at<now||current.failures<6,'Too many attempts; try later',429);
 const user=await one(env.DB,'SELECT * FROM users WHERE email=?',email),salt=user?.password_salt||'00'.repeat(16),hash=await hashPassword(password,salt);
 if(!user||!safeEq(hash,user.password_hash)){await run(env.DB,'INSERT INTO login_attempts(key,failures,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN reset_at<? THEN 1 ELSE failures+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END',key,now+3600000,now,now);fail('Invalid credentials',401)}
 await run(env.DB,'DELETE FROM login_attempts WHERE key=?',key);return token(env,user)}
if(p==='/api/me'&&method==='GET')return {user:u};
if(p==='/api/auth/logout'&&method==='POST'){await run(env.DB,'DELETE FROM sessions WHERE token_hash=?',await sha(req.headers.get('Authorization').slice(7)));return {ok:true}}
if(p==='/api/suppliers/me'&&method==='GET'){role(u,'supplier','admin');return {supplier:await ownSupplier(env,u)}}
if(p==='/api/suppliers/me'&&method==='POST'){
 role(u,'supplier');const b=await parse(req),fields=[txt(b.name,160,2),txt(b.country,100,2),txt(b.website,250),txt(b.description,2000),txt(b.contact_name,120),txt(b.contact_email,180),txt(b.contact_phone,60)],old=await ownSupplier(env,u);
 if(old){await run(env.DB,"UPDATE suppliers SET name=?,country=?,website=?,description=?,contact_name=?,contact_email=?,contact_phone=?,status='pending',review_note='' WHERE owner_id=?",...fields,u.id);await run(env.DB,"UPDATE products SET status='pending',review_note='' WHERE supplier_id=?",old.id);return {id:old.id,status:'pending'}}
 const sid=id();await run(env.DB,'INSERT INTO suppliers(id,owner_id,name,country,website,description,contact_name,contact_email,contact_phone) VALUES(?,?,?,?,?,?,?,?,?)',sid,u.id,...fields);return {id:sid,status:'pending'}}
if(p==='/api/products/mine'&&method==='GET'){role(u,'supplier');const s=await ownSupplier(env,u);return {items:s?await many(env.DB,'SELECT * FROM products WHERE supplier_id=? ORDER BY created_at DESC',s.id):[]}}
if(p==='/api/products'&&method==='POST'){
 role(u,'supplier');const s=await ownSupplier(env,u);ok(s,'Company profile required',409);const b=await parse(req),pid=id();await run(env.DB,'INSERT INTO products(id,supplier_id,name,category,description,min_order_quantity,unit) VALUES(?,?,?,?,?,?,?)',pid,s.id,txt(b.name,160,2),cat(b.category),txt(b.description,2000),b.min_order_quantity?number(b.min_order_quantity,0.01):null,txt(b.unit||'units',40,1));return {id:pid,status:'pending'}}
if(p.startsWith('/api/products/')&&method==='PATCH'){
 role(u,'supplier');const s=await ownSupplier(env,u),pid=p.split('/')[3],current=await one(env.DB,'SELECT id FROM products WHERE id=? AND supplier_id=?',pid,s?.id||'');ok(current,'Product not found',404);const b=await parse(req);await run(env.DB,"UPDATE products SET name=?,category=?,description=?,min_order_quantity=?,unit=?,status='pending',review_note='' WHERE id=?",txt(b.name,160,2),cat(b.category),txt(b.description,2000),b.min_order_quantity?number(b.min_order_quantity,0.01):null,txt(b.unit||'units',40,1),pid);return {ok:true,status:'pending'}}
if(p==='/api/rfqs'&&method==='GET'){
 if(u.role==='buyer')return {items:await many(env.DB,'SELECT * FROM rfqs WHERE buyer_id=? ORDER BY created_at DESC LIMIT 100',u.id)};
 if(u.role==='supplier')return {items:await many(env.DB,"SELECT r.* FROM rfqs r JOIN matches m ON m.rfq_id=r.id JOIN suppliers s ON s.id=m.supplier_id WHERE s.owner_id=? AND s.status='approved' ORDER BY r.created_at DESC LIMIT 100",u.id)};
 return {items:await many(env.DB,'SELECT * FROM rfqs ORDER BY created_at DESC LIMIT 100')}}
if(p==='/api/rfqs'&&method==='POST'){
 role(u,'buyer');const b=await parse(req),rid=id();await run(env.DB,'INSERT INTO rfqs(id,buyer_id,title,category,details,quantity,unit,destination_country,needed_by) VALUES(?,?,?,?,?,?,?,?,?)',rid,u.id,txt(b.title,180,5),cat(b.category),txt(b.details,5000,10),number(b.quantity,0.01),txt(b.unit||'units',40,1),txt(b.destination_country,100,2),b.needed_by||null);await match(env,rid,b.category);return {id:rid,status:'open'}}
if(p.startsWith('/api/rfqs/')&&method==='PATCH'){
 role(u,'buyer');const rid=p.split('/')[3],b=await parse(req);ok(b.status==='closed','Closing is the only supported update');const r=await run(env.DB,"UPDATE rfqs SET status='closed' WHERE id=? AND buyer_id=?",rid,u.id);ok(r.meta?.changes,'RFQ not found',404);return {ok:true}}
if(p==='/api/quotes'&&method==='GET'){
 if(u.role==='buyer')return {items:await many(env.DB,'SELECT q.*,s.name AS supplier_name FROM quotes q JOIN rfqs r ON r.id=q.rfq_id JOIN suppliers s ON s.id=q.supplier_id WHERE r.buyer_id=? ORDER BY q.created_at DESC',u.id)};
 if(u.role==='supplier'){const s=await ownSupplier(env,u);return {items:s?await many(env.DB,'SELECT * FROM quotes WHERE supplier_id=? ORDER BY created_at DESC',s.id):[]}}
 return {items:await many(env.DB,'SELECT * FROM quotes ORDER BY created_at DESC LIMIT 100')}}
if(p==='/api/quotes'&&method==='POST'){
 role(u,'supplier');const b=await parse(req),s=await ownSupplier(env,u);ok(s?.status==='approved','Supplier approval required',403);const r=await one(env.DB,"SELECT r.* FROM rfqs r JOIN matches m ON m.rfq_id=r.id WHERE r.id=? AND m.supplier_id=? AND r.status='open'",b.rfq_id,s.id);ok(r,'Open matched RFQ required',403);const currency=txt(b.currency,3,3).toUpperCase();ok(/^[A-Z]{3}$/.test(currency),'Invalid currency');const qid=id();await run(env.DB,'INSERT INTO quotes(id,rfq_id,supplier_id,unit_price,currency,lead_time_days,message) VALUES(?,?,?,?,?,?,?)',qid,r.id,s.id,number(b.unit_price,0.01),currency,number(b.lead_time_days,1),txt(b.message,2000));await notification(env,r.buyer_id,'New supplier quotation received',r.id);return {id:qid,status:'submitted'}}
if(p.startsWith('/api/quotes/')&&method==='PATCH'){
 role(u,'buyer');const qid=p.split('/')[3],b=await parse(req);ok(['accepted','declined'].includes(b.status),'Invalid quote decision');const q=await one(env.DB,'SELECT q.*,r.buyer_id,r.status AS rfq_status,s.owner_id FROM quotes q JOIN rfqs r ON r.id=q.rfq_id JOIN suppliers s ON s.id=q.supplier_id WHERE q.id=?',qid);ok(q&&q.buyer_id===u.id,'Quote not found',404);ok(q.status==='submitted'&&q.rfq_status==='open','Quote no longer actionable',409);const result=await run(env.DB,"UPDATE quotes SET status=? WHERE id=? AND status='submitted'",b.status,qid);ok(result.meta?.changes,'Already reviewed',409);await notification(env,q.owner_id,'Quotation '+b.status+' by buyer',q.rfq_id);return {ok:true}}
if(p==='/api/documents'&&method==='GET'){
 if(u.role==='supplier'){const s=await ownSupplier(env,u);return {items:s?await many(env.DB,'SELECT id,document_type,original_name,created_at FROM documents WHERE supplier_id=?',s.id):[]}}role(u,'admin');return {items:await many(env.DB,'SELECT d.id,d.document_type,d.original_name,d.created_at,s.name AS supplier_name FROM documents d JOIN suppliers s ON s.id=d.supplier_id ORDER BY d.created_at DESC LIMIT 100')}}
if(p==='/api/documents'&&method==='POST'){
 role(u,'supplier');const s=await ownSupplier(env,u);ok(s,'Company profile required',409);const type=req.headers.get('Content-Type')||'',length=Number(req.headers.get('Content-Length')||0);ok(['application/pdf','image/jpeg','image/png'].includes(type),'Invalid file type',415);ok(!length||length<=5242880,'File must be 5MB or less',413);const bytes=await req.arrayBuffer();ok(bytes.byteLength>0&&bytes.byteLength<=5242880,'File must be 5MB or less',413);const did=id(),key=u.id+'/'+s.id+'/'+did;await env.EVIDENCE.put(key,bytes,{httpMetadata:{contentType:type}});await run(env.DB,'INSERT INTO documents(id,supplier_id,object_key,document_type,content_type,original_name) VALUES(?,?,?,?,?,?)',did,s.id,key,txt(req.headers.get('X-Document-Type')||'Supporting evidence',100),type,txt(req.headers.get('X-File-Name')||'document',160));return {id:did}}
if(p.startsWith('/api/documents/')&&method==='GET'){
 const doc=await one(env.DB,'SELECT d.*,s.owner_id FROM documents d JOIN suppliers s ON s.id=d.supplier_id WHERE d.id=?',p.split('/')[3]);ok(doc&&(u.role==='admin'||doc.owner_id===u.id),'Document unavailable',404);const obj=await env.EVIDENCE.get(doc.object_key);ok(obj,'File not found',404);return new Response(obj.body,{headers:{'Content-Type':doc.content_type,'Content-Disposition':'attachment; filename="evidence"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}
if(p==='/api/notifications'&&method==='GET')return {items:await many(env.DB,'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30',u.id)};
if(p.startsWith('/api/notifications/')&&method==='PATCH'){await run(env.DB,'UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?',p.split('/')[3],u.id);return {ok:true}}
if(p==='/api/admin/review'&&method==='GET'){
 role(u,'admin');return {suppliers:await many(env.DB,'SELECT * FROM suppliers ORDER BY created_at DESC LIMIT 100'),products:await many(env.DB,'SELECT p.*,s.name AS supplier_name FROM products p JOIN suppliers s ON s.id=p.supplier_id ORDER BY p.created_at DESC LIMIT 100'),rfqs:await many(env.DB,"SELECT id,title FROM rfqs WHERE status='open' ORDER BY created_at DESC LIMIT 100")}}
if(p.startsWith('/api/admin/suppliers/')&&method==='PATCH'){
 role(u,'admin');const sid=p.split('/')[4],b=await parse(req),note=txt(b.note,1000);ok(['approved','rejected'].includes(b.status),'Invalid review');const s=await one(env.DB,'SELECT id,owner_id FROM suppliers WHERE id=?',sid);ok(s,'Not found',404);await run(env.DB,'UPDATE suppliers SET status=?,review_note=? WHERE id=?',b.status,note,sid);if(b.status==='rejected')await run(env.DB,"UPDATE products SET status='pending',review_note='' WHERE supplier_id=?",sid);await audit(env,u,'supplier.'+b.status,sid,note);await notification(env,s.owner_id,'Supplier application '+b.status,sid);return {ok:true}}
if(p.startsWith('/api/admin/products/')&&method==='PATCH'){
 role(u,'admin');const pid=p.split('/')[4],b=await parse(req),note=txt(b.note,1000);ok(['approved','rejected'].includes(b.status),'Invalid review');const product=await one(env.DB,'SELECT p.*,s.status AS supplier_status,s.owner_id FROM products p JOIN suppliers s ON s.id=p.supplier_id WHERE p.id=?',pid);ok(product,'Not found',404);if(b.status==='approved')ok(product.supplier_status==='approved','Approve supplier first',409);await run(env.DB,'UPDATE products SET status=?,review_note=? WHERE id=?',b.status,note,pid);await audit(env,u,'product.'+b.status,pid,note);await notification(env,product.owner_id,'Product listing '+b.status,pid);if(b.status==='approved'){const rfqs=await many(env.DB,"SELECT id FROM rfqs WHERE category=? AND status='open' LIMIT 100",product.category);for(const r of rfqs)await match(env,r.id,product.category)}return {ok:true}}
if(p==='/api/admin/matches'&&method==='POST'){
 role(u,'admin');const b=await parse(req),rfq=await one(env.DB,"SELECT id FROM rfqs WHERE id=? AND status='open'",b.rfq_id),s=await one(env.DB,"SELECT id,owner_id FROM suppliers WHERE id=? AND status='approved'",b.supplier_id);ok(rfq&&s,'Open RFQ and approved supplier required',409);const x=await run(env.DB,'INSERT OR IGNORE INTO matches(rfq_id,supplier_id) VALUES(?,?)',rfq.id,s.id);if(x.meta?.changes)await notification(env,s.owner_id,'Supplier manually assigned to RFQ',rfq.id);await audit(env,u,'rfq.match',rfq.id,s.id);return {ok:true}}
fail('Not found',404);
}
export default {async fetch(req,env){
 const origin=req.headers.get('Origin')||'',allowed=['https://ecoglobal.in','https://www.ecoglobal.in','http://localhost:8787','http://127.0.0.1:8787'];const cors=allowed.includes(origin)?origin:'';
 if(req.method==='OPTIONS')return new Response(null,{status:cors?204:403,headers:hd(cors)});
 if(origin&&!cors)return respond({error:'Origin not permitted'},403);
 try{const p=new URL(req.url).pathname;ok(p.startsWith('/api/'),'Not found',404);ok(env.DB,'D1 binding missing',503);
 const publicRoutes=['/api/health','/api/catalog','/api/auth/register','/api/auth/login'];const user=publicRoutes.includes(p)?null:await auth(req,env);
 const result=await endpoint(req,env,p,user);
 if(result instanceof Response){if(cors){const h=new Headers(result.headers);h.set('Access-Control-Allow-Origin',cors);h.set('Vary','Origin');return new Response(result.body,{status:result.status,headers:h})}return result}return respond(result,200,cors);
 }catch(e){const code=e.status||(/UNIQUE constraint|FOREIGN KEY constraint/.test(String(e.message))?409:500);if(code>=500)console.error('EcoGlobal API error',e);return respond({error:code>=500?'Service temporarily unavailable':e.message},code,cors)}
}};