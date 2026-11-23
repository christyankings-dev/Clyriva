import { sb } from './session/config.js';
import { discard, recovery, recoveryRequest, state } from './session/state.js';
import { authPage, statusMessage, wireLogin } from './auth/forms.js';
import { recoveryScreen, routeUser } from './auth/router.js';
import './session/pushBridge.js';

window.addEventListener('pageshow', (e) => {
  if (e.persisted && sb) {
    discard();
    authPage();
    sb.auth.getSession().then(({ data }) => {
      if (data.session && !recovery.recovering) routeUser();
    });
  }
});

window.addEventListener('beforeunload', (e) => {
  if (state.saving) {
    e.preventDefault();
    e.returnValue = '';
  }
});

function init() {
  wireLogin();
  if (!sb) return;
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      discard();
      recoveryRequest.awaitingRecovery = false;
      recovery.recovering = false;
      authPage();
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
        authPage();
      }
      if (!state.authBusy && state.mode === 'login')
        setTimeout(() => {
          if (!recovery.recovering && state.mode === 'login') routeUser();
        }, 0);
    }
  });
}

init();
