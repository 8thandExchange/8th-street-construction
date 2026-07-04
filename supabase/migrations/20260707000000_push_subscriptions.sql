-- Web push subscriptions for the installable portal app (PWA).
create table push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index push_subscriptions_profile_idx on push_subscriptions(profile_id);

alter table push_subscriptions enable row level security;

create policy "Admin manages push subscriptions" on push_subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Users manage own push subscriptions" on push_subscriptions
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
