alter table organizations
add column if not exists pipeline_currency text not null default 'PHP';

alter table organizations
drop constraint if exists organizations_pipeline_currency_supported_check;

update organizations
set pipeline_currency = upper(pipeline_currency)
where upper(pipeline_currency) in ('PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'JPY', 'CNY', 'HKD', 'AED');

update organizations
set pipeline_currency = 'PHP'
where pipeline_currency is null
or pipeline_currency not in ('PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'JPY', 'CNY', 'HKD', 'AED');

alter table organizations
add constraint organizations_pipeline_currency_supported_check
check (pipeline_currency in ('PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'JPY', 'CNY', 'HKD', 'AED'));
