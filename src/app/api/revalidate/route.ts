import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
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
