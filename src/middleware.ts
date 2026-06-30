import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const INVOICING_SESSION_COOKIE = "8sc_invoicing_session";

function invoicingAuthRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/invoicing")) return null;

  if (pathname === "/invoicing/login") {
    const session = request.cookies.get(INVOICING_SESSION_COOKIE);
    if (session?.value) {
      return NextResponse.redirect(new URL("/invoicing", request.url));
    }
    return null;
  }

  const session = request.cookies.get(INVOICING_SESSION_COOKIE);
  if (!session?.value) {
    const loginUrl = new URL("/invoicing/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const invoicingRedirect = invoicingAuthRedirect(request);
  if (invoicingRedirect) return invoicingRedirect;

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
