/** Clyriva: Web Push para administradores. Segredos VAPID ficam no Vault, nunca no frontend/GitHub. */
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const APP = 'https://clyriva-production.up.railway.app';
const db = createClient(SUPABASE_URL, SERVICE_ROLE, {auth:{autoRefreshToken:false,persistSession:false}});
const VAPID_PUBLIC_KEY = 'BD1bJQpcuVByjZ4a6vODM5afxJGP6rp7_AKn61BO2e4xKf17lrM2ZFPliYOT9zDUBWscqGrmSJE87Nla5sVX6ZE';
const CORS = {'Access-Control-Allow-Origin':APP,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
const BASE_HEADERS = {...CORS,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Type':'application/json; charset=utf-8'};
const respond = (data:unknown,status=200) => new Response(JSON.stringify(data),{status,headers:BASE_HEADERS});
const error = (message:string,status=400) => respond({ok:false,error:message},status);

function validEndpoint(raw:unknown):raw is string {
 if (typeof raw!=='string'||raw.length<25||raw.length>2048)return false;
 try {
   const url = new URL(raw);
   if (url.protocol!=='https:'||url.username||url.password||url.port)return false;
   const host=url.hostname.toLowerCase();
   return host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||
     host.endsWith('.push.apple.com')||host==='web.push.apple.com'||
     host.endsWith('.notify.windows.com')||host==='notify.windows.com'||
     host.endsWith('.push.services.mozilla.com');
 } catch {return false;}
}
function validSubscription(o:any):boolean {
 return o&&validEndpoint(o.endpoint)&&o.keys&&
 typeof o.keys.p256dh==='string'&&o.keys.p256dh.length>=60&&o.keys.p256dh.length<=160&&
 typeof o.keys.auth==='string'&&o.keys.auth.length>=16&&o.keys.auth.length<=100;
}
async function authorizedUser(req:Request):Promise<string|null> {
 const match = /^Bearer (\S+)$/i.exec(req.headers.get('authorization')||'');
 if (!match||match[1].length>4096) return null;
 const {data:{user},error:sessionError}=await db.auth.getUser(match[1]);
 if (sessionError||!user?.id||!user.email_confirmed_at)return null;
 const {data:admin,error:adminError}=await db.from('clyriva_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminError||!admin)return null;
 return user.id;
}
async function settings():Promise<{privateKey:string,cronToken:string}> {
 const {data,error:e}=await db.rpc('clyriva_push_server_settings');
 if(e||!data||typeof data.privateKey!=='string'||typeof data.cronToken!=='string')throw new Error('Push settings unavailable');
 return {privateKey:data.privateKey,cronToken:data.cronToken};
}
function configure(vapidPrivate:string) {
 webpush.setVapidDetails(APP,VAPID_PUBLIC_KEY,vapidPrivate);
}
async function send(sub:any,payload:any):Promise<number> {
 try {await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_secret}},JSON.stringify(payload),{TTL:3600,urgency:'normal'});return 201;}
 catch(e:any){const code=Number(e?.statusCode||0);if(code===404||code===410){await db.from('clyriva_push_subscriptions').delete().eq('endpoint',sub.endpoint);}return code||500;}
}
async function handleSubscribe(userId:string,body:any){
 const sub=body?.subscription;
 if(!validSubscription(sub))return error('Assinatura de notificações inválida.');
 const {error:e}=await db.from('clyriva_push_subscriptions').upsert({
  admin_id:userId,endpoint:sub.endpoint,p256dh:sub.keys.p256dh,auth_secret:sub.keys.auth,enabled:true,updated_at:new Date().toISOString()
 },{onConflict:'endpoint'});
 if(e)return error('Não foi possível registrar este dispositivo.',500);
 return respond({ok:true});
}
async function handleUnsubscribe(userId:string,body:any){
 if(!validEndpoint(body?.endpoint))return error('Identificador de dispositivo inválido.');
 const {error:e}=await db.from('clyriva_push_subscriptions').delete().eq('admin_id',userId).eq('endpoint',body.endpoint);
 return e?error('Não foi possível desativar as notificações.',500):respond({ok:true});
}
async function handleTest(userId:string,body:any){
 if(!validEndpoint(body?.endpoint))return error('Dispositivo inválido.');
 const {data:sub,error:e}=await db.from('clyriva_push_subscriptions').select('endpoint,p256dh,auth_secret,last_test_at').eq('admin_id',userId).eq('endpoint',body.endpoint).eq('enabled',true).maybeSingle();
 if(e||!sub)return error('Ative as notificações neste dispositivo primeiro.',404);
 if(sub.last_test_at && Date.now()-Date.parse(sub.last_test_at)<30000)return error('Aguarde 30 segundos para testar novamente.',429);
 const {error:u}=await db.from('clyriva_push_subscriptions').update({last_test_at:new Date().toISOString()}).eq('admin_id',userId).eq('endpoint',sub.endpoint);
 if(u)return error('Não foi possível validar o teste.',500);
 const conf=await settings();configure(conf.privateKey);
 const code=await send(sub,{title:'Teste de notificações',body:'Seu Clyriva está pronto para avisar sobre prazos e pendências.',tag:'teste'});
 return code===201?respond({ok:true}):error('O provedor recusou a notificação. Verifique as permissões do celular.',502);
}
const dateBR = () => { const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()); const get=(type:string)=>parts.find(x=>x.type===type)?.value||'';return `${get('year')}-${get('month')}-${get('day')}`; };
function dueSummary(payload:any,today:string){
 const end=new Date(Date.parse(today+'T00:00:00Z')+3*86400000).toISOString().slice(0,10);
 let overdue=0,near=0;
 const rows=[...(Array.isArray(payload?.tasks)?payload.tasks:[]).filter((x:any)=>x?.status!=='done'),
 ...(Array.isArray(payload?.taxes)?payload.taxes:[]).filter((x:any)=>!['paid','done'].includes(x?.status))];
 for(const x of rows){const d=x?.dueDate;if(typeof d!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(d))continue;
   if(d<today)overdue++;else if(d<=end)near++;}
 return {overdue,near};
}
async function handleDispatch(req:Request){
 const token=req.headers.get('x-clyriva-cron')||'';
 const conf=await settings();
 if(!token||token.length!==conf.cronToken.length)return error('Acesso restrito.',403);
 let diff=0;for(let i=0;i<token.length;i++)diff|=token.charCodeAt(i)^conf.cronToken.charCodeAt(i);
 if(diff!==0)return error('Acesso restrito.',403);
 configure(conf.privateKey);
 const today=dateBR();
 const {data:subs,error:sErr}=await db.from('clyriva_push_subscriptions').select('endpoint,p256dh,auth_secret,admin_id,last_sent_on').eq('enabled',true).limit(500);
 if(sErr)throw sErr;
 if(!subs?.length)return respond({ok:true,sent:0});
 const {data:workspaces,error:wErr}=await db.from('clyriva_workspace').select('admin_id,payload').limit(100);
 if(wErr)throw wErr;
 const byAdmin=new Map((workspaces||[]).map((x:any)=>[x.admin_id,x.payload]));
 let sent=0,failed=0;
 for(const sub of subs){
  if(sub.last_sent_on===today)continue;
  const {overdue,near}=dueSummary(byAdmin.get(sub.admin_id),today);
  if(!overdue&&!near)continue;
  const bits=[];if(overdue)bits.push(`${overdue} ${overdue===1?'pendência vencida':'pendências vencidas'}`);
  if(near)bits.push(`${near} ${near===1?'vencimento nos próximos 3 dias':'vencimentos nos próximos 3 dias'}`);
  const status=await send(sub,{title:'Atenção à sua carteira',body:bits.join(' e ')+'. Acesse o painel para conferir.',tag:'vencimentos'});
  if(status===201){sent++;await db.from('clyriva_push_subscriptions').update({last_sent_on:today}).eq('endpoint',sub.endpoint);}else failed++;
 }
 return respond({ok:true,sent,failed});
}
Deno.serve(async req=>{
 try{
  if(!SUPABASE_URL||!SERVICE_ROLE)return error('Serviço temporariamente indisponível.',503);
  const pathname=new URL(req.url).pathname;const action=pathname.split('/').filter(Boolean).at(-1);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...CORS,'Cache-Control':'no-store'}});
  if(req.headers.get('origin')&&req.headers.get('origin')!==APP)return error('Origem não autorizada.',403);
  if(req.method==='GET'&&action==='public-key')return respond({ok:true,publicKey:VAPID_PUBLIC_KEY});
  if(req.method!=='POST')return error('Método não permitido.',405);
  if(Number(req.headers.get('content-length')||0)>7000)return error('Solicitação muito grande.',413);
  if(action==='dispatch')return await handleDispatch(req);
  const userId=await authorizedUser(req);
  if(!userId)return error('Entre com um administrador autorizado.',401);
  const body=await req.json().catch(()=>null);
  if(!body)return error('Dados inválidos.',400);
  if(action==='subscribe')return await handleSubscribe(userId,body);
  if(action==='unsubscribe')return await handleUnsubscribe(userId,body);
  if(action==='test')return await handleTest(userId,body);
  return error('Operação não encontrada.',404);
 }catch(e){console.error('clyriva-push internal error (details hidden)');return error('Serviço de notificações indisponível. Tente novamente.',500);}
});
