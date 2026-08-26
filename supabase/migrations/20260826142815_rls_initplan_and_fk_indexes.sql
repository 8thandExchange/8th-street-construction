-- Performance hardening from the Supabase advisors, two mechanical fixes:
--
-- 1. auth_rls_initplan: wrap auth.uid()/user_role() in scalar subselects on the
--    16 flagged policies so Postgres evaluates them once per query instead of
--    once per row. Pure rewrite — each policy admits exactly the rows it did
--    before.
-- 2. unindexed_foreign_keys: covering indexes for every foreign key that had
--    none, so joins and parent-side deletes stop scanning child tables.

-- ── 1. RLS initplan rewrites ─────────────────────────────────────────────

alter policy "Owner reads own assistant conversations" on public.assistant_conversations
  using ((user_id = (select auth.uid())) and (deleted_at is null));

alter policy "Authenticated appends own audit entries" on public.audit_log
  with check (((select auth.uid()) is not null) and (actor_id = (select auth.uid())));

alter policy "Sub reads invited bid requests" on public.bid_requests
  using (exists (
    select 1
    from public.bids b
    join public.subcontractors s on s.id = b.subcontractor_id
    where b.bid_request_id = bid_requests.id and s.profile_id = (select auth.uid())
  ));

alter policy "Sub reads own bids" on public.bids
  using (exists (
    select 1 from public.subcontractors s
    where s.id = bids.subcontractor_id and s.profile_id = (select auth.uid())
  ));

alter policy "Client reads own project city budget" on public.city_budget_lines
  using (exists (
    select 1 from public.projects p
    where p.id = city_budget_lines.project_id and p.client_id = (select auth.uid())
  ));

alter policy "Authenticated reads active base plans" on public.house_base_plans
  using ((active = true) and ((select auth.uid()) is not null));

alter policy "Client reads own invoice attachments" on public.invoice_attachments
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_attachments.invoice_id
      and (
        i.client_id = (select auth.uid())
        or exists (
          select 1 from public.projects p
          where p.id = i.project_id and p.client_id = (select auth.uid())
        )
      )
  ));

alter policy "Client reads own invoices" on public.invoices
  using (client_id = (select auth.uid()));

alter policy "Own profile read" on public.profiles
  using ((select auth.uid()) = id);

alter policy "Own profile update" on public.profiles
  using ((select auth.uid()) = id)
  with check (((select auth.uid()) = id) and (role = (select public.user_role())));

alter policy "Client reads own portal memberships" on public.project_portal_members
  using (profile_id = (select auth.uid()));

alter policy "Users manage own push subscriptions" on public.push_subscriptions
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

alter policy "Client reads visible selection options" on public.selection_options
  using (exists (
    select 1
    from public.project_selections s
    join public.projects p on p.id = s.project_id
    where s.id = selection_options.selection_id
      and s.client_visible = true
      and p.client_id = (select auth.uid())
  ));

alter policy "Own stripe customer read" on public.stripe_customers
  using (profile_id = (select auth.uid()));

alter policy "Sub reads own record" on public.subcontractors
  using (profile_id = (select auth.uid()));

alter policy "Sub updates own record" on public.subcontractors
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- ── 2. Covering indexes for unindexed foreign keys ───────────────────────

