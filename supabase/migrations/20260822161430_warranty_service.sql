-- =====================================================================
-- WARRANTY AND SERVICE REQUESTS.
--
-- A service request is a post-close (or late-job) item with an owner,
-- an SLA, optional vendor assignment, evidence photos, and closeout
-- proof. Warranty is a defect we owe. Service is extra work.
-- =====================================================================

create table if not exists project_service_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  number int not null,
  title text not null,
  description text not null,
  location text,
  category text not null default 'warranty'
    check (category in ('warranty', 'service')),
  status text not null default 'open'
    check (status in ('draft', 'open', 'assigned', 'in_progress', 'waiting_client', 'resolved', 'closed', 'void')),
  owner_id uuid references profiles(id) on delete set null,
  vendor_id uuid references vendors(id) on delete set null,
  sla_due date,
  closeout_note text,
  closed_at timestamptz,
  closed_by uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);

create index if not exists project_service_requests_project_idx
  on project_service_requests(project_id, status);

create index if not exists project_service_requests_sla_idx
  on project_service_requests(sla_due, status);

comment on table project_service_requests is
  'Warranty and service items after (or near) closeout. Open rows have an owner and an SLA.';

create table if not exists project_service_images (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references project_service_requests(id) on delete cascade,
  uploaded_by uuid not null references profiles(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  kind text not null default 'evidence'
    check (kind in ('evidence', 'closeout')),
  created_at timestamptz not null default now()
);

create index if not exists project_service_images_request_idx
  on project_service_images(request_id, created_at);

comment on table project_service_images is
  'Evidence and closeout photos for a warranty or service request.';

alter table project_service_requests enable row level security;
alter table project_service_images enable row level security;

drop policy if exists "Admin manages service requests" on project_service_requests;
create policy "Admin manages service requests"
  on project_service_requests for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Clients read sent service requests" on project_service_requests;
create policy "Clients read sent service requests"
  on project_service_requests for select
  using (
    status <> 'draft'
    and public.client_has_project_portal_access(project_id)
  );

drop policy if exists "Admin manages service images" on project_service_images;
create policy "Admin manages service images"
  on project_service_images for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Clients read accessible service images" on project_service_images;
create policy "Clients read accessible service images"
  on project_service_images for select
  using (
    exists (
      select 1
      from public.project_service_requests req
      where req.id = request_id
        and req.status <> 'draft'
        and public.client_has_project_portal_access(req.project_id)
    )
  );

drop trigger if exists project_service_requests_updated_at on project_service_requests;
create trigger project_service_requests_updated_at
  before update on project_service_requests
  for each row execute function public.set_updated_at();
