"use client";

/**
 * /demo-course — Public, static preview of the roadmap Day Plan experience.
 * ──────────────────────────────────────────────────────────────────────────
 * Mirrors the visual layout, cards, sidebar, and interactions of the
 * authenticated roadmap page (app/page.tsx) so visitors get a realistic
 * feel for the product before signing up. Unlike app/page.tsx, this page:
 *   - Requires NO authentication (see components/auth/RouteGuard.tsx —
 *     "/demo-course" is registered as a public path).
 *   - Makes NO API calls and touches NO database — all content comes from
 *     the static lib/demoRoadmap.ts dataset.
 *   - Saves NOTHING. Checkboxes and notes are local component state only
 *     (reset on refresh); any action that would normally hit the backend
 *     (starting a quiz, saving notes, chatting with the AI advisor) shows
 *     a "Sign in to use this feature" toast instead.
 *
 * app/page.tsx itself is NOT imported or modified — this page duplicates
 * its visual structure (same CSS variables/classes from globals.css) so
 * the authenticated experience is completely unaffected.
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DEMO_ROADMAP_META, demoOutline, demoDayDetails, DEMO_FULL_DAYS } from "@/lib/demoRoadmap";

const DIFF_COLORS: Record<string, string> = { Beginner: "#22c55e", Intermediate: "#f59e0b", Advanced: "#ef4444" };
const MCQ_DIFF_COLORS: Record<string, string> = { Easy: "#22c55e", Medium: "#f59e0b", Hard: "#ef4444" };

export default function DemoCoursePage() {
  const router = useRouter();

  const [activeDayNum, setActiveDayNum] = useState(1);
  const [checkedTopics, setCheckedTopics] = useState<string[]>([]);
  const [checkedProblems, setCheckedProblems] = useState<string[]>([]);
  const [dailyNotes, setDailyNotes] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dayOutline = demoOutline.find((d) => d.day === activeDayNum) || demoOutline[0];
  const dayDetails = demoDayDetails[activeDayNum];
  const isUnlocked = DEMO_FULL_DAYS.has(activeDayNum);
  const totalDays = demoOutline.length;

  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  }

  function handleToggleTopic(topic: string) {
    setCheckedTopics((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));
  }
  function handleToggleProblem(problem: string) {
    setCheckedProblems((prev) => (prev.includes(problem) ? prev.filter((p) => p !== problem) : [...prev, problem]));
  }

  const mcqCounts = dayDetails
    ? dayDetails.mcqTest.reduce(
        (acc, q) => {
          const d = q.difficulty || "Medium";
          acc[d] = (acc[d] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    : {};

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col sticky top-0 h-screen overflow-y-auto"
        style={{ width: 240, minWidth: 240, background: "var(--surface)", borderRight: "0.5px solid var(--border)" }}
      >
        <div className="px-5 py-6 mb-2" style={{ borderBottom: "0.5px solid var(--border)" }}>
          <div className="text-lg font-extrabold mb-2" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
            Vazhi<span style={{ color: "var(--accent)" }}>AI</span>
          </div>
          <button
            onClick={() => router.push("/landing")}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: "var(--text3)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-syne)", padding: 0 }}
          >
            ← Back to Home
          </button>
        </div>

        <div className="px-5 py-4 mb-4">
          <div className="rounded-xl p-4 flex flex-col items-center justify-center text-center" style={{ background: "var(--surface2)", border: "0.5px solid var(--border)" }}>
            <div className="relative flex items-center justify-center mb-2" style={{ width: 68, height: 68 }}>
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="34" cy="34" r="30" fill="transparent" stroke="var(--border)" strokeWidth="3" />
                <circle cx="34" cy="34" r="30" fill="transparent" stroke="var(--accent)" strokeWidth="3.5" strokeDasharray={2 * Math.PI * 30} strokeDashoffset={2 * Math.PI * 30} strokeLinecap="round" />
              </svg>
              <div className="absolute text-base font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>0%</div>
            </div>
            <span className="text-xs font-bold tracking-wider uppercase mb-1" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>Roadmap Progress</span>
            <span className="text-[10px]" style={{ color: "var(--text3)" }}>Sign up to start tracking</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <div className="px-4 py-2 text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>
            Study Days ({totalDays})
          </div>
          <div className="flex flex-col gap-0.5">
            {(() => {
              let lastModule = "";
              return demoOutline.map((item) => {
                const isActive = activeDayNum === item.day;
                const showModuleHeader = item.module && item.module !== lastModule;
                if (item.module) lastModule = item.module;
                const diffColor = DIFF_COLORS[item.difficulty || ""] || "var(--text3)";
                const unlocked = DEMO_FULL_DAYS.has(item.day);
                return (
                  <div key={item.day}>
                    {showModuleHeader && (
                      <div className="px-3 pt-3 pb-1 text-[9px] font-extrabold tracking-widest uppercase" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>
                        {item.module}
                      </div>
                    )}
                    <button
                      onClick={() => setActiveDayNum(item.day)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border-none outline-none cursor-pointer"
                      style={{
                        background: isActive ? "var(--accent-light)" : "transparent",
                        color: isActive ? "var(--accent2)" : "var(--text2)",
                        fontWeight: isActive ? 600 : 400,
                        borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                      }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: unlocked ? "var(--teal)" : "var(--text3)", opacity: unlocked ? 1 : 0.5 }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold font-syne">Day {item.day}</span>
                          {item.difficulty && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${diffColor}18`, color: diffColor }}>
                              {item.difficulty.slice(0, 3).toUpperCase()}
                            </span>
                          )}
                          {!unlocked && <span className="text-[10px]" title="Sign up to unlock full content">🔒</span>}
                        </div>
                        <div className="text-[10px] truncate" style={{ color: isActive ? "var(--accent)" : "var(--text3)" }}>{item.title}</div>
                      </div>
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div className="mt-auto px-5 py-4 flex flex-col gap-2" style={{ borderTop: "0.5px solid var(--border)" }}>
          <button
            onClick={() => router.push("/auth/signup")}
            className="w-full text-xs py-2.5 rounded-xl font-bold text-center text-white border-none cursor-pointer"
            style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)", fontFamily: "var(--font-syne)" }}
          >
            Sign Up Free
          </button>
          <button
            onClick={() => router.push("/auth/login")}
            className="w-full text-xs py-2 rounded-xl font-medium text-center"
            style={{ border: "0.5px solid var(--border2)", color: "var(--text3)", background: "transparent", fontFamily: "var(--font-syne)", cursor: "pointer" }}
          >
            Log In
          </button>
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <header
          className="flex items-center justify-between px-8 py-4 fixed top-0 z-10"
          style={{ left: 240, right: 0, borderBottom: "1px solid var(--border)", background: "var(--header-bg)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-extrabold truncate" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>{DEMO_ROADMAP_META.title}</h1>
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0"
              style={{ background: "var(--accent-light)", color: "var(--accent)", border: "0.5px solid var(--accent-glow)", fontFamily: "var(--font-syne)" }}
            >
              👀 Live Demo
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <button
              onClick={() => router.push("/auth/signup")}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white border-none cursor-pointer"
              style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)", fontFamily: "var(--font-syne)" }}
            >
              ✦ Sign Up to Build Yours
            </button>
          </div>
        </header>

        <div className="p-8 flex-1 flex flex-col gap-6 with-fixed-header-sidebar">
          {/* CTA banner */}
          <div
            className="rounded-xl px-5 py-3.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-3"
            style={{ background: "var(--accent-light)", color: "var(--accent)", border: "0.5px solid var(--accent-glow)" }}
          >
            <span>You're viewing a live preview — a 2nd-Year CS student's roadmap to becoming a Software Developer. Sign up to generate one tailored to <em>your</em> goals.</span>
            <button
              onClick={() => router.push("/auth/signup")}
              className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold text-white border-none cursor-pointer shrink-0"
              style={{ background: "var(--accent)" }}
            >
              Sign Up Free →
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
              <span className="text-[10px] font-bold tracking-widest uppercase mb-1 block" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Duration</span>
              <span className="text-xl font-extrabold" style={{ fontFamily: "var(--font-syne)" }}>{DEMO_ROADMAP_META.duration_weeks} Weeks</span>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
              <span className="text-[10px] font-bold tracking-widest uppercase mb-1 block" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Level / Pace</span>
              <span className="text-sm font-extrabold capitalize truncate block" style={{ fontFamily: "var(--font-syne)", color: "var(--teal)" }}>{DEMO_ROADMAP_META.experience_level} / {DEMO_ROADMAP_META.learning_pace}</span>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
              <span className="text-[10px] font-bold tracking-widest uppercase mb-1 block" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Daily Time</span>
              <span className="text-xl font-extrabold" style={{ fontFamily: "var(--font-syne)" }}>{DEMO_ROADMAP_META.available_time}</span>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
              <span className="text-[10px] font-bold tracking-widest uppercase mb-1 block" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Tests Avg</span>
              <span className="text-xs font-semibold" style={{ color: "var(--text3)" }}>Sign up to track</span>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1">
            <motion.div
              key={activeDayNum}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Left columns */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Day description */}
                <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{
                        background: isUnlocked ? "var(--accent-light)" : "var(--surface2)",
                        color: isUnlocked ? "var(--accent)" : "var(--text3)",
                        border: isUnlocked ? "0.5px solid var(--accent-glow)" : "0.5px solid var(--border)",
                        fontFamily: "var(--font-syne)",
                      }}
                    >
                      {isUnlocked ? `Day ${activeDayNum} Learning Module` : `🔒 Day ${activeDayNum} — Locked Preview`}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "var(--text3)" }}>
                      Suggested: {dayDetails?.duration || DEMO_ROADMAP_META.available_time}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold mb-2" style={{ color: "var(--text)" }}>{dayOutline.title}</h2>
                  <p className="text-xs" style={{ color: "var(--text2)" }}>Focus Area: {dayOutline.focus}</p>
                </div>

                {isUnlocked && dayDetails ? (
                  <>
                    {/* Topics checklist */}
                    <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                      <h3 className="text-base font-extrabold mb-4" style={{ fontFamily: "var(--font-syne)" }}>Study Topics & Syllabus</h3>
                      <div className="flex flex-col gap-3">
                        {dayDetails.topics.map((topic, idx) => {
                          const isChecked = checkedTopics.includes(topic);
                          return (
                            <div
                              key={idx}
                              onClick={() => handleToggleTopic(topic)}
                              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                              style={{
                                background: isChecked ? "rgba(42,122,110,0.05)" : "var(--surface2)",
                                border: isChecked ? "0.5px solid rgba(42,122,110,0.3)" : "0.5px solid var(--border)",
                              }}
                            >
                              <div
                                className="w-5 h-5 rounded flex items-center justify-center shrink-0 border"
                                style={{ background: isChecked ? "var(--teal)" : "var(--surface)", borderColor: isChecked ? "var(--teal)" : "var(--border2)" }}
                              >
                                {isChecked && <span className="text-white text-[10px]">✓</span>}
                              </div>
                              <span className="text-xs font-medium" style={{ color: isChecked ? "var(--teal)" : "var(--text)", textDecoration: isChecked ? "line-through" : "none" }}>{topic}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Resources */}
                    <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                      <h3 className="text-base font-extrabold mb-4" style={{ fontFamily: "var(--font-syne)" }}>Recommended Handpicked Resources</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dayDetails.resources.map((res, idx) => (
                          <a
                            key={idx}
                            href={res.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 rounded-xl flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer"
                            style={{ background: "var(--surface2)", border: "0.5px solid var(--border)", textDecoration: "none", color: "inherit" }}
                          >
                            <div>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider block mb-2 w-max"
                                style={{
                                  background: res.type === "youtube" ? "rgba(220,53,69,0.1)" : res.type === "documentation" ? "rgba(34,197,94,0.1)" : res.type === "practice" ? "rgba(168,85,247,0.1)" : "rgba(0,123,255,0.1)",
                                  color: res.type === "youtube" ? "#dc3545" : res.type === "documentation" ? "#16a34a" : res.type === "practice" ? "#a855f7" : "#007bff",
                                }}
                              >
                                {res.type === "documentation" ? "📄 Docs" : res.type === "youtube" ? "▶ Video" : res.type === "practice" ? "⚡ Practice" : "📖 Tutorial"}
                              </span>
                              <div className="text-xs font-bold leading-snug mb-3" style={{ color: "var(--text)" }}>{res.title}</div>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">Open Resource ↗</span>
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Practice problems */}
                    <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                      <h3 className="text-base font-extrabold mb-4" style={{ fontFamily: "var(--font-syne)" }}>Targeted Practice Questions</h3>
                      <div className="flex flex-col gap-3">
                        {dayDetails.practice.map((prob, idx) => {
                          const isChecked = checkedProblems.includes(prob.problem);
                          return (
                            <div
                              key={idx}
                              className="p-4 rounded-xl flex items-center justify-between gap-4"
                              style={{ background: isChecked ? "rgba(42,122,110,0.03)" : "var(--surface2)", border: isChecked ? "0.5px solid rgba(42,122,110,0.2)" : "0.5px solid var(--border)" }}
                            >
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleToggleProblem(prob.problem)}
                                  className="w-5 h-5 rounded flex items-center justify-center shrink-0 border cursor-pointer"
                                  style={{ background: isChecked ? "var(--teal)" : "var(--surface)", borderColor: isChecked ? "var(--teal)" : "var(--border2)", color: "#ffffff" }}
                                >
                                  {isChecked && <span className="text-xs">✓</span>}
                                </button>
                                <div>
                                  <div className="text-xs font-bold" style={{ color: "var(--text)" }}>{prob.problem}</div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">{prob.platform} • {prob.difficulty}</div>
                                </div>
                              </div>
                              <a
                                href={prob.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white text-center cursor-pointer"
                                style={{ background: "var(--teal)", textDecoration: "none" }}
                              >
                                Solve problem ↗
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Coding assignment + revision */}
                    {dayDetails.codingAssignment && (
                      <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderLeft: "4px solid var(--accent)" }}>
                        <h3 className="text-base font-extrabold mb-2" style={{ fontFamily: "var(--font-syne)", color: "var(--accent)" }}>Daily Coding Assignment</h3>
                        <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--text2)" }}>{dayDetails.codingAssignment}</p>
                        {dayDetails.revisionTasks && dayDetails.revisionTasks.length > 0 && (
                          <div>
                            <div className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "var(--text2)" }}>Quick Revision Checklist:</div>
                            <ul className="text-xs pl-4 list-disc flex flex-col gap-1.5" style={{ color: "var(--text2)" }}>
                              {dayDetails.revisionTasks.map((t, idx) => <li key={idx}>{t}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className="rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3"
                    style={{ background: "var(--surface)", border: "0.5px dashed var(--border2)" }}
                  >
                    <span className="text-3xl">🔒</span>
                    <h3 className="text-base font-extrabold" style={{ fontFamily: "var(--font-syne)" }}>Full Day Content Locked</h3>
                    <p className="text-xs max-w-sm" style={{ color: "var(--text2)" }}>
                      Topics, resources, practice problems, and a full quiz for this day unlock when you sign up and generate your own personalized roadmap.
                    </p>
                    <button
                      onClick={() => router.push("/auth/signup")}
                      className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white border-none cursor-pointer"
                      style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)", fontFamily: "var(--font-syne)" }}
                    >
                      Sign Up Free to Unlock →
                    </button>
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-6">
                {isUnlocked && dayDetails ? (
                  <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                    <h3 className="text-base font-extrabold mb-1" style={{ fontFamily: "var(--font-syne)" }}>Daily Assessment Quiz</h3>
                    <p className="text-[10px] mb-4" style={{ color: "var(--text3)" }}>{dayDetails.mcqTest.length} questions · Easy / Medium / Hard</p>

                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-3 gap-2">
                        {["Easy", "Medium", "Hard"].map((label) => (
                          <div key={label} className="rounded-lg p-2 text-center" style={{ background: `${MCQ_DIFF_COLORS[label]}12`, border: `1px solid ${MCQ_DIFF_COLORS[label]}30` }}>
                            <div className="text-xs font-bold" style={{ color: MCQ_DIFF_COLORS[label] }}>{mcqCounts[label] || 0} Qs</div>
                            <div className="text-[9px] font-semibold mt-0.5" style={{ color: MCQ_DIFF_COLORS[label] }}>{label}</div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-xl text-xs leading-relaxed" style={{ background: "var(--surface2)", color: "var(--text2)", border: "0.5px solid var(--border)" }}>
                        Test your understanding of today's concepts with a timed quiz. Sign in to take the quiz and save your score to your progress.
                      </div>

                      <button
                        onClick={() => showToast("Sign in to take quizzes and track your score")}
                        className="w-full py-3.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer transition-all flex items-center justify-center gap-2"
                        style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}
                      >
                        📝 Start Quiz
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-6 text-center" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                    <h3 className="text-base font-extrabold mb-2" style={{ fontFamily: "var(--font-syne)" }}>Daily Assessment Quiz</h3>
                    <p className="text-xs" style={{ color: "var(--text3)" }}>🔒 Unlocks with your personalized roadmap.</p>
                  </div>
                )}

                {/* Notes */}
                <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                  <h3 className="text-base font-extrabold mb-1" style={{ fontFamily: "var(--font-syne)" }}>Study Notes & Log</h3>
                  <p className="text-[10px] mb-3" style={{ color: "var(--text3)" }}>This is a live preview — notes here are local only and won't be saved.</p>
                  <textarea
                    className="field-textarea text-xs w-full mb-3"
                    rows={8}
                    value={dailyNotes}
                    onChange={(e) => setDailyNotes(e.target.value)}
                    placeholder="Try typing a note — sign up to save it to your real progress log..."
                  />
                  <button
                    onClick={() => showToast("Sign in to save notes and progress")}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer transition-all border-none"
                    style={{ background: "var(--text)" }}
                  >
                    Save Notes & Tasks
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Floating AI Advisor widget (preview only) */}
      <div className="chat-widget">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="chat-panel"
              style={{ height: 420 }}
            >
              <div className="chat-header">
                <div className="chat-header-title">
                  <span style={{ color: "var(--accent)" }}>✦</span> AI Advisor — Preview
                </div>
                <button className="chat-close-btn" onClick={() => setChatOpen(false)}>×</button>
              </div>
              <div className="chat-body">
                <div className="message-bubble message-assistant">
                  Hi! I'm the AI Learning Advisor. I can explain concepts, help debug code, and answer questions about your roadmap. Sign in to start chatting with me!
                </div>
              </div>
              <form
                className="chat-input-area"
                onSubmit={(e) => {
                  e.preventDefault();
                  showToast("Sign in to chat with your AI mentor");
                }}
              >
                <input type="text" className="chat-input" placeholder="Sign in to chat with your AI mentor →" disabled />
                <button type="submit" className="chat-send-btn" disabled>Send</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {!chatOpen && (
          <motion.button onClick={() => setChatOpen(true)} className="chat-toggle-btn" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            AI Learning Advisor
          </motion.button>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 px-5 py-3 rounded-xl text-xs font-semibold text-white flex items-center gap-3"
            style={{ transform: "translateX(-50%)", background: "var(--text)", boxShadow: "var(--shadow2)" }}
          >
            🔒 {toast}
            <button
              onClick={() => router.push("/auth/signup")}
              className="px-3 py-1 rounded-lg text-[11px] font-bold border-none cursor-pointer"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Sign Up
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
