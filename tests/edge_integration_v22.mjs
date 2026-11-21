/* Simulacao isolada da Edge Function: API real executada contra Supabase e Web Push falsos.
   Nao abre rede, nao cria contas e nao acessa nenhum cliente real. */
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,resolve} from 'node:path';
import crypto from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const rules=await import(pathToFileURL(resolve(root,'edge-functions/clyriva-client/reminder-text.mjs')));
const source=readFileSync(resolve(root,'edge-functions/clyriva-client/index.ts'),'utf8');
const code=stripTypeScriptTypes(source.replace(/^import .*;$/gm,''));
let handler=null;
const today=rules.brazilDate(),due=new Date(Date.parse(today+'T00:00:00Z')+3*86400000).toISOString().slice(0,10);
const state={devices:[{endpoint:'https://fcm.googleapis.com/fcm/send/fake-id-for-test',user_id:'client-1',enabled:true,p256dh:'a'.repeat(90),auth_secret:'b'.repeat(24),show_amount:false}],grants:[{admin_id:'admin-1',client_id:'empresa-a',email:'fake@example.test',user_id:'client-1',enabled:true}],workspaces:[{admin_id:'admin-1',payload:{clients:[{id:'empresa-a',name:'Empresa simulada',status:'active'}]}}],notices:[{id:'11111111-1111-4111-8111-111111111111',admin_id:'admin-1',client_id:'empresa-a',title:'DAS simulado',body:'Guia fiscal de teste',notice_type:'DAS',amount_cents:8250,due_date:due,status:'active',reminder_enabled:true}],deliveries:[],sent:[]};
class Query {
 constructor(table){this.table=table;this.filters=[];this.op='select';this.patch=null;this.value=null;this.take=Infinity;this.sort=null;}
 select(){return this;}
 eq(f,v){this.filters.push(row=>row[f]===v);return this;}
 lt(f,v){this.filters.push(row=>row[f]<v);return this;}
 gte(f,v){this.filters.push(row=>row[f]>=v);return this;}
 lte(f,v){this.filters.push(row=>row[f]<=v);return this;}
 in(f,v){this.filters.push(row=>v.includes(row[f]));return this;}
 not(f,_,v){this.filters.push(row=>row[f]!==v&&row[f]!=null);return this;}
 limit(v){this.take=v;return this;}
 order(){return this;}
 insert(v){this.op='insert';this.value=v;return this;}
 update(v){this.op='update';this.patch=v;return this;}
 delete(){this.op='delete';return this;}
 maybeSingle(){return Promise.resolve(this.execute('single'));}
 single(){return Promise.resolve(this.execute('single'));}
 execute(mode='many'){
  const arr=this.table==='clyriva_client_push_subscriptions'?state.devices:this.table==='clyriva_client_access'?state.grants:this.table==='clyriva_workspace'?state.workspaces:this.table==='clyriva_client_notices'?state.notices:this.table==='clyriva_client_push_deliveries'?state.deliveries:[];
  let matches=arr.filter(r=>this.filters.every(fn=>fn(r)));
  if(this.op==='insert'){
   const value=this.value;
   if(this.table==='clyriva_client_push_deliveries'&&arr.some(r=>r.endpoint===value.endpoint&&r.notice_id===value.notice_id&&r.delivery_date===value.delivery_date))return {data:null,error:{code:'23505'}};
   arr.push({...value,attempted_at:new Date().toISOString(),state:'pending'});
   return {data:{...value},error:null};
  }
  if(this.op==='delete')for(const r of matches){const i=arr.indexOf(r);if(i>=0)arr.splice(i,1);}
  if(this.op==='update')for(const r of matches)Object.assign(r,this.patch);
  matches=matches.slice(0,this.take);
  return {data:mode==='single'?matches[0]||null:matches,error:null};
 }
 then(ok,fail){return Promise.resolve(this.execute()).then(ok,fail);}
}
const client={from:(table)=>new Query(table),rpc:async()=>({data:{privateKey:'private-test-key',cronToken:'cron-test-token'},error:null}),auth:{getUser:async()=>({data:{user:null},error:null})}};
const webpush={setVapidDetails:()=>{},sendNotification:async(_,payload)=>{state.sent.push(JSON.parse(payload));}};
const context={createClient:()=>client,webpush,...rules,Deno:{env:{get:()=> 'placeholder'},serve:fn=>{handler=fn;}},console:{error:()=>{}},crypto:crypto.webcrypto,Request,Response,URL,Date,Intl,setTimeout};
vm.runInNewContext(code,context,{timeout:2000});assert.equal(typeof handler,'function');
async function dispatch(secret='cron-test-token'){
 const res=await handler(new Request('https://example.supabase.co/functions/v1/clyriva-client/dispatch',{method:'POST',headers:{'x-clyriva-cron':secret,'content-type':'application/json'},body:'{}'}));
 return {status:res.status,...await res.json()};
}
const denied=await dispatch('invalid');assert.equal(denied.status,403);
const first=await dispatch();assert.equal(first.status,200);assert.equal(first.sent,1);assert.equal(state.sent.length,1);
assert.match(state.sent[0].title,/vence em 3 dias/);assert.doesNotMatch(state.sent[0].body,/82,50/);
const second=await dispatch();assert.equal(second.sent,0);assert.equal(second.skipped,1);assert.equal(state.sent.length,1);
state.notices[0].status='paid';const paid=await dispatch();assert.equal(paid.sent,0);assert.equal(state.sent.length,1);
const id='22222222-2222-4222-8222-222222222222';state.notices.push({...state.notices[0],id,status:'active',title:'DAS retry'});
state.deliveries.push({endpoint:state.devices[0].endpoint,notice_id:id,delivery_date:today,days_before:3,state:'pending',attempted_at:new Date(Date.now()-40*60000).toISOString()});
const retry=await dispatch();assert.equal(retry.sent,1);assert.equal(state.sent.length,2);
assert.equal(state.deliveries.find(x=>x.notice_id===id)?.state,'sent');
const once=await dispatch();assert.equal(once.sent,0);assert.equal(state.sent.length,2);
console.log('EDGE V2.2 PASS: auth, D-3, privacy, per-day dedup, paid stop, stale lease recovery, no duplicate');
