import { NextResponse } from "next/server";
import { runActionItemNudges } from "@/lib/meetings/nudges";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runActionItemNudges();
  return NextResponse.json(result);
}
