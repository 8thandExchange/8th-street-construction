import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Only allow same-origin path redirects: must start with "/", must not be
 * protocol-relative ("//..."), and must not smuggle a scheme (":" before the
 * first "/" segment, e.g. "javascript:/...").
 */
function sanitizeRedirect(value: string | null): string | null {
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  const firstSlashAfterStart = value.indexOf("/", 1);
  const head = firstSlashAfterStart === -1 ? value : value.slice(0, firstSlashAfterStart);
  if (head.includes(":")) return null;
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirect = sanitizeRedirect(url.searchParams.get("redirect")) || "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  // Determine where to send the user based on role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let role = profile?.role;

  // First-time magic-link login: no profile row yet. Create one so the
  // user isn't stranded (defaults to client role).
  if (!profile) {
    const admin = createAdminClient();
    const { error: createError } = await admin.from("profiles").insert({
      id: user.id,
      email: user.email,
      role: "client",
      first_name: "",
      last_name: "",
    });
    if (!createError) {
      role = "client";
    }
  }

  // If explicit redirect provided and user can access it, honor it
  if (redirect && redirect !== "/") {
    if (redirect.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  // Otherwise route by role
  let target = "/";
  if (role === "admin") target = "/admin";
  else if (role === "subcontractor") target = "/subs";
  else if (role === "client") target = "/client";

  return NextResponse.redirect(new URL(target, request.url));
}
