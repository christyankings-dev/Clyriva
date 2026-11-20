-- Clyriva v2.2: melhorias aditivas, preservando todos os cadastros e historico existente.
begin;

-- Impede dois cadastros iguais provocados por clique duplo ou reconexao da rede.
alter table public.clyriva_client_notices
  add column if not exists request_key uuid;
create unique index if not exists clyriva_notices_idempotency_key
  on public.clyriva_client_notices(admin_id,request_key)
  where request_key is not null;

-- Ajuda o administrador a recuperar acesso sem expor senhas no banco.
alter table public.clyriva_client_access
  add column if not exists last_password_reset_at timestamptz;

-- Garantia de privacidade: nao mostrar valores na tela bloqueada sem consentimento.
alter table public.clyriva_client_push_subscriptions
  alter column show_amount set default false;

-- Otimizacao para a rotina diaria em carteiras maiores.
create index if not exists clyriva_bills_dispatch_idx
 on public.clyriva_client_notices(due_date,admin_id,client_id)
 where status='active' and reminder_enabled=true;

commit;
