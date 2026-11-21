/* Clyriva - Publicacao exclusivamente administrativa de avisos para empresas autorizadas. */
(()=>{'use strict';
const $=s=>document.querySelector(s),cfg=window.CLYRIVA_CONFIG||{};
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{autoRefreshToken:true,persistSession:true}});
const base=cfg.supabaseUrl+'/functions/v1/clyriva-client';
let state={companies:[],grants:[],notices:[],attachments:[]},busy=false;
function wipeAdminPage(){state={companies:[],grants:[],notices:[],attachments:[]};const area=$('#admin-workspace');if(area)area.classList.add('hidden');const loading=$('#admin-loading');if(loading){loading.classList.remove('hidden');loading.textContent='Sessão encerrada. Entre novamente pelo painel administrativo.';}for(const id of ['#invite-result','#access-list','#notices-list','#billing-summary']){const slot=$(id);if(slot)slot.replaceChildren();}for(const id of ['#invite-form','#notice-form','#charge-form']){const form=$(id);if(form)form.reset();}}
const status=(sel,msg,err=false)=>{const el=$(sel);if(el){el.textContent=msg;el.classList.toggle('error',err);}};
function el(tag,text,className){const node=document.createElement(tag);if(text!=null)node.textContent=String(text);if(className)node.className=className;return node;}
function fmtDate(v){return v?String(v).slice(8,10)+'/'+String(v).slice(5,7)+'/'+String(v).slice(0,4):'Sem prazo';}
function fmtMoney(cents){return 'R$ '+(Number(cents)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function moneyForInput(cents){return (Number(cents)/100).toFixed(2);}
function resetChargeForm(){const f=$('#charge-form');f.reset();delete f.dataset.editId;delete f.dataset.requestKey;f.elements.clientId.disabled=false;$('#charge-heading').textContent='Cadastrar cobrança com lembretes';$('#charge-submit').textContent='Cadastrar cobrança e programar lembretes';$('#charge-cancel-edit').classList.add('hidden');status('#charge-feedback','');chargePreview();}
function editCharge(n){const f=$('#charge-form');f.elements.clientId.value=n.client_id;f.elements.clientId.disabled=true;f.elements.noticeType.value=n.notice_type;f.elements.title.value=n.title;f.elements.amount.value=moneyForInput(n.amount_cents);f.elements.dueDate.value=n.due_date;f.elements.message.value=n.body==='Cobrança cadastrada pela sua gestão. Consulte os detalhes antes de pagar.'?'':n.body;f.dataset.editId=n.id;$('#charge-heading').textContent='Editar cobrança';$('#charge-submit').textContent='Salvar alterações';$('#charge-cancel-edit').classList.remove('hidden');chargePreview();$('#charge-section').scrollIntoView({behavior:'smooth',block:'start'});f.elements.title.focus();}
function chargePreview(){const f=$('#charge-form'),type=f.elements.noticeType.value||'Cobrança',date=f.elements.dueDate.value,amount=Number(f.elements.amount.value||0);const t=Number.isFinite(amount)&&amount>0?(' · '+amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})):'';$('#charge-preview').textContent=date?'Avisos automáticos: '+[3,2,1,0].map(d=>{const p=new Date(date+'T12:00:00Z');p.setUTCDate(p.getUTCDate()-d);return p.toLocaleDateString('pt-BR',{timeZone:'UTC'})+' — '+type+' '+(d===0?'vence hoje':d===1?'vence amanhã':`vence em ${d} dias`)+t;}).join(' | '):'Preencha o valor e o vencimento para visualizar os quatro lembretes automáticos.';}

async function api(action,data={}){
 const {data:{session},error}=await client.auth.getSession();if(error||!session?.access_token)throw Error('Entre pelo painel administrativo antes de continuar.');
 const res=await fetch(base+'/admin-'+action,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabaseAnonKey,'Authorization':'Bearer '+session.access_token},body:JSON.stringify(data),cache:'no-store'});
 let value={};try{value=await res.json();}catch{};if(!res.ok||!value.ok)throw Error(value.error||'Falha na operação.');return value;
}
function company(id){return state.companies.find(c=>c.id===id)?.name||'Empresa removida';}
const DOC_MAX=5*1024*1024;
const DOC_MIMES=['application/pdf','image/jpeg','image/png'];
function fileError(file){
 if(!file)return 'Escolha um arquivo.';
 if(file.size<1||file.size>DOC_MAX)return 'O arquivo precisa ter até 5 MB.';
 if(!DOC_MIMES.includes(file.type))return 'Apenas PDF, JPG e PNG são aceitos.';
 return null;
}
async function uploadAttachment(noticeId,file){
 const issue=fileError(file);if(issue)throw Error(issue);
 const start=await api('attachment-start',{noticeId,fileName:file.name,mimeType:file.type,sizeBytes:file.size});
 const result=await client.storage.from('clyriva-client-attachments')
   .uploadToSignedUrl(start.path,start.token,file,{contentType:file.type,upsert:false});
 if(result.error)throw Error('O documento não foi enviado. '+result.error.message);
 await api('attachment-complete',{attachmentId:start.attachmentId});
 return start.attachmentId;
}
function attachmentsFor(id){return state.attachments.filter(a=>a.notice_id===id);}
async function openAttachment(id,download=false){
 const tab=window.open('about:blank','_blank');
 try{const doc=await api('attachment-link',{attachmentId:id,download});
  if(tab){tab.opener=null;tab.location.replace(doc.url);}else window.location.assign(doc.url);
 }catch(e){if(tab)tab.close();status('#admin-feedback',e.message,true);}
}
function attachmentBlock(notice){
 const block=el('div',null,'document-list');const files=attachmentsFor(notice.id);
 block.append(el('strong',files.length?'Documentos anexados ('+files.length+')':'Sem documento anexado','document-title'));
 for(const f of files){
  const row=el('div',null,'document-row');row.append(el('span','📎 '+f.original_name+' · '+(f.size_bytes/1024).toFixed(0)+' KB','document-name'));
  const view=el('button','Visualizar','btn');view.type='button';view.onclick=()=>openAttachment(f.id);row.append(view);
  const download=el('button','Baixar','btn');download.type='button';download.onclick=()=>openAttachment(f.id,true);row.append(download);
  const remove=el('button','Remover','btn');remove.type='button';remove.onclick=async()=>{
   if(!confirm('Remover permanentemente o anexo '+f.original_name+'?'))return;
   remove.disabled=true;
   try{await api('attachment-remove',{attachmentId:f.id});await refresh();status('#admin-feedback','Anexo removido.');}
   catch(e){status('#admin-feedback',e.message,true);}finally{remove.disabled=false;}
  };row.append(remove);block.append(row);
 }
 if(notice.status!=='archived'){
  const picker=el('input');picker.type='file';picker.accept='.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';picker.className='hidden';
  const b=el('button','+ Adicionar documento','btn');b.type='button';b.onclick=()=>picker.click();
  picker.addEventListener('change',async()=>{const file=picker.files?.[0];if(!file)return;
   b.disabled=true;status('#admin-feedback','Enviando '+file.name+'…');
   try{await uploadAttachment(notice.id,file);await refresh();status('#admin-feedback','Anexo privado disponível para o cliente.');}
   catch(e){status('#admin-feedback',e.message,true);}finally{b.disabled=false;picker.value='';}
  });block.append(b,picker);
 }
 return block;
}

function render(){
 const active=state.companies.filter(x=>x.status!=='inactive');
 for(const select of document.querySelectorAll('.company-select')){
  const old=select.value;select.replaceChildren();
  const placeholder=el('option','Selecione a empresa');placeholder.value='';select.append(placeholder);
  active.forEach(c=>{const option=el('option',c.name);option.value=c.id;select.append(option);});
  if(active.some(x=>x.id===old))select.value=old;
 }
 const clientFilter=$('#billing-client-filter');if(clientFilter){const selected=clientFilter.value;clientFilter.replaceChildren();const allOption=el('option','Todas as empresas');allOption.value='all';clientFilter.append(allOption);active.forEach(c=>{const op=el('option',c.name);op.value=c.id;clientFilter.append(op)});clientFilter.value=active.some(c=>c.id===selected)?selected:'all';}
 const access=$('#access-list');access.replaceChildren();
 if(!state.grants.length)access.append(el('div','Nenhum cliente autorizado até agora.','empty'));
 for(const grant of state.grants){const card=el('article',null,'notice-card');const top=el('div',null,'between');top.append(el('strong',company(grant.client_id)),el('span',grant.enabled?'Ativo':'Revogado',grant.enabled?'pill':'meta'));card.append(top,el('p',grant.email,'small'),el('p',grant.enabled?(grant.active_devices>0?'Notificações ativas em '+grant.active_devices+' dispositivo(s)':'Nenhum celular com notificações inscritas ainda.'):'Acesso desativado.','meta'));
  if(grant.enabled){const b=el('button','Revogar acesso','btn');b.type='button';b.addEventListener('click',async()=>{
   if(!confirm('Revogar o acesso de '+grant.email+' à empresa '+company(grant.client_id)+'?'))return;
   b.disabled=true;try{await api('revoke',{clientId:grant.client_id,email:grant.email});status('#admin-feedback','Acesso revogado.');await refresh();}catch(e){status('#admin-feedback',e.message,true);}finally{b.disabled=false;}
  });card.append(b);
  const reset=el('button','Redefinir senha do cliente','btn');reset.type='button';reset.style.margin='8px';
  reset.addEventListener('click',async()=>{
   if(!confirm('Gerar nova senha provisória para '+grant.email+'? A senha atual deixará de funcionar, inclusive se este e-mail acessar outras empresas.'))return;
   reset.disabled=true;
   try{const result=await api('reset-access',{clientId:grant.client_id,email:grant.email});temporaryAccess(result.email,result.temporaryPassword,result.loginUrl);status('#admin-feedback','Senha renovada. Envie o acesso de forma privada.');}
   catch(err){status('#admin-feedback',err.message,true);}finally{reset.disabled=false;}
  });card.append(reset);
 }access.append(card);
 }
 const notices=$('#notices-list');notices.replaceChildren();
 const filterClient=$('#billing-client-filter')?.value||'all';
 const scopedNotices=state.notices.filter(n=>filterClient==='all'||n.client_id===filterClient);
 const activeBills=scopedNotices.filter(x=>x.reminder_enabled&&x.status==='active');
 const dateParts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=type=>dateParts.find(x=>x.type===type)?.value;const now=part('year')+'-'+part('month')+'-'+part('day');
 const dueDays=iso=>Math.round((Date.parse(iso+'T00:00:00Z')-Date.parse(now+'T00:00:00Z'))/86400000);
 const late=activeBills.filter(x=>dueDays(x.due_date)<0),soon=activeBills.filter(x=>{const d=dueDays(x.due_date);return d>=0&&d<=3;});
 const summary=$('#billing-summary');if(summary){summary.replaceChildren();for(const [name,value] of [['Em aberto',activeBills.length],['Vencem em até 3 dias',soon.length],['Atrasadas',late.length],['Pagas',scopedNotices.filter(n=>n.status==='paid').length]]){const card=el('div',null,'summary-item');card.append(el('strong',value),el('span',name));summary.append(card);}}
 const filter=$('#billing-filter')?.value||'all';
 const filtered=scopedNotices.filter(n=>{
   if(filter==='pending')return n.status==='active'&&n.reminder_enabled;
   if(filter==='soon')return n.status==='active'&&n.reminder_enabled&&dueDays(n.due_date)>=0&&dueDays(n.due_date)<=3;
   if(filter==='late')return n.status==='active'&&n.reminder_enabled&&dueDays(n.due_date)<0;
   if(filter==='paid')return n.status==='paid';
   if(filter==='messages')return !n.reminder_enabled;
   return true;
 }).sort((a,b)=>a.status==='active'&&b.status!=='active'?-1:a.status!=='active'&&b.status==='active'?1:String(a.due_date||'9999').localeCompare(String(b.due_date||'9999')));
 if(!filtered.length)notices.append(el('div','Nenhum aviso publicado ainda.','empty'));
 for(const n of filtered){
  const bill=!!n.reminder_enabled,linked=Boolean(n.source_type&&n.source_id);
  const card=el('article',null,'notice-card'),top=el('div',null,'between');
  const label=n.status==='paid'?'Pago':n.status==='archived'?'Arquivado':bill?'A vencer':'Publicado';
  top.append(el('strong',(bill?(n.notice_type+' · '):'')+n.title),el('span',label,n.status==='paid'?'pill':'meta'));
  card.append(top,el('p',n.body));
   if(linked)card.append(el('div','Vinculada à ficha do cliente: altere valor, vencimento e pagamento na guia original, no painel principal. Aqui você pode consultar documentos e arquivar a publicação.','meta'));
  card.append(el('div',company(n.client_id)+' · Vencimento: '+fmtDate(n.due_date)+(bill?' · '+fmtMoney(n.amount_cents):''),'meta'));
  if(bill){card.append(el('div',n.last_delivery?('Último lembrete aceito pelo serviço: '+fmtDate(n.last_delivery.date)+' (D-'+n.last_delivery.daysBefore+').'):('Lembretes ainda não enviados para dispositivo inscrito.'),'meta'));}
  if(bill&&n.status==='paid'&&!linked){
   const reopen=el('button','Reabrir cobrança','btn');reopen.type='button';reopen.addEventListener('click',async()=>{
    if(!confirm('Reabrir esta cobrança? Ela voltará a enviar lembretes nos dias devidos.'))return;
    reopen.disabled=true;try{await api('reopen-charge',{noticeId:n.id});status('#admin-feedback','Cobrança reaberta. Lembretes futuros retomados.');await refresh();}catch(e){status('#admin-feedback',e.message,true);}finally{reopen.disabled=false;}
   });card.append(reopen);
  }
  if(bill&&n.status==='active'){
   const copyBill=el('button','Copiar lembrete','btn');copyBill.type='button';copyBill.style.margin='8px 0 8px 0';
   copyBill.addEventListener('click',async()=>{
    const txt='Olá! Lembrete de '+n.notice_type+': '+n.title+'\nValor: '+fmtMoney(n.amount_cents)+'\nVencimento: '+fmtDate(n.due_date)+'\n'+(n.body||'Confira a guia e os dados de pagamento.');
    try{await navigator.clipboard.writeText(txt);status('#admin-feedback','Lembrete copiado para enviar ao cliente.');}catch{status('#admin-feedback','Não foi possível copiar automaticamente.',true);}
   });card.append(copyBill);
   if(!linked){
   const edit=el('button','Editar cobrança','btn');edit.type='button';edit.addEventListener('click',()=>editCharge(n));card.append(edit);
   const paid=el('button','Marcar como pago','btn');paid.type='button';paid.style.margin='8px';paid.addEventListener('click',async()=>{
     if(!confirm('Confirmar o pagamento? Os lembretes futuros desta cobrança serão interrompidos.'))return;
     paid.disabled=true;try{await api('mark-paid',{noticeId:n.id});status('#admin-feedback','Cobrança marcada como paga. Lembretes futuros suspensos.');await refresh();}catch(e){status('#admin-feedback',e.message,true);}finally{paid.disabled=false;}
   });card.append(paid);}
  }
  if(n.status!=='archived'){
   const archive=el('button','Arquivar','btn');archive.type='button';archive.style.marginTop='8px';archive.addEventListener('click',async()=>{
     if(!confirm('Arquivar este registro? Ele deixará de aparecer para o cliente e não enviará mais lembretes.'))return;
     archive.disabled=true;try{await api('archive',{noticeId:n.id});await refresh();}catch(e){status('#admin-feedback',e.message,true);}finally{archive.disabled=false;}
   });card.append(archive);
  }
  card.append(attachmentBlock(n));
  notices.append(card);
 }

}
function exportCharges(){
 const columns=['Empresa','Tipo','Descrição','Valor (R$)','Vencimento','Situação','Pago em','Observações','Último lembrete'];
 const safe=value=>{let str=String(value??'').replace(/\r?\n/g,' ');if(/^[=+@\-\t]/.test(str))str="'"+str;return '"'+str.replace(/"/g,'""')+'"';};
 const rows=state.notices.filter(x=>x.reminder_enabled).map(x=>[
   company(x.client_id),x.notice_type,x.title,moneyForInput(x.amount_cents),fmtDate(x.due_date),x.status,
   x.paid_at?new Date(x.paid_at).toLocaleDateString('pt-BR'):'',x.body,x.last_delivery?.date||''
 ]);
 const csv='\ufeff'+[columns,...rows].map(row=>row.map(safe).join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='clyriva-cobrancas-'+new Date().toISOString().slice(0,10)+'.csv';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
 status('#admin-feedback','Relatório CSV de cobranças gerado. Guarde o arquivo em local seguro.');
}
async function refresh(){const res=await api('list');state={companies:res.companies||[],grants:res.grants||[],notices:res.notices||[],attachments:res.attachments||[]};render();$('#admin-loading').classList.add('hidden');$('#admin-workspace').classList.remove('hidden');if(!state.companies.length)status('#admin-feedback','Cadastre e salve sua primeira empresa no painel antes de publicar avisos.');}
async function createCharge(e){e.preventDefault();if(busy)return;busy=true;const f=e.target,b=$('#charge-submit');b.disabled=true;
 try{const payload=Object.fromEntries(new FormData(f));payload.clientId=f.elements.clientId.value;
  const isEdit=!!f.dataset.editId;if(isEdit)payload.noticeId=f.dataset.editId;
  if(!isEdit){if(!f.dataset.requestKey)f.dataset.requestKey=crypto.randomUUID?.()||('10000000-0000-4000-a000-'+String(Date.now()).slice(-12));payload.requestKey=f.dataset.requestKey;}
  const file=f.querySelector('#charge-attachment')?.files?.[0];if(file){const issue=fileError(file);if(issue)throw Error(issue);}
  const result=await api(isEdit?'update-charge':'create-charge',payload);
  if(file){try{await uploadAttachment(result.noticeId||payload.noticeId,file);}catch(error){
   // Nunca duplicar cobrança quando o upload falhar. A edição retoma o registro já salvo.
   f.dataset.editId=result.noticeId||payload.noticeId;
   f.elements.clientId.disabled=true;
   $('#charge-heading').textContent='Anexar documento à cobrança já salva';
   $('#charge-submit').textContent='Tentar enviar o anexo novamente';
   $('#charge-cancel-edit').classList.remove('hidden');
   await refresh();throw Error('Cobrança salva, mas o anexo falhou: '+error.message+'. Você pode tentar novamente.');
  }}
  resetChargeForm();await refresh();status('#charge-feedback',(file?'Documento anexado com segurança. ':'')+(isEdit?'Cobrança atualizada. Próximos lembretes usarão os dados corrigidos.':result.alreadyExists?'Cadastro anterior confirmado. A cobrança não foi duplicada.':'Cobrança cadastrada. Serão enviados avisos no D-3, D-2, D-1 e vencimento, conforme o prazo.'));
 }catch(err){status('#charge-feedback',err.message,true);}finally{busy=false;b.disabled=false;}
}
function temporaryAccess(email,secret,url,created=true){
 const box=$('#invite-result');box.replaceChildren();const good=el('div',null,'notice');
 good.append(el('strong',created?'Senha temporária gerada.':'Acesso autorizado.'));
 good.append(el('p','E-mail: '+email));
 const copy=el('button',secret?'Copiar credenciais para enviar em particular':'Copiar instruções de acesso','btn');copy.type='button';
 copy.addEventListener('click',async()=>{
  const lines=['Acesse o Clyriva Clientes pelo celular.',url,'E-mail: '+email,secret?'Senha provisória: '+secret:'Use sua senha atual.','Toque em “Instalar no celular” e abra o aplicativo pelo ícone. Entre, ative as notificações e toque em “Enviar notificação de teste”.'];
  try{await navigator.clipboard.writeText(lines.join('\n'));copy.textContent='Acesso copiado';}
  catch{status('#admin-feedback','A cópia automática falhou. Use o link do aplicativo e os dados de acesso desta tela.',true);}
 });
 good.append(copy);
 if(secret){
  const reveal=el('button','Mostrar senha por 30 segundos','btn');reveal.type='button';reveal.style.margin='8px';
  reveal.addEventListener('click',()=>{
   let display=good.querySelector('.temporary-secret');
   if(display)display.remove();
   display=el('code',secret,'temporary-secret');display.style.cssText='display:block;overflow-wrap:anywhere;margin-top:9px;';good.append(display);
   const current=display;setTimeout(()=>current.remove(),30000);
  });good.append(reveal);
  good.append(el('p','Copie o acesso para enviar por canal privado. A senha pode ser exibida temporariamente se necessário.','small'));
 }else good.append(el('p','O cliente utiliza sua senha existente. Se precisar, use Redefinir senha no acesso autorizado.','small'));
 box.append(good);
 setTimeout(()=>{if(box.contains(good)){box.replaceChildren();box.append(el('p','Dados temporários ocultados por segurança.','small'));}},120000);
}
async function invite(e){e.preventDefault();if(busy)return;busy=true;const form=e.target,b=form.querySelector('button[type="submit"]');b.disabled=true;status('#invite-result','Criando acesso…');
 try{
  const data=Object.fromEntries(new FormData(form));const value=await api('invite',data);
  temporaryAccess(value.email,value.temporaryPassword,value.loginUrl,value.created);await refresh();
 }catch(err){status('#invite-result',err.message,true);}finally{busy=false;b.disabled=false;}
}
async function publish(e){e.preventDefault();if(busy)return;busy=true;const form=e.target,b=form.querySelector('button[type="submit"]');b.disabled=true;
 try{const data=Object.fromEntries(new FormData(form));const file=form.querySelector('#notice-attachment')?.files?.[0];
  if(file){const issue=fileError(file);if(issue)throw Error(issue);}
  const wantsNotify=form.elements.notify.checked;data.notify=wantsNotify&&!file;
  const result=await api('publish',data);let sent=result.pushSent||0;
  if(file){try{await uploadAttachment(result.noticeId,file);}catch(e){form.reset();await refresh();throw Error('Comunicado publicado, mas arquivo não enviado: '+e.message+'. Use “Adicionar documento” no comunicado salvo. O formulário foi limpo para evitar duplicação.');}
   if(wantsNotify){const n=await api('notify-notice',{noticeId:result.noticeId});sent=n.pushSent||0;}
  }
  status('#admin-feedback','Aviso publicado'+(file?' com documento':'')+'. Notificações aceitas pelo serviço: '+sent+'. A entrega depende do celular.');form.reset();await refresh();
 }catch(err){status('#admin-feedback',err.message,true);}finally{busy=false;b.disabled=false;}
}
async function init(){
 $('#invite-form').addEventListener('submit',invite);$('#notice-form').addEventListener('submit',publish);
 $('#billing-filter').addEventListener('change',render);$('#billing-client-filter').addEventListener('change',render);$('#billing-export').addEventListener('click',exportCharges);
 client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')wipeAdminPage();});
 window.addEventListener('storage',e=>{if(e.key&&e.key.startsWith('sb-')&&!e.newValue)wipeAdminPage();});
 $('#charge-form').addEventListener('submit',createCharge);$('#charge-cancel-edit').addEventListener('click',resetChargeForm);
 for(const e of $('#charge-form').querySelectorAll('input,select,textarea'))e.addEventListener('input',chargePreview);
 chargePreview();
 $('#copy-client-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.origin+'/cliente.html');status('#admin-feedback','Link copiado.');}catch{status('#admin-feedback','Não foi possível copiar automaticamente. Link: '+location.origin+'/cliente.html',true);}});
 try{const {data:{user},error}=await client.auth.getUser();if(error||!user)throw Error('Entre pelo painel administrativo primeiro.');
  const {data,error:e}=await client.from('clyriva_admins').select('user_id').eq('user_id',user.id).maybeSingle();if(e||!data)throw Error('Esta página é exclusiva da gestão.');await refresh();
  const [section,query]=location.hash.slice(1).split('?');
  if(section==='autorizar'){
   const form=$('#invite-form'),id=new URLSearchParams(query).get('empresa');
   if(id&&state.companies.some(c=>c.id===id&&c.status!=='inactive'))form.elements.clientId.value=id;
   else if(id)status('#invite-result','A empresa indicada não está disponível. Selecione uma empresa ativa.',true);
   $('#autorizar').scrollIntoView({block:'start'});
   (form.elements.clientId.value?form.elements.email:form.elements.clientId).focus({preventScroll:true});
  }
 }catch(err){status('#admin-feedback',err.message,true);$('#admin-loading').textContent='Acesse primeiro o painel com sua conta administrativa.';}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
