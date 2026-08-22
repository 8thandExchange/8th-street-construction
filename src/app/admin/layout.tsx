import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPathGuard } from "@/components/admin/AdminPathGuard";
import { AdminOfflineSync } from "@/components/admin/AdminOfflineSync";
import { SkipLink } from "@/components/a11y/SkipLink";
import { parseStaffScope } from "@/lib/auth/staff-scope";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, staff_scope")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const staffScope = parseStaffScope(profile.staff_scope);

  return (
    <div className="app-shell min-h-screen lg:flex">
      <SkipLink />
      <AdminOfflineSync />
      <AdminSidebar userEmail={profile.email} staffScope={staffScope} />
      <main id="main-content" className="min-w-0 flex-1" tabIndex={-1}>
        <AdminPathGuard staffScope={staffScope}>{children}</AdminPathGuard>
      </main>
    </div>
  );
}
