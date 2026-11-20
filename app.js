/* Portal Clyriva. O painel administrativo mantém a carteira em memória durante a sessão. */
(()=>{'use strict';
const $=s=>document.querySelector(s), root=$('#root'), loginMarkup=root.innerHTML;
const core=window.ClyrivaCore, config=window.CLYRIVA_CONFIG||{};
const configured=Boolean(config.supabaseUrl || config.supabaseAnonKey);
let sb=null, configError='';
if(configured) {
  try {
    const url=new URL(config.supabaseUrl), key=String(config.supabaseAnonKey||'').trim();
    const loopback=u=>['localhost','127.0.0.1','[::1]'].includes(u.hostname);
    const safe=u=>u.protocol==='https:' || (u.protocol==='http:'&&loopback(u));
    if(!safe(url)||url.username||url.password||!safe(location)) throw Error('Use HTTPS no portal e no projeto. Para testes locais, use localhost.');
    let isPublic=key.startsWith('sb_publishable_');
    if(!isPublic && key.split('.').length===3) {
      try {isPublic=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';} catch {}
    }
    if(!isPublic)throw Error('Informe somente a chave pública publishable ou anon do projeto em config.js.');
    sb=window.supabase.createClient(url.origin,key,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
  }catch(e){configError=e.message;}
}
const blank=core.empty, {brl,sum,dateLabel:dbr,monthLabel:mon}=core;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ym=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');};
const errMsg=e=>e?.message||'Não foi possível concluir esta operação.';
let epoch=0, routeGeneration=0;
let awaitingRecovery=new URLSearchParams(location.hash.slice(1)).get('type')==='recovery'||new URLSearchParams(location.search).has('recuperar');
let recovering=false;
const redirectURL=()=>new URL(location.pathname,location.href).href;
const rotina=window.ClyrivaRotina;
let agendaView=rotina.agendaView();
const state={mode:'login',user:null,adminPayload:blank(),vault:null,revision:0,clientViews:[],access:[],month:ym(),selectedClient:null,adminTab:'panel',frame:null,saving:false,authBusy:false};
function discard(){
  rotina.closeSummary();agendaView=rotina.agendaView();
  epoch++;routeGeneration++;
  Object.assign(state,{mode:'login',user:null,adminPayload:blank(),vault:null,revision:0,clientViews:[],access:[],month:ym(),selectedClient:null,adminTab:'panel',frame:null,saving:false});
}
function assertCurrent(token){
  if(token!==epoch)throw Error('A sessão mudou. Entre novamente para continuar.');
}
async function readAll(table,columns,order,admin){
  const token=epoch,rows=[],pageSize=250;
  for(let start=0;;){
    let q=sb.from(table).select(columns);
    if(admin)q=q.eq('admin_id',admin);
    for(const col of order)q=q.order(col);
    const res=await q.range(start,start+pageSize-1);
    assertCurrent(token);if(res.error)throw res.error;
    if(!res.data.length)return rows;rows.push(...res.data);start+=res.data.length;
  }
}
function statusMessage(text,type=''){const el=$('#auth-feedback');if(el)el.innerHTML=`<div class="notice ${type}">${esc(text)}</div>`;}
function changePassword(){
 if(!sb||$('#password-dialog'))return;
 const wrap=document.createElement('div');wrap.id='password-dialog';wrap.style.cssText='position:fixed;z-index:999999;inset:0;background:rgba(7,26,38,.75);display:flex;align-items:center;justify-content:center;padding:20px';
 wrap.innerHTML='<section style="width:100%;max-width:390px;padding:24px;border-radius:16px;background:white;color:#183b42;box-sizing:border-box"><h2>Alterar minha senha</h2><p>Informe uma nova senha de 12 caracteres ou mais.</p><form id="password-change-form"><label>Nova senha <input name="newpass" type="password" minlength="12" autocomplete="new-password" required style="box-sizing:border-box;width:100%;padding:11px;margin:7px 0 14px"></label><label>Repita a senha <input name="repeatpass" type="password" minlength="12" autocomplete="new-password" required style="box-sizing:border-box;width:100%;padding:11px;margin:7px 0 14px"></label><div id="password-change-feedback" role="status"></div><button type="submit" class="button">Salvar nova senha</button><button type="button" class="button secondary" id="password-change-close">Cancelar</button></form></section>';
 document.body.appendChild(wrap);
 wrap.querySelector('#password-change-close').onclick=()=>wrap.remove();
 wrap.querySelector('form').onsubmit=async ev=>{ev.preventDefault();const f=ev.currentTarget,pass=f.elements.newpass.value,other=f.elements.repeatpass.value,fb=wrap.querySelector('#password-change-feedback');
  if(pass!==other){fb.textContent='As senhas não são iguais.';return;}
  const b=f.querySelector('[type=submit]');b.disabled=true;
  try{const {error}=await sb.auth.updateUser({password:pass});if(error)throw error;fb.textContent='Senha alterada com sucesso.';f.reset();setTimeout(()=>wrap.remove(),1100);}
  catch(e){fb.textContent='Erro: '+errMsg(e)}finally{b.disabled=false;}
 };
}
function authPage(){state.mode='login';root.innerHTML=loginMarkup;wireLogin();}
function wireLogin(){
 /* Somente login privado. Cadastro e modo demonstração removidos da produção. */
 $('#auth-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!sb)return statusMessage(configError||'Para ativar logins reais, configure config.js e o banco de dados.', 'warn');
  const email=$('#login-email').value.trim().toLowerCase(),password=$('#login-pass').value;
  if(state.authBusy)return;if(awaitingRecovery){awaitingRecovery=false;history.replaceState({},'',redirectURL());}state.authBusy=true;const btn=$('#auth-form button[type="submit"]');btn.disabled=true;btn.textContent='Validando acesso…';
  try{const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;await routeUser();}
  catch(err){statusMessage('Falha no login: '+errMsg(err),'err')}finally{state.authBusy=false;if(btn.isConnected){btn.disabled=false;btn.textContent='Entrar na minha conta →'}}
 });

 $('#btn-forgot').onclick=async()=>{if(!sb)return statusMessage('Configure o Supabase para recuperar senhas reais.','warn');const email=$('#login-email').value.trim().toLowerCase();if(!email)return statusMessage('Informe seu e-mail no campo acima para receber o link.','warn');try{const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:redirectURL()+'?recuperar=1'});statusMessage(error?'Não foi possível enviar: '+error.message:'Caso o e-mail esteja cadastrado, você receberá um link para redefinir a senha.',error?'err':'')}catch(e){statusMessage(errMsg(e),'err')}};

 if(!configured)statusMessage('Modo demonstração disponível. Para autenticação real é necessário configurar o projeto Supabase.','warn');
 else if(!sb)statusMessage(configError||'Não foi possível carregar a biblioteca de autenticação.','err');
}
function resetPasswordPage(){const cont=$('.login-card');if(!cont)return;cont.innerHTML=`<span class="eyebrow">Segurança</span><h2>Definir nova senha</h2><p style="margin:10px 0 22px">Você acessou um link de recuperação. Defina uma senha nova.</p><form id="reset-form"><label class="form-label">Nova senha<input class="field" name="password" type="password" minlength="12" autocomplete="new-password" required></label><button class="button">Salvar nova senha</button></form><div id="auth-feedback"></div>`;$('#reset-form').onsubmit=async e=>{
 e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;
 try{const result=await sb.auth.updateUser({password:e.target.elements.password.value});if(result.error)throw result.error;
 recovering=false;history.replaceState({},'',redirectURL());await routeUser();}
 catch(err){statusMessage(errMsg(err),'err');}finally{b.disabled=false;}
};}
// A PWA consulta apenas a sessao administrativa valida, sem compartilhar senhas.
Object.defineProperty(window,'ClyrivaPwaSession',{value:Object.freeze({
 isAdmin(){return Boolean(sb&&state.mode==='admin'&&state.user);},
 async token(){if(!sb||state.mode!=='admin'||!state.user)return null;const {data,error}=await sb.auth.getSession();return error?null:data.session?.access_token||null;}
})});
function brandSidebar(){return `<div><div class="brand"><span class="brand-logo">C</span><span>Cly<em>riva</em></span></div><div class="brand-sub">Portal contábil</div></div>`}
function adminShell(){return `<div class="admin-app"><header class="header admin-top"><div class="row" style="gap:10px"><span class="brand-logo" style="height:32px;width:32px;font-size:21px">C</span><div><strong>Clyriva · Gestão privada</strong><small>${esc(state.user?.email||'Administrador')}</small></div></div><nav class="actions"><button class="button sm" id="adm-panel">▦ Painel completo</button><button class="button secondary sm" id="history-btn">Histórico</button><button class="button secondary sm" id="pwa-install-admin" type="button">Instalar app / Alertas</button></nav><div class="hdr-right"><span id="sync-state" class="pill">Conectado</span><button class="button secondary sm" id="change-password">Alterar senha</button><button class="button secondary sm" id="signout">Sair</button></div></header><div id="admin-body"></div></div>`;}
function renderAdmin(){
 root.innerHTML=adminShell();
 $('#adm-panel').onclick=()=>{if(!state.saving){state.adminTab='panel';renderAdmin();}};
 $('#history-btn').onclick=showHistory;
 $('#pwa-install-admin').onclick=()=>window.ClyrivaPwa?.open();
 $('#signout').onclick=signout;
 $('#change-password').onclick=changePassword;
 state.frame=null;state.adminTab='panel';
 const host=$('#admin-body');
 host.innerHTML='<div class="admin-info">Carteira privada. Seus registros são sincronizados com o banco de dados.</div>';
 const frame=document.createElement('iframe');frame.id='admin-iframe';frame.className='admin-view';frame.title='Painel administrativo Clyriva';state.frame=frame;frame.src='admin.html';host.append(frame);
}
function activePanel(child){
  return ['admin','demo-admin'].includes(state.mode) && state.adminTab==='panel' && state.frame?.contentWindow===child;
}
function syncLabel(text,bad=false){
  const el=$('#sync-state');if(el){el.textContent=text;el.className='pill '+(bad?'rose':'');}
  for(const id of ['adm-panel','history-btn','signout']){const b=$('#'+id);if(b)b.disabled=state.saving;}
}
Object.defineProperty(window,'ClyrivaPanelHost',{value:Object.freeze({
  async token(child){
    if(!activePanel(child)||!sb)return null;
    const {data,error}=await sb.auth.getSession();
    if(error||!data?.session?.access_token)return null;
    return data.session.access_token;
  },
  open(child){
    if(!activePanel(child))return null;
    return structuredClone({data:state.adminPayload,vault:state.vault,demo:false});
  },
  async commit(child,payload,vault){
    if(!activePanel(child)||state.saving)throw Error('Painel indisponível ou outra operação em andamento.');
    const data=core.workspace(structuredClone(payload)),blob=core.vault(structuredClone(vault)),token=epoch;
    const demo=false;
    state.saving=true;syncLabel('Salvando…');let saved=false;
    try{
      if(!demo){
        const res=await sb.rpc('clyriva_commit',{p_expected:state.revision,p_workspace:data,p_vault:blob});
        assertCurrent(token);if(res.error)throw Error(res.error.message);
        if(!Number.isSafeInteger(res.data)||res.data<=state.revision)throw Error('O banco não confirmou a revisão. Recarregue para conferir.');
        state.revision=res.data;
      }
      state.adminPayload=data;state.vault=blob;saved=true;

    }finally{
      if(token===epoch){state.saving=false;syncLabel(saved?(demo?'DEMONSTRAÇÃO':'Sincronizado'):'Falha na gravação',!saved);}
    }
  }
})});
async function loadAdmin(user,token,generation){
  const res=await sb.rpc('clyriva_load');
  assertCurrent(token);if(generation!==routeGeneration)return;
  if(res.error)throw res.error;
  if(!res.data || !Number.isSafeInteger(res.data.revision))throw Error('Verifique o schema.sql e a confirmação do e-mail administrativo.');
  state.adminPayload=core.workspace(res.data.data??blank());state.vault=core.vault(res.data.vault);
  state.revision=res.data.revision;state.access=[];state.mode='admin';state.adminTab='panel';renderAdmin();
}
async function showHistory(){
 if(state.mode!=='admin'||state.saving||!sb||$('#history-dialog'))return;
 const wrap=document.createElement('div');wrap.id='history-dialog';wrap.style.cssText='position:fixed;z-index:10000;inset:0;background:rgba(7,26,38,.7);display:grid;place-items:center;padding:16px';
 wrap.setAttribute('role','presentation');
 wrap.innerHTML='<section role="dialog" aria-modal="true" aria-label="Histórico da carteira" style="background:#fff;color:#193744;width:min(100%,650px);max-height:85vh;overflow:auto;border-radius:16px;padding:28px;box-shadow:0 16px 45px #0003"><h2>Histórico de alterações</h2><p>As versões anteriores podem ser restauradas. A restauração gera uma nova revisão, sem apagar o histórico.</p><div id="history-content" role="status">Carregando versões…</div><button class="button secondary" type="button" id="history-close" style="margin-top:20px">Fechar</button></section>';
 document.body.append(wrap);const previous=document.activeElement;
 const close=()=>{wrap.remove();previous?.focus?.();};wrap.querySelector('#history-close').onclick=close;
 const escapeKey=e=>{if(e.key==='Escape'){e.preventDefault();close();}};wrap.addEventListener('keydown',escapeKey);
 wrap.querySelector('#history-close').focus();
 try{
  const res=await sb.from('clyriva_workspace_history').select('revision,saved_at,saved_by').eq('admin_id',state.user.id).order('revision',{ascending:false}).limit(25);
  if(res.error)throw res.error;
  const el=wrap.querySelector('#history-content');if(!el)return;
  if(!res.data?.length){el.textContent='Nenhuma versão anterior. As próximas alterações serão registradas automaticamente.';return;}
  el.innerHTML='<div style="display:grid;gap:9px;margin-top:18px">'+res.data.map(row=>'<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e3eaec;border-radius:9px;padding:12px"><span>Revisão '+esc(row.revision)+' · '+esc(new Date(row.saved_at).toLocaleString('pt-BR'))+'</span><button type="button" class="button secondary sm" data-revision="'+esc(row.revision)+'">Restaurar</button></div>').join('')+'</div>';
  el.querySelectorAll('[data-revision]').forEach(button=>button.onclick=async()=>{
   if(!confirm('Restaurar a revisão '+button.dataset.revision+'? Os dados atuais serão guardados no histórico antes da restauração.'))return;
   button.disabled=true;
   const out=await sb.rpc('clyriva_restore_revision',{p_target:Number(button.dataset.revision),p_expected:state.revision});
   if(out.error){alert('Restauração não concluída: '+errMsg(out.error));button.disabled=false;return;}
   close();await loadAdmin(state.user,epoch,routeGeneration);alert('Revisão restaurada. Confira os registros.');
  });
 }catch(e){const el=wrap.querySelector('#history-content');if(el)el.textContent='Histórico indisponível. '+errMsg(e);}
}
function accessFailure(e){
 root.innerHTML='<div class="login-main" style="min-height:100vh"><div class="login-card"><h2>Não foi possível carregar seu acesso</h2><div class="notice err mt20">'+esc(errMsg(e))+'</div><button id="retry" class="button mt20">Tentar novamente</button> <button id="signout" class="button secondary mt20">Sair</button></div></div>';
 $('#retry').onclick=routeUser;$('#signout').onclick=signout;
}
async function routeUser(){
 if(!sb || recovering)return;
 const generation=++routeGeneration, token=epoch;
 try{
  const {data:{user},error}=await sb.auth.getUser();
  if(generation!==routeGeneration||token!==epoch||recovering)return;
  if(error)throw error;
  if(!user){discard();authPage();return;}
  if(!user.email_confirmed_at)throw Error('Confirme seu e-mail antes de acessar o portal.');
  state.user=user;
  const a=await sb.from('clyriva_admins').select('user_id').eq('user_id',user.id).maybeSingle();
  if(generation!==routeGeneration||token!==epoch)return;
  if(a.error)throw a.error;
  if(a.data){await loadAdmin(user,token,generation);return;}
  throw Error('Acesso restrito à gestão do Clyriva. Solicite autorização ao administrador principal.');
 }catch(e){if(generation===routeGeneration && token===epoch){state.mode='error';state.frame=null;accessFailure(e);}}
}
window.addEventListener('pageshow',e=>{
 if(e.persisted && sb){discard();authPage();sb.auth.getSession().then(({data})=>{if(data.session&&!recovering)routeUser();});}
});
window.addEventListener('beforeunload',e=>{if(state.saving){e.preventDefault();e.returnValue='';}});
async function signout(){
 if(state.saving)return;
 discard();awaitingRecovery=false;recovering=false;authPage();
 if(sb){
  try{const {error}=await sb.auth.signOut({scope:'global'});if(error)throw error;}
  catch(e){accessFailure(Error('Falha ao encerrar a sessão no provedor. Tente sair novamente. '+errMsg(e)));$('#retry').onclick=signout;}
 }
}
function recoveryScreen(){
 discard();awaitingRecovery=false;recovering=true;authPage();resetPasswordPage();
}
function init(){
 wireLogin();
 if(!sb)return;
 sb.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT'){discard();awaitingRecovery=false;recovering=false;authPage();return;}
  if(event==='PASSWORD_RECOVERY'){recoveryScreen();return;}
  if(recovering)return;
  if(awaitingRecovery){
    if(event==='INITIAL_SESSION')statusMessage('Para definir uma nova senha, abra um link de recuperação válido enviado ao seu e-mail.','warn');
    return;
  }
  if(!session)return;
  if(event==='INITIAL_SESSION'||event==='SIGNED_IN'||event==='TOKEN_REFRESHED'){
    if(state.user && state.user.id!==session.user.id){discard();authPage();}
    if(!state.authBusy && state.mode==='login')setTimeout(()=>{if(!recovering&&state.mode==='login')routeUser();},0);
  }
 });
}
init();
})();
