create table quote_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  content jsonb not null,
  created_by_clerk_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

alter table quote_templates enable row level security;

create policy "members can read quote templates"
on quote_templates for select
using (is_organization_member(organization_id));

create policy "members can manage quote templates"
on quote_templates for all
using (is_organization_member(organization_id))
with check (is_organization_member(organization_id));
