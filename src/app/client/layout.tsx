import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/client");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    return <PortalShell email={profile.email} role="client">{children}</PortalShell>;
  }

  if (profile?.role !== "client") redirect("/");

  return <PortalShell email={profile.email} role="client">{children}</PortalShell>;
}
