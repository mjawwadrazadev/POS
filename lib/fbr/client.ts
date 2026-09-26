import { Organization } from "@/models/Organization";
import { Order, IOrder } from "@/models/Order";
import { Product } from "@/models/Product";
import { FBR_ENDPOINTS, FbrEnvironment, FbrMode } from "./constants";
import {
  buildDigitalInvoice,
  buildImsInvoice,
  FbrOrderInput,
  FbrResult,
  FbrSellerSettings,
  parseDigitalInvoiceResponse,
  parseImsResponse,
} from "./payload";

const REQUEST_TIMEOUT_MS = 10_000;

export interface ActiveFbrSettings extends FbrSellerSettings {
  mode: FbrMode;
  environment: FbrEnvironment;
  token: string;
}

/** The tenant's FBR settings including the token, or null when the integration is off or incomplete. */
export async function getActiveFbrSettings(organizationId: string): Promise<ActiveFbrSettings | null> {
  const org = await Organization.findById(organizationId).select("+fbr.token").lean();
  const fbr: any = org?.fbr;
  if (!org || !fbr?.enabled || !fbr.token || !fbr.ntn) return null;
  if (fbr.mode === "pos_ims" && !fbr.posId) return null;
  return {
    mode: fbr.mode,
    environment: fbr.environment,
    token: fbr.token,
    posId: fbr.posId,
    ntn: fbr.ntn,
    businessName: fbr.businessName || org.name,
    province: fbr.province,
    address: fbr.address || org.address,
    defaultHsCode: fbr.defaultHsCode,
    saleType: fbr.saleType,
    scenarioId: fbr.scenarioId,
  };
}

async function postJson(url: string, token: string, payload: unknown): Promise<{ status: number; body: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await res.text();
    let body: any = text;
    try {
      body = JSON.parse(text);
    } catch {
      // non-JSON error page from the gateway
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

/** Sends one invoice to FBR and interprets the answer. Never throws. */
export async function submitInvoice(
  settings: ActiveFbrSettings,
  order: FbrOrderInput,
  { validateOnly = false }: { validateOnly?: boolean } = {}
): Promise<FbrResult> {
  const sandbox = settings.environment === "sandbox";
  try {
    if (settings.mode === "pos_ims") {
      const { status, body } = await postJson(FBR_ENDPOINTS.pos_ims[settings.environment], settings.token, buildImsInvoice(order, settings));
      if (status === 401) return { ok: false, error: "FBR rejected the security token (401 Unauthorized)" };
      return parseImsResponse(body);
    }

    const endpoints = validateOnly ? FBR_ENDPOINTS.digital_invoicing_validate : FBR_ENDPOINTS.digital_invoicing;
    const { status, body } = await postJson(endpoints[settings.environment], settings.token, buildDigitalInvoice(order, settings, sandbox));
    if (status === 401) return { ok: false, error: "FBR rejected the security token (401 Unauthorized)" };
    if (status >= 500) return { ok: false, error: `FBR server error (HTTP ${status}), try again later` };
    return parseDigitalInvoiceResponse(body);
  } catch (err: any) {
    return {
      ok: false,
      error: err?.name === "AbortError" ? "FBR did not respond in time" : `Could not reach FBR: ${err?.message || err}`,
    };
  }
}

async function toFbrOrderInput(order: IOrder): Promise<FbrOrderInput> {
  const products = await Product.find({ _id: { $in: order.items.map((i) => i.productId) } }).select("hsCode").lean();
  const hsById = new Map(products.map((p: any) => [p._id.toString(), p.hsCode]));
  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    customerName: order.customerName,
    items: order.items.map((i) => ({
      sku: i.sku,
      productName: i.productName,
      quantity: i.quantity,
      total: i.total,
      discount: i.discount || 0,
      hsCode: hsById.get(i.productId.toString()),
    })),
    discountTotal: order.discountTotal || 0,
    taxRate: order.taxRate || 0,
    taxAmount: order.taxAmount || 0,
    grandTotal: order.grandTotal,
    paymentMethod: order.paymentMethod,
  };
}

/**
 * Reports a completed order to FBR and records the outcome on the order.
 * A failed report never undoes the sale: the order stays "failed" and can be resent.
 */
export async function reportOrderToFbr(order: IOrder, settings?: ActiveFbrSettings | null): Promise<IOrder> {
  const active = settings === undefined ? await getActiveFbrSettings(order.organizationId.toString()) : settings;
  if (!active) return order;
  if (order.fbr?.status === "reported") return order;

  const result = await submitInvoice(active, await toFbrOrderInput(order));
  const now = new Date();
  const set: Record<string, unknown> = {
    "fbr.mode": active.mode,
    "fbr.environment": active.environment,
    "fbr.status": result.ok ? "reported" : "failed",
    "fbr.lastAttemptAt": now,
  };
  if (result.ok) {
    set["fbr.reportedAt"] = now;
    if (result.invoiceNumber) set["fbr.invoiceNumber"] = result.invoiceNumber;
  } else {
    set["fbr.error"] = result.error;
  }
  const saved = await Order.findOneAndUpdate(
    // Never overwrite an order that another request already reported
    { _id: order._id, "fbr.status": { $ne: "reported" } },
    { $set: set, $inc: { "fbr.attempts": 1 }, ...(result.ok ? { $unset: { "fbr.error": 1 } } : {}) },
    { new: true }
  );
  return saved || order;
}

/** A one-line sample invoice for connection tests. */
function sampleInvoice(settings: ActiveFbrSettings): FbrOrderInput {
  return {
    orderNumber: `TEST-${Date.now()}`,
    createdAt: new Date(),
    customerName: "Connection Test",
    items: [{ sku: "TEST-1", productName: "Connection test item", quantity: 1, total: 100, discount: 0, hsCode: settings.defaultHsCode }],
    discountTotal: 0,
    taxRate: 18,
    taxAmount: 18,
    grandTotal: 118,
    paymentMethod: "cash",
  };
}

/**
 * Checks credentials against FBR without creating a real invoice where possible:
 * Digital Invoicing has a validate-only method; POS Integration has none, so its test is sandbox-only.
 */
export async function testFbrConnection(settings: ActiveFbrSettings): Promise<FbrResult & { note?: string }> {
  if (settings.mode === "pos_ims" && settings.environment === "production") {
    return {
      ok: false,
      error: "POS Integration has no test method in production — a test would create a real fiscal invoice. Test in sandbox, then switch to production.",
    };
  }
  const result = await submitInvoice(settings, sampleInvoice(settings), { validateOnly: true });
  return { ...result, note: settings.mode === "digital_invoicing" ? "Validated only — nothing was recorded at FBR." : "Sandbox invoice posted." };
}
