"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { getDayDetails, submitMCQTest } from "@/lib/api";
import { DayRoadmapDetails, MCQQuestion, TestScoreResponse } from "@/types";

type QuizPhase = "loading" | "intro" | "quiz" | "result";

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "#22c55e",
  Medium: "#f59e0b",
  Hard: "#ef4444",
};

const DIFFICULTY_BG: Record<string, string> = {
  Easy: "rgba(34,197,94,0.12)",
  Medium: "rgba(245,158,11,0.12)",
  Hard: "rgba(239,68,68,0.12)",
};

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const dayNumber = parseInt(params.day as string, 10);
  const { user, loading: authLoading } = useAuth();

  const [phase, setPhase] = useState<QuizPhase>("loading");
  const [dayDetails, setDayDetails] = useState<DayRoadmapDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Quiz state
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TestScoreResponse | null>(null);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login");
    }
  }, [authLoading, user, router]);

  // Load day details
  useEffect(() => {
    if (!user || authLoading) return;
    getDayDetails(dayNumber)
      .then((details) => {
        setDayDetails(details);
        setAnswers(new Array(details.mcqTest?.length || 10).fill(""));
        setPhase("intro");
      })
      .catch((err) => {
        setLoadError(err.message || "Failed to load quiz questions.");
        setPhase("intro");
      });
  }, [user, authLoading, dayNumber]);

  // Per-question countdown timer
  useEffect(() => {
    if (phase !== "quiz") return;
    setTimeLeft(30);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          // Auto-advance on timeout
          handleNextQuestion(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, currentQ]);

  const handleSelectOption = (letter: string) => {
    setSelectedOption(letter);
  };

  const handleNextQuestion = (timedOut = false) => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = timedOut ? (selectedOption || "") : selectedOption;
    setAnswers(newAnswers);
    setSelectedOption("");

    if (currentQ < (dayDetails?.mcqTest?.length ?? 1) - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      // Last question — submit
      submitQuiz(newAnswers);
    }
  };

  const submitQuiz = async (finalAnswers: string[]) => {
    if (!dayDetails) return;
    setSubmitting(true);
    try {
      const scoreData = await submitMCQTest(dayNumber, finalAnswers);
      setResult(scoreData);
      setPhase("result");
    } catch (err: any) {
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnToDashboard = () => {
    router.push("/");
  };

  const questions = dayDetails?.mcqTest || [];
  const totalQ = questions.length;
  const progress = totalQ > 0 ? ((currentQ) / totalQ) * 100 : 0;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (phase === "loading" || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "transparent" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>
            Loading quiz questions…
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "transparent" }}>
        <div className="max-w-md text-center rounded-2xl p-8" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-extrabold mb-2" style={{ fontFamily: "var(--font-syne)" }}>Quiz Unavailable</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text2)" }}>{loadError}</p>
          <button onClick={handleReturnToDashboard} className="px-6 py-3 rounded-xl text-white text-sm font-bold border-none cursor-pointer" style={{ background: "var(--accent)" }}>
            ← Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Intro screen ──────────────────────────────────────────────────────────
  if (phase === "intro") {
    const easyCount = questions.filter((q) => q.difficulty === "Easy").length;
    const medCount = questions.filter((q) => q.difficulty === "Medium").length;
    const hardCount = questions.filter((q) => q.difficulty === "Hard").length;

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "transparent" }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full rounded-3xl p-8"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", boxShadow: "var(--shadow)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: "var(--accent-light)" }}>
              📝
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "var(--accent)" }}>
                Day {dayNumber} Assessment
              </div>
              <h1 className="text-xl font-extrabold leading-tight" style={{ fontFamily: "var(--font-syne)" }}>
                {dayDetails?.title || `Day ${dayNumber} Quiz`}
              </h1>
            </div>
          </div>

          <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text2)" }}>
            Test your understanding of today's concepts with <strong style={{ color: "var(--text)" }}>{totalQ} carefully crafted questions</strong> spanning Easy, Medium, and Hard difficulty. You have <strong>30 seconds</strong> per question.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Easy", count: easyCount, color: DIFFICULTY_COLORS.Easy, bg: DIFFICULTY_BG.Easy },
              { label: "Medium", count: medCount, color: DIFFICULTY_COLORS.Medium, bg: DIFFICULTY_BG.Medium },
              { label: "Hard", count: hardCount, color: DIFFICULTY_COLORS.Hard, bg: DIFFICULTY_BG.Hard },
            ].map(({ label, count, color, bg }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg, border: `1px solid ${color}30` }}>
                <div className="text-2xl font-extrabold" style={{ color, fontFamily: "var(--font-syne)" }}>{count}</div>
                <div className="text-[10px] font-semibold mt-0.5" style={{ color }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Rules */}
          <div className="rounded-xl p-4 mb-6" style={{ background: "var(--surface2)", border: "0.5px solid var(--border)" }}>
            <div className="text-xs font-bold mb-2" style={{ color: "var(--text)" }}>Quiz Rules</div>
            <ul className="flex flex-col gap-1.5">
              {[
                "30 seconds per question — answer before the timer runs out",
                "Select one answer per question",
                "You can't go back to previous questions",
                "Results are saved to your progress",
              ].map((rule, i) => (
                <li key={i} className="flex gap-2 text-xs" style={{ color: "var(--text2)" }}>
                  <span style={{ color: "var(--accent)" }}>→</span> {rule}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReturnToDashboard}
              className="flex-1 py-3 rounded-xl text-xs font-bold border cursor-pointer transition-all"
              style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text2)" }}
            >
              ← Back
            </button>
            <button
              onClick={() => setPhase("quiz")}
              className="flex-[2] py-3 rounded-xl text-sm font-bold text-white border-none cursor-pointer transition-all"
              style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}
            >
              Start Quiz →
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Quiz screen ───────────────────────────────────────────────────────────
  if (phase === "quiz") {
    const q = questions[currentQ];
    const diff = (q as any).difficulty || "Medium";
    const diffColor = DIFFICULTY_COLORS[diff] || "var(--accent)";
    const diffBg = DIFFICULTY_BG[diff] || "var(--accent-light)";
    const timerPct = (timeLeft / 30) * 100;
    const timerColor = timeLeft > 15 ? "#22c55e" : timeLeft > 7 ? "#f59e0b" : "#ef4444";

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "transparent" }}>
        <div className="max-w-2xl w-full">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleReturnToDashboard}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-all"
              style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text2)" }}
            >
              ✕ Exit Quiz
            </button>
            <div className="text-xs font-bold" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>
              Question {currentQ + 1} / {totalQ}
            </div>
            {/* Timer */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 relative flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="13" fill="none" stroke="var(--border)" strokeWidth="3" />
                  <circle
                    cx="16" cy="16" r="13" fill="none"
                    stroke={timerColor} strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 13}`}
                    strokeDashoffset={`${2 * Math.PI * 13 * (1 - timerPct / 100)}`}
                    style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
                  />
                </svg>
                <span className="text-[10px] font-bold relative z-10" style={{ color: timerColor }}>{timeLeft}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full mb-6 overflow-hidden" style={{ background: "var(--border)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--accent)" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl p-8"
              style={{ background: "var(--surface)", border: "0.5px solid var(--border)", boxShadow: "var(--shadow)" }}
            >
              {/* Difficulty badge */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: diffBg, color: diffColor, border: `1px solid ${diffColor}40` }}
                >
                  {diff}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text3)" }}>Day {dayNumber} · {dayDetails?.title}</span>
              </div>

              {/* Question */}
              <h2 className="text-base font-bold leading-relaxed mb-6" style={{ fontFamily: "var(--font-syne)" }}>
                Q{currentQ + 1}. {q.question}
              </h2>

              {/* Options */}
              <div className="flex flex-col gap-3 mb-6">
                {q.options.map((opt, i) => {
                  const letter = opt.trim().slice(0, 1).toUpperCase();
                  const isSelected = selectedOption === letter;
                  return (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectOption(letter)}
                      className="w-full text-left p-4 rounded-xl border text-sm transition-all cursor-pointer"
                      style={{
                        background: isSelected ? "var(--accent-light)" : "var(--surface2)",
                        borderColor: isSelected ? "var(--accent)" : "var(--border)",
                        color: isSelected ? "var(--accent2)" : "var(--text2)",
                        fontWeight: isSelected ? 600 : 400,
                        boxShadow: isSelected ? "0 0 0 2px var(--accent)30" : "none",
                      }}
                    >
                      <span className="font-bold mr-3" style={{ color: isSelected ? "var(--accent)" : "var(--text3)" }}>{letter}</span>
                      {opt.slice(2).trim()}
                    </motion.button>
                  );
                })}
              </div>

              <button
                onClick={() => handleNextQuestion(false)}
                disabled={!selectedOption || submitting}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer transition-all"
                style={{
                  background: !selectedOption ? "var(--border)" : "var(--accent)",
                  color: !selectedOption ? "var(--text3)" : "white",
                  boxShadow: selectedOption ? "var(--shadow-accent)" : "none",
                  cursor: !selectedOption ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Submitting…" : currentQ < totalQ - 1 ? "Next Question →" : "Submit Quiz ✓"}
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── Result screen ─────────────────────────────────────────────────────────
  if (phase === "result" && result) {
    const pct = result.total_questions > 0 ? (result.correct_answers / result.total_questions) * 100 : 0;
    const grade =
      pct >= 90 ? { label: "Excellent!", emoji: "🏆", color: "#22c55e" } :
      pct >= 70 ? { label: "Good Job!", emoji: "🎯", color: "#3b82f6" } :
      pct >= 50 ? { label: "Keep Going!", emoji: "📚", color: "#f59e0b" } :
      { label: "Needs Review", emoji: "🔁", color: "#ef4444" };

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "transparent" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full rounded-3xl p-8"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", boxShadow: "var(--shadow)" }}
        >
          {/* Score hero */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">{grade.emoji}</div>
            <div className="text-4xl font-extrabold mb-1" style={{ fontFamily: "var(--font-syne)", color: grade.color }}>
              {result.score} <span className="text-lg text-gray-400 font-normal">/ 10</span>
            </div>
            <div className="text-base font-bold mb-1" style={{ fontFamily: "var(--font-syne)" }}>{grade.label}</div>
            <div className="text-sm" style={{ color: "var(--text2)" }}>
              {result.correct_answers} correct out of {result.total_questions} questions
            </div>
          </div>

          {/* Per-difficulty breakdown */}
          {(() => {
            const breakdown = { Easy: { total: 0, correct: 0 }, Medium: { total: 0, correct: 0 }, Hard: { total: 0, correct: 0 } };
            result.answers.forEach((ans, idx) => {
              const diff = ((questions[idx] as any)?.difficulty || "Medium") as keyof typeof breakdown;
              if (breakdown[diff]) {
                breakdown[diff].total++;
                if (ans.selected === ans.correct) breakdown[diff].correct++;
              }
            });
            return (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {(Object.entries(breakdown) as [string, { total: number; correct: number }][]).map(([diff, { total, correct }]) => (
                  <div key={diff} className="rounded-xl p-3 text-center" style={{ background: DIFFICULTY_BG[diff], border: `1px solid ${DIFFICULTY_COLORS[diff]}30` }}>
                    <div className="text-xs font-bold mb-1" style={{ color: DIFFICULTY_COLORS[diff] }}>{diff}</div>
                    <div className="text-lg font-extrabold" style={{ color: DIFFICULTY_COLORS[diff], fontFamily: "var(--font-syne)" }}>
                      {correct}/{total}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Detailed review */}
          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1 mb-6">
            {result.answers.map((ans, idx) => {
              const isCorrect = ans.selected === ans.correct;
              const diff = (questions[idx] as any)?.difficulty || "Medium";
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl text-xs"
                  style={{
                    background: isCorrect ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                    border: `1px solid ${isCorrect ? "#22c55e" : "#ef4444"}30`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-bold leading-snug flex-1">Q{idx + 1}. {ans.question}</div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: DIFFICULTY_BG[diff], color: DIFFICULTY_COLORS[diff] }}>{diff}</span>
                      <span>{isCorrect ? "✅" : "❌"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {ans.options.map((opt, oi) => {
                      const letter = opt.trim().slice(0, 1).toUpperCase();
                      const isSel = ans.selected === letter;
                      const isCorr = ans.correct === letter;
                      return (
                        <div
                          key={oi}
                          className="flex gap-1.5"
                          style={{
                            color: isCorr ? "#22c55e" : isSel && !isCorr ? "#ef4444" : "var(--text3)",
                            fontWeight: isCorr || (isSel && !isCorr) ? 600 : 400,
                          }}
                        >
                          {opt}
                          {isCorr && <span className="text-green-500">✓</span>}
                          {isSel && !isCorr && <span className="text-red-400">✗ (your answer)</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleReturnToDashboard}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer"
            style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}
          >
            ← Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return null;
}
