import { PrintOrderData } from "./types";

/**
 * Encodes order details into binary ESC/POS byte array for 58mm/80mm thermal receipt printers.
 */
/** Native ESC/POS QR code (GS ( k, model 2), supported by standard 58/80mm thermal printers. */
function pushQrCode(bytes: number[], text: string) {
  const data = Array.from(new TextEncoder().encode(text));
  const len = data.length + 3;
  bytes.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00); // model 2
  bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x06); // module size 6
  bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31); // error correction M
  bytes.push(0x1d, 0x28, 0x6b, len & 0xff, (len >> 8) & 0xff, 0x31, 0x50, 0x30, ...data); // store data
  bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30); // print
  bytes.push(0x0a);
}

export function encodeEscPosReceipt(order: PrintOrderData): Uint8Array {
  const bytes: number[] = [];

  const textToBytes = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      bytes.push(text.charCodeAt(i) & 0xff);
    }
  };

  const line = (text: string = "") => {
    textToBytes(text + "\n");
  };

  const is80mm = order.paperWidth === "80mm";
  const lineLength = is80mm ? 48 : 32;
  const divider = "-".repeat(lineLength);

  // Initialize Printer
  bytes.push(0x1b, 0x40);

  // Header - Center Alignment
  bytes.push(0x1b, 0x61, 0x01);
  bytes.push(0x1d, 0x21, 0x11); // Double Size
  bytes.push(0x1b, 0x45, 0x01); // Bold ON
  line("RST POS");
  bytes.push(0x1d, 0x21, 0x00); // Normal Size
  line(order.branchName || "Main Enterprise Branch");
  bytes.push(0x1b, 0x45, 0x00); // Bold OFF
  line("NIB IT POS & Inventory Suite");
  line(divider);

  // Order Info - Left Alignment
  bytes.push(0x1b, 0x61, 0x00);
  line(`Order #: ${order.orderNumber}`);
  line(`Date   : ${order.dateStr}`);
  line(`Cashier: ${order.cashierName}`);
  if (order.customerName) {
    line(`Customer: ${order.customerName}`);
  }
  line(`Payment : ${order.paymentMethod.toUpperCase()}`);
  line(divider);

  // Items Header
  line("ITEM".padEnd(lineLength - 14) + "QTY".padStart(4) + "TOTAL".padStart(10));
  line(divider);

  // Item Rows
  for (const item of order.items) {
    const nameTruncated = item.name.length > lineLength - 15 ? item.name.slice(0, lineLength - 15) : item.name;
    const qtyStr = `x${item.quantity}`.padStart(4);
    const totalStr = `PKR ${item.total.toLocaleString()}`.padStart(10);
    line(nameTruncated.padEnd(lineLength - 14) + qtyStr + totalStr);
  }
  line(divider);

  // Totals - Right Alignment
  bytes.push(0x1b, 0x61, 0x02);
  line(`Subtotal: PKR ${order.subtotal.toLocaleString()}`);
  if (order.taxAmount > 0) {
    const rateLabel = order.taxRate !== undefined ? ` (${order.taxRate}%)` : "";
    line(`Sales Tax${rateLabel}: PKR ${order.taxAmount.toLocaleString()}`);
  }
  if (order.discountTotal > 0) {
    line(`Discount: -PKR ${order.discountTotal.toLocaleString()}`);
  }
  line(divider);
  bytes.push(0x1b, 0x45, 0x01); // Bold ON
  bytes.push(0x1d, 0x21, 0x01); // Double Height
  line(`GRAND TOTAL: PKR ${order.grandTotal.toLocaleString()}`);
  bytes.push(0x1d, 0x21, 0x00);
  bytes.push(0x1b, 0x45, 0x00); // Bold OFF

  // Footer - Center Alignment
  bytes.push(0x1b, 0x61, 0x01);
  line(divider);

  // FBR fiscal invoice: number + QR code for verification
  if (order.fbrInvoiceNumber) {
    bytes.push(0x1b, 0x45, 0x01);
    line(order.fbrSandbox ? "FBR SANDBOX - TEST INVOICE" : "FBR POS INVOICE");
    bytes.push(0x1b, 0x45, 0x00);
    line(`FBR Inv #: ${order.fbrInvoiceNumber}`);
    pushQrCode(bytes, order.fbrInvoiceNumber);
    line("Verify via FBR Tax Asaan app");
    line(divider);
  }
  line("Thank you for your business!");
  line("Powered by RST POS • Universal Engine");
  line("\n\n\n");

  // Cut Paper Command
  bytes.push(0x1d, 0x56, 0x00);

  return Uint8Array.from(bytes);
}
