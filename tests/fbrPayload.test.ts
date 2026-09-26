import { describe, it, expect } from "vitest";
import {
  allocateLines,
  buildDigitalInvoice,
  buildImsInvoice,
  pakistanDateTime,
  parseDigitalInvoiceResponse,
  parseImsResponse,
  FbrOrderInput,
} from "@/lib/fbr/payload";
import { normalizeFbrSettings } from "@/lib/fbr/settings";
import { isValidHsCode, isValidNtnOrCnic } from "@/lib/fbr/constants";

// Same math as POST /api/orders: bill discount on the subtotal, one tax rate on the rest
function order(lines: { total: number; discount?: number; qty?: number }[], globalPct: number, taxRate: number): FbrOrderInput {
  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const subtotal = round(lines.reduce((s, l) => s + l.total, 0));
  const discountTotal = round(subtotal * (globalPct / 100));
  const taxable = round(subtotal - discountTotal);
  const taxAmount = round(taxable * (taxRate / 100));
  return {
    orderNumber: "ORD-TEST-1",
    createdAt: new Date("2026-09-26T10:15:30Z"),
    customerName: "Walk-in Customer",
    items: lines.map((l, i) => ({
      sku: `SKU-${i}`,
      productName: `Item ${i}`,
      quantity: l.qty ?? 1,
      total: l.total,
      discount: l.discount ?? 0,
    })),
    discountTotal,
    taxRate,
    taxAmount,
    grandTotal: round(taxable + taxAmount),
    paymentMethod: "cash",
  };
}

const seller = { posId: "110014", ntn: "1234567", businessName: "Test Store", province: "PUNJAB", address: "Lahore", defaultHsCode: "2106.9090" };

describe("allocateLines", () => {
  it("spreads discount and tax so line sums equal the order totals exactly", () => {
    const o = order([{ total: 333.33 }, { total: 199.99 }, { total: 0.01 }, { total: 1250 }], 7.5, 16);
    const lines = allocateLines(o);
    const sum = (f: (l: (typeof lines)[number]) => number) => Math.round(lines.reduce((s, l) => s + f(l), 0) * 100) / 100;
    expect(sum((l) => l.billDiscount)).toBe(o.discountTotal);
    expect(sum((l) => l.tax)).toBe(o.taxAmount);
    expect(sum((l) => l.valueInclTax)).toBe(o.grandTotal);
  });

  it("handles no discount and zero tax", () => {
    const o = order([{ total: 100 }, { total: 50 }], 0, 0);
    const lines = allocateLines(o);
    expect(lines.map((l) => l.tax)).toEqual([0, 0]);
    expect(lines.map((l) => l.valueExclTax)).toEqual([100, 50]);
  });
});

describe("IMS payload", () => {
  it("maps an order to the FBR POS Integration format", () => {
    const o = order([{ total: 200, discount: 20, qty: 2 }, { total: 100 }], 10, 18);
    const p = buildImsInvoice({ ...o, paymentMethod: "split" }, seller);
    expect(p.POSID).toBe(110014);
    expect(p.USIN).toBe("ORD-TEST-1");
    expect(p.DateTime).toBe("2026-09-26 15:15:30"); // Asia/Karachi is UTC+5
    expect(p.PaymentMode).toBe(5);
    expect(p.InvoiceType).toBe(1);
    expect(p.TotalBillAmount).toBe(o.grandTotal);
    expect(p.TotalTaxCharged).toBe(o.taxAmount);
    expect(p.TotalQuantity).toBe(3);
    expect(p.Items[0].PCTCode).toBe("21069090");
    expect(p.Items.reduce((s, i) => s + i.TotalAmount, 0)).toBeCloseTo(o.grandTotal, 2);
  });
});

