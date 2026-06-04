-- Storage policies for project-updates bucket (used in Phase 2A)

set search_path = public, extensions;

create policy "Public reads project update files" on storage.objects
  for select using (bucket_id = 'project-updates');

create policy "Admin manages project update files" on storage.objects
  for all using (bucket_id = 'project-updates' and public.is_admin())
  with check (bucket_id = 'project-updates' and public.is_admin());

create policy "Client reads project update files" on storage.objects
  for select using (
    bucket_id = 'project-updates'
    and (
      public.is_admin()
      or exists (
        select 1 from project_updates u
        join projects p on p.id = u.project_id
        where (storage.foldername(name))[1] = u.project_id::text
          and p.client_id = auth.uid()
      )
    )
  );