create index if not exists idx_assistant_audit_events_conversation_id on public.assistant_audit_events (conversation_id);
create index if not exists idx_assistant_audit_events_project_id on public.assistant_audit_events (project_id);
create index if not exists idx_bid_request_reviews_created_by on public.bid_request_reviews (created_by);
create index if not exists idx_bid_request_reviews_recommended_bid_id on public.bid_request_reviews (recommended_bid_id);
create index if not exists idx_bid_requests_created_by on public.bid_requests (created_by);
create index if not exists idx_bid_requests_estimate_line_id on public.bid_requests (estimate_line_id);
create index if not exists idx_bid_requests_scope_template_id on public.bid_requests (scope_template_id);
create index if not exists idx_bids_document_id on public.bids (document_id);
create index if not exists idx_change_orders_client_signed_by on public.change_orders (client_signed_by);
create index if not exists idx_change_orders_created_by on public.change_orders (created_by);
create index if not exists idx_consultations_assigned_to on public.consultations (assigned_to);
create index if not exists idx_consultations_lead_id on public.consultations (lead_id);
create index if not exists idx_invoice_attachments_line_item_id on public.invoice_attachments (line_item_id);
create index if not exists idx_invoice_attachments_uploaded_by on public.invoice_attachments (uploaded_by);
create index if not exists idx_invoice_line_items_change_order_id on public.invoice_line_items (change_order_id);
create index if not exists idx_invoice_line_items_city_budget_line_id on public.invoice_line_items (city_budget_line_id);
create index if not exists idx_invoices_client_id on public.invoices (client_id);
create index if not exists idx_invoices_created_by on public.invoices (created_by);
create index if not exists idx_leads_assigned_to on public.leads (assigned_to);
create index if not exists idx_meeting_action_items_agenda_item_id on public.meeting_action_items (agenda_item_id);
create index if not exists idx_meeting_action_items_created_by on public.meeting_action_items (created_by);
create index if not exists idx_meeting_action_items_project_task_id on public.meeting_action_items (project_task_id);
create index if not exists idx_meeting_action_updates_author_profile_id on public.meeting_action_updates (author_profile_id);
create index if not exists idx_meeting_agenda_items_carried_from_item_id on public.meeting_agenda_items (carried_from_item_id);
create index if not exists idx_meeting_decisions_agenda_item_id on public.meeting_decisions (agenda_item_id);
create index if not exists idx_meeting_series_project_id on public.meeting_series (project_id);
create index if not exists idx_meetings_approved_by on public.meetings (approved_by);
create index if not exists idx_meetings_created_by on public.meetings (created_by);
create index if not exists idx_meetings_prepared_by on public.meetings (prepared_by);
create index if not exists idx_payment_draws_invoice_id on public.payment_draws (invoice_id);
create index if not exists idx_payment_draws_milestone_id on public.payment_draws (milestone_id);
create index if not exists idx_portal_access_requests_reviewed_by on public.portal_access_requests (reviewed_by);
create index if not exists idx_project_contracts_client_signed_by on public.project_contracts (client_signed_by);
create index if not exists idx_project_contracts_created_by on public.project_contracts (created_by);
create index if not exists idx_project_contracts_signed_document_id on public.project_contracts (signed_document_id);
create index if not exists idx_project_contracts_template_id on public.project_contracts (template_id);
create index if not exists idx_project_cost_snapshots_captured_by on public.project_cost_snapshots (captured_by);
create index if not exists idx_project_cost_snapshots_estimate_line_id on public.project_cost_snapshots (estimate_line_id);
create index if not exists idx_project_crew_weeks_created_by on public.project_crew_weeks (created_by);
create index if not exists idx_project_daily_logs_author_id on public.project_daily_logs (author_id);
create index if not exists idx_project_documents_uploaded_by on public.project_documents (uploaded_by);
create index if not exists idx_project_estimate_lines_bid_request_id on public.project_estimate_lines (bid_request_id);
create index if not exists idx_project_estimate_lines_template_line_id on public.project_estimate_lines (template_line_id);
create index if not exists idx_project_images_is_before_after_pair on public.project_images (is_before_after_pair);
create index if not exists idx_project_inspections_reinspection_of on public.project_inspections (reinspection_of);
create index if not exists idx_project_lot_fit_reviews_base_plan_id on public.project_lot_fit_reviews (base_plan_id);
create index if not exists idx_project_lot_fit_reviews_created_by on public.project_lot_fit_reviews (created_by);
create index if not exists idx_project_messages_author_id on public.project_messages (author_id);
create index if not exists idx_project_plan_sets_client_signed_by on public.project_plan_sets (client_signed_by);
create index if not exists idx_project_plan_sets_created_by on public.project_plan_sets (created_by);
create index if not exists idx_project_portal_members_granted_by on public.project_portal_members (granted_by);
create index if not exists idx_project_proposals_created_by on public.project_proposals (created_by);
create index if not exists idx_project_reminder_log_project_id on public.project_reminder_log (project_id);
create index if not exists idx_project_rfis_answered_by on public.project_rfis (answered_by);
create index if not exists idx_project_rfis_created_by on public.project_rfis (created_by);
create index if not exists idx_project_rfis_milestone_id on public.project_rfis (milestone_id);
create index if not exists idx_project_rfis_plan_set_id on public.project_rfis (plan_set_id);
create index if not exists idx_project_selections_created_by on public.project_selections (created_by);
create index if not exists idx_project_selections_selected_option_id on public.project_selections (selected_option_id);
create index if not exists idx_project_service_images_uploaded_by on public.project_service_images (uploaded_by);
create index if not exists idx_project_service_requests_closed_by on public.project_service_requests (closed_by);
create index if not exists idx_project_service_requests_created_by on public.project_service_requests (created_by);
create index if not exists idx_project_service_requests_owner_id on public.project_service_requests (owner_id);
create index if not exists idx_project_service_requests_vendor_id on public.project_service_requests (vendor_id);
create index if not exists idx_project_submittals_created_by on public.project_submittals (created_by);
create index if not exists idx_project_submittals_decided_by on public.project_submittals (decided_by);
create index if not exists idx_project_submittals_document_id on public.project_submittals (document_id);
create index if not exists idx_project_submittals_plan_set_id on public.project_submittals (plan_set_id);
create index if not exists idx_project_takeoff_values_template_takeoff_id on public.project_takeoff_values (template_takeoff_id);
create index if not exists idx_project_tasks_created_by on public.project_tasks (created_by);
create index if not exists idx_project_tasks_milestone_id on public.project_tasks (milestone_id);
create index if not exists idx_project_update_images_update_id on public.project_update_images (update_id);
create index if not exists idx_project_updates_author_id on public.project_updates (author_id);
create index if not exists idx_projects_notice_to_proceed_document_id on public.projects (notice_to_proceed_document_id);
create index if not exists idx_projects_project_manager_id on public.projects (project_manager_id);
create index if not exists idx_punch_list_comments_author_id on public.punch_list_comments (author_id);
create index if not exists idx_punch_list_images_uploaded_by on public.punch_list_images (uploaded_by);
create index if not exists idx_punch_list_items_created_by on public.punch_list_items (created_by);
create index if not exists idx_purchase_orders_bid_id on public.purchase_orders (bid_id);
create index if not exists idx_purchase_orders_created_by on public.purchase_orders (created_by);
create index if not exists idx_site_settings_updated_by on public.site_settings (updated_by);
create index if not exists idx_task_checklist_items_done_by on public.task_checklist_items (done_by);
create index if not exists idx_testimonials_project_id on public.testimonials (project_id);
create index if not exists idx_vendor_bills_created_by on public.vendor_bills (created_by);
create index if not exists idx_vendor_invites_created_by on public.vendor_invites (created_by);
create index if not exists idx_volunteer_events_project_id on public.volunteer_events (project_id);
create index if not exists idx_workflow_events_actor_id on public.workflow_events (actor_id);
