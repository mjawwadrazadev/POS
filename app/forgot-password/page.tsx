"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process request");
      }

      setSubmitted(true);
      setMessage(data.message || "Reset link has been dispatched to your email address.");
      if (data.resetUrlPreview) {
        setPreviewUrl(data.resetUrlPreview);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0b0d] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg bg-[#171719] border border-[rgba(255,255,255,0.12)] p-8 sm:p-12 shadow-2xl text-white space-y-6">

        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-5">
          <div>
            <div className="inline-flex items-center gap-2 text-white text-[2.2rem] font-extrabold">
              <span>RST</span>
              <span className="text-[#819ffe]">POS</span>
            </div>
            <p className="text-[1.1rem] font-accent text-gray-400 uppercase tracking-widest mt-0.5">
              Account Password Recovery
            </p>
          </div>
          <KeyRound className="w-8 h-8 text-accent" />
        </div>

        {!submitted ? (
          /* FORGOT PASSWORD FORM */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-[2rem] font-bold">Forgot Your Password?</h2>
              <p className="text-[1.3rem] text-gray-400 leading-relaxed">
                Enter your registered admin or store email address below. We will send a secure password reset link powered by <b>Resend Email API</b>.
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
                Your Account Email Address *
              </label>
              <div className="flex items-center gap-3 bg-[#0b0b0d] border border-[rgba(255,255,255,0.18)] px-4 py-3.5 focus-within:border-[#002bba]">
                <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@rstpos.com"
                  className="bg-transparent text-white text-[1.5rem] outline-none w-full font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#002bba] hover:bg-[#0035e0] text-white py-4 font-accent text-[1.3rem] font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              <span>{loading ? "Sending Reset Email..." : "Send Reset Email"}</span>
            </button>
          </form>
        ) : (
          /* SUCCESS SCREEN */
          <div className="space-y-6 py-2">
            <div className="flex items-center gap-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-4">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-400" />
              <div>
                <h3 className="font-accent font-bold text-[1.4rem] uppercase">Reset Instructions Sent</h3>
                <p className="text-[1.2rem] text-emerald-200/90 mt-1">{message}</p>
              </div>
            </div>

            <p className="text-[1.3rem] text-gray-300 leading-relaxed">
              Check your inbox for <b>{email}</b>. Follow the password reset link inside the email to set your new password.
            </p>

            {/* Local Preview URL helper if Resend API Key is not added yet */}
            {previewUrl && (
              <div className="bg-[#0b0b0d] border border-amber-500/30 p-4 space-y-2">
                <p className="font-accent text-[1.1rem] text-amber-400 font-bold uppercase">
                  ⚡ Dev Testing Preview Link (Resend API Key Not Set):
                </p>
                <Link
                  href={previewUrl}
                  className="font-accent text-[1.2rem] text-blue-400 hover:underline break-all block"
                >
                  {previewUrl}
                </Link>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSubmitted(false)}
                className="flex-1 btn btn-secondary py-3 text-[1.2rem] bg-[#0b0b0d] text-white flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Resend Email</span>
              </button>
              <Link
                href="/login"
                className="flex-1 btn btn-primary py-3 text-[1.2rem] flex items-center justify-center gap-1.5"
              >
                <span>Back to Login</span>
              </Link>
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] text-center">
          <Link
            href="/login"
            className="font-accent text-[1.2rem] text-gray-400 hover:text-white inline-flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Main Login Terminal</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
