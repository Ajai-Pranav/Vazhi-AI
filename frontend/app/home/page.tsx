"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { store } from "@/lib/store";
import { getActiveRoadmap, getDailyProgress, getTestScores } from "@/lib/api";
import { getInitials, getDifficultyClass } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

// ─── Shared sidebar nav config ───────────────────────────────────────────────
const MENU_ITEMS = [
  { icon: "⊞", label: "Dashboard",     path: "/home" },
  { icon: "◈", label: "Roadmap",        path: "/" },
  { icon: "✦", label: "Create Resume",  path: "/resume" },
];

const RESOURCE_ITEMS = [
  { icon: "⊕", label: "Explore Paths",  path: "/suggestions" },
  { icon: "◉", label: "Mentors",        path: "/mentors" },
  { icon: "📚", label: "Study Material", path: "/study-material" },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({
  activeLabel,
  userName,
  initials,
  userStatus,
  onLogout,
}: {
  activeLabel: string;
  userName: string;
  initials: string;
  userStatus: string;
  onLogout: () => void;
}) {
  const router = useRouter();
  const [navLoadingLabel, setNavLoadingLabel] = useState<string | null>(null);

  return (
    <aside
      className="flex flex-col sticky top-0 h-screen overflow-y-auto"
      style={{ width: 220, minWidth: 220, background: "var(--surface)", borderRight: "0.5px solid var(--border)" }}
    >
      {/* Logo */}
      <div className="px-5 py-6" style={{ borderBottom: "0.5px solid var(--border)" }}>
        <div className="text-xl font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
          Vazhi<span style={{ color: "var(--accent)" }}>AI</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {/* Menu section */}
        <p className="text-[10px] font-extrabold tracking-widest uppercase px-2 mb-2" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Menu</p>
        <div className="flex flex-col gap-0.5 mb-6">
          {MENU_ITEMS.map((item) => {
            const active = item.label === activeLabel;
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
                  color: active ? "var(--accent)" : item.path ? "var(--text2)" : "var(--text3)",
                  borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
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
                <span className="text-sm" style={{ fontFamily: "var(--font-syne)", fontWeight: active ? 700 : 500 }}>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Resources section */}
        <p className="text-[10px] font-extrabold tracking-widest uppercase px-2 mb-2" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Resources</p>
        <div className="flex flex-col gap-0.5">
          {RESOURCE_ITEMS.map((item) => {
            const active = item.label === activeLabel;
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
                  color: active ? "var(--accent)" : item.path ? "var(--text2)" : "var(--text3)",
                  borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
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
                <span className="text-sm font-medium" style={{ fontFamily: "var(--font-syne)", fontWeight: active ? 700 : 500 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* User + Logout */}
      <div className="px-4 py-4" style={{ borderTop: "0.5px solid var(--border)" }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="flex items-center justify-center rounded-full text-sm font-bold text-white shrink-0"
            style={{ width: 36, height: 36, background: "var(--accent)", fontFamily: "var(--font-syne)" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: "var(--text)", fontFamily: "var(--font-syne)" }}>{userName}</div>
            <div className="text-xs truncate font-medium" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>{userStatus || "Student"}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full text-xs py-2 rounded-xl font-medium text-center"
          style={{ border: "0.5px solid var(--border2)", color: "var(--text3)", background: "transparent", fontFamily: "var(--font-syne)", cursor: "pointer" }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HomeDashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [roadmap, setRoadmap]         = useState<any | null>(null);
  const [progressLogs, setProgressLogs] = useState<any[]>([]);
  const [testScores, setTestScores]   = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [todayDayNum, setTodayDayNum] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/auth/login"); return; }
    if (user) loadData();
  }, [authLoading, user]);

  const loadData = async () => {
    try {
      const active = await getActiveRoadmap();
      if (!active) { router.replace("/get-started"); return; }
      setRoadmap(active);

      if (active.is_confirmed && active.outline?.length > 0) {
        const [logs, scores] = await Promise.all([getDailyProgress(), getTestScores()]);
        setProgressLogs(logs);
        setTestScores(scores);

        // Compute today's study day from roadmap creation date (Issue 2 from first prompt)
        if (active.created_at) {
          const start = new Date(active.created_at);
          start.setHours(0, 0, 0, 0);
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const diff = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
          setTodayDayNum(Math.max(1, Math.min(diff + 1, active.outline.length)));
        }
      }
    } catch (err) {
      console.error("Home dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    store.clear();
    router.push("/auth/login");
  };

  // Overall % — same criteria as dashboard (all topics + quiz done per day)
  const overallProgress = () => {
    const total = roadmap?.outline?.length;
    if (!total) return 0;
    const completed = progressLogs.filter((log) => {
      const dayDetail = roadmap?.detailed_days?.[String(log.day_number)];
      const topicsTotal  = dayDetail?.topics?.length ?? 0;
      const allTopicsDone = topicsTotal > 0 && (log.completed_tasks?.length || 0) >= topicsTotal;
      const quizDone = testScores.some((s) => s.day_number === log.day_number);
      return allTopicsDone && quizDone;
    }).length;
    return Math.round((completed / total) * 100);
  };

  const progress    = overallProgress();

  // Count-up animation for progress %
  const [countDisplay, setCountDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = progress;
    if (start === end) { setCountDisplay(end); return; }
    const duration = 1200;
    const stepTime = 16;
    const steps = Math.ceil(duration / stepTime);
    let current = 0;
    const timer = setInterval(() => {
      current++;
      setCountDisplay(Math.round((end * current) / steps));
      if (current >= steps) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [progress]);

  // ── Loading ──
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2, borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  if (!roadmap) return null;

  // ── Derived values ──
  const initials    = getInitials(user?.name || "Student");
  const firstName   = (user?.name || "Student").split(" ")[0];
  const yearsLeft   = Math.max(0, (user?.total_years || 4) - (user?.current_year || 1));
  const roadmapSteps = roadmap.roadmap_steps?.length || 0;
  const skillsKnown = user?.tech_stack?.length || 0;
  const difficulty  = roadmap.experience_level || roadmap.difficulty || "Intermediate";
  const totalDays   = roadmap.outline?.length || 0;
  const testsTaken  = testScores.length;
  const avgScore    = testsTaken > 0
    ? (testScores.reduce((a: number, b: any) => a + b.score, 0) / testsTaken).toFixed(1)
    : null;
  const diffClass   = getDifficultyClass(difficulty);
  const diffColor   = difficulty?.toLowerCase().includes("beginner") ? "var(--teal)"
    : difficulty?.toLowerCase().includes("advanced") ? "var(--accent)"
    : "var(--gold)";

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // ── Quick-action cards ──
  const quickActions = [
    {
      icon: "◈",
      title: "Study Dashboard",
      sub: todayDayNum ? `Continue Day ${todayDayNum}` : "Open your roadmap",
      color: "var(--accent)",
      bg: "var(--accent-light)",
      onClick: () => router.push("/"),
    },
    {
      icon: "✦",
      title: "Create Resume",
      sub: "Build with AI",
      color: "var(--teal)",
      bg: "var(--teal-light)",
      onClick: () => router.push("/resume"),
    },
    {
      icon: "⊕",
      title: "Explore Paths",
      sub: "Browse other careers",
      color: "var(--gold)",
      bg: "var(--gold-light)",
      onClick: () => router.push("/suggestions"),
    },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeLabel="Dashboard"
        userName={user?.name || "Student"}
        initials={initials}
        userStatus={user?.educational_status || "Student"}
        onLogout={handleLogout}
      />

      {/* ── Main ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <header
          className="flex items-center justify-between px-8 py-5 fixed top-0 z-10"
          style={{ right: 0, left: 220, background: "var(--header-bg)", backdropFilter: "blur(16px)", borderBottom: "0.5px solid var(--border)" }}
        >
          <div>
            <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
              Welcome back, <span style={{ color: "var(--accent)" }}>{firstName}</span>
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>{todayStr}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <motion.button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white border-none cursor-pointer"
              style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)", fontFamily: "var(--font-syne)" }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Open Study Dashboard →
            </motion.button>
          </div>
        </header>

        <div className="p-8 flex flex-col gap-6 with-fixed-header">

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-4 gap-4">
            {[
              (user?.educational_status === "Working Professional" || user?.educational_status === "Job Seeker")
                ? { label: "Experience",    value: user?.years_of_experience !== undefined ? `${user.years_of_experience} Yrs` : "0 Yrs", sub: user?.educational_status === "Working Professional" ? "industry experience" : "past experience", big: true,  color: "var(--text)" }
                : { label: "Years Left",     value: yearsLeft,   sub: "of study remaining", big: true,  color: "var(--text)" },
              { label: "Roadmap Steps",  value: roadmapSteps, sub: "total milestones",  big: true,  color: "var(--text)" },
              { label: "Skills Known",   value: skillsKnown, sub: "tech skills listed", big: true,  color: "var(--text)" },
              { label: "Difficulty",     value: difficulty,  sub: "chosen path",        big: false, color: diffColor    },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="rounded-2xl p-5"
                style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.35 }}
              >
                <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>{stat.label}</p>
                <div
                  className="font-extrabold leading-tight"
                  style={{ fontFamily: "var(--font-syne)", color: stat.color, fontSize: stat.big ? "2.25rem" : "1.25rem" }}
                >
                  {stat.value}
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--text3)" }}>{stat.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* ── Path Progress Card ── */}
          {roadmap.is_confirmed && (
            <motion.div
              className="rounded-2xl p-6"
              style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-extrabold mb-0.5" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
                    {roadmap.title}
                  </h2>
                  <p className="text-sm" style={{ color: "var(--text2)" }}>{user?.dream_job || "Career Path"}</p>
                </div>
                <span className="text-4xl font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--accent)" }}>
                  {countDisplay}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: "var(--surface2)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ delay: 0.5, duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>

              <div className="flex items-center justify-between text-xs" style={{ color: "var(--text3)" }}>
                <span>
                  {user?.educational_status === "Working Professional" ? (
                    <>
                      Current Role: <strong style={{ color: "var(--text)" }}>{user?.current_role || "Not specified"}</strong>
                      {user?.current_company && <> at <strong style={{ color: "var(--text)" }}>{user.current_company}</strong></>}
                      {" · "}
                      Target: <strong style={{ color: "var(--text)" }}>{user?.dream_job}</strong>
                    </>
                  ) : user?.educational_status === "Job Seeker" ? (
                    <>
                      Previous Role: <strong style={{ color: "var(--text)" }}>{user?.current_role || "Not specified"}</strong>
                      {" · "}
                      Targeting: <strong style={{ color: "var(--text)" }}>{user?.dream_job}</strong>
                    </>
                  ) : (
                    <>
                      Year <strong style={{ color: "var(--text)" }}>{user?.current_year}</strong> of{" "}
                      <strong style={{ color: "var(--text)" }}>{user?.total_years}</strong>
                      {" · "}
                      {yearsLeft} {yearsLeft === 1 ? "year" : "years"} remaining
                    </>
                  )}
                  {roadmap.duration_weeks && ` · Est. timeline: ${roadmap.duration_weeks} weeks`}
                </span>
                {/* Today's day badge — Issue 2 */}
                {todayDayNum && (
                  <span
                    className="font-bold px-3 py-1 rounded-full text-[10px]"
                    style={{ background: "var(--accent-light)", color: "var(--accent)", border: "0.5px solid var(--accent-glow)", fontFamily: "var(--font-syne)" }}
                  >
                    Today: Day {todayDayNum} of {totalDays}
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Two-column: Profile + Roadmap phases ── */}
          <div className="grid grid-cols-5 gap-6">
            {/* Profile card */}
            <motion.div
              className="col-span-2 rounded-2xl p-6 flex flex-col"
              style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.38, duration: 0.4 }}
            >
              {/* Avatar + name */}
              <div className="flex flex-col items-center mb-5 pb-5" style={{ borderBottom: "0.5px solid var(--border)" }}>
                <div
                  className="flex items-center justify-center rounded-full text-2xl font-extrabold text-white mb-3"
                  style={{ width: 72, height: 72, background: "var(--accent)", fontFamily: "var(--font-syne)" }}
                >
                  {initials}
                </div>
                <p className="text-lg font-extrabold text-center" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
                  {user?.name}
                </p>
                <p className="text-sm text-center" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>
                  {user?.educational_status === "Working Professional"
                    ? `${user?.current_role || "Professional"}${user?.current_company ? ` at ${user.current_company}` : ""}`
                    : user?.educational_status === "Job Seeker"
                    ? `${user?.current_role || "Job Seeker"}`
                    : user?.college}
                </p>
              </div>

              {/* Detail rows */}
              <div className="flex flex-col gap-3 flex-1">
                {(user?.educational_status === "Working Professional"
                  ? [
                      { label: "Current Company", value: user?.current_company },
                      { label: "Current Role",    value: user?.current_role },
                      { label: "Target Role",     value: user?.dream_job },
                    ]
                  : user?.educational_status === "Job Seeker"
                  ? [
                      { label: "Previous Role",   value: user?.current_role },
                      { label: "Target Role",     value: user?.dream_job },
                    ]
                  : [
                      { label: "Course",          value: user?.course },
                      { label: "Dream Role",      value: user?.dream_job },
                    ]
                ).map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-xs shrink-0" style={{ color: "var(--text3)" }}>{label}</span>
                    <span className="text-xs font-semibold text-right" style={{ color: "var(--text)" }}>{value || "—"}</span>
                  </div>
                ))}

                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs shrink-0" style={{ color: "var(--text3)" }}>Tech Stack</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {(user?.tech_stack || []).slice(0, 5).map((t: string) => (
                      <span
                        key={t}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--accent-light)", color: "var(--accent)", border: "0.5px solid var(--accent-glow)" }}
                      >
                        {t}
                      </span>
                    ))}
                    {(user?.tech_stack?.length || 0) > 5 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--text3)" }}>
                        +{(user?.tech_stack?.length || 0) - 5}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-5 pt-5 flex flex-col gap-2" style={{ borderTop: "0.5px solid var(--border)" }}>
                <motion.button
                  onClick={() => router.push("/resume")}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white border-none cursor-pointer"
                  style={{ background: "var(--accent)", fontFamily: "var(--font-syne)", boxShadow: "var(--shadow-accent)" }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                >
                  ✦ Create Resume
                </motion.button>
                <button
                  onClick={() => router.push("/")}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold border cursor-pointer bg-transparent"
                  style={{ borderColor: "var(--border2)", color: "var(--text2)", fontFamily: "var(--font-syne)" }}
                >
                  Open Study Dashboard →
                </button>
              </div>
            </motion.div>

            {/* Roadmap phases card */}
            <motion.div
              className="col-span-3 rounded-2xl p-6 flex flex-col"
              style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.43, duration: 0.4 }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
                    {user?.educational_status === "Working Professional" || user?.educational_status === "Job Seeker"
                      ? "Upskill Roadmap"
                      : "Selected Roadmap"}
                  </h2>
                  <p className="text-xs" style={{ color: "var(--text3)" }}>{roadmap.title}</p>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-full ${diffClass}`}
                  style={{ fontFamily: "var(--font-syne)" }}
                >
                  {difficulty}
                </span>
              </div>

              {/* Phase list */}
              <div className="flex flex-col gap-4 flex-1 overflow-y-auto" style={{ maxHeight: 320 }}>
                {(roadmap.roadmap_steps || []).map((step: string, i: number) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-4"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.06, duration: 0.3 }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full text-xs font-extrabold shrink-0 mt-0.5"
                      style={{
                        width: 28, height: 28,
                        background: i === 0 ? "var(--accent)" : "var(--surface2)",
                        color: i === 0 ? "#fff" : "var(--text3)",
                        border: i === 0 ? "none" : "0.5px solid var(--border2)",
                        fontFamily: "var(--font-syne)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold mb-0.5 uppercase tracking-wide" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>
                        Phase {i + 1}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>{step}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Progress stats chips */}
              {roadmap.is_confirmed && (
                <div className="flex flex-wrap gap-2 mt-5 pt-4" style={{ borderTop: "0.5px solid var(--border)" }}>
                  {[
                    { label: "Days w/ Progress", value: progressLogs.length },
                    { label: "Quizzes Taken",    value: testsTaken },
                    ...(avgScore ? [{ label: "Avg Quiz Score", value: `${avgScore}/10` }] : []),
                  ].map(({ label, value }, i) => (
                    <motion.div
                      key={label}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium"
                      style={{ background: "var(--surface2)", color: "var(--text2)", border: "0.5px solid var(--border)" }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.07, duration: 0.35 }}
                    >
                      {label}: <strong style={{ color: "var(--text)" }}>{value}</strong>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Quick Action Cards ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
          >
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Quick Actions</p>
            <div className="grid grid-cols-4 gap-4">
              {[
                {
                  icon: "◈",
                  title: "Study Dashboard",
                  sub: todayDayNum ? `Resume from Day ${todayDayNum}` : "Start your daily study",
                  color: "var(--accent)",
                  bg: "var(--accent-light)",
                  onClick: () => router.push("/"),
                },
                {
                  icon: "✦",
                  title: "Create Resume",
                  sub: "AI-powered builder",
                  color: "var(--teal)",
                  bg: "rgba(42,122,110,0.06)",
                  onClick: () => router.push("/resume"),
                },
                {
                  icon: "⊕",
                  title: "Explore Paths",
                  sub: "Discover new career paths",
                  color: "var(--gold)",
                  bg: "rgba(184,134,11,0.06)",
                  onClick: () => router.push("/suggestions"),
                },
                {
                  icon: "📚",
                  title: "Study Material",
                  sub: "Generate custom manual",
                  color: "var(--rose)",
                  bg: "rgba(194,40,92,0.06)",
                  onClick: () => router.push("/study-material"),
                },
              ].map((card, i) => (
                <motion.button
                  key={card.title}
                  onClick={card.onClick}
                  className="flex items-center gap-4 p-5 rounded-2xl text-left border-none cursor-pointer w-full"
                  style={{
                    background: "var(--surface)",
                    border: `1.5px solid ${card.color}28`,
                    backdropFilter: "blur(20px)"
                  }}
                  whileHover={{ scale: 1.02, boxShadow: "var(--shadow)" }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.06 }}
                >
                  <div
                    className="flex items-center justify-center rounded-xl shrink-0 text-lg"
                    style={{ width: 44, height: 44, background: `${card.color}18`, color: card.color }}
                  >
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>{card.title}</p>
                    <p className="text-xs" style={{ color: "var(--text2)" }}>{card.sub}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}