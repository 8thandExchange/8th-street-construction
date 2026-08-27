import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { SITE_CONTACT_TAG } from "@/lib/site-contact";
import { SettingField } from "@/components/admin/SettingField";
import { ContactSettingField } from "@/components/admin/ContactSettingField";
import { isContactValue } from "@/lib/contact-value";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const dynamic = "force-dynamic";

async function updateSetting(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const key = String(formData.get("key"));
  const valueRaw = String(formData.get("value"));

  let value: unknown;
  try {
    value = JSON.parse(valueRaw);
  } catch {
    throw new Error(`Invalid JSON for setting "${key}"`);
  }

  // site_settings is keyed (org_id, key); the acting admin's JWT claim
  // names the tenant. RLS enforces the write itself.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = user?.app_metadata?.org_id;
  if (typeof orgId !== "string" || !orgId) {
    throw new Error("No organization claim on this session.");
  }

  await supabase
    .from("site_settings")
    .upsert(
      { org_id: orgId, key, value, updated_at: new Date().toISOString() },
      { onConflict: "org_id,key" }
    );

  revalidateTag(SITE_CONTACT_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}

export default async function AdminSettings() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("*")
    .order("key");

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-4xl">
      <div className="mb-10">
        <span className="app-label">— Configuration</span>
        <h1 className="mt-2 app-h1">Site Settings</h1>
        <p className="mt-4 text-sm app-muted max-w-2xl">
          Edit global site content with friendly controls. Text, numbers, and
          on/off toggles save automatically as valid values; structured settings
          fall back to a JSON editor. Changes are pushed to the marketing site on save.
        </p>
      </div>

      <div className="mb-10 flex flex-wrap gap-4">
        <Link
          href="/admin/settings/cost-codes"
          className="text-[13px] font-medium text-copper hover:underline"
        >
          Cost code template →
        </Link>
        <Link
          href="/admin/settings/scopes"
          className="text-[13px] font-medium text-copper hover:underline"
        >
          Scope library →
        </Link>
      </div>

      <div className="space-y-6">
        {(settings ?? []).map((setting) => (
          <form
            key={setting.key}
            action={updateSetting}
            className="app-card p-6 md:p-8"
          >
            <input type="hidden" name="key" value={setting.key} />
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="app-h2 !text-[16px] capitalize">
                {setting.key.replace(/_/g, " ")}
              </h2>
              <span className="text-xs app-muted">
                Updated {new Date(setting.updated_at).toLocaleString()}
              </span>
            </div>
            {setting.key === "contact" && isContactValue(setting.value) ? (
              <ContactSettingField value={setting.value} />
            ) : (
              <SettingField value={setting.value} />
            )}
            <SubmitButton className="mt-4 app-btn app-btn-primary">Save</SubmitButton>
          </form>
        ))}
      </div>
    </div>
  );
}
