import { NextResponse } from "next/server";
import { requireInvoicingAuth } from "@/lib/invoicing/auth";
import { sendInvoiceReminder } from "@/lib/invoicing/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireInvoicingAuth();
    const { id } = await context.params;
    await sendInvoiceReminder(id);
    return NextResponse.json({ message: "Reminder sent" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
