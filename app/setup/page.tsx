"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, ShieldCheck, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

type SetupState = {
  databaseConfigured: boolean;
  databaseReachable: boolean;
  superAdminExists: boolean;
  databaseError?: string;
};

const inputClass =
  "w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500";

export default function SetupPage() {
  const router = useRouter();
  const [state, setState] = useState<SetupState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [mongodbUri, setMongodbUri] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");

  const loadState = async () => {
    try {
      const res = await fetch("/api/setup");
      const data = await res.json();
      setState(data);
    } catch {
      setError("Could not load setup status");
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  const submit = async (payload: object) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return false;
      }
      await loadState();
      return true;
    } catch {
      setError("Network error — please try again");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onDatabaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await submit({ step: "database", mongodbUri })) setMongodbUri("");
  };

  const onAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await submit({ step: "admin", fullName, email, password, pin })) setPassword("");
  };

  const databaseDone = !!state?.databaseConfigured && !!state?.databaseReachable;
  const step = !state ? 0 : state.superAdminExists ? 3 : databaseDone ? 2 : 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-white">RST POS Setup</h1>
          <p className="text-sm text-slate-400 mt-1">Connect your database and create the platform super admin</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-3 text-xs font-bold">
          {["Database", "Super Admin", "Done"].map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full border ${
                  step > i + 1
                    ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300"
                    : step === i + 1
                    ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                    : "border-slate-700 text-slate-500"
                }`}
              >
                {i + 1}. {label}
              </span>
              {i < 2 && <span className="w-6 h-px bg-slate-700" />}
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          {error && (
            <div className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-sm p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 0 && (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking setup status...
            </div>
          )}

          {step === 1 && (
            <form onSubmit={onDatabaseSubmit} className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-bold text-white">
                <Database className="w-5 h-5 text-blue-400" /> Connect MongoDB
              </div>
              {state?.databaseConfigured && state.databaseError && (
                <p className="text-sm text-amber-300">Saved database is unreachable: {state.databaseError}</p>
              )}
              <p className="text-sm text-slate-400">
                Paste the connection string from MongoDB Atlas → Connect → Drivers. Replace{" "}
                <code className="text-slate-200">&lt;db_password&gt;</code> with your password and add the database name
                after <code className="text-slate-200">.mongodb.net/</code>, for example:
              </p>
              <code className="block text-xs bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 break-all">
                mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/masterpos?retryWrites=true&amp;w=majority
              </code>
              <input
                type="password"
                autoComplete="off"
                required
                value={mongodbUri}
                onChange={(e) => setMongodbUri(e.target.value)}
                placeholder="mongodb+srv://..."
                className={inputClass}
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Test &amp; Save Connection
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={onAdminSubmit} className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-bold text-white">
                <ShieldCheck className="w-5 h-5 text-blue-400" /> Create Super Admin
              </div>
              <p className="text-sm text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Database connected
              </p>
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className={inputClass} />
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputClass} />
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 8 characters)"
                className={inputClass}
              />
              <input
                required
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="4-digit PIN"
                className={inputClass}
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Create Super Admin
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div>
                <h2 className="text-lg font-bold text-white">Setup complete</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Sign in as super admin, then add Resend and other keys from the <strong>Integrations</strong> tab.
                </p>
              </div>
              <button
                onClick={() => router.push("/super-admin/login")}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-lg text-sm"
              >
                Go to Super Admin Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
