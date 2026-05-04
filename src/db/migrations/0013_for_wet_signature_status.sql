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
    'partially_signed',
    'accepted',
    'rejected',
    'expired',
    'locked'
  )
);
