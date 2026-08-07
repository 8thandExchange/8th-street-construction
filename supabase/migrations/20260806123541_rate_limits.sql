-- Per-IP / per-user rate limiting for publicly reachable API routes.
--
-- Background: the app had no rate limiting of any kind. /api/leads and
-- /api/bookings are open to the internet and each one inserts a row AND fires
-- two Resend emails, so a trivial script could flood the leads table and burn
-- the sending domain's reputation. The authenticated AI routes (/api/assistant,
-- /api/client-assistant) bill Anthropic tokens per request, so they get a
-- per-user cap as a blast radius limit on a stolen session.
--
-- This is deliberately a table and not an in-process Map: the app runs on
-- Vercel serverless, where each invocation may be a fresh process, so an
-- in-memory counter protects almost nothing. Supabase is already in the stack,
-- and the routes being limited are already doing a Supabase round-trip, so the
-- added cost is one more call on a request that was hitting Postgres anyway.

create table if not exists public.rate_limits (
  key text primary key,
  request_count integer not null default 0,
  window_start timestamptz not null default now()
);

comment on table public.rate_limits is
  'Fixed-window request counters keyed by "<scope>:<ip-or-user-id>". Written only by the service role via check_rate_limit(). Rows are self-expiring: a stale row is reset on next use, and check_rate_limit() prunes long-dead rows probabilistically.';

-- RLS on with no policies: service role bypasses it, everyone else gets nothing.
alter table public.rate_limits enable row level security;

-- Supports the probabilistic prune below.
create index if not exists rate_limits_window_start_idx
  on public.rate_limits (window_start);

/*
 * Atomically increment the counter for p_key and report whether the caller is
 * under p_limit for the current p_window_seconds window.
 *
 * The check and the increment are a single INSERT .. ON CONFLICT so concurrent
 * serverless invocations cannot both read "4 of 5" and both proceed. If the
 * stored window has already elapsed, the row resets to 1 rather than being
 * deleted and re-inserted, which keeps this to one statement.
 *
 * Returns allowed=false with retry_after in whole seconds once the limit is
 * exceeded. Requests that arrive while blocked keep incrementing the count but
 * do NOT extend the window -- being over the limit delays you until the window
 * rolls over, it does not compound.
 */
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window interval := make_interval(secs => p_window_seconds);
  v_count integer;
  v_window_start timestamptz;
begin
  -- Both SET expressions read rl.* as the PRE-update row, so the two CASEs
  -- always agree on whether the window has rolled over.
  insert into public.rate_limits as rl (key, request_count, window_start)
  values (p_key, 1, v_now)
  on conflict (key) do update
    set request_count = case
          when rl.window_start < v_now - v_window then 1
          else rl.request_count + 1
        end,
        window_start = case
          when rl.window_start < v_now - v_window then v_now
          else rl.window_start
        end
  returning rl.request_count, rl.window_start into v_count, v_window_start;

  -- Keep the table from growing without bound as IPs come and go. Runs on ~1%
  -- of calls; anything untouched for a day is far past any window we use.
  if random() < 0.01 then
    delete from public.rate_limits
    where window_start < v_now - interval '1 day';
  end if;

  if v_count > p_limit then
    return query select
      false,
      greatest(
        1,
        ceil(extract(epoch from (v_window_start + v_window - v_now)))::integer
      );
  else
    return query select true, 0;
  end if;
end;
$$;

comment on function public.check_rate_limit(text, integer, integer) is
  'Atomic fixed-window rate limit check-and-increment. Returns (allowed, retry_after_seconds). Called by lib/rate-limit.ts with the service-role client.';

-- Counters are service-role only. Revoke the default grant so a browser client
-- can't call this and burn through someone else's budget, then grant back
-- explicitly to the role the app actually uses.
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
