import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "rst_pos_token";

function base64UrlDecodeToString(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(base64);
  // UTF-8 decode without TextDecoder/ArrayBuffer (buffers created inside the Edge sandbox are
  // rejected by the host Web Crypto implementation)
  return decodeURIComponent(
    Array.from(binary, (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verifies an HS256 JWT (as issued by jsonwebtoken) with Web Crypto, which is available in the
 * Edge runtime. Returns the payload only when the signature is valid and the token is unexpired.
 * API routes re-verify every request against the database; this only gates page navigation.
 */
async function verifyJwt(token: string): Promise<any | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const header = JSON.parse(base64UrlDecodeToString(headerB64));
    if (header.alg !== "HS256") return null;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    // Recompute the signature and compare, instead of subtle.verify (which needs a sandbox-created buffer)
    const expected = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${headerB64}.${payloadB64}`));
    if (!constantTimeEqual(bytesToBase64Url(new Uint8Array(expected)), signatureB64)) return null;

    const payload = JSON.parse(base64UrlDecodeToString(payloadB64));
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function isPlatformRole(role?: string) {
  return role === "super_admin" || role === "platform_support";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = token ? await verifyJwt(token) : null;

  const isPublicPath =
    pathname === "/login" ||
    pathname === "/super-admin/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  const isSuperAdminPath =
    pathname === "/super-admin" || (pathname.startsWith("/super-admin/") && pathname !== "/super-admin/login");

  // 1. No valid session on a protected route -> login (and drop any invalid/expired cookie)
  if (!isPublicPath && !payload) {
    const targetLogin = isSuperAdminPath ? "/super-admin/login" : "/login";
    const response = NextResponse.redirect(new URL(targetLogin, request.url));
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (payload) {
    const platformUser = isPlatformRole(payload.role) && !payload.isImpersonating;

    // 2. Only platform staff (not impersonating) may open /super-admin pages
    if (isSuperAdminPath && !platformUser) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // 3. Platform staff belong in /super-admin unless impersonating a tenant
    if (!isSuperAdminPath && !isPublicPath && platformUser) {
      return NextResponse.redirect(new URL("/super-admin", request.url));
    }

    // 4. Logged-in users visiting a login page go to their home page
    if (isPublicPath) {
      return NextResponse.redirect(new URL(platformUser ? "/super-admin" : "/", request.url));
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
     * - api routes (each route verifies the session itself)
     */
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
