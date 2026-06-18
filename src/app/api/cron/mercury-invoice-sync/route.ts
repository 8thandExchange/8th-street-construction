import { NextResponse } from "next/server";
import { syncAllOpenMercuryInvoices } from "@/lib/mercury/sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllOpenMercuryInvoices();
  return NextResponse.json(result);
}
