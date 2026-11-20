-- Complemento histórico do esquema da v2.5 somente para instâncias de teste vazias.
-- A suíte inicia uma instância descartável e aplica este complemento antes de criar usuários.
DO $$ BEGIN IF current_setting('clyriva.test_fixture',true) IS DISTINCT FROM 'isolated' THEN RAISE EXCEPTION 'Reservado ao banco descartável da suíte'; END IF; END $$;

alter table public.clyriva_client_access add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists clyriva_client_access_uid on public.clyriva_client_access(user_id) where enabled;
alter table public.clyriva_client_access add constraint enabled_requires_user_id check (not enabled or user_id is not null);
create or replace function clyriva_private.is_confirmed_invitee(p_admin uuid,p_client text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.clyriva_client_access a join auth.users u on u.id=(select auth.uid())
    where a.admin_id=p_admin and a.client_id=p_client
      and a.enabled = true and a.user_id=u.id and u.email_confirmed_at is not null
  )
$$;
revoke all on function clyriva_private.is_confirmed_invitee(uuid,text) from public,anon;
grant execute on function clyriva_private.is_confirmed_invitee(uuid,text) to authenticated;



-- Clyriva privado: portal desativado, historico recuperavel, cofre protegido, validacao de dados
-- Nao altera usuarios, senha, carteira atual ou dados reais; preserva tabelas legadas sem acesso.
begin;
update public.clyriva_client_access set enabled=false where enabled;
alter policy view_admin_or_invited_read on public.clyriva_client_views
 using (admin_id=(select auth.uid()) and (select clyriva_private.is_admin()));
revoke insert, update, delete on public.clyriva_client_access from authenticated;
delete from public.clyriva_client_views;
create or replace function clyriva_private.publish(a uuid,d jsonb) returns void
language plpgsql set search_path='' as $fn$
begin
  -- Sem portal publico ou replica de dados individuais dos clientes.
  null;
end $fn$;
revoke all on function clyriva_private.publish(uuid,jsonb) from public,anon,authenticated;

-- Historico limitado a 25 revisoes ANTERIORES por carteira, com cofre somente cifrado.
create table if not exists public.clyriva_workspace_history (
 admin_id uuid not null references public.clyriva_admins(user_id) on delete cascade,
 revision bigint not null,
 payload jsonb not null,
 encrypted_vault jsonb,
 saved_at timestamptz not null default now(),
 saved_by uuid,
 primary key(admin_id,revision)
);
alter table public.clyriva_workspace_history enable row level security;
revoke all on public.clyriva_workspace_history from public,anon,authenticated;
grant select on public.clyriva_workspace_history to authenticated;
create policy history_admin_read on public.clyriva_workspace_history for select to authenticated
 using(admin_id=(select auth.uid()) and (select clyriva_private.is_admin()));

create or replace function clyriva_private.capture_workspace_version() returns trigger
language plpgsql security definer set search_path='' as $fn$
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
 return old;
end $fn$;
revoke all on function clyriva_private.capture_workspace_version() from public,anon,authenticated;
create trigger clyriva_keep_previous_revision
 before update or delete on public.clyriva_workspace
 for each row execute function clyriva_private.capture_workspace_version();

