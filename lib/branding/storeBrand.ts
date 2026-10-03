// Store branding shared by the server (upload checks) and the browser (sidebar logo).

// Logos arrive as an uploaded image file (read in the browser as a data URL). URLs are not accepted.
export const LOGO_UPLOAD_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
// Raw file the picker accepts, before it is shrunk in the browser and converted to WebP on the server
export const MAX_LOGO_FILE_BYTES = 5 * 1024 * 1024;
// Decoded upload the server accepts (the browser already shrinks it to a few hundred KB at most)
export const MAX_LOGO_UPLOAD_BYTES = 2 * 1024 * 1024;

const UPLOAD_PATTERN = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;

/**
 * Reads an uploaded logo. Returns the image bytes to convert, `remove` for "" (logo removed),
 * or an error for anything that is not an uploaded PNG / JPEG / WebP file.
 */
export function parseLogoUpload(value: unknown): { bytes?: Buffer; remove?: boolean; error?: string } {
  const raw = String(value ?? "").trim();
  if (!raw) return { remove: true };
  // Base64 is 4/3 the size of the bytes; reject oversized uploads before decoding
  if (raw.length > Math.ceil((MAX_LOGO_UPLOAD_BYTES * 4) / 3) + 64) return { error: "Logo image is too large (max 2 MB)" };
  const match = UPLOAD_PATTERN.exec(raw);
  if (!match) return { error: "Logo must be an uploaded PNG, JPG or WebP image file" };
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0) return { error: "Logo image is empty" };
  return { bytes };
}

/**
 * Letters shown in place of a logo: the first letter of up to three words
 * ("Royal Spice Kitchen" → "RSK"), or the first two letters of a single word ("Bakehouse" → "BA").
 */
export function brandInitials(name?: string): string {
  const words = String(name ?? "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join("").toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => Array.from(w)[0])
    .join("")
    .toUpperCase();
}
