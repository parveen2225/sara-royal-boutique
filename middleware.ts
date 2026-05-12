import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";

const isAuthPage = (pathname: string) => pathname === "/admin/login";
const isAdminRoute = (pathname: string) => pathname.startsWith("/admin");
const isLikelyJwt = (value: string) => value.split(".").length === 3;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isAdminRoute(pathname)) return NextResponse.next();

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? "";
  const isAuthenticated = Boolean(token) && isLikelyJwt(token);

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
  matcher: ["/admin/:path*"],
};
