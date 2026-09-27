"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Platform accounts sign in with email + password only (no PIN access to the platform)
      const payload = { email, password, isSuperAdminPortal: true };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Super Admin Authentication failed");
      }

      router.push("/super-admin");
    } catch (err: any) {
      setError(err.message || "Invalid Super Admin credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b1e] flex items-center justify-center p-4 sm:p-8 lg:p-12">
      <div className="w-full max-w-6xl bg-[#141417] border border-[#002bba]/60 shadow-2xl grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-[600px]">

        {/* LEFT PANEL — Super Admin Command Branding (6 cols) */}
        <div className="lg:col-span-6 bg-gradient-to-br from-[#001766] via-[#002bba] to-[#040817] p-8 sm:p-12 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

          <div>
            <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3.5 py-1.5 text-[1.2rem] font-accent uppercase font-bold tracking-wider mb-6">
              <ShieldCheck className="w-4 h-4" />
              <span>Platform Super Admin Command Center</span>
            </div>

            <h1 className="text-[3.6rem] font-extrabold tracking-tight leading-tight">
              RST <span className="text-[#819ffe]">SUPER ADMIN</span>
            </h1>
            <p className="text-[1.4rem] text-blue-100/90 mt-3 leading-relaxed">
              Global Platform Management, Tenant Provisioning, Subscription Billing & Enterprise Command Control.
            </p>

            <div className="mt-8 space-y-3 font-accent text-[1.3rem]">
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Multi-Tenant Business Provisioning</span>
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Monthly/Yearly Subscription Billing & MRR Tracker</span>
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Automated Expiry Locking & Suspension Control</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/15 flex items-center justify-between">
            <span className="text-[1.2rem] font-accent text-blue-200">
              Platform Master HQ Administration
            </span>
          </div>
        </div>

        {/* RIGHT PANEL — Authentication Form (6 cols) */}
        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center space-y-8 bg-[#171719]">

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-accent font-accent font-bold text-[1.3rem] uppercase">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Super Admin Portal Authentication</span>
            </div>
            <h2 className="font-extrabold text-[2.4rem] text-white">
              Platform Control Login
            </h2>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300 p-4 text-[1.3rem] font-medium flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="font-accent text-[1.2rem] uppercase text-[rgba(255,255,255,0.7)] mb-2 block font-semibold">
                    Super Admin Email Address
                  </label>
                  <div className="flex items-center gap-3 bg-[#0b0b0d] border border-[rgba(255,255,255,0.18)] px-4 py-3.5 focus-within:border-[#002bba]">
                    <User className="w-5 h-5 text-[rgba(255,255,255,0.4)] flex-shrink-0" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="superadmin@rstpos.com"
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
              <span>{loading ? "Authenticating Platform..." : "Sign In to Super Admin"}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] text-center">
            <Link
              href="/login"
              className="font-accent text-[1.2rem] text-gray-400 hover:text-white transition-colors"
            >
              Looking for Tenant Store Login? <b>Click here →</b>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
