update quote_templates
set content = jsonb_set(
  jsonb_set(
    content,
    '{lineItems}',
    coalesce(content #> '{lineItems}', '{}'::jsonb),
    true
  ),
  '{lineItems,vat}',
  coalesce(content #> '{lineItems,vat}', '{}'::jsonb) ||
    jsonb_build_object(
      'enabled',
      true,
      'mode',
      case
        when content #>> '{lineItems,vat,enabled}' = 'false' then 'inclusive'
        when content #>> '{lineItems,vat,mode}' in ('inclusive', 'exclusive')
          then content #>> '{lineItems,vat,mode}'
        else 'exclusive'
      end
    ),
  true
);
