import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canPerformPlatformAction, isPlatformRole, PlatformAction } from "@/lib/auth/permissions";

export type SuperAdminActionLevel = PlatformAction;

export async function requireSuperAdminAction(requiredLevel: SuperAdminActionLevel) {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false as const,
      session: null,
      response: NextResponse.json({ error: "Unauthorized: Login required" }, { status: 401 }),
    };
  }

  // An impersonation session carries the store admin role, so it never reaches platform actions
  if (!isPlatformRole(session.role) || session.isImpersonating) {
    return {
      authorized: false as const,
      session,
      response: NextResponse.json({ error: "Forbidden: Super Admin or Support role required" }, { status: 403 }),
    };
  }

  if (!canPerformPlatformAction(session.role, requiredLevel)) {
    return {
      authorized: false as const,
      session,
      response: NextResponse.json(
        { error: `Forbidden: Action '${requiredLevel}' requires full Super Admin privileges` },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true as const,
    session,
    response: null,
  };
}
