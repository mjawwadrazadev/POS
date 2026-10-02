import mongoose from "mongoose";
import { User, IUser } from "@/models/User";
import { pinLookupFor, pinLookupKeyId, staleLookupFilter } from "@/lib/auth/pinLookup";

type Id = string | mongoose.Types.ObjectId;

/**
 * Finds the active user in a store with this PIN. One indexed query finds users whose PIN lookup is
 * current; only users without one (created before lookups existed, or stamped with an older secret)
 * are bcrypt-scanned, and a match is stamped so it takes the fast path next time.
 */
export async function findUserByPin(
  organizationId: Id,
  pin: string,
  filter: Record<string, unknown> = {}
): Promise<IUser | null> {
  const base = { organizationId, isActive: true, ...filter };
  const lookup = pinLookupFor(organizationId, pin);

  const [hit, stale] = await Promise.all([
    User.findOne({ ...base, pinLookup: lookup }).select("+pin"),
    User.find({ ...base, ...staleLookupFilter() }).select("+pin"),
  ]);

  if (hit && (await hit.comparePin(pin))) return hit;

  for (const u of stale) {
    if (await u.comparePin(pin)) {
      await User.updateOne({ _id: u._id }, { $set: { pinLookup: lookup, pinLookupKeyId: pinLookupKeyId() } });
      return u;
    }
  }
  return null;
}

/**
 * PIN login identifies a user by (store code, PIN), so two active users in one store
 * must never share a PIN. Returns true when `pin` is already used by another user.
 */
export async function isPinTakenInOrg(organizationId: Id, pin: string, excludeUserId?: string): Promise<boolean> {
  const filter = excludeUserId ? { _id: { $ne: excludeUserId } } : {};
  return (await findUserByPin(organizationId, pin, filter)) !== null;
}
