import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user: session });
}

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("rst_pos_token", "", { maxAge: 0, path: "/" });
  return response;
}
