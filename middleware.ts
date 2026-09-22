import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function parseJwtPayload(token: string) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("rst_pos_token")?.value;
  const { pathname } = request.nextUrl;

  // Public paths that do not require authentication
  const isPublicPath =
    pathname === "/login" ||
    pathname === "/super-admin/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  // Super admin path check (excluding /super-admin/login)
  const isSuperAdminPath = pathname === "/super-admin" || (pathname.startsWith("/super-admin/") && pathname !== "/super-admin/login");

  // 1. If trying to access protected dashboard route without token -> redirect to login
  if (!isPublicPath && !token) {
    const targetLogin = isSuperAdminPath ? "/super-admin/login" : "/login";
    return NextResponse.redirect(new URL(targetLogin, request.url));
  }

  // 2. If token exists and user tries to access /super-admin route -> verify super_admin role
  if (isSuperAdminPath && token) {
    const payload = parseJwtPayload(token);
    if (!payload || payload.role !== "super_admin") {
      // Regular store user trying to access /super-admin -> redirect to store dashboard
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // 3. If token exists and super_admin tries to access store routes -> redirect to /super-admin
  if (token && !isSuperAdminPath && !isPublicPath) {
    const payload = parseJwtPayload(token);
    if (payload && payload.role === "super_admin") {
      // Super Admin belongs ONLY in /super-admin
      return NextResponse.redirect(new URL("/super-admin", request.url));
    }
  }

  // 4. If token exists and user visits login page -> redirect to their appropriate home page
  if (isPublicPath && token) {
    const payload = parseJwtPayload(token);
    if (payload) {
      const homePath = payload.role === "super_admin" ? "/super-admin" : "/";
      return NextResponse.redirect(new URL(homePath, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (handled by backend 401/403 guards)
     */
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
