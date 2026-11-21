#!/usr/bin/env bash
# Executar em um runner descartável com Docker e Supabase CLI.
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
stack_dir="$(mktemp -d)"
cd "$stack_dir"
supabase init >/dev/null
cp -R "$repo_dir/edge-functions" supabase/functions
cat >> supabase/config.toml <<'TOML'

[functions.clyriva-client]
verify_jwt = false
TOML
supabase start -x studio,logflare,vector,imgproxy,realtime,supavisor >/dev/null
trap 'supabase stop --no-backup >/dev/null 2>&1 || true' EXIT
# Somente os valores gerados pela instância local, nunca credenciais de um projeto vinculado.
eval "$(supabase status -o env)"
export ANON_KEY SERVICE_ROLE_KEY
test "${API_URL%/}" = "http://127.0.0.1:54321"
export PGOPTIONS="-c clyriva.test_fixture=isolated"
cd "$repo_dir"
for sql in schema_v1_6_reference.sql tests/fixtures/private_workspace_v25.sql \
  db/migrations/20261120_client_notices.sql db/migrations/20261120_client_billing_reminders.sql \
  db/migrations/20261120_client_push_privacy_default.sql db/migrations/20261120_v22_reliability.sql \
  db/migrations/20261120_v23_private_attachments.sql db/migrations/20261120_v24_internal_documents.sql \
  db/migrations/20261120_v24_link_publication.sql db/migrations/*_sincronizar_carteira_publicada.sql; do
  psql -X -q -v ON_ERROR_STOP=1 "$DB_URL" -f "$sql" >/dev/null
done
psql -X -q -v ON_ERROR_STOP=1 "$DB_URL" -c "notify pgrst, 'reload schema'"
# Supabase CLI serve a função local a partir da pasta de trabalho da instância.
(cd "$stack_dir" && exec supabase functions serve clyriva-client --no-verify-jwt) > "$stack_dir/functions.log" 2>&1 &
edge_pid=$!
trap 'kill "$edge_pid" 2>/dev/null || true; (cd "$stack_dir" && supabase stop --no-backup >/dev/null 2>&1) || true' EXIT
python tests/supabase_local_e2e.py
