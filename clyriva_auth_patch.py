from pathlib import Path
p=Path('/app/app.js')
s=p.read_text(encoding='utf-8')
old="$('#demo-panel').classList.toggle('hidden',configured);$('#local-entry').hidden=configured;"
new=old+"$('#btn-register').style.display=configured?'none':'';"
assert s.count(old)==1
s=s.replace(old,new)
renames={
'O cliente deverá criar a conta com este mesmo e-mail e confirmar o endereço. O convite abaixo não envia e-mail automaticamente.':
'O Clyriva cria uma senha provisória e libera a conta sem confirmação por e-mail. Entregue a senha ao cliente por um canal seguro.',
'A senha do login é definida pelo próprio cliente no cadastro.':
'O acesso é associado à conta individual do cliente, e não apenas ao endereço de e-mail. Oriente-o a alterar a senha provisória.',
'+ Liberar acesso':'+ Criar acesso e senha',
'Confirme seu e-mail e peça ao administrador para liberar o acesso ao mesmo endereço. Caso já tenha autorização, saia e entre novamente.':
'Solicite ao administrador que crie um acesso para esta empresa. Se já recebeu sua senha, saia e entre novamente.',
}
for a,b in renames.items():
  assert s.count(a)==1, (a,s.count(a))
  s=s.replace(a,b)
start=s.index('async function inviteClient(ev){')
end=s.index('async function toggleAccess(',start)
replacement='''async function inviteClient(ev){
 ev.preventDefault();const token=epoch,clientId=$('#invite-client').value,email=$('#invite-email').value.trim().toLowerCase(),fb=$('#invite-feedback');
 if(!clientId||!email||state.saving)return;
 if(state.access.some(a=>a.client_id===clientId&&a.email===email&&a.enabled)) {fb.innerHTML='<div class="notice warn">Este e-mail já tem acesso ativo a essa empresa.</div>';return;}
 if(state.mode==='demo-admin'){state.access.push({admin_id:'demo',client_id:clientId,email,enabled:true});renderAccess();return;}
 const btn=$('#invite-form button[type="submit"]');btn.disabled=true;btn.textContent='Criando conta…';
 try{
   const {data:{session},error:sessionError}=await sb.auth.getSession();
   if(sessionError||!session?.access_token)throw Error('Sua sessão expirou. Entre novamente.');
   const url=config.supabaseUrl.replace(/\\/$/,'')+'/functions/v1/clyriva-acessos';
   const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':config.supabaseAnonKey},body:JSON.stringify({clientId,email})});
   const result=await response.json();
   if(!response.ok||!result.ok)throw Error(result.error||'Não foi possível criar o acesso.');
   if(token!==epoch)return;
   state.access=state.access.filter(a=>a.client_id!==clientId||a.email!==email);
   state.access.push({admin_id:state.user.id,client_id:clientId,email,enabled:true});
   renderAccess();
   const box=$('#invite-feedback');if(!box)return;
   if(result.temporaryPassword){
     box.innerHTML='<div class="notice"><strong>Conta do cliente criada!</strong><p>Login: <strong>'+esc(email)+'</strong></p><p>Senha temporária: <code>'+esc(result.temporaryPassword)+'</code></p><p>Compartilhe a senha de forma privada e peça ao cliente que a altere.</p><button class="button secondary sm" type="button" id="copy-credential">Copiar acesso</button></div>';
     $('#copy-credential').onclick=async()=>{try{await navigator.clipboard.writeText('Clyriva: https://clyriva-production.up.railway.app\\nLogin: '+email+'\\nSenha: '+result.temporaryPassword);$('#copy-credential').textContent='Copiado';}catch{alert('Copie o login e a senha mostrados acima.')}};
   } else box.innerHTML='<div class="notice">Conta já existente autorizada. O cliente pode entrar com sua própria senha, sem nova confirmação por e-mail.</div>';
 }catch(error){if(token===epoch){const field=$('#invite-feedback');if(field)field.innerHTML='<div class="notice err">'+esc(errMsg(error))+'</div>';}}
 finally{if(btn.isConnected){btn.disabled=false;btn.textContent='+ Criar acesso e senha';}}
}
'''
s=s[:start]+replacement+s[end:]
p.write_text(s,encoding='utf-8')