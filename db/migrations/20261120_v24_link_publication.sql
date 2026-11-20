begin;
alter table public.clyriva_client_notices add column if not exists source_type text;
alter table public.clyriva_client_notices add column if not exists source_id text;
alter table public.clyriva_client_notices drop constraint if exists clyriva_notice_source_type_check;
alter table public.clyriva_client_notices add constraint clyriva_notice_source_type_check check (source_type is null or source_type in ('task','tax'));
create unique index if not exists clyriva_notice_source_unique on public.clyriva_client_notices(admin_id,source_type,source_id) where source_type is not null and source_id is not null;
alter table public.clyriva_notice_attachments add column if not exists source_attachment_id uuid;
create unique index if not exists clyriva_notice_file_source_unique on public.clyriva_notice_attachments(notice_id,source_attachment_id) where source_attachment_id is not null;
commit;
