-- Clients can review proposals that have actually been sent to a project
-- available in their portal. Responses are written through the authenticated
-- server action, which re-verifies access and updates with the service role;
-- there is intentionally no broad client UPDATE policy on commercial terms.
create policy "Client reads sent project proposals"
on public.project_proposals
for select
to authenticated
using (
  status <> 'draft'
  and public.client_has_project_portal_access(project_id)
);
