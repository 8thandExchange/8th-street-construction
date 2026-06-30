import { NextResponse } from "next/server";
import {
  createInvoicingSession,
  destroyInvoicingSession,
  verifyAdminPassword,
} from "@/lib/invoicing/auth";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { password?: string; action?: string };
    if (body.action === "logout") {
      await destroyInvoicingSession();
      return NextResponse.json({ ok: true });
    }

    if (!body.password || !verifyAdminPassword(body.password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    await createInvoicingSession();
    return NextResponse.json({ ok: true });
  }

  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "logout") {
    await destroyInvoicingSession();
    return NextResponse.redirect(new URL("/invoicing/login", request.url));
  }

  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(password)) {
    return NextResponse.redirect(new URL("/invoicing/login?error=1", request.url));
  }

  await createInvoicingSession();
  return NextResponse.redirect(new URL("/invoicing", request.url));
}
