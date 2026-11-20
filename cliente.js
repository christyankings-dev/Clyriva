/* Clyriva Clientes: login isolado da gestao, avisos exclusivos e Web Push autorizado. */
(()=>{'use strict';
const $=s=>document.querySelector(s),config=window.CLYRIVA_CONFIG||{};
const base=String(config.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/clyriva-client';
const sb=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{autoRefreshToken:true,persistSession:true,storageKey:'clyriva-client-auth-v2',detectSessionInUrl:false}});
let deferred=null,registration=null,loaded=false,acting=false;
function clearClientScreen(){loaded=false;for(const id of ['#client-notices','#client-billing-overview']){const area=$(id);if(area)area.replaceChildren();}for(const id of ['#c-password','#c-email']){const field=$(id);if(field)field.value='';}const pwd=$('#client-password-form');if(pwd)pwd.reset();const show=$('#client-show-amount');if(show)show.checked=false;view(false);}
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
const status=(sel,msg,err=false)=>{const el=$(sel);if(el){el.textContent=msg;el.classList.toggle('error',!!err);}};
const safeDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?x.slice(8)+'/'+x.slice(5,7)+'/'+x.slice(0,4):null;
function view(authenticated){$('#login-area').classList.toggle('hidden',authenticated);$('#client-area').classList.toggle('hidden',!authenticated);}
async function api(action,data={}){
 const {data:{session},error}=await sb.auth.getSession();if(error||!session?.access_token)throw Error('Entre novamente para continuar.');
 const r=await fetch(base+'/'+action,{method:'POST',headers:{'Content-Type':'application/json','apikey':config.supabaseAnonKey,'Authorization':'Bearer '+session.access_token},body:JSON.stringify(data),cache:'no-store'});
 let result={};try{result=await r.json();}catch{}
 if(!r.ok||!result.ok)throw Error(result.error||'Serviço temporariamente indisponível.');return result;
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

async function refreshPushPreference(){
 if(!supported())return;
 try{
  const worker=await ready(),subscription=await worker.pushManager.getSubscription();
  if(!subscription)return;
  const preference=await api('client-push-status',{endpoint:subscription.endpoint});
  if(preference.enabled){$('#client-show-amount').checked=preference.showAmount===true;status('#push-feedback','Notificações já ativadas neste aparelho.');}
 }catch{/* Falha de consulta das preferencias nao deve bloquear acesso aos avisos. */}
}
async function refresh(){
 const data=await api('client-list');const area=$('#client-notices');area.replaceChildren();
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
 loaded=true;view(true);refreshPushPreference();
}
async function signIn(e){e.preventDefault();if(acting)return;acting=true;const btn=$('#client-login button[type="submit"]');btn.disabled=true;
 try{if(supported()){try{if(registration){const subscription=await registration.pushManager.getSubscription();if(subscription)await subscription.unsubscribe();}}catch{}}
 const {error}=await sb.auth.signInWithPassword({email:$('#c-email').value.trim().toLowerCase(),password:$('#c-password').value});if(error)throw error;await refresh();$('#c-password').value='';status('#login-feedback','');}
 catch(err){clearClientScreen();status('#login-feedback',err.message||'Não foi possível entrar.',true);}
 finally{acting=false;btn.disabled=false;}
}
const supported=()=>window.isSecureContext&&('serviceWorker' in navigator);
async function ready(){if(!supported())throw Error('Este navegador não suporta aplicativos seguros.');if(registration)return registration;return Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Instalação de notificações indisponível neste navegador.')),6500))]);}
function decodeBase64(str){const txt=atob((str+'='.repeat((4-str.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(txt,c=>c.charCodeAt(0));}
async function enable(){const b=$('#client-push-enable');b.disabled=true;
 try{
  if(!('Notification' in window)||!('PushManager' in window))throw Error('Notificações não são compatíveis com este navegador.');
  if(ios&&!standalone())throw Error('No iPhone, adicione o Clyriva Clientes à Tela de Início e abra-o pelo ícone antes de ativar.');
  // No iOS, esta chamada ocorre antes de outras operações assíncronas: gesto explícito.
  let permission=Notification.permission;if(permission==='default')permission=await Notification.requestPermission();
  if(permission!=='granted')throw Error('Autorize notificações nas configurações do seu celular.');
  const worker=await ready();
  const k=await fetch(config.supabaseUrl+'/functions/v1/clyriva-push/public-key').then(async x=>{if(!x.ok)throw Error('Chave de notificações indisponível.');return x.json();});
  let sub=await worker.pushManager.getSubscription();if(!sub)sub=await worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeBase64(k.publicKey)});
  await api('client-subscribe',{subscription:sub.toJSON(),showAmount:$('#client-show-amount').checked});status('#push-feedback','Notificações ativadas para sua conta neste aparelho.');
 }catch(e){status('#push-feedback',e.message||'Falha na ativação.',true);}finally{b.disabled=false;}
}
async function test(){const b=$('#client-push-test');b.disabled=true;try{const worker=await ready(),sub=await worker.pushManager.getSubscription();if(!sub)throw Error('Ative as notificações primeiro.');await api('client-test',{endpoint:sub.endpoint});status('#push-feedback','Teste enviado. Verifique os avisos do celular.');}catch(e){status('#push-feedback',e.message,true);}finally{b.disabled=false;}}
async function disable(){const b=$('#client-push-disable');b.disabled=true;try{const worker=await ready(),sub=await worker.pushManager.getSubscription();if(!sub){status('#push-feedback','Nenhuma notificação ativa.');return;}await api('client-unsubscribe',{endpoint:sub.endpoint});await sub.unsubscribe();status('#push-feedback','Notificações desativadas neste aparelho.');}catch(e){status('#push-feedback',e.message,true);}finally{b.disabled=false;}}
async function logout(){
 // A assinatura local sempre deve ser removida, MESMO quando a API estiver indisponivel.
 // Caso contrario um aparelho compartilhado pode seguir recebendo notificacoes da conta anterior.
 let warning='';
 try{
  const sub=registration?await registration.pushManager.getSubscription():null;
  if(sub){
   try{await api('client-unsubscribe',{endpoint:sub.endpoint});}
   catch{warning='O aviso foi desativado neste celular, mas a confirmação no servidor ficou pendente.';}
   const removed=await sub.unsubscribe();
   if(!removed)warning='Não foi possível cancelar a assinatura no celular; desative notificações nas configurações do navegador.';
  }
 }catch{warning='Não foi possível confirmar a desativação das notificações neste aparelho.';}
 try{await sb.auth.signOut({scope:'local'});}finally{clearClientScreen();status('#login-feedback',warning||'Sessão encerrada.',!!warning);}
}

async function changePassword(e){e.preventDefault();const f=e.currentTarget,first=f.elements.newPassword.value,second=f.elements.confirmPassword.value,button=f.querySelector('button[type=submit]');
 if(first.length<12||first!==second)return status('#client-feedback','Confira a senha de 12 ou mais caracteres e a confirmação.',true);
 button.disabled=true;
 try{const {error}=await sb.auth.updateUser({password:first});if(error)throw error;f.reset();status('#client-feedback','Senha alterada com sucesso.');}
 catch(err){status('#client-feedback',err.message||'Não foi possível alterar a senha.',true);}finally{button.disabled=false;}
}
async function install(){if(standalone()){status('#push-feedback','O aplicativo já está instalado.');return;}
 if(deferred){const prompt=deferred;deferred=null;prompt.prompt();const result=await prompt.userChoice;status('#push-feedback',result.outcome==='accepted'?'Instalação iniciada.':'Instalação cancelada.');return;}
 status('#push-feedback',ios?'No Safari, toque em Compartilhar → Adicionar à Tela de Início. Abra o aplicativo pelo ícone.':'No menu do Chrome, escolha Instalar app ou Adicionar à Tela inicial.');
}
async function init(){
 $('#client-login').addEventListener('submit',signIn);$('#client-refresh').addEventListener('click',()=>refresh().catch(e=>status('#client-feedback',e.message,true)));
 $('#client-show-amount').addEventListener('change',()=>{status('#push-feedback','Para salvar a preferência de privacidade neste celular, toque em Ativar notificações.');});
 $('#client-push-enable').addEventListener('click',enable);$('#client-push-test').addEventListener('click',test);$('#client-push-disable').addEventListener('click',disable);
 $('#client-install').addEventListener('click',install);$('#client-password-form').addEventListener('submit',changePassword);
 $('#client-notice-filter').addEventListener('change',()=>refresh().catch(e=>status('#client-feedback',e.message,true)));
 sb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')clearClientScreen();});
 $('#client-logout').addEventListener('click',logout);
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;});
 if(supported())registration=await navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>null);
 try{const {data:{session}}=await sb.auth.getSession();if(session){try{await refresh();}catch(e){status('#login-feedback',e.message,true);if((e.message||'').includes('Nenhuma empresa'))await sb.auth.signOut({scope:'local'});}}}
 catch(e){status('#login-feedback','Entre com seu e-mail e senha.',true);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
