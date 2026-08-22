-- Persist assistant conversations per user/project and keep a company-wide
-- approval audit. Writes stay on the authenticated server path; clients can
-- only read their own transcripts. Deleting a chat is a soft delete so the
-- approval record remains.

create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  surface text not null check (surface in ('admin', 'client')),
  project_id uuid references public.projects(id) on delete set null,
  title text not null default 'New conversation',
  model_messages jsonb not null default '[]'::jsonb,
  display_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index assistant_conversations_user_idx
  on public.assistant_conversations (user_id, last_message_at desc)
  where deleted_at is null;

create index assistant_conversations_project_idx
  on public.assistant_conversations (project_id, last_message_at desc)
  where deleted_at is null and project_id is not null;

create table public.assistant_audit_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.assistant_conversations(id) on delete set null,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  surface text not null check (surface in ('admin', 'client')),
  project_id uuid references public.projects(id) on delete set null,
  tool_name text not null,
  summary text not null,
  decision text not null check (decision in ('approved', 'declined', 'failed')),
  result_excerpt text,
  record_url text,
  created_at timestamptz not null default now()
);

create index assistant_audit_events_created_idx
  on public.assistant_audit_events (created_at desc);

create index assistant_audit_events_actor_idx
  on public.assistant_audit_events (actor_id, created_at desc);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_audit_events enable row level security;

create policy "Owner reads own assistant conversations"
on public.assistant_conversations
for select
using (user_id = auth.uid() and deleted_at is null);

create policy "Admin reads assistant audit events"
on public.assistant_audit_events
for select
using (public.is_admin());
