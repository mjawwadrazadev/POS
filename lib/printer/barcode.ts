/** Barcode symbology used for a value: EAN-13 for valid 13-digit retail codes, Code 128 for everything else. */
export type BarcodeFormat = "EAN13" | "CODE128";

export function isValidEan13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  const digits = value.split("").map(Number);
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === digits[12];
}

export function barcodeFormatFor(value: string): BarcodeFormat {
  return isValidEan13(value) ? "EAN13" : "CODE128";
}

/** Code 128 can only carry printable ASCII; anything else is dropped so the barcode still scans. */
export function sanitizeBarcodeValue(value: string): string {
  return value.replace(/[^\x20-\x7e]/g, "").trim();
}
