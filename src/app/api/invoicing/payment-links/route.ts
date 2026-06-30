import { NextResponse } from "next/server";
import { requireInvoicingAuth } from "@/lib/invoicing/auth";
import { createPaymentLink, listPaymentLinks } from "@/lib/invoicing/service";

export async function GET() {
  try {
    await requireInvoicingAuth();
    const links = await listPaymentLinks();
    return NextResponse.json({ links });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load payment links";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireInvoicingAuth();
    const body = (await request.json()) as {
      name?: string;
      priceId?: string;
      description?: string;
      amount?: number;
      currency?: string;
    };

    const link = await createPaymentLink({
      name: body.name,
      priceId: body.priceId,
      description: body.description,
      amount: body.amount,
      currency: body.currency,
    });

    return NextResponse.json(link);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payment link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
