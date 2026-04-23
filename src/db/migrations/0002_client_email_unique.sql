do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_organization_id_email_key'
  ) then
    alter table clients
    add constraint clients_organization_id_email_key unique (organization_id, email);
  end if;
end $$;
