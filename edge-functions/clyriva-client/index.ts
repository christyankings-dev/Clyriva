/** Clyriva Clientes v2.0 - avisos por empresa, autenticacao individual e push isolado. */
import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
import webpush from 'npm:web-push@3.6.7';

const URL_DB=Deno.env.get('SUPABASE_URL')||'';
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const APP='https://clyriva-production.up.railway.app';
const VAPID_PUBLIC_KEY='BD1bJQpcuVByjZ4a6vODM5afxJGP6rp7_AKn61BO2e4xKf17lrM2ZFPliYOT9zDUBWscqGrmSJE87Nla5sVX6ZE';
const db=createClient(URL_DB,SERVICE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const CORS={'Access-Control-Allow-Origin':APP,'Access-Control-Allow-Headers':'apikey,authorization,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
const HEADERS={...CORS,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Type':'application/json; charset=utf-8'};
const response=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:HEADERS});
const fail=(message:string,status=400)=>response({ok:false,error:message},status);
const jsonLimit=6500;
function emailValid(x:unknown):x is string{return typeof x==='string'&&x.length>=6&&x.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);}
function validEndpoint(x:unknown):x is string{
 if(typeof x!=='string'||x.length<25||x.length>2048)return false;
 try{const u=new URL(x);if(u.protocol!=='https:'||u.port||u.username||u.password)return false;
  const h=u.hostname.toLowerCase();return h==='fcm.googleapis.com'||h==='updates.push.services.mozilla.com'||h.endsWith('.push.apple.com')||h==='web.push.apple.com'||h.endsWith('.notify.windows.com')||h==='notify.windows.com'||h.endsWith('.push.services.mozilla.com');
 }catch{return false;}
}
function subscriptionValid(s:any){return !!(s&&validEndpoint(s.endpoint)&&s.keys&&typeof s.keys.p256dh==='string'&&s.keys.p256dh.length>=60&&s.keys.p256dh.length<=160&&typeof s.keys.auth==='string'&&s.keys.auth.length>=16&&s.keys.auth.length<=100);}
function password(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789-_';const b=crypto.getRandomValues(new Uint8Array(28));return [...b].map(x=>chars[x%chars.length]).join('');}
async function currentUser(req:Request){
 const match=/^Bearer (\S+)$/i.exec(req.headers.get('authorization')||'');if(!match||match[1].length>4096)return null;
 const {data:{user},error}=await db.auth.getUser(match[1]);return error||!user?.id||!user.email_confirmed_at?null:user;
}
async function isAdmin(uid:string){const {data,error}=await db.from('clyriva_admins').select('user_id').eq('user_id',uid).maybeSingle();if(error)throw error;return !!data;}
async function workspace(uid:string){const {data,error}=await db.from('clyriva_workspace').select('payload').eq('admin_id',uid).maybeSingle();if(error)throw error;return data?.payload||null;}
function activeCompany(payload:any,clientId:string){return (Array.isArray(payload?.clients)?payload.clients:[]).find((c:any)=>c?.id===clientId&&c.status!=='inactive')||null;}
async function activeGrants(uid:string){
 const {data,error}=await db.from('clyriva_client_access').select('admin_id,client_id,email,user_id,enabled').eq('user_id',uid).eq('enabled',true).limit(100);
 if(error)throw error;const scope:any[]=[];
 const cache=new Map<string,any>();for(const grant of data||[]){
  if(!cache.has(grant.admin_id))cache.set(grant.admin_id,await workspace(grant.admin_id));
  const c=activeCompany(cache.get(grant.admin_id),grant.client_id);
  if(c)scope.push({admin_id:grant.admin_id,client_id:grant.client_id,company:String(c.name||'Empresa')});
 }
 return scope;
}
async function credentials(){const {data,error}=await db.rpc('clyriva_push_server_settings');if(error||!data||typeof data.privateKey!=='string'||typeof data.cronToken!=='string')throw Error('Secrets unavailable');return data as {privateKey:string,cronToken:string};}
async function sender(){const v=await credentials();webpush.setVapidDetails(APP,VAPID_PUBLIC_KEY,v.privateKey);return v;}
async function push(sub:any,payload:any){
 try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_secret}},JSON.stringify(payload),{TTL:3600});return true;}
 catch(e:any){if([404,410].includes(Number(e?.statusCode||0)))await db.from('clyriva_client_push_subscriptions').delete().eq('endpoint',sub.endpoint);return false;}
}
const GENERIC={title:'Novo aviso disponível',body:'Abra o Clyriva Clientes para consultar suas informações.',tag:'cliente-aviso',url:'/cliente.html'};
async function sendNewNotice(adminId:string,clientId:string){
 const {data:grants,error}=await db.from('clyriva_client_access').select('user_id').eq('admin_id',adminId).eq('client_id',clientId).eq('enabled',true).not('user_id','is',null);
 if(error||!grants?.length)return 0;await sender();let sent=0;
 for(const uid of [...new Set<string>((grants as any[]).map((x:any)=>String(x.user_id)))]){
  if(!(await activeGrants(uid)).some(g=>g.admin_id===adminId&&g.client_id===clientId))continue;
  const {data:subs}=await db.from('clyriva_client_push_subscriptions').select('endpoint,p256dh,auth_secret').eq('user_id',uid).eq('enabled',true).limit(20);
  for(const sub of subs||[])if(await push(sub,GENERIC))sent++;
 }return sent;
}
async function adminHandler(uid:string,action:string,body:any){
 const payload=await workspace(uid),customers=Array.isArray(payload?.clients)?payload.clients:[];
 const clientId=String(body?.clientId||'').trim();
 if(action==='list'){
  const {data:grants,error:e1}=await db.from('clyriva_client_access').select('client_id,email,enabled,created_at').eq('admin_id',uid).order('created_at',{ascending:false}).limit(300);
  const {data:notices,error:e2}=await db.from('clyriva_client_notices').select('id,client_id,title,body,due_date,status,created_at').eq('admin_id',uid).order('created_at',{ascending:false}).limit(300);
  if(e1||e2)throw e1||e2;
  return response({ok:true,companies:customers.map((x:any)=>({id:x.id,name:x.name,status:x.status})).filter((x:any)=>x.id),grants:grants||[],notices:notices||[]});
 }
 if(action==='revoke'){
  const email=String(body?.email||'').trim().toLowerCase();if(!clientId||!emailValid(email))return fail('Empresa ou e-mail inválido.');
  const {error:e}=await db.from('clyriva_client_access').update({enabled:false}).eq('admin_id',uid).eq('client_id',clientId).eq('email',email);
  return e?fail('Não foi possível revogar o acesso.',500):response({ok:true});
 }
 if(action==='archive'){
  const id=String(body?.noticeId||'');if(!/^[0-9a-f-]{36}$/i.test(id))return fail('Aviso inválido.');
  const {error:e}=await db.from('clyriva_client_notices').update({status:'archived',updated_at:new Date().toISOString()}).eq('id',id).eq('admin_id',uid);
  return e?fail('Não foi possível arquivar o aviso.',500):response({ok:true});
 }
 if(!activeCompany(payload,clientId))return fail('Cadastre e salve primeiro uma empresa ativa no painel.',400);
 if(action==='invite'){
  const email=String(body?.email||'').trim().toLowerCase();if(!emailValid(email))return fail('Informe um e-mail válido.');
  let existing:any=null;
  for(let page=1;page<=15;page++){
   const {data,error:e}=await db.auth.admin.listUsers({page,perPage:100});if(e)throw e;
   existing=data?.users?.find(u=>u.email?.toLowerCase()===email)||null;
   if(existing||(data?.users||[]).length<100)break;
  }
  if(existing?.id&&await isAdmin(existing.id))return fail('O endereço já pertence a um administrador.',403);
  if(existing&&!existing.email_confirmed_at)return fail('Conta existente aguarda confirmação. Escolha outro e-mail ou regularize pelo Supabase.',409);
  let id=existing?.id,temporaryPassword:string|null=null,created=false;
  if(!id){temporaryPassword=password();const {data,error:e}=await db.auth.admin.createUser({email,password:temporaryPassword,email_confirm:true});if(e||!data.user?.id)return fail('Não foi possível criar o login do cliente.',409);id=data.user.id;created=true;}
  const {error:e}=await db.from('clyriva_client_access').upsert({admin_id:uid,client_id:clientId,email,user_id:id,enabled:true},{onConflict:'admin_id,client_id,email'});
  if(e){if(created)await db.auth.admin.deleteUser(id);return fail('Não foi possível vincular o cliente à empresa.',500);}
  return response({ok:true,email,created,temporaryPassword,loginUrl:APP+'/cliente.html'});
 }
 if(action==='publish'){
  const title=String(body?.title||'').trim(),message=String(body?.message||'').trim(),dueDate=String(body?.dueDate||'').trim();
  if(title.length<3||title.length>140||message.length<5||message.length>1500)return fail('Informe título e mensagem com tamanho válido.');
  if(dueDate&&!/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(dueDate))return fail('Data inválida.');
  const {data,error:e}=await db.from('clyriva_client_notices').insert({admin_id:uid,client_id:clientId,title,body:message,due_date:dueDate||null}).select('id').single();
  if(e||!data)return fail('Não foi possível publicar o aviso.',500);
  // A publicacao permanece mesmo sem dispositivo conectado. Conteudo sensivel nunca vai no push.
  let sent=0;if(body?.notify===true){try{sent=await sendNewNotice(uid,clientId);}catch{sent=0;}}
  return response({ok:true,noticeId:data.id,pushSent:sent});
 }
 return fail('Ação administrativa indisponível.',404);
}
async function clientHandler(uid:string,action:string,body:any){
 const scope=await activeGrants(uid);if(!scope.length)return fail('Nenhuma empresa autorizada para esta conta. Fale com a gestão.',403);
 if(action==='list'){
   const admins=[...new Set(scope.map(x=>x.admin_id))];
   const allowed=new Set(scope.map(x=>x.admin_id+'|'+x.client_id));
   const {data,error:e}=await db.from('clyriva_client_notices').select('id,admin_id,client_id,title,body,due_date,created_at').eq('status','active').in('admin_id',admins).in('client_id',[...new Set(scope.map(x=>x.client_id))]).order('created_at',{ascending:false}).limit(400);
   if(e)throw e;
   const notices=(data||[]).filter(x=>allowed.has(x.admin_id+'|'+x.client_id));
   return response({ok:true,companies:scope,notices});
 }
 if(action==='subscribe'){
  const sub=body?.subscription;if(!subscriptionValid(sub))return fail('Assinatura inválida.');
  const {error:e}=await db.from('clyriva_client_push_subscriptions').upsert({user_id:uid,endpoint:sub.endpoint,p256dh:sub.keys.p256dh,auth_secret:sub.keys.auth,enabled:true,updated_at:new Date().toISOString()},{onConflict:'endpoint'});
  if(e)return fail('Não foi possível ativar notificações.',500);
  // Uma mesma assinatura de navegador nao deve ser entregue a dois tipos de usuario.
  await db.from('clyriva_push_subscriptions').delete().eq('endpoint',sub.endpoint);
  return response({ok:true});
 }
 if(action==='unsubscribe'){
  if(!validEndpoint(body?.endpoint))return fail('Dispositivo inválido.');
  const {error:e}=await db.from('clyriva_client_push_subscriptions').delete().eq('endpoint',body.endpoint).eq('user_id',uid);
  return e?fail('Não foi possível desativar notificações.',500):response({ok:true});
 }
 if(action==='test'){
  if(!validEndpoint(body?.endpoint))return fail('Dispositivo inválido.');
  const {data:sub,error:e}=await db.from('clyriva_client_push_subscriptions').select('endpoint,p256dh,auth_secret,last_test_at').eq('endpoint',body.endpoint).eq('user_id',uid).eq('enabled',true).maybeSingle();
  if(e||!sub)return fail('Ative as notificações primeiro.',404);
  if(sub.last_test_at&&Date.now()-Date.parse(sub.last_test_at)<30000)return fail('Aguarde 30 segundos para novo teste.',429);
  await db.from('clyriva_client_push_subscriptions').update({last_test_at:new Date().toISOString()}).eq('endpoint',sub.endpoint).eq('user_id',uid);
  await sender();const ok=await push(sub,{title:'Notificação de teste',body:'Clyriva Clientes está pronto para receber avisos.',tag:'teste-cliente',url:'/cliente.html'});
  return ok?response({ok:true}):fail('O aparelho recusou a notificação.',502);
 }
 return fail('Ação não encontrada.',404);
}
function todayBR(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=(k:string)=>parts.find(x=>x.type===k)?.value||'';return `${get('year')}-${get('month')}-${get('day')}`;}
function plusDays(s:string,n:number){return new Date(Date.parse(s+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);}
async function dispatch(req:Request){
 const secret=req.headers.get('x-clyriva-cron')||'';
 const setting=await credentials();if(!secret||secret.length!==setting.cronToken.length)return fail('Acesso restrito.',403);
 let diff=0;for(let i=0;i<secret.length;i++)diff|=secret.charCodeAt(i)^setting.cronToken.charCodeAt(i);
 if(diff!==0)return fail('Acesso restrito.',403);
 await sender();const day=todayBR(),windowEnd=plusDays(day,3),windowStart=plusDays(day,-7);
 const {data:subs,error:e}=await db.from('clyriva_client_push_subscriptions').select('endpoint,user_id,p256dh,auth_secret,last_sent_on').eq('enabled',true).limit(500);
 if(e)throw e;if(!subs?.length)return response({ok:true,sent:0,failed:0});
 let sent=0,failed=0;
 for(const sub of subs){
  if(sub.last_sent_on===day)continue;
  const scope=await activeGrants(sub.user_id);if(!scope.length)continue;
  const allowed=new Set(scope.map(x=>x.admin_id+'|'+x.client_id));
  const {data:notices,error:nErr}=await db.from('clyriva_client_notices').select('admin_id,client_id,due_date').eq('status','active').gte('due_date',windowStart).lte('due_date',windowEnd).in('admin_id',[...new Set(scope.map(x=>x.admin_id))]).in('client_id',[...new Set(scope.map(x=>x.client_id))]).limit(500);
  if(nErr)throw nErr;
  if(!(notices||[]).some(x=>allowed.has(x.admin_id+'|'+x.client_id)))continue;
  const ok=await push(sub,{title:'Lembrete de prazo',body:'Você tem um aviso com prazo próximo ou vencido. Abra o Clyriva Clientes para conferir.',tag:'cliente-prazo',url:'/cliente.html'});
  if(ok){sent++;await db.from('clyriva_client_push_subscriptions').update({last_sent_on:day}).eq('endpoint',sub.endpoint).eq('user_id',sub.user_id);}else failed++;
 }
 return response({ok:true,sent,failed});
}
Deno.serve(async req=>{
 try{
  if(!URL_DB||!SERVICE_KEY)return fail('Serviço indisponível.',503);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  if(req.headers.get('origin')&&req.headers.get('origin')!==APP)return fail('Origem não autorizada.',403);
  if(req.method!=='POST')return fail('Método inválido.',405);
  if(Number(req.headers.get('content-length')||0)>jsonLimit)return fail('Solicitação muito grande.',413);
  const action=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)||'';
  if(action==='dispatch')return await dispatch(req);
  const user=await currentUser(req);if(!user)return fail('Entre com seu login autorizado.',401);
  const raw=await req.text();if(raw.length>jsonLimit)return fail('Solicitação muito grande.',413);
  let body:any;try{body=JSON.parse(raw);}catch{return fail('Dados inválidos.',400);}
  if(!body||typeof body!=='object'||Array.isArray(body))return fail('Dados inválidos.',400);
  if(action.startsWith('admin-')){
   if(!await isAdmin(user.id))return fail('Apenas a gestão pode realizar esta operação.',403);
   return await adminHandler(user.id,action.slice(6),body);
  }
  if(action.startsWith('client-')){
   if(await isAdmin(user.id))return fail('Use um login de cliente nesta área.',403);
   return await clientHandler(user.id,action.slice(7),body);
  }
  return fail('Operação indisponível.',404);
 }catch(e){console.error('Clyriva Clientes: internal error');return fail('Não foi possível concluir a operação.',500);}
});
