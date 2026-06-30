import { NextResponse } from "next/server";
import { requireInvoicingAuth } from "@/lib/invoicing/auth";
import { deleteCustomer, getCustomer, updateCustomer } from "@/lib/invoicing/service";
import { mapCustomer } from "@/lib/invoicing/stripe-mappers";
import type Stripe from "stripe";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireInvoicingAuth();
    const { id } = await context.params;
    const customer = await getCustomer(id);
    if (customer.deleted) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json({ customer: mapCustomer(customer) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load customer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireInvoicingAuth();
    const { id } = await context.params;
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

    const customer = await updateCustomer(id, {
      name: body.name.trim(),
      email: body.email?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      contactName: body.contactName?.trim() || undefined,
      address: body.address,
    });
    return NextResponse.json({ customer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update customer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireInvoicingAuth();
    const { id } = await context.params;
    await deleteCustomer(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete customer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
