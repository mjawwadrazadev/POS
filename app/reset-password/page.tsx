"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, KeyRound, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token || !email) {
      setError("Invalid password reset token or email address.");
      return;
    }

    if (newPassword.length < 4) {
      setError("Password / PIN must be at least 4 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify and try again.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg bg-[#171719] border border-[rgba(255,255,255,0.12)] p-8 sm:p-12 shadow-2xl text-white space-y-6">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 text-white text-[2.2rem] font-extrabold">
            <span>RST</span>
            <span className="text-[#819ffe]">POS</span>
          </div>
          <p className="text-[1.1rem] font-accent text-gray-400 uppercase tracking-widest mt-0.5">
            Set New Account Password
          </p>
        </div>
        <KeyRound className="w-8 h-8 text-accent" />
      </div>

      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-[2rem] font-bold">Create New Password</h2>
            <p className="text-[1.3rem] text-gray-400">
              Resetting password for: <b className="text-accent font-accent">{email}</b>
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300 p-3.5 text-[1.2rem] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="font-accent text-[1.2rem] uppercase text-gray-300 mb-2 block font-semibold">
              New Password / Quick PIN *
            </label>
            <div className="flex items-center gap-3 bg-[#0b0b0d] border border-[rgba(255,255,255,0.18)] px-4 py-3.5 focus-within:border-[#002bba]">
              <Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password or 4-digit PIN"
                className="bg-transparent text-white text-[1.5rem] outline-none w-full font-sans"
              />
            </div>
          </div>

          <div>
            <label className="font-accent text-[1.2rem] uppercase text-gray-300 mb-2 block font-semibold">
              Confirm New Password *
            </label>
            <div className="flex items-center gap-3 bg-[#0b0b0d] border border-[rgba(255,255,255,0.18)] px-4 py-3.5 focus-within:border-[#002bba]">
              <Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="bg-transparent text-white text-[1.5rem] outline-none w-full font-sans"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#002bba] hover:bg-[#0035e0] text-white py-4 font-accent text-[1.3rem] font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <span>{loading ? "Updating Password..." : "Update Password & Continue"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <div className="space-y-6 py-4 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-[2.2rem] font-bold text-white">Password Updated!</h2>
            <p className="text-[1.3rem] text-gray-300">
              Your password has been successfully reset. You can now sign in to your terminal.
            </p>
          </div>

          <Link
            href="/login"
            className="w-full btn btn-primary py-4 text-[1.4rem] font-bold flex items-center justify-center gap-2 uppercase"
          >
            <span>Proceed to Sign In Terminal</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0b0b0d] flex items-center justify-center p-4 sm:p-8">
      <Suspense fallback={<div className="text-white text-[1.4rem] font-accent">Loading reset portal...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
