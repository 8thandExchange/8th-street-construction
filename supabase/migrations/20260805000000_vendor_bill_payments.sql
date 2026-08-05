-- Vendor bills grow line items + ACH payout support.
-- Remit details (account/routing) are DATA entered in the app — never
-- committed to this repo.

alter table vendor_bills
  add column if not exists line_items jsonb not null default '[]'::jsonb,
  add column if not exists mercury_transaction_id text;

alter table vendors
  add column if not exists address text,
  add column if not exists remit_account_name text,
  add column if not exists remit_account_number text,
  add column if not exists remit_routing_number text,
  add column if not exists remit_account_type text not null default 'businessChecking',
  add column if not exists mercury_recipient_id text;
