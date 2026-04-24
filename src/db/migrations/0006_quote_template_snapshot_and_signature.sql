alter table clients
alter column email drop not null;

alter table clients
drop constraint if exists clients_organization_id_email_key;

drop index if exists clients_organization_id_email_key;

create unique index if not exists clients_org_email_present_idx
on clients (organization_id, email)
where email is not null and btrim(email) <> '';

alter table quotes
add column if not exists template_snapshot jsonb,
add column if not exists request_summary text,
add column if not exists quoter_printed_name text,
add column if not exists quoter_signature_asset_id uuid references signature_assets(id) on delete set null;
