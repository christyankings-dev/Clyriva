import { $, root, sb } from '../session/config.js';
import { errMsg, esc } from '../session/format.js';
import {
  discard,
  epoch,
  recovery,
  recoveryRequest,
  sessionVersion,
  state,
} from '../session/state.js';
import { authPage, resetPasswordPage } from './forms.js';
import { loadAdmin } from '../workspace/load.js';

function accessFailure(e) {
  root.innerHTML =
    '<div class="login-main" style="min-height:100vh"><div class="login-card"><h2>Não foi possível carregar seu acesso</h2><div class="notice err mt20">' +
    esc(errMsg(e)) +
    '</div><button id="retry" class="button mt20">Tentar novamente</button> <button id="signout" class="button secondary mt20">Sair</button></div></div>';
  $('#retry').onclick = routeUser;
  $('#signout').onclick = signout;
}

async function routeUser() {
  if (!sb || recovery.recovering) return;
  const generation = ++sessionVersion.routeGeneration,
    token = epoch;
  try {
    const {
      data: { user },
      error,
    } = await sb.auth.getUser();
    if (generation !== sessionVersion.routeGeneration || token !== epoch || recovery.recovering)
      return;
    if (error) throw error;
    if (!user) {
      discard();
      authPage();
      return;
    }
    if (!user.email_confirmed_at) throw Error('Confirme seu e-mail antes de acessar o portal.');
    state.user = user;
    const a = await sb
      .from('clyriva_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (generation !== sessionVersion.routeGeneration || token !== epoch) return;
    if (a.error) throw a.error;
    if (a.data) {
      await loadAdmin(user, token, generation);
      return;
    }
    throw Error(
      'Acesso restrito à gestão do Clyriva. Solicite autorização ao administrador principal.',
    );
  } catch (e) {
    if (generation === sessionVersion.routeGeneration && token === epoch) {
      state.mode = 'error';
      state.frame = null;
      accessFailure(e);
    }
  }
}

async function signout() {
  if (state.saving) return;
  discard();
  recoveryRequest.awaitingRecovery = false;
  recovery.recovering = false;
  authPage();
  if (sb) {
    try {
      const { error } = await sb.auth.signOut({
        scope: 'global',
      });
      if (error) throw error;
    } catch (e) {
      accessFailure(
        Error('Falha ao encerrar a sessão no provedor. Tente sair novamente. ' + errMsg(e)),
      );
      $('#retry').onclick = signout;
    }
  }
}

function recoveryScreen() {
  discard();
  recoveryRequest.awaitingRecovery = false;
  recovery.recovering = true;
  authPage();
  resetPasswordPage();
}

export { recoveryScreen, routeUser, signout };
