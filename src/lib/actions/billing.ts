"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { formatMoney } from "@/lib/billing/constants";
import { sendInvoiceReadyEmail } from "@/lib/email/invoice-notify";
import {
  getDrawTemplateForProject,
  HABITAT_608_MACON,
  isHabitat608Project,
  type DrawTemplateLine,
} from "@/lib/billing/constants";
import { mercuryConfigured } from "@/lib/mercury/config";
import { getMercuryPayLink, pushInvoiceToMercury } from "@/lib/mercury/service";
import { markInvoicePaidLocally } from "@/lib/mercury/sync";
import { getSiteUrl } from "@/lib/brand/assets";

function formatDueDateLabel(due: string | null) {
  if (!due) return null;
  return new Date(`${due}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/billing`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/client/projects/${projectId}/billing`);
  revalidatePath("/admin/invoicing");
}

type CustomLineItem = {
  description: string;
  quantity: number;
  unit_amount: number;
};

async function nextInvoiceNumber(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  projectId: string
) {
  const { data: lastInv } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const seq = lastInv?.invoice_number
    ? Number(String(lastInv.invoice_number).replace(/\D/g, "")) + 1
    : 1;

  return `INV-${String(seq).padStart(4, "0")}`;
}

function parseCustomLineItems(raw: string): CustomLineItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid line items.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Add at least one line item.");
  }

  return parsed.map((item, index) => {
    const description = String(item?.description ?? "").trim();
    const quantity = Number(item?.quantity);
    const unit_amount = Number(item?.unit_amount);

    if (!description) throw new Error(`Line item ${index + 1} needs a description.`);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Line item ${index + 1} needs a valid quantity.`);
    }
    if (!Number.isFinite(unit_amount) || unit_amount <= 0) {
      throw new Error(`Line item ${index + 1} needs a valid amount.`);
    }

    return { description, quantity, unit_amount };
  });
}

async function deliverInvoice(
  invoice: {
    id: string;
    invoice_number: string;
    title: string;
    total: number;
    due_date: string | null;
  },
  project: { id: string; title: string | null; client_id: string | null; slug: string | null },
  lineItems: CustomLineItem[]
) {
  let mercuryPayLink: string | null = null;
  if (!project.client_id) return mercuryPayLink;

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("profiles")
    .select("email, first_name, last_name")
    .eq("id", project.client_id)
    .single();

  if (client?.email && mercuryConfigured()) {
    try {
      const mercury = await pushInvoiceToMercury({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        title: invoice.title,
        amount: Number(invoice.total),
        dueDate: invoice.due_date,
        lineItems,
        projectId: project.id,
        projectTitle: project.title ?? "Your project",
        clientId: project.client_id,
        clientEmail: client.email,
        clientName:
          [client.first_name, client.last_name].filter(Boolean).join(" ") || client.email,
        payerMemo: isHabitat608Project(project.slug ?? "")
          ? "Habitat for Humanity draw payment — ACH bank transfer."
          : undefined,
      });
      mercuryPayLink = mercury ? getMercuryPayLink(mercury.slug) : null;
    } catch (err) {
      console.error("Mercury invoice sync failed:", err);
    }
  }

  if (client?.email) {
    await sendInvoiceReadyEmail({
      to: client.email,
      firstName: client.first_name || "there",
      projectTitle: project.title ?? "Your project",
      projectId: project.id,
      invoiceNumber: invoice.invoice_number,
      invoiceTitle: invoice.title,
      amountFormatted: formatMoney(Number(invoice.total)),
      dueDateFormatted: formatDueDateLabel(invoice.due_date),
      mercuryPayUrl: mercuryPayLink,
      isHabitat: isHabitat608Project(project.slug ?? ""),
    });
  }

  return mercuryPayLink;
}

async function insertDrawSchedule(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  projectId: string,
  contractValue: number,
  template: DrawTemplateLine[]
) {
  const rows = template.map((d) => ({
    project_id: projectId,
    draw_number: d.draw_number,
    title: d.title,
    description: d.description,
    percent_of_contract: d.percent,
    amount: Math.round((contractValue * d.percent) / 100),
    status: "scheduled" as const,
  }));

  const { error } = await supabase.from("payment_draws").insert(rows);
  if (error) throw new Error(error.message);
}

export async function updateContractValue(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const contractValue = Number(formData.get("contract_value"));
  const autoSeed = formData.get("auto_seed_draws") !== "off";

  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  await supabase
    .from("projects")
    .update({ contract_value: contractValue })
    .eq("id", projectId);

  if (autoSeed && contractValue > 0) {
    const { count } = await supabase
      .from("payment_draws")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    if ((count ?? 0) === 0) {
      const template = getDrawTemplateForProject(project?.slug ?? "");
      await insertDrawSchedule(supabase, projectId, contractValue, template);
    }
  }

  revalidate(projectId);
}

