import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirect = url.searchParams.get("redirect") || "/";

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
    .select("role, must_change_password")
    .eq("id", user.id)
    .single();

  if (profile?.must_change_password) {
    return NextResponse.redirect(new URL("/account/password", request.url));
  }

  // If explicit redirect provided and user can access it, honor it
  if (redirect && redirect !== "/") {
    if (redirect.startsWith("/admin") && profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  // Otherwise route by role
  let target = "/";
  if (profile?.role === "admin") target = "/admin";
  else if (profile?.role === "subcontractor") target = "/subs";
  else if (profile?.role === "client") target = "/client";

  return NextResponse.redirect(new URL(target, request.url));
}
