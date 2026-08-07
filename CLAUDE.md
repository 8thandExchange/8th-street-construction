# CLAUDE.md

Guidance for agents working in this repo.

## Database migrations

Migration files live in `supabase/migrations/`, named `<version>_<name>.sql`
where `<version>` is a `YYYYMMDDHHMMSS` timestamp. The live project ref is
`rqmrqndjbkpkewfpyegv`.

**The filename's version must match the version recorded in the remote
`supabase_migrations.schema_migrations` table.** When the two disagree, the CLI
treats an already-applied migration as pending, and the next `db:push` tries to
re-run it and fails on already-existing objects.

Either way of applying a migration is fine. They differ in how the version gets
recorded:

- `npm run db:push` records the version from the filename, so it always matches.
- The Supabase MCP's `apply_migration` records its **own generated timestamp**,
  which will not match the filename unless you make it match.

### After applying a migration via the MCP, reconcile it

Name the file to the version the MCP recorded — either when you create it, or by
renaming it right after applying. Then confirm:

```bash
supabase migration list --linked
```

Rows with a value in only one column are drift — a local version with no remote
match, paired with a remote version that has no local file:

```
 20260806184500 |                | 2026-08-06 18:45:00
                | 20260807005549 | 2026-08-07 00:55:49
```

Fix it by renaming the local file to the version the remote recorded:

```bash
git mv supabase/migrations/20260806184500_vendor_onboarding.sql \
       supabase/migrations/20260807005549_vendor_onboarding.sql
```

Rename the file — do **not** use `supabase migration repair`, and do **not**
re-run the DDL. The objects already exist in the live database, so the remote
history is the accurate record and the filename is the thing out of step.
Renaming leaves the live project untouched.

Check that the rename preserves ordering relative to the other migrations, so
`npm run db:reset` still replays them in the same sequence. MCP timestamps have
so far landed just after the filename ones, so ordering has held.

Confirm the fix:

```bash
supabase db push --dry-run
```

It should report `Remote database is up to date.` The CLI needs to be linked
first (`supabase link --project-ref rqmrqndjbkpkewfpyegv`), which writes a
gitignored `supabase/.temp/`.

Reconcile before you commit, so the drift never reaches `main`. Four migrations
drifted on 2026-08-06 (`vendor_bill_payment_intent`, `rate_limits`,
`vendor_onboarding`, `encrypt_vendor_secrets`); the first three needed a
follow-up rename, the fourth was named correctly at commit time and needed
nothing.

## Committing

Scope commits with an explicit pathspec:

```bash
git commit -m "..." -- path/to/dir/
```

Multiple agent sessions sometimes share this checkout, so the index can gain
unrelated staged files between a `git status` check and the commit that follows
it. A pathspec keeps a commit to the files you meant to include.
