import { getConfigValue } from "@/lib/config/platformConfig";

// Resend's shared test sender — only delivers to the Resend account owner's own address
export const DEFAULT_FROM_EMAIL = "RST POS Security <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return !!getConfigValue("resendApiKey");
}

/** Sends an email through Resend using the key saved in the Integrations tab. Never throws. */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  apiKey?: string;
  from?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = params.apiKey || getConfigValue("resendApiKey");
  if (!apiKey) return { ok: false, error: "Resend API key is not configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: params.from || getConfigValue("resendFromEmail") || DEFAULT_FROM_EMAIL,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message || `Resend responded with HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach Resend" };
  }
}
