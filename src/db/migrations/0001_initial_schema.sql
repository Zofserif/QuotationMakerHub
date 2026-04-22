create extension if not exists pgcrypto;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text unique,
  name text not null,
  logo_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  clerk_user_id text not null,
  role text not null check (role in ('owner', 'admin', 'quoter')),
  created_at timestamptz not null default now(),
  unique (organization_id, clerk_user_id)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  company_name text,
  contact_name text not null,
  email text not null,
  phone text,
  billing_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  quote_number text not null,
  title text not null,
  status text not null check (
    status in ('draft', 'sent', 'viewed', 'partially_signed', 'accepted', 'rejected', 'expired', 'locked')
  ) default 'draft',
  currency text not null default 'USD',
  subtotal_minor bigint not null default 0,
  discount_minor bigint not null default 0,
  tax_minor bigint not null default 0,
  total_minor bigint not null default 0,
  valid_until date,
  terms text,
  notes text,
  current_version integer not null default 1,
  created_by_clerk_user_id text not null,
  sent_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, quote_number)
);

create table quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  sort_order integer not null,
  name text not null,
  description text,
  quantity numeric(12, 3) not null default 1,
  unit_price_minor bigint not null default 0,
  discount_minor bigint not null default 0,
  tax_rate numeric(5, 4) not null default 0,
  line_total_minor bigint not null default 0,
  created_at timestamptz not null default now()
);

create table quote_versions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  snapshot_sha256 text not null,
  created_by_clerk_user_id text not null,
  created_at timestamptz not null default now(),
  unique (quote_id, version_number)
);

create table quote_recipients (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  quote_version_id uuid references quote_versions(id) on delete restrict,
  client_id uuid references clients(id) on delete set null,
  name text not null,
  email text not null,
  role text not null default 'client',
  status text not null check (
    status in ('pending', 'viewed', 'signed', 'accepted', 'rejected', 'expired')
  ) default 'pending',
  access_token_hash text not null unique,
  access_token_expires_at timestamptz not null,
  viewed_at timestamptz,
  signed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now()
);

create table signature_fields (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  quote_version_id uuid references quote_versions(id) on delete cascade,
  recipient_id uuid references quote_recipients(id) on delete cascade,
  signer_type text not null check (signer_type in ('quoter', 'client')),
  label text not null,
  anchor_key text not null,
  required boolean not null default true,
  width_px integer not null default 240,
  height_px integer not null default 96,
  created_at timestamptz not null default now()
);

create table signature_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  owner_type text not null check (owner_type in ('quoter', 'client')),
  owner_ref text not null,
  storage_path text not null,
  mime_type text not null default 'image/png',
  width_px integer,
  height_px integer,
  image_sha256 text not null,
  source_method text not null check (source_method in ('camera', 'upload', 'draw')),
  created_at timestamptz not null default now()
);

create table signature_placements (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  quote_version_id uuid not null references quote_versions(id) on delete restrict,
  signature_field_id uuid not null references signature_fields(id) on delete restrict,
  recipient_id uuid references quote_recipients(id) on delete cascade,
  signature_asset_id uuid not null references signature_assets(id) on delete restrict,
  placed_at timestamptz not null default now(),
  unique (quote_version_id, signature_field_id, recipient_id)
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  quote_id uuid references quotes(id) on delete cascade,
  quote_version_id uuid references quote_versions(id) on delete set null,
  actor_type text not null check (actor_type in ('quoter', 'client', 'system')),
  actor_ref text,
  event_type text not null,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table pdf_exports (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  quote_version_id uuid not null references quote_versions(id) on delete restrict,
  storage_path text not null,
  pdf_sha256 text not null,
  generated_by_clerk_user_id text,
  generated_at timestamptz not null default now()
);

create or replace function requesting_clerk_user_id()
returns text
language sql
stable
as $$
  select auth.jwt() ->> 'sub'
$$;

create or replace function is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_members om
    where om.organization_id = target_organization_id
      and om.clerk_user_id = requesting_clerk_user_id()
  )
$$;

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table clients enable row level security;
alter table quotes enable row level security;
alter table quote_line_items enable row level security;
alter table quote_versions enable row level security;
alter table quote_recipients enable row level security;
alter table signature_fields enable row level security;
alter table signature_assets enable row level security;
alter table signature_placements enable row level security;
alter table audit_events enable row level security;
alter table pdf_exports enable row level security;

create policy "members can read organizations"
on organizations for select
using (is_organization_member(id));

create policy "members can read organization memberships"
on organization_members for select
using (is_organization_member(organization_id));

create policy "members can read clients"
on clients for select
using (is_organization_member(organization_id));

create policy "members can manage clients"
on clients for all
using (is_organization_member(organization_id))
with check (is_organization_member(organization_id));

create policy "members can read quotes"
on quotes for select
using (is_organization_member(organization_id));

create policy "members can manage quotes"
on quotes for all
using (is_organization_member(organization_id))
with check (is_organization_member(organization_id));

create policy "members can read quote line items"
on quote_line_items for select
using (
  exists (
    select 1 from quotes q
    where q.id = quote_line_items.quote_id
      and is_organization_member(q.organization_id)
  )
);

create policy "members can manage quote line items"
on quote_line_items for all
using (
  exists (
    select 1 from quotes q
    where q.id = quote_line_items.quote_id
      and is_organization_member(q.organization_id)
  )
)
with check (
  exists (
    select 1 from quotes q
    where q.id = quote_line_items.quote_id
      and is_organization_member(q.organization_id)
  )
);

create policy "members can read quote versions"
on quote_versions for select
using (
  exists (
    select 1 from quotes q
    where q.id = quote_versions.quote_id
      and is_organization_member(q.organization_id)
  )
);

create policy "members can read quote recipients"
on quote_recipients for select
using (
  exists (
    select 1 from quotes q
    where q.id = quote_recipients.quote_id
      and is_organization_member(q.organization_id)
  )
);

create policy "members can read signature fields"
on signature_fields for select
using (
  exists (
    select 1 from quotes q
    where q.id = signature_fields.quote_id
      and is_organization_member(q.organization_id)
  )
);

create policy "members can read signature assets"
on signature_assets for select
using (organization_id is not null and is_organization_member(organization_id));

create policy "members can read signature placements"
on signature_placements for select
using (
  exists (
    select 1 from quotes q
    where q.id = signature_placements.quote_id
      and is_organization_member(q.organization_id)
  )
);

create policy "members can read audit events"
on audit_events for select
using (organization_id is not null and is_organization_member(organization_id));

create policy "members can read pdf exports"
on pdf_exports for select
using (
  exists (
    select 1 from quotes q
    where q.id = pdf_exports.quote_id
      and is_organization_member(q.organization_id)
  )
);

insert into storage.buckets (id, name, public)
values
  ('company-assets', 'company-assets', false),
  ('signature-assets', 'signature-assets', false),
  ('quote-pdfs', 'quote-pdfs', false)
on conflict (id) do update set public = excluded.public;
