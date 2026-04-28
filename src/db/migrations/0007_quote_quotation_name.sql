alter table quotes
add column if not exists quotation_name text;

update quotes
set quotation_name = title
where quotation_name is null or btrim(quotation_name) = '';

alter table quotes
alter column quotation_name set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotes_quotation_name_not_blank_check'
  ) then
    alter table quotes
    add constraint quotes_quotation_name_not_blank_check
    check (btrim(quotation_name) <> '');
  end if;
end $$;