describe("Digital Invoicing payload", () => {
  it("adds the scenario only in sandbox and uses FBR field names", () => {
    const o = order([{ total: 1000 }], 0, 18);
    const sandbox = buildDigitalInvoice(o, seller, true);
    const live = buildDigitalInvoice(o, seller, false);
    expect(sandbox.scenarioId).toBe("SN026");
    expect("scenarioId" in live).toBe(false);
    expect(live.invoiceDate).toBe("2026-09-26");
    expect(live.buyerRegistrationType).toBe("Unregistered");
    expect(live.items[0]).toMatchObject({ hsCode: "2106.9090", rate: "18%", valueSalesExcludingST: 1000, salesTaxApplicable: 180, totalValues: 1180 });
  });
});

describe("FBR responses", () => {
  it("reads IMS success and failure", () => {
    expect(parseImsResponse({ InvoiceNumber: "110014-260926151530-0001", Code: "100", Response: "Invoice received successfully" })).toEqual({
      ok: true,
      invoiceNumber: "110014-260926151530-0001",
    });
    expect(parseImsResponse({ Code: "401", Response: "Unauthorized" }).ok).toBe(false);
  });

  it("reads DI valid, header-invalid and item-invalid responses", () => {
    expect(
      parseDigitalInvoiceResponse({
        invoiceNumber: "7000007DI1747119701593",
        validationResponse: { statusCode: "00", status: "Valid", invoiceStatuses: [{ itemSNo: "1", statusCode: "00" }] },
      })
    ).toEqual({ ok: true, invoiceNumber: "7000007DI1747119701593" });
    expect(
      parseDigitalInvoiceResponse({ validationResponse: { statusCode: "01", errorCode: "0052", error: "Provide proper HS Code" } }).error
    ).toContain("0052");
    expect(
      parseDigitalInvoiceResponse({
        validationResponse: { statusCode: "00", invoiceStatuses: [{ itemSNo: "1", statusCode: "01", errorCode: "0046", error: "Provide rate." }] },
      }).error
    ).toContain("0046");
  });
});

describe("FBR settings validation", () => {
  it("lets unregistered businesses skip FBR entirely", () => {
    expect(normalizeFbrSettings(undefined).settings).toMatchObject({ enabled: false });
    expect(normalizeFbrSettings({ enabled: false }).settings).toMatchObject({ enabled: false });
  });

  it("requires POS ID for POS Integration and province/address for Digital Invoicing", () => {
    const base = { enabled: true, environment: "sandbox", ntn: "1234567", token: "abc", defaultHsCode: "2106.9090" };
    expect(normalizeFbrSettings({ ...base, mode: "pos_ims" }).error).toMatch(/POS ID/);
    expect(normalizeFbrSettings({ ...base, mode: "pos_ims", posId: "110014" }).settings).toMatchObject({ mode: "pos_ims", posId: "110014" });
    expect(normalizeFbrSettings({ ...base, mode: "digital_invoicing" }).error).toMatch(/province/);
    expect(
      normalizeFbrSettings({ ...base, mode: "digital_invoicing", province: "punjab", address: "Lahore" }).settings
    ).toMatchObject({ province: "PUNJAB" });
  });

  it("keeps a saved token when the field is left blank on edit", () => {
    const input = { enabled: true, mode: "pos_ims", environment: "sandbox", ntn: "1234567", posId: "110014", defaultHsCode: "2106.9090" };
    expect(normalizeFbrSettings(input).error).toMatch(/token/);
    const { settings } = normalizeFbrSettings(input, { hasSavedToken: true });
    expect(settings && "token" in settings).toBe(false);
  });

  it("validates NTN/CNIC and HS codes", () => {
    expect(isValidNtnOrCnic("1234567")).toBe(true);
    expect(isValidNtnOrCnic("1234567-8")).toBe(true);
    expect(isValidNtnOrCnic("35201-1234567-1")).toBe(true);
    expect(isValidNtnOrCnic("12345")).toBe(false);
    expect(isValidHsCode("2106.9090")).toBe(true);
    expect(isValidHsCode("21069090")).toBe(true);
    expect(isValidHsCode("abc")).toBe(false);
  });
});

describe("pakistanDateTime", () => {
  it("formats in Pakistan time", () => {
    expect(pakistanDateTime(new Date("2026-01-01T19:00:00Z"))).toBe("2026-01-02 00:00:00");
  });
});
