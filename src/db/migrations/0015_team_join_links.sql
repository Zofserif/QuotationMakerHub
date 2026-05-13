create table if not exists team_join_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  token text not null unique,
  token_hash text not null unique,
  created_by_clerk_user_id text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

create unique index if not exists team_join_links_one_active_per_org_idx
on team_join_links (organization_id)
where revoked_at is null;

create index if not exists team_join_links_active_token_hash_idx
on team_join_links (token_hash)
where revoked_at is null;

alter table team_join_links enable row level security;
