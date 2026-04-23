alter table quotes
alter column currency set default 'PHP';

update quotes
set currency = 'PHP'
where currency is distinct from 'PHP';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotes_currency_php_check'
  ) then
    alter table quotes
    add constraint quotes_currency_php_check check (currency = 'PHP');
  end if;
end $$;

update quote_templates
set content = jsonb_set(
  content,
  '{lineItems,unitPrice,currency}',
  to_jsonb('PHP'::text),
  true
)
where content #>> '{lineItems,unitPrice,currency}' is distinct from 'PHP';
