import type { LabelData, PrintOrderData, PrinterConfig } from "./types";
import { barcodeFormatFor, sanitizeBarcodeValue } from "./barcode";

// Raw command encoders: ESC/POS for receipts and labels, TSPL and ZPL for label printers.

/** Thermal printers use single-byte code pages; replace anything outside ASCII so nothing prints as garbage. */
function toAscii(text: string): string {
  return text
    .replace(/[•·]/g, "-")
    .replace(/[—–]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7e\n]/g, "?");
}

class ByteWriter {
  bytes: number[] = [];
  raw(...b: number[]) {
    this.bytes.push(...b);
    return this;
  }
  text(s: string) {
    const a = toAscii(s);
    for (let i = 0; i < a.length; i++) this.bytes.push(a.charCodeAt(i));
    return this;
  }
  line(s = "") {
    return this.text(s + "\n");
  }
  toUint8Array() {
    return Uint8Array.from(this.bytes);
  }
}

const ESC = 0x1b;
const GS = 0x1d;

/** Native ESC/POS QR code (GS ( k, model 2), supported by standard 58/80mm thermal printers. */
function pushQrCode(w: ByteWriter, text: string) {
  const data = Array.from(new TextEncoder().encode(text));
  const len = data.length + 3;
  w.raw(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00); // model 2
  w.raw(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x06); // module size 6
  w.raw(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31); // error correction M
  w.raw(GS, 0x28, 0x6b, len & 0xff, (len >> 8) & 0xff, 0x31, 0x50, 0x30, ...data); // store data
  w.raw(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30); // print
  w.raw(0x0a);
}

/** Native ESC/POS barcode (GS k), EAN-13 or Code 128 with human-readable text below. */
function pushBarcode(w: ByteWriter, value: string, heightDots = 80) {
  const v = sanitizeBarcodeValue(value);
  if (!v) return;
  w.raw(GS, 0x48, 0x02); // HRI text below
  w.raw(GS, 0x68, heightDots); // height
  w.raw(GS, 0x77, 0x02); // module width
  if (barcodeFormatFor(v) === "EAN13") {
    const data = Array.from(v.slice(0, 12), (c) => c.charCodeAt(0));
    w.raw(GS, 0x6b, 0x43, data.length, ...data);
  } else {
    // Code 128, code set B ("{B" prefix)
    const data = [0x7b, 0x42, ...Array.from(v, (c) => c.charCodeAt(0))];
    w.raw(GS, 0x6b, 0x49, data.length, ...data);
  }
  w.raw(0x0a);
}

/** Kick the cash drawer connected to the printer (pin 2). */
function pushDrawerKick(w: ByteWriter) {
  w.raw(ESC, 0x70, 0x00, 0x19, 0xfa);
}

function money(n: number) {
  return `PKR ${Number(n || 0).toLocaleString()}`;
}

function twoCol(left: string, right: string, width: number) {
  const space = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(space) + right;
}

export function encodeEscPosReceipt(order: PrintOrderData): Uint8Array {
  const w = new ByteWriter();
  const width = order.paperWidth === "58mm" ? 32 : 48;
  const divider = "-".repeat(width);

  w.raw(ESC, 0x40); // initialise

  // Header
  w.raw(ESC, 0x61, 0x01); // centre
  w.raw(GS, 0x21, 0x11).raw(ESC, 0x45, 0x01); // double size, bold
  w.line(order.storeName || "RST POS");
  w.raw(GS, 0x21, 0x00);
  if (order.branchName) w.line(order.branchName);
  if (order.title) w.line(order.title);
  w.raw(ESC, 0x45, 0x00);
  w.line(divider);

  // Order details
  w.raw(ESC, 0x61, 0x00); // left
  w.line(twoCol("Receipt #:", order.orderNumber, width));
  w.line(twoCol("Date:", order.dateStr, width));
  w.line(twoCol("Cashier:", order.cashierName, width));
  if (order.customerName) w.line(twoCol("Customer:", order.customerName, width));
  for (const extra of order.extraLines || []) {
    if (extra.value) w.line(twoCol(`${extra.label}:`, extra.value, width));
  }
  w.line(divider);

  // Items
  if (order.items.length > 0) {
    const nameWidth = width - 16;
    w.line("ITEM".padEnd(nameWidth) + "QTY".padStart(5) + "TOTAL".padStart(11));
    w.line(divider);
    for (const item of order.items) {
      const name = toAscii(item.name);
      w.line(
        name.slice(0, nameWidth).padEnd(nameWidth) +
          `x${item.quantity}`.padStart(5) +
          Number(item.total).toLocaleString().padStart(11)
      );
      // Wrap long names onto a second line instead of cutting them off
      if (name.length > nameWidth) w.line("  " + name.slice(nameWidth, nameWidth * 2 - 2));
    }
    w.line(divider);
  }

  // Totals
  w.line(twoCol("Subtotal:", money(order.subtotal), width));
  if (order.taxAmount > 0) {
    const rate = order.taxRate !== undefined ? ` (${order.taxRate}%)` : "";
    w.line(twoCol(`Sales Tax${rate}:`, money(order.taxAmount), width));
  }
  if (order.discountTotal > 0) w.line(twoCol("Discount:", `-${money(order.discountTotal)}`, width));
  w.raw(ESC, 0x45, 0x01).raw(GS, 0x21, 0x01); // bold, double height
  w.line(twoCol("TOTAL:", money(order.grandTotal), width));
  w.raw(GS, 0x21, 0x00).raw(ESC, 0x45, 0x00);
  w.line(twoCol("Payment:", order.paymentMethod.toUpperCase(), width));
  w.line(divider);

  // Footer
  w.raw(ESC, 0x61, 0x01);
  if (order.fbrInvoiceNumber) {
    w.raw(ESC, 0x45, 0x01);
    w.line(order.fbrSandbox ? "FBR SANDBOX - TEST INVOICE" : "FBR POS INVOICE");
    w.raw(ESC, 0x45, 0x00);
    w.line(`FBR Inv #: ${order.fbrInvoiceNumber}`);
    pushQrCode(w, order.fbrInvoiceNumber);
    w.line("Verify via FBR Tax Asaan app");
    w.line(divider);
  }
  w.line(order.footer || "Thank you for your business!");
  w.line("Powered by RST POS");
  w.line("\n\n\n");

  w.raw(GS, 0x56, 0x42, 0x00); // feed and partial cut (ignored by printers without a cutter)
  if (order.openCashDrawer) pushDrawerKick(w);

  return w.toUint8Array();
}

/** ESC/POS label: continuous thermal paper, one block per copy. */
function encodeEscPosLabel(label: LabelData, copies: number): Uint8Array {
  const w = new ByteWriter();
  w.raw(ESC, 0x40);
  for (let i = 0; i < copies; i++) {
    w.raw(ESC, 0x61, 0x01);
    if (label.storeName) w.line(label.storeName);
    w.raw(ESC, 0x45, 0x01).line(label.productName).raw(ESC, 0x45, 0x00);
    pushBarcode(w, label.barcode, 70);
    if (label.price !== undefined) w.raw(ESC, 0x45, 0x01).line(money(label.price)).raw(ESC, 0x45, 0x00);
    if (label.expiry) w.line(`Best before: ${label.expiry}`);
    w.line("\n");
  }
  w.raw(GS, 0x56, 0x42, 0x00);
  return w.toUint8Array();
}

/** TSPL (TSC, Xprinter, Gprinter and most budget label printers). 8 dots/mm at 203 dpi. */
function encodeTsplLabel(label: LabelData, copies: number, widthMm: number, heightMm: number): Uint8Array {
  const q = (s: string) => toAscii(s).replace(/"/g, "'");
  const v = sanitizeBarcodeValue(label.barcode);
  const type = barcodeFormatFor(v) === "EAN13" ? "EAN13" : "128";
  const dots = (mm: number) => Math.round(mm * 8);
  const x = dots(2);
  const lines = [
    `SIZE ${widthMm} mm, ${heightMm} mm`,
    "GAP 2 mm, 0 mm",
    "DIRECTION 1",
    "CLS",
    `TEXT ${x},${dots(1.5)},"2",0,1,1,"${q(label.productName).slice(0, 28)}"`,
    `BARCODE ${x},${dots(6)},"${type}",${dots(heightMm * 0.4)},1,0,2,2,"${type === "EAN13" ? v.slice(0, 12) : q(v)}"`,
  ];
  if (label.price !== undefined) {
    lines.push(`TEXT ${x},${dots(heightMm - 5)},"3",0,1,1,"${q(money(label.price))}"`);
  }
  lines.push(`PRINT ${copies},1`, "");
  return new TextEncoder().encode(lines.join("\r\n"));
}

/** ZPL (Zebra and compatible label printers). 8 dots/mm at 203 dpi. */
function encodeZplLabel(label: LabelData, copies: number, widthMm: number, heightMm: number): Uint8Array {
  const q = (s: string) => toAscii(s).replace(/[\^~]/g, "-");
  const v = sanitizeBarcodeValue(label.barcode);
  const dots = (mm: number) => Math.round(mm * 8);
  const barcode =
    barcodeFormatFor(v) === "EAN13"
      ? `^FO16,${dots(6)}^BY2^BEN,${dots(heightMm * 0.4)},Y,N^FD${v.slice(0, 12)}^FS`
      : `^FO16,${dots(6)}^BY2^BCN,${dots(heightMm * 0.4)},Y,N,N^FD${q(v)}^FS`;
  const zpl = [
    "^XA",
    `^PW${dots(widthMm)}`,
    `^LL${dots(heightMm)}`,
    `^FO16,12^A0N,22,22^FD${q(label.productName).slice(0, 30)}^FS`,
    barcode,
    label.price !== undefined ? `^FO16,${dots(heightMm - 5)}^A0N,26,26^FD${q(money(label.price))}^FS` : "",
    `^PQ${copies}`,
    "^XZ",
  ].join("");
  return new TextEncoder().encode(zpl);
}

export function encodeLabel(label: LabelData, copies: number, printer: PrinterConfig): Uint8Array {
  const widthMm = printer.labelWidthMm || 50;
  const heightMm = printer.labelHeightMm || 30;
  switch (printer.language) {
    case "tspl":
      return encodeTsplLabel(label, copies, widthMm, heightMm);
    case "zpl":
      return encodeZplLabel(label, copies, widthMm, heightMm);
    default:
      return encodeEscPosLabel(label, copies);
  }
}
