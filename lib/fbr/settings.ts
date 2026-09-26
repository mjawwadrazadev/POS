import { FBR_PROVINCES, FbrEnvironment, FbrMode, isValidHsCode, isValidNtnOrCnic } from "./constants";

export interface FbrSettingsInput {
  enabled?: boolean;
  mode?: string;
  environment?: string;
  ntn?: string;
  strn?: string;
  businessName?: string;
  province?: string;
  address?: string;
  posId?: string;
  token?: string;
  defaultHsCode?: string;
  saleType?: string;
  scenarioId?: string;
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Validates FBR settings coming from a form. Returns the fields to store, or an error message.
 * `hasSavedToken` lets an edit keep the existing token when the field is left blank.
 */
export function normalizeFbrSettings(
  input: FbrSettingsInput | undefined,
  { hasSavedToken = false }: { hasSavedToken?: boolean } = {}
): { settings?: Record<string, unknown>; error?: string } {
  if (!input || !input.enabled) return { settings: { enabled: false, updatedAt: new Date() } };

  const mode = input.mode as FbrMode;
  const environment = input.environment as FbrEnvironment;
  if (mode !== "pos_ims" && mode !== "digital_invoicing") return { error: "Choose the FBR integration type" };
  if (environment !== "sandbox" && environment !== "production") return { error: "Choose sandbox or production" };

  const ntn = str(input.ntn, 20);
  if (!isValidNtnOrCnic(ntn)) return { error: "Enter a valid NTN (7 digits) or CNIC (13 digits)" };

  const token = str(input.token, 500);
  if (!token && !hasSavedToken) return { error: "Enter the security token issued by FBR/PRAL" };

  const defaultHsCode = str(input.defaultHsCode, 20);
  if (!isValidHsCode(defaultHsCode)) {
    return { error: "Enter a default HS/PCT code (e.g. 2106.9090) — used for products without their own code" };
  }

  const settings: Record<string, unknown> = {
    enabled: true,
    mode,
    environment,
    ntn,
    strn: str(input.strn, 30) || undefined,
    businessName: str(input.businessName, 150) || undefined,
    defaultHsCode,
    updatedAt: new Date(),
  };
  if (token) settings.token = token;

  if (mode === "pos_ims") {
    const posId = str(input.posId, 20);
    if (!/^\d{4,12}$/.test(posId)) return { error: "Enter the FBR POS ID (the POS registration number from IRIS)" };
    settings.posId = posId;
  } else {
    const province = str(input.province, 50).toUpperCase();
    if (!FBR_PROVINCES.includes(province)) return { error: "Choose the seller province" };
    const address = str(input.address, 250);
    if (!address) return { error: "Enter the business address registered with FBR" };
    settings.province = province;
    settings.address = address;
    settings.saleType = str(input.saleType, 120) || undefined;
    settings.scenarioId = str(input.scenarioId, 10) || undefined;
  }

  return { settings };
}

/** Settings as shown in the dashboard: the token is never sent back, only whether one is saved. */
export function describeFbrSettings(fbr: any, hasToken: boolean) {
  if (!fbr?.enabled) return { enabled: false };
  return {
    enabled: true,
    mode: fbr.mode,
    environment: fbr.environment,
    ntn: fbr.ntn,
    strn: fbr.strn || "",
    businessName: fbr.businessName || "",
    province: fbr.province || "",
    address: fbr.address || "",
    posId: fbr.posId || "",
    defaultHsCode: fbr.defaultHsCode || "",
    saleType: fbr.saleType || "",
    scenarioId: fbr.scenarioId || "",
    hasToken,
    updatedAt: fbr.updatedAt,
  };
}
