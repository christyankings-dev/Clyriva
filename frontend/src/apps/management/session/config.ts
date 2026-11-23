import type { SupabaseClient } from '@supabase/supabase-js';
import * as workspaceRules from '../../../shared/domain/workspace.ts';
import { errorInfo } from '../../../shared/lib/errors.ts';

const core = workspaceRules,
  config = window.CLYRIVA_CONFIG || {};

const configured = Boolean(config.supabaseUrl || config.supabaseAnonKey);

let sb: SupabaseClient | null = null,
  configError = '';

if (configured) {
  try {
    const url = new URL(config.supabaseUrl ?? ''),
      key = String(config.supabaseAnonKey || '').trim();
    const loopback = (u: URL | Location) =>
      ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
    const safe = (u: URL | Location) =>
      u.protocol === 'https:' || (u.protocol === 'http:' && loopback(u));
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
    configError = errorInfo(e).message;
  }
}

export { configError, configured, core, sb };
