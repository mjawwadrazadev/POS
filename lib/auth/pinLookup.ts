import crypto from "crypto";
import { getJwtSecret } from "@/lib/config/platformConfig";

/**
 * PINs are stored as bcrypt hashes, which cannot be searched. Checking a PIN used to mean
 * bcrypt-comparing it against every staff member of the store one by one, which slows down
 * as the team grows. Alongside the hash we keep a keyed HMAC of (store, PIN): it is indexed,
 * so the matching user is found in one query and bcrypt runs once.
 *
 * The key id records which secret made the HMAC. After the secret is rotated, lookups miss and
 * callers fall back to the old scan for users whose key id is out of date, re-stamping them on
 * the next successful login.
 */

function secretKey(): Buffer {
  // Derived, so the HMAC key is never the JWT signing key itself
  return crypto.createHash("sha256").update(`pin-lookup:${getJwtSecret()}`).digest();
}

export function pinLookupKeyId(): string {
  return crypto.createHash("sha256").update(secretKey()).digest("hex").slice(0, 12);
}

export function pinLookupFor(organizationId: unknown, pin: string): string {
  return crypto.createHmac("sha256", secretKey()).update(`${String(organizationId)}:${pin}`).digest("hex");
}

/** Users whose lookup is missing or made with an older secret; only these need the slow scan. */
export function staleLookupFilter() {
  return { $or: [{ pinLookup: { $exists: false } }, { pinLookupKeyId: { $ne: pinLookupKeyId() } }] };
}
