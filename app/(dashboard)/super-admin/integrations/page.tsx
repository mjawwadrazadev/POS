"use client";

import { useEffect, useState } from "react";
import { Plug, Database, KeyRound, Mail, Globe, Timer, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

type ConfigKey = "mongodbUri" | "jwtSecret" | "resendApiKey" | "resendFromEmail" | "appUrl" | "cronSecret";
type Item = { configured: boolean; source: "saved" | "env" | "unset"; display: string };
type Notice = { type: "success" | "error" | "warning"; text: string } | null;

const inputClass =
  "w-full bg-base border border-stroke-medium rounded-lg px-3.5 py-2.5 text-[1.4rem] text-bright placeholder-text-muted focus:outline-none focus:border-accent";
const primaryBtn =
  "bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-[1.4rem] transition flex items-center gap-2";
const secondaryBtn =
  "bg-base hover:bg-accent-subtle disabled:opacity-60 text-bright font-bold px-4 py-2 rounded-lg text-[1.4rem] transition border border-stroke-medium flex items-center gap-2";

function SourceBadge({ item }: { item?: Item }) {
  if (!item || item.source === "unset") {
    return <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-600">Not set</span>;
  }
  if (item.source === "env") {
    return <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-stroke-medium bg-base text-medium">From .env</span>;
  }
  return <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-600">Saved</span>;
}

function Card({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: any;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-base-tint border border-stroke-muted rounded-2xl p-6 shadow-lg space-y-4">
      <div>
        <h2 className="text-[1.8rem] font-bold text-bright flex items-center gap-2">
          <Icon className="w-5 h-5 text-accent" /> {title}
        </h2>
        <p className="text-[1.4rem] text-muted mt-1">{description}</p>
      </div>
      {children}
    </section>
  );
}

function CurrentValue({ label, item }: { label: string; item?: Item }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[1.4rem]">
      <span className="text-muted">{label}:</span>
      <code className="bg-base border border-stroke-muted rounded px-2 py-1 text-bright break-all">
        {item?.display || "—"}
      </code>
      <SourceBadge item={item} />
    </div>
  );
}

