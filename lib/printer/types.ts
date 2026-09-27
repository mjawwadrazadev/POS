/**
 * How the terminal reaches the printer.
 * - system:    the operating system's print dialog. Works with ANY installed printer (USB, Bluetooth,
 *              Wi-Fi/network, A4, thermal or label) as long as it has a driver.
 * - usb:       raw bytes over WebUSB (Chrome/Edge), for USB thermal printers without a driver.
 * - serial:    raw bytes over Web Serial (Chrome/Edge): USB printers that appear as a COM port and
 *              classic Bluetooth printers paired in Windows/Android (they show up as a COM port too).
 * - bluetooth: raw bytes over Bluetooth Low Energy (Chrome/Edge/Android).
 * - network:   raw bytes to a LAN printer (IP:9100) through the local print bridge (tools/print-bridge.mjs).
 */
export type PrinterTransport = "system" | "usb" | "serial" | "bluetooth" | "network";

/** Command language for raw transports. Receipts are always ESC/POS; labels can use any of the three. */
export type PrinterLanguage = "escpos" | "tspl" | "zpl";

export type PrinterPaperWidth = "58mm" | "80mm";

export type PrinterRole = "receipt" | "kitchen" | "barcode_label";

export interface PrinterConfig {
  id: string;
  name: string;
  transport: PrinterTransport;
  role: PrinterRole;
  paperWidth: PrinterPaperWidth;
  language?: PrinterLanguage;
  /** Label printers: label size in millimetres */
  labelWidthMm?: number;
  labelHeightMm?: number;
  /** ESC/POS: kick the cash drawer after a receipt */
  openCashDrawer?: boolean;
  // network
  ipAddress?: string;
  port?: number;
  // usb / serial device identity, used to find the device again without a prompt
  usbVendorId?: number;
  usbProductId?: number;
  serialNumber?: string;
  baudRate?: number;
  // bluetooth
  bluetoothDeviceId?: string;
  isDefault?: boolean;
}

export interface PrintOrderData {
  orderNumber: string;
  dateStr: string;
  cashierName: string;
  customerName?: string;
  /** Business name printed at the top of the receipt */
  storeName?: string;
  branchName?: string;
  /** Optional heading under the store name, e.g. "CONSULTATION PERCHI" */
  title?: string;
  /** Extra "Label: value" lines printed after the order details (e.g. doctor, patient) */
  extraLines?: { label: string; value: string }[];
  items: {
    name: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  taxAmount: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod: string;
  taxRate?: number;
  // FBR fiscal invoice (only for stores reporting to FBR)
  fbrInvoiceNumber?: string;
  fbrSandbox?: boolean;
  footer?: string;
  paperWidth?: PrinterPaperWidth;
  openCashDrawer?: boolean;
}

export interface LabelData {
  storeName?: string;
  productName: string;
  barcode: string;
  sku?: string;
  price?: number;
  weightGrams?: number;
  expiry?: string;
}
