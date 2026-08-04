"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import {
  HABITAT_608_MACON_CITY_BUDGET,
  isHabitat608Project,
} from "@/lib/billing/constants";

function revalidateBilling(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/billing`);
  revalidatePath(`/client/projects/${projectId}/billing`);
}

/** One-click: load the city-approved H-87 budget for 608 Macon. */
export async function loadCityBudget608(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));

  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();
  if (!project) throw new Error("Project not found.");
  if (!isHabitat608Project(project.slug ?? "")) {
    throw new Error("This preset is the city budget for 608 Macon Ave only.");
  }

  const { count } = await supabase
    .from("city_budget_lines")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if ((count ?? 0) > 0) throw new Error("This job already has a city budget loaded.");

  const { error } = await supabase.from("city_budget_lines").insert(
    HABITAT_608_MACON_CITY_BUDGET.map((line, index) => ({
      project_id: projectId,
      city_number: line.city_number,
      description: line.description,
      budget_amount: line.budget_amount,
      display_order: index,
    }))
  );
  if (error) throw new Error(error.message);
  revalidateBilling(projectId);
}

export async function addCityBudgetLine(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const cityNumber = Number(formData.get("city_number"));
  const description = String(formData.get("description") ?? "").trim();
  const budgetAmount = Number(formData.get("budget_amount"));

  if (!Number.isInteger(cityNumber) || cityNumber <= 0) {
    throw new Error("City # must be a whole number.");
  }
  if (!description) throw new Error("Description is required.");
  if (!Number.isFinite(budgetAmount) || budgetAmount < 0) {
    throw new Error("Budget amount must be a number.");
  }

  const { error } = await supabase.from("city_budget_lines").insert({
    project_id: projectId,
    city_number: cityNumber,
    description,
    budget_amount: budgetAmount,
    display_order: cityNumber,
  });
  if (error) {
    throw new Error(
      error.message.includes("duplicate")
        ? `City # ${cityNumber} already exists on this job.`
        : error.message
    );
  }
  revalidateBilling(projectId);
}

export async function updateCityBudgetLine(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const lineId = String(formData.get("line_id"));
  const description = String(formData.get("description") ?? "").trim();
  const budgetAmount = Number(formData.get("budget_amount"));

  if (!description) throw new Error("Description is required.");
  if (!Number.isFinite(budgetAmount) || budgetAmount < 0) {
    throw new Error("Budget amount must be a number.");
  }

  const { error } = await supabase
    .from("city_budget_lines")
    .update({ description, budget_amount: budgetAmount })
    .eq("id", lineId)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);
  revalidateBilling(projectId);
}

export async function deleteCityBudgetLine(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const lineId = String(formData.get("line_id"));

  const { error } = await supabase
    .from("city_budget_lines")
    .delete()
    .eq("id", lineId)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);
  revalidateBilling(projectId);
}
