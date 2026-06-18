import { createAdminClient } from "@/lib/supabase/admin";
import { mercuryConfigured } from "./config";
import { getMercuryInvoice } from "./invoices";

function revalidateBilling(projectId: string) {
  // Dynamic import avoids circular deps in server actions
  return import("next/cache").then(({ revalidatePath }) => {
    revalidatePath(`/admin/projects/${projectId}/billing`);
    revalidatePath(`/client/projects/${projectId}/billing`);
  });
}

export async function markInvoicePaidLocally(
  admin: ReturnType<typeof createAdminClient>,
  invoiceId: string,
  projectId: string
) {
  const { data: inv } = await admin
    .from("invoices")
    .select("total")
    .eq("id", invoiceId)
    .single();

  if (!inv) return false;

  await admin
    .from("invoices")
    .update({
      status: "paid",
      amount_paid: inv.total,
      paid_at: new Date().toISOString(),
      mercury_status: "Paid",
    })
    .eq("id", invoiceId);

  await admin
    .from("payment_draws")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("invoice_id", invoiceId);

  await revalidateBilling(projectId);
  return true;
}

export async function syncMercuryInvoiceById(invoiceId: string) {
  if (!mercuryConfigured()) return { synced: false, reason: "not_configured" as const };

  const admin = createAdminClient();
  const { data: invoice } = await admin
    .from("invoices")
    .select("id, project_id, status, mercury_invoice_id")
    .eq("id", invoiceId)
    .single();

  if (!invoice?.mercury_invoice_id || invoice.status === "paid") {
    return { synced: false, reason: "skip" as const };
  }

  const mercury = await getMercuryInvoice(invoice.mercury_invoice_id);

  await admin
    .from("invoices")
    .update({ mercury_status: mercury.status })
    .eq("id", invoice.id);

  if (mercury.status === "Paid") {
    await markInvoicePaidLocally(admin, invoice.id, invoice.project_id);
    return { synced: true, status: "paid" as const };
  }

  return { synced: true, status: mercury.status };
}

export async function syncProjectMercuryInvoices(projectId: string) {
  if (!mercuryConfigured()) return { checked: 0, paid: 0 };

  const admin = createAdminClient();
  const { data: open } = await admin
    .from("invoices")
    .select("id")
    .eq("project_id", projectId)
    .not("mercury_invoice_id", "is", null)
    .in("status", ["sent", "viewed", "partial", "overdue"]);

  let paid = 0;
  for (const row of open ?? []) {
    try {
      const result = await syncMercuryInvoiceById(row.id);
      if (result.synced && result.status === "paid") paid += 1;
    } catch {
      // continue
    }
  }

  return { checked: open?.length ?? 0, paid };
}

export async function syncAllOpenMercuryInvoices() {
  if (!mercuryConfigured()) {
    return { checked: 0, paid: 0, errors: 0, reason: "not_configured" as const };
  }

  const admin = createAdminClient();
  const { data: open } = await admin
    .from("invoices")
    .select("id")
    .not("mercury_invoice_id", "is", null)
    .in("status", ["sent", "viewed", "partial", "overdue"]);

  let paid = 0;
  let errors = 0;

  for (const row of open ?? []) {
    try {
      const result = await syncMercuryInvoiceById(row.id);
      if (result.synced && result.status === "paid") paid += 1;
    } catch {
      errors += 1;
    }
  }

  return { checked: open?.length ?? 0, paid, errors };
}
