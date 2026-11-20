/* Clyriva Clientes: login isolado da gestao, avisos exclusivos e Web Push autorizado. */
(()=>{'use strict';
const $=s=>document.querySelector(s),config=window.CLYRIVA_CONFIG||{};
const base=String(config.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/clyriva-client';
const sb=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{autoRefreshToken:true,persistSession:true,storageKey:'clyriva-client-auth-v2',detectSessionInUrl:false}});
let deferred=null,registration=null,loaded=false,acting=false;
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
function noticeCard(n,company){
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
 card.append(meta);return card;
}

async function refresh(){
 const data=await api('client-list');const area=$('#client-notices');area.replaceChildren();
 const byClient=new Map((data.companies||[]).map(c=>[c.admin_id+'|'+c.client_id,c.company]));
 const notices=Array.isArray(data.notices)?data.notices:[];
 if(!notices.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Nenhum aviso publicado para sua empresa até o momento.';area.append(empty);}
 else for(const notice of notices)area.append(noticeCard(notice,byClient.get(notice.admin_id+'|'+notice.client_id)||'Sua empresa'));
 status('#client-feedback',`${(data.companies||[]).length} empresa(s) autorizada(s) · ${notices.length} aviso(s).`);
 loaded=true;view(true);
}
async function signIn(e){e.preventDefault();if(acting)return;acting=true;const btn=$('#client-login button[type="submit"]');btn.disabled=true;
 try{const {error}=await sb.auth.signInWithPassword({email:$('#c-email').value.trim().toLowerCase(),password:$('#c-password').value});if(error)throw error;await refresh();$('#c-password').value='';status('#login-feedback','');}
 catch(err){view(false);status('#login-feedback',err.message||'Não foi possível entrar.',true);}
 finally{acting=false;btn.disabled=false;}
}
const supported=()=>window.isSecureContext&&('serviceWorker' in navigator);
async function ready(){if(!supported())throw Error('Este navegador não suporta aplicativos seguros.');return registration||navigator.serviceWorker.ready;}
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
 // Antes de encerrar a sessão, desassociar a assinatura para evitar alertas a quem usar este celular depois.
 try{const worker=await ready(),sub=await worker.pushManager.getSubscription();if(sub){await api('client-unsubscribe',{endpoint:sub.endpoint});await sub.unsubscribe();}}catch(e){status('#client-feedback','Aviso: não foi possível desativar as notificações neste aparelho. Desative-as nas configurações do navegador.',true);}
 await sb.auth.signOut({scope:'local'});loaded=false;view(false);status('#login-feedback','Sessão encerrada.');
}
async function changePassword(){const p=window.prompt('Digite a nova senha (mínimo de 12 caracteres):');if(p===null)return;if(p.length<12)return status('#client-feedback','A senha precisa ter pelo menos 12 caracteres.',true);
 const again=window.prompt('Repita a nova senha:');if(p!==again)return status('#client-feedback','As senhas não coincidem.',true);
 const {error}=await sb.auth.updateUser({password:p});status('#client-feedback',error?error.message:'Senha alterada com sucesso.',!!error);
}
async function install(){if(standalone()){status('#push-feedback','O aplicativo já está instalado.');return;}
 if(deferred){const prompt=deferred;deferred=null;prompt.prompt();const result=await prompt.userChoice;status('#push-feedback',result.outcome==='accepted'?'Instalação iniciada.':'Instalação cancelada.');return;}
 status('#push-feedback',ios?'No Safari, toque em Compartilhar → Adicionar à Tela de Início. Abra o aplicativo pelo ícone.':'No menu do Chrome, escolha Instalar app ou Adicionar à Tela inicial.');
}
async function init(){
 $('#client-login').addEventListener('submit',signIn);$('#client-refresh').addEventListener('click',()=>refresh().catch(e=>status('#client-feedback',e.message,true)));
 $('#client-push-enable').addEventListener('click',enable);$('#client-push-test').addEventListener('click',test);$('#client-push-disable').addEventListener('click',disable);
 $('#client-install').addEventListener('click',install);$('#client-change-password').addEventListener('click',()=>changePassword().catch(e=>status('#client-feedback',e.message,true)));
 $('#client-logout').addEventListener('click',logout);
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;});
 if(supported())registration=await navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>null);
 try{const {data:{session}}=await sb.auth.getSession();if(session){try{await refresh();}catch(e){status('#login-feedback',e.message,true);if((e.message||'').includes('Nenhuma empresa'))await sb.auth.signOut({scope:'local'});}}}
 catch(e){status('#login-feedback','Entre com seu e-mail e senha.',true);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
