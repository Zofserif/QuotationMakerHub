alter table quote_line_items
add column if not exists unit text not null default 'Unit',
add column if not exists description_image_storage_path text,
add column if not exists description_image_mime_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quote_line_items_description_image_mime_type_check'
  ) then
    alter table quote_line_items
    add constraint quote_line_items_description_image_mime_type_check
    check (
      description_image_mime_type is null
      or description_image_mime_type in ('image/png', 'image/jpeg', 'image/webp')
    );
  end if;
end $$;

create table line_item_data (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  detailed_description text not null,
  unit text not null,
  unit_price_minor bigint not null default 0,
  description_image_storage_path text,
  description_image_mime_type text check (
    description_image_mime_type is null
    or description_image_mime_type in ('image/png', 'image/jpeg', 'image/webp')
  ),
  created_by_clerk_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index line_item_data_organization_updated_idx
on line_item_data (organization_id, updated_at desc);

alter table line_item_data enable row level security;

create policy "members can read line item data"
on line_item_data for select
using (is_organization_member(organization_id));

create policy "members can manage line item data"
on line_item_data for all
using (is_organization_member(organization_id))
with check (is_organization_member(organization_id));

insert into storage.buckets (id, name, public)
values ('line-item-images', 'line-item-images', false)
on conflict (id) do nothing;
