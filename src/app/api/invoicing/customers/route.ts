import { NextResponse } from "next/server";
import { requireInvoicingAuth } from "@/lib/invoicing/auth";
import { createCustomer, listCustomers } from "@/lib/invoicing/service";
import type Stripe from "stripe";

export async function GET() {
  try {
    await requireInvoicingAuth();
    const customers = await listCustomers();
    return NextResponse.json({ customers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireInvoicingAuth();
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      contactName?: string;
      address?: Stripe.AddressParam;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const customer = await createCustomer({
      name: body.name.trim(),
      email: body.email?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      contactName: body.contactName?.trim() || undefined,
      address: body.address,
    });

    return NextResponse.json(customer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create customer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
