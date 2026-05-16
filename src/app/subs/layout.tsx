import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

export default async function SubsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/subs");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    return <PortalShell email={profile.email} role="subcontractor">{children}</PortalShell>;
  }

  if (profile?.role !== "subcontractor") redirect("/");

  return <PortalShell email={profile.email} role="subcontractor">{children}</PortalShell>;
}
