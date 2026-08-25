-- =====================================================================
-- NOTICE TO PROCEED.
--
-- Habitat partner and HUD HOME jobs are reimbursed by Augusta-Richmond
-- County, which will not honor a request for payment covering work billed
-- before it issues the notice to proceed. Billing early does not just risk
-- a late payment — it risks an unreimbursable draw.
--
-- Recording the notice here is what releases invoicing on those jobs.
-- Drafting an invoice stays available at any time; issuing one is what the
-- notice gates.
-- =====================================================================

alter table projects
  add column if not exists notice_to_proceed_at date,
  add column if not exists notice_to_proceed_note text,
  add column if not exists notice_to_proceed_document_id uuid
    references project_documents(id) on delete set null;

comment on column projects.notice_to_proceed_at is
  'Date Augusta issued the notice to proceed. Null on a Habitat/HUD HOME job
   means invoices may be drafted but not issued.';

comment on column projects.notice_to_proceed_note is
  'How the notice arrived — who sent it, reference number, any conditions.';

comment on column projects.notice_to_proceed_document_id is
  'The notice itself, filed as a project_documents row.';

create index if not exists projects_notice_to_proceed_idx
  on projects(notice_to_proceed_at)
  where notice_to_proceed_at is not null;
