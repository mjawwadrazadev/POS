"use client";

import { useState, useEffect } from "react";
import { storeHomeFor } from "@/lib/auth/permissions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  Cake,
  Utensils,
  Pill,
  Sparkles,
  CheckCircle2,
  Store,
  Delete,
  Loader2,
} from "lucide-react";

// A terminal is set up for one store; its code is remembered on this device
const STORE_CODE_KEY = "rst_pos_store_code";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"pin" | "admin">("pin");
  const [pin, setPin] = useState("");
  const [orgCode, setOrgCode] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_CODE_KEY);
      if (saved) setOrgCode(saved);
    } catch {
      // storage unavailable — the code just has to be typed each time
    }
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // The 4th digit signs in straight away, so the keypad has no Enter key
  function handlePinPress(num: string) {
    if (loading || pin.length >= 4) return;
    const nextPin = pin + num;
    if (nextPin.length === 4 && !orgCode.trim()) {
      setPin("");
      setError("Enter your store code first");
      return;
    }
    setPin(nextPin);
    setError("");
    if (nextPin.length === 4) {
      submitLogin({ pin: nextPin, orgCode: orgCode.trim() });
    }
  }

  function handlePinBackspace() {
    setPin((p) => p.slice(0, -1));
  }

  function handlePinClear() {
    setPin("");
    setError("");
  }

  function quickFill(presetEmail: string, presetOrgCode: string) {
    setEmail(presetEmail);
    setOrgCode(presetOrgCode);
    setPin("");
    setError("");
  }

  async function submitLogin(payload: { email?: string; password?: string; pin?: string; orgCode?: string }) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (payload.orgCode) {
        try {
          localStorage.setItem(STORE_CODE_KEY, payload.orgCode);
        } catch {
          // ignore
        }
      }

      router.push(storeHomeFor(data.user?.role));
    } catch (err: any) {
      setError(err.message || "Invalid PIN or credentials");
      setPin("");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0b0d] flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12">
      <Link
        href="/"
        className="w-full max-w-7xl mb-4 font-accent text-[1.2rem] uppercase tracking-wider text-white/60 hover:text-white"
      >
        ← Back to website
      </Link>
      {/* Container Box */}
      <div className="w-full max-w-7xl bg-[#141417] border border-[rgba(255,255,255,0.12)] shadow-2xl grid grid-cols-1 lg:grid-cols-12 overflow-hidden lg:min-h-[640px]">

        {/* LEFT SIDE — Brand Showcase & Quick Access (6 cols). Below lg it sits under the login form,
            trimmed, so the PIN pad is on screen without scrolling on tablets. */}
        <div className="lg:col-span-6 bg-gradient-to-br from-[#001f88] via-[#002bba] to-[#070b1e] p-8 sm:p-10 lg:p-14 flex flex-col justify-between text-white relative overflow-hidden">
          {/* Subtle overlay lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

          <div>
            <div className="hidden lg:inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 border border-white/20 text-[1.2rem] font-accent uppercase tracking-wider mb-8">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>NIB IT Enterprise Platform</span>
            </div>

            <h1 className="text-[2.8rem] lg:text-[3.8rem] font-extrabold tracking-tight leading-tight">
              RST <span className="text-[#819ffe]">POS</span>
            </h1>
            <p className="text-[1.4rem] text-blue-100/90 mt-3 leading-relaxed">
              Universal Multi-Tenant Point of Sale & Inventory Platform with 9 Dedicated Business Vertical Engines.
            </p>

            <div className="hidden lg:block mt-10 space-y-3.5 font-accent text-[1.3rem]">
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Isolated Multi-Tenant Security & Role Control</span>
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Bakery, Restaurant, Cafe, Pharmacy & Retail</span>
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Real-Time Double Entry Financial Ledger</span>
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>80mm Thermal Receipt & Barcode Sticker Printing</span>
              </div>
            </div>
          </div>

          {/* Seeded demo accounts — local development only, never shown in production */}
          {process.env.NODE_ENV !== "production" && (
            <div className="mt-6 lg:mt-12 pt-6 border-t border-white/15">
              <p className="font-accent text-[1.2rem] uppercase text-blue-200/80 mb-3 font-bold tracking-wider">
                Seeded Demo Stores (Click to Fill Store Code / Email):
              </p>
              <div className="grid grid-cols-2 gap-3 text-[1.2rem] font-accent">
                <button
                  type="button"
                  onClick={() => quickFill("admin@rstpos.com", "rst-bakery")}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-2.5 text-left truncate transition-colors flex items-center gap-2"
                >
                  <Cake className="w-4 h-4 text-amber-300 flex-shrink-0" />
                  <span className="truncate">Bakery Admin (1234)</span>
                </button>

                <button
                  type="button"
                  onClick={() => quickFill("restaurant@rstpos.com", "royal-spice")}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-2.5 text-left truncate transition-colors flex items-center gap-2"
                >
                  <Utensils className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">Restaurant (2222)</span>
                </button>

                <button
                  type="button"
                  onClick={() => quickFill("pharmacy@rstpos.com", "health-plus")}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-2.5 text-left truncate transition-colors flex items-center gap-2"
                >
                  <Pill className="w-4 h-4 text-rose-300 flex-shrink-0" />
                  <span className="truncate">Pharmacy (3333)</span>
                </button>

              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDE — Authentication Terminal Form (6 cols) */}
        <div className="order-first lg:order-none lg:col-span-6 p-6 sm:p-10 lg:p-14 flex flex-col justify-center space-y-6 lg:space-y-8 bg-[#171719]">

          <div className="space-y-2">
            <h2 className="font-extrabold text-[2.4rem] text-white">
              Terminal Login
            </h2>
            <p className="text-[1.3rem] text-[rgba(255,255,255,0.6)]">
              Sign in with your store code and 4-digit PIN, or with email and password.
            </p>
          </div>

          {/* Auth Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-[#0b0b0d] p-1 border border-[rgba(255,255,255,0.12)] font-accent text-[1.3rem]">
            <button
              type="button"
              onClick={() => {
                setMode("pin");
                setError("");
              }}
              className={`py-3 text-center uppercase font-bold transition-all ${
                mode === "pin"
                  ? "bg-[#002bba] text-white shadow-md"
                  : "text-[rgba(255,255,255,0.6)] hover:text-white"
              }`}
            >
              Cashier Quick PIN
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("admin");
                setError("");
              }}
              className={`py-3 text-center uppercase font-bold transition-all ${
                mode === "admin"
                  ? "bg-[#002bba] text-white shadow-md"
                  : "text-[rgba(255,255,255,0.6)] hover:text-white"
              }`}
            >
              Admin Credentials
            </button>
          </div>

          {error && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-400 p-3 text-[1.3rem] font-medium text-center">
              {error}
            </div>
          )}

          {/* PIN MODE KEYPAD */}
          {mode === "pin" ? (
            <div className="space-y-6">
              <div>
                <label className="font-accent text-[1.2rem] uppercase text-[rgba(255,255,255,0.7)] mb-2 block font-semibold">
                  Store Code
                </label>
                <div className="flex items-center gap-3 bg-[#0b0b0d] border border-[rgba(255,255,255,0.18)] px-4 py-3 focus-within:border-[#002bba]">
                  <Store className="w-5 h-5 text-[rgba(255,255,255,0.4)] flex-shrink-0" />
                  <input
                    type="text"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toLowerCase())}
                    placeholder="e.g. rst-bakery"
                    autoCapitalize="none"
                    className="bg-transparent text-white text-[1.5rem] outline-none w-full font-sans"
                  />
                </div>
              </div>

              <div className="text-center space-y-3 bg-[#0b0b0d] border border-[rgba(255,255,255,0.08)] py-4">
                <p className="text-[1.2rem] font-accent uppercase text-[rgba(255,255,255,0.6)]" aria-live="polite">
                  {loading ? "Verifying PIN..." : "Enter 4-Digit Terminal PIN"}
                </p>
                {/* PIN Dots, swapped for a spinner while the PIN is checked */}
                {loading ? (
                  <div className="flex justify-center py-1">
                    <Loader2 className="w-7 h-7 text-[#819ffe] animate-spin" aria-label="Signing in" />
                  </div>
                ) : (
                <div className="flex justify-center gap-5 py-1">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`w-5 h-5 border-2 transition-all ${
                        pin.length > idx
                          ? "bg-[#002bba] border-[#819ffe] scale-110"
                          : "border-[rgba(255,255,255,0.2)] bg-transparent"
                      }`}
                    />
                  ))}
                </div>
                )}
              </div>

              {/* Keypad Grid */}
              <div className="grid grid-cols-3 gap-3 font-accent text-[2rem]">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinPress(num)}
                    disabled={loading}
                    className="py-4 bg-[#0b0b0d] border border-[rgba(255,255,255,0.12)] text-white hover:bg-[#002bba] hover:border-[#819ffe] font-bold transition-colors active:scale-95 text-center"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handlePinClear}
                  disabled={loading}
                  className="py-4 bg-[#0b0b0d] border border-[rgba(255,255,255,0.12)] text-red-400 text-[1.3rem] font-bold uppercase hover:bg-red-500/20 disabled:opacity-40"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handlePinPress("0")}
                  disabled={loading}
                  className="py-4 bg-[#0b0b0d] border border-[rgba(255,255,255,0.12)] text-white font-bold hover:bg-[#002bba] hover:border-[#819ffe]"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinBackspace}
                  disabled={loading || pin.length === 0}
                  aria-label="Delete last digit"
                  className="py-4 flex items-center justify-center bg-[#0b0b0d] border border-[rgba(255,255,255,0.12)] text-white hover:bg-[#002bba] hover:border-[#819ffe] disabled:opacity-40 disabled:hover:bg-[#0b0b0d] disabled:hover:border-[rgba(255,255,255,0.12)] transition-colors"
                >
                  <Delete className="w-6 h-6" />
                </button>
              </div>
            </div>
          ) : (
            /* ADMIN CREDENTIALS FORM */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitLogin({ email, password });
              }}
              className="space-y-6"
            >
              <div>
                <label className="font-accent text-[1.2rem] uppercase text-[rgba(255,255,255,0.7)] mb-2 block font-semibold">
                  Admin Email Address
                </label>
                <div className="flex items-center gap-3 bg-[#0b0b0d] border border-[rgba(255,255,255,0.18)] px-4 py-3.5 focus-within:border-[#002bba]">
                  <User className="w-5 h-5 text-[rgba(255,255,255,0.4)] flex-shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@rstpos.com"
                    className="bg-transparent text-white text-[1.5rem] outline-none w-full font-sans"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="font-accent text-[1.2rem] uppercase text-[rgba(255,255,255,0.7)] font-semibold">
                    Password
                  </label>
                  <Link href="/forgot-password" className="font-accent text-[1.2rem] text-accent hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <div className="flex items-center gap-3 bg-[#0b0b0d] border border-[rgba(255,255,255,0.18)] px-4 py-3.5 focus-within:border-[#002bba]">
                  <Lock className="w-5 h-5 text-[rgba(255,255,255,0.4)] flex-shrink-0" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="bg-transparent text-white text-[1.5rem] outline-none w-full font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#002bba] hover:bg-[#0035e0] text-white py-4 font-accent text-[1.4rem] font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>{loading ? "Authenticating..." : "Sign In to Terminal"}</span>
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] text-center">
            <Link
              href="/super-admin/login"
              className="font-accent text-[1.2rem] text-amber-300 hover:underline inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Looking for Platform Super Admin Portal? <b>Click here →</b></span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
