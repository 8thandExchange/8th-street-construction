import { createClient } from "@/lib/supabase/server";
import { BillingBrandHeader } from "@/components/billing/BillingBrandHeader";
import { BillingStatusBanner } from "@/components/billing/BillingStatusBanner";
import { InvoicingPortal, type InvoicingProject } from "@/components/billing/InvoicingPortal";
import { mercuryConfigured } from "@/lib/mercury/config";
import { stripeConfigured } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";

export default async function AdminInvoicingPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, slug, client_id, updated_at")
    .order("updated_at", { ascending: false });

  const clientIds = [...new Set((projects ?? []).map((p) => p.client_id).filter(Boolean))] as string[];

  const { data: profiles } = clientIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", clientIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email,
    ])
  );

  const projectIds = (projects ?? []).map((project) => project.id);
  const { data: invoices } = projectIds.length
    ? await supabase
        .from("invoices")
        .select("project_id, status, total, amount_paid")
        .in("project_id", projectIds)
    : { data: [] };

  const invoiceStats = new Map<
    string,
    { count: number; openCount: number; outstanding: number }
  >();

  for (const invoice of invoices ?? []) {
    const stats = invoiceStats.get(invoice.project_id) ?? {
      count: 0,
      openCount: 0,
      outstanding: 0,
    };
    stats.count += 1;
    if (invoice.status !== "paid" && invoice.status !== "void") {
      stats.openCount += 1;
      stats.outstanding += Math.max(
        0,
        Number(invoice.total) - Number(invoice.amount_paid ?? 0)
      );
    }
    invoiceStats.set(invoice.project_id, stats);
  }

  const portalProjects: InvoicingProject[] = (projects ?? []).map((project) => {
    const stats = invoiceStats.get(project.id) ?? {
      count: 0,
      openCount: 0,
      outstanding: 0,
    };

    return {
      id: project.id,
      title: project.title,
      slug: project.slug,
      clientName: project.client_id ? profileMap.get(project.client_id) ?? null : null,
      invoiceCount: stats.count,
      openCount: stats.openCount,
      outstanding: stats.outstanding,
    };
  });

  return (
    <div className="p-8 md:p-12 max-w-6xl">
      <BillingBrandHeader
        eyebrow="Invoicing"
        title="Send invoices"
        description="Create and send invoices through Mercury — free ACH bank transfer for clients. Open a project's billing page for the full payment schedule."
      />

      <BillingStatusBanner
        stripeReady={stripeConfigured()}
        mercuryReady={mercuryConfigured()}
        variant="admin"
      />

      <InvoicingPortal projects={portalProjects} />
    </div>
  );
}
