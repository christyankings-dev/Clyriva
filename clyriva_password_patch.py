from pathlib import Path
p=Path('/app/app.js')
s=p.read_text(encoding='utf-8')
# Permite que clientes e administrador alterem a senha dentro da sessão.
old_admin='<button class="button secondary sm" id="signout">Sair</button>'
old_client='<button id="signout">Sair da conta</button>'
assert s.count(old_admin)==1 and s.count(old_client)==1
s=s.replace(old_admin,'<button class="button secondary sm" id="change-password">Alterar senha</button>'+old_admin)
s=s.replace(old_client,'<button id="change-password">Alterar senha</button>'+old_client)
a="$('#signout').onclick=signout;state.frame=null;"
b="$('#signout').onclick=signout;const host=$('#client-body');"
assert s.count(a)==1 and s.count(b)==1
s=s.replace(a,"$('#signout').onclick=signout;$('#change-password').onclick=changePassword;state.frame=null;")
s=s.replace(b,"$('#signout').onclick=signout;$('#change-password').onclick=changePassword;const host=$('#client-body');")
needle='function authPage(){'
assert s.count(needle)==1
pw_change="""function changePassword(){
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
"""
s=s.replace(needle,pw_change+needle)
p.write_text(s,encoding='utf-8')