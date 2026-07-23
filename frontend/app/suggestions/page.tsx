"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { store } from "@/lib/store";
import { getInitials } from "@/lib/utils";
import { getActiveRoadmap, explorePathsChat, ExplorePathsResponse } from "@/lib/api";
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

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
  intent?: string;
  needsConfirmation?: boolean;
  roadmapUpdated?: boolean;
  timestamp?: Date;
}

// ─── Intent badge config ─────────────────────────────────────────────────────
const INTENT_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  minor_modification:    { label: "Minor Update",        color: "#2a7a6e", bg: "rgba(42,122,110,0.1)" },
  major_restructuring:   { label: "Major Restructure",   color: "var(--accent)", bg: "var(--accent-light)" },
  new_roadmap:           { label: "New Roadmap",         color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
  new_roadmap_confirmed: { label: "Roadmap Created",     color: "#059669", bg: "rgba(5,150,105,0.1)" },
  clarification:         { label: "Need More Info",      color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  general_chat:          { label: "Info",                 color: "#6b7280", bg: "rgba(107,114,128,0.08)" },
};

export default function ExplorePathsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [currentRoadmap, setCurrentRoadmap] = useState<any>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [navLoadingLabel, setNavLoadingLabel] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
     useEffect(() => {
      if (messages.length > 0) {
        sessionStorage.setItem("explore_chat", JSON.stringify(messages));
      }
    }, [messages]);

  
  // Auth check + load roadmap on mount
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login");
      return;
    }
    if (user) {
      loadInitialData();
    }
  }, [authLoading, user]);

  const loadInitialData = async () => {
    setPageLoading(true);
    try {
      const roadmap = await getActiveRoadmap();
      setCurrentRoadmap(roadmap);

      // Welcome message
      const welcomeContent = roadmap
        ? `👋 Hi ${user?.name || "there"}! I'm your Vazhi AI Roadmap Advisor. I can help you:\n\n• **Tweak** your current roadmap — adjust timelines, swap topics, change difficulty\n• **Restructure** major sections of your learning path\n• **Create a completely new** roadmap from scratch\n\n📚 **Your current roadmap:** ${roadmap.title} (${roadmap.duration_weeks || "?"} weeks, ${roadmap.difficulty || "Mixed"} difficulty)\n\nWhat would you like to change?`
        : `👋 Hi ${user?.name || "there"}! I'm your Vazhi AI Roadmap Advisor.\n\nIt looks like you don't have an active roadmap yet. I can help you create one! Tell me about:\n• Your career goals\n• Your current skill level\n• How much time you can dedicate per week\n\nLet's build your learning path together!`;

      // Restore session or set welcome message
      const saved = sessionStorage.getItem("explore_chat");
        if (saved) {
          setMessages(JSON.parse(saved));
        } else {
          setMessages([
            {
              role: "assistant",
              content: welcomeContent,
              intent: "general_chat",
              timestamp: new Date(),
            },
          ]);
        }                        // ← this closing brace was missing
      } catch (err) {
        console.error("Failed to load initial data:", err);
      } finally {
        setPageLoading(false);
      }
    };

  const handleSendMessage = async (overrideMessage?: string, confirmNew: boolean = false) => {
    const msg = overrideMessage || inputValue.trim();
    if (!msg && !confirmNew) return;

    // Add user message to chat (unless it's a confirmation click)
    if (msg) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: msg, timestamp: new Date() },
      ]);
    }
    setInputValue("");
    setLoading(true);

    try {
      // Build history from messages (exclude system/welcome)
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const result: ExplorePathsResponse = await explorePathsChat(
        msg,
        history,
        confirmNew,
      );

      const assistantMsg: ChatMsg = {
        role: "assistant",
        content: result.reply,
        intent: result.intent,
        needsConfirmation: result.needs_confirmation,
        roadmapUpdated: result.roadmap_updated,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Update confirmation state
      setAwaitingConfirmation(result.needs_confirmation);

      // If roadmap was updated, refresh it
      if (result.roadmap_updated) {
        const updated = await getActiveRoadmap();
        setCurrentRoadmap(updated);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error processing your request. Please try again.",
          intent: "general_chat",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleConfirmNewRoadmap = () => {
    setAwaitingConfirmation(false);
    handleSendMessage("Yes, I confirm. Please create a new roadmap for me.", true);
  };

  const handleCancelNewRoadmap = () => {
    setAwaitingConfirmation(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "No problem! Your current roadmap is safe. Feel free to ask me about modifications instead, or anything else!",
        intent: "general_chat",
        timestamp: new Date(),
      },
    ]);
  };

  const handleLogout = () => {
    logout();
    store.clear();
    router.push("/auth/login");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ─── Loading state ─────────────────────────────────────────────────────────
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
            Loading Explore Paths...
          </p>
        </div>
      </div>
    );
  }

  const initials = getInitials(user?.name || "Student");

  return (
    <div className="flex min-h-screen">
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
              const active = false; // none active under Menu on suggestions page
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
              const active = item.label === "Explore Paths";
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

      {/* ── Main Chat Area ── */}
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
              Explore Paths
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
              Chat with AI to modify, restructure, or create a new roadmap
            </p>
          </div>
          <div className="flex items-center gap-3">
            {currentRoadmap && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{
                  background: "var(--teal-light)",
                  color: "var(--teal)",
                  border: "1px solid rgba(52,212,179,0.2)",
                }}
              >
                <span style={{ fontSize: 10 }}>◈</span>
                Active: {currentRoadmap.title}
              </div>
            )}
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

        {/* Chat Messages Area */}
        <div
          className="flex-1 overflow-y-auto px-8 py-6 pt-24"
          style={{ maxHeight: "calc(100vh - 140px)" }}
        >
          <div className="max-w-3xl mx-auto flex flex-col gap-5">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "user" ? (
                    /* ── User bubble ── */
                    <div
                      className="max-w-[75%] rounded-2xl rounded-br-md px-5 py-3.5"
                      style={{
                        background: "var(--accent)",
                        color: "white",
                      }}
                    >
                      <p
                        className="text-sm leading-relaxed whitespace-pre-wrap"
                        style={{ fontFamily: "var(--font-dm)" }}
                      >
                        {msg.content}
                      </p>
                    </div>
                  ) : (
                    /* ── Assistant bubble ── */
                    <div className="max-w-[85%] flex gap-3">
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                        style={{
                          background: "var(--accent-light)",
                          border: "1px solid var(--accent)",
                        }}
                      >
                        <span
                          className="text-xs font-bold"
                          style={{ color: "var(--accent)" }}
                        >
                          AI
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col gap-2">
                        {/* Intent badge */}
                        {msg.intent && msg.intent !== "general_chat" && INTENT_BADGES[msg.intent] && (
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                              style={{
                                background: INTENT_BADGES[msg.intent].bg,
                                color: INTENT_BADGES[msg.intent].color,
                              }}
                            >
                              {INTENT_BADGES[msg.intent].label}
                            </span>
                            {msg.roadmapUpdated && (
                              <span
                                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                                style={{
                                  background: "rgba(5,150,105,0.1)",
                                  color: "#059669",
                                }}
                              >
                                ✓ Roadmap Updated
                              </span>
                            )}
                          </div>
                        )}

                        {/* Message content */}
                        <div
                          className="rounded-2xl rounded-tl-md px-5 py-3.5"
                          style={{
                            background: "var(--surface)",
                            border: "0.5px solid var(--border)",
                          }}
                        >
                          <div
                            className="text-sm leading-relaxed whitespace-pre-wrap"
                            style={{
                              color: "var(--text)",
                              fontFamily: "var(--font-dm)",
                            }}
                            dangerouslySetInnerHTML={{
                              __html: msg.content
                                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                                .replace(/\*(.*?)\*/g, "<em>$1</em>")
                                .replace(/`(.*?)`/g, '<code style="background:var(--surface2);padding:1px 5px;border-radius:4px;font-size:12px;">$1</code>')
                                .replace(/\n/g, "<br/>"),
                            }}
                          />
                        </div>

                        {/* Roadmap updated — action link */}
                        {msg.roadmapUpdated && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => router.push("/")}
                            className="self-start flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border-none"
                            style={{
                              background: "var(--accent)",
                              color: "white",
                              boxShadow: "var(--shadow-accent)",
                            }}
                          >
                            ◈ View Updated Roadmap →
                          </motion.button>
                        )}

                        {/* Confirmation buttons */}
                        {msg.needsConfirmation && idx === messages.length - 1 && awaitingConfirmation && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 mt-1"
                          >
                            <button
                              onClick={handleConfirmNewRoadmap}
                              className="px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer border-none text-white"
                              style={{
                                background: "var(--accent)",
                                boxShadow: "var(--shadow-accent)",
                              }}
                            >
                              ✓ Yes, Create New Roadmap
                            </button>
                            <button
                              onClick={handleCancelNewRoadmap}
                              className="px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer bg-transparent"
                              style={{
                                border: "0.5px solid var(--border2)",
                                color: "var(--text2)",
                              }}
                            >
                              ✕ Keep Current Roadmap
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                    style={{
                      background: "var(--accent-light)",
                      border: "1px solid var(--accent)",
                    }}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{ color: "var(--accent)" }}
                    >
                      AI
                    </span>
                  </div>
                  <div
                    className="rounded-2xl rounded-tl-md px-5 py-4 flex items-center gap-1.5"
                    style={{
                      background: "var(--surface)",
                      border: "0.5px solid var(--border)",
                    }}
                  >
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ background: "var(--accent)" }}
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ background: "var(--accent)" }}
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ background: "var(--accent)" }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Input Bar ── */}
        <div
          className="sticky bottom-0 px-8 py-4"
          style={{
            background: "rgba(250,249,247,0.95)",
            backdropFilter: "blur(12px)",
            borderTop: "0.5px solid var(--border)",
          }}
        >
          <div className="max-w-3xl mx-auto">
            {/* Quick suggestion chips */}
            {messages.length <= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2 mb-3"
              >
                {[
                  "Extend my roadmap by 2 more weeks",
                  "Focus more on practical projects",
                  "I want to switch to a different career path",
                  "Make the difficulty more beginner-friendly",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInputValue(suggestion);
                      setTimeout(() => handleSendMessage(suggestion), 50);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer bg-transparent transition-all"
                    style={{
                      border: "0.5px solid var(--border2)",
                      color: "var(--text2)",
                      fontFamily: "var(--font-dm)",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.borderColor = "var(--accent)";
                      (e.target as HTMLElement).style.color = "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.borderColor = "var(--border2)";
                      (e.target as HTMLElement).style.color = "var(--text2)";
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Input row */}
            <div
              className="flex items-center gap-3 rounded-2xl px-5 py-3"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              }}
            >
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  awaitingConfirmation
                    ? "Please confirm or cancel above..."
                    : "Ask me to modify your roadmap, or describe changes you want..."
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading || awaitingConfirmation}
                className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-gray-400"
                style={{
                  color: "var(--text)",
                  fontFamily: "var(--font-dm)",
                }}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={loading || !inputValue.trim() || awaitingConfirmation}
                className="w-9 h-9 rounded-xl flex items-center justify-center border-none cursor-pointer transition-all shrink-0"
                style={{
                  background:
                    loading || !inputValue.trim() || awaitingConfirmation
                      ? "var(--surface2)"
                      : "var(--accent)",
                  color:
                    loading || !inputValue.trim() || awaitingConfirmation
                      ? "var(--text3)"
                      : "white",
                }}
              >
                {loading ? (
                  <div
                    className="spinner"
                    style={{
                      width: 14,
                      height: 14,
                      borderWidth: 2,
                      borderColor: "var(--border)",
                      borderTopColor: "var(--accent)",
                    }}
                  />
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>

            <p
              className="text-[10px] mt-2 text-center"
              style={{ color: "var(--text3)" }}
            >
              Vazhi AI Roadmap Advisor • Powered by AI • Changes apply to your
              active roadmap
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
