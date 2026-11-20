/* Clyriva - Publicacao exclusivamente administrativa de avisos para empresas autorizadas. */
(()=>{'use strict';
const $=s=>document.querySelector(s),cfg=window.CLYRIVA_CONFIG||{};
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{autoRefreshToken:true,persistSession:true}});
const base=cfg.supabaseUrl+'/functions/v1/clyriva-client';
let state={companies:[],grants:[],notices:[]},busy=false;
const status=(sel,msg,err=false)=>{const el=$(sel);if(el){el.textContent=msg;el.classList.toggle('error',err);}};
function el(tag,text,className){const node=document.createElement(tag);if(text!=null)node.textContent=String(text);if(className)node.className=className;return node;}
function fmtDate(v){return v?String(v).slice(8,10)+'/'+String(v).slice(5,7)+'/'+String(v).slice(0,4):'Sem prazo';}
function fmtMoney(cents){return 'R$ '+(Number(cents)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function moneyForInput(cents){return (Number(cents)/100).toFixed(2);}
function resetChargeForm(){const f=$('#charge-form');f.reset();delete f.dataset.editId;f.elements.clientId.disabled=false;$('#charge-heading').textContent='Cadastrar cobrança com lembretes';$('#charge-submit').textContent='Cadastrar cobrança e programar lembretes';$('#charge-cancel-edit').classList.add('hidden');status('#charge-feedback','');chargePreview();}
function editCharge(n){const f=$('#charge-form');f.elements.clientId.value=n.client_id;f.elements.clientId.disabled=true;f.elements.noticeType.value=n.notice_type;f.elements.title.value=n.title;f.elements.amount.value=moneyForInput(n.amount_cents);f.elements.dueDate.value=n.due_date;f.elements.message.value=n.body==='Cobrança cadastrada pela sua gestão. Consulte os detalhes antes de pagar.'?'':n.body;f.dataset.editId=n.id;$('#charge-heading').textContent='Editar cobrança';$('#charge-submit').textContent='Salvar alterações';$('#charge-cancel-edit').classList.remove('hidden');chargePreview();$('#charge-section').scrollIntoView({behavior:'smooth',block:'start'});f.elements.title.focus();}
function chargePreview(){const f=$('#charge-form'),type=f.elements.noticeType.value||'Cobrança',date=f.elements.dueDate.value,amount=Number(f.elements.amount.value||0);const t=Number.isFinite(amount)&&amount>0?(' · '+amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})):'';$('#charge-preview').textContent=date?'Avisos automáticos: '+[3,2,1,0].map(d=>{const p=new Date(date+'T12:00:00Z');p.setUTCDate(p.getUTCDate()-d);return p.toLocaleDateString('pt-BR',{timeZone:'UTC'})+' — '+type+' '+(d===0?'vence hoje':d===1?'vence amanhã':`vence em ${d} dias`)+t;}).join(' | '):'Preencha o valor e o vencimento para visualizar os quatro lembretes automáticos.';}

