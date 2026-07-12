import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  // Prefer the header; keep the query param as a fallback for compatibility.
  const secret =
    request.headers.get("x-revalidate-secret") || url.searchParams.get("secret");

  if (
    !process.env.REVALIDATE_SECRET ||
    !secret ||
    !secretsMatch(secret, process.env.REVALIDATE_SECRET)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const path = (body as { path?: string }).path;
  const tag = (body as { tag?: string }).tag;

  if (path) revalidatePath(path);
  if (tag) revalidateTag(tag);
  if (!path && !tag) {
    // Default: refresh marketing surfaces
    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/services");
  }

  return NextResponse.json({ revalidated: true, path, tag });
}
