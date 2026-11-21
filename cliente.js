/* Clyriva Clientes: login isolado da gestao, avisos exclusivos e Web Push autorizado. */
(()=>{'use strict';
const $=s=>document.querySelector(s),config=window.CLYRIVA_CONFIG||{};
const base=String(config.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/clyriva-client';
const sb=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{autoRefreshToken:true,persistSession:true,storageKey:'clyriva-client-auth-v2',detectSessionInUrl:false}});
const CLIENT_SCOPE='/cliente.html';
let deferred=null, registrationPromise=null, loaded=false, acting=false;
let screenVersion=0, deviceVersion=0, pushBusy=false, deviceEnabled=false, lastDevice=null;

function clearClientScreen(){
 screenVersion++;deviceVersion++;loaded=false;lastDevice=null;pushBusy=false;
 for(const id of ['#client-notices','#client-billing-overview'])$(id).replaceChildren();
 for(const id of ['#c-password','#c-email'])$(id).value='';
 $('#client-password-form').reset();$('#client-show-amount').checked=false;
 status('#client-feedback','');status('#push-feedback','');
 renderDevice(false,'Conferindo este aparelho…');view(false);
}
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
const status=(sel,msg,err=false)=>{const el=$(sel);if(el){el.textContent=msg;el.classList.toggle('error',!!err);}};
const safeDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?x.slice(8)+'/'+x.slice(5,7)+'/'+x.slice(0,4):null;
function view(authenticated){$('#login-area').classList.toggle('hidden',authenticated);$('#client-area').classList.toggle('hidden',!authenticated);}
async function api(action,data={}){
 const {data:{session},error}=await sb.auth.getSession();if(error||!session?.access_token)throw Error('Entre novamente para continuar.');
 const r=await fetch(base+'/'+action,{method:'POST',headers:{'Content-Type':'application/json','apikey':config.supabaseAnonKey,'Authorization':'Bearer '+session.access_token},body:JSON.stringify(data),cache:'no-store'});
 let result={};try{result=await r.json();}catch{}
 if(!r.ok||!result.ok){const error=Error(result.error||'Serviço temporariamente indisponível.');error.status=r.status;throw error;}return result;
}
function money(cents){return 'R$ '+(Number(cents)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function daysRemaining(iso){if(!iso)return null;const d=Date.UTC(...iso.split('-').map((v,i)=>i===1?Number(v)-1:Number(v)));const now=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),get=k=>Number(now.find(v=>v.type===k)?.value||0),today=Date.UTC(get('year'),get('month')-1,get('day'));return Math.round((d-today)/86400000);}
async function openDocument(id,download=false){
 const tab=window.open('about:blank','_blank');
 try{const result=await api('client-attachment-link',{attachmentId:id,download});
  if(tab){tab.opener=null;tab.location.replace(result.url);}else window.location.assign(result.url);
 }catch(error){if(tab)tab.close();status('#client-feedback',error.message||'Documento indisponível.',true);}
}
function noticeCard(n,company,attachments=[]){
 const card=document.createElement('article');card.className='notice-card';
 const head=document.createElement('div');head.className='between';
 const title=document.createElement('h3');title.textContent=(n.reminder_enabled?(n.notice_type+' · '):'')+n.title;head.append(title);
 const paid=n.status==='paid',remaining=daysRemaining(n.due_date);
 const tag=document.createElement('span');tag.className='pill';tag.textContent=paid?'Pago':n.due_date?remaining===0?'Vence hoje':remaining===1?'Vence amanhã':remaining>1?'Faltam '+remaining+' dias':'Prazo vencido':'Comunicado';head.append(tag);
 const msg=document.createElement('p');msg.textContent=n.body;
 card.append(head);
 if(n.reminder_enabled&&n.amount_cents!=null){const moneyTag=document.createElement('strong');moneyTag.className='bill-amount';moneyTag.textContent=money(n.amount_cents);card.append(moneyTag);}
 card.append(msg);
 const meta=document.createElement('div');meta.className='meta';meta.textContent=company+(n.due_date?' · Vencimento: '+safeDate(n.due_date):'')+' · Publicado em '+new Date(n.created_at).toLocaleDateString('pt-BR');
 card.append(meta);
 if(attachments.length){const block=document.createElement('div');block.className='document-list';
  const label=document.createElement('strong');label.className='document-title';label.textContent=attachments.length===1?'Guia ou documento anexo':'Documentos anexados';block.append(label);
  for(const a of attachments){const line=document.createElement('div');line.className='document-row';
   const name=document.createElement('span');name.className='document-name';name.textContent='📎 '+a.original_name;line.append(name);
   for(const [title,download] of [['Visualizar',false],['Baixar',true]]){
    const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=title;
    button.addEventListener('click',()=>openDocument(a.id,download));line.append(button);
   }block.append(line);
  }card.append(block);
 }return card;
}

function renderDevice(enabled,message){
 deviceEnabled=enabled;
 $('#device-status').textContent=message;
 $('#client-push-test').disabled=!enabled||pushBusy;
 $('#client-push-disable').disabled=!enabled||pushBusy;
 $('#client-push-enable').disabled=pushBusy;
 $('#client-push-enable').textContent=enabled?'Salvar preferência':'Ativar notificações';
 $('#client-logout').disabled=pushBusy;
}
function lockDevice(busy){
 pushBusy=busy;renderDevice(deviceEnabled,$('#device-status').textContent);
}
function unmetRequirement(){
 if(ios&&!standalone())return 'No iPhone ou iPad, adicione o aplicativo à Tela de Início pelo Safari e abra-o pelo ícone para ativar os alertas.';
 if(ios&&(!('Notification' in window)||!('PushManager' in window)))return 'Para receber notificações no iPhone ou iPad, use iOS/iPadOS 16.4 ou posterior e abra o app pela Tela de Início.';
 if(!supported()||!('Notification' in window)||!('PushManager' in window))return 'Abra este link no Safari do iPhone ou em um navegador compatível no Android para ativar os alertas.';
 if(Notification.permission==='denied')return 'As notificações estão bloqueadas. Libere a permissão nas configurações do aparelho ou do site e volte aqui.';
 return '';
}
async function legacyDevice(){
 const worker=await navigator.serviceWorker.getRegistration?.('/');
 if(!worker||worker.scope!==new URL('/',location.href).href)return null;
 const sub=await worker.pushManager?.getSubscription();
 if(!sub)return null;
 const preference=await api('client-push-status',{endpoint:sub.endpoint});
 return preference.enabled?{sub,preference}:null;
}
async function currentDevice(worker){
 const sub=await worker.pushManager.getSubscription();
 if(sub){
  const preference=await api('client-push-status',{endpoint:sub.endpoint});
  if(preference.enabled)return {sub,preference};
 }
 // Só reutilizar a assinatura compartilhada de versões antigas se o servidor confirmar o vínculo com este cliente.
 return await legacyDevice()||{sub,preference:{enabled:false}};
}
async function refreshPushPreference(){
 const version=++deviceVersion;
 const problem=unmetRequirement();
 if(problem){renderDevice(false,problem);return;}
 try{
  const device=await currentDevice(await ready());
  if(version!==deviceVersion||!loaded)return;
  lastDevice=device.preference.enabled?device.sub:null;
  $('#client-show-amount').checked=device.preference.showAmount===true;
  const enabled=device.preference.enabled&&Notification.permission==='granted';
  renderDevice(enabled,enabled?'Notificações ativas. Você já pode testar este aparelho.':'Ative as notificações para receber e testar avisos neste aparelho.');
 }catch{
  if(version===deviceVersion&&loaded)renderDevice(false,'Não foi possível conferir este aparelho. Tente ativar as notificações novamente.');
 }
}
async function refresh(){
 const version=screenVersion;const data=await api('client-list');if(version!==screenVersion)return;const area=$('#client-notices');area.replaceChildren();
 const byClient=new Map((data.companies||[]).map(c=>[c.admin_id+'|'+c.client_id,c.company]));
 const notices=Array.isArray(data.notices)?data.notices:[];
 const filter=$('#client-notice-filter')?.value||'pending';
 const localItems=notices.filter(n=>filter==='all'||(filter==='paid'?n.status==='paid':n.status!=='paid'));
 const rank=n=>n.status==='paid'?3:n.reminder_enabled&&n.due_date?(daysRemaining(n.due_date)<0?0:daysRemaining(n.due_date)<=3?1:2):2;
 localItems.sort((a,b)=>rank(a)-rank(b)||String(a.due_date||'9999').localeCompare(String(b.due_date||'9999'))||String(b.created_at||'').localeCompare(String(a.created_at||'')));
 const pending=notices.filter(n=>n.reminder_enabled&&n.status==='active');
 const overdue=pending.filter(n=>daysRemaining(n.due_date)<0);
 const next3=pending.filter(n=>{const days=daysRemaining(n.due_date);return days>=0&&days<=3;});
 const overview=$('#client-billing-overview');if(overview){overview.replaceChildren();for(const [label,number] of [['Em aberto',pending.length],['Próximos 3 dias',next3.length],['Vencidos',overdue.length],['Pagos',notices.filter(n=>n.status==='paid').length]]){const item=document.createElement('div');item.className='summary-item';const num=document.createElement('strong');num.textContent=String(number);const txt=document.createElement('span');txt.textContent=label;item.append(num,txt);overview.append(item);}}
 if(!localItems.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Nenhum aviso publicado para sua empresa até o momento.';area.append(empty);}
 else for(const notice of localItems)area.append(noticeCard(notice,byClient.get(notice.admin_id+'|'+notice.client_id)||'Sua empresa',(data.attachments||[]).filter(a=>a.notice_id===notice.id)));
 status('#client-feedback',`${(data.companies||[]).length} empresa(s) autorizada(s) · ${notices.length} aviso(s).`);
 const entering=!loaded;loaded=true;view(true);if(entering)refreshPushPreference();
}
async function signIn(e){
 e.preventDefault();if(acting)return;acting=true;
 const btn=$('#client-login button[type="submit"]'),email=$('#c-email').value.trim().toLowerCase();
 btn.disabled=true;status('#login-feedback','Entrando…');
 try{
  const {error}=await sb.auth.signInWithPassword({email,password:$('#c-password').value});
  if(error)throw error;
  await refresh();$('#c-password').value='';status('#login-feedback','');
 }catch(err){
  if(err.status===403)await sb.auth.signOut({scope:'local'}).catch(()=>{});
  clearClientScreen();$('#c-email').value=email;
  const invalid=err.code==='invalid_credentials'||/invalid login credentials/i.test(err.message||'');
  status('#login-feedback',invalid?'Confira o e-mail autorizado e a senha enviada pelo escritório.':err.message||'Não foi possível entrar.',true);
 }finally{acting=false;btn.disabled=false;}
}
const supported=()=>window.isSecureContext&&('serviceWorker' in navigator);
function ready(){
 if(!supported())return Promise.reject(Error('Este navegador não suporta notificações.'));
 if(!registrationPromise){
  registrationPromise=navigator.serviceWorker.register('/sw.js',{scope:CLIENT_SCOPE}).then(registration=>{
   if(registration.active?.state==='activated')return registration;
   const worker=registration.installing||registration.waiting||registration.active;
   if(!worker)throw Error('Não foi possível preparar as notificações. Tente novamente.');
   return new Promise((resolve,reject)=>{
    function finish(ok){clearTimeout(timer);worker.removeEventListener('statechange',changed);if(ok)resolve(registration);else reject(Error('Não foi possível preparar as notificações. Tente novamente.'));}
    function changed(){if(worker.state==='activated')finish(true);else if(worker.state==='redundant')finish(false);}
    const timer=setTimeout(()=>finish(false),10000);
    worker.addEventListener('statechange',changed);changed();
   });
  }).catch(error=>{registrationPromise=null;throw error;});
 }
 return registrationPromise;
}
function decodeBase64(str){const txt=atob((str+'='.repeat((4-str.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(txt,c=>c.charCodeAt(0));}
async function enable(){
 if(pushBusy)return;
 const version=screenVersion;deviceVersion++;lockDevice(true);status('#push-feedback','');
 try{
  const problem=unmetRequirement();if(problem)throw Error(problem);
  // O iOS exige que o pedido de permissão comece no gesto do usuário.
  let permission=Notification.permission;if(permission==='default')permission=await Notification.requestPermission();
  if(permission!=='granted')throw Error('Permissão não concedida. Confira as configurações de notificações deste aparelho.');
  const worker=await ready(),device=await currentDevice(worker);
  let sub=device.sub;
  const subscribe=async()=>{
   const response=await fetch(config.supabaseUrl+'/functions/v1/clyriva-push/public-key',{cache:'no-store'});
   if(!response.ok)throw Error('O serviço de notificações está indisponível. Tente novamente.');
   const {publicKey}=await response.json();
   return worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeBase64(publicKey)});
  };
  if(!sub)sub=await subscribe();
  const showAmount=$('#client-show-amount').checked;
  const save=sub=>api('client-subscribe',{subscription:sub.toJSON(),showAmount});
  if(version!==screenVersion)return;
  try{await save(sub);}catch(error){
   if(error.status!==409||device.preference.enabled)throw error;
   // Uma assinatura exclusiva de cliente pode ter sobrado de outra sessão neste navegador.
   if(!await sub.unsubscribe())throw error;
   sub=await subscribe();if(version!==screenVersion)return;await save(sub);
  }
  if(version===screenVersion){
   lastDevice=sub;renderDevice(true,'Notificações ativas. Você já pode testar este aparelho.');
   status('#push-feedback',device.preference.enabled?'Preferência salva.':'Toque em “Enviar notificação de teste”.');
  }
 }catch(e){if(version===screenVersion)status('#push-feedback',e.message||'Falha na ativação.',true);}
 finally{if(version===screenVersion)lockDevice(false);}
}
async function test(){
 if(pushBusy)return;const version=screenVersion;lockDevice(true);status('#push-feedback','Enviando teste…');
 try{
  const problem=unmetRequirement();
  if(problem||Notification.permission!=='granted'){renderDevice(false,problem||'Autorize as notificações para fazer o teste.');throw Error($('#device-status').textContent);}
  const {sub,preference}=await currentDevice(await ready());
  if(!sub||!preference.enabled){renderDevice(false,'Ative as notificações para testar este aparelho.');throw Error('Este aparelho ainda não está inscrito.');}
  await api('client-test',{endpoint:sub.endpoint});
  if(version===screenVersion)status('#push-feedback','O serviço aceitou o teste. Procure “Clyriva · Notificação de teste” na central de notificações deste aparelho.');
 }catch(e){if(version===screenVersion){status('#push-feedback',e.message||'Falha ao enviar o teste.',true);if(e.status===404||e.status===502)refreshPushPreference();}}
 finally{if(version===screenVersion)lockDevice(false);}
}
async function disconnectDevice(){
 // A inscrição da gestão pode ocupar o escopo raiz. Só remover ali a inscrição confirmada para o cliente.
 const active=await ready(),dedicated=await active.pushManager.getSubscription();
 let legacy=null,warning='';
 try{legacy=(await legacyDevice())?.sub;}catch{legacy=lastDevice;warning='Não foi possível conferir uma inscrição antiga. Verifique as permissões do aparelho.';}
 const all=new Map([dedicated,legacy].filter(Boolean).map(sub=>[sub.endpoint,sub]));
 for(const sub of all.values()){
  try{await api('client-unsubscribe',{endpoint:sub.endpoint});}catch{warning='Não foi possível confirmar a remoção no servidor.';}
  try{if(!await sub.unsubscribe())warning='Confira se as notificações foram desativadas nas configurações do aparelho.';}catch{warning='Confira as permissões de notificação nas configurações do aparelho.';}
 }
 return warning;
}
async function disable(){
 if(pushBusy)return;const version=screenVersion;deviceVersion++;lockDevice(true);
 try{
  const warning=await disconnectDevice();if(version!==screenVersion)return;
  lastDevice=null;renderDevice(false,'Notificações desativadas neste aparelho.');
  status('#push-feedback',warning||'Você pode ativá-las novamente quando quiser.',!!warning);
  if(warning)refreshPushPreference();
 }catch(e){if(version===screenVersion)status('#push-feedback',e.message,true);}
 finally{if(version===screenVersion)lockDevice(false);}
}
async function logout(){
 if(pushBusy)return;lockDevice(true);deviceVersion++;
 let warning='';
 if(supported()){try{warning=await disconnectDevice();}catch{warning='Não foi possível conferir as notificações. Verifique a permissão nas configurações do aparelho.';}}
 try{await sb.auth.signOut({scope:'local'});}finally{clearClientScreen();status('#login-feedback',warning||'Sessão encerrada.',!!warning);}
}

async function changePassword(e){e.preventDefault();const f=e.currentTarget,first=f.elements.newPassword.value,second=f.elements.confirmPassword.value,button=f.querySelector('button[type=submit]');
 if(first.length<12||first!==second)return status('#client-feedback','Confira a senha de 12 ou mais caracteres e a confirmação.',true);
 button.disabled=true;
 try{const {error}=await sb.auth.updateUser({password:first});if(error)throw error;f.reset();status('#client-feedback','Senha alterada com sucesso.');}
 catch(err){status('#client-feedback',err.message||'Não foi possível alterar a senha.',true);}finally{button.disabled=false;}
}
function installFeedback(message){for(const el of document.querySelectorAll('[data-install-feedback]'))el.textContent=message;}
function updateInstall(){for(const el of document.querySelectorAll('[data-install-area]'))el.classList.toggle('hidden',standalone());}
async function install(){
 if(standalone()){updateInstall();return;}
 const prompt=deferred;
 if(prompt){
  deferred=null;
  try{await prompt.prompt();const result=await prompt.userChoice;
   installFeedback(result.outcome==='accepted'?'Instalação solicitada. Abra o ícone Clyriva Clientes na tela inicial.':'Você pode instalar depois pelo menu do navegador.');return;
  }catch{/* O menu do navegador também permite instalar. */}
 }
 installFeedback(ios?'No Safari, toque em Compartilhar → Adicionar à Tela de Início. Depois, abra o ícone Clyriva Clientes.':'No Chrome, abra o menu ⋮ → Instalar app ou Adicionar à tela inicial. Depois, abra o ícone Clyriva Clientes.');
}
async function init(){
 $('#client-login').addEventListener('submit',signIn);$('#client-refresh').addEventListener('click',()=>refresh().catch(e=>status('#client-feedback',e.message,true)));
 $('#client-show-amount').addEventListener('change',()=>status('#push-feedback',deviceEnabled?'Toque em “Salvar preferência” para aplicar a alteração.':'A preferência será salva quando você ativar as notificações.'));
 $('#client-push-enable').addEventListener('click',enable);$('#client-push-test').addEventListener('click',test);$('#client-push-disable').addEventListener('click',disable);
 for(const button of document.querySelectorAll('[data-client-install]'))button.addEventListener('click',install);
 updateInstall();window.addEventListener('appinstalled',()=>{deferred=null;installFeedback('Abra o ícone Clyriva Clientes na tela inicial.');updateInstall();});
 $('#client-password-form').addEventListener('submit',changePassword);
 $('#client-notice-filter').addEventListener('change',()=>refresh().catch(e=>status('#client-feedback',e.message,true)));
 sb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')clearClientScreen();});
 $('#client-logout').addEventListener('click',logout);
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;});
 if(supported())ready().catch(()=>{});
 try{const {data:{session}}=await sb.auth.getSession();if(session){try{await refresh();}catch(e){status('#login-feedback',e.message,true);if((e.message||'').includes('Nenhuma empresa'))await sb.auth.signOut({scope:'local'});}}}
 catch(e){status('#login-feedback','Entre com seu e-mail e senha.',true);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
