import { NextResponse } from "next/server";
import { getSession, clearSessionCookies, isPlatformRole } from "@/lib/auth/session";
import { Organization } from "@/models/Organization";

// GET: Check current session
export async function GET() {
  const session = await getSession();
  if (!session) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  // Store screens show the store's own name and logo in the sidebar. Read fresh (not from the token),
  // so a logo or name changed by the super admin shows on the next page load.
  const inStore = !isPlatformRole(session.role) || session.isImpersonating;
  if (inStore && session.organizationId) {
    try {
      const org = await Organization.findById(session.organizationId).select("name +logoUrl").lean();
      if (org) {
        session.organizationName = org.name;
        session.organizationLogo = org.logoUrl || "";
      }
    } catch {
      // branding is cosmetic — the session itself is already verified
    }
  }
  return NextResponse.json({ authenticated: true, user: session });
}

// POST: Logout — clear every session cookie (including legacy impersonation cookie)
export async function POST() {
  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
