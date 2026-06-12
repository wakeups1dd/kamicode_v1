import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hasSupabase = 
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && 
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isBypass = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

  // If Supabase is not configured or bypass is enabled, skip auth checks
  if (!hasSupabase || isBypass) {
    return NextResponse.next();
  }

  const token = request.cookies.get("sb-access-token")?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith("/auth");

  if (isAuthPage) {
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - any files with extensions (e.g. svg, png)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)",
  ],
};
