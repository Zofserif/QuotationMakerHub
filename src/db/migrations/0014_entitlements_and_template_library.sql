alter table quote_templates
add column if not exists name text,
add column if not exists is_default boolean not null default false,
add column if not exists archived_at timestamptz,
add column if not exists archived_by_clerk_user_id text,
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by_clerk_user_id text;

update quote_templates
set name = 'Default Template'
where name is null or btrim(name) = '';

alter table quote_templates
alter column name set default 'Default Template',
alter column name set not null;

update quote_templates
set is_default = true
where id in (
  select distinct on (organization_id) id
  from quote_templates
  where deleted_at is null
  order by organization_id, created_at asc
);

alter table quote_templates
drop constraint if exists quote_templates_organization_id_key;

drop index if exists quote_templates_organization_id_key;

alter table quote_templates
drop constraint if exists quote_templates_name_not_blank_check;

alter table quote_templates
add constraint quote_templates_name_not_blank_check
check (btrim(name) <> '');

alter table quote_templates
drop constraint if exists quote_templates_single_visibility_state_check;

alter table quote_templates
add constraint quote_templates_single_visibility_state_check
check (not (archived_at is not null and deleted_at is not null));

create unique index if not exists quote_templates_one_default_per_org_idx
on quote_templates (organization_id)
where is_default = true and deleted_at is null;

create index if not exists quote_templates_organization_updated_idx
on quote_templates (organization_id, updated_at desc)
where deleted_at is null;

create table if not exists quote_wet_signature_prints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  quote_id uuid not null references quotes(id) on delete cascade,
  printed_by_clerk_user_id text not null,
  created_at timestamptz not null default now()
);

alter table quote_wet_signature_prints enable row level security;

create index if not exists quote_wet_signature_prints_organization_created_idx
on quote_wet_signature_prints (organization_id, created_at desc);

create policy "members can read wet signature print usage"
on quote_wet_signature_prints for select
using (is_organization_member(organization_id));

create policy "members can insert wet signature print usage"
on quote_wet_signature_prints for insert
with check (is_organization_member(organization_id));
