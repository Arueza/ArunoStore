-- 0045_fix_column_grants
-- 0044 revoked all column grants on commissions and titipan_requests
-- then only restored the 7 address columns, stripping staff quote/status
-- grants. Re-grant the full union of all columns both roles need.

-- titipan_requests
revoke update on table public.titipan_requests from authenticated;
grant update (
  quote_item_price,
  quote_shipping,
  quote_service_fee,
  quote_note,
  status,
  courier,
  tracking_number,
  rating,
  rating_note,
  recipient_name,
  phone,
  address,
  city,
  province,
  postal_code,
  note
) on table public.titipan_requests to authenticated;

-- commissions
revoke update on table public.commissions from authenticated;
grant update (
  quote_price,
  quote_note,
  status,
  delivery_image,
  rating,
  rating_note,
  recipient_name,
  phone,
  address,
  city,
  province,
  postal_code,
  note
) on table public.commissions to authenticated;
