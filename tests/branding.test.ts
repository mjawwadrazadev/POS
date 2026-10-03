import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { brandInitials, parseLogoUpload } from "@/lib/branding/storeBrand";
import { toStoredLogo } from "@/lib/branding/logoImage";

async function imageDataUrl(format: "png" | "jpeg", width = 800, height = 400) {
  const buf = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 43, b: 186, alpha: 0.5 } },
  })
    [format]()
    .toBuffer();
  return `data:image/${format};base64,${buf.toString("base64")}`;
}

describe("brandInitials", () => {
  it("takes the first letter of up to three words", () => {
    expect(brandInitials("Royal Spice")).toBe("RS");
    expect(brandInitials("Royal Spice Kitchen & Grill")).toBe("RSK");
  });

  it("uses two letters of a single-word name", () => {
    expect(brandInitials("bakehouse")).toBe("BA");
  });

  it("ignores punctuation and handles empty names", () => {
    expect(brandInitials("  Ali's  -  Cafe ")).toBe("ASC");
    expect(brandInitials("")).toBe("?");
    expect(brandInitials(undefined)).toBe("?");
  });
});

describe("parseLogoUpload", () => {
  it("treats an empty value as removing the logo", () => {
    expect(parseLogoUpload("")).toEqual({ remove: true });
    expect(parseLogoUpload(undefined)).toEqual({ remove: true });
  });

  it("rejects URLs and non-image data", () => {
    expect(parseLogoUpload("https://example.com/logo.png").error).toBeTruthy();
    expect(parseLogoUpload("data:image/svg+xml;base64,PHN2Zz4=").error).toBeTruthy();
    expect(parseLogoUpload("data:text/html;base64,PGgxPg==").error).toBeTruthy();
  });

  it("rejects oversized uploads", () => {
    const huge = "data:image/png;base64," + "A".repeat(3 * 1024 * 1024);
    expect(parseLogoUpload(huge).error).toMatch(/too large/);
  });
});

describe("toStoredLogo", () => {
  it("converts a PNG upload to a WebP no larger than 256px", async () => {
    const result = await toStoredLogo(await imageDataUrl("png"));
    expect(result.error).toBeUndefined();
    expect(result.value).toMatch(/^data:image\/webp;base64,/);

    const meta = await sharp(Buffer.from(result.value!.split(",")[1], "base64")).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(256);
    expect(meta.height).toBe(128);
    expect(meta.hasAlpha).toBe(true);
  });

  it("converts a JPG upload to WebP and keeps small logos at their size", async () => {
    const result = await toStoredLogo(await imageDataUrl("jpeg", 120, 60));
    const meta = await sharp(Buffer.from(result.value!.split(",")[1], "base64")).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(120);
  });

  it("returns an empty value when the logo is removed", async () => {
    expect(await toStoredLogo("")).toEqual({ value: "" });
  });

  it("rejects bytes that are not an image", async () => {
    const fake = "data:image/png;base64," + Buffer.from("not really a png").toString("base64");
    expect((await toStoredLogo(fake)).error).toMatch(/not a readable image/);
  });
});