/** One-click: Habitat payment schedule only — client billing amount entered separately */
export async function setupHabitat608DrawSchedule(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));

  const { data: project } = await supabase
    .from("projects")
    .select("slug, title, contract_value")
    .eq("id", projectId)
    .single();

  if (!project) throw new Error("Project not found");
  if (!isHabitat608Project(project.slug)) {
    throw new Error("This preset is for 608 Macon Ave only.");
  }

  const contractValue = Number(project.contract_value ?? 0);
  if (!contractValue) {
    throw new Error("Enter what Habitat will pay you first — then create the payment schedule.");
  }

  await supabase
    .from("projects")
    .update({
      square_footage: HABITAT_608_MACON.heatedSquareFeet,
      internal_notes: `Habitat for Humanity build. Cost plan: ${HABITAT_608_MACON.estimateFile}. Architect: ${HABITAT_608_MACON.architect}.`,
    })
    .eq("id", projectId);

  const { count } = await supabase
    .from("payment_draws")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if ((count ?? 0) === 0) {
    await insertDrawSchedule(
      supabase,
      projectId,
      contractValue,
      getDrawTemplateForProject(project.slug)
    );
  }

  revalidate(projectId);
}

/** @deprecated use setupHabitat608DrawSchedule — kept for backwards compatibility */
export async function setupHabitat608Billing(formData: FormData) {
  return setupHabitat608DrawSchedule(formData);
}

export async function seedDrawSchedule(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));

  const { count } = await supabase
    .from("payment_draws")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if ((count ?? 0) > 0) throw new Error("A payment schedule already exists for this job.");

  const { data: project } = await supabase
    .from("projects")
    .select("contract_value, slug")
    .eq("id", projectId)
    .single();

  const contract = Number(project?.contract_value ?? 0);
  if (!contract) throw new Error("Set the contract amount first.");

  const template = getDrawTemplateForProject(project?.slug ?? "");
  await insertDrawSchedule(supabase, projectId, contract, template);
  revalidate(projectId);
}

export async function createDraw(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));

  const { data: last } = await supabase
    .from("payment_draws")
    .select("draw_number")
    .eq("project_id", projectId)
    .order("draw_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("payment_draws").insert({
    project_id: projectId,
    draw_number: (last?.draw_number ?? 0) + 1,
    title: String(formData.get("title")).trim(),
    description: String(formData.get("description") || "").trim() || null,
    amount: Number(formData.get("amount")),
    percent_of_contract: formData.get("percent_of_contract")
      ? Number(formData.get("percent_of_contract"))
      : null,
    scheduled_date: String(formData.get("scheduled_date") || "").trim() || null,
    milestone_id: String(formData.get("milestone_id") || "").trim() || null,
    status: "scheduled",
  });

  if (error) throw new Error(error.message);
  revalidate(projectId);
}

export async function createInvoiceFromDraw(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const drawId = String(formData.get("draw_id"));

  const { data: draw } = await supabase
    .from("payment_draws")
    .select("*")
    .eq("id", drawId)
    .single();

  if (!draw) throw new Error("Draw not found");
  if (draw.invoice_id) throw new Error("This draw already has an invoice.");

  const { data: project } = await supabase
    .from("projects")
    .select("title, client_id, slug")
    .eq("id", projectId)
    .single();

  const invoiceNumber = await nextInvoiceNumber(supabase, projectId);
  const amount = Number(draw.amount);

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      project_id: projectId,
      client_id: project?.client_id ?? null,
      invoice_number: invoiceNumber,
      title: `Draw ${draw.draw_number}: ${draw.title}`,
      status: "sent",
      subtotal: amount,
      total: amount,
      due_date: draw.scheduled_date,
      sent_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !invoice) throw new Error(error?.message ?? "Invoice failed");

  await supabase.from("invoice_line_items").insert({
    invoice_id: invoice.id,
    description: draw.description || draw.title,
    quantity: 1,
    unit_amount: amount,
    amount,
  });

  await supabase
    .from("payment_draws")
    .update({ invoice_id: invoice.id, status: "invoiced" })
    .eq("id", drawId);

  const lineItems = [
    {
      description: draw.description || draw.title,
      quantity: 1,
      unit_amount: amount,
    },
  ];

  await deliverInvoice(
    {
      id: invoice.id,
      invoice_number: invoiceNumber,
      title: `Draw ${draw.draw_number}: ${draw.title}`,
      total: amount,
      due_date: draw.scheduled_date,
    },
    {
      id: projectId,
      title: project?.title ?? null,
      client_id: project?.client_id ?? null,
      slug: project?.slug ?? null,
    },
    lineItems
  );

  revalidate(projectId);
}

