import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoneyExact } from "@/lib/billing/constants";
import { isHabitatProject } from "@/lib/project/funding";
import { sendInvoicePaidEmail } from "@/lib/email/invoice-notify";
import { mercuryConfigured } from "./config";
import { getMercuryInvoice } from "./invoices";
import { pushInvoiceToMercury } from "./service";

async function revalidateBilling(projectId: string) {
  // Dynamic import avoids circular deps in server actions. Swallow errors:
  // when a sync runs during a page render (client billing page loads),
  // revalidatePath throws — the page is already rendering fresh data.
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/admin/projects/${projectId}/billing`);
    revalidatePath(`/client/projects/${projectId}/billing`);
  } catch {
    // not allowed during render — safe to skip
  }
}

export async function markInvoicePaidLocally(
  admin: ReturnType<typeof createAdminClient>,
  invoiceId: string,
  projectId: string,
  options?: { notifyClient?: boolean }
) {
  const { data: inv } = await admin
    .from("invoices")
    .select("total, invoice_number, title, client_id, status")
    .eq("id", invoiceId)
    .single();

  if (!inv) return false;
  const wasAlreadyPaid = inv.status === "paid";

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

  if (!wasAlreadyPaid && options?.notifyClient !== false && inv.client_id) {
    const [{ data: project }, { data: client }] = await Promise.all([
      admin.from("projects").select("title").eq("id", projectId).single(),
      admin.from("profiles").select("email, first_name").eq("id", inv.client_id).single(),
    ]);
    if (client?.email) {
      await sendInvoicePaidEmail({
        to: client.email,
        firstName: client.first_name || "",
        projectTitle: project?.title ?? "Your project",
        projectId,
        invoiceNumber: inv.invoice_number,
        invoiceTitle: inv.title ?? "Invoice",
        amountFormatted: formatMoneyExact(Number(inv.total)),
      });
    }
  }

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

/**
 * Backfill: push any SENT invoice that never made it to Mercury (e.g. sent
 * while Mercury was unreachable) so it gets its ACH pay link. Runs on the
 * billing pages and the cron — self-healing, no button needed.
 */
export async function backfillMissingMercuryInvoices(projectId?: string) {
  if (!mercuryConfigured()) return { pushed: 0 };

  const admin = createAdminClient();
  let query = admin
    .from("invoices")
    .select("id, invoice_number, title, total, due_date, project_id, client_id")
    .is("mercury_invoice_id", null)
    .in("status", ["sent", "viewed", "overdue"]);
  if (projectId) query = query.eq("project_id", projectId);
  const { data: missing } = await query;

  let pushed = 0;
  for (const invoice of missing ?? []) {
    try {
      const [{ data: project }, { data: lines }] = await Promise.all([
        admin
          .from("projects")
          .select("id, title, client_id, funding_type")
          .eq("id", invoice.project_id)
          .single(),
        admin
          .from("invoice_line_items")
          .select("description, quantity, unit_amount")
          .eq("invoice_id", invoice.id)
          .order("display_order"),
      ]);
      const clientId = invoice.client_id ?? project?.client_id ?? null;
      if (!clientId) continue;
      const { data: client } = await admin
        .from("profiles")
        .select("email, first_name, last_name")
        .eq("id", clientId)
        .single();
      if (!client?.email) continue;

      const mercury = await pushInvoiceToMercury({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        title: invoice.title ?? `Invoice ${invoice.invoice_number}`,
        amount: Number(invoice.total),
        dueDate: invoice.due_date,
        lineItems: (lines ?? []).map((li) => ({
          description: li.description,
          quantity: Number(li.quantity),
          unit_amount: Number(li.unit_amount),
        })),
        projectId: invoice.project_id,
        projectTitle: project?.title ?? "Project",
        clientId,
        clientEmail: client.email,
        clientName:
          [client.first_name, client.last_name].filter(Boolean).join(" ") || client.email,
        payerMemo: isHabitatProject(project ?? {})
          ? "Habitat for Humanity draw payment — ACH bank transfer."
          : undefined,
      });
      if (mercury) {
        pushed += 1;
        console.log(`Mercury backfill: ${invoice.invoice_number} -> slug ${mercury.slug}`);
      }
    } catch (err) {
      console.error(`Mercury backfill failed for ${invoice.invoice_number}:`, err);
    }
  }
  return { pushed };
}

export async function syncProjectMercuryInvoices(projectId: string) {
  if (!mercuryConfigured()) return { checked: 0, paid: 0 };

  await backfillMissingMercuryInvoices(projectId);

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

  await backfillMissingMercuryInvoices();

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
