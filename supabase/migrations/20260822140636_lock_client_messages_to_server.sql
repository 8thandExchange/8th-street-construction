-- Client messages now accept attachments. Keep message creation on the
-- authenticated server path so a caller cannot forge attachment storage paths
-- or another author through the Data API.
drop policy if exists "Client writes to own project" on public.project_messages;
