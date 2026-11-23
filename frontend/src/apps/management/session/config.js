import * as workspaceRules from '../../../shared/domain/workspace.js';

const $ = (s) => document.querySelector(s),
  root = $('#root'),
  loginMarkup = root.innerHTML;

const core = workspaceRules,
  config = window.CLYRIVA_CONFIG || {};

const configured = Boolean(config.supabaseUrl || config.supabaseAnonKey);

let sb = null,
  configError = '';

if (configured) {
  try {
    const url = new URL(config.supabaseUrl),
      key = String(config.supabaseAnonKey || '').trim();
    const loopback = (u) => ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
    const safe = (u) => u.protocol === 'https:' || (u.protocol === 'http:' && loopback(u));
    if (!safe(url) || url.username || url.password || !safe(location))
      throw Error('Use HTTPS no portal e no projeto. Para testes locais, use localhost.');
    let isPublic = key.startsWith('sb_publishable_');
    if (!isPublic && key.split('.').length === 3) {
      try {
        isPublic =
          JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon';
      } catch {}
    }
    if (!isPublic)
      throw Error('Informe somente a chave pública publishable ou anon do projeto em config.js.');
    sb = window.supabase.createClient(url.origin, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  } catch (e) {
    configError = e.message;
  }
}

export { $, configError, configured, core, loginMarkup, root, sb };
