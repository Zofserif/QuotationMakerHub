update quotes
set status = 'viewed',
    updated_at = now()
where status = 'partially_signed';

alter table quote_recipients
add column if not exists rejection_comment text;

alter table quotes
drop constraint if exists quotes_status_check;

alter table quotes
add constraint quotes_status_check
check (
  status in (
    'draft',
    'sent',
    'for_wet_signature',
    'viewed',
    'accepted',
    'rejected',
    'expired',
    'locked'
  )
);
