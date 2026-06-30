import { NextResponse } from "next/server";
import { requireInvoicingAuth } from "@/lib/invoicing/auth";
import { markInvoicePaid } from "@/lib/invoicing/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireInvoicingAuth();
    const { id } = await context.params;
    await markInvoicePaid(id);
    return NextResponse.json({ message: "Invoice marked as paid" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark invoice paid";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
