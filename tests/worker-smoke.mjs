import assert from 'node:assert/strict';
import worker from '../cloudflare/src/worker.js';
const DB={prepare(){return {bind(){return {first:async()=>({ok:1}),all:async()=>({results:[]})}}}}};
async function check(path,{method='GET',origin='https://ecoglobal.in',body}={}){
 const req=new Request('https://ecoglobal-api.example.workers.dev'+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 return worker.fetch(req,{DB});
}
let res=await check('/api/health');assert.equal(res.status,200);assert.equal((await res.json()).ok,true);
res=await check('/api/catalog');assert.equal(res.status,200);assert.deepEqual((await res.json()).items,[]);
res=await check('/api/auth/register',{method:'POST',body:{email:'a@b.com'}});assert.equal(res.status,503);
res=await check('/api/rfqs',{method:'POST',body:{}});assert.equal(res.status,401);
res=await check('/api/catalog',{origin:'https://malicious.example'});assert.equal(res.status,403);
res=await check('/api/catalog',{method:'OPTIONS'});assert.equal(res.status,204);
console.log('Worker smoke checks passed');
