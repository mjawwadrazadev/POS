/**
 * Builds FBR invoice payloads from a completed POS order. Pure functions (no I/O) so they are unit tested.
 *
 * POS orders charge one tax rate on the whole bill after an optional bill-level discount, while FBR wants
 * value, discount and tax per item. The bill discount and tax are spread over the lines in proportion to
 * each line's value; any rounding remainder goes to the last line so the item totals always add up to the
 * order totals printed on the receipt.
 */
import { DEFAULT_DI_SALE_TYPE, DEFAULT_DI_SCENARIO, DEFAULT_DI_UOM } from "./constants";

export interface FbrOrderLine {
  sku: string;
  productName: string;
  quantity: number;
  total: number; // line amount after the line discount, before bill discount and tax
  discount: number; // line discount
  hsCode?: string;
}

export interface FbrOrderInput {
  orderNumber: string;
  createdAt: Date;
  customerName?: string;
  items: FbrOrderLine[];
  discountTotal: number; // bill-level discount amount
  taxRate: number; // percent
  taxAmount: number;
  grandTotal: number;
  paymentMethod: "cash" | "card" | "wallet" | "split";
}

export interface FbrSellerSettings {
  posId?: string;
  ntn: string;
  businessName: string;
  province?: string;
  address?: string;
  defaultHsCode?: string;
  saleType?: string;
  scenarioId?: string;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface AllocatedLine extends FbrOrderLine {
  billDiscount: number; // share of the bill-level discount
  valueExclTax: number; // after all discounts
  tax: number;
  valueInclTax: number;
}

/** Spreads the bill discount and tax across lines; the sums match the order exactly. */
export function allocateLines(order: FbrOrderInput): AllocatedLine[] {
  const subtotal = order.items.reduce((s, l) => s + l.total, 0);
  let discountLeft = round2(order.discountTotal);
  let taxLeft = round2(order.taxAmount);

  return order.items.map((line, i) => {
    const isLast = i === order.items.length - 1;
    const share = subtotal > 0 ? line.total / subtotal : 0;
    const billDiscount = isLast ? discountLeft : round2(order.discountTotal * share);
    const valueExclTax = round2(line.total - billDiscount);
    const tax = isLast ? taxLeft : round2(valueExclTax * (order.taxRate / 100));
    discountLeft = round2(discountLeft - billDiscount);
    taxLeft = round2(taxLeft - tax);
    return { ...line, billDiscount, valueExclTax, tax, valueInclTax: round2(valueExclTax + tax) };
  });
}

/** "YYYY-MM-DD HH:mm:ss" in Pakistan time, as FBR expects. */
export function pakistanDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")}:${get("second")}`;
}

// FBR IMS payment modes: 1 Cash, 2 Card, 3 Gift Voucher, 4 Loyalty Card, 5 Mixed, 6 Cheque
const IMS_PAYMENT_MODE: Record<FbrOrderInput["paymentMethod"], number> = {
  cash: 1,
  card: 2,
  wallet: 2, // mobile wallets settle like card payments
  split: 5,
};

/** Payload for FBR POS Integration (IMS) — PostData. */
export function buildImsInvoice(order: FbrOrderInput, seller: FbrSellerSettings) {
  const lines = allocateLines(order);
  const totalSaleValue = round2(lines.reduce((s, l) => s + l.valueExclTax, 0));
  const totalDiscount = round2(lines.reduce((s, l) => s + l.discount + l.billDiscount, 0));

  return {
    InvoiceNumber: "",
    POSID: Number(seller.posId),
    USIN: order.orderNumber,
    DateTime: pakistanDateTime(order.createdAt),
    BuyerNTN: "",
    BuyerCNIC: "",
    BuyerName: order.customerName || "Walk-in Customer",
    BuyerPhoneNumber: "",
    TotalBillAmount: round2(order.grandTotal),
    TotalQuantity: lines.reduce((s, l) => s + l.quantity, 0),
    TotalSaleValue: totalSaleValue,
    TotalTaxCharged: round2(order.taxAmount),
    Discount: totalDiscount,
    FurtherTax: 0,
    PaymentMode: IMS_PAYMENT_MODE[order.paymentMethod] ?? 1,
    RefUSIN: null,
    InvoiceType: 1, // 1 = new sale
    Items: lines.map((l) => ({
      ItemCode: l.sku,
      ItemName: l.productName,
      Quantity: l.quantity,
      PCTCode: (l.hsCode || seller.defaultHsCode || "").replace(/\./g, ""),
      TaxRate: order.taxRate,
      SaleValue: l.valueExclTax,
      TotalAmount: l.valueInclTax,
      TaxCharged: l.tax,
      Discount: round2(l.discount + l.billDiscount),
      FurtherTax: 0,
      InvoiceType: 1,
      RefUSIN: null,
    })),
  };
}

