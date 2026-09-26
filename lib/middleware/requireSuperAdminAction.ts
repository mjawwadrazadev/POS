import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export type SuperAdminActionLevel =
  | "read_analytics"       // super_admin + platform_support
  | "record_payment"       // super_admin + platform_support
  | "manage_support"        // super_admin + platform_support
  | "suspend_tenant"       // super_admin + platform_support
  | "reset_user_pin"       // super_admin + platform_support
  | "impersonate_tenant"   // super_admin only
  | "terminate_tenant"     // super_admin only
  | "manage_pricing"       // super_admin only
  | "manage_integrations"; // super_admin only

export async function requireSuperAdminAction(requiredLevel: SuperAdminActionLevel) {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false as const,
      session: null,
      response: NextResponse.json({ error: "Unauthorized: Login required" }, { status: 401 }),
    };
  }

  const role = session.role;
  const isSuperAdmin = role === "super_admin";
  const isPlatformSupport = role === "platform_support";

  if (!isSuperAdmin && !isPlatformSupport) {
    return {
      authorized: false as const,
      session,
      response: NextResponse.json({ error: "Forbidden: Super Admin or Support role required" }, { status: 403 }),
    };
  }

  // Restrict specific actions to super_admin only
  const superAdminOnlyActions: SuperAdminActionLevel[] = [
    "impersonate_tenant",
    "terminate_tenant",
    "manage_pricing",
    "manage_integrations",
  ];

  if (superAdminOnlyActions.includes(requiredLevel) && !isSuperAdmin) {
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
