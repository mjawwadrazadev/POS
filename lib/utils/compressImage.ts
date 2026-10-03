// Shrinks a photo picked in the browser into a small JPEG data URL, so product
// images can be stored with the product without a separate file host.
// Logos pass keepTransparency: they are saved as WebP (PNG where WebP encoding is unsupported).

export async function compressImage(
  file: File,
  maxSize = 480,
  quality = 0.8,
  { keepTransparency = false }: { keepTransparency?: boolean } = {}
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("This image could not be read"));
      el.src = bitmapUrl;
    });

    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image resizing is not supported in this browser");
    if (keepTransparency) {
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL("image/webp", quality);
    }
    // White backdrop so transparent PNGs don't turn black as JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}
