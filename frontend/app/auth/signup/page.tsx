"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { apiSignup } from "@/lib/api";
export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const setField =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiSignup(form.email, form.password, form.name);
      // Cookies are set by the server — just store the user in React state
      login(data.user);
      router.push("/onboarding");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
      setLoading(false);
    }
  }

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthColors = ["", "#c05a2e", "#b8860b", "#2a7a6e", "#1a5249"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
    >
      <div
        className="absolute pointer-events-none"
        style={{
          top: -100, left: -100, width: 380, height: 380,
          background: "radial-gradient(circle, var(--glow2-color) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: -80, right: -60, width: 300, height: 300,
          background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-block text-3xl font-extrabold mb-3"
            style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
          >
            Vazhi<span style={{ color: "var(--accent)" }}>AI</span>
          </div>
          <h1
            className="text-xl font-bold mb-1"
            style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
          >
            Create your account
          </h1>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            Start building your AI career roadmap today
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>
                Full Name
              </label>
              <input
                type="text" className="field-input" placeholder="Your full name"
                value={form.name} onChange={setField("name")} required autoComplete="name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>
                Email Address
              </label>
              <input
                type="email" className="field-input" placeholder="you@example.com"
                value={form.email} onChange={setField("email")} required autoComplete="email"
              />
            </div>



            {/* Password */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} className="field-input"
                  placeholder="Min. 8 characters" value={form.password}
                  onChange={setField("password")} required style={{ paddingRight: 44 }}
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-1 rounded-full flex-1 transition-all duration-300"
                        style={{ background: i <= strength ? strengthColors[strength] : "var(--border)" }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium" style={{ color: strengthColors[strength] || "var(--text3)" }}>
                    {strengthLabels[strength]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>
                Confirm Password
              </label>
              <input
                type="password" className="field-input" placeholder="Re-enter password"
                value={form.confirm} onChange={setField("confirm")} required
              />
              {form.confirm && form.password !== form.confirm && (
                <p className="text-xs mt-1.5" style={{ color: "var(--accent)" }}>Passwords don&apos;t match</p>
              )}
            </div>

            {/* Error */}
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

            {/* Submit */}
            <motion.button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl text-white font-semibold text-sm py-3.5 mt-1"
              style={{
                background: loading ? "var(--text3)" : "var(--accent)",
                fontFamily: "var(--font-syne)", border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "var(--shadow-accent)",
              }}
              whileHover={!loading ? { scale: 1.01 } : {}}
              whileTap={!loading ? { scale: 0.99 } : {}}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Creating account…
                </>
              ) : (
                "Create Account →"
              )}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "var(--text)" }}>
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "var(--accent)", fontWeight: 600, fontFamily: "var(--font-syne)" }}>
            Sign in →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}