import { routeUser, recoveryScreen } from './auth/router.ts';
import { sb } from './session/config.ts';
import { showLogin, statusMessage } from './session/screen.ts';
import { discard, recovery, recoveryRequest, state } from './session/state.ts';

/** Liga os eventos da página e da sessão do Supabase (roda uma vez, na abertura do portal). */
export function boot(): void {
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && sb) {
      discard();
      showLogin();
      void sb.auth.getSession().then(({ data }) => {
        if (data.session && !recovery.recovering) void routeUser();
      });
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.saving) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  if (!sb) return;
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      discard();
      recoveryRequest.awaitingRecovery = false;
      recovery.recovering = false;
      showLogin();
      return;
    }
    if (event === 'PASSWORD_RECOVERY') {
      recoveryScreen();
      return;
    }
    if (recovery.recovering) return;
    if (recoveryRequest.awaitingRecovery) {
      if (event === 'INITIAL_SESSION')
        statusMessage(
          'Para definir uma nova senha, abra um link de recuperação válido enviado ao seu e-mail.',
          'warn',
        );
      return;
    }
    if (!session) return;
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (state.user && state.user.id !== session.user.id) {
        discard();
        showLogin();
      }
      if (!state.authBusy && state.mode === 'login')
        setTimeout(() => {
          if (!recovery.recovering && state.mode === 'login') void routeUser();
        }, 0);
    }
  });
}
