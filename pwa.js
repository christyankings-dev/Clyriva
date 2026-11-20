/* Clyriva PWA - instalacao voluntaria e Web Push com permissao explicita. */
(()=>{'use strict';
const $=sel=>document.querySelector(sel);
let deferred=null, lastFocus=null;
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
const config=window.CLYRIVA_CONFIG||{};
const base=String(config.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/clyriva-push';
const auth=()=>window.ClyrivaPwaSession?.token?.();
const supported=()=>window.isSecureContext && ('serviceWorker' in navigator);
let registration=null;
if(supported()){navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(r=>registration=r).catch(()=>{});}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;const b=$('#clyriva-pwa-trigger');if(b)b.textContent='⬇ Instalar Clyriva';});
window.addEventListener('appinstalled',()=>{deferred=null;const b=$('#clyriva-pwa-trigger');if(b)b.textContent='◈ Alertas do Clyriva';});
function update(text){const el=$('#clyriva-pwa-status');if(el)el.textContent=text;}
async function api(action,data){const token=await auth();if(!token)throw Error('Entre com seu login de administrador antes de ativar as notificações.');
 if(!config.supabaseUrl || !config.supabaseAnonKey)throw Error('Supabase não está configurado.');
 const res=await fetch(base+'/'+action,{method:'POST',headers:{'Content-Type':'application/json','apikey':config.supabaseAnonKey,'Authorization':'Bearer '+token},body:JSON.stringify(data||{}),cache:'no-store'});
 let out={};try{out=await res.json();}catch{}
 if(!res.ok||!out.ok)throw Error(out.error||'Não foi possível concluir a operação.');return out;
}
function decodeUrlBase64(input){const padding='='.repeat((4-input.length%4)%4),binary=atob((input+padding).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(binary,ch=>ch.charCodeAt(0));}
async function reg(){if(!supported())throw Error('Este navegador não permite instalar aplicativos web. Abra o site pelo navegador do celular com HTTPS.');return registration || navigator.serviceWorker.ready;}
async function install(){if(standalone()){update('O Clyriva já está instalado neste dispositivo.');return;}
 if(deferred){const prompt=deferred;deferred=null;prompt.prompt();const choice=await prompt.userChoice;update(choice.outcome==='accepted'?'Instalação iniciada. Abra o Clyriva pelo ícone criado na tela inicial.':'Você pode instalar mais tarde pelo menu do navegador.');return;}
 if(ios)update('No iPhone: abra este site pelo Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Depois, abra o ícone Clyriva e ative as notificações.');
 else update('Abra o menu do Chrome ou Edge e escolha “Instalar app” ou “Adicionar à tela inicial”. Depois abra o Clyriva pelo novo ícone.');
}
async function enable(){const b=$('#clyriva-pwa-enable');if(b)b.disabled=true;
 try{
   if(!window.ClyrivaPwaSession?.isAdmin?.())throw Error('Primeiro entre com sua conta de administrador.');
   if(!('Notification' in window)||!('PushManager' in window))throw Error('Este navegador não suporta notificações web. Atualize o navegador ou use outro compatível.');
   if(ios&&!standalone())throw Error('No iPhone, primeiro adicione o Clyriva à Tela de Início e abra o aplicativo pelo ícone para autorizar notificações.');
   // Importante no iOS: a permissão precisa ser solicitada na própria interação com o botão.
   let permission=Notification.permission;
   if(permission==='default')permission=await Notification.requestPermission();
   if(permission!=='granted')throw Error('Notificações bloqueadas. Libere o Clyriva nas configurações de notificações do celular.');
   const ready=await reg();
   const key=await fetch(base+'/public-key',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Serviço de notificações indisponível.');return r.json()});
   if(!key.publicKey)throw Error('Chave pública de notificações indisponível.');
   let sub=await ready.pushManager.getSubscription();
   if(!sub)sub=await ready.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeUrlBase64(key.publicKey)});
   await api('subscribe',{subscription:sub.toJSON()});
   update('Notificações ativadas! Seus lembretes serão enviados ao celular, mesmo com o aplicativo fechado, conforme a disponibilidade do sistema e do dispositivo.');
 }catch(e){update(e.message||'Não foi possível ativar notificações.');}finally{if(b)b.disabled=false;}
}
async function test(){const b=$('#clyriva-pwa-test');if(b)b.disabled=true;try{const ready=await reg(),sub=await ready.pushManager.getSubscription();if(!sub)throw Error('Ative as notificações primeiro.');await api('test',{endpoint:sub.endpoint});update('Notificação de teste enviada. Confira os alertas do celular.');}catch(e){update(e.message||'Não foi possível enviar o teste.');}finally{if(b)b.disabled=false;}}
async function disable(){const b=$('#clyriva-pwa-disable');if(b)b.disabled=true;try{const ready=await reg(),sub=await ready.pushManager.getSubscription();if(!sub){update('Notificações já estão desativadas.');return;}await api('unsubscribe',{endpoint:sub.endpoint});await sub.unsubscribe();update('Notificações desativadas neste dispositivo. Você pode ativar novamente quando quiser.');}catch(e){update(e.message||'Não foi possível desativar.');}finally{if(b)b.disabled=false;}}
function close(){const node=$('#clyriva-pwa-overlay');if(node){node.remove();lastFocus?.focus?.();}}
function open(){if($('#clyriva-pwa-overlay'))return;lastFocus=document.activeElement;
 const el=document.createElement('div');el.id='clyriva-pwa-overlay';el.className='clyriva-pwa-overlay';
 el.innerHTML=`<section class="clyriva-pwa-dialog" role="dialog" aria-modal="true" aria-labelledby="pwa-modal-title"><div class="pwa-head"><div class="pwa-mark"><img src="/icons/clyriva-192.png" alt="" width="43" height="43"> Clyriva</div><button type="button" class="pwa-close" id="clyriva-pwa-close" aria-label="Fechar">×</button></div><h2 id="pwa-modal-title">Seu Clyriva no celular</h2><p>Instale o aplicativo web para entrar pelo ícone na tela inicial, usando o mesmo login seguro de administrador.</p><button type="button" class="pwa-btn" id="clyriva-pwa-install">Instalar Clyriva</button><div class="pwa-section"><h3>Alertas no celular</h3><p>Receba lembretes de obrigações e tributos vencidos ou próximos do vencimento. Os avisos não exibem nomes de clientes, valores ou CNPJs na tela bloqueada.</p><button type="button" class="pwa-btn" id="clyriva-pwa-enable">Ativar notificações</button><button type="button" class="pwa-btn secondary" id="clyriva-pwa-test">Enviar notificação de teste</button><button type="button" class="pwa-btn secondary" id="clyriva-pwa-disable">Desativar neste celular</button></div><p class="pwa-status" id="clyriva-pwa-status" role="status" aria-live="polite">As notificações só serão ativadas após sua autorização.</p><p class="pwa-small">Lembretes automáticos: uma verificação diária por volta das 9h, horário de Brasília, para datas registradas no Clyriva. Não substituem o acompanhamento das obrigações fiscais.</p></section>`;
 document.body.appendChild(el);el.querySelector('#clyriva-pwa-install').onclick=install;el.querySelector('#clyriva-pwa-enable').onclick=enable;el.querySelector('#clyriva-pwa-test').onclick=test;el.querySelector('#clyriva-pwa-disable').onclick=disable;el.querySelector('#clyriva-pwa-close').onclick=close;
 el.addEventListener('click',e=>{if(e.target===el)close();});el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});el.querySelector('#clyriva-pwa-close').focus();
 if(standalone())update('Clyriva instalado. Você já pode ativar as notificações.');
 else if(ios)update('No iPhone, instale pela opção “Adicionar à Tela de Início”. Notificações são ativadas dentro do app instalado.');
 else update('Instale o Clyriva no celular e, depois de entrar, ative os alertas.');
}
function init(){if($('#clyriva-pwa-trigger'))return;const b=document.createElement('button');b.id='clyriva-pwa-trigger';b.className='clyriva-pwa-trigger';b.type='button';b.textContent=standalone()?'◈ Alertas do Clyriva':'⬇ Instalar Clyriva';b.addEventListener('click',open);document.body.appendChild(b);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.ClyrivaPwa=Object.freeze({open});
})();