/** Payload for FBR Digital Invoicing — postinvoicedata / validateinvoicedata. */
export function buildDigitalInvoice(order: FbrOrderInput, seller: FbrSellerSettings, sandbox: boolean) {
  const lines = allocateLines(order);
  const date = pakistanDateTime(order.createdAt).slice(0, 10);

  return {
    invoiceType: "Sale Invoice",
    invoiceDate: date,
    sellerNTNCNIC: seller.ntn.replace(/-/g, ""),
    sellerBusinessName: seller.businessName,
    sellerProvince: seller.province || "",
    sellerAddress: seller.address || "",
    // POS sales are to walk-in (unregistered) end consumers
    buyerNTNCNIC: "",
    buyerBusinessName: order.customerName || "Walk-in Customer",
    buyerProvince: seller.province || "",
    buyerAddress: seller.address || "",
    buyerRegistrationType: "Unregistered",
    invoiceRefNo: "",
    ...(sandbox ? { scenarioId: seller.scenarioId || DEFAULT_DI_SCENARIO } : {}),
    items: lines.map((l) => ({
      hsCode: l.hsCode || seller.defaultHsCode || "",
      productDescription: l.productName,
      rate: `${order.taxRate}%`,
      uoM: DEFAULT_DI_UOM,
      quantity: l.quantity,
      totalValues: l.valueInclTax,
      valueSalesExcludingST: l.valueExclTax,
      fixedNotifiedValueOrRetailPrice: 0,
      salesTaxApplicable: l.tax,
      salesTaxWithheldAtSource: 0,
      extraTax: 0,
      furtherTax: 0,
      sroScheduleNo: "",
      fedPayable: 0,
      discount: round2(l.discount + l.billDiscount),
      saleType: seller.saleType || DEFAULT_DI_SALE_TYPE,
      sroItemSerialNo: "",
    })),
  };
}

export interface FbrResult {
  ok: boolean;
  invoiceNumber?: string;
  error?: string;
}

/** Reads an IMS PostData response. Success is Code "100" with an InvoiceNumber. */
export function parseImsResponse(body: any): FbrResult {
  const code = String(body?.Code ?? body?.code ?? "");
  const invoiceNumber = body?.InvoiceNumber ?? body?.invoiceNumber;
  if (code === "100" && invoiceNumber) return { ok: true, invoiceNumber: String(invoiceNumber) };
  const error = body?.Response || body?.Errors || body?.message || body?.fault?.message || "FBR rejected the invoice";
  return { ok: false, error: `${code ? `[${code}] ` : ""}${typeof error === "string" ? error : JSON.stringify(error)}` };
}

/** Reads a DI response. Valid when validationResponse.statusCode is "00" and every item is valid. */
export function parseDigitalInvoiceResponse(body: any): FbrResult {
  const v = body?.validationResponse;
  const itemErrors = (v?.invoiceStatuses || [])
    .filter((s: any) => s?.statusCode && s.statusCode !== "00")
    .map((s: any) => `item ${s.itemSNo}: [${s.errorCode}] ${s.error}`);
  if (v?.statusCode === "00" && itemErrors.length === 0) {
    return { ok: true, invoiceNumber: body?.invoiceNumber ? String(body.invoiceNumber) : undefined };
  }
  const headerError = v?.error ? `[${v.errorCode || v.statusCode}] ${v.error}` : "";
  return { ok: false, error: [headerError, ...itemErrors].filter(Boolean).join("; ") || "FBR rejected the invoice" };
}
