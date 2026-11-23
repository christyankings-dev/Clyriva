# Clyriva — migrações em produção

Aplicada em 19/11/2026 a migração `clyriva_private_access_history_vault_validation_20261119` no Supabase. Ela revoga acessos de clientes e publicaçoes, configura `clyriva_workspace_history` com RLS, cria gatilho para até 25 revisões anteriores, cria `clyriva_restore_revision`, protege o cofre quando `p_vault` é `NULL` e valida datas, competências, valores e tamanho de payload.

**NÃO execute o `db/reference/schema_v1_6_reference.sql` no banco já configurado.** Consulte as migrações registradas no Supabase antes de uma reinstalação ou comparação de esquemas. O histórico é recuperação pontual, não backup externo independente.
