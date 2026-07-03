import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { SettingField } from "@/components/admin/SettingField";

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

  await supabase
    .from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  revalidatePath("/");
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
        <span className="eyebrow">— Configuration</span>
        <h1 className="mt-2 app-h1">Site Settings</h1>
        <p className="mt-4 text-sm text-ink/65 max-w-2xl">
          Edit global site content with friendly controls. Text, numbers, and
          on/off toggles save automatically as valid values; structured settings
          fall back to a JSON editor. Changes are pushed to the marketing site on save.
        </p>
      </div>

      <div className="space-y-6">
        {(settings ?? []).map((setting) => (
          <form
            key={setting.key}
            action={updateSetting}
            className="bg-paper border border-ink/15 p-6 md:p-8"
          >
            <input type="hidden" name="key" value={setting.key} />
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="app-h2 !text-[16px] capitalize">
                {setting.key.replace(/_/g, " ")}
              </h2>
              <span className="text-xs text-stone-300 font-mono">
                Updated {new Date(setting.updated_at).toLocaleString()}
              </span>
            </div>
            <SettingField value={setting.value} />
            <button
              type="submit"
              className="mt-4 app-btn app-btn-primary"
            >
              Save
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
