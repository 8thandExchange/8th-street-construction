"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { Resend } from "resend";
import {
  getDrawTemplateForProject,
  HABITAT_608_MACON,
  isHabitat608Project,
  type DrawTemplateLine,
} from "@/lib/billing/constants";
import { mercuryConfigured } from "@/lib/mercury/config";
import { getMercuryPayLink, pushInvoiceToMercury } from "@/lib/mercury/service";

const FROM = process.env.EMAIL_FROM || "8th Street Construction <hello@8thstreetconstruction.com>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/billing`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/client/projects/${projectId}/billing`);
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
  const invoiceNumber = `INV-${String(seq).padStart(4, "0")}`;
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

  let mercuryPayLink: string | null = null;
  if (project?.client_id) {
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
          invoiceNumber,
          title: `Draw ${draw.draw_number}: ${draw.title}`,
          amount,
          dueDate: draw.scheduled_date,
          lineDescription: draw.description || draw.title,
          projectId,
          projectTitle: project.title ?? "Your project",
          clientId: project.client_id,
          clientEmail: client.email,
          clientName:
            [client.first_name, client.last_name].filter(Boolean).join(" ") || client.email,
          payerMemo: isHabitat608Project(project.slug ?? "")
            ? "Habitat for Humanity draw payment — ACH or card accepted."
            : undefined,
        });
        mercuryPayLink = mercury ? getMercuryPayLink(mercury.slug) : null;
      } catch (err) {
        console.error("Mercury invoice sync failed:", err);
      }
    }

    if (client?.email && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const portalUrl = `${SITE}/client/projects/${projectId}/billing`;
      const payNote = mercuryPayLink
        ? "Pay by bank transfer (ACH) or card using the secure Mercury link below, or open your client portal."
        : isHabitat608Project(project.slug ?? "")
          ? "Habitat or the homeowner can pay online or by check — see the client portal for details."
          : "You can pay online through your client portal.";
      const mercuryBlock = mercuryPayLink
        ? `<p style="margin:20px 0"><a href="${mercuryPayLink}" style="display:inline-block;padding:12px 20px;background:#1a1a1a;color:#f5f0e8;text-decoration:none;font-size:13px;letter-spacing:0.08em;text-transform:uppercase">Pay invoice securely →</a></p>`
        : "";
      await resend.emails.send({
        from: FROM,
        to: client.email,
        subject: `Invoice ${invoiceNumber} — ${project.title}`,
        html: `<p>Hi ${client.first_name || "there"},</p><p>Draw invoice <strong>${invoiceNumber}</strong> for <strong>$${amount.toLocaleString()}</strong> is ready.</p><p>${payNote}</p>${mercuryBlock}<p><a href="${portalUrl}">Open billing in your portal →</a></p>`,
        text: `Invoice ${invoiceNumber} ready: ${mercuryPayLink ?? portalUrl}`,
      });
    }
  }

  revalidate(projectId);
}

export async function markInvoicePaid(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const invoiceId = String(formData.get("invoice_id"));

  const { data: inv } = await supabase
    .from("invoices")
    .select("total")
    .eq("id", invoiceId)
    .single();

  await supabase
    .from("invoices")
    .update({
      status: "paid",
      amount_paid: inv?.total ?? 0,
      paid_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  await supabase
    .from("payment_draws")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("invoice_id", invoiceId);

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
    success_url: `${SITE}/client/projects/${invoice.project_id}/billing?paid=1`,
    cancel_url: `${SITE}/client/projects/${invoice.project_id}/billing`,
  });

  return { url: session.url };
}
