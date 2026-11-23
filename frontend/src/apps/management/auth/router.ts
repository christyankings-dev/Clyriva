import { sb } from '../session/config.ts';
import { errMsg } from '../session/format.ts';
import { showFailure, showLogin, showReset } from '../session/screen.ts';
import {
  currentEpoch,
  discard,
  recovery,
  recoveryRequest,
  sessionVersion,
  state,
} from '../session/state.ts';
import { loadAdmin } from '../workspace/load.ts';

function accessFailure(error: unknown, retry: () => void = () => void routeUser()): void {
  showFailure(errMsg(error), retry);
}

async function routeUser(): Promise<void> {
  if (!sb || recovery.recovering) return;
  const generation = ++sessionVersion.routeGeneration,
    token = currentEpoch();
  try {
    const {
      data: { user },
      error,
    } = await sb.auth.getUser();
    if (
      generation !== sessionVersion.routeGeneration ||
      token !== currentEpoch() ||
      recovery.recovering
    )
      return;
    if (error) throw error;
    if (!user) {
      discard();
      showLogin();
      return;
    }
    if (!user.email_confirmed_at) throw Error('Confirme seu e-mail antes de acessar o portal.');
    state.user = user;
    const a = await sb
      .from('clyriva_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (generation !== sessionVersion.routeGeneration || token !== currentEpoch()) return;
    if (a.error) throw a.error;
    if (a.data) {
      await loadAdmin(user, token, generation);
      return;
    }
    throw Error(
      'Acesso restrito à gestão do Clyriva. Solicite autorização ao administrador principal.',
    );
  } catch (e) {
    if (generation === sessionVersion.routeGeneration && token === currentEpoch()) {
      state.mode = 'error';
      state.frame = null;
      accessFailure(e);
    }
  }
}

async function signout(): Promise<void> {
  if (state.saving) return;
  discard();
  recoveryRequest.awaitingRecovery = false;
  recovery.recovering = false;
  showLogin();
  if (sb) {
    try {
      const { error } = await sb.auth.signOut({
        scope: 'global',
      });
      if (error) throw error;
    } catch (e) {
      accessFailure(
        Error('Falha ao encerrar a sessão no provedor. Tente sair novamente. ' + errMsg(e)),
        () => void signout(),
      );
    }
  }
}

function recoveryScreen(): void {
  discard();
  recoveryRequest.awaitingRecovery = false;
  recovery.recovering = true;
  showLogin();
  showReset();
}

export { recoveryScreen, routeUser, signout };
