"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { store } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  saveRoadmap,
  getActiveRoadmap,
  confirmAndCustomizeRoadmap,
  getDayDetails,
  saveDailyProgress,
  getDailyProgress,
  getTestScores,
  getChatHistory,
  sendChatMessage,
} from "@/lib/api";
import {
  StudentProfile,
  CareerSuggestion,
  RoadmapOutlineResponse,
  RoadmapOutlineItem,
  DayRoadmapDetails,
  TestScoreResponse,
  DailyProgressResponse,
  ChatMessage,
} from "@/types";
import { getInitials, getDifficultyClass } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { icon: "⊞", label: "Dashboard", active: true },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  
  // Roadmap states
  const [roadmap, setRoadmap] = useState<any | null>(null);
  const [outline, setOutline] = useState<RoadmapOutlineItem[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [activeDayNum, setActiveDayNum] = useState(1);
  
  // Customization modal states
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [durationWeeks, setDurationWeeks] = useState(4); // default 1 month
  const [experienceLevel, setExperienceLevel] = useState("Beginner");
  const [availableTime, setAvailableTime] = useState("3-4 hours");
  const [learningPace, setLearningPace] = useState("Standard");
  const [outlineGenerating, setOutlineGenerating] = useState(false);
  
  // Day details states
  const [dayDetails, setDayDetails] = useState<DayRoadmapDetails | null>(null);
  const [dayDetailsLoading, setDayDetailsLoading] = useState(false);
  
  // User progress and quiz states
  const [progressLogs, setProgressLogs] = useState<DailyProgressResponse[]>([]);
  const [testScores, setTestScores] = useState<TestScoreResponse[]>([]);
  const [checkedTopics, setCheckedTopics] = useState<string[]>([]);
  const [checkedProblems, setCheckedProblems] = useState<string[]>([]);
  const [dailyNotes, setDailyNotes] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Active quiz result state (loaded from saved test scores)
  const [quizResult, setQuizResult] = useState<TestScoreResponse | null>(null);

  // Chat advisor states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputValue, setChatInputValue] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  // Stable session ID per dashboard visit so chat history stays scoped to this session
  const [chatSessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set to true while loadDayData is populating checkboxes so the auto-save
  // effect doesn't fire for the initial load reset.
  const suppressAutoSaveRef = useRef(false);
  const isDirtyRef = useRef(false);
  const latestStateRef = useRef<{
    day_number: number;
    completed_tasks: string[];
    solved_problems: string[];
    notes: string;
  } | null>(null);

  // Which day number corresponds to today based on roadmap confirmed date
  const [todayDayNum, setTodayDayNum] = useState<number | null>(null);

  // Navigation loading states so buttons show feedback before page transition
  const [navLoading, setNavLoading] = useState(false);
  const [quizNavLoading, setQuizNavLoading] = useState(false);
  // Tracks which sidebar day tab is currently loading so it shows a spinner immediately on click
  const [loadingDayNum, setLoadingDayNum] = useState<number | null>(null);

  const activeDayNumRef = useRef(activeDayNum);
  useEffect(() => {
    activeDayNumRef.current = activeDayNum;
  }, [activeDayNum]);

  // Initialize page, auth check, active roadmap check
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/landing");
      return;
    }

    if (user) {
      loadActiveRoadmap();
    }
  }, [authLoading, user, router]);

  // Load chat advisor history on open
  useEffect(() => {
    if (chatOpen && user) {
      getChatHistory(chatSessionId)
        .then((history) => {
          if (history && history.length > 0) {
            setChatMessages(history);
          } else {
            // No history yet for this session — show welcome message
            setChatMessages([
              {
                role: "assistant",
                content: `Hi ${user?.name || "there"}! I'm your VazhiAI Learning Advisor. Ask me anything about your current roadmap, debugging, coding concepts or any other concepts related to roadmap.`,
              },
            ]);
          }
        })
        .catch(() => {
          // On fetch failure, still show the welcome message so the panel isn't blank
          setChatMessages([
            {
              role: "assistant",
              content: `Hi ${user?.name || "there"}! I'm your VazhiAI Learning Advisor. Ask me anything about your current roadmap, debugging, coding concepts or any other concepts related to roadmap.`,
            },
          ]);
        });
    }
  }, [chatOpen, user]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Auto-save topics, problems, and notes whenever they change (debounced 1000ms).
  // suppressAutoSaveRef prevents firing during the initial loadDayData reset.
  useEffect(() => {
    if (suppressAutoSaveRef.current) return;
    if (!isConfirmed || !roadmap || !user) return;

    isDirtyRef.current = true;
    latestStateRef.current = {
      day_number: activeDayNum,
      completed_tasks: checkedTopics,
      solved_problems: checkedProblems,
      notes: dailyNotes,
    };

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const log = await saveDailyProgress({
          date: today,
          day_number: activeDayNum,
          completed_tasks: checkedTopics,
          solved_problems: checkedProblems,
          notes: dailyNotes,
        });
        setProgressLogs((prev) => {
          const filtered = prev.filter((p) => p.day_number !== activeDayNum);
          return [...filtered, log];
        });
        isDirtyRef.current = false;
      } catch (err) {
        console.error("Auto-save failed", err);
      }
    }, 1000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [checkedTopics, checkedProblems, dailyNotes]);

  // Flush pending save immediately on day change or when component unmounts
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && latestStateRef.current && user && isConfirmed) {
        const { day_number, completed_tasks, solved_problems, notes } = latestStateRef.current;
        const today = new Date().toISOString().split("T")[0];
        
        saveDailyProgress({
          date: today,
          day_number,
          completed_tasks,
          solved_problems,
          notes,
        }).catch((err) => {
          console.error("Failed to flush progress save on day change/unmount:", err);
        });
        
        isDirtyRef.current = false;
      }
    };
  }, [activeDayNum, user, isConfirmed]);

  // Load day details, progress and tests when active day changes
  useEffect(() => {
    if (isConfirmed && roadmap) {
      // Persist the current day so it survives refresh and re-login
      localStorage.setItem(`VazhiAI_active_day_${roadmap.id}`, String(activeDayNum));
      loadDayData(activeDayNum);
    }
  }, [activeDayNum, isConfirmed, roadmap]);

  const pollRoadmapOutline = async (roadmapId: string) => {
    const interval = setInterval(async () => {
      try {
        const active = await getActiveRoadmap();
        if (active && active.id === roadmapId) {
          if (active.generation_status === "completed") {
            clearInterval(interval);
            
            // Fetch overall progress logs and test scores
            const [logs, scores] = await Promise.all([getDailyProgress(), getTestScores()]);
            
            // Compute today's day number
            let computedDay: number | null = null;
            if (active.created_at) {
              const start = new Date(active.created_at);
              start.setHours(0, 0, 0, 0);
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
              computedDay = Math.max(1, Math.min(diffDays + 1, active.outline?.length || 1));
            }
            
            setProgressLogs(logs);
            setTestScores(scores);
            if (computedDay !== null) setTodayDayNum(computedDay);
            setOutline(active.outline || []);
            setIsConfirmed(active.is_confirmed);
            setRoadmap(active);
            setActiveDayNum(1);
            setOutlineGenerating(false);
            setShowCustomizeModal(false);
          } else if (active.generation_status === "failed") {
            clearInterval(interval);
            setOutlineGenerating(false);
            alert("Failed to generate career outline: " + (active.generation_error || "Please try again."));
          }
        } else {
          clearInterval(interval);
          setOutlineGenerating(false);
        }
      } catch (err) {
        console.error("Error polling roadmap outline", err);
      }
    }, 2000);
  };

  const loadActiveRoadmap = async () => {
    try {
      const active = await getActiveRoadmap();
      if (active) {
        if (active.generation_status === "processing") {
          setRoadmap(active);
          setOutlineGenerating(true);
          setIsConfirmed(false);
          setShowCustomizeModal(true); // Open modal to show spinner
          pollRoadmapOutline(active.id);
          return;
        }

        let logs: DailyProgressResponse[] = [];
        let scores: TestScoreResponse[] = [];
        let computedDay: number | null = null;
        let startDayNum = 1;

        if (active.is_confirmed && active.outline?.length > 0) {
          // Fetch overall progress logs and test scores first
          [logs, scores] = await Promise.all([getDailyProgress(), getTestScores()]);

          // Compute today's day number from roadmap creation date
          if (active.created_at) {
            const start = new Date(active.created_at);
            start.setHours(0, 0, 0, 0);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            const computedDayVal = Math.max(1, Math.min(diffDays + 1, active.outline.length));
            computedDay = computedDayVal;
          }

          // Restore the last active day from localStorage (persists across refresh + relogin).
          const savedDay = localStorage.getItem(`VazhiAI_active_day_${active.id}`);
          if (savedDay) {
            startDayNum = parseInt(savedDay, 10);
          } else if (logs.length > 0) {
            startDayNum = logs.reduce(
              (max, log) => (log.day_number && log.day_number > max ? log.day_number : max),
              1
            );
          }
        }

        // Set all states in a single batch to avoid async race conditions
        setProgressLogs(logs);
        setTestScores(scores);
        if (computedDay !== null) setTodayDayNum(computedDay);
        setOutline(active.outline || []);
        setIsConfirmed(active.is_confirmed);
        setRoadmap(active);
        if (active.is_confirmed) {
          setActiveDayNum(startDayNum);
        }
      } else {
        // If no active roadmap, send new users to pick a career path
        router.replace("/get-started");
      }
    } catch (err) {
      console.error("Failed to load active roadmap", err);
      router.replace("/get-started");
    }
  };

  const loadDayData = async (dayNum: number) => {
    // Suppress auto-save while we're resetting checkbox state from backend data
    suppressAutoSaveRef.current = true;
    setDayDetailsLoading(true);
    setDayDetails(null);
    setQuizResult(null);
    setCheckedTopics([]);
    setCheckedProblems([]);
    setDailyNotes("");

    // Flag: if the day is still being LLM-generated, we keep the loading
    // spinner running across retries instead of hiding it between polls.
    let stillPolling = false;

    try {
      // 1. Get Day Details from progressive generation API
      const details = await getDayDetails(dayNum);

      if (activeDayNumRef.current !== dayNum) {
        return;
      }

      // If server responded that it is still generating, keep spinner up and retry
      if (details && (details as any).status === "processing") {
        stillPolling = true;
        setTimeout(() => {
          if (activeDayNumRef.current === dayNum) {
            // Call internal poll helper directly so we don't reset state again
            pollDayData(dayNum);
          }
        }, 2000);
        return;
      }

      setDayDetails(details);

      // 2. Set checkbox states from saved progress logs
      const dayLog = progressLogs.find((log) => log.day_number === dayNum);
      if (dayLog) {
        setCheckedTopics(dayLog.completed_tasks || []);
        setCheckedProblems(dayLog.solved_problems || []);
        setDailyNotes(dayLog.notes || "");
      }

      // 3. Set quiz result from saved test scores
      const dayScore = testScores.find((score) => score.day_number === dayNum);
      if (dayScore) {
        setQuizResult(dayScore);
      }
    } catch (err) {
      console.error("Failed to load day details", err);
    } finally {
      // Only dismiss the spinner when we have real data (not while still polling LLM)
      if (!stillPolling && activeDayNumRef.current === dayNum) {
        setDayDetailsLoading(false);
        setLoadingDayNum(null);
        // Re-enable auto-save after a tick so setState has settled
        setTimeout(() => { suppressAutoSaveRef.current = false; }, 150);
      }
    }
  };

  // Lightweight poll — only fetches and updates, never resets state.
  // Called every 2s while the backend LLM is still generating a day.
  const pollDayData = async (dayNum: number) => {
    if (activeDayNumRef.current !== dayNum) return;

    let stillPolling = false;
    try {
      const details = await getDayDetails(dayNum);

      if (activeDayNumRef.current !== dayNum) return;

      if (details && (details as any).status === "processing") {
        stillPolling = true;
        setTimeout(() => {
          if (activeDayNumRef.current === dayNum) pollDayData(dayNum);
        }, 2000);
        return;
      }

      setDayDetails(details);

      const dayLog = progressLogs.find((log) => log.day_number === dayNum);
      if (dayLog) {
        setCheckedTopics(dayLog.completed_tasks || []);
        setCheckedProblems(dayLog.solved_problems || []);
        setDailyNotes(dayLog.notes || "");
      }

      const dayScore = testScores.find((score) => score.day_number === dayNum);
      if (dayScore) setQuizResult(dayScore);
    } catch (err) {
      console.error("Failed to poll day details", err);
    } finally {
      if (!stillPolling && activeDayNumRef.current === dayNum) {
        setDayDetailsLoading(false);
        setLoadingDayNum(null);
        setTimeout(() => { suppressAutoSaveRef.current = false; }, 150);
      }
    }
  };

  const handleConfirmCustomization = async () => {
    setOutlineGenerating(true);
    try {
      const res = await confirmAndCustomizeRoadmap({
        duration_weeks: durationWeeks,
        experience_level: experienceLevel,
        available_time: availableTime,
        learning_pace: learningPace,
      });
      
      // Start polling status
      pollRoadmapOutline((res as any).roadmap_id);
    } catch (err) {
      alert("Failed to start customize outline generation. Please try again.");
      setOutlineGenerating(false);
    }
  };

  const handleToggleTopic = (topic: string) => {
    setCheckedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleToggleProblem = (problem: string) => {
    setCheckedProblems((prev) =>
      prev.includes(problem) ? prev.filter((p) => p !== problem) : [...prev, problem]
    );
  };

  const handleSaveProgress = async () => {
    setSavingProgress(true);
    setSaveSuccess(false);
    try {
      const today = new Date().toISOString().split("T")[0];
      const log = await saveDailyProgress({
        date: today,
        day_number: activeDayNum,
        completed_tasks: checkedTopics,
        solved_problems: checkedProblems,
        notes: dailyNotes,
      });
      
      // Update local logs list
      setProgressLogs((prev) => {
        const filtered = prev.filter((p) => p.day_number !== activeDayNum);
        return [...filtered, log];
      });
      isDirtyRef.current = false;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save progress. Please try again.");
    } finally {
      setSavingProgress(false);
    }
  };

  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInputValue.trim() || chatLoading) return;
    
    const userText = chatInputValue;
    setChatInputValue("");
    
    const userMsg: ChatMessage = { role: "user", content: userText };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
    
    try {
      const res = await sendChatMessage(userText, chatSessionId, activeDayNum);
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: res.content,
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I had an error processing that message. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper: check completion status of a specific day.
  // Completion criteria:
  //   - ALL study topics must be checked (completed_tasks.length === total topics for that day)
  //   - Quiz must be taken
  // Resources/links do NOT need to be clicked for completion.
  const getDayStatus = (dayNum: number) => {
    const dayLog = progressLogs.find((log) => log.day_number === dayNum);
    const dayScore = testScores.find((score) => score.day_number === dayNum);

    if (!dayLog && !dayScore) return "unstarted";
    if (!dayLog) return "in-progress";

    const completedTasksCount = dayLog.completed_tasks?.length || 0;
    const quizDone = !!dayScore;

    // Get total topics from cached detailed_days (populated as user visits each day)
    const storedDayDetails = roadmap?.detailed_days?.[String(dayNum)];
    const totalTopics = storedDayDetails?.topics?.length ?? 0;

    // All topics done = every topic checked (or no topics recorded yet → treat as incomplete)
    const allTopicsDone = totalTopics > 0 && completedTasksCount >= totalTopics;

    if (allTopicsDone && quizDone) return "completed";
    if (completedTasksCount > 0 || quizDone) return "in-progress";
    return "unstarted";
  };

  // Calculate overall progress percentage:
  // e.g. % of total outline days that are "completed"
  const calculateOverallProgress = () => {
    if (outline.length === 0) return 0;
    let completedCount = 0;
    outline.forEach((item) => {
      if (getDayStatus(item.day) === "completed") {
        completedCount++;
      }
    });
    return Math.round((completedCount / outline.length) * 100);
  };

  function handleLogout() {
    logout();
    store.clear();
    router.push("/auth/login");
  }

  if (authLoading || !roadmap) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2, borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  const initials = getInitials(user?.name || "Student");
  const firstName = (user?.name || "Student").split(" ")[0];
  const overallProgress = calculateOverallProgress();
  const totalDays = outline.length;
  const testsTaken = testScores.length;
  const averageScore = testsTaken > 0
    ? (testScores.reduce((acc, curr) => acc + curr.score, 0) / testsTaken).toFixed(1)
    : "—";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className="flex flex-col sticky top-0 h-screen overflow-y-auto"
        style={{ width: 240, minWidth: 240, background: "var(--surface)", borderRight: "0.5px solid var(--border)" }}
      >
        <div className="px-5 py-6 mb-2" style={{ borderBottom: "0.5px solid var(--border)" }}>
          <div className="text-lg font-extrabold mb-2" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
            Path<span style={{ color: "var(--accent)" }}>AI</span>
          </div>
          <button
            onClick={() => { setNavLoading(true); router.push("/home"); }}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: "var(--text3)", background: "transparent", border: "none", cursor: navLoading ? "not-allowed" : "pointer", fontFamily: "var(--font-syne)", padding: 0 }}
            disabled={navLoading}
          >
            {navLoading ? (
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  border: "2px solid var(--border2)",
                  borderTopColor: "var(--accent)",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
            ) : "←"} Home Page
          </button>
        </div>

        {isConfirmed && (
          <div className="px-5 py-4 mb-4">
            <div className="rounded-xl p-4 flex flex-col items-center justify-center text-center" style={{ background: "var(--surface2)", border: "0.5px solid var(--border)" }}>
              <div className="relative flex items-center justify-center mb-2" style={{ width: 68, height: 68 }}>
                {/* Circular Progress Indicator */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="34" cy="34" r="30" fill="transparent" stroke="var(--border)" strokeWidth="3" />
                  <circle
                    cx="34"
                    cy="34"
                    r="30"
                    fill="transparent"
                    stroke="var(--accent)"
                    strokeWidth="3.5"
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 * (1 - overallProgress / 100)}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.6s ease" }}
                  />
                </svg>
                <div className="absolute text-base font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
                  {overallProgress}%
                </div>
              </div>
              <span className="text-xs font-bold tracking-wider uppercase mb-1" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>Roadmap Progress</span>
              <span className="text-[10px]" style={{ color: "var(--text3)" }}>{progressLogs.filter(p => getDayStatus(p.day_number!) === "completed").length} of {totalDays} days done</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2">
          {isConfirmed ? (
            <>
              <div className="px-4 py-2 text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>
                Study Days
              </div>
              <div className="flex flex-col gap-0.5">
                {(() => {
                  const DIFF_COLORS: Record<string,string> = { Beginner: "#22c55e", Intermediate: "#f59e0b", Advanced: "#ef4444" };
                  let lastModule = "";
                  return outline.map((item) => {
                    const status = getDayStatus(item.day);
                    const isActive = activeDayNum === item.day;
                    const showModuleHeader = item.module && item.module !== lastModule;
                    if (item.module) lastModule = item.module;
                    const diffColor = DIFF_COLORS[item.difficulty || ""] || "var(--text3)";
                    return (
                      <div key={item.day}>
                        {showModuleHeader && (
                          <div className="px-3 pt-3 pb-1 text-[9px] font-extrabold tracking-widest uppercase" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>
                            {item.module}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            if (activeDayNumRef.current === item.day) return;
                            setLoadingDayNum(item.day);
                            setActiveDayNum(item.day);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border-none outline-none cursor-pointer"
                          style={{
                            background: isActive ? "var(--accent-light)" : "transparent",
                            color: isActive ? "var(--accent2)" : "var(--text2)",
                            fontWeight: isActive ? 600 : 400,
                            borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                          }}
                        >
                          {/* Spinner while loading, normal status dot otherwise */}
                          {loadingDayNum === item.day ? (
                            <span
                              style={{
                                display: "inline-block",
                                width: 12,
                                height: 12,
                                border: "2px solid var(--border2)",
                                borderTopColor: "var(--accent)",
                                borderRadius: "50%",
                                animation: "spin 0.7s linear infinite",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                background:
                                  status === "completed" ? "var(--teal)"
                                  : status === "in-progress" ? "var(--gold)"
                                  : "var(--text3)",
                                boxShadow:
                                  status === "completed" ? "0 0 4px rgba(42,122,110,0.5)"
                                  : status === "in-progress" ? "0 0 4px rgba(184,134,11,0.5)"
                                  : "none",
                              }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold font-syne">Day {item.day}</span>
                              {item.difficulty && (
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${diffColor}18`, color: diffColor }}>
                                  {item.difficulty.slice(0, 3).toUpperCase()}
                                </span>
                              )}
                              {/* Today badge — highlights the current study day based on enrollment date */}
                              {todayDayNum === item.day && (
                                <span
                                  className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full"
                                  style={{
                                    background: "var(--accent-light)",
                                    color: "var(--accent)",
                                    border: "0.5px solid var(--accent-glow)",
                                    letterSpacing: "0.04em",
                                  }}
                                >
                                  TODAY
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] truncate" style={{ color: isActive ? "var(--accent)" : "var(--text3)" }}>{item.title}</div>
                          </div>
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          ) : (
            <div className="p-4 text-xs text-center" style={{ color: "var(--text3)" }}>
              Confirm your path to start customized dynamic outline generation.
            </div>
          )}
        </div>

        <div className="mt-auto px-5 py-4" style={{ borderTop: "0.5px solid var(--border)" }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="flex items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
              style={{ width: 32, height: 32, background: "var(--accent)", fontFamily: "var(--font-syne)" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{user?.name}</div>
              <div className="text-xs truncate" style={{ color: "var(--text3)" }}>{user?.email}</div>
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
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-8 py-4 fixed top-0 z-10"
          style={{ left: 240, right: 0, borderBottom: "1px solid var(--border)", background: "var(--header-bg)", backdropFilter: "blur(16px)" }}
        >
          <div>
            <div className="text-xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
              Welcome back, <span style={{ color: "var(--accent)" }}>{firstName}</span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
              Selected Goal: <strong style={{ color: "var(--text)" }}>{roadmap.title}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isConfirmed ? (
              <button
                onClick={() => { setNavLoading(true); router.push("/home"); }}
                disabled={navLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer bg-transparent"
                style={{ borderColor: "var(--border2)", color: "var(--text2)", fontFamily: "var(--font-syne)", opacity: navLoading ? 0.7 : 1 }}
              >
                {navLoading ? (
                  <span
                    style={{
                      display: "inline-block",
                      width: 11,
                      height: 11,
                      border: "2px solid var(--border2)",
                      borderTopColor: "var(--accent)",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                ) : "←"} Home Page
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-transparent"
                  style={{ border: "1px solid var(--border2)", color: "var(--text2)", fontFamily: "var(--font-syne)", cursor: "pointer" }}
                >
                  ← Back to Paths
                </button>
                <button
                  onClick={() => setShowCustomizeModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-white"
                  style={{ background: "var(--accent)", fontFamily: "var(--font-syne)", cursor: "pointer", border: "none", boxShadow: "var(--shadow-accent)" }}
                >
                  Confirm & Customize Path ✓
                </button>
              </div>
            )}
          </div>
        </header>

        {isConfirmed ? (
          <div className="p-8 flex-1 flex flex-col gap-6 with-fixed-header-sidebar">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                <span className="text-[10px] font-bold tracking-widest uppercase mb-1 block" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Duration</span>
                <span className="text-xl font-extrabold" style={{ fontFamily: "var(--font-syne)" }}>{roadmap.duration_weeks ? `${roadmap.duration_weeks} Weeks` : "—"}</span>
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                <span className="text-[10px] font-bold tracking-widest uppercase mb-1 block" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Level / Pace</span>
                <span className="text-sm font-extrabold capitalize truncate block" style={{ fontFamily: "var(--font-syne)", color: "var(--teal)" }}>{roadmap.experience_level} / {roadmap.learning_pace}</span>
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                <span className="text-[10px] font-bold tracking-widest uppercase mb-1 block" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Daily Time</span>
                <span className="text-xl font-extrabold" style={{ fontFamily: "var(--font-syne)" }}>{roadmap.available_time || "—"}</span>
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                <span className="text-[10px] font-bold tracking-widest uppercase mb-1 block" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Tests Avg</span>
                <span className="text-xl font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--accent)" }}>{averageScore} <span className="text-[10px] text-gray-500 font-normal">/10 ({testsTaken} taken)</span></span>
              </div>
            </div>

            {/* Main console content */}
            <div className="flex-1">
              {dayDetailsLoading ? (
                <div className="h-96 flex flex-col items-center justify-center gap-4 rounded-2xl" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                  <div className="spinner" style={{ width: 36, height: 36 }} />
                  <div className="text-sm font-bold font-syne" style={{ color: "var(--text2)" }}>AI is loading Day {activeDayNum} study details...</div>
                  <div className="text-xs max-w-sm text-center" style={{ color: "var(--text3)" }}>Structuring topics, coding practice questions, quiz questions, and verified tutorials.</div>
                </div>
              ) : dayDetails ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 26 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  {/* Left columns (topics, resources, practice, assignment) */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Day description */}
                    <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "var(--accent-light)", color: "var(--accent)", border: "0.5px solid var(--accent-glow)", fontFamily: "var(--font-syne)" }}>
                          Day {activeDayNum} Learning Module
                        </span>
                        <span className="text-xs font-semibold" style={{ color: "var(--text3)" }}>
                          Suggested: {dayDetails.duration || roadmap.available_time}
                        </span>
                      </div>
                      <h2 className="text-2xl font-extrabold mb-2" style={{ color: "var(--text)" }}>{dayDetails.title}</h2>
                      <p className="text-xs" style={{ color: "var(--text2)" }}>
                        Focus Area: {outline.find(item => item.day === activeDayNum)?.focus}
                      </p>
                    </div>

                    {/* Topics checklist */}
                    <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                      <h3 className="text-base font-extrabold mb-4" style={{ fontFamily: "var(--font-syne)" }}>Study Topics & Syllabus</h3>
                      <div className="flex flex-col gap-3">
                        {dayDetails.topics?.map((topic, idx) => {
                          const isChecked = checkedTopics.includes(topic);
                          return (
                            <div
                              key={idx}
                              onClick={() => handleToggleTopic(topic)}
                              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                              style={{
                                background: isChecked ? "rgba(42,122,110,0.05)" : "var(--surface2)",
                                border: isChecked ? "0.5px solid rgba(42,122,110,0.3)" : "0.5px solid var(--border)"
                              }}
                            >
                              <motion.div
                                className="w-5 h-5 rounded flex items-center justify-center shrink-0 border"
                                style={{
                                  background: isChecked ? "var(--teal)" : "var(--surface)",
                                  borderColor: isChecked ? "var(--teal)" : "var(--border2)",
                                }}
                                animate={{ scale: isChecked ? [1, 1.2, 1] : 1 }}
                                transition={{ duration: 0.25 }}
                              >
                                <AnimatePresence>
                                  {isChecked && (
                                    <motion.svg
                                      width="11" height="9" viewBox="0 0 11 9" fill="none"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                    >
                                      <motion.path
                                        d="M1 4.5L3.8 7.5L10 1"
                                        stroke="#ffffff" strokeWidth="1.8"
                                        strokeLinecap="round" strokeLinejoin="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                      />
                                    </motion.svg>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                              <span className="text-xs font-medium" style={{ color: isChecked ? "var(--teal)" : "var(--text)", textDecoration: isChecked ? "line-through" : "none" }}>{topic}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Resources Grid */}
                    <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                      <h3 className="text-base font-extrabold mb-4" style={{ fontFamily: "var(--font-syne)" }}>Recommended Handpicked Resources</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dayDetails.resources?.map((res, idx) => (
                          <a
                            key={idx}
                            href={res.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 rounded-xl flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer"
                            style={{
                              background: "var(--surface2)",
                              border: "0.5px solid var(--border)",
                              textDecoration: "none",
                              color: "inherit"
                            }}
                          >
                            <div>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider block mb-2 w-max"
                                style={{
                                  background:
                                    res.type === "youtube" ? "rgba(220,53,69,0.1)" :
                                    res.type === "documentation" ? "rgba(34,197,94,0.1)" :
                                    res.type === "practice" ? "rgba(168,85,247,0.1)" :
                                    "rgba(0,123,255,0.1)",
                                  color:
                                    res.type === "youtube" ? "#dc3545" :
                                    res.type === "documentation" ? "#16a34a" :
                                    res.type === "practice" ? "#a855f7" :
                                    "#007bff"
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

                    {/* Practice Arena */}
                    <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                      <h3 className="text-base font-extrabold mb-4" style={{ fontFamily: "var(--font-syne)" }}>Targeted Practice Questions</h3>
                      <div className="flex flex-col gap-3">
                        {dayDetails.practice?.map((prob, idx) => {
                          const isChecked = checkedProblems.includes(prob.problem);
                          return (
                            <div
                              key={idx}
                              className="p-4 rounded-xl flex items-center justify-between gap-4"
                              style={{
                                background: isChecked ? "rgba(42,122,110,0.03)" : "var(--surface2)",
                                border: isChecked ? "0.5px solid rgba(42,122,110,0.2)" : "0.5px solid var(--border)"
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleToggleProblem(prob.problem)}
                                  className="w-5 h-5 rounded flex items-center justify-center shrink-0 border cursor-pointer"
                                  style={{
                                    background: isChecked ? "var(--teal)" : "var(--surface)",
                                    borderColor: isChecked ? "var(--teal)" : "var(--border2)",
                                    color: "#ffffff"
                                  }}
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

                    {/* Coding assignment */}
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
                  </div>

                  {/* Right column (Quiz card + notes) */}
                  <div className="flex flex-col gap-6">
                    {/* ── Daily Assessment Quiz Card ── */}
                    <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                      <h3 className="text-base font-extrabold mb-1" style={{ fontFamily: "var(--font-syne)" }}>Daily Assessment Quiz</h3>
                      <p className="text-[10px] mb-4" style={{ color: "var(--text3)" }}>10 questions · Easy / Medium / Hard · 30 sec per question</p>

                      {quizResult ? (
                        /* ── Already completed: show compact result ── */
                        <div className="flex flex-col gap-4">
                          {/* Score pill */}
                          <div className="p-4 rounded-xl text-center" style={{ background: "var(--surface2)", border: "0.5px solid var(--border)" }}>
                            <div className="text-3xl font-extrabold mb-0.5" style={{ fontFamily: "var(--font-syne)", color: quizResult.score >= 7 ? "var(--teal)" : quizResult.score >= 5 ? "#f59e0b" : "var(--accent)" }}>
                              {quizResult.score} <span className="text-sm font-normal" style={{ color: "var(--text3)" }}>/ 10</span>
                            </div>
                            <div className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
                              {quizResult.correct_answers} of {quizResult.total_questions} correct
                            </div>
                          </div>

                          {/* Per-difficulty mini breakdown */}
                          {(() => {
                            const qList = dayDetails.mcqTest || [];
                            const bk = { Easy: { t: 0, c: 0 }, Medium: { t: 0, c: 0 }, Hard: { t: 0, c: 0 } } as Record<string,{t:number,c:number}>;
                            quizResult.answers.forEach((ans, i) => {
                              const d = (qList[i] as any)?.difficulty || "Medium";
                              if (bk[d]) { bk[d].t++; if (ans.selected === ans.correct) bk[d].c++; }
                            });
                            const colors: Record<string,string> = { Easy: "#22c55e", Medium: "#f59e0b", Hard: "#ef4444" };
                            return (
                              <div className="grid grid-cols-3 gap-2">
                                {Object.entries(bk).map(([d, { t, c }]) => (
                                  <div key={d} className="rounded-lg p-2 text-center" style={{ background: `${colors[d]}12`, border: `1px solid ${colors[d]}30` }}>
                                    <div className="text-xs font-bold" style={{ color: colors[d] }}>{c}/{t}</div>
                                    <div className="text-[9px] font-semibold mt-0.5" style={{ color: colors[d] }}>{d}</div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}

                          {/* Retake button */}
                          <button
                            onClick={() => {
                              if (quizNavLoading) return;
                              setQuizNavLoading(true);
                              router.push(`/quiz/${activeDayNum}`);
                            }}
                            disabled={quizNavLoading}
                            className="w-full py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center justify-center gap-2"
                            style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text2)" }}
                          >
                            {quizNavLoading ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  width: 11,
                                  height: 11,
                                  border: "2px solid var(--border2)",
                                  borderTopColor: "var(--accent)",
                                  borderRadius: "50%",
                                  animation: "spin 0.7s linear infinite",
                                }}
                              />
                            ) : "🔁"} {quizNavLoading ? "Loading…" : "Retake Quiz"}
                          </button>
                        </div>
                      ) : (
                        /* ── Not yet taken: Start Quiz CTA ── */
                        <div className="flex flex-col gap-4">
                          {/* Question count badges */}
                          <div className="grid grid-cols-3 gap-2">
                            {[["Easy","#22c55e","3 Qs"],["Medium","#f59e0b","4 Qs"],["Hard","#ef4444","3 Qs"]].map(([label,color,count]) => (
                              <div key={label} className="rounded-lg p-2 text-center" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
                                <div className="text-xs font-bold" style={{ color }}>{count}</div>
                                <div className="text-[9px] font-semibold mt-0.5" style={{ color }}>{label}</div>
                              </div>
                            ))}
                          </div>

                          {/* Description */}
                          <div className="p-3 rounded-xl text-xs leading-relaxed" style={{ background: "var(--surface2)", color: "var(--text2)", border: "0.5px solid var(--border)" }}>
                            Test your understanding of today's concepts with a timed quiz. Each question has a 30-second countdown. Results are saved to your progress.
                          </div>

                          {/* CTA */}
                          <button
                            onClick={() => {
                              if (quizNavLoading) return;
                              setQuizNavLoading(true);
                              router.push(`/quiz/${activeDayNum}`);
                            }}
                            disabled={quizNavLoading}
                            className="w-full py-3.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer transition-all flex items-center justify-center gap-2"
                            style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)", opacity: quizNavLoading ? 0.8 : 1 }}
                          >
                            {quizNavLoading ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  width: 14,
                                  height: 14,
                                  border: "2.5px solid rgba(255,255,255,0.35)",
                                  borderTopColor: "#fff",
                                  borderRadius: "50%",
                                  animation: "spin 0.7s linear infinite",
                                }}
                              />
                            ) : "📝"} {quizNavLoading ? "Loading Quiz…" : "Start Quiz"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Notes Section */}
                    <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                      <h3 className="text-base font-extrabold mb-1" style={{ fontFamily: "var(--font-syne)" }}>Study Notes & Log</h3>
                      <p className="text-[10px] mb-3" style={{ color: "var(--text3)" }}>Write summaries, checklist code blocks, or personal review notes. Topics &amp; problems are auto-saved when checked.</p>
                      
                      <textarea
                        className="field-textarea text-xs w-full mb-3"
                        rows={8}
                        value={dailyNotes}
                        onChange={(e) => setDailyNotes(e.target.value)}
                        placeholder="E.g. prefix sum algorithms are super fast because O(1) query time after O(N) setup..."
                      />
                      
                      <button
                        onClick={handleSaveProgress}
                        disabled={savingProgress}
                        className="w-full py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer transition-all border-none"
                        style={{
                          background: saveSuccess ? "var(--teal)" : "var(--text)",
                          boxShadow: saveSuccess ? "0 2px 8px rgba(42,122,110,0.3)" : "none"
                        }}
                      >
                        {savingProgress ? "Saving..." : saveSuccess ? "✓ Notes & Progress Saved" : "Save Notes & Tasks"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center gap-2 rounded-2xl" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                  <span className="text-sm font-semibold font-syne">Outline confirmed!</span>
                  <span className="text-xs text-gray-500">Select Day 1 from the sidebar to generate its study guide.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <motion.div
              className="max-w-xl text-center rounded-[20px] p-8"
              style={{ background: "var(--surface)", border: "0.5px solid var(--border)", boxShadow: "var(--shadow)" }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <span className="text-4xl block mb-4">✦</span>
              <h2 className="text-2xl font-extrabold mb-3" style={{ fontFamily: "var(--font-syne)" }}>Confirm & Customize Your Career Path</h2>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--text2)" }}>
                You have chosen the path: <strong style={{ color: "var(--accent)" }}>{roadmap.title}</strong>. 
                Before we generate your customized day-by-day learning schedule, customize your time commitments, preparation duration, and experience level.
              </p>
              <button
                onClick={() => setShowCustomizeModal(true)}
                className="px-6 py-3.5 rounded-2xl text-white font-bold text-sm cursor-pointer border-none"
                style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}
              >
                Customize & Confirm Path
              </button>
            </motion.div>
          </div>
        )}
      </div>

      {/* Floating AI Advisor Chat Widget */}
      {isConfirmed && (
        <div className="chat-widget">
          <AnimatePresence>
            {chatOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="chat-panel"
                style={{ height: 500 }}
              >
                <div className="chat-header">
                  <div className="chat-header-title">
                    <span style={{ color: "var(--accent)" }}>✦</span> AI Advisor — Day {activeDayNum}
                  </div>
                  <button className="chat-close-btn" onClick={() => setChatOpen(false)}>×</button>
                </div>

                <div className="chat-body">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`message-bubble ${
                        msg.role === "user" ? "message-user" : "message-assistant"
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="chat-bubble-loading">
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form className="chat-input-area" onSubmit={handleSendChat}>
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="Ask about daily topics or assignments..."
                    value={chatInputValue}
                    onChange={(e) => setChatInputValue(e.target.value)}
                    disabled={chatLoading}
                  />
                  <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={chatLoading || !chatInputValue.trim()}
                  >
                    Send
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {!chatOpen && (
            <motion.button
              onClick={() => setChatOpen(true)}
              className="chat-toggle-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              AI Learning Advisor
            </motion.button>
          )}
        </div>
      )}

      {/* Customization Modal */}
      <AnimatePresence>
        {showCustomizeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(26,22,18,0.5)", backdropFilter: "blur(4px)" }}>
            <motion.div
              className="w-full max-w-lg rounded-[20px] overflow-hidden"
              style={{ background: "var(--surface)", border: "0.5px solid var(--border)", boxShadow: "var(--shadow2)" }}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
            >
              {outlineGenerating ? (
                <div className="p-8 text-center flex flex-col items-center justify-center min-h-[360px] gap-4">
                  <div className="spinner" style={{ width: 44, height: 44 }} />
                  <h3 className="text-lg font-extrabold font-syne">Structuring Daily Learning Outline...</h3>
                  <p className="text-xs text-gray-500 max-w-sm">Generating your customized day-by-day sequence. Our AI is splitting content dynamically to avoid cognitive overload.</p>
                </div>
              ) : (
                <div className="p-8">
                  <h3 className="text-xl font-extrabold mb-1" style={{ fontFamily: "var(--font-syne)" }}>Customize Learning Path</h3>
                  <p className="text-xs mb-6" style={{ color: "var(--text2)" }}>We'll generate an outline tailored to your study preferences.</p>

                  <div className="flex flex-col gap-5">
                    {/* Duration Weeks */}
                    <div>
                      <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>Preparation Duration</label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { label: "1 Wk", val: 1 },
                          { label: "2 Wks", val: 2 },
                          { label: "1 Mo", val: 4 },
                          { label: "2 Mos", val: 8 },
                          { label: "3 Mos", val: 12 },
                        ].map((item) => (
                          <button
                            key={item.val}
                            onClick={() => setDurationWeeks(item.val)}
                            className="py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center"
                            style={{
                              background: durationWeeks === item.val ? "var(--accent)" : "var(--surface2)",
                              borderColor: durationWeeks === item.val ? "var(--accent)" : "var(--border)",
                              color: durationWeeks === item.val ? "#ffffff" : "var(--text2)",
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1.5">
                        Selected: <strong style={{ color: "var(--text)" }}>{durationWeeks * 5} Study Days</strong> (5 learning days per week + weekend break).
                      </p>
                    </div>

                    {/* Experience Level */}
                    <div>
                      <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>Experience Level</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["Beginner", "Intermediate", "Advanced"].map((level) => (
                          <button
                            key={level}
                            onClick={() => setExperienceLevel(level)}
                            className="py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center"
                            style={{
                              background: experienceLevel === level ? "var(--accent)" : "var(--surface2)",
                              borderColor: experienceLevel === level ? "var(--accent)" : "var(--border)",
                              color: experienceLevel === level ? "#ffffff" : "var(--text2)",
                            }}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Study Hours */}
                    <div>
                      <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>Available Daily Study Time</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["1-2 hours", "3-4 hours", "5+ hours"].map((time) => (
                          <button
                            key={time}
                            onClick={() => setAvailableTime(time)}
                            className="py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center"
                            style={{
                              background: availableTime === time ? "var(--accent)" : "var(--surface2)",
                              borderColor: availableTime === time ? "var(--accent)" : "var(--border)",
                              color: availableTime === time ? "#ffffff" : "var(--text2)",
                            }}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Learning Pace */}
                    <div>
                      <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>Learning Pace</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["Slow & Steady", "Standard", "Fast-track"].map((pace) => (
                          <button
                            key={pace}
                            onClick={() => setLearningPace(pace)}
                            className="py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center"
                            style={{
                              background: learningPace === pace ? "var(--accent)" : "var(--surface2)",
                              borderColor: learningPace === pace ? "var(--accent)" : "var(--border)",
                              color: learningPace === pace ? "#ffffff" : "var(--text2)",
                            }}
                          >
                            {pace}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
                    <button
                      onClick={() => setShowCustomizeModal(false)}
                      className="flex-1 py-3 text-xs font-bold rounded-xl border cursor-pointer bg-transparent"
                      style={{ borderColor: "var(--border2)", color: "var(--text2)" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmCustomization}
                      className="flex-1 py-3 text-xs font-bold rounded-xl text-white cursor-pointer border-none"
                      style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}
                    >
                      Generate Outline ✦
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}