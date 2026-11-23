import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { verifyJwtHs256 } from "@/lib/auth/edgeJwt";
import { isSameOriginRequest } from "@/lib/auth/origin";

const isAuthPage = (pathname: string) => pathname === "/admin/login";
const isAdminRoute = (pathname: string) => pathname.startsWith("/admin");

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Cross-site writes to the admin / auth APIs are refused outright.
  if ((pathname.startsWith("/api/admin") || pathname.startsWith("/api/auth")) && !isSameOriginRequest(request.method, request.headers.get("origin"), request.headers.get("host"), request.headers.get("x-forwarded-host"))) {
    return NextResponse.json({ message: "Cross-site request refused" }, { status: 403 });
  }
  if (!isAdminRoute(pathname)) return NextResponse.next();

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? "";
  // Verifies the signature and expiry (not just the token's shape). API routes still re-check the account in the database.
  const isAuthenticated = Boolean(token) && (await verifyJwtHs256(token, process.env.JWT_SECRET?.trim() ?? ""));

  if (!isAuthenticated && !isAuthPage(pathname)) {
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    if (token) {
      response.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    }
    return response;
  }

  if (isAuthenticated && isAuthPage(pathname)) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  const response = NextResponse.next();
  if (!isAuthenticated && token) {
    response.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/auth/:path*"],
};
