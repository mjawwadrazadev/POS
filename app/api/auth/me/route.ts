import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

// GET: Check current session
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user: session });
}

// POST: Logout — clear JWT cookie with all required security flags
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("rst_pos_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
