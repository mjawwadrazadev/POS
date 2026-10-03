// Server only: converts uploaded logos with sharp.
import sharp from "sharp";
import { parseLogoUpload } from "@/lib/branding/storeBrand";

// Stored logos are always a small WebP, so the Organization document stays light
const LOGO_SIZE = 256;
const LOGO_QUALITY = 85;

/**
 * Turns an uploaded logo into what is saved in the database: a 256px (max side) WebP data URL.
 * `value: ""` means the logo was removed.
 */
export async function toStoredLogo(upload: unknown): Promise<{ value?: string; error?: string }> {
  const parsed = parseLogoUpload(upload);
  if (parsed.error) return { error: parsed.error };
  if (parsed.remove) return { value: "" };

  try {
    const webp = await sharp(parsed.bytes!, { limitInputPixels: 40_000_000 })
      .rotate() // respect phone-camera orientation
      .resize(LOGO_SIZE, LOGO_SIZE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: LOGO_QUALITY, alphaQuality: 100 })
      .toBuffer();
    return { value: `data:image/webp;base64,${webp.toString("base64")}` };
  } catch {
    return { error: "This file is not a readable image" };
  }
}
