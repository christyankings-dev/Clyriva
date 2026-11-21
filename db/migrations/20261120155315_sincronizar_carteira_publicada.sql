-- Mantém a revisão anterior no histórico e permite que a nova linha seja gravada.
CREATE OR REPLACE FUNCTION clyriva_private.capture_workspace_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 insert into public.clyriva_workspace_history(admin_id,revision,payload,encrypted_vault,saved_by)
 values(old.admin_id,old.revision,old.payload,
        (select encrypted from public.clyriva_vault where admin_id=old.admin_id),auth.uid())
 on conflict(admin_id,revision) do nothing;
 delete from public.clyriva_workspace_history
 where admin_id=old.admin_id and revision not in (
   select revision from public.clyriva_workspace_history
   where admin_id=old.admin_id order by revision desc limit 25
 );
 if tg_op='DELETE' then return old; end if;
 return new;
end $function$
;

-- A RPC só pode confirmar uma revisão efetivamente persistida na mesma transação.
do $guard$
declare definition text;
begin
 definition:=pg_get_functiondef('public.clyriva_commit(bigint,jsonb,jsonb)'::regprocedure);
 -- Conflito de edição é definitivo para a revisão antiga. A API deve responder HTTP 409.
 definition:=replace(definition,
   $old$raise exception 'A carteira mudou em outra aba. Recarregue antes de salvar.' using errcode='40001'$old$,
   $new$raise exception 'A carteira mudou em outra aba. Recarregue antes de salvar.' using errcode='PT409'$new$);
 if position($new$Recarregue antes de salvar.' using errcode='PT409'$new$ in definition)=0 then raise exception 'Conferir o contrato de revisão antes de migrar'; end if;
 if position('A revisão confirmada diverge da carteira gravada.' in definition)=0 then
   if position('return actual;' in definition)=0 then raise exception 'Contrato de clyriva_commit divergente'; end if;
   definition:=replace(definition,'return actual;',
   $body$if not exists(select 1 from public.clyriva_workspace w where w.admin_id=a and w.revision=actual) then
     raise exception 'A revisão confirmada diverge da carteira gravada.' using errcode='PT409';
   end if;
   return actual;$body$);
 end if;
 execute definition;
end $guard$;

-- Coordena alterações na carteira e no app na mesma transação, inclusive ao restaurar uma revisão.
-- Instalar a função e o gatilho não percorre nem atualiza carteiras existentes.
create or replace function clyriva_private.sync_published_workspace()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  changed_companies text[];
begin
  if old.payload->'clients' is distinct from new.payload->'clients' then
    -- Inclui ambos os sentidos. Restaurar um cadastro antigo também exige uma nova autorização.
    with before_active as (
      select c->>'id' as id from jsonb_array_elements(old.payload->'clients') c where c->>'status' is distinct from 'inactive'
    ), after_active as (
      select c->>'id' as id from jsonb_array_elements(new.payload->'clients') c where c->>'status' is distinct from 'inactive'
    )
    select array_agg(coalesce(b.id,a.id)) into changed_companies
    from before_active b full join after_active a using (id)
    where b.id is null or a.id is null;

    update public.clyriva_client_access set enabled=false
      where admin_id=new.admin_id and enabled and client_id=any(changed_companies);
    update public.clyriva_client_notices set status='archived',updated_at=now()
      where admin_id=new.admin_id and status<>'archived' and client_id=any(changed_companies);
  end if;
  if old.payload->'taxes' is not distinct from new.payload->'taxes'
     and old.payload->'tasks' is not distinct from new.payload->'tasks' then return new; end if;

  -- Só tocar avisos vinculados a uma origem que já existia e foi alterada nesta gravação.
  with prior as (
    select 'tax' as kind,r from jsonb_array_elements(old.payload->'taxes') r
    union all select 'task',r from jsonb_array_elements(old.payload->'tasks') r
  ), current_rows as (
    select 'tax' as kind,r from jsonb_array_elements(new.payload->'taxes') r
    union all select 'task',r from jsonb_array_elements(new.payload->'tasks') r
  ), changed as (
    select p.kind,p.r->>'id' as id,p.r->>'clientId' as company,c.r,
      case when c.kind='tax' then (nullif(c.r->>'value','')::numeric * 100) end as cents
    from prior p left join current_rows c on c.kind=p.kind and c.r->>'id'=p.r->>'id' and c.r->>'clientId'=p.r->>'clientId'
    where p.r is distinct from c.r
  )
  update public.clyriva_client_notices n set
    status=case when n.status='archived' or c.r is null or c.r->>'status'='done' then 'archived'
      when c.kind='tax' and (not coalesce(c.cents between 1 and 99999999999,false) or nullif(c.r->>'dueDate','') is null) then 'archived'
      when c.kind='tax' and c.r->>'status'='paid' then 'paid' else 'active' end,
    amount_cents=case when c.kind='tax' and c.cents between 1 and 99999999999 then c.cents::bigint else n.amount_cents end,
    due_date=case when c.r is null or (c.kind='tax' and nullif(c.r->>'dueDate','') is null) then n.due_date
      else nullif(c.r->>'dueDate','')::date end,
    paid_at=case when c.kind='tax' and c.r is not null then
      case when c.r->>'status'='paid' then (nullif(c.r->>'paidAt','')::date + time '12:00') at time zone 'UTC' end
      else n.paid_at end,
    updated_at=now()
  from changed c
  where n.admin_id=new.admin_id and n.client_id=c.company and n.source_type=c.kind and n.source_id=c.id;
  return new;
end;
$$;
revoke all on function clyriva_private.sync_published_workspace() from public,anon,authenticated;
create or replace trigger clyriva_sync_published_workspace after update of payload on public.clyriva_workspace
for each row when (old.payload is distinct from new.payload) execute function clyriva_private.sync_published_workspace();

-- A criação do primeiro aviso também precisa observar a origem se coincidir com uma edição/exclusão.
create or replace function clyriva_private.guard_new_linked_notice()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  portfolio jsonb;
  source_row jsonb;
begin
  perform 1 from public.clyriva_admins where user_id=new.admin_id for key share;
  select w.payload into portfolio from public.clyriva_workspace w where w.admin_id=new.admin_id for share;
  if not exists (select 1 from jsonb_array_elements(portfolio->'clients') c
                 where c->>'id'=new.client_id and c->>'status' is distinct from 'inactive') then
    raise exception 'Empresa indisponível para publicação' using errcode='PT409';
  end if;
  select r into source_row from jsonb_array_elements(
    portfolio->(case new.source_type when 'tax' then 'taxes' when 'task' then 'tasks' end)
  ) r where r->>'id'=new.source_id and r->>'clientId'=new.client_id;
  if source_row is null or new.due_date is distinct from nullif(source_row->>'dueDate','')::date
     or (new.source_type='tax' and (new.amount_cents is distinct from (nullif(source_row->>'value','')::numeric*100)
         or new.status is distinct from case when source_row->>'status'='paid' then 'paid' else 'active' end))
     or (new.source_type='task' and (new.title is distinct from left(source_row->>'title',140)
         or new.status is distinct from case when source_row->>'status'='done' then 'archived' else 'active' end)) then
    raise exception 'O lançamento mudou durante a publicação' using errcode='PT409';
  end if;
  return new;
end;
$$;
revoke all on function clyriva_private.guard_new_linked_notice() from public,anon,authenticated;
create or replace trigger clyriva_guard_new_linked_notice before insert on public.clyriva_client_notices
for each row when (new.source_type is not null) execute function clyriva_private.guard_new_linked_notice();
