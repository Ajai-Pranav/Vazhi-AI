"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { apiLogin } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiLogin(email, password);
      // Cookies are set by the server — just store the user in React state
      login(data.user);
      // Route based on whether profile is complete
      if (data.user.has_profile) {
        router.push("/home");
      } else {
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
    >
      {/* Accent glow blobs */}
      <div className="absolute pointer-events-none" style={{ top: -100, right: -100, width: 380, height: 380, background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)", borderRadius: "50%" }} />
      <div className="absolute pointer-events-none" style={{ bottom: -80, left: -60, width: 300, height: 300, background: "radial-gradient(circle, var(--glow2-color) 0%, transparent 70%)", borderRadius: "50%" }} />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/auth/login">
            <div className="inline-block text-3xl font-extrabold mb-3" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
              Vazhi<span style={{ color: "var(--accent)" }}>AI</span>
            </div>
          </Link>
          <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
            Welcome back
          </h1>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            Sign in to your career roadmap
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-[20px] p-8"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border2)",
            boxShadow: "var(--shadow2)",
            backdropFilter: "blur(20px)",
          }}
        >
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
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>
                  Password
                </label>
                <Link href="/auth/forgot-password" className="text-xs" style={{ color: "var(--accent)", fontFamily: "var(--font-syne)" }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="field-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
              className="w-full flex items-center justify-center gap-2 rounded-2xl text-white font-semibold text-sm py-3.5 mt-1"
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
                  Signing in…
                </>
              ) : "Sign In →"}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "var(--text)" }}>
          Don't have an account?{" "}
          <Link href="/auth/signup" style={{ color: "var(--accent)", fontWeight: 600, fontFamily: "var(--font-syne)" }}>
            Create one →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}