/** Clyriva Clientes v2.0 - avisos por empresa, autenticacao individual e push isolado. */
import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
import webpush from 'npm:web-push@3.6.7';
import {CHARGE_TYPES,validISODate,parseBrlCents,daysUntil,brazilDate,reminderText} from './reminder-text.mjs';

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
const DOC_BUCKET='clyriva-client-attachments';
const DOC_MAX=5*1024*1024;
const DOC_MIMES=new Set(['application/pdf','image/jpeg','image/png']);
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
function chargeFields(body:any){
 const kind=String(body?.noticeType||'').trim();
 const title=String(body?.title||'').trim();
 const details=String(body?.message||'').trim();
 const due=String(body?.dueDate||'').trim();
 const amount=parseBrlCents(body?.amount);
 if(!CHARGE_TYPES.includes(kind)||title.length<3||title.length>140||details.length>1500||!validISODate(due)||amount===null)return null;
 return {notice_type:kind,title,body:details.length>=5?details:'Cobrança cadastrada pela sua gestão. Consulte os detalhes antes de pagar.',due_date:due,amount_cents:amount};
}
// Somente o servidor consulta os caminhos privados. O browser recebe links assinados
// após autorizar o usuário + a empresa + a cobrança, nunca a chave de serviço.
function attachmentId(raw:any){const value=String(raw||'');return UUID_RE.test(value)?value:null;}
function cleanFilename(raw:any){const name=String(raw||'').split(/[\\/]/).pop()||'';
 const clean=name.replace(/[\x00-\x1f\x7f<>:"|?*]/g,'_').trim();
 return clean.slice(0,120);
}
function validFileHeader(data:Uint8Array,mime:string){
 if(mime==='application/pdf')return data.length>=5&&data[0]===37&&data[1]===80&&data[2]===68&&data[3]===70&&data[4]===45;
 if(mime==='image/png')return data.length>=8&&[137,80,78,71,13,10,26,10].every((x,i)=>data[i]===x);
 if(mime==='image/jpeg')return data.length>=3&&data[0]===255&&data[1]===216&&data[2]===255;
 return false;
}
async function authorizedAttachment(uid:string,attachmentRaw:any,management:boolean){
 const id=attachmentId(attachmentRaw);if(!id)return null;
 const {data:a,error:e}=await db.from('clyriva_notice_attachments')
   .select('id,notice_id,admin_id,client_id,storage_path,original_name,mime_type,state')
   .eq('id',id).eq('state','ready').maybeSingle();
 if(e)throw e;if(!a)return null;
 const {data:n,error:nErr}=await db.from('clyriva_client_notices')
   .select('id,admin_id,client_id,status').eq('id',a.notice_id).eq('admin_id',a.admin_id).eq('client_id',a.client_id).maybeSingle();
 if(nErr)throw nErr;if(!n)return null;
 if(management)return a.admin_id===uid?a:null;
 if(!['active','paid'].includes(n.status))return null;
 const scope=await activeGrants(uid);
 return scope.some(g=>g.admin_id===a.admin_id&&g.client_id===a.client_id)?a:null;
}
async function attachmentLink(uid:string,body:any,management:boolean){
 const a=await authorizedAttachment(uid,body?.attachmentId,management);
 if(!a)return fail('Documento indisponível para esta conta.',404);
 const options=body?.download===true?{download:a.original_name}:undefined;
 const {data,error:e}=await db.storage.from(DOC_BUCKET).createSignedUrl(a.storage_path,60,options);
 if(e||!data?.signedUrl)return fail('Não foi possível abrir o documento.',503);
 return response({ok:true,url:data.signedUrl,name:a.original_name,expiresIn:60});
}
async function attachmentList(ids:string[]){
 if(!ids.length)return [];
 const {data,error:e}=await db.from('clyriva_notice_attachments')
  .select('id,notice_id,original_name,mime_type,size_bytes,created_at')
  .in('notice_id',ids).eq('state','ready').order('created_at',{ascending:false}).limit(500);
 if(e)throw e;return data||[];
}
// Arquivos da carteira privada (tarefas e guias) nunca são publicados ao cliente sem ação explícita.
function internalEntity(payload:any,kind:any,raw:any){
 const type=String(kind||''),entityId=String(raw||'');
 if(!['task','tax'].includes(type)||entityId.length<6||entityId.length>120)return null;
 const values=type==='task'?payload?.tasks:payload?.taxes;
 if(!Array.isArray(values))return null;
 const record=values.find((x:any)=>x?.id===entityId);
 return record?.clientId&&activeCompany(payload,String(record.clientId))?{type,id:entityId,clientId:String(record.clientId)}:null;
}
async function internalDocuments(uid:string,action:string,body:any,payload:any){
 const table='clyriva_internal_attachments';
 if(action==='internal-unpublish'){
  const kind=String(body?.entityType||''),entityId=String(body?.entityId||'');
  if(!['task','tax'].includes(kind)||entityId.length<6||entityId.length>120)return fail('Registro inválido.');
  // Antes de arquivar um aviso, a carteira confirmada deve deixar de conter o registro.
  if(internalEntity(payload,kind,entityId))return fail('O registro ainda está ativo; exclua-o da carteira primeiro.',409);
  const {error:e}=await db.from('clyriva_client_notices').update({status:'archived',updated_at:new Date().toISOString()}).eq('admin_id',uid).eq('source_type',kind).eq('source_id',entityId);
  if(e)throw e;
  // Anexos da carteira deixam de ser vinculados após a exclusão do registro.
  const {data:old,error:oe}=await db.from(table).select('id,storage_path').eq('admin_id',uid).eq('entity_type',kind).eq('entity_id',entityId).limit(100);
  if(oe)throw oe;
  if(old?.length){await db.storage.from(DOC_BUCKET).remove(old.map(x=>x.storage_path));await db.from(table).delete().eq('admin_id',uid).in('id',old.map(x=>x.id));}
  return response({ok:true});
 }
 if(action==='internal-publish'||action==='internal-sync'){
  const owner=internalEntity(payload,body?.entityType,body?.entityId);
  if(!owner)return fail('Salve primeiro o registro em uma empresa ativa.',404);
  const source=(owner.type==='task'?payload.tasks:payload.taxes).find((x:any)=>x.id===owner.id);
  if(!source)return fail('Registro inexistente.',404);
  const isTax=owner.type==='tax';
  const rawType=String(source.kind||'');
  const kind=isTax?(CHARGE_TYPES.includes(rawType)?rawType:'Guia'):'Aviso';
  const title=isTax?`${kind} · ${String(source.competence||'').slice(0,7)}${source.ref?' · '+String(source.ref).slice(0,35):''}`:String(source.title||'').slice(0,140);
  // Observações da rotina administrativa podem ser confidenciais: nunca as copie automaticamente ao cliente.
  const description=isTax?'Cobrança cadastrada pela gestão. Consulte a guia e confira o vencimento.':'Pendência cadastrada pela gestão. Consulte os detalhes.';
  const due=String(source.dueDate||'');
  if(title.length<3||(!validISODate(due)&&due)||isTax&&(!validISODate(due)||parseBrlCents(source.value)===null))return fail('Dados do registro inválidos para publicar. Confira título, data e valor.',400);
  const data:any={title,body:description,due_date:validISODate(due)?due:null,
    status:isTax?(source.status==='paid'?'paid':'active'):(source.status==='done'?'archived':'active'),
    notice_type:kind,reminder_enabled:isTax,amount_cents:isTax?parseBrlCents(source.value):null,
    updated_at:new Date().toISOString()};
  const {data:found,error:lookupError}=await db.from('clyriva_client_notices').select('id,status').eq('admin_id',uid).eq('source_type',owner.type).eq('source_id',owner.id).maybeSingle();
  if(lookupError)throw lookupError;
  if(action==='internal-sync'&&!found)return response({ok:true,skipped:true});
  // Respeita a opção de arquivar no app: edições administrativas não republicam
  // automaticamente comunicados que foram ocultados do cliente.
  if(action==='internal-sync'&&found?.status==='archived'&&data.status==='active')data.status='archived';
  if(action==='internal-sync'&&found)delete data.body; // Preserva a mensagem editada na área de avisos.
  let noticeId=found?.id;
  if(noticeId){const {error:updateError}=await db.from('clyriva_client_notices').update(data).eq('id',noticeId).eq('admin_id',uid);if(updateError)throw updateError;}
  else{
   const {data:inserted,error:createError}=await db.from('clyriva_client_notices').insert({admin_id:uid,client_id:owner.clientId,source_type:owner.type,source_id:owner.id,...data}).select('id').single();
   if(createError?.code==='23505'){
    const {data:prior,error:priorError}=await db.from('clyriva_client_notices').select('id').eq('admin_id',uid).eq('source_type',owner.type).eq('source_id',owner.id).maybeSingle();if(priorError||!prior)return fail('Já existe aviso; atualize a página e tente novamente.',409);noticeId=prior.id;
   }else if(createError||!inserted)return fail('Não foi possível publicar.',500);
   else noticeId=inserted.id;
  }
  // Sincronizar arquivos de registros já publicados, inclusive ao editar/salvar.
  const {data:internal,error:docError}=await db.from(table).select('id,storage_path,original_name,mime_type,size_bytes').eq('admin_id',uid).eq('entity_type',owner.type).eq('entity_id',owner.id).eq('state','ready').limit(5);
  if(docError)throw docError;
  const {data:existing,error:attachmentsErr}=await db.from('clyriva_notice_attachments').select('id,source_attachment_id,storage_path').eq('notice_id',noticeId);
  if(attachmentsErr)throw attachmentsErr;
  const readyIds=new Set((internal||[]).map((item:any)=>item.id));
  let removed=0,attachmentErrors=0;
  // Um anexo interno removido não pode permanecer eternamente exposto no aplicativo.
  // Preservar anexos enviados diretamente na tela de comunicados (sem source_attachment_id).
  for(const old of existing||[]){
   if(!old.source_attachment_id||readyIds.has(old.source_attachment_id))continue;
   const {error:deleteFileError}=await db.storage.from(DOC_BUCKET).remove([old.storage_path]);
   if(deleteFileError){attachmentErrors++;continue;}
   const {error:deleteRowError}=await db.from('clyriva_notice_attachments').delete().eq('id',old.id).eq('notice_id',noticeId);
   if(deleteRowError){attachmentErrors++;continue;}
   removed++;
  }
  const copied=new Set((existing||[]).map((d:any)=>d.source_attachment_id).filter(Boolean));let attachmentsAdded=0;
  for(const item of internal||[]){
   if(copied.has(item.id))continue;
   const {count}=await db.from('clyriva_notice_attachments').select('id',{count:'exact',head:true}).eq('notice_id',noticeId);
   if((count||0)>=5)break;
   const {data:blob,error:readErr}=await db.storage.from(DOC_BUCKET).download(item.storage_path);
   if(readErr||!blob){attachmentErrors++;continue;}
   const ext=item.mime_type==='application/pdf'?'pdf':item.mime_type==='image/png'?'png':'jpg';
   const dest=`${uid}/${owner.clientId.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,50)}/${noticeId}/${crypto.randomUUID()}.${ext}`;
   const {error:uploadErr}=await db.storage.from(DOC_BUCKET).upload(dest,blob,{contentType:item.mime_type,upsert:false});
   if(uploadErr){attachmentErrors++;continue;}
   const {error:insertErr}=await db.from('clyriva_notice_attachments').insert({admin_id:uid,client_id:owner.clientId,notice_id:noticeId,storage_path:dest,original_name:item.original_name,mime_type:item.mime_type,size_bytes:item.size_bytes,state:'ready',source_attachment_id:item.id});
   if(insertErr){await db.storage.from(DOC_BUCKET).remove([dest]);attachmentErrors++;continue;}
   attachmentsAdded++;
  }
  return response({ok:true,noticeId,created:!found,updated:!!found,attachmentsAdded,attachmentsRemoved:removed,attachmentErrors,reminders:isTax?[3,2,1,0]:[]});
 }
 if(action==='internal-list'){
  const {data,error}=await db.from(table).select('id,entity_type,entity_id,client_id,original_name,size_bytes,mime_type,created_at').eq('admin_id',uid).eq('state','ready').order('created_at',{ascending:false}).limit(1500);
  if(error)throw error;
  return response({ok:true,attachments:(data||[]).filter((a:any)=>!!internalEntity(payload,a.entity_type,a.entity_id)&&internalEntity(payload,a.entity_type,a.entity_id)?.clientId===a.client_id)});
 }
 if(action==='internal-start'){
  const owner=internalEntity(payload,body?.entityType,body?.entityId);
  const name=cleanFilename(body?.fileName),mime=String(body?.mimeType||''),size=Number(body?.sizeBytes);
  if(!owner)return fail('Salve primeiro a obrigação ou guia para anexar um arquivo.',404);
  if(!name||!DOC_MIMES.has(mime)||!Number.isSafeInteger(size)||size<1||size>DOC_MAX)return fail('Use PDF, JPG ou PNG de até 5 MB.');
  const {data:stale}=await db.from(table).select('id,storage_path').eq('admin_id',uid).eq('entity_type',owner.type).eq('entity_id',owner.id).eq('state','pending').lt('created_at',new Date(Date.now()-2*3600000).toISOString()).limit(20);
  if(stale?.length){await db.storage.from(DOC_BUCKET).remove(stale.map(x=>x.storage_path));await db.from(table).delete().eq('admin_id',uid).in('id',stale.map(x=>x.id));}
  const {count,error:cErr}=await db.from(table).select('id',{count:'exact',head:true}).eq('admin_id',uid).eq('entity_type',owner.type).eq('entity_id',owner.id);
  if(cErr)throw cErr;if((count||0)>=5)return fail('Limite de cinco anexos por registro.',409);
  const id=crypto.randomUUID(),ext=mime==='application/pdf'?'pdf':mime==='image/png'?'png':'jpg';
  const path=`${uid}/interno/${owner.type}/${id}.${ext}`;
  const {error:e}=await db.from(table).insert({id,admin_id:uid,client_id:owner.clientId,entity_type:owner.type,entity_id:owner.id,storage_path:path,original_name:name,mime_type:mime,size_bytes:size});
  if(e)throw e;
  const {data:upload,error:ue}=await db.storage.from(DOC_BUCKET).createSignedUploadUrl(path);
  if(ue||!upload?.token){await db.from(table).delete().eq('id',id).eq('admin_id',uid);return fail('Não foi possível preparar o anexo.',503);}
  return response({ok:true,attachmentId:id,path:upload.path,token:upload.token});
 }
 const id=attachmentId(body?.attachmentId);
 if(!id)return fail('Selecione um documento válido.',400);
 const {data:doc,error:e}=await db.from(table).select('*').eq('id',id).eq('admin_id',uid).maybeSingle();
 if(e)throw e;if(!doc)return fail('Documento não encontrado.',404);
 const owner=internalEntity(payload,doc.entity_type,doc.entity_id);
 if(!owner||owner.clientId!==doc.client_id)return fail('O documento não pertence a uma empresa ativa.',403);
 if(action==='internal-complete'){
  if(doc.state==='ready')return response({ok:true});
  const {data:blob,error:dErr}=await db.storage.from(DOC_BUCKET).download(doc.storage_path);
  if(dErr||!blob)return fail('O upload ainda não terminou.',409);
  const bytes=new Uint8Array(await blob.arrayBuffer());
  if(bytes.length!==doc.size_bytes||!validFileHeader(bytes,doc.mime_type)){
   await db.storage.from(DOC_BUCKET).remove([doc.storage_path]);await db.from(table).delete().eq('id',id).eq('admin_id',uid);
   return fail('Arquivo inválido ou diferente do selecionado.',400);
  }
  const {error:uErr}=await db.from(table).update({state:'ready',updated_at:new Date().toISOString()}).eq('id',id).eq('admin_id',uid).eq('state','pending');
  if(uErr)throw uErr;return response({ok:true});
 }
 if(action==='internal-link'){
  if(doc.state!=='ready')return fail('O envio ainda não foi concluído.',409);
  const {data:link,error:le}=await db.storage.from(DOC_BUCKET).createSignedUrl(doc.storage_path,60,body?.download===true?{download:doc.original_name}:undefined);
  if(le||!link?.signedUrl)return fail('Documento indisponível.',503);
  return response({ok:true,url:link.signedUrl,expiresIn:60});
 }
 if(action==='internal-remove'){
  // Se já foi publicado para o cliente, remove também a cópia autorizada.
  // Do contrário, a gestão poderia apagar a guia interna e deixá-la disponível
  // inadvertidamente dentro do app do cliente.
  const {data:copies,error:copyErr}=await db.from('clyriva_notice_attachments')
    .select('id,storage_path').eq('admin_id',uid).eq('source_attachment_id',id).limit(20);
  if(copyErr)throw copyErr;
  if(copies?.length){
    const {error:storedErr}=await db.storage.from(DOC_BUCKET).remove(copies.map(x=>x.storage_path));
    if(storedErr)return fail('Falha ao remover as cópias publicadas do documento.',503);
    const {error:cleanErr}=await db.from('clyriva_notice_attachments').delete().eq('admin_id',uid).in('id',copies.map(x=>x.id));
    if(cleanErr)throw cleanErr;
  }
  const {error:de}=await db.storage.from(DOC_BUCKET).remove([doc.storage_path]);if(de)return fail('Falha ao remover arquivo.',503);
  const {error:re}=await db.from(table).delete().eq('id',id).eq('admin_id',uid);if(re)throw re;
  return response({ok:true});
 }
 return fail('Operação de documentos inválida.',404);
}
async function adminHandler(uid:string,action:string,body:any){
 const payload=await workspace(uid),customers=Array.isArray(payload?.clients)?payload.clients:[];
 const clientId=String(body?.clientId||'').trim();
 if(action.startsWith('internal-'))return await internalDocuments(uid,action,body,payload);
 if(action==='attachment-link')return await attachmentLink(uid,body,true);
 if(action==='attachment-start'){
  const noticeId=attachmentId(body?.noticeId),name=cleanFilename(body?.fileName),mime=String(body?.mimeType||''),size=Number(body?.sizeBytes);
  if(!noticeId||!name||!DOC_MIMES.has(mime)||!Number.isSafeInteger(size)||size<1||size>DOC_MAX)return fail('Anexe um PDF, JPG ou PNG com até 5 MB.');
  const {data:notice,error:nErr}=await db.from('clyriva_client_notices').select('id,admin_id,client_id')
     .eq('id',noticeId).eq('admin_id',uid).maybeSingle();
  if(nErr)throw nErr;if(!notice||!activeCompany(payload,notice.client_id))return fail('Cobrança inexistente ou empresa inativa.',404);
  // Uploads pendentes expiram após o prazo do link assinado; liberar tentativas
  // antigas para que uma conexão interrompida não bloqueie anexos futuros.
  const expired=new Date(Date.now()-2*60*60*1000).toISOString();
  const {data:stale,error:staleError}=await db.from('clyriva_notice_attachments')
    .select('id,storage_path').eq('notice_id',noticeId).eq('admin_id',uid)
    .eq('state','pending').lt('created_at',expired).limit(10);
  if(staleError)throw staleError;
  if(stale?.length){await db.storage.from(DOC_BUCKET).remove(stale.map(x=>x.storage_path));
    await db.from('clyriva_notice_attachments').delete().in('id',stale.map(x=>x.id)).eq('admin_id',uid);}
  const {count,error:cErr}=await db.from('clyriva_notice_attachments').select('id',{count:'exact',head:true}).eq('notice_id',noticeId);
  if(cErr)throw cErr;if((count||0)>=5)return fail('Limite de 5 anexos por cobrança. Remova um documento antes de continuar.',409);
  const id=crypto.randomUUID();const ext=mime==='application/pdf'?'pdf':mime==='image/png'?'png':'jpg';
  const path=`${uid}/${notice.client_id.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,50)}/${noticeId}/${id}.${ext}`;
  const {error:insertError}=await db.from('clyriva_notice_attachments').insert({id,notice_id:noticeId,admin_id:uid,client_id:notice.client_id,storage_path:path,original_name:name,mime_type:mime,size_bytes:size});
  if(insertError)return fail('Não foi possível preparar o anexo.',500);
  const {data:signed,error:uErr}=await db.storage.from(DOC_BUCKET).createSignedUploadUrl(path);
  if(uErr||!signed?.token){await db.from('clyriva_notice_attachments').delete().eq('id',id).eq('admin_id',uid);return fail('Falha ao preparar upload privado.',503);}
  return response({ok:true,attachmentId:id,path:signed.path,token:signed.token,maxBytes:DOC_MAX});
 }
 if(action==='attachment-complete'){
  const id=attachmentId(body?.attachmentId);if(!id)return fail('Anexo inválido.');
  const {data:a,error:e}=await db.from('clyriva_notice_attachments').select('id,storage_path,mime_type,size_bytes,state,notice_id,client_id')
    .eq('id',id).eq('admin_id',uid).maybeSingle();
  if(e)throw e;if(!a)return fail('Anexo não encontrado.',404);
  if(a.state==='ready')return response({ok:true,attachmentId:id,alreadyReady:true});
  if(!activeCompany(payload,a.client_id))return fail('Empresa não está mais ativa.',403);
  const {data:blob,error:dErr}=await db.storage.from(DOC_BUCKET).download(a.storage_path);
  if(dErr||!blob)return fail('Upload ainda não concluído. Tente novamente.',409);
  const bytes=new Uint8Array(await blob.arrayBuffer());
  if(bytes.length!==a.size_bytes||bytes.length>DOC_MAX||!validFileHeader(bytes,a.mime_type)){
    await db.storage.from(DOC_BUCKET).remove([a.storage_path]);
    await db.from('clyriva_notice_attachments').delete().eq('id',id).eq('admin_id',uid);
    return fail('O documento enviado não corresponde ao tamanho ou formato informado.',400);
  }
  const {error:readyErr}=await db.from('clyriva_notice_attachments').update({state:'ready',updated_at:new Date().toISOString()}).eq('id',id).eq('admin_id',uid).eq('state','pending');
  if(readyErr)throw readyErr;
  return response({ok:true,attachmentId:id});
 }
 if(action==='attachment-remove'){
  const id=attachmentId(body?.attachmentId);if(!id)return fail('Anexo inválido.');
  const {data:a,error:e}=await db.from('clyriva_notice_attachments').select('id,storage_path').eq('id',id).eq('admin_id',uid).maybeSingle();
  if(e)throw e;if(!a)return fail('Anexo não encontrado.',404);
  const {error:removeError}=await db.storage.from(DOC_BUCKET).remove([a.storage_path]);
  if(removeError)return fail('Não foi possível excluir o arquivo do armazenamento.',503);
  const {error:deleteError}=await db.from('clyriva_notice_attachments').delete().eq('id',id).eq('admin_id',uid);
  if(deleteError)throw deleteError;
  return response({ok:true});
 }
 if(action==='notify-notice'){
  const id=attachmentId(body?.noticeId);if(!id)return fail('Aviso inválido.');
  const {data:n,error:e}=await db.from('clyriva_client_notices').select('client_id,status').eq('id',id).eq('admin_id',uid).maybeSingle();
  if(e)throw e;if(!n||n.status!=='active'||!activeCompany(payload,n.client_id))return fail('Aviso indisponível.',404);
  let sent=0;try{sent=await sendNewNotice(uid,n.client_id);}catch{sent=0;}
  return response({ok:true,pushSent:sent});
 }
 if(action==='list'){
  const {data:grants,error:e1}=await db.from('clyriva_client_access').select('client_id,email,enabled,created_at,last_password_reset_at,user_id').eq('admin_id',uid).order('created_at',{ascending:false}).limit(300);
  const users=[...new Set((grants||[]).filter(x=>x.enabled&&x.user_id).map(x=>x.user_id))];
  const deviceCount=new Map<string,number>();
  if(users.length){
   const {data:devices,error:dErr}=await db.from('clyriva_client_push_subscriptions')
     .select('user_id').in('user_id',users).eq('enabled',true).limit(500);
   if(dErr)throw dErr;
   for(const d of devices||[])deviceCount.set(d.user_id,(deviceCount.get(d.user_id)||0)+1);
  }
  const publicGrants=(grants||[]).map(({user_id,...access})=>({...access,active_devices:user_id?deviceCount.get(user_id)||0:0}));
  const {data:notices,error:e2}=await db.from('clyriva_client_notices').select('id,client_id,title,body,due_date,status,created_at,notice_type,amount_cents,reminder_enabled,paid_at').eq('admin_id',uid).order('created_at',{ascending:false}).limit(300);
  if(e1||e2)throw e1||e2;
  // Auditoria dos lembretes: exibir apenas o ultimo disparo aceito pelo gateway,
  // sem expor endpoints nem credenciais de notificacao ao navegador.
  const billIds=(notices||[]).filter(n=>n.reminder_enabled).map(n=>n.id);
  const last=new Map<string,any>();
  if(billIds.length){
   const {data:logs,error:e3}=await db.from('clyriva_client_push_deliveries')
      .select('notice_id,delivery_date,days_before,sent_at')
      .in('notice_id',billIds).eq('state','sent').order('sent_at',{ascending:false}).limit(1000);
   if(e3)throw e3;
   for(const entry of logs||[])if(!last.has(entry.notice_id))last.set(entry.notice_id,{date:entry.delivery_date,daysBefore:entry.days_before,at:entry.sent_at});
  }
  return response({ok:true,companies:customers.map((x:any)=>({id:x.id,name:x.name,status:x.status})).filter((x:any)=>x.id),grants:publicGrants,notices:(notices||[]).map(n=>({...n,last_delivery:last.get(n.id)||null})),attachments:await attachmentList((notices||[]).map(n=>n.id))});
 }
 if(action==='revoke'){
  const email=String(body?.email||'').trim().toLowerCase();if(!clientId||!emailValid(email))return fail('Empresa ou e-mail inválido.');
  const {data:grants,error:e}=await db.from('clyriva_client_access').update({enabled:false}).eq('admin_id',uid).eq('client_id',clientId).eq('email',email).select('user_id');
  if(e)return fail('Não foi possível revogar o acesso.',500);
  for(const grant of grants||[]){if(grant.user_id&&!(await activeGrants(grant.user_id)).length){
    const {error:cleanup}=await db.from('clyriva_client_push_subscriptions').delete().eq('user_id',grant.user_id);
    if(cleanup)console.error('Nao foi possivel eliminar todas as inscricoes apos revogacao.');
  }}
  return response({ok:true});
 }
 if(action==='reset-access'){
  const email=String(body?.email||'').trim().toLowerCase();
  if(!clientId||!emailValid(email))return fail('Informe a empresa e o e-mail autorizado.');
  const {data:grant,error:gErr}=await db.from('clyriva_client_access')
    .select('user_id,email,enabled,last_password_reset_at')
    .eq('admin_id',uid).eq('client_id',clientId).eq('email',email).maybeSingle();
  if(gErr||!grant?.enabled||!grant.user_id)return fail('Acesso ativo não encontrado.',404);
  if(grant.last_password_reset_at&&Date.now()-Date.parse(grant.last_password_reset_at)<120000)
    return fail('Aguarde dois minutos para repetir a redefinição.',429);
  if(await isAdmin(grant.user_id))return fail('Uma senha administrativa não pode ser redefinida por este caminho.',403);
  const {data:found,error:uErr}=await db.auth.admin.getUserById(grant.user_id);
  if(uErr||found?.user?.email?.toLowerCase()!==email)return fail('A conta vinculada deve ser regularizada.',409);
  const temporaryPassword=password();
  const {error:resetError}=await db.auth.admin.updateUserById(grant.user_id,{password:temporaryPassword});
  if(resetError)return fail('Não foi possível criar uma nova senha.',500);
  const {error:stampError}=await db.from('clyriva_client_access').update({last_password_reset_at:new Date().toISOString()})
    .eq('admin_id',uid).eq('client_id',clientId).eq('email',email);
  if(stampError)console.error('Redefinição feita, registro de data pendente.');
  return response({ok:true,email,temporaryPassword,loginUrl:APP+'/cliente.html'});
 }
 if(action==='mark-paid'){
  const id=String(body?.noticeId||'');if(!/^[0-9a-f-]{36}$/i.test(id))return fail('Cobrança inválida.');
  const {data,error:e}=await db.from('clyriva_client_notices').update({status:'paid',paid_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('admin_id',uid).eq('status','active').eq('reminder_enabled',true).select('id').maybeSingle();
  return e?fail('Não foi possível marcar como paga.',500):data?response({ok:true}):fail('Cobrança não encontrada ou já encerrada.',404);
 }
 if(action==='reopen-charge'){
  const id=String(body?.noticeId||'');if(!/^[0-9a-f-]{36}$/i.test(id))return fail('Cobrança inválida.');
  const {data,error:e}=await db.from('clyriva_client_notices').update({status:'active',paid_at:null,updated_at:new Date().toISOString()}).eq('id',id).eq('admin_id',uid).eq('status','paid').eq('reminder_enabled',true).select('id').maybeSingle();
  return e?fail('Não foi possível reabrir a cobrança.',500):data?response({ok:true}):fail('Cobrança não encontrada.',404);
 }
 if(action==='update-charge'){
  const id=String(body?.noticeId||'');if(!/^[0-9a-f-]{36}$/i.test(id))return fail('Cobrança inválida.');
  const values=chargeFields(body);if(!values)return fail('Confira tipo, descrição, valor e data de vencimento.');
  const {data,error:e}=await db.from('clyriva_client_notices').update({...values,updated_at:new Date().toISOString()}).eq('id',id).eq('admin_id',uid).eq('status','active').eq('reminder_enabled',true).select('id').maybeSingle();
  return e?fail('Não foi possível atualizar a cobrança.',500):data?response({ok:true}):fail('Cobrança não encontrada ou encerrada.',404);
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
  if(existing){
    const {data:link,error:linkError}=await db.from('clyriva_client_access').select('user_id').eq('user_id',existing.id).limit(1);
    if(linkError)throw linkError;
    if(!link?.length)return fail('E-mail já possui outra conta neste projeto. Escolha outro endereço ou regularize manualmente.',409);
  }
  let id=existing?.id,temporaryPassword:string|null=null,created=false;
  if(!id){temporaryPassword=password();const {data,error:e}=await db.auth.admin.createUser({email,password:temporaryPassword,email_confirm:true});if(e||!data.user?.id)return fail('Não foi possível criar o login do cliente.',409);id=data.user.id;created=true;}
  const {error:e}=await db.from('clyriva_client_access').upsert({admin_id:uid,client_id:clientId,email,user_id:id,enabled:true},{onConflict:'admin_id,client_id,email'});
  if(e){if(created)await db.auth.admin.deleteUser(id);return fail('Não foi possível vincular o cliente à empresa.',500);}
  return response({ok:true,email,created,temporaryPassword,loginUrl:APP+'/cliente.html'});
 }
 if(action==='create-charge'){
  const values=chargeFields(body);if(!values)return fail('Informe tipo, descrição, valor positivo e uma data válida.');
  const rawKey=String(body?.requestKey||'').trim();
  if(rawKey&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawKey))return fail('Identificador da operação inválido.');
  const key=rawKey||crypto.randomUUID();
  const {data,error:e}=await db.from('clyriva_client_notices')
    .insert({admin_id:uid,client_id:clientId,...values,status:'active',reminder_enabled:true,request_key:key}).select('id').single();
  if(e?.code==='23505'){
   const {data:previous,error:readError}=await db.from('clyriva_client_notices')
     .select('id,client_id,title,body,due_date,notice_type,amount_cents,status').eq('admin_id',uid).eq('request_key',key).maybeSingle();
   if(readError||!previous)return fail('Não foi possível confirmar o cadastro. Atualize a lista de cobranças.',409);
   const identical=previous.client_id===clientId && previous.title===values.title
      && previous.body===values.body && previous.due_date===values.due_date
      && previous.notice_type===values.notice_type && Number(previous.amount_cents)===Number(values.amount_cents);
   if(!identical)return fail('Esta operação já foi utilizada em outro cadastro. Atualize a página antes de tentar novamente.',409);
   return response({ok:true,noticeId:previous.id,alreadyExists:true,reminderDays:[3,2,1,0]});
  }
  if(e||!data)return fail('Não foi possível cadastrar a cobrança.',500);
  return response({ok:true,noticeId:data.id,reminderDays:[3,2,1,0]});
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
 if(action==='attachment-link')return await attachmentLink(uid,body,false);
 if(action==='list'){
   const admins=[...new Set(scope.map(x=>x.admin_id))];
   const allowed=new Set(scope.map(x=>x.admin_id+'|'+x.client_id));
   const {data,error:e}=await db.from('clyriva_client_notices').select('id,admin_id,client_id,title,body,due_date,created_at,status,notice_type,amount_cents,reminder_enabled,paid_at').in('status',['active','paid']).in('admin_id',admins).in('client_id',[...new Set(scope.map(x=>x.client_id))]).order('created_at',{ascending:false}).limit(400);
   if(e)throw e;
   const notices=(data||[]).filter(x=>allowed.has(x.admin_id+'|'+x.client_id));
   return response({ok:true,companies:scope,notices,attachments:await attachmentList(notices.map(n=>n.id))});
 }
 if(action==='subscribe'){
  const sub=body?.subscription;if(!subscriptionValid(sub))return fail('Assinatura inválida.');
  const {data:prior,error:existingError}=await db.from('clyriva_client_push_subscriptions')
    .select('user_id,p256dh,auth_secret').eq('endpoint',sub.endpoint).maybeSingle();
  if(existingError)throw existingError;
  if(prior&&prior.user_id!==uid)
    return fail('Este aparelho ainda está associado a outra conta. Encerre a sessão anterior ou redefina a permissão de notificação no navegador.',409);
  const {error:e}=await db.from('clyriva_client_push_subscriptions').upsert({user_id:uid,endpoint:sub.endpoint,p256dh:sub.keys.p256dh,auth_secret:sub.keys.auth,enabled:true,show_amount:body?.showAmount===true,updated_at:new Date().toISOString()},{onConflict:'endpoint'});
  if(e)return fail('Não foi possível ativar notificações.',500);
  // Uma mesma assinatura de navegador nao deve ser entregue a dois tipos de usuario.
  await db.from('clyriva_push_subscriptions').delete().eq('endpoint',sub.endpoint);
  return response({ok:true});
 }
 if(action==='push-status'){
  if(!validEndpoint(body?.endpoint))return fail('Dispositivo inválido.');
  const {data,error:e}=await db.from('clyriva_client_push_subscriptions')
    .select('enabled,show_amount').eq('endpoint',body.endpoint).eq('user_id',uid).maybeSingle();
  if(e)throw e;
  return response({ok:true,enabled:data?.enabled===true,showAmount:data?.show_amount===true});
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
function plusDays(s:string,n:number){return new Date(Date.parse(s+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);}
async function dispatch(req:Request){
 const secret=req.headers.get('x-clyriva-cron')||'';
 const setting=await credentials();if(!secret||secret.length!==setting.cronToken.length)return fail('Acesso restrito.',403);
 let diff=0;for(let i=0;i<secret.length;i++)diff|=secret.charCodeAt(i)^setting.cronToken.charCodeAt(i);
 if(diff!==0)return fail('Acesso restrito.',403);
 const today=brazilDate(),end=plusDays(today,3);
 const {data:subs,error:e}=await db.from('clyriva_client_push_subscriptions').select('endpoint,user_id,p256dh,auth_secret,show_amount').eq('enabled',true).limit(500);
 if(e)throw e;if(!subs?.length)return response({ok:true,sent:0,failed:0,skipped:0});
 await sender();let sent=0,failed=0,skipped=0;
 for(const sub of subs){
  const scope=await activeGrants(sub.user_id);
  if(!scope.length)continue;
  const allowed=new Set(scope.map(x=>x.admin_id+'|'+x.client_id));
  const {data:notices,error:nErr}=await db.from('clyriva_client_notices')
    .select('id,admin_id,client_id,title,notice_type,amount_cents,due_date')
    .eq('status','active').eq('reminder_enabled',true)
    .gte('due_date',today).lte('due_date',end)
    .in('admin_id',[...new Set(scope.map(x=>x.admin_id))])
    .in('client_id',[...new Set(scope.map(x=>x.client_id))]).limit(500);
  if(nErr)throw nErr;
  for(const notice of notices||[]){
   if(!allowed.has(notice.admin_id+'|'+notice.client_id))continue;
   const stage=daysUntil(notice.due_date,today);
   if(stage===null)continue;
   // Exclusividade por dispositivo/cobranca/dia. Tentativas travadas sao recuperadas
   // apos 15 minutos; envios confirmados nunca sao repetidos no mesmo dia.
   const {error:claim}=await db.from('clyriva_client_push_deliveries')
     .insert({endpoint:sub.endpoint,notice_id:notice.id,delivery_date:today,days_before:stage});
   if(claim){
    if(claim.code!=='23505')throw claim;
    const expiry=new Date(Date.now()-15*60*1000).toISOString();
    const {data:reclaimed,error:recoveryError}=await db.from('clyriva_client_push_deliveries')
      .update({attempted_at:new Date().toISOString()})
      .eq('endpoint',sub.endpoint).eq('notice_id',notice.id).eq('delivery_date',today)
      .eq('state','pending').lt('attempted_at',expiry).select('notice_id').maybeSingle();
    if(recoveryError)throw recoveryError;
    if(!reclaimed){skipped++;continue;}
   }
   // Verificacao final: impedir um lembrete de cobranca paga durante a fila.
   const {data:current,error:currentError}=await db.from('clyriva_client_notices')
      .select('id,status,reminder_enabled,due_date,title,amount_cents,notice_type')
      .eq('id',notice.id).eq('admin_id',notice.admin_id).eq('client_id',notice.client_id).maybeSingle();
   if(currentError)throw currentError;
   if(!current||current.status!=='active'||!current.reminder_enabled||daysUntil(current.due_date,today)!==stage){
     await db.from('clyriva_client_push_deliveries').delete()
       .eq('endpoint',sub.endpoint).eq('notice_id',notice.id).eq('delivery_date',today);
     skipped++;continue;
   }
   // Revalidar o vínculo imediatamente antes do envio, incluindo revogações simultâneas.
   if(!(await activeGrants(sub.user_id)).some(g=>g.admin_id===notice.admin_id&&g.client_id===notice.client_id)){
     await db.from('clyriva_client_push_deliveries').delete().eq('endpoint',sub.endpoint).eq('notice_id',notice.id).eq('delivery_date',today);
     skipped++;continue;
   }
   const payload=reminderText(current,stage,sub.show_amount===true,today);
   const ok=await push(sub,payload);
   if(ok){sent++;
    const {error:finish}=await db.from('clyriva_client_push_deliveries').update({state:'sent',sent_at:new Date().toISOString()})
      .eq('endpoint',sub.endpoint).eq('notice_id',notice.id).eq('delivery_date',today);
    if(finish)console.error('Aviso aceito pelo gateway; nao foi possivel concluir o registro.');
   }else{failed++;
    await db.from('clyriva_client_push_deliveries').delete().eq('endpoint',sub.endpoint).eq('notice_id',notice.id).eq('delivery_date',today);
   }
  }
 }
 return response({ok:true,sent,failed,skipped});
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
