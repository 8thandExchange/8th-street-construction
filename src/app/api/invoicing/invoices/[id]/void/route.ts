import { NextResponse } from "next/server";
import { requireInvoicingAuth } from "@/lib/invoicing/auth";
import { voidInvoice } from "@/lib/invoicing/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireInvoicingAuth();
    const { id } = await context.params;
    await voidInvoice(id);
    return NextResponse.json({ message: "Invoice voided" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to void invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
