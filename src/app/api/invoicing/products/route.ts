import { NextResponse } from "next/server";
import { requireInvoicingAuth } from "@/lib/invoicing/auth";
import { listProducts } from "@/lib/invoicing/service";

export async function GET() {
  try {
    await requireInvoicingAuth();
    const products = await listProducts();
    return NextResponse.json({ products });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
