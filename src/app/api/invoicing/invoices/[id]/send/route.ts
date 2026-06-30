import { NextResponse } from "next/server";
import { requireInvoicingAuth } from "@/lib/invoicing/auth";
import { formatStripeError } from "@/lib/invoicing/stripe-errors";
import { sendInvoice } from "@/lib/invoicing/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireInvoicingAuth();
    const { id } = await context.params;
    await sendInvoice(id);
    return NextResponse.json({ message: "Invoice sent" });
  } catch (error) {
    const message = formatStripeError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
