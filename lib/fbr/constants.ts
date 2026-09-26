/**
 * FBR (Federal Board of Revenue, Pakistan) integration — shared constants.
 * Client-safe: no server imports, so forms can use the same option lists.
 *
 * Two FBR systems are supported, chosen per tenant:
 *  - "pos_ims": POS Integration through FBR's IMS for Tier-1 retailers / restaurants.
 *     Each sale gets an FBR fiscal invoice number that is printed on the receipt with a QR code.
 *     Credentials: POS ID (from IRIS → Registration → POS Client Registration) + security token.
 *  - "digital_invoicing": Digital Invoicing (DI) for sales-tax-registered persons (PRAL API).
 *     Credentials: seller NTN/CNIC + security token issued by PRAL (valid 5 years).
 * Sandbox and production are separate: FBR issues different tokens for each.
 */

export type FbrMode = "pos_ims" | "digital_invoicing";
export type FbrEnvironment = "sandbox" | "production";

export const FBR_MODE_LABELS: Record<FbrMode, string> = {
  pos_ims: "POS Integration (Tier-1 retailer / restaurant)",
  digital_invoicing: "Digital Invoicing (sales tax registered)",
};

export const FBR_ENDPOINTS = {
  pos_ims: {
    sandbox: "https://esp.fbr.gov.pk:8244/FBR/v1/api/Live/PostData",
    production: "https://gw.fbr.gov.pk/imsp/v1/api/Live/PostData",
  },
  digital_invoicing: {
    sandbox: "https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata_sb",
    production: "https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata",
  },
  digital_invoicing_validate: {
    sandbox: "https://gw.fbr.gov.pk/di_data/v1/di/validateinvoicedata_sb",
    production: "https://gw.fbr.gov.pk/di_data/v1/di/validateinvoicedata",
  },
} as const;

// Province names as used by the DI reference API (/pdi/v1/provinces)
export const FBR_PROVINCES = [
  "PUNJAB",
  "SINDH",
  "KHYBER PAKHTUNKHWA",
  "BALOCHISTAN",
  "CAPITAL TERRITORY",
  "GILGIT BALTISTAN",
  "AZAD JAMMU AND KASHMIR",
];

// DI sandbox scenario used when a retailer sells to end consumers at the standard rate
export const DEFAULT_DI_SCENARIO = "SN026";
export const DEFAULT_DI_SALE_TYPE = "Goods at standard rate (default)";
export const DEFAULT_DI_UOM = "Numbers, pieces, units";

/** NTN is 7 digits (optionally with a check digit, e.g. 1234567-8); CNIC is 13 digits. */
export function isValidNtnOrCnic(value: string): boolean {
  const digits = value.replace(/-/g, "");
  return /^\d{7,8}$/.test(digits) || /^\d{13}$/.test(digits);
}

/** HS / PCT code, e.g. 0101.2100 or 11001010 */
export function isValidHsCode(value: string): boolean {
  return /^\d{4}(\.?\d{2,6})?$/.test(value.trim());
}
