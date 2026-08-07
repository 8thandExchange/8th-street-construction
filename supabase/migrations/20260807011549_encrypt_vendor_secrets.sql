-- =====================================================================
-- Encrypt vendor secrets at rest.
--
-- vendors.tax_id and vendors.remit_account_number stop being readable
-- values and become AES-256-GCM ciphertext produced by the application
-- (lib/crypto/field-encryption.ts). The key lives in the FIELD_ENCRYPTION_KEY
-- environment variable, never in this database — a dump of this table is
-- inert without it, which is the entire point.
--
-- This migration does NOT encrypt the existing rows: it cannot, because the
-- key is not available to Postgres. It prepares the schema and captures the
-- last four digits while the plaintext is still readable. The actual
-- encryption is done by scripts/encrypt-vendor-secrets.ts, which must be run
-- after this migration.
--
-- remit_routing_number is deliberately left in the clear. An ABA routing
-- number identifies a bank, not an account — the Federal Reserve publishes
-- the complete list. Encrypting it would buy nothing and would cost the
-- ability to see at a glance which bank a vendor uses.
-- =====================================================================

alter table public.vendors
  add column if not exists tax_id_last4 text,
  add column if not exists remit_account_last4 text;

comment on column public.vendors.tax_id_last4 is
  'Last four digits of the tax ID, in the clear so the admin UI can identify the record without holding the encryption key.';
comment on column public.vendors.remit_account_last4 is
  'Last four digits of the account number, in the clear for the same reason as tax_id_last4.';

-- Captured now, while these columns are still plaintext. After
-- encrypt-vendor-secrets.ts runs, right(...) over the ciphertext would be
-- meaningless, so this backfill only works here and only once.
update public.vendors
   set tax_id_last4 = right(regexp_replace(tax_id, '\D', '', 'g'), 4)
 where tax_id is not null
   and tax_id_last4 is null
   and length(regexp_replace(tax_id, '\D', '', 'g')) >= 4;

update public.vendors
   set remit_account_last4 = right(regexp_replace(remit_account_number, '\D', '', 'g'), 4)
 where remit_account_number is not null
   and remit_account_last4 is null
   and length(regexp_replace(remit_account_number, '\D', '', 'g')) >= 4;

comment on column public.vendors.tax_id is
  'EIN or SSN. ENCRYPTED at rest (AES-256-GCM, see lib/crypto/field-encryption.ts) with the key held outside the database. Do not read this column directly — go through decryptField with the matching context, or use tax_id_last4 for display.';
comment on column public.vendors.remit_account_number is
  'Bank account number. ENCRYPTED at rest, same scheme and caveats as tax_id. Use remit_account_last4 for display.';
comment on column public.vendors.remit_routing_number is
  'ABA routing number. Deliberately NOT encrypted — it identifies a bank, not an account, and the Federal Reserve publishes the full directory.';
