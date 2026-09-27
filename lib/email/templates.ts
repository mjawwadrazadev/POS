import { escapeHtml } from "@/lib/utils/server";
import { getConfigValue } from "@/lib/config/platformConfig";

// Shared layout for every transactional email, so they all look the same.

export function appUrl(path = ""): string {
  const base = (getConfigValue("appUrl") || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path}`;
}

type EmailBlock =
  | { type: "text"; text: string }
  | { type: "button"; label: string; href: string }
  | { type: "table"; rows: [string, string][] }
  | { type: "note"; text: string };

/** Builds a branded HTML email. All text is escaped here; callers pass plain strings. */
export function renderEmail(opts: { heading: string; greeting?: string; blocks: EmailBlock[] }): string {
  const body = opts.blocks
    .map((b) => {
      switch (b.type) {
        case "text":
          return `<p style="font-size:15px;color:#cccccc;line-height:1.6;margin:0 0 14px;white-space:pre-wrap">${escapeHtml(b.text)}</p>`;
        case "note":
          return `<p style="font-size:12px;color:#777777;line-height:1.5;margin:24px 0 0">${escapeHtml(b.text)}</p>`;
        case "button":
          return `<div style="text-align:center;margin:28px 0">
              <a href="${escapeHtml(b.href)}" style="background:#002bba;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:bold;font-size:15px;display:inline-block">${escapeHtml(b.label)}</a>
            </div>
            <p style="font-size:12px;color:#888888;word-break:break-all">If the button doesn't work, open this link:<br/><a href="${escapeHtml(b.href)}" style="color:#819ffe">${escapeHtml(b.href)}</a></p>`;
        case "table":
          return `<table cellpadding="6" style="border-collapse:collapse;margin:0 0 14px;font-size:14px;color:#dddddd">${b.rows
            .filter(([, v]) => v)
            .map(
              ([k, v]) =>
                `<tr><td style="color:#888888;padding-right:16px;vertical-align:top">${escapeHtml(k)}</td><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`
            )
            .join("")}</table>`;
      }
    })
    .join("\n");

  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#141417;color:#ffffff;padding:30px;border:1px solid #002bba">
    <h1 style="color:#819ffe;margin:0 0 4px;font-size:24px">RST POS</h1>
    <p style="text-transform:uppercase;font-size:11px;color:#888888;letter-spacing:2px;margin:0">NIB IT Solutions</p>
    <hr style="border:0;border-top:1px solid #333333;margin:20px 0"/>
    <h2 style="color:#ffffff;font-size:20px;margin:0 0 16px">${escapeHtml(opts.heading)}</h2>
    ${opts.greeting ? `<p style="font-size:15px;color:#cccccc;margin:0 0 14px">${escapeHtml(opts.greeting)}</p>` : ""}
    ${body}
  </div>`;
}
