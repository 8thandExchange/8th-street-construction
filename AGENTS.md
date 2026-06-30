# AGENTS.md

## Cursor Cloud specific instructions

This is a single **Next.js 15 (App Router) + TypeScript** product (the 8th Street
Construction platform: marketing site, lead capture, booking, admin CRM/PM, client
portal, subcontractor portal). The only hard backend dependency is **Supabase**,
run locally via the Supabase CLI + Docker. Resend (email), Stripe, Mercury, and
Anthropic are all optional/feature-gated and degrade gracefully when their keys are
absent — they are **not** required to run or test the core product.

The startup script (`npm install`) only refreshes node dependencies. Docker, the
Supabase CLI (`/opt/supabase-cli`, on PATH), and the pulled Supabase Docker images
are baked into the VM snapshot. Services are **not** auto-started — bring them up
with the sequence below.

### Bring the environment up (run once per fresh VM)

Standard run/build/lint commands live in `package.json` and `README.md`; the steps
below only cover the non-obvious cloud setup.

1. **Start the Docker daemon** (it does not auto-start; systemd is not running):
   ```bash
   sudo dockerd >/tmp/dockerd.log 2>&1 &
   ```
   After a daemon restart the socket may need: `sudo chmod 666 /var/run/docker.sock`
   (the `ubuntu` user is in the `docker` group, but group membership only applies to
   new logins).

2. **Start Supabase** (API 54321, DB 54322, Studio 54323, mail UI 54324):
   ```bash
   supabase start
   ```
   This applies all `supabase/migrations/*` and `supabase/seed.sql`.

3. **CRITICAL — apply the public-schema grant fix.** This local Supabase stack's
   default privileges grant only `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN` (not
   `INSERT/SELECT/UPDATE/DELETE`) on `public` tables to `anon`/`authenticated`/
   `service_role`. Hosted Supabase grants full DML, so the app expects it. Without
   this fix, every DB read/write fails with `permission denied for table ... (42501)`
   (e.g. lead capture returns HTTP 500 "Could not save inquiry"). Run:
   ```bash
   docker exec -i supabase_db_8th-street-construction psql -U postgres -d postgres <<'SQL'
   GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
   GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
   GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
   SQL
   ```
   It is idempotent. **Re-run it after any `supabase db reset` / `npm run db:reset`**,
   which recreates tables and reverts the grants. (Harmless `no privileges were
   granted for "citext..."` warnings are expected — those are extension functions
   owned by another role.)

4. **`.env.local`** already exists on disk (gitignored, points at the local stack).
   If missing, copy `.env.local.example` and fill `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from the
   `supabase start` output (use the JWT-style `ANON_KEY` / `SERVICE_ROLE_KEY`, not
   the `sb_publishable_*` / `sb_secret_*` values). Optional keys can be left unset.

5. **Run the app:** `npm run dev` → http://localhost:3000.

### Testing / checks

- `npm run typecheck` (`tsc --noEmit`) — works and is the reliable static check.
- `npm run build` — full production build; works.
- `npm run lint` — **interactive and currently unusable in CI/non-TTY**: no ESLint
  config is committed, so `next lint` prompts to configure ESLint and hangs. Rely on
  `npm run typecheck` until an ESLint config is added to the repo.
- Local auth/transactional emails are captured by the Supabase mail UI (Inbucket/
  Mailpit) at http://localhost:54324 instead of being sent.
- Quick end-to-end smoke test (DB write path): submit the `/contact` lead form, or
  `curl -X POST localhost:3000/api/leads` with a JSON body — it inserts into
  `public.leads` via the service-role client.
