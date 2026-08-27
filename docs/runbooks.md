# Operational runbooks

Date: 2026-08-26. Covers the procedures the platform assumed but never wrote
down. Keep this current — it is the difference between an incident and an
outage.

## Alerting

Structured operational errors go through `src/lib/observability/report-error.ts`:
JSON on stderr (searchable in Vercel logs by `event`) and, when
`ALERT_WEBHOOK_URL` is set, a short message to that Slack/Discord webhook.

Wired today: unconfirmed ACH outcomes (`mercury.ach_outcome_unknown`), ACH sent
but not marked paid (`mercury.ach_sent_not_marked_paid`), audit-log write
failures (`audit.write_failed`), rate-limiter fail-opens
(`rate_limit.fail_open`).

**Action:** create a `#platform-alerts` channel, add its webhook URL to Vercel
env as `ALERT_WEBHOOK_URL`. Upgrade path: add `@sentry/nextjs` and forward from
`reportError` — call sites stay unchanged.

## Audit trail

Human actions land in `public.audit_log` (money movement, vendor banking
changes, portal-user changes, logins). AI actions land in
`assistant_audit_events`. Query recent money actions:

```sql
select created_at, action, entity_type, entity_id, metadata
from audit_log
where action like 'vendor_bill.%' or action like 'invoice.%'
order by created_at desc limit 50;
```

Neither table is user-deletable; treat both as append-only evidence.

## Database backup & restore

- Supabase project `rqmrqndjbkpkewfpyegv` (Pro) has daily backups; confirm
  Point-in-Time Recovery is enabled in Dashboard → Database → Backups, and set
  the retention you can afford. PITR is the only protection against a bad
  `db:push` or a destructive query — daily snapshots lose up to a day.
- **Restore drill (do once, then quarterly):** restore the latest backup to a
  fresh project, run the app against it locally, confirm login + an invoice
  render. A backup that has never been restored is a hope, not a backup.
- Storage buckets are NOT covered by PITR the same way — for documents,
  schedule a monthly `supabase storage cp -r` sync to cold storage (or accept
  the risk explicitly).

## Staging

There is no staging environment; every script and CI job points at production.
**Action:** create a second Supabase project (`8th-street-staging`), seed it
with `supabase db reset` against the migration history (post seed-scrub), and
point a Vercel preview environment at it. Until then: never run `db:reset`,
and treat `db:push` as production surgery — dry-run first
(`supabase db push --dry-run`).

## FIELD_ENCRYPTION_KEY rotation

The key encrypts vendor bank/tax fields (AES-256-GCM, AAD-bound per field).
Losing it makes those columns unreadable; leaking it exposes them.

Rotation procedure (no script exists yet — write `scripts/rotate-field-key.ts`
from `scripts/encrypt-vendor-secrets.ts` when first needed):

1. Generate the new key: `openssl rand -base64 32`.
2. With BOTH keys available (`FIELD_ENCRYPTION_KEY_NEW`), decrypt each
   encrypted column with the old key and re-encrypt with the new, row by row,
   verifying `last4` matches after.
3. Swap `FIELD_ENCRYPTION_KEY` in Vercel, redeploy, delete the old key from
   everywhere (including local `.env.local` files).
4. Audit-log the rotation.

Store the key in a password manager entry shared by exactly the people who
deploy — it must survive laptop loss.

## Mercury payment reconciliation

A bill stuck with `payment_initiated_at` set but no `mercury_transaction_id`
means an ACH attempt had an unknown outcome (this now also fires an alert).
Procedure: check Mercury's dashboard for a transaction matching the bill
amount ± date. If it exists, set `mercury_transaction_id` and status `paid`
manually (SQL editor) and note it in the bill; if not, clear
`payment_initiated_at` to unlock the pay button. Never re-send before checking.

## Auth hygiene

- Leaked-password protection (HaveIBeenPwned) is a Dashboard toggle:
  Authentication → Providers → Email → "Prevent use of leaked passwords".
  It is still OFF — turn it on; it cannot be set by migration.
- Login, magic-link, access-request, and share-code attempts are rate-limited
  per IP (see `RATE_LIMITS` in `src/lib/rate-limit.ts`). Limit trips log to
  the audit trail via failed-login events.

## BoldSign e-signatures

Contracts go out for signature from `/admin/contracts/<id>` once two env
vars are set (Vercel → Settings → Environment Variables):

- `BOLDSIGN_API_KEY` — app.boldsign.com → API → API Key.
- `BOLDSIGN_WEBHOOK_SECRET` — create a webhook in BoldSign pointing at
  `https://<site>/api/esign/boldsign/webhook` with events **Completed,
  Declined, Revoked, Expired**, and copy its secret here. Without the
  webhook, envelopes still send but never auto-complete — mark them
  signed manually as before.

On Completed, the webhook downloads the executed PDF, files it under the
project's documents (category `contract`), flips the agreement to Signed,
and sets the project's contract value — same effects as the manual path.
A failed filing returns 500 so BoldSign retries; the error lands in the
structured logs under `boldsign.webhook.completed`.

If a signature or date lands off its line on the first live envelope, the
coordinates live in `EXECUTION_FIELDS`
(`src/lib/esign/contract-esign-pdf.ts`) — the execution page and the
BoldSign fields share those numbers, so one edit moves both.