export async function createCustomInvoice(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const dueDate = String(formData.get("due_date") ?? "").trim() || null;
  const sendNow = formData.get("send_now") === "on";
  const lineItems = parseCustomLineItems(String(formData.get("line_items") ?? "[]"));

  if (!title) throw new Error("Invoice title is required.");

  const { data: project } = await supabase
    .from("projects")
    .select("title, client_id, slug")
    .eq("id", projectId)
    .single();

  if (!project) throw new Error("Project not found.");
  if (sendNow && !project.client_id) {
    throw new Error("Link a client to this job before sending an invoice.");
  }

  const subtotal = lineItems.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unit_amount * 100) / 100,
    0
  );
  const invoiceNumber = await nextInvoiceNumber(supabase, projectId);
  const now = new Date().toISOString();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      project_id: projectId,
      client_id: project.client_id ?? null,
      invoice_number: invoiceNumber,
      title,
      notes,
      status: sendNow ? "sent" : "draft",
      subtotal,
      total: subtotal,
      due_date: dueDate,
      sent_at: sendNow ? now : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !invoice) throw new Error(error?.message ?? "Invoice failed");

  await supabase.from("invoice_line_items").insert(
    lineItems.map((item, index) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_amount: item.unit_amount,
      amount: Math.round(item.quantity * item.unit_amount * 100) / 100,
      display_order: index,
    }))
  );

  if (sendNow) {
    await deliverInvoice(
      {
        id: invoice.id,
        invoice_number: invoiceNumber,
        title,
        total: subtotal,
        due_date: dueDate,
      },
      {
        id: projectId,
        title: project.title ?? null,
        client_id: project.client_id ?? null,
        slug: project.slug ?? null,
      },
      lineItems
    );
  }

  revalidate(projectId);
}

export async function sendCustomInvoice(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const invoiceId = String(formData.get("invoice_id"));

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, title, total, due_date, status")
    .eq("id", invoiceId)
    .eq("project_id", projectId)
    .single();

  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status !== "draft") throw new Error("Only draft invoices can be sent.");

  const { data: project } = await supabase
    .from("projects")
    .select("title, client_id, slug")
    .eq("id", projectId)
    .single();

  if (!project?.client_id) throw new Error("Link a client to this job before sending.");

  const { data: rows } = await supabase
    .from("invoice_line_items")
    .select("description, quantity, unit_amount")
    .eq("invoice_id", invoiceId)
    .order("display_order");

  const lineItems = (rows ?? []).map((row) => ({
    description: row.description,
    quantity: Number(row.quantity),
    unit_amount: Number(row.unit_amount),
  }));

  if (!lineItems.length) throw new Error("Invoice has no line items.");

  await supabase
    .from("invoices")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  await deliverInvoice(
    {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      title: invoice.title ?? "Invoice",
      total: Number(invoice.total),
      due_date: invoice.due_date,
    },
    {
      id: projectId,
      title: project.title ?? null,
      client_id: project.client_id ?? null,
      slug: project.slug ?? null,
    },
    lineItems
  );

  revalidate(projectId);
}

export async function markInvoicePaid(formData: FormData) {
  await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const invoiceId = String(formData.get("invoice_id"));

  const admin = createAdminClient();
  await markInvoicePaidLocally(admin, invoiceId, projectId, { notifyClient: false });
  revalidate(projectId);
}

export async function createCheckoutSession(invoiceId: string) {
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, project_id, invoice_number, title, total, status, client_id")
    .eq("id", invoiceId)
    .single();

  if (!invoice || invoice.status === "paid") throw new Error("Invoice unavailable");

  const { data: project } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", invoice.project_id)
    .single();

  const ownsInvoice =
    invoice.client_id === user.id || (!invoice.client_id && project?.client_id === user.id);
  if (!ownsInvoice) throw new Error("Unauthorized");

  const amountCents = Math.round(Number(invoice.total) * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: invoice.title || `Invoice ${invoice.invoice_number}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoice_id: invoice.id,
      project_id: invoice.project_id,
    },
    success_url: `${getSiteUrl()}/client/projects/${invoice.project_id}/billing?paid=1`,
    cancel_url: `${getSiteUrl()}/client/projects/${invoice.project_id}/billing`,
  });

  return { url: session.url };
}
