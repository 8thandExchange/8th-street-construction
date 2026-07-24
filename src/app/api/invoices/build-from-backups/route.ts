import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ATTACHMENT_BUCKET } from "@/lib/assistant/attachments";
import {
  ALLOWED_BACKUP_TYPES,
  INVOICE_BACKUP_PREFIX,
  MAX_BACKUP_BYTES,
} from "@/lib/billing/backup-attachments";
import { invoiceJobPrefix } from "@/lib/billing/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Drag-and-drop invoice builder: takes the subs' invoice files, reads each
 * one with Claude (vendor, invoice #, amount, best city budget line), and
 * builds a DRAFT cover-sheet invoice with every backup attached to its
 * line — the format Habitat and HUD require. Nothing is sent; the admin
 * reviews the draft and clicks Send.
 */

type ExtractedInvoice = {
  vendor: string | null;
  invoice_number: string | null;
  amount: number;
  description: string;
  city_number: number | null;
};

const MAX_FILES = 12;

function extractionPrompt(budget: { city_number: number; description: string }[]) {
  const budgetList = budget.length
    ? `City budget lines for this job:\n${budget
        .map((b) => `${b.city_number}: ${b.description}`)
        .join("\n")}`
    : "This job has no city budget lines — set city_number to null.";
  return `This is a vendor/subcontractor invoice (or receipt) we are re-billing to our client. Extract:
- vendor: who issued it (company name), or null
- invoice_number: their invoice/receipt number, or null
- amount: the total amount due in dollars (number, e.g. 8173.00). Use the invoice TOTAL, not a line item.
- description: one short line of what the work/materials were, like "Framing labor & trusses" — no vendor name, no dates
- city_number: the single best matching city budget line number from the list below, or null if nothing fits

${budgetList}

Reply with ONLY a JSON object: {"vendor":..., "invoice_number":..., "amount":..., "description":..., "city_number":...}`;
}

async function extractInvoice(
  anthropic: Anthropic,
  model: string,
  file: { bytes: Buffer; mediaType: string },
  budget: { city_number: number; description: string }[]
): Promise<ExtractedInvoice> {
  const base64 = file.bytes.toString("base64");
  const block =
    file.mediaType === "application/pdf"
      ? ({
          type: "document" as const,
          source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 },
        } as Anthropic.ContentBlockParam)
      : ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: file.mediaType as "image/png" | "image/jpeg",
            data: base64,
          },
        } as Anthropic.ContentBlockParam);

  const response = await anthropic.messages.create({
    model,
    max_tokens: 500,
    messages: [
      { role: "user", content: [block, { type: "text", text: extractionPrompt(budget) }] },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not read this invoice");
  const parsed = JSON.parse(jsonMatch[0]) as Partial<ExtractedInvoice>;

  const amount = Number(parsed.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Could not find the amount due");
  const cityNumber = Number(parsed.city_number);
  return {
    vendor: parsed.vendor ? String(parsed.vendor).slice(0, 80) : null,
    invoice_number: parsed.invoice_number ? String(parsed.invoice_number).slice(0, 40) : null,
    amount: Math.round(amount * 100) / 100,
    description: String(parsed.description ?? "Work performed").slice(0, 140),
    city_number: Number.isInteger(cityNumber) && cityNumber > 0 ? cityNumber : null,
  };
}

export async function POST(request: Request) {
  let supabase;
  let userId: string;
  try {
    const auth = await requireAdmin();
    supabase = auth.supabase;
    userId = auth.user.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
  }

  let projectId = "";
  const files: { name: string; bytes: Buffer; mediaType: string }[] = [];
  try {
    const form = await request.formData();
    projectId = String(form.get("project_id") ?? "");
    for (const entry of form.getAll("files")) {
      if (!(entry instanceof File)) continue;
      if (!ALLOWED_BACKUP_TYPES.includes(entry.type)) {
        return NextResponse.json(
          { error: `"${entry.name}" isn't a PDF or image — only PDF, PNG, and JPG work here.` },
          { status: 400 }
        );
      }
      if (entry.size > MAX_BACKUP_BYTES) {
        return NextResponse.json(
          { error: `"${entry.name}" is too large (15MB limit).` },
          { status: 400 }
        );
      }
      files.push({
        name: entry.name,
        bytes: Buffer.from(await entry.arrayBuffer()),
        mediaType: entry.type,
      });
    }
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  if (!projectId) return NextResponse.json({ error: "project_id is required" }, { status: 400 });
  if (!files.length) return NextResponse.json({ error: "Drop at least one invoice file" }, { status: 400 });
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Up to ${MAX_FILES} files at a time.` }, { status: 400 });
  }

  const [{ data: project }, { data: budgetLines }, { data: existing }] = await Promise.all([
    supabase.from("projects").select("id, title, slug, client_id").eq("id", projectId).single(),
    supabase
      .from("city_budget_lines")
      .select("id, city_number, description, budget_amount")
      .eq("project_id", projectId)
      .order("city_number"),
    supabase.from("invoices").select("invoice_number").eq("project_id", projectId),
  ]);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const budget = budgetLines ?? [];
  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_ASSISTANT_MODEL?.trim() || "claude-opus-4-8";

  // Read every dropped invoice
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        return { file, extracted: await extractInvoice(anthropic, model, file, budget) };
      } catch (err) {
        return { file, error: err instanceof Error ? err.message : "Could not read this file" };
      }
    })
  );
  const failed = results.filter((r): r is { file: (typeof files)[number]; error: string } => "error" in r);
  const readable = results.filter(
    (r): r is { file: (typeof files)[number]; extracted: ExtractedInvoice } => "extracted" in r
  );
  if (!readable.length) {
    return NextResponse.json(
      { error: `Couldn't read any of the files: ${failed.map((f) => f.file.name).join(", ")}` },
      { status: 422 }
    );
  }

  // Same numbering as the billing actions: highest trailing sequence + 1
  const maxSeq = (existing ?? []).reduce((max, inv) => {
    const match = String(inv.invoice_number ?? "").match(/(\d+)\s*$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  const invoiceNumber = `${invoiceJobPrefix(project.slug)}-${String(maxSeq + 1).padStart(3, "0")}`;

  const subtotal =
    Math.round(readable.reduce((s, r) => s + r.extracted.amount, 0) * 100) / 100;

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      project_id: projectId,
      client_id: project.client_id ?? null,
      invoice_number: invoiceNumber,
      title: `Invoice ${maxSeq + 1} — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
      status: "draft",
      subtotal,
      total: subtotal,
      created_by: userId,
    })
    .select("id")
    .single();
  if (invoiceError || !invoice) {
    return NextResponse.json({ error: invoiceError?.message ?? "Invoice failed" }, { status: 500 });
  }

  const budgetByNumber = new Map(budget.map((b) => [b.city_number, b]));
  const admin = createAdminClient();
  const lines: {
    description: string;
    amount: number;
    reference_number: string | null;
    city_number: number | null;
    file_name: string;
  }[] = [];

  for (const [index, r] of readable.entries()) {
    const { extracted, file } = r;
    const budgetLine = extracted.city_number ? budgetByNumber.get(extracted.city_number) : null;
    const description = extracted.vendor
      ? `${extracted.description} — ${extracted.vendor}`
      : extracted.description;

    const { data: lineItem, error: lineError } = await supabase
      .from("invoice_line_items")
      .insert({
        invoice_id: invoice.id,
        description,
        quantity: 1,
        unit_amount: extracted.amount,
        amount: extracted.amount,
        reference_number: extracted.invoice_number,
        city_budget_line_id: budgetLine?.id ?? null,
        display_order: index,
      })
      .select("id")
      .single();
    if (lineError || !lineItem) {
      return NextResponse.json({ error: lineError?.message ?? "Line failed" }, { status: 500 });
    }

    const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
    const path = `${INVOICE_BACKUP_PREFIX}${invoice.id}/${Date.now()}-${index}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, file.bytes, { contentType: file.mediaType, upsert: false });
    if (!uploadError) {
      await supabase.from("invoice_attachments").insert({
        invoice_id: invoice.id,
        line_item_id: lineItem.id,
        file_name: file.name,
        storage_path: path,
        media_type: file.mediaType,
        file_size: file.bytes.length,
        display_order: index,
        uploaded_by: userId,
      });
    }

    lines.push({
      description,
      amount: extracted.amount,
      reference_number: extracted.invoice_number,
      city_number: extracted.city_number,
      file_name: file.name,
    });
  }

  // Over-budget warnings: this draft's amounts vs what's left on each line
  // (billed = every non-draft, non-void invoice already out the door)
  const { data: billedRows } = await admin
    .from("invoice_line_items")
    .select("city_budget_line_id, amount, invoice:invoices!inner(status, project_id)")
    .eq("invoice.project_id", projectId)
    .not("city_budget_line_id", "is", null);
  const billedByLine = new Map<string, number>();
  for (const row of billedRows ?? []) {
    const inv = Array.isArray(row.invoice) ? row.invoice[0] : row.invoice;
    if (!row.city_budget_line_id || !inv || inv.status === "draft" || inv.status === "void") continue;
    billedByLine.set(
      row.city_budget_line_id,
      (billedByLine.get(row.city_budget_line_id) ?? 0) + Number(row.amount)
    );
  }
  const draftByCity = new Map<number, number>();
  for (const line of lines) {
    if (line.city_number == null) continue;
    draftByCity.set(line.city_number, (draftByCity.get(line.city_number) ?? 0) + line.amount);
  }
  const warnings: string[] = [];
  for (const [cityNumber, draftAmount] of draftByCity) {
    const budgetLine = budgetByNumber.get(cityNumber);
    if (!budgetLine) continue;
    const left = Number(budgetLine.budget_amount) - (billedByLine.get(budgetLine.id) ?? 0);
    if (draftAmount > left) {
      warnings.push(
        `City #${cityNumber} (${budgetLine.description}): this invoice bills $${draftAmount.toFixed(2)} but only $${left.toFixed(2)} is left on the budget line.`
      );
    }
  }
  for (const f of failed) {
    warnings.push(`Couldn't read "${f.file.name}" — add it by hand on the draft page.`);
  }
  if (lines.some((l) => budget.length > 0 && l.city_number == null)) {
    warnings.push("Some lines have no City # — pick one on the draft before sending.");
  }

  return NextResponse.json({
    invoice_id: invoice.id,
    invoice_number: invoiceNumber,
    total: subtotal,
    lines,
    warnings,
    admin_page: `/admin/projects/${projectId}/billing/invoices/${invoice.id}`,
  });
}
