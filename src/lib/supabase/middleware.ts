import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/project-env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseProjectUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: refresh the session here. Do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const protectedPrefixes = ["/admin", "/client", "/subs"];
  const needsAuth = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, must_change_password, portal_active")
      .eq("id", user.id)
      .single();

    if (profile?.must_change_password && !pathname.startsWith("/account/password")) {
      const url = request.nextUrl.clone();
      url.pathname = "/account/password";
      return NextResponse.redirect(url);
    }

    // Role-based gating for /admin
    if (pathname.startsWith("/admin") && profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Client portal master switch
    if (
      pathname.startsWith("/client") &&
      profile?.role === "client" &&
      profile.portal_active === false
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "portal_suspended");
      return NextResponse.redirect(url);
    }
  }

  response.headers.set("x-pathname", pathname);
  return response;
}
