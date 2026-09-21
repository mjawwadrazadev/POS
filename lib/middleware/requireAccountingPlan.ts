import { NextResponse } from "next/server";
import { Organization } from "@/models/Organization";
import { dbConnect } from "@/lib/db/mongoose";

/**
 * Server-side guard to verify if an organization is entitled to Accounting & Ledger modules.
 * Returns HTTP 403 Forbidden if the organization is on a 'billing_only' plan tier.
 */
export async function requireAccountingPlan(organizationId: string) {
  await dbConnect();

  const org = await Organization.findById(organizationId).lean();

  if (!org) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      ),
    };
  }

  // Strict Single Source of Truth — Fail Closed Security
  const isAccountingEnabled = org.planTier === "billing_accounting";

  if (!isAccountingEnabled) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: "Access Forbidden: Accounting & Ledger modules require a 'Full Accounting' subscription plan.",
          planTier: org.planTier || "billing_only",
          upgradeRequired: true,
        },
        { status: 403 }
      ),
    };
  }

  return { allowed: true, org };
}
