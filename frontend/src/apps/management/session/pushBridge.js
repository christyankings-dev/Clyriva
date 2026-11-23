import { sb } from './config.js';
import { state } from './state.js';

// A PWA consulta apenas a sessao administrativa valida, sem compartilhar senhas.
Object.defineProperty(window, 'ClyrivaPwaSession', {
  value: Object.freeze({
    isAdmin() {
      return Boolean(sb && state.mode === 'admin' && state.user);
    },
    async token() {
      if (!sb || state.mode !== 'admin' || !state.user) return null;
      const { data, error } = await sb.auth.getSession();
      return error ? null : data.session?.access_token || null;
    },
  }),
});
