import { NextResponse } from "next/server";
import { requireInvoicingAuth } from "@/lib/invoicing/auth";
import { getInvoice } from "@/lib/invoicing/service";
import { mapInvoice } from "@/lib/invoicing/stripe-mappers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireInvoicingAuth();
    const { id } = await context.params;
    const invoice = await getInvoice(id);
    return NextResponse.json({ invoice: mapInvoice(invoice), raw: invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
