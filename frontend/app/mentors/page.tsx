"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { store } from "@/lib/store";
import { getInitials } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

// ─── Shared sidebar nav config ───────────────────────────────────────────────
const MENU_ITEMS = [
  { icon: "⊞", label: "Dashboard",     path: "/home" },
  { icon: "◈", label: "Roadmap",        path: "/" },
  { icon: "✦", label: "Create Resume",  path: "/resume" },
];

const RESOURCE_ITEMS = [
  { icon: "⊕", label: "Explore Paths", path: "/suggestions" },
  { icon: "◉", label: "Mentors",       path: "/mentors" },
  { icon: "📚", label: "Study Material", path: "/study-material" },
];

export default function MentorsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const [navLoadingLabel, setNavLoadingLabel] = useState<string | null>(null);

  // Auth check on mount
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login");
      return;
    }
    if (user) {
      setPageLoading(false);
    }
  }, [authLoading, user]);

  const handleLogout = () => {
    logout();
    store.clear();
    router.push("/auth/login");
  };

  if (authLoading || pageLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="spinner"
            style={{
              width: 28,
              height: 28,
              borderWidth: 2,
              borderColor: "var(--border)",
              borderTopColor: "var(--accent)",
            }}
          />
          <p
            className="text-xs font-semibold"
            style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}
          >
            Loading Mentors...
          </p>
        </div>
      </div>
    );
  }

  const initials = getInitials(user?.name || "Student");
  const fieldName = user?.field || "your career domain";
  const targetRole = user?.dream_job || "your dream career";

  return (
    <div className="flex min-h-screen" style={{ background: "transparent" }}>
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col sticky top-0 h-screen overflow-y-auto"
        style={{
          width: 220,
          minWidth: 220,
          background: "var(--surface)",
          borderRight: "0.5px solid var(--border)",
        }}
      >
        <div
          className="px-5 py-6"
          style={{ borderBottom: "0.5px solid var(--border)" }}
        >
          <div
            className="text-xl font-extrabold"
            style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
          >
            Vazhi<span style={{ color: "var(--accent)" }}>AI</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p
            className="text-[10px] font-extrabold tracking-widest uppercase px-2 mb-2"
            style={{
              color: "var(--text3)",
              fontFamily: "var(--font-syne)",
            }}
          >
            Menu
          </p>
          <div className="flex flex-col gap-0.5 mb-6">
            {MENU_ITEMS.map((item) => {
              const active = false; // none of the menu items are active in Mentors page
              const isLoading = navLoadingLabel === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.path && !active) {
                      setNavLoadingLabel(item.label);
                      router.push(item.path);
                    }
                  }}
                  disabled={navLoadingLabel !== null}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border-none outline-none"
                  style={{
                    background: "transparent",
                    color: item.path ? "var(--text2)" : "var(--text3)",
                    borderLeft: "3px solid transparent",
                    cursor: item.path && !active ? "pointer" : "default",
                    opacity: navLoadingLabel !== null && !isLoading ? 0.6 : 1,
                  }}
                >
                  <span className="text-sm flex items-center justify-center" style={{ width: 16, height: 16 }}>
                    {isLoading ? (
                      <span
                        style={{
                          display: "inline-block",
                          width: 12,
                          height: 12,
                          border: "1.5px solid var(--border2)",
                          borderTopColor: "var(--accent)",
                          borderRadius: "50%",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                    ) : (
                      item.icon
                    )}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ fontFamily: "var(--font-syne)" }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          <p
            className="text-[10px] font-extrabold tracking-widest uppercase px-2 mb-2"
            style={{
              color: "var(--text3)",
              fontFamily: "var(--font-syne)",
            }}
          >
            Resources
          </p>
          <div className="flex flex-col gap-0.5">
            {RESOURCE_ITEMS.map((item) => {
              const active = item.label === "Mentors";
              const isLoading = navLoadingLabel === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.path && !active) {
                      setNavLoadingLabel(item.label);
                      router.push(item.path);
                    }
                  }}
                  disabled={navLoadingLabel !== null}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border-none outline-none"
                  style={{
                    background: active ? "var(--accent-light)" : "transparent",
                    color: active
                      ? "var(--accent)"
                      : item.path
                        ? "var(--text2)"
                        : "var(--text3)",
                    borderLeft: active
                      ? "3px solid var(--accent)"
                      : "3px solid transparent",
                    cursor: item.path && !active ? "pointer" : "default",
                    opacity: navLoadingLabel !== null && !isLoading ? 0.6 : 1,
                  }}
                >
                  <span className="text-sm flex items-center justify-center" style={{ width: 16, height: 16 }}>
                    {isLoading ? (
                      <span
                        style={{
                          display: "inline-block",
                          width: 12,
                          height: 12,
                          border: "1.5px solid var(--border2)",
                          borderTopColor: "var(--accent)",
                          borderRadius: "50%",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                    ) : (
                      item.icon
                    )}
                  </span>
                  <span
                    className="text-sm"
                    style={{
                      fontFamily: "var(--font-syne)",
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* User / Logout */}
        <div
          className="px-4 py-4"
          style={{ borderTop: "0.5px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="flex items-center justify-center rounded-full text-sm font-bold text-white shrink-0"
              style={{
                width: 36,
                height: 36,
                background: "var(--accent)",
                fontFamily: "var(--font-syne)",
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-semibold truncate"
                style={{
                  color: "var(--text)",
                  fontFamily: "var(--font-syne)",
                }}
              >
                {user?.name}
              </div>
              <div
                className="text-xs truncate font-medium"
                style={{
                  color: "var(--text3)",
                  fontFamily: "var(--font-syne)",
                }}
              >
                {user?.educational_status || "Student"}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-xs py-2 rounded-xl font-medium text-center"
            style={{
              border: "0.5px solid var(--border2)",
              color: "var(--text3)",
              background: "transparent",
              fontFamily: "var(--font-syne)",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="flex items-center justify-between px-8 py-4 fixed top-0 right-0 z-20"
          style={{
            left: "220px",
            background: "var(--header-bg)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <h1
              className="text-xl font-extrabold"
              style={{
                fontFamily: "var(--font-syne)",
                color: "var(--text)",
              }}
            >
              Mentors
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
              Connect with domain experts to accelerate your learning
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => router.push("/home")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer bg-transparent"
              style={{
                borderColor: "var(--border2)",
                color: "var(--text2)",
                fontFamily: "var(--font-syne)",
              }}
            >
              ← Back to Home Page
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center p-8 pt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-xl w-full rounded-[24px] p-8 text-center"
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              boxShadow: "var(--shadow)",
            }}
          >
            {/* Elegant Icon representation */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{
                background: "rgba(42, 122, 110, 0.08)",
                color: "var(--teal)",
                border: "1px solid rgba(42, 122, 110, 0.2)",
              }}
            >
              <span style={{ fontSize: 28 }}>◉</span>
            </div>

            <h2
              className="text-2xl font-extrabold mb-3"
              style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
            >
              Connect with Industry Mentors
            </h2>

            <p
              className="text-sm leading-relaxed mb-6"
              style={{ color: "var(--text2)", fontFamily: "var(--font-dm)" }}
            >
              Get personalized guidance and feedback from experienced professionals
              who have navigated the path to becoming a <strong style={{ color: "var(--accent)" }}>{targetRole}</strong>.
            </p>

            {/* Core user message card */}
            <div
              className="rounded-2xl p-5 mb-6 text-sm font-semibold leading-relaxed"
              style={{
                background: "var(--surface2)",
                border: "0.5px solid var(--border)",
                color: "var(--text)",
                fontFamily: "var(--font-syne)",
              }}
            >
              ✨ You can find the Mentors in your field (<span style={{ color: "var(--teal)" }}>{fieldName}</span>) to connect and solve the doubts.
            </div>

            <p
              className="text-xs"
              style={{ color: "var(--text3)", fontFamily: "var(--font-dm)" }}
            >
              The mentoring network panel is being configured for direct matches.
              Check back soon to request mock interviews and schedule doubt-solving sessions!
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
