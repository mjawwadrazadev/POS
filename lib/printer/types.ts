export type PrinterTransport = "usb" | "bluetooth" | "network" | "browser_fallback";

export type PrinterPaperWidth = "58mm" | "80mm";

export type PrinterRole = "receipt" | "kitchen" | "barcode_label";

export interface PrinterConfig {
  id: string;
  name: string;
  transport: PrinterTransport;
  paperWidth: PrinterPaperWidth;
  ipAddress?: string;
  port?: number;
  role: PrinterRole;
  isDefault?: boolean;
  connected?: boolean;
}

export interface PrintOrderData {
  orderNumber: string;
  dateStr: string;
  cashierName: string;
  customerName?: string;
  branchName?: string;
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
  paperWidth?: PrinterPaperWidth;
}
