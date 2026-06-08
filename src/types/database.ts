/**
 * Database type definitions for Supabase.
 *
 * Generate fresh types by running (after `supabase login` and linking your project):
 *
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
 *
 * Or locally:
 *
 *   npm run db:types
 *
 * This file is a minimal placeholder; replace with generated types after first push.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "admin" | "client" | "subcontractor";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal_sent"
  | "won"
  | "lost"
  | "archived";

export type ProjectCategory =
  | "custom_home"
  | "residential_renovation"
  | "commercial_new_build"
  | "tenant_buildout"
  | "design_build"
  | "historic_restoration";

export type ProjectStatus =
  | "draft"
  | "pre_construction"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "archived";

export type MilestoneStatus = "pending" | "in_progress" | "completed" | "blocked";

export type ConsultationStatus =
  | "requested"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type AccessRequestStatus = "pending" | "approved" | "denied";

export interface Profile {
  id: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface PortalAccessRequest {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  requested_role: UserRole;
  portal_path: string | null;
  message: string | null;
  status: AccessRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  project_type: ProjectCategory | null;
  message: string;
  status: LeadStatus;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  contacted_at: string | null;
  qualified_at: string | null;
  closed_at: string | null;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  category: ProjectCategory;
  status: ProjectStatus;
  excerpt: string | null;
  narrative: string | null;
  hero_image_url: string | null;
  location: string | null;
  year_completed: number | null;
  square_footage: number | null;
  budget_range: string | null;
  client_id: string | null;
  project_manager_id: string | null;
  start_date: string | null;
  target_completion_date: string | null;
  actual_completion_date: string | null;
  contract_value: number | null;
  internal_notes: string | null;
  meta_description: string | null;
  display_order: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface ProjectImage {
  id: string;
  project_id: string;
  storage_path: string;
  public_url: string;
  caption: string | null;
  alt_text: string | null;
  display_order: number;
  is_hero: boolean;
  visibility: "public" | "client_only" | "internal";
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  display_order: number;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  client_name: string;
  client_title: string | null;
  quote: string;
  rating: number | null;
  project_id: string | null;
  avatar_url: string | null;
  published: boolean;
  featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  id: string;
  lead_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  preferred_date: string | null;
  preferred_time_window: string | null;
  meeting_type: string;
  project_type: ProjectCategory | null;
  project_location: string | null;
  notes: string | null;
  status: ConsultationStatus;
  confirmed_at: string | null;
  confirmed_for: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export type PlanSetStatus = "draft" | "pending_client" | "approved" | "revision_requested";

export type PlanFileKind = "plan" | "rendering" | "elevation" | "site_plan" | "other";

export interface ProjectPlanSet {
  id: string;
  project_id: string;
  version: number;
  title: string;
  description: string | null;
  status: PlanSetStatus;
  jurisdiction_key: string | null;
  regulations_snapshot: Json | null;
  created_by: string | null;
  sent_to_client_at: string | null;
  client_signed_at: string | null;
  client_signed_by: string | null;
  client_signature_text: string | null;
  client_acknowledgment: string | null;
  revision_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPlanFile {
  id: string;
  plan_set_id: string;
  title: string;
  description: string | null;
  kind: PlanFileKind;
  storage_path: string;
  file_type: string | null;
  file_size_bytes: number | null;
  display_order: number;
  created_at: string;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  full_description: string | null;
  icon: string | null;
  display_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}
