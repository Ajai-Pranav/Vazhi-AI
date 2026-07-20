"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { store } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { chatRefineSuggestions, saveRoadmap, generateSuggestions } from "@/lib/api";
import { CareerSuggestion, StudentProfile, ChatMessage } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SuggestionsPage() {
  const router = useRouter();
  const { loading: authLoading, user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [suggestions, setSuggestions] = useState<CareerSuggestion[]>([]);
  const [userName, setUserName] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  // Chatbot states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const chatInitialized = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login");
      return;
    }
 const cached = store.getSuggestions();
 const p = store.getProfile();
 if (cached.length > 0) {
   setSuggestions(cached);
   setProfile(p);
   setUserName(p?.name || "");
 } else if (user) {
   // Build profile from auth user and fetch suggestions
   const profile: StudentProfile = {
     name: user.name ?? "",
     dream_job: user.dream_job ?? user.custom_goal ?? "",
     confusion: user.confusion ?? "",
     tech_stack: user.tech_stack ?? [],
     educational_status: user.educational_status as StudentProfile["educational_status"],
     field: user.field as StudentProfile["field"],
     experience_level: user.experience_level as StudentProfile["experience_level"],
     college: user.college ?? undefined,
     course: user.course ?? undefined,
     current_year: user.current_year ?? undefined,
     total_years: user.total_years ?? undefined,
     current_company: user.current_company ?? undefined,
     years_of_experience: user.years_of_experience ?? undefined,
     current_role: user.current_role ?? undefined,
   };
   store.setProfile(profile);
   setProfile(profile);
   setUserName(profile.name);
   generateSuggestions(profile).then((res) => {
     store.setSuggestions(res.suggestions);
     setSuggestions(res.suggestions);
   });
 }

    // Only set the welcome message once, not on every render triggered by chatMessages changing
    if (!chatInitialized.current) {
      chatInitialized.current = true;
      setChatMessages([
        {
          role: "assistant",
          content: `Hi ${p?.name || "there"}! Let me know if you want to refine these career suggestions. You can say things like "give more options", "show beginner-friendly suggestions", "less coding focused", or "higher salary options".`
        }
      ]);
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  async function chooseThis(i: number) {
    try {
      await saveRoadmap(suggestions[i]);
      store.setChosen(suggestions[i]);
      router.push("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save roadmap. Please try again.");
    }
  }

  function toggleExpand(i: number) {
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!inputValue.trim() || chatLoading || !profile) return;

    const userMsg: ChatMessage = { role: "user", content: inputValue };
    const updatedHistory = [...chatMessages, userMsg];
    
    setChatMessages(updatedHistory);
    setInputValue("");
    setChatLoading(true);

    try {
      const response = await chatRefineSuggestions(profile, chatMessages, userMsg.content);
      
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response.reply
      };
      
      setChatMessages((prev) => [...prev, assistantMsg]);
      
      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
        store.setSuggestions(response.suggestions);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again."
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function getDiffClass(d: string) {
    const l = d.toLowerCase();
    if (l.includes("beginner")) return "diff-beginner";
    if (l.includes("advanced")) return "diff-advanced";
    return "diff-intermediate";
  }

  if (authLoading || suggestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2, borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav
        className="flex items-center px-8 py-4 fixed top-0 left-0 right-0 z-50"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--header-bg)", backdropFilter: "blur(16px)" }}
      >
        <div className="text-lg font-extrabold mr-auto" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
          Vazhi<span style={{ color: "var(--accent)" }}>AI</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => router.push("/onboarding")}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ border: "1px solid var(--border2)", color: "var(--text2)", background: "transparent", fontFamily: "var(--font-syne)", cursor: "pointer" }}
          >
            ← Edit Profile
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-10 with-fixed-header">
        <motion.div className="mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
            Your <span style={{ color: "var(--accent)" }}>AI-curated</span> paths
          </h1>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            {suggestions.length} personalized career roadmaps for {userName || "you"} — choose the one that resonates most.
          </p>
        </motion.div>

        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))" }}>
          {suggestions.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              whileHover={{ y: -3 }}
              className="rounded-[20px] flex flex-col relative overflow-hidden group"
              style={{ background: "var(--surface)", border: "0.5px solid var(--border2)", boxShadow: "var(--shadow)", cursor: "default" }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "var(--accent)" }} />
              <div className="absolute top-4 right-5 font-extrabold pointer-events-none select-none" style={{ fontFamily: "var(--font-syne)", fontSize: 56, color: "rgba(26,22,18,0.04)", lineHeight: 1 }}>
                {i + 1}
              </div>

              <div className="p-7 flex flex-col h-full">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 self-start ${getDiffClass(s.difficulty)}`} style={{ fontFamily: "var(--font-syne)" }}>
                  {s.difficulty}
                </span>
                <h2 className="text-xl font-bold mb-2 leading-tight" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>{s.title}</h2>
                <p className="text-sm mb-5" style={{ color: "var(--text2)", lineHeight: 1.7 }}>{s.description}</p>

                <SectionLabel>Why this fits you</SectionLabel>
                <div className="rounded-xl px-4 py-3 text-xs mb-5 leading-relaxed" style={{ background: "var(--teal-light)", border: "0.5px solid rgba(42,122,110,0.15)", color: "#1a5249" }}>
                  ✦ {s.why_this_fits_user}
                </div>

                <SectionLabel>Required Skills</SectionLabel>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {s.required_skills.map((sk, si) => (
                    <span key={si} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: "var(--surface2)", border: "0.5px solid var(--border2)", color: "var(--text2)" }}>{sk}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <SectionLabel>Roadmap</SectionLabel>
                  <button
                    onClick={() => toggleExpand(i)}
                    className="text-xs font-bold tracking-widest uppercase bg-transparent border-none"
                    style={{ color: expanded[i] ? "var(--accent)" : "var(--text3)", fontFamily: "var(--font-syne)", cursor: "pointer" }}
                  >
                    {expanded[i] ? "Hide steps ↑" : "Show steps ↓"}
                  </button>
                </div>

                {expanded[i] && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex flex-col gap-2.5 mb-4">
                    {s.roadmap_steps.map((step, si) => (
                      <div key={si} className="flex items-start gap-2.5 text-xs" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
                        <div className="flex items-center justify-center rounded-full text-xs font-bold shrink-0" style={{ width: 22, height: 22, background: "var(--surface2)", border: "0.5px solid var(--border2)", color: "var(--accent)", fontFamily: "var(--font-syne)", fontSize: 9 }}>
                          {si + 1}
                        </div>
                        {step}
                      </div>
                    ))}
                  </motion.div>
                )}

                <div className="mt-auto pt-5 flex items-center justify-between" style={{ borderTop: "0.5px solid var(--border)" }}>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text3)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                    </svg>
                    {s.estimated_timeline}
                  </div>
                  <motion.button
                    onClick={() => chooseThis(i)}
                    className="px-4 py-2 rounded-xl text-white text-xs font-semibold"
                    style={{ background: "var(--accent)", border: "none", fontFamily: "var(--font-syne)", cursor: "pointer", boxShadow: "var(--shadow-accent)" }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Choose This →
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Chatbot Refinement Widget */}
      <div className="chat-widget">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="chat-panel"
            >
              <div className="chat-header">
                <div className="chat-header-title">
                  <span style={{ color: "var(--accent)" }}>✦</span> Refine with AI Advisor
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

              <form className="chat-input-area" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Ask to change paths or ask details..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={chatLoading || !inputValue.trim()}
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
            layoutId="chat-toggle"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Refine Paths with AI
          </motion.button>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>
      {children}
    </p>
  );
}
