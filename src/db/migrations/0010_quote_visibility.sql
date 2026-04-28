alter table quotes
add column if not exists archived_at timestamptz,
add column if not exists archived_by_clerk_user_id text,
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by_clerk_user_id text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'quotes_single_visibility_state_check'
  ) then
    alter table quotes
    drop constraint quotes_single_visibility_state_check;
  end if;
end $$;

alter table quotes
add constraint quotes_single_visibility_state_check
check (not (archived_at is not null and deleted_at is not null));

create index if not exists quotes_organization_active_updated_idx
on quotes (organization_id, updated_at desc)
where archived_at is null and deleted_at is null;

create index if not exists quotes_organization_archived_updated_idx
on quotes (organization_id, archived_at desc)
where archived_at is not null and deleted_at is null;

create index if not exists quotes_organization_deleted_updated_idx
on quotes (organization_id, deleted_at desc)
where deleted_at is not null;
