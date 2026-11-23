const $ = (s) => document.querySelector(s),
  cfg = window.CLYRIVA_CONFIG || {};

const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

const base = cfg.supabaseUrl + '/functions/v1/clyriva-client';

async function api(action, data = {}) {
  const {
    data: { session },
    error,
  } = await client.auth.getSession();
  if (error || !session?.access_token)
    throw Error('Entre pelo painel administrativo antes de continuar.');
  const res = await fetch(base + '/admin-' + action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.supabaseAnonKey,
      Authorization: 'Bearer ' + session.access_token,
    },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  let value = {};
  try {
    value = await res.json();
  } catch {}
  if (!res.ok || !value.ok) throw Error(value.error || 'Falha na operação.');
  return value;
}

export { $, api, client };