-- Valida datas, competencias e numeros conforme core.js. Impede JSON invalido de bloquear a abertura do painel.
create or replace function clyriva_private.validate_workspace_payload(d jsonb) returns void
language plpgsql set search_path='' as $fn$
declare grp text; row jsonb; field text; raw text; pattern text;
begin
 if octet_length(d::text)>4194304 then
    raise exception 'Carteira excede 4 MB. Exporte um backup e revise os registros.';end if;
 foreach grp in array array['clients','invoices','cash','tasks','fees','taxes'] loop
  for row in select value from jsonb_array_elements(d->grp) loop
   if jsonb_typeof(row)<>'object' then raise exception 'Registro invalido em %',grp;end if;
   if grp='clients' and nullif(trim(row->>'name'),'') is null then
     raise exception 'Cliente sem nome.'; end if;
   foreach field in array array['date','dueDate','paidAt','start','openingDate'] loop
     if row ? field and row->field<>'null'::jsonb and row->>field<>'' then
       raw:=row->>field;
       if jsonb_typeof(row->field)<>'string' or raw !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or to_char(to_date(raw,'YYYY-MM-DD'),'YYYY-MM-DD')<>raw
        then raise exception 'Data invalida: %.%',grp,field;end if;
     end if;
   end loop;
   if row ? 'competence' and row->'competence'<>'null'::jsonb and row->>'competence'<>'' then
     raw:=row->>'competence';
     if jsonb_typeof(row->'competence')<>'string' or raw !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
       then raise exception 'Competencia invalida: %',grp;end if;
   end if;
   foreach field in array array['monthlyFee','expected','paid','value'] loop
      if row ? field and row->field<>'null'::jsonb then
        raw:=row->>field;
        if raw !~ '^[0-9]+([.][0-9]{1,2})?$' or length(raw)>18 then
         raise exception 'Valor monetario invalido: %.%',grp,field;end if;
      end if;
   end loop;
  end loop;
 end loop;
end $fn$;
revoke all on function clyriva_private.validate_workspace_payload(jsonb) from public,anon,authenticated;

-- Alteracao cirurgica do corpo da RPC, mantendo contrato e privilegios existentes.
do $patch$
declare d text; old_v text; new_v text; old_validation text; new_validation text;
begin
 d:=pg_get_functiondef('public.clyriva_commit(bigint,jsonb,jsonb)'::regprocedure);
 old_v:=E'if p_vault is null then delete from public.clyriva_vault where admin_id=a;\n  else insert into public.clyriva_vault(admin_id,encrypted) values(a,p_vault) on conflict(admin_id)\n    do update set encrypted=excluded.encrypted,updated_at=now() where clyriva_vault.encrypted is distinct from excluded.encrypted;\n  end if;';
 new_v:=E'if p_vault is not null then\n    insert into public.clyriva_vault(admin_id,encrypted) values(a,p_vault) on conflict(admin_id)\n    do update set encrypted=excluded.encrypted,updated_at=now() where clyriva_vault.encrypted is distinct from excluded.encrypted;\n  end if;';
 if position(old_v in d)=0 then raise exception 'Cofre: corpo RPC divergente, migracao abortada';end if;
 d:=replace(d,old_v,new_v);
 old_validation:='if old_workspace is distinct from p_workspace then perform clyriva_private.validate_ledger(p_workspace);end if;';
 new_validation:='if old_workspace is distinct from p_workspace then perform clyriva_private.validate_workspace_payload(p_workspace);perform clyriva_private.validate_ledger(p_workspace);end if;';
 if position(old_validation in d)=0 then raise exception 'Validacao: corpo RPC divergente, migracao abortada';end if;
 d:=replace(d,old_validation,new_validation);
 execute d;
end $patch$;

-- Restauro da carteira por revisao, com CAS: sempre conserva o estado atual no historico antes de restaurar.
create or replace function public.clyriva_restore_revision(p_target bigint,p_expected bigint) returns bigint
language plpgsql security definer set search_path='' as $fn$
declare a uuid:=(select auth.uid()); rec public.clyriva_workspace_history; result bigint;
begin
 if not clyriva_private.is_admin() then
   raise exception 'Acesso administrativo necessario' using errcode='42501';end if;
 select * into rec from public.clyriva_workspace_history
   where admin_id=a and revision=p_target;
 if not found then raise exception 'Revisao historica nao encontrada';end if;
 result:=public.clyriva_commit(p_expected,rec.payload,rec.encrypted_vault);
 return result;
end $fn$;
revoke all on function public.clyriva_restore_revision(bigint,bigint) from public,anon;
grant execute on function public.clyriva_restore_revision(bigint,bigint) to authenticated;
commit;
