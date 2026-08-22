"use server";

import { createClient } from "@/lib/supabase/server";
import {
  parseStaffScope,
  staffCanSeeProject,
  staffHas,
  type StaffCapability,
} from "@/lib/auth/staff-scope";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, email, first_name, last_name, staff_scope")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Unauthorized");
  const staffScope = parseStaffScope(profile.staff_scope);
  return { supabase, user, profile: { ...profile, staff_scope: staffScope } };
}

export async function requireCapability(capability: StaffCapability) {
  const ctx = await requireAdmin();
  if (!staffHas(ctx.profile.staff_scope, capability)) {
    throw new Error("This login cannot do that.");
  }
  return ctx;
}

export async function requireProjectStaff(projectId: string) {
  const ctx = await requireAdmin();
  const { data: project } = await ctx.supabase
    .from("projects")
    .select("id, project_manager_id, superintendent_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) throw new Error("Project not found");
  if (!staffCanSeeProject(ctx.profile.staff_scope, ctx.user.id, project)) {
    throw new Error("This job is not assigned to you.");
  }
  return { ...ctx, project };
}
