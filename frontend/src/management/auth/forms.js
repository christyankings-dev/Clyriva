import { $, configError, configured, loginMarkup, root, sb } from '../session/config.js';
import { errMsg, esc } from '../session/format.js';
import { recovery, recoveryRequest, redirectURL, state } from '../session/state.js';
import { routeUser } from './router.js';

function statusMessage(text, type = '') {
  const el = $('#auth-feedback');
  if (el) el.innerHTML = `<div class="notice ${type}">${esc(text)}</div>`;
}

function changePassword() {
  if (!sb || $('#password-dialog')) return;
  const wrap = document.createElement('div');
  wrap.id = 'password-dialog';
  wrap.style.cssText =
    'position:fixed;z-index:999999;inset:0;background:rgba(7,26,38,.75);display:flex;align-items:center;justify-content:center;padding:20px';
  wrap.innerHTML =
    '<section style="width:100%;max-width:390px;padding:24px;border-radius:16px;background:white;color:#183b42;box-sizing:border-box"><h2>Alterar minha senha</h2><p>Informe uma nova senha de 12 caracteres ou mais.</p><form id="password-change-form"><label>Nova senha <input name="newpass" type="password" minlength="12" autocomplete="new-password" required style="box-sizing:border-box;width:100%;padding:11px;margin:7px 0 14px"></label><label>Repita a senha <input name="repeatpass" type="password" minlength="12" autocomplete="new-password" required style="box-sizing:border-box;width:100%;padding:11px;margin:7px 0 14px"></label><div id="password-change-feedback" role="status"></div><button type="submit" class="button">Salvar nova senha</button><button type="button" class="button secondary" id="password-change-close">Cancelar</button></form></section>';
  document.body.appendChild(wrap);
  wrap.querySelector('#password-change-close').onclick = () => wrap.remove();
  wrap.querySelector('form').onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.currentTarget,
      pass = f.elements.newpass.value,
      other = f.elements.repeatpass.value,
      fb = wrap.querySelector('#password-change-feedback');
    if (pass !== other) {
      fb.textContent = 'As senhas não são iguais.';
      return;
    }
    const b = f.querySelector('[type=submit]');
    b.disabled = true;
    try {
      const { error } = await sb.auth.updateUser({
        password: pass,
      });
      if (error) throw error;
      fb.textContent = 'Senha alterada com sucesso.';
      f.reset();
      setTimeout(() => wrap.remove(), 1100);
    } catch (e) {
      fb.textContent = 'Erro: ' + errMsg(e);
    } finally {
      b.disabled = false;
    }
  };
}

function authPage() {
  state.mode = 'login';
  root.innerHTML = loginMarkup;
  wireLogin();
}

function wireLogin() {
  /* Somente login privado. Cadastro e modo demonstração removidos da produção. */
  $('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!sb)
      return statusMessage(
        configError || 'Para ativar logins reais, configure config.js e o banco de dados.',
        'warn',
      );
    const email = $('#login-email').value.trim().toLowerCase(),
      password = $('#login-pass').value;
    if (state.authBusy) return;
    if (recoveryRequest.awaitingRecovery) {
      recoveryRequest.awaitingRecovery = false;
      history.replaceState({}, '', redirectURL());
    }
    state.authBusy = true;
    const btn = $('#auth-form button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Validando acesso…';
    try {
      const { error } = await sb.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      await routeUser();
    } catch (err) {
      statusMessage('Falha no login: ' + errMsg(err), 'err');
    } finally {
      state.authBusy = false;
      if (btn.isConnected) {
        btn.disabled = false;
        btn.textContent = 'Entrar na minha conta →';
      }
    }
  });
  $('#btn-forgot').onclick = async () => {
    if (!sb) return statusMessage('Configure o Supabase para recuperar senhas reais.', 'warn');
    const email = $('#login-email').value.trim().toLowerCase();
    if (!email)
      return statusMessage('Informe seu e-mail no campo acima para receber o link.', 'warn');
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: redirectURL() + '?recuperar=1',
      });
      statusMessage(
        error
          ? 'Não foi possível enviar: ' + error.message
          : 'Caso o e-mail esteja cadastrado, você receberá um link para redefinir a senha.',
        error ? 'err' : '',
      );
    } catch (e) {
      statusMessage(errMsg(e), 'err');
    }
  };
  if (!configured)
    statusMessage(
      'Modo demonstração disponível. Para autenticação real é necessário configurar o projeto Supabase.',
      'warn',
    );
  else if (!sb)
    statusMessage(configError || 'Não foi possível carregar a biblioteca de autenticação.', 'err');
}

function resetPasswordPage() {
  const cont = $('.login-card');
  if (!cont) return;
  cont.innerHTML = `<span class="eyebrow">Segurança</span><h2>Definir nova senha</h2><p style="margin:10px 0 22px">Você acessou um link de recuperação. Defina uma senha nova.</p><form id="reset-form"><label class="form-label">Nova senha<input class="field" name="password" type="password" minlength="12" autocomplete="new-password" required></label><button class="button">Salvar nova senha</button></form><div id="auth-feedback"></div>`;
  $('#reset-form').onsubmit = async (e) => {
    e.preventDefault();
    const b = e.target.querySelector('button');
    b.disabled = true;
    try {
      const result = await sb.auth.updateUser({
        password: e.target.elements.password.value,
      });
      if (result.error) throw result.error;
      recovery.recovering = false;
      history.replaceState({}, '', redirectURL());
      await routeUser();
    } catch (err) {
      statusMessage(errMsg(err), 'err');
    } finally {
      b.disabled = false;
    }
  };
}
// A PWA consulta apenas a sessao administrativa valida, sem compartilhar senhas.

export { authPage, changePassword, resetPasswordPage, statusMessage, wireLogin };
