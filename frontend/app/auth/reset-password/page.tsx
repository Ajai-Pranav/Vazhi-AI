"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { apiVerifyOtp, apiResetPassword } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !otp || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!/\d/.test(newPassword)) {
      setError("Password must contain at least one number.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Verify the OTP first
      await apiVerifyOtp(email, otp);
      // 2. Submit password reset request
      await apiResetPassword(email, otp, newPassword);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md z-10">
      <div className="text-center mb-8">
        <Link href="/auth/login">
          <div className="inline-block text-3xl font-extrabold mb-3" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
            Vazhi<span style={{ color: "var(--accent)" }}>AI</span>
          </div>
        </Link>
        <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
          Set new password
        </h1>
        <p className="text-sm" style={{ color: "var(--text2)" }}>
          Enter the OTP code received and your new password
        </p>
      </div>

      <div
        className="rounded-[20px] p-8"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border2)",
          boxShadow: "var(--shadow2)",
          backdropFilter: "blur(20px)",
        }}
      >
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="text-4xl mb-4" style={{ filter: "grayscale(0)" }}>
              ✦
            </div>
            <div className="text-base font-bold mb-2" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
              Password reset successful
            </div>
            <p className="text-sm mb-6" style={{ color: "var(--text2)" }}>
              Your password has been updated. You can now sign in with your new password.
            </p>
            <Link
              href="/auth/login"
              className="w-full flex items-center justify-center gap-2 rounded-2xl text-white font-semibold text-sm py-3.5"
              style={{
                background: "var(--accent)",
                fontFamily: "var(--font-syne)",
                boxShadow: "var(--shadow-accent)",
              }}
            >
              Sign In →
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>
                Email Address
              </label>
              <input
                type="email"
                className="field-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>
                8-Digit OTP Code
              </label>
              <input
                type="text"
                maxLength={8}
                className="field-input text-center tracking-widest font-mono"
                placeholder="00000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="field-input"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                className="field-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="text-sm rounded-xl px-4 py-3"
                  style={{ background: "var(--accent-light)", color: "var(--accent)", border: "0.5px solid var(--accent-glow)" }}
                  initial={{ opacity: 0, x: 0 }}
                  animate={{ opacity: 1, x: [0, -8, 8, -6, 6, -3, 3, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl text-white font-semibold text-sm py-3.5"
              style={{
                background: loading ? "var(--text3)" : "var(--accent)",
                fontFamily: "var(--font-syne)",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "var(--shadow-accent)",
              }}
              whileHover={!loading ? { scale: 1.01 } : {}}
              whileTap={!loading ? { scale: 0.99 } : {}}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Resetting Password…
                </>
              ) : "Reset Password"}
            </motion.button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute pointer-events-none" style={{ top: -100, right: -100, width: 380, height: 380, background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)", borderRadius: "50%" }} />
      <div className="absolute pointer-events-none" style={{ bottom: -80, left: -60, width: 300, height: 300, background: "radial-gradient(circle, var(--glow2-color) 0%, transparent 70%)", borderRadius: "50%" }} />
      <Suspense fallback={
        <div className="text-center py-12 text-sm" style={{ color: "var(--text2)" }}>
          Loading recovery tools...
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
