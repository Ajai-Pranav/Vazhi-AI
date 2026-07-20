"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";

// ─── Animated Counter Hook ────────────────────────────────────────────────────
function useCounter(end: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return count;
}

// ─── Intersection Observer Hook ───────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Fade-in wrapper ──────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, direction = "up", className = "" }: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
}) {
  const { ref, inView } = useInView();
  const dirMap = {
    up: { y: 32, x: 0 },
    down: { y: -32, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
    none: { x: 0, y: 0 },
  };
  const { x, y } = dirMap[direction];
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, x }}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Benefits", href: "#benefits" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "var(--header-bg)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "none",
        boxShadow: scrolled ? "var(--shadow)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 no-underline">
          <div
            className="flex items-center justify-center rounded-xl text-white text-sm font-black"
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              boxShadow: "var(--shadow-accent)",
              fontFamily: "var(--font-syne)",
            }}
          >
            V
          </div>
          <span
            className="text-xl font-black"
            style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
          >
            Vazhi<span style={{ color: "var(--accent)" }}>AI</span>
          </span>
        </a>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-bold transition-colors duration-200 no-underline"
              style={{
                color: "var(--text)",
                fontFamily: "var(--font-syne)",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text)")}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/auth/login"
            className="hidden sm:block px-4 py-2 rounded-xl text-sm font-semibold no-underline transition-all duration-200"
            style={{
              border: "1px solid var(--border2)",
              color: "var(--text2)",
              fontFamily: "var(--font-syne)",
              background: "transparent",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
              (e.currentTarget as HTMLElement).style.color = "var(--accent)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)";
              (e.currentTarget as HTMLElement).style.color = "var(--text2)";
            }}
          >
            Log In
          </Link>
          <Link
            href="/auth/signup"
            className="px-4 py-2 rounded-xl text-sm font-bold text-white no-underline transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              boxShadow: "var(--shadow-accent)",
              fontFamily: "var(--font-syne)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(124,111,239,0.5)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-accent)";
            }}
          >
            Sign Up Free
          </Link>

          {/* Mobile hamburger */}
          <button
            className="md:hidden ml-1 p-2 rounded-lg"
            style={{ background: "var(--surface2)", border: "1px solid var(--border2)", cursor: "pointer" }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span style={{ color: "var(--text)", fontSize: 18, lineHeight: 1 }}>
              {mobileOpen ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden px-6 pb-4 flex flex-col gap-3"
            style={{ background: "var(--header-bg)", backdropFilter: "blur(20px)", borderTop: "1px solid var(--border)" }}
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-bold no-underline py-2"
                style={{ color: "var(--text)", fontFamily: "var(--font-syne)" }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-3 mt-2">
              <Link href="/auth/login" className="flex-1 text-center py-2 rounded-xl text-sm font-semibold no-underline" style={{ border: "1px solid var(--border2)", color: "var(--text2)", fontFamily: "var(--font-syne)" }}>Log In</Link>
              <Link href="/auth/signup" className="flex-1 text-center py-2 rounded-xl text-sm font-bold text-white no-underline" style={{ background: "var(--accent)", fontFamily: "var(--font-syne)" }}>Sign Up</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 400], [0, -60]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.4]);

  const badges = ["AI-Powered", "Personalized", "Career-Focused", "Free to Start"];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-20">
      {/* Parallax ambient glows */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 pointer-events-none"
      >
        <div
          className="absolute"
          style={{
            top: "10%",
            left: "5%",
            width: "50vw",
            height: "50vw",
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--glow1-color) 0%, transparent 65%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: "5%",
            right: "5%",
            width: "40vw",
            height: "40vw",
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--glow2-color) 0%, transparent 65%)",
            filter: "blur(80px)",
          }}
        />
      </motion.div>

      <motion.div style={{ opacity }} className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Badge row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-8"
        >
          {badges.map((badge, i) => (
            <motion.span
              key={badge}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: "var(--accent-light)",
                color: "var(--accent)",
                border: "1px solid var(--accent-glow)",
                fontFamily: "var(--font-syne)",
                letterSpacing: "0.05em",
              }}
            >
              {badge}
            </motion.span>
          ))}
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.2 }}
          className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight"
          style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
        >
          Your AI Career
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, var(--accent) 0%, var(--teal) 50%, var(--gold) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Co-Pilot
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-semibold"
          style={{ color: "var(--text2)", fontFamily: "var(--font-dm)" }}
        >
          VazhiAI builds you a personalized, day-by-day learning roadmap toward your dream career.
          From beginner to job-ready — guided every step of the way by AI.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.48 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
        >
          <Link
            href="/auth/signup"
            className="group px-8 py-4 rounded-2xl text-base font-bold text-white no-underline relative overflow-hidden transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              boxShadow: "var(--shadow-accent)",
              fontFamily: "var(--font-syne)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px) scale(1.02)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(124,111,239,0.55)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = "none";
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-accent)";
            }}
          >
            ✦ Start for Free →
          </Link>
          <a
            href="#features"
            className="px-8 py-4 rounded-2xl text-base font-semibold no-underline transition-all duration-200"
            style={{
              border: "1.5px solid var(--border2)",
              color: "var(--text2)",
              fontFamily: "var(--font-syne)",
              background: "var(--surface)",
              backdropFilter: "blur(12px)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
              (e.currentTarget as HTMLElement).style.color = "var(--accent)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)";
              (e.currentTarget as HTMLElement).style.color = "var(--text2)";
              (e.currentTarget as HTMLElement).style.transform = "none";
            }}
          >
            Explore Features
          </a>
        </motion.div>

        {/* App mockup card */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-4xl"
        >
          {/* Glow behind mockup */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)",
              filter: "blur(40px)",
              transform: "translateY(20px) scale(0.95)",
            }}
          />

          {/* Dashboard Preview Card */}
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{
              border: "1.5px solid var(--border2)",
              background: "var(--surface)",
              backdropFilter: "blur(20px)",
              boxShadow: "var(--shadow2)",
            }}
          >
            {/* Browser chrome */}
            <div
              className="flex items-center gap-2 px-5 py-3"
              style={{ borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}
            >
              <div className="w-3 h-3 rounded-full" style={{ background: "var(--rose)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "var(--gold)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "var(--teal)" }} />
              <div
                className="flex-1 mx-6 h-6 rounded-lg flex items-center px-4 text-xs"
                style={{ background: "var(--surface3)", color: "var(--text3)", fontFamily: "var(--font-dm)" }}
              >
                app.VazhiAI.io/home
              </div>
            </div>

            {/* Mock dashboard UI */}
            <div className="flex" style={{ minHeight: 380 }}>
              {/* Sidebar */}
              <div className="hidden md:flex flex-col py-4 px-3 gap-1" style={{ width: 180, borderRight: "1px solid var(--border)", background: "var(--surface2)" }}>
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Menu</div>
                {[
                  { icon: "⊞", label: "Dashboard", active: true },
                  { icon: "◈", label: "Roadmap", active: false },
                  { icon: "✦", label: "Resume", active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
                    style={{
                      background: item.active ? "var(--accent-light)" : "transparent",
                      color: item.active ? "var(--accent)" : "var(--text3)",
                      borderLeft: item.active ? "3px solid var(--accent)" : "3px solid transparent",
                      fontFamily: "var(--font-syne)",
                    }}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </div>
                ))}
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest mb-2 mt-4" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Resources</div>
                {["⊕ Explore Paths", "◉ Mentors", "📚 Study Material"].map((item) => (
                  <div
                    key={item}
                    className="px-3 py-2 rounded-xl text-xs"
                    style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-6 flex flex-col gap-4">
                {/* Stat cards */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Days Left", value: "2", color: "var(--text)" },
                    { label: "Roadmap Steps", value: "12", color: "var(--text)" },
                    { label: "Skills Known", value: "8", color: "var(--text)" },
                    { label: "Difficulty", value: "Int.", color: "var(--gold)" },
                  ].map((stat) => (
                    <div key={stat.label} className="p-3 rounded-xl" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                      <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>{stat.label}</div>
                      <div className="text-lg font-extrabold" style={{ color: stat.color, fontFamily: "var(--font-syne)" }}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="p-4 rounded-xl" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color: "var(--text)", fontFamily: "var(--font-syne)" }}>Career Path Progress</span>
                    <span className="text-sm font-extrabold" style={{ color: "var(--accent)", fontFamily: "var(--font-syne)" }}>62%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface3)" }}>
                    <div className="h-full rounded-full" style={{ width: "62%", background: "linear-gradient(90deg, var(--accent), var(--teal))" }} />
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: "◈", title: "Study Dashboard", color: "var(--accent)" },
                    { icon: "📚", title: "Study Material", color: "var(--rose)" },
                  ].map((card) => (
                    <div
                      key={card.title}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ border: "1px solid var(--border2)", background: "var(--surface)" }}
                    >
                      <div className="flex items-center justify-center rounded-lg text-sm" style={{ width: 32, height: 32, background: `${card.color}1a`, color: card.color }}>
                        {card.icon}
                      </div>
                      <span className="text-xs font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-syne)" }}>{card.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating UI badges */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-5 -right-5 px-4 py-2 rounded-2xl text-xs font-bold hidden md:flex items-center gap-2"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border2)",
              boxShadow: "var(--shadow2)",
              color: "var(--text)",
              fontFamily: "var(--font-syne)",
            }}
          >
            <span style={{ color: "var(--teal)" }}>✓</span> Roadmap Generated!
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute -bottom-5 -left-5 px-4 py-2 rounded-2xl text-xs font-bold hidden md:flex items-center gap-2"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border2)",
              boxShadow: "var(--shadow2)",
              color: "var(--text)",
              fontFamily: "var(--font-syne)",
            }}
          >
            🤖 AI Study Material Ready
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── Features Section ─────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "◈",
    color: "var(--accent)",
    title: "AI-Powered Roadmaps",
    desc: "Tell VazhiAI your dream role and current skill level. Get a personalized, day-by-day learning roadmap generated in seconds — not generic templates, but a custom plan built for you.",
  },
  {
    icon: "📚",
    color: "var(--rose)",
    title: "Study Material Generator",
    desc: "Generate comprehensive, structured study guides on any topic. From beginner concepts to advanced theory, complete with examples, diagrams, and quiz questions — exportable as a PDF.",
  },
  {
    icon: "✦",
    color: "var(--teal)",
    title: "AI Resume Builder",
    desc: "Build a professional, ATS-optimized resume with AI assistance. Tailored to your career path, skills, and dream job — ready to download and impress recruiters.",
  },
  {
    icon: "⊕",
    color: "var(--gold)",
    title: "Explore Career Paths",
    desc: "Unsure which direction to take? Browse alternative career paths aligned with your skills and interests. Compare options, required skills, and earning potential side by side.",
  },
  {
    icon: "🧠",
    color: "var(--accent)",
    title: "Daily Progress Tracking",
    desc: "Log your daily study progress, completed tasks, and solved problems. Stay on track with visual progress indicators and motivating milestones on your roadmap.",
  },
  {
    icon: "📝",
    color: "var(--teal)",
    title: "AI Quiz & Testing",
    desc: "Test your knowledge with AI-generated quizzes tailored to your study material. Get instant scoring, detailed explanations, and track your average performance over time.",
  },
  {
    icon: "💬",
    color: "var(--rose)",
    title: "AI Career Chat",
    desc: "Chat with your personal AI career counselor. Ask anything — from interview tips and salary negotiation to skill gap analysis. Context-aware, always available.",
  },
  {
    icon: "◉",
    color: "var(--gold)",
    title: "Mentor Matching",
    desc: "Connect with mentors aligned to your career goals. Filter by industry, role, and expertise. Get guidance from professionals who've walked the path you're on.",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-28 relative">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
            style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid var(--accent-glow)", fontFamily: "var(--font-syne)" }}>
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
            Everything you need to{" "}
            <span style={{ color: "var(--accent)" }}>land your dream job</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto font-semibold" style={{ color: "var(--text2)", fontFamily: "var(--font-dm)" }}>
            VazhiAI bundles all the career tools you need into one seamless platform — powered by the latest AI models.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feat, i) => (
            <FadeIn key={feat.title} delay={i * 0.06} direction="up">
              <div
                className="group p-6 rounded-2xl border h-full flex flex-col gap-4 transition-all duration-300 cursor-default"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border2)",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.transform = "translateY(-6px)";
                  el.style.boxShadow = "var(--shadow2)";
                  el.style.borderColor = feat.color;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.transform = "none";
                  el.style.boxShadow = "none";
                  el.style.borderColor = "var(--border2)";
                }}
              >
                <div
                  className="flex items-center justify-center rounded-xl text-xl"
                  style={{ width: 48, height: 48, background: `${feat.color}18`, color: feat.color }}
                >
                  {feat.icon}
                </div>
                <h3 className="text-base font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed flex-1 font-medium" style={{ color: "var(--text2)", fontFamily: "var(--font-dm)" }}>
                  {feat.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    step: "01",
    icon: "📋",
    color: "var(--accent)",
    title: "Create Your Profile",
    desc: "Tell us about yourself — your education level, current skills, tech stack, and dream job. Takes under 2 minutes.",
  },
  {
    step: "02",
    icon: "🤖",
    color: "var(--teal)",
    title: "AI Builds Your Roadmap",
    desc: "VazhiAI analyzes your profile and generates a detailed, personalized day-by-day career roadmap tailored to your goals.",
  },
  {
    step: "03",
    icon: "📅",
    color: "var(--gold)",
    title: "Follow Your Daily Plan",
    desc: "Each day you receive a structured study agenda — topics to cover, resources to use, and milestones to hit.",
  },
  {
    step: "04",
    icon: "🚀",
    color: "var(--rose)",
    title: "Track & Accelerate",
    desc: "Log progress, take quizzes, generate study material, and build your resume — all within one platform as you advance.",
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-28 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 50%, var(--glow1-color) 0%, transparent 60%)",
        filter: "blur(60px)",
      }} />

      <div className="max-w-7xl mx-auto px-6 relative">
        <FadeIn className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
            style={{ background: "var(--teal-light)", color: "var(--teal)", border: "1px solid rgba(52,212,179,0.3)", fontFamily: "var(--font-syne)" }}>
            How It Works
          </span>
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
            From zero to hired in{" "}
            <span style={{ color: "var(--teal)" }}>4 simple steps</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto font-semibold" style={{ color: "var(--text2)", fontFamily: "var(--font-dm)" }}>
            VazhiAI removes the guesswork from career development. Just follow your personalized plan.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line */}
          <div
            className="hidden lg:block absolute top-12 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, var(--border2), var(--accent-glow), var(--border2), transparent)", top: "3.5rem" }}
          />

          {STEPS.map((step, i) => (
            <FadeIn key={step.step} delay={i * 0.1}>
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div
                    className="flex items-center justify-center rounded-2xl text-2xl relative z-10"
                    style={{
                      width: 72,
                      height: 72,
                      background: `${step.color}15`,
                      border: `2px solid ${step.color}40`,
                      boxShadow: `0 0 24px ${step.color}25`,
                    }}
                  >
                    {step.icon}
                  </div>
                  <div
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white z-20"
                    style={{ background: step.color, fontFamily: "var(--font-syne)" }}
                  >
                    {i + 1}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed font-medium" style={{ color: "var(--text2)", fontFamily: "var(--font-dm)" }}>
                  {step.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Stats Section ────────────────────────────────────────────────────────────
const STATS = [
  { value: 12000, suffix: "+", label: "Roadmaps Generated", color: "var(--accent)" },
  { value: 95, suffix: "%", label: "User Satisfaction Rate", color: "var(--teal)" },
  { value: 50000, suffix: "+", label: "Study Guides Created", color: "var(--gold)" },
  { value: 3, suffix: "x", label: "Faster Career Progress", color: "var(--rose)" },
];

function StatCard({ value, suffix, label, color, start }: {
  value: number; suffix: string; label: string; color: string; start: boolean;
}) {
  const count = useCounter(value, 2200, start);
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-black mb-2" style={{ color, fontFamily: "var(--font-syne)" }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm font-bold" style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}>
        {label}
      </div>
    </div>
  );
}

function StatsSection() {
  const { ref, inView } = useInView(0.3);

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div
          ref={ref}
          className="rounded-3xl p-12 relative overflow-hidden"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border2)",
            boxShadow: "var(--shadow2)",
          }}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse at 30% 50%, var(--glow1-color) 0%, transparent 60%)",
          }} />

          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-10">
            {STATS.map((stat) => (
              <StatCard key={stat.label} {...stat} start={inView} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Benefits Section ─────────────────────────────────────────────────────────
const BENEFITS = [
  {
    icon: "⚡",
    color: "var(--gold)",
    title: "Lightning Fast",
    desc: "Your personalized roadmap is generated in under 10 seconds. No waiting, no forms to submit, no consultants to schedule.",
  },
  {
    icon: "🎯",
    color: "var(--accent)",
    title: "Hyper-Personalized",
    desc: "Unlike generic courses or YouTube tutorials, VazhiAI builds a plan uniquely shaped to your background, goals, and timeline.",
  },
  {
    icon: "🔒",
    color: "var(--teal)",
    title: "Secure & Private",
    desc: "Your career data stays yours. We use industry-standard HTTP-only cookie auth and encrypted database storage.",
  },
  {
    icon: "📈",
    color: "var(--rose)",
    title: "Progress-Driven",
    desc: "Log daily progress, track quiz scores, and visualize your trajectory. Stay accountable and motivated every day.",
  },
  {
    icon: "🌐",
    color: "var(--gold)",
    title: "Multi-Language Support",
    desc: "Generate study materials and content in English, Hindi, Tamil, Spanish, French, and more — in your preferred language.",
  },
  {
    icon: "♾️",
    color: "var(--accent)",
    title: "Continuously Updated",
    desc: "Our AI stays current with industry trends. Your roadmap reflects what the job market actually wants right now.",
  },
];

function BenefitsSection() {
  return (
    <section id="benefits" className="py-28">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
            style={{ background: "var(--gold-light)", color: "var(--gold)", border: "1px solid rgba(245,188,74,0.3)", fontFamily: "var(--font-syne)" }}>
            Why VazhiAI
          </span>
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
            Built for results, not{" "}
            <span style={{ color: "var(--gold)" }}>just learning</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto font-semibold" style={{ color: "var(--text2)", fontFamily: "var(--font-dm)" }}>
            VazhiAI isn't just another course platform. It's your complete career operating system.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BENEFITS.map((b, i) => (
            <FadeIn key={b.title} delay={i * 0.07}>
              <div
                className="p-6 rounded-2xl border flex gap-5 transition-all duration-300"
                style={{ background: "var(--surface)", borderColor: "var(--border2)" }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.transform = "translateY(-4px)";
                  el.style.boxShadow = "var(--shadow)";
                  el.style.borderColor = b.color;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.transform = "none";
                  el.style.boxShadow = "none";
                  el.style.borderColor = "var(--border2)";
                }}
              >
                <div
                  className="flex items-center justify-center rounded-xl shrink-0 text-xl"
                  style={{ width: 52, height: 52, background: `${b.color}15`, color: b.color }}
                >
                  {b.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold mb-2" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
                    {b.title}
                  </h3>
                  <p className="text-sm leading-relaxed font-medium" style={{ color: "var(--text2)", fontFamily: "var(--font-dm)" }}>
                    {b.desc}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Comparison Section ───────────────────────────────────────────────────────
const COMPARISON = [
  { feature: "Personalized day-by-day plan", traditional: false, VazhiAI: true },
  { feature: "AI-generated study material", traditional: false, VazhiAI: true },
  { feature: "Resume builder built-in", traditional: false, VazhiAI: true },
  { feature: "Career path exploration", traditional: false, VazhiAI: true },
  { feature: "Daily progress tracking", traditional: false, VazhiAI: true },
  { feature: "AI quiz generation", traditional: false, VazhiAI: true },
  { feature: "PDF export of study guides", traditional: false, VazhiAI: true },
  { feature: "Free to start", traditional: false, VazhiAI: true },
];

function ComparisonSection() {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 70% 50%, var(--glow2-color) 0%, transparent 60%)",
        filter: "blur(80px)",
      }} />

      <div className="max-w-4xl mx-auto px-6 relative">
        <FadeIn className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
            style={{ background: "var(--rose-light)", color: "var(--rose)", border: "1px solid rgba(240,98,146,0.3)", fontFamily: "var(--font-syne)" }}>
            The Difference
          </span>
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
            VazhiAI vs. Traditional Career Advice
          </h2>
          <p className="text-lg max-w-2xl mx-auto font-semibold" style={{ color: "var(--text2)", fontFamily: "var(--font-dm)" }}>
            Stop paying for expensive career coaches or getting lost in generic YouTube playlists.
          </p>
        </FadeIn>

        <FadeIn>
          <div className="rounded-3xl overflow-hidden" style={{ border: "1px solid var(--border2)", background: "var(--surface)", boxShadow: "var(--shadow2)" }}>
            {/* Header */}
            <div className="grid grid-cols-3 px-6 py-4" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
              <div className="text-sm font-bold" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Feature</div>
              <div className="text-center text-sm font-bold" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Traditional</div>
              <div className="text-center text-sm font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-syne)" }}>VazhiAI ✦</div>
            </div>

            {COMPARISON.map((row, i) => (
              <div
                key={row.feature}
                className="grid grid-cols-3 px-6 py-4 transition-colors duration-150"
                style={{
                  borderBottom: i < COMPARISON.length - 1 ? "1px solid var(--border)" : "none",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div className="text-sm font-medium flex items-center" style={{ color: "var(--text2)", fontFamily: "var(--font-dm)" }}>
                  {row.feature}
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-lg">{row.traditional ? "✅" : "❌"}</span>
                </div>
                <div className="flex items-center justify-center">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: "var(--accent-light)", color: "var(--accent)", fontFamily: "var(--font-syne)" }}
                  >
                    ✓ Yes
                  </span>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    role: "Final Year CSE Student",
    avatar: "PS",
    color: "var(--accent)",
    quote: "VazhiAI gave me a crystal-clear roadmap to become a full-stack developer. Within 3 months I had my first internship offer. The study material generator saved me countless hours.",
    stars: 5,
  },
  {
    name: "Ahmed Al-Farsi",
    role: "Software Engineer → ML Engineer",
    avatar: "AA",
    color: "var(--teal)",
    quote: "As a working professional, I didn't have time to figure out what to learn. VazhiAI built me a targeted ML learning plan around my schedule. The AI chat feature is like having a mentor on call.",
    stars: 5,
  },
  {
    name: "Sakura Tanaka",
    role: "Job Seeker → Frontend Dev",
    avatar: "ST",
    color: "var(--gold)",
    quote: "I was lost after my bootcamp. VazhiAI showed me exactly what gaps I needed to fill and helped me build a resume that got me 3 interview calls in my first week of applying.",
    stars: 5,
  },
  {
    name: "Marcus Williams",
    role: "Commerce Graduate → Data Analyst",
    avatar: "MW",
    color: "var(--rose)",
    quote: "Coming from a non-tech background, I didn't know where to start. VazhiAI's personalized roadmap and the daily study guides made the transition feel completely manageable.",
    stars: 5,
  },
];

function TestimonialsSection() {
  return (
    <section className="py-28">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
            style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid var(--accent-glow)", fontFamily: "var(--font-syne)" }}>
            Testimonials
          </span>
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
            Loved by learners{" "}
            <span style={{ color: "var(--accent)" }}>worldwide</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto font-semibold" style={{ color: "var(--text2)", fontFamily: "var(--font-dm)" }}>
            Join thousands of students and professionals who've transformed their careers with VazhiAI.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.08} direction={i % 2 === 0 ? "left" : "right"}>
              <div
                className="p-7 rounded-2xl border flex flex-col gap-4 h-full transition-all duration-300"
                style={{ background: "var(--surface)", borderColor: "var(--border2)" }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.boxShadow = "var(--shadow)";
                  el.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.boxShadow = "none";
                  el.style.transform = "none";
                }}
              >
                {/* Stars */}
                <div className="flex gap-1" style={{ color: "var(--gold)" }}>
                  {"★".repeat(t.stars)}
                </div>

                {/* Quote */}
                <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--text2)", fontFamily: "var(--font-dm)" }}>
                  "{t.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                  <div
                    className="flex items-center justify-center rounded-full text-sm font-black text-white shrink-0"
                    style={{ width: 42, height: 42, background: `linear-gradient(135deg, ${t.color}, ${t.color}99)`, fontFamily: "var(--font-syne)" }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: "var(--text)", fontFamily: "var(--font-syne)" }}>{t.name}</div>
                    <div className="text-xs" style={{ color: "var(--text3)", fontFamily: "var(--font-dm)" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "Is VazhiAI free to use?",
    a: "Yes! VazhiAI is free to get started. Create an account, complete your profile, and receive a personalized AI roadmap at no cost. Premium features may be introduced in future updates.",
  },
  {
    q: "How does the AI generate my personalized roadmap?",
    a: "VazhiAI analyzes your educational background, current skill set, tech stack, dream role, and available timeline. It then uses a large language model (LLM) to generate a structured, day-by-day study plan tailored specifically to bridge the gap between where you are and where you want to be.",
  },
  {
    q: "Can I use VazhiAI if I'm already a working professional?",
    a: "Absolutely. VazhiAI supports Students, Job Seekers, and Working Professionals. Whether you're upskilling, switching careers, or aiming for a promotion, VazhiAI adapts the roadmap to your current position and target role.",
  },
  {
    q: "What is the Study Material Generator?",
    a: "The Study Material Generator lets you input topics and generate a comprehensive, structured study manual — including introductions, core concepts, practical examples, quiz questions, and more. You can export it as a professionally formatted PDF.",
  },
  {
    q: "Does VazhiAI build my resume too?",
    a: "Yes! VazhiAI includes an AI-powered resume builder that creates an ATS-optimized, professional resume based on your profile, skills, and career goals. Download it instantly.",
  },
  {
    q: "How accurate are the roadmaps?",
    a: "VazhiAI roadmaps are generated by advanced AI models fine-tuned on career development patterns and industry requirements. While no AI is perfect, users consistently report the plans being highly relevant and actionable for their specific goals.",
  },
  {
    q: "Can I generate study material in my native language?",
    a: "Yes! The Study Material Generator supports multiple languages including English, Hindi, Tamil, Spanish, French, German, and Malayalam.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. VazhiAI uses HTTP-only cookie based authentication, encrypted database storage, and follows industry-standard security practices. Your personal data is never shared or sold.",
  },
];

function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="py-28">
      <div className="max-w-3xl mx-auto px-6">
        <FadeIn className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
            style={{ background: "var(--teal-light)", color: "var(--teal)", border: "1px solid rgba(52,212,179,0.3)", fontFamily: "var(--font-syne)" }}>
            FAQ
          </span>
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
            Frequently Asked Questions
          </h2>
          <p className="text-lg font-semibold" style={{ color: "var(--text2)", fontFamily: "var(--font-dm)" }}>
            Everything you need to know about VazhiAI.
          </p>
        </FadeIn>

        <div className="flex flex-col gap-3">
          {FAQS.map((faq, i) => (
            <FadeIn key={i} delay={i * 0.04}>
              <div
                className="rounded-2xl overflow-hidden border transition-all duration-200"
                style={{
                  borderColor: openIdx === i ? "var(--accent)" : "var(--border2)",
                  background: "var(--surface)",
                }}
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  aria-expanded={openIdx === i}
                  style={{ background: "transparent", border: "none", cursor: "pointer" }}
                >
                  <span className="text-sm font-bold pr-4" style={{ color: "var(--text)", fontFamily: "var(--font-syne)" }}>
                    {faq.q}
                  </span>
                  <span
                    className="shrink-0 text-lg transition-transform duration-300"
                    style={{
                      color: "var(--accent)",
                      transform: openIdx === i ? "rotate(45deg)" : "none",
                    }}
                  >
                    +
                  </span>
                </button>
                <AnimatePresence>
                  {openIdx === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <p
                        className="px-6 pb-5 text-sm leading-relaxed font-medium"
                        style={{ color: "var(--text2)", fontFamily: "var(--font-dm)", borderTop: "1px solid var(--border)", paddingTop: 16 }}
                      >
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Section ──────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 50%, var(--glow1-color) 0%, transparent 60%)",
        filter: "blur(60px)",
      }} />

      <div className="max-w-4xl mx-auto px-6 text-center relative">
        <FadeIn>
          <div
            className="rounded-3xl p-12 md:p-20 relative overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border2)",
              boxShadow: "var(--shadow2)",
            }}
          >
            {/* Gradient border glow */}
            <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
              background: "linear-gradient(135deg, var(--accent-glow) 0%, transparent 50%, var(--glow2-color) 100%)",
              opacity: 0.4,
            }} />

            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="text-5xl mb-6"
              >
                🚀
              </motion.div>

              <h2 className="text-4xl md:text-5xl font-black mb-5" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
                Ready to build your
                <br />
                <span
                  style={{
                    background: "linear-gradient(135deg, var(--accent) 0%, var(--teal) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  dream career?
                </span>
              </h2>

              <p className="text-lg mb-10 max-w-xl mx-auto font-semibold" style={{ color: "var(--text2)", fontFamily: "var(--font-dm)" }}>
                Join thousands of learners who've taken control of their career journey with VazhiAI.
                Your personalized roadmap is ready in seconds — for free.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/signup"
                  className="px-10 py-4 rounded-2xl text-base font-black text-white no-underline transition-all duration-300"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    boxShadow: "var(--shadow-accent)",
                    fontFamily: "var(--font-syne)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-3px) scale(1.03)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 50px rgba(124,111,239,0.6)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = "none";
                    (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-accent)";
                  }}
                >
                  ✦ Get Started — It's Free
                </Link>
                <Link
                  href="/auth/login"
                  className="px-10 py-4 rounded-2xl text-base font-semibold no-underline transition-all duration-200"
                  style={{
                    border: "1.5px solid var(--border2)",
                    color: "var(--text2)",
                    fontFamily: "var(--font-syne)",
                    background: "var(--surface2)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                    (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text2)";
                  }}
                >
                  Already have an account? Log In
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-10">
                {[
                  "✓ No credit card required",
                  "✓ Setup in 2 minutes",
                  "✓ Cancel anytime",
                ].map((item) => (
                  <span key={item} className="text-xs font-semibold" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const footerLinks = {
    Product: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Benefits", href: "#benefits" },
      { label: "FAQ", href: "#faq" },
    ],
    Platform: [
      { label: "Dashboard", href: "/home" },
      { label: "Roadmap Builder", href: "/" },
      { label: "Study Material", href: "/study-material" },
      { label: "Resume Builder", href: "/resume" },
    ],
    Account: [
      { label: "Sign Up", href: "/auth/signup" },
      { label: "Log In", href: "/auth/login" },
      { label: "Get Started", href: "/get-started" },
    ],
    Legal: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  };

  return (
    <footer className="pt-20 pb-10 relative" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-16">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="flex items-center justify-center rounded-xl text-white text-sm font-black"
                style={{
                  width: 36,
                  height: 36,
                  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  fontFamily: "var(--font-syne)",
                }}
              >
                V
              </div>
              <span className="text-xl font-black" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
                Vazhi<span style={{ color: "var(--accent)" }}>AI</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text3)", fontFamily: "var(--font-dm)" }}>
              AI-powered career roadmaps for students and professionals. Your dream job is closer than you think.
            </p>
            <div className="flex gap-3">
              {["𝕏", "InG", "FB"].map((icon) => (
                <button
                  key={icon}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-200"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border2)",
                    color: "var(--text3)",
                    cursor: "pointer",
                    fontFamily: "var(--font-syne)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "var(--accent-light)";
                    (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text3)";
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)";
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>
                {category}
              </p>
              <div className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm no-underline transition-colors duration-150"
                    style={{ color: "var(--text3)", fontFamily: "var(--font-dm)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p className="text-xs" style={{ color: "var(--text3)", fontFamily: "var(--font-dm)" }}>
            © {new Date().getFullYear()} VazhiAI. All rights reserved.
          </p>
          <p className="text-xs flex items-center gap-1" style={{ color: "var(--text3)", fontFamily: "var(--font-dm)" }}>
            Made with <span style={{ color: "var(--rose)" }}>♥</span> for ambitious learners worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <BenefitsSection />
      <ComparisonSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}