export default function IntegrationsPage() {
  const [items, setItems] = useState<Record<ConfigKey, Item> | null>(null);
  const [writable, setWritable] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const [mongodbUri, setMongodbUri] = useState("");
  const [jwtSecret, setJwtSecret] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [cronSecret, setCronSecret] = useState("");
  const [testEmailTo, setTestEmailTo] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/super-admin/integrations");
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || "Could not load integrations");
        return;
      }
      setItems(data.items);
      setWritable(data.writable);
      setResendFromEmail(data.items.resendFromEmail.display || "");
      setAppUrl(data.items.appUrl.display || "");
    } catch {
      setLoadError("Could not load integrations");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (key: string, body: object, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return false;
    setBusy(key);
    setNotice(null);
    try {
      const res = await fetch("/api/super-admin/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ type: "error", text: data.error || "Save failed" });
        return false;
      }
      setItems(data.items);
      if (data.warning) {
        setNotice({ type: "warning", text: data.warning });
      } else if (data.generatedCronSecret) {
        setNotice({
          type: "success",
          text: `New cron secret (copy it now, it will not be shown again): ${data.generatedCronSecret}`,
        });
      } else {
        setNotice({ type: "success", text: "Saved. Changes are live immediately." });
      }
      return true;
    } catch {
      setNotice({ type: "error", text: "Network error — please try again" });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const runTest = async (key: string, body: object) => {
    setBusy(key);
    setNotice(null);
    try {
      const res = await fetch("/api/super-admin/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setNotice(res.ok ? { type: "success", text: data.message } : { type: "error", text: data.error || "Test failed" });
    } catch {
      setNotice({ type: "error", text: "Network error — please try again" });
    } finally {
      setBusy(null);
    }
  };

  const spinner = (key: string) => busy === key && <Loader2 className="w-4 h-4 animate-spin" />;

  return (
    <div className="space-y-6">
        <div className="bg-base-tint border border-stroke-muted p-6 rounded-2xl shadow-lg">
          <h1 className="text-[2.4rem] font-black text-bright tracking-tight flex items-center gap-2">
            <Plug className="w-6 h-6 text-accent" />
            Platform Integrations
          </h1>
          <p className="text-[1.4rem] text-muted mt-1">
            Database, security keys and email settings. Saved values take effect immediately and override any .env value.
          </p>
        </div>

        {loadError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-[1.4rem] p-4 rounded-xl">{loadError}</div>
        )}

        {!writable && items && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 text-[1.4rem] p-4 rounded-xl">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            This server&apos;s filesystem is read-only, so values cannot be saved here. Set them as environment variables in your
            hosting provider instead.
          </div>
        )}

        {notice && (
          <div
            className={`flex items-start gap-2 text-[1.4rem] p-4 rounded-xl border break-all ${
              notice.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                : notice.type === "warning"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                : "bg-red-500/10 border-red-500/30 text-red-600"
            }`}
          >
            {notice.type === "success" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{notice.text}</span>
          </div>
        )}

        {!items && !loadError && (
          <div className="flex items-center justify-center py-16 text-muted text-[1.4rem] gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading integrations...
          </div>
        )}

        {items && (
          <>
            {/* MongoDB */}
            <Card icon={Database} title="MongoDB Database" description="Connection string from MongoDB Atlas → Connect → Drivers. Include the database name, e.g. .mongodb.net/masterpos?...">
              <CurrentValue label="Current" item={items.mongodbUri} />
              <input
                type="password"
                autoComplete="off"
                value={mongodbUri}
                onChange={(e) => setMongodbUri(e.target.value)}
                placeholder="New connection string: mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/masterpos?retryWrites=true&w=majority"
                className={inputClass}
              />
              <p className="text-[1.2rem] text-amber-600/80">
                Switching databases moves the whole platform to the new database. If it has no super admin you will be signed out and
                sent to the setup wizard.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={!!busy}
                  onClick={() => runTest("testMongo", { target: "mongodb", mongodbUri: mongodbUri || undefined })}
                  className={secondaryBtn}
                >
                  {spinner("testMongo")} Test {mongodbUri ? "new" : "current"} connection
                </button>
                <button
                  disabled={!!busy || !mongodbUri || !writable}
                  onClick={async () => {
                    if (await save("mongo", { values: { mongodbUri } }, "Switch the platform to this database?")) setMongodbUri("");
                  }}
                  className={primaryBtn}
                >
                  {spinner("mongo")} Save
                </button>
              </div>
            </Card>

            {/* JWT */}
            <Card icon={KeyRound} title="JWT Signing Secret" description="Signs every login session. Changing it signs out all users on all devices (you stay signed in).">
              <CurrentValue label="Current" item={items.jwtSecret} />
              <input
                type="password"
                autoComplete="off"
                value={jwtSecret}
                onChange={(e) => setJwtSecret(e.target.value)}
                placeholder="Custom secret (min 32 characters) — or use Regenerate"
                className={inputClass}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={!!busy || !writable}
                  onClick={() => save("jwtGen", { generate: ["jwtSecret"] }, "Generate a new JWT secret? All other users will be signed out.")}
                  className={secondaryBtn}
                >
                  {spinner("jwtGen")} <RefreshCw className="w-4 h-4" /> Regenerate
                </button>
                <button
                  disabled={!!busy || !jwtSecret || !writable}
                  onClick={async () => {
                    if (await save("jwt", { values: { jwtSecret } }, "Save this JWT secret? All other users will be signed out.")) setJwtSecret("");
                  }}
                  className={primaryBtn}
                >
                  {spinner("jwt")} Save
                </button>
              </div>
            </Card>

            {/* Resend */}
            <Card icon={Mail} title="Email (Resend)" description="Used for password reset emails. Get the API key from resend.com → API Keys, and verify your sending domain first.">
              <CurrentValue label="API key" item={items.resendApiKey} />
              <input
                type="password"
                autoComplete="off"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                placeholder="New API key: re_..."
                className={inputClass}
              />
              <CurrentValue label="From address" item={items.resendFromEmail} />
              <input
                value={resendFromEmail}
                onChange={(e) => setResendFromEmail(e.target.value)}
                placeholder="ForgePOS <noreply@pos.mjawwadraza.com>"
                className={inputClass}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={!!busy || (!resendApiKey && !resendFromEmail) || !writable}
                  onClick={async () => {
                    const values: Record<string, string> = {};
                    if (resendApiKey) values.resendApiKey = resendApiKey;
                    if (resendFromEmail && resendFromEmail !== items.resendFromEmail.display) values.resendFromEmail = resendFromEmail;
                    if (await save("resend", { values })) setResendApiKey("");
                  }}
                  className={primaryBtn}
                >
                  {spinner("resend")} Save
                </button>
                {items.resendApiKey.source === "saved" && (
                  <button
                    disabled={!!busy || !writable}
                    onClick={() => save("resendClear", { clear: ["resendApiKey"] }, "Remove the saved Resend API key?")}
                    className={secondaryBtn}
                  >
                    {spinner("resendClear")} Remove key
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-stroke-muted">
                <input
                  type="email"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  placeholder="Send a test email to..."
                  className={inputClass}
                />
                <button
                  disabled={!!busy || !testEmailTo || !items.resendApiKey.configured}
                  onClick={() => runTest("testEmail", { target: "email", to: testEmailTo })}
                  className={`${secondaryBtn} shrink-0 justify-center`}
                >
                  {spinner("testEmail")} Send test
                </button>
              </div>
            </Card>

            {/* App URL */}
            <Card icon={Globe} title="Public App URL" description="The address users open, used in password reset links. Example: https://pos.mjawwadraza.com">
              <CurrentValue label="Current" item={items.appUrl} />
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={appUrl} onChange={(e) => setAppUrl(e.target.value)} placeholder="https://pos.mjawwadraza.com" className={inputClass} />
                <button
                  disabled={!!busy || !appUrl || appUrl === items.appUrl.display || !writable}
                  onClick={() => save("appUrl", { values: { appUrl } })}
                  className={`${primaryBtn} shrink-0 justify-center`}
                >
                  {spinner("appUrl")} Save
                </button>
              </div>
            </Card>

            {/* Cron */}
            <Card icon={Timer} title="Cron Job Secret" description="Lets an external scheduler call /api/jobs/retention-purge with the header x-cron-secret.">
              <CurrentValue label="Current" item={items.cronSecret} />
              <input
                type="password"
                autoComplete="off"
                value={cronSecret}
                onChange={(e) => setCronSecret(e.target.value)}
                placeholder="Custom secret (min 32 characters) — or use Generate"
                className={inputClass}
              />
              <div className="flex flex-wrap gap-2">
                <button disabled={!!busy || !writable} onClick={() => save("cronGen", { generate: ["cronSecret"] })} className={secondaryBtn}>
                  {spinner("cronGen")} <RefreshCw className="w-4 h-4" /> Generate
                </button>
                <button
                  disabled={!!busy || !cronSecret || !writable}
                  onClick={async () => {
                    if (await save("cron", { values: { cronSecret } })) setCronSecret("");
                  }}
                  className={primaryBtn}
                >
                  {spinner("cron")} Save
                </button>
              </div>
            </Card>
          </>
        )}

    </div>
  );
}
