"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { apiForgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      await apiForgotPassword(email);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative"
    >
      <div className="absolute pointer-events-none" style={{ top: -100, right: -100, width: 380, height: 380, background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)", borderRadius: "50%" }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <Link href="/auth/login">
            <div className="inline-block text-3xl font-extrabold mb-3" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
              Vazhi<span style={{ color: "var(--accent)" }}>AI</span>
            </div>
          </Link>
          <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
            Reset your password
          </h1>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            Enter your email and we'll send a reset OTP code
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
              <div
                className="text-4xl mb-4"
                style={{ filter: "grayscale(0)" }}
              >
                ✦
              </div>
              <div className="text-base font-bold mb-2" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
                Check your inbox
              </div>
              <p className="text-sm mb-6" style={{ color: "var(--text2)" }}>
                If <strong>{email}</strong> is registered, you'll receive a secure OTP code shortly.
              </p>
              
              <div className="flex flex-col gap-4">
                <Link
                  href={`/auth/reset-password?email=${encodeURIComponent(email)}`}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl text-white font-semibold text-sm py-3.5"
                  style={{
                    background: "var(--accent)",
                    fontFamily: "var(--font-syne)",
                    boxShadow: "var(--shadow-accent)",
                  }}
                >
                  Enter OTP & Reset Password →
                </Link>
                
                <Link
                  href="/auth/login"
                  className="text-sm font-semibold"
                  style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}
                >
                  ← Back to login
                </Link>
              </div>
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
                    Sending…
                  </>
                ) : "Send Reset OTP"}
              </motion.button>
            </form>
          )}
        </div>

        {!submitted && (
          <p className="text-center text-sm mt-5" style={{ color: "var(--text2)" }}>
            Remember it?{" "}
            <Link href="/auth/login" style={{ color: "var(--accent)", fontWeight: 600, fontFamily: "var(--font-syne)" }}>
              Sign in →
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
