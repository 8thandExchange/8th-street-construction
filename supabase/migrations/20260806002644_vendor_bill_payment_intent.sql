-- Vendor bill payouts: record the intent to pay BEFORE the ACH leaves.
--
-- Background: on 2026-08-05 a $20,208 ACH to MonteCristo settled while the
-- vendor_bills row stayed `open` with a null mercury_transaction_id, which
-- disarmed the double-pay guard in payVendorBillAch(). The payment had been
-- sent from Mercury directly, so the app's pay path never ran -- but the same
-- end state happens if the post-send UPDATE fails for any reason.
--
-- payment_initiated_at is written (and verified) before sendVendorAch(). If it
-- is set and mercury_transaction_id is still null, a payment may be in flight
-- and the bill must not be paid again without a human checking Mercury.

alter table public.vendor_bills
  add column if not exists payment_initiated_at timestamptz;

comment on column public.vendor_bills.payment_initiated_at is
  'Set immediately before an ACH is sent. Non-null with a null mercury_transaction_id means a payment may be in flight -- verify in Mercury before retrying.';

-- Reconciliation looks up open bills by amount; keep that lookup cheap.
create index if not exists vendor_bills_open_amount_idx
  on public.vendor_bills (status, amount)
  where mercury_transaction_id is null;