async function api(action,data={}){
 const {data:{session},error}=await client.auth.getSession();if(error||!session?.access_token)throw Error('Entre pelo painel administrativo antes de continuar.');
 const res=await fetch(base+'/admin-'+action,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabaseAnonKey,'Authorization':'Bearer '+session.access_token},body:JSON.stringify(data),cache:'no-store'});
 let value={};try{value=await res.json();}catch{};if(!res.ok||!value.ok)throw Error(value.error||'Falha na operação.');return value;
}
function company(id){return state.companies.find(c=>c.id===id)?.name||'Empresa removida';}
function render(){
 const active=state.companies.filter(x=>x.status!=='inactive');
 for(const select of document.querySelectorAll('.company-select')){
  const old=select.value;select.replaceChildren();
  const placeholder=el('option','Selecione a empresa');placeholder.value='';select.append(placeholder);
  active.forEach(c=>{const option=el('option',c.name);option.value=c.id;select.append(option);});
  if(active.some(x=>x.id===old))select.value=old;
 }
 const access=$('#access-list');access.replaceChildren();
 if(!state.grants.length)access.append(el('div','Nenhum cliente autorizado até agora.','empty'));
 for(const grant of state.grants){const card=el('article',null,'notice-card');const top=el('div',null,'between');top.append(el('strong',company(grant.client_id)),el('span',grant.enabled?'Ativo':'Revogado',grant.enabled?'pill':'meta'));card.append(top,el('p',grant.email,'small'));
  if(grant.enabled){const b=el('button','Revogar acesso','btn');b.type='button';b.addEventListener('click',async()=>{
   if(!confirm('Revogar o acesso de '+grant.email+' à empresa '+company(grant.client_id)+'?'))return;
   b.disabled=true;try{await api('revoke',{clientId:grant.client_id,email:grant.email});status('#admin-feedback','Acesso revogado.');await refresh();}catch(e){status('#admin-feedback',e.message,true);}finally{b.disabled=false;}
  });card.append(b);}access.append(card);
 }
 const notices=$('#notices-list');notices.replaceChildren();
 if(!state.notices.length)notices.append(el('div','Nenhum aviso publicado ainda.','empty'));
 for(const n of state.notices){
  const bill=!!n.reminder_enabled;
  const card=el('article',null,'notice-card'),top=el('div',null,'between');
  const label=n.status==='paid'?'Pago':n.status==='archived'?'Arquivado':bill?'A vencer':'Publicado';
  top.append(el('strong',(bill?(n.notice_type+' · '):'')+n.title),el('span',label,n.status==='paid'?'pill':'meta'));
  card.append(top,el('p',n.body));
  card.append(el('div',company(n.client_id)+' · Vencimento: '+fmtDate(n.due_date)+(bill?' · '+fmtMoney(n.amount_cents):''),'meta'));
  if(bill){card.append(el('div',n.last_delivery?('Último lembrete aceito pelo serviço: '+fmtDate(n.last_delivery.date)+' (D-'+n.last_delivery.daysBefore+').'):('Lembretes ainda não enviados para dispositivo inscrito.'),'meta'));}
  if(bill&&n.status==='paid'){
   const reopen=el('button','Reabrir cobrança','btn');reopen.type='button';reopen.addEventListener('click',async()=>{
    if(!confirm('Reabrir esta cobrança? Ela voltará a enviar lembretes nos dias devidos.'))return;
    reopen.disabled=true;try{await api('reopen-charge',{noticeId:n.id});status('#admin-feedback','Cobrança reaberta. Lembretes futuros retomados.');await refresh();}catch(e){status('#admin-feedback',e.message,true);}finally{reopen.disabled=false;}
   });card.append(reopen);
  }
  if(bill&&n.status==='active'){
   const edit=el('button','Editar cobrança','btn');edit.type='button';edit.addEventListener('click',()=>editCharge(n));card.append(edit);
   const paid=el('button','Marcar como pago','btn');paid.type='button';paid.style.margin='8px';paid.addEventListener('click',async()=>{
     if(!confirm('Confirmar o pagamento? Os lembretes futuros desta cobrança serão interrompidos.'))return;
     paid.disabled=true;try{await api('mark-paid',{noticeId:n.id});status('#admin-feedback','Cobrança marcada como paga. Lembretes futuros suspensos.');await refresh();}catch(e){status('#admin-feedback',e.message,true);}finally{paid.disabled=false;}
   });card.append(paid);
  }
  if(n.status!=='archived'){
   const archive=el('button','Arquivar','btn');archive.type='button';archive.style.marginTop='8px';archive.addEventListener('click',async()=>{
     if(!confirm('Arquivar este registro? Ele deixará de aparecer para o cliente e não enviará mais lembretes.'))return;
     archive.disabled=true;try{await api('archive',{noticeId:n.id});await refresh();}catch(e){status('#admin-feedback',e.message,true);}finally{archive.disabled=false;}
   });card.append(archive);
  }
  notices.append(card);
 }

}
async function refresh(){const res=await api('list');state={companies:res.companies||[],grants:res.grants||[],notices:res.notices||[]};render();$('#admin-loading').classList.add('hidden');$('#admin-workspace').classList.remove('hidden');if(!state.companies.length)status('#admin-feedback','Cadastre e salve sua primeira empresa no painel antes de publicar avisos.');}
async function createCharge(e){e.preventDefault();if(busy)return;busy=true;const f=e.target,b=$('#charge-submit');b.disabled=true;
 try{const payload=Object.fromEntries(new FormData(f));payload.clientId=f.elements.clientId.value;
  const isEdit=!!f.dataset.editId;if(isEdit)payload.noticeId=f.dataset.editId;
  await api(isEdit?'update-charge':'create-charge',payload);
  resetChargeForm();await refresh();status('#charge-feedback',isEdit?'Cobrança atualizada. Próximos lembretes usarão os dados corrigidos.':'Cobrança cadastrada. Serão enviados avisos no D-3, D-2, D-1 e vencimento, conforme o prazo.');
 }catch(err){status('#charge-feedback',err.message,true);}finally{busy=false;b.disabled=false;}
}
async function invite(e){e.preventDefault();if(busy)return;busy=true;const form=e.target,b=form.querySelector('button[type="submit"]');b.disabled=true;status('#invite-result','Criando acesso…');
 try{
  const data=Object.fromEntries(new FormData(form));const value=await api('invite',data);
  const box=$('#invite-result');box.replaceChildren();const good=el('div',null,'notice');good.append(el('strong',value.created?'Login criado com sucesso.':'Conta já existente autorizada.'));
  good.append(el('p','E-mail: '+value.email));
  if(value.temporaryPassword){good.append(el('p','Senha provisória: '+value.temporaryPassword));const c=el('button','Copiar acesso do cliente','btn');c.type='button';c.addEventListener('click',async()=>{await navigator.clipboard.writeText('Clyriva Clientes: '+value.loginUrl+'\nE-mail: '+value.email+'\nSenha provisória: '+value.temporaryPassword);c.textContent='Copiado';});good.append(c);}
  good.append(el('p','Entregue a senha de forma particular. Após sair desta tela ela não será exibida novamente.','small'));box.append(good);await refresh();
 }catch(err){status('#invite-result',err.message,true);}finally{busy=false;b.disabled=false;}
}
async function publish(e){e.preventDefault();if(busy)return;busy=true;const form=e.target,b=form.querySelector('button[type="submit"]');b.disabled=true;
 try{const data=Object.fromEntries(new FormData(form));data.notify=form.elements.notify.checked;
  const result=await api('publish',data);status('#admin-feedback','Aviso publicado. Notificações entregues aos dispositivos inscritos: '+result.pushSent+'.');form.reset();await refresh();
 }catch(err){status('#admin-feedback',err.message,true);}finally{busy=false;b.disabled=false;}
}
async function init(){
 $('#invite-form').addEventListener('submit',invite);$('#notice-form').addEventListener('submit',publish);
 $('#charge-form').addEventListener('submit',createCharge);$('#charge-cancel-edit').addEventListener('click',resetChargeForm);
 for(const e of $('#charge-form').querySelectorAll('input,select,textarea'))e.addEventListener('input',chargePreview);
 chargePreview();
 $('#copy-client-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.origin+'/cliente.html');status('#admin-feedback','Link copiado.');}catch{status('#admin-feedback','Não foi possível copiar automaticamente. Link: '+location.origin+'/cliente.html',true);}});
 try{const {data:{user},error}=await client.auth.getUser();if(error||!user)throw Error('Entre pelo painel administrativo primeiro.');
  const {data,error:e}=await client.from('clyriva_admins').select('user_id').eq('user_id',user.id).maybeSingle();if(e||!data)throw Error('Esta página é exclusiva da gestão.');await refresh();
 }catch(err){status('#admin-feedback',err.message,true);$('#admin-loading').textContent='Acesse primeiro o painel com sua conta administrativa.';}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
