import mongoose from "mongoose";
import { Branch, IBranch } from "@/models/Branch";
import type { SessionPayload } from "@/lib/auth/session";

/**
 * Resolves the branch a request operates on: the user's own branch when it belongs to
 * the session organization, otherwise the organization's main branch (or any branch).
 */
export async function resolveBranch(session: SessionPayload): Promise<IBranch | null> {
  if (!session.organizationId) return null;

  if (session.branchId && mongoose.isValidObjectId(session.branchId)) {
    const own = await Branch.findOne({ _id: session.branchId, organizationId: session.organizationId });
    if (own) return own;
  }

  return (
    (await Branch.findOne({ organizationId: session.organizationId, isMain: true })) ||
    (await Branch.findOne({ organizationId: session.organizationId }))
  );
}
