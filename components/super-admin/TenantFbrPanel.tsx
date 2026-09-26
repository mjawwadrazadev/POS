"use client";

import { useCallback, useEffect, useState } from "react";
import { Landmark, Loader2, CheckCircle2, AlertTriangle, Plug } from "lucide-react";
import { EMPTY_FBR_FORM, FbrFormValue, FbrSettingsFields } from "@/components/super-admin/FbrSettingsFields";
import { FBR_MODE_LABELS } from "@/lib/fbr/constants";

type Notice = { type: "success" | "error"; text: string } | null;

/** FBR settings of one tenant, shown as a tab on the super admin tenant page. */
export function TenantFbrPanel({ tenantId }: { tenantId: string }) {
  const [form, setForm] = useState<FbrFormValue>(EMPTY_FBR_FORM);
  const [saved, setSaved] = useState<any>(null);
  const [stats, setStats] = useState<{ reported: number; failed: number }>({ reported: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const applySaved = (fbr: any) => {
    setSaved(fbr);
    setForm(fbr?.enabled ? { ...EMPTY_FBR_FORM, ...fbr, token: "" } : EMPTY_FBR_FORM);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/fbr`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applySaved(data.fbr);
      setStats(data.stats);
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Could not load FBR settings" });
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!form.enabled && saved?.enabled && !window.confirm("Turn off FBR reporting for this tenant? New sales will not be sent to FBR.")) {
      return;
    }
    setBusy("save");
    setNotice(null);
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/fbr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applySaved(data.fbr);
      setNotice({ type: "success", text: form.enabled ? "FBR settings saved. New sales will be reported to FBR." : "FBR reporting turned off." });
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Save failed" });
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    setNotice(null);
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/fbr`, { method: "POST" });
      const data = await res.json();
      setNotice(res.ok ? { type: "success", text: data.message } : { type: "error", text: data.error || "Test failed" });
    } catch {
      setNotice({ type: "error", text: "Network error — please try again" });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted text-[1.4rem] py-10 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading FBR settings...
      </div>
    );
  }

  return (
    <div className="bg-base-tint border border-stroke-muted p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-bright text-[1.6rem] flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-600" /> FBR Integration
          </h3>
          <p className="text-[1.3rem] text-muted mt-1">
            {saved?.enabled
              ? `${FBR_MODE_LABELS[saved.mode as keyof typeof FBR_MODE_LABELS]} · ${saved.environment === "production" ? "Production" : "Sandbox"}`
              : "Not registered with FBR — sales are not reported."}
          </p>
        </div>
        {saved?.enabled && (
          <div className="flex gap-3 text-[1.3rem]">
            <span className="badge badge-success">{stats.reported} reported</span>
            <span className={`badge ${stats.failed > 0 ? "badge-error" : "badge-accent"}`}>{stats.failed} not accepted</span>
          </div>
        )}
      </div>

      {notice && (
        <div
          className={`flex items-start gap-2 text-[1.4rem] p-3 border ${
            notice.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700" : "bg-red-500/10 border-red-500/30 text-red-700"
          }`}
        >
          {notice.type === "success" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="break-all">{notice.text}</span>
        </div>
      )}

      <FbrSettingsFields value={form} onChange={setForm} hasSavedToken={!!saved?.hasToken} />

      <div className="flex flex-wrap gap-3 pt-2 border-t border-stroke-muted">
        <button type="button" onClick={save} disabled={!!busy} className="btn btn-primary">
          {busy === "save" && <Loader2 className="w-4 h-4 animate-spin" />} Save FBR Settings
        </button>
        {saved?.enabled && (
          <button type="button" onClick={test} disabled={!!busy} className="btn btn-secondary">
            {busy === "test" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />} Test Connection
          </button>
        )}
      </div>
    </div>
  );
}
