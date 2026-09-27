import { describe, it, expect } from "vitest";
import { barcodeFormatFor, isValidEan13, sanitizeBarcodeValue } from "@/lib/printer/barcode";
import { encodeEscPosReceipt, encodeLabel } from "@/lib/printer/escposEncoder";
import type { PrinterConfig } from "@/lib/printer/types";

const decode = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join("");

const order = {
  orderNumber: "ORD-1",
  dateStr: "27/09/2026",
  cashierName: "Ali",
  storeName: "Royal Spice",
  items: [{ name: "Chicken Karahi — Full", quantity: 1, unitPrice: 1800, total: 1800 }],
  subtotal: 1800,
  taxAmount: 288,
  discountTotal: 0,
  grandTotal: 2088,
  paymentMethod: "cash",
};

const labelPrinter = (language: PrinterConfig["language"]): PrinterConfig => ({
  id: "l",
  name: "Label",
  transport: "network",
  role: "barcode_label",
  paperWidth: "80mm",
  language,
  labelWidthMm: 50,
  labelHeightMm: 30,
});

describe("barcode helpers", () => {
  it("validates EAN-13 check digits", () => {
    expect(isValidEan13("8964000000014")).toBe(true);
    expect(isValidEan13("8964000000017")).toBe(false);
    expect(barcodeFormatFor("8964000000014")).toBe("EAN13");
    expect(barcodeFormatFor("SKU-001")).toBe("CODE128");
  });

  it("drops characters a barcode cannot carry", () => {
    expect(sanitizeBarcodeValue(" ABC–12é ")).toBe("ABC12");
  });
});

describe("ESC/POS receipt", () => {
  it("prints the store name and never sends non-ASCII bytes", () => {
    const bytes = encodeEscPosReceipt(order);
    const text = decode(bytes);
    expect(text).toContain("Royal Spice");
    expect(text).toContain("Chicken Karahi - Full");
    expect(Array.from(bytes).every((b) => b < 0x80 || b === 0xfa)).toBe(true);
  });

  it("adds the cash drawer kick only when asked", () => {
    const kick = [0x1b, 0x70, 0x00];
    const has = (b: Uint8Array) => decode(b).includes(String.fromCharCode(...kick));
    expect(has(encodeEscPosReceipt(order))).toBe(false);
    expect(has(encodeEscPosReceipt({ ...order, openCashDrawer: true }))).toBe(true);
  });

  it("fits 58mm paper lines to 32 characters", () => {
    const lines = decode(encodeEscPosReceipt({ ...order, paperWidth: "58mm" }))
      .split("\n")
      .filter((l) => /^[\x20-\x7e]+$/.test(l));
    expect(Math.max(...lines.map((l) => l.length))).toBeLessThanOrEqual(32);
  });
});

describe("labels", () => {
  const label = { productName: "Cake Rusk", barcode: "8964000000014", price: 250 };

  it("uses a native ESC/POS EAN-13 barcode", () => {
    const text = decode(encodeLabel(label, 2, labelPrinter("escpos")));
    expect(text).toContain(String.fromCharCode(0x1d, 0x6b, 0x43, 12) + "896400000001");
  });

  it("writes TSPL with size, barcode and copies", () => {
    const text = decode(encodeLabel(label, 3, labelPrinter("tspl")));
    expect(text).toContain("SIZE 50 mm, 30 mm");
    expect(text).toContain('"EAN13"');
    expect(text).toContain("PRINT 3,1");
  });

  it("writes ZPL with Code 128 for non-numeric codes", () => {
    const text = decode(encodeLabel({ ...label, barcode: "SKU-9" }, 1, labelPrinter("zpl")));
    expect(text.startsWith("^XA")).toBe(true);
    expect(text).toContain("^BCN");
    expect(text).toContain("^FDSKU-9^FS");
    expect(text).toContain("^PQ1");
  });
});
