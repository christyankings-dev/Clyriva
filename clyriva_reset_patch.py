from pathlib import Path
p=Path('/app/app.js')
s=p.read_text(encoding='utf-8')
assert 'async function resetClientPassword(' not in s, 'Rotina ja instalada, nao duplicar'
d='$'
old='<button class="button danger sm" data-revoke="'+d+'{esc(a.client_id)}" data-email="'+d+'{esc(a.email)}">Remover</button>'
new=d+'{a.enabled?'+String.fromCharCode(96)+'<button class="button secondary sm" data-reset="'+d+'{esc(a.client_id)}" data-email="'+d+'{esc(a.email)}">Redefinir senha</button>'+String.fromCharCode(96)+':""} '+old
assert s.count(old)==1,('button',s.count(old))
s=s.replace(old,new)
old2="host.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=()=>revokeAccess(b.dataset.revoke,b.dataset.email));"
assert s.count(old2)==1,('binding',s.count(old2))
s=s.replace(old2,"host.querySelectorAll('[data-reset]').forEach(b=>b.onclick=()=>resetClientPassword(b.dataset.reset,b.dataset.email));"+old2)
marker='async function revokeAccess(id,email){'
assert s.count(marker)==1
fn=r'''async function resetClientPassword(clientId,email){
 if(state.mode!=='admin'||state.saving)return;
 if(!window.confirm('Gerar uma nova senha temporária para '+email+'? A senha antiga deixará de funcionar.'))return;
 const token=epoch,button=[...document.querySelectorAll('[data-reset]')].find(b=>b.dataset.reset===clientId&&b.dataset.email===email);
 if(button){button.disabled=true;button.textContent='Redefinindo…';}
 try{
  const {data:{session},error:sessionError}=await sb.auth.getSession();
  if(sessionError||!session?.access_token)throw Error('Sua sessão expirou. Entre novamente.');
  const response=await fetch(config.supabaseUrl.replace(/\/$/,'')+'/functions/v1/clyriva-acessos',{
   method:'POST',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':config.supabaseAnonKey},
   body:JSON.stringify({clientId,email,action:'reset'})
  });
  const result=await response.json();
  if(!response.ok||!result.ok||!result.temporaryPassword)throw Error(result.error||'Não foi possível redefinir a senha.');
  if(token!==epoch||state.mode!=='admin')return;
  const box=$('#invite-feedback');if(!box)return;
  box.innerHTML='<div class="notice"><strong>Nova senha temporária criada.</strong><p>Cliente: '+esc(email)+'</p><p>Senha temporária: <code>'+esc(result.temporaryPassword)+'</code></p><p>Compartilhe a senha em particular; ela não ficará salva nesta tela.</p><button class="button secondary sm" type="button" id="copy-reset-password">Copiar acesso</button></div>';
  const copy=$('#copy-reset-password');
  copy.onclick=async()=>{
   try{await navigator.clipboard.writeText('Clyriva: https://clyriva-production.up.railway.app\nLogin: '+email+'\nSenha: '+result.temporaryPassword);copy.textContent='Copiado';}
   catch{window.alert('Copie manualmente o e-mail e a senha exibidos acima.');}
  };
 }catch(error){if(token===epoch){const box=$('#invite-feedback');if(box)box.innerHTML='<div class="notice err">'+esc(errMsg(error))+'</div>';}}
 finally{if(button?.isConnected){button.disabled=false;button.textContent='Redefinir senha';}}
}
'''
s=s.replace(marker,fn+marker)
p.write_text(s,encoding='utf-8')
