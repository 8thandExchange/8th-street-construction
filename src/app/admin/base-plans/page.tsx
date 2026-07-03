import { createClient } from "@/lib/supabase/server";
import { BasePlanCard } from "@/components/admin/BasePlanCard";
import { NewBasePlanForm } from "@/components/admin/NewBasePlanForm";

export const dynamic = "force-dynamic";

export default async function BasePlansPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("house_base_plans")
    .select(
      "id, plan_number, name, designer, variant, sheet_count, storage_path, file_type, file_size_bytes, square_footage, bedrooms, bathrooms, stories, display_order, active, notes, created_at, updated_at"
    )
    .order("display_order");

  const nextDisplayOrder =
    (plans ?? []).reduce((max, p) => Math.max(max, p.display_order), 0) + 1;

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="app-h1">Standard House Plans</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Company catalog of base models. Upload PDFs here or assign a base plan to each lot on the
          project overview. When lot-specific revisions are ready, create a versioned plan set on
          the project Plans tab and send it to the client for electronic sign-off.
        </p>
      </div>

      <NewBasePlanForm nextDisplayOrder={nextDisplayOrder} />

      <div className="space-y-4">
        {(plans ?? []).map((plan) => (
          <BasePlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      {!plans?.length && (
        <p className="text-ink/50 italic py-16 text-center border border-dashed border-ink/20">
          No standard plans in the catalog yet. Click <strong>Add Standard Plan</strong> above to
          upload your first PDF.
        </p>
      )}
    </div>
  );
}
