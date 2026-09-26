"use client";

import {
  DEFAULT_DI_SCENARIO,
  FBR_MODE_LABELS,
  FBR_PROVINCES,
  FbrEnvironment,
  FbrMode,
} from "@/lib/fbr/constants";

export interface FbrFormValue {
  enabled: boolean;
  mode: FbrMode;
  environment: FbrEnvironment;
  ntn: string;
  strn: string;
  businessName: string;
  province: string;
  address: string;
  posId: string;
  token: string;
  defaultHsCode: string;
  scenarioId: string;
}

export const EMPTY_FBR_FORM: FbrFormValue = {
  enabled: false,
  mode: "pos_ims",
  environment: "sandbox",
  ntn: "",
  strn: "",
  businessName: "",
  province: "",
  address: "",
  posId: "",
  token: "",
  defaultHsCode: "",
  scenarioId: DEFAULT_DI_SCENARIO,
};

const labelClass = "block text-[1.2rem] font-bold text-gray-700 uppercase mb-1";
const inputClass =
  "w-full px-3.5 py-2.5 border rounded-lg text-[1.4rem] bg-white focus:ring-2 focus:ring-accent focus:outline-none";

interface Props {
  value: FbrFormValue;
  onChange: (value: FbrFormValue) => void;
  // On edit, a token is already saved and the field may be left blank to keep it
  hasSavedToken?: boolean;
}

/** FBR registration fields, shared by the New Tenant form and the tenant FBR tab. */
export function FbrSettingsFields({ value, onChange, hasSavedToken = false }: Props) {
  const set = <K extends keyof FbrFormValue>(key: K, v: FbrFormValue[K]) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
          className="mt-1 w-4 h-4 accent-emerald-600"
        />
        <span>
          <span className="block text-[1.4rem] font-bold text-gray-800">This business is registered with FBR</span>
          <span className="block text-[1.2rem] text-muted">
            Leave unticked for businesses that are not registered — the store works normally without FBR.
          </span>
        </span>
      </label>

      {value.enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-l-4 border-emerald-500 pl-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Integration Type *</label>
            <select value={value.mode} onChange={(e) => set("mode", e.target.value as FbrMode)} className={inputClass}>
              {(Object.keys(FBR_MODE_LABELS) as FbrMode[]).map((m) => (
                <option key={m} value={m}>
                  {FBR_MODE_LABELS[m]}
                </option>
              ))}
            </select>
            <p className="text-[1.2rem] text-muted mt-1">
              {value.mode === "pos_ims"
                ? "Each sale gets an FBR invoice number and QR code on the receipt. Needs the POS ID from IRIS (Registration → POS Client Registration) and its security token."
                : "Each sale is sent to FBR through the PRAL Digital Invoicing API. Needs the security token issued by PRAL."}
            </p>
          </div>

          <div>
            <label className={labelClass}>Environment *</label>
            <select value={value.environment} onChange={(e) => set("environment", e.target.value as FbrEnvironment)} className={inputClass}>
              <option value="sandbox">Sandbox (testing)</option>
              <option value="production">Production (live invoices)</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>NTN / CNIC *</label>
            <input value={value.ntn} onChange={(e) => set("ntn", e.target.value)} placeholder="1234567 or 3520112345678" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Sales Tax Reg. No. (STRN)</label>
            <input value={value.strn} onChange={(e) => set("strn", e.target.value)} placeholder="Optional" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Name Registered with FBR</label>
            <input value={value.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="Defaults to the business name" className={inputClass} />
          </div>

          {value.mode === "pos_ims" ? (
            <div>
              <label className={labelClass}>FBR POS ID *</label>
              <input value={value.posId} onChange={(e) => set("posId", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 110014" className={inputClass} />
            </div>
          ) : (
            <>
              <div>
                <label className={labelClass}>Province *</label>
                <select value={value.province} onChange={(e) => set("province", e.target.value)} className={inputClass}>
                  <option value="">Select province</option>
                  {FBR_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Registered Business Address *</label>
                <input value={value.address} onChange={(e) => set("address", e.target.value)} placeholder="As registered with FBR" className={inputClass} />
              </div>
              {value.environment === "sandbox" && (
                <div>
                  <label className={labelClass}>Sandbox Scenario</label>
                  <input value={value.scenarioId} onChange={(e) => set("scenarioId", e.target.value.toUpperCase())} placeholder={DEFAULT_DI_SCENARIO} className={inputClass} />
                </div>
              )}
            </>
          )}

          <div>
            <label className={labelClass}>Default HS / PCT Code *</label>
            <input value={value.defaultHsCode} onChange={(e) => set("defaultHsCode", e.target.value)} placeholder="e.g. 2106.9090" className={inputClass} />
            <p className="text-[1.2rem] text-muted mt-1">Used for products that do not have their own HS code.</p>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Security Token {hasSavedToken ? "" : "*"}</label>
            <input
              type="password"
              autoComplete="off"
              value={value.token}
              onChange={(e) => set("token", e.target.value)}
              placeholder={hasSavedToken ? "Saved — leave blank to keep the current token" : "Token issued by FBR / PRAL"}
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}
