import mongoose from "mongoose";
import { User } from "@/models/User";

/**
 * PIN login identifies a user by (store code, PIN), so two active users in one store
 * must never share a PIN. Returns true when `pin` is already used by another user.
 */
export async function isPinTakenInOrg(
  organizationId: string | mongoose.Types.ObjectId,
  pin: string,
  excludeUserId?: string
): Promise<boolean> {
  const query: any = { organizationId, isActive: true };
  if (excludeUserId) query._id = { $ne: excludeUserId };

  const users = await User.find(query).select("+pin");
  for (const u of users) {
    if (await u.comparePin(pin)) return true;
  }
  return false;
}
