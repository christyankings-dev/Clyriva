const $ = (s) => document.querySelector(s),
  config = window.CLYRIVA_CONFIG || {};

const base = String(config.supabaseUrl || '').replace(/\/$/, '') + '/functions/v1/clyriva-client';

const sb = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'clyriva-client-auth-v2',
    detectSessionInUrl: false,
  },
});

async function api(action, data = {}) {
  const {
    data: { session },
    error,
  } = await sb.auth.getSession();
  if (error || !session?.access_token) throw Error('Entre novamente para continuar.');
  const r = await fetch(base + '/' + action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.supabaseAnonKey,
      Authorization: 'Bearer ' + session.access_token,
    },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  let result = {};
  try {
    result = await r.json();
  } catch {}
  if (!r.ok || !result.ok) {
    const error = Error(result.error || 'Serviço temporariamente indisponível.');
    error.status = r.status;
    throw error;
  }
  return result;
}

export { $, api, config, sb };
