-- Deliberate advisor remediations. Writes stay on the server path; helper
-- functions remain SECURITY DEFINER for RLS, but anonymous callers can no
-- longer execute them over the Data API.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Service-role counters: keep RLS on and state the deny explicitly so the
-- "enabled with no policy" finding is no longer an accident.
drop policy if exists "No client access to rate limits" on public.rate_limits;
create policy "No client access to rate limits"
on public.rate_limits
for all
using (false)
with check (false);

-- RLS helpers must stay callable by signed-in roles. Revoke the default
-- PUBLIC/anon grants that expose them as anonymous RPCs.
revoke all on function public.is_admin() from public, anon;
revoke all on function public.user_role() from public, anon;
revoke all on function public.client_portal_is_active() from public, anon;
revoke all on function public.client_has_project_portal_access(uuid) from public, anon;
revoke all on function public.sync_po_line_cost_division() from public, anon, authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.user_role() to authenticated;
grant execute on function public.client_portal_is_active() to authenticated;
grant execute on function public.client_has_project_portal_access(uuid) to authenticated;

-- Trigger-only: never an RPC.
revoke all on function public.sync_po_line_cost_division() from public, anon, authenticated;

create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'citext' and n.nspname = 'public'
  ) then
    execute 'alter extension citext set schema extensions';
  end if;
end;
$$;
