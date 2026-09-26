import { NextResponse } from "next/server";
import { getSession, clearSessionCookies } from "@/lib/auth/session";

// GET: Check current session
export async function GET() {
  const session = await getSession();
  if (!session) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }
  return NextResponse.json({ authenticated: true, user: session });
}

// POST: Logout — clear every session cookie (including legacy impersonation cookie)
export async function POST() {
  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
