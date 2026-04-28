alter table quotes
alter column currency set default 'PHP';

alter table quotes
drop constraint if exists quotes_currency_php_check;

alter table quotes
drop constraint if exists quotes_currency_supported_check;

update quotes
set currency = upper(currency)
where upper(currency) in ('PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'JPY', 'CNY', 'HKD', 'AED');

update quotes
set currency = 'PHP'
where currency is null
or currency not in ('PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'JPY', 'CNY', 'HKD', 'AED');

alter table quotes
add constraint quotes_currency_supported_check
check (currency in ('PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'JPY', 'CNY', 'HKD', 'AED'));

update quote_templates
set content = jsonb_set(
  content,
  '{lineItems,unitPrice,currency}',
  to_jsonb(
    case
      when upper(content #>> '{lineItems,unitPrice,currency}') in ('PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'JPY', 'CNY', 'HKD', 'AED')
        then upper(content #>> '{lineItems,unitPrice,currency}')
      else 'PHP'
    end
  ),
  true
);

update quote_templates
set content = jsonb_set(
  content,
  '{lineItems,unit,options}',
  '["Unit", "Lot", "Month", "Hour", "Days", "Week", "Pcs", "Set"]'::jsonb,
  true
)
where content #> '{lineItems,unit,options}' is null
or content #> '{lineItems,unit,options}' = '["Unit", "Lot", "Month"]'::jsonb;
