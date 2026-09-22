import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { User } from "@/models/User";
import { dbConnect } from "@/lib/db/mongoose";

export async function checkBranchLimit(organizationId: string): Promise<{ allowed: boolean; message?: string }> {
  await dbConnect();
  const org = await Organization.findById(organizationId);
  if (!org) return { allowed: false, message: "Organization not found" };

  const maxBranches = org.planLimits?.maxBranches || 5;
  const currentCount = await Branch.countDocuments({ organizationId });

  if (currentCount >= maxBranches) {
    return {
      allowed: false,
      message: `Branch creation limit reached (${currentCount}/${maxBranches}) for your plan tier (${org.planTier}). Please contact support or upgrade your subscription.`,
    };
  }

  return { allowed: true };
}

export async function checkStaffLimit(organizationId: string): Promise<{ allowed: boolean; message?: string }> {
  await dbConnect();
  const org = await Organization.findById(organizationId);
  if (!org) return { allowed: false, message: "Organization not found" };

  const maxStaffUsers = org.planLimits?.maxStaffUsers || 20;
  const currentCount = await User.countDocuments({ organizationId, isActive: true });

  if (currentCount >= maxStaffUsers) {
    return {
      allowed: false,
      message: `Active staff limit reached (${currentCount}/${maxStaffUsers}) for your plan tier (${org.planTier}). Please contact support or upgrade your subscription.`,
    };
  }

  return { allowed: true };
}
