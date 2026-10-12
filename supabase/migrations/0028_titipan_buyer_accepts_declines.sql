-- Roadmap 3.9: a buyer who has been quoted can accept or decline it.
--
-- Same shape as 0020 on commissions. Enum values 'accepted' and 'declined'
-- already added by 0020; column grant from 0022 already covers status; trigger
-- from 0022 already pins quote columns. Only the buyer update policy is new.
--
-- Safe to paste twice: drop policy if exists before create.

alter table public.titipan_requests enable row level security;

drop policy if exists "Buyers update their own titipan request"
  on public.titipan_requests;
create policy "Buyers update their own titipan request"
  on public.titipan_requests
  for update
  to authenticated
  using (buyer_id = auth.uid())
  with check (buyer_id = auth.uid());

-- Verify after pasting:
--   select policyname, cmd from pg_policies where tablename = 'titipan_requests';
--   -- five rows: two select, one insert, two update (staff + buyer)
--
-- The column grant from 0022 already covers status, so the buyer can only
-- touch status, never quote_item_price or quote_shipping or quote_service_fee
-- or quote_note. The trigger from 0022 additionally restores old values on
-- any update where is_staff() is false, so even a forged quote_* field in
-- the FormData cannot move the money.
