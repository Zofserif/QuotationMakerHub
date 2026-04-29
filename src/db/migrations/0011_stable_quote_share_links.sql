alter table quote_recipients
add column if not exists access_token text;

create unique index if not exists quote_recipients_access_token_unique_idx
on quote_recipients (access_token)
where access_token is not null;

alter table quote_recipients
alter column access_token_expires_at drop not null;

update quote_recipients recipient
set access_token_expires_at = null
from quotes quote
where quote.id = recipient.quote_id
  and quote.status <> 'draft';
