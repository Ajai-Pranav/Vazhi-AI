"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { store } from "@/lib/store";
import { getInitials } from "@/lib/utils";
import { getActiveRoadmap, getDailyProgress, optimizeResume } from "@/lib/api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ThemeToggle } from "@/components/ThemeToggle";

const MENU_ITEMS = [
  { icon: "⊞", label: "Dashboard",     path: "/home" },
  { icon: "◈", label: "Roadmap",        path: "/" },
  { icon: "✦", label: "Create Resume",  path: "/resume" },
];

const RESOURCE_ITEMS = [
  { icon: "⊕", label: "Explore Paths", path: "/suggestions" },
  { icon: "◉", label: "Mentors",       path: "/mentors" },
];

interface Project {
  title: string;
  description: string;
  technologies: string[];
  link: string;
}

interface Education {
  institution: string;
  degree: string;
  field_of_study: string;
  start_year: string;
  end_year: string;
  grade: string;
}

interface Experience {
  company: string;
  role: string;
  location: string;
  start_date: string;
  end_date: string;
  description: string;
}

type TabType = "profile" | "education_work" | "projects" | "skills";

export default function ResumePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [loading, setLoading] = useState(false);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [navLoadingLabel, setNavLoadingLabel] = useState<string | null>(null);
  const resumePreviewRef = useRef<HTMLDivElement>(null);

  // Resume states
  const [personal, setPersonal] = useState({
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    github: "",
    portfolio: "",
    summary: "",
  });

  const [educationList, setEducationList] = useState<Education[]>([]);
  const [experienceList, setExperienceList] = useState<Experience[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [skillsList, setSkillsList] = useState<string[]>([]);

  // Project form modal/inputs state
  const [newProject, setNewProject] = useState<Project>({
    title: "",
    description: "",
    technologies: [],
    link: "",
  });
  const [techInput, setTechInput] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login");
      return;
    }
    if (user) {
      // Initialize with db info
      setPersonal((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        summary: prev.summary || `Ambitious and results-driven ${user.dream_job || "Professional"} with a foundation in ${user.field || "Technology"}.`,
      }));

      // Initial education from student profile
      if (user.college || user.course) {
        setEducationList([
          {
            institution: user.college || "",
            degree: user.course || "",
            field_of_study: user.field || "",
            start_year: user.current_year ? String(new Date().getFullYear() - (user.current_year - 1)) : "",
            end_year: user.total_years && user.current_year ? String(new Date().getFullYear() + (user.total_years - user.current_year)) : "",
            grade: "",
          },
        ]);
      }

      // Initial work experience from professional profile
      if (user.educational_status === "Working Professional" && (user.current_company || user.current_role)) {
        setExperienceList([
          {
            company: user.current_company || "",
            role: user.current_role || "",
            location: "",
            start_date: "",
            end_date: "Present",
            description: "",
          },
        ]);
      }

      loadSkillsAndRoadmapData();
    }
  }, [authLoading, user]);

  const loadSkillsAndRoadmapData = async () => {
    setLoading(true);
    try {
      // Fetch active roadmap and progress logs
      const active = await getActiveRoadmap();
      let completedTopics: string[] = [];

      if (active) {
        const progress = await getDailyProgress();
        const topicsSet = new Set<string>();
        progress.forEach((p) => {
          if (p.completed_tasks) {
            p.completed_tasks.forEach((t) => topicsSet.add(t));
          }
        });
        completedTopics = Array.from(topicsSet);
      }

      // Merge profile tech stack + completed topics
      const mergedSkills = Array.from(
        new Set([...(user?.tech_stack || []), ...completedTopics])
      );
      setSkillsList(mergedSkills);
    } catch (err) {
      console.error("Failed to load skills and roadmap tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    store.clear();
    router.push("/auth/login");
  };

  // Add/Edit helpers
  const handleAddEducation = () => {
    setEducationList((prev) => [
      ...prev,
      { institution: "", degree: "", field_of_study: "", start_year: "", end_year: "", grade: "" },
    ]);
  };

  const handleRemoveEducation = (index: number) => {
    setEducationList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateEducation = (index: number, key: keyof Education, value: string) => {
    setEducationList((prev) =>
      prev.map((edu, i) => (i === index ? { ...edu, [key]: value } : edu))
    );
  };

  const handleAddExperience = () => {
    setExperienceList((prev) => [
      ...prev,
      { company: "", role: "", location: "", start_date: "", end_date: "", description: "" },
    ]);
  };

  const handleRemoveExperience = (index: number) => {
    setExperienceList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateExperience = (index: number, key: keyof Experience, value: string) => {
    setExperienceList((prev) =>
      prev.map((exp, i) => (i === index ? { ...exp, [key]: value } : exp))
    );
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title) return;
    setProjectsList((prev) => [...prev, newProject]);
    setNewProject({ title: "", description: "", technologies: [], link: "" });
    setTechInput("");
  };

  const handleRemoveProject = (index: number) => {
    setProjectsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTechTag = () => {
    if (!techInput.trim()) return;
    setNewProject((prev) => ({
      ...prev,
      technologies: [...prev.technologies, techInput.trim()],
    }));
    setTechInput("");
  };

  const handleRemoveTechTag = (tagIdx: number) => {
    setNewProject((prev) => ({
      ...prev,
      technologies: prev.technologies.filter((_, i) => i !== tagIdx),
    }));
  };

  const handleAddSkill = (skill: string) => {
    if (!skill.trim() || skillsList.includes(skill.trim())) return;
    setSkillsList((prev) => [...prev, skill.trim()]);
  };

  const handleRemoveSkill = (skill: string) => {
    setSkillsList((prev) => prev.filter((s) => s !== skill));
  };

  const handleOptimizeResume = async () => {
    setOptimizeLoading(true);
    setSuccessMsg("");
    try {
      const payload = {
        summary: personal.summary,
        education: educationList,
        experience: experienceList,
        projects: projectsList,
        skills: skillsList,
      };

      const result = await optimizeResume(payload, user?.dream_job || "Software Engineer");

      if (result) {
        if (result.summary) setPersonal((p) => ({ ...p, summary: result.summary }));
        if (result.education) setEducationList(result.education);
        if (result.experience) setExperienceList(result.experience);
        if (result.projects) setProjectsList(result.projects);
        if (result.skills) setSkillsList(result.skills);

        setSuccessMsg("Resume successfully optimized for ATS tracking and target job keywords!");
        setTimeout(() => setSuccessMsg(""), 5000);
      }
    } catch (err) {
      alert("Failed to optimize resume with AI. Please try again.");
    } finally {
      setOptimizeLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!resumePreviewRef.current) return;
    setDownloadLoading(true);
    try {
      const element = resumePreviewRef.current;

      // Capture the preview card at high resolution
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // A4 dimensions in mm
      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = A4_WIDTH_MM;
      const imgHeight = (canvas.height * A4_WIDTH_MM) / canvas.width;

      // If content fits in one page
      if (imgHeight <= A4_HEIGHT_MM) {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-page: slice the canvas into A4-height pages
        let remainingHeight = canvas.height;
        let position = 0;
        const pageCanvasHeight = (A4_HEIGHT_MM * canvas.width) / A4_WIDTH_MM;

        while (remainingHeight > 0) {
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.min(pageCanvasHeight, remainingHeight);

          const ctx = pageCanvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              canvas,
              0, position,
              canvas.width, pageCanvas.height,
              0, 0,
              canvas.width, pageCanvas.height
            );
          }

          const pageImgData = pageCanvas.toDataURL("image/png");
          const pageImgHeight = (pageCanvas.height * A4_WIDTH_MM) / canvas.width;

          if (position > 0) pdf.addPage();
          pdf.addImage(pageImgData, "PNG", 0, 0, imgWidth, pageImgHeight);

          remainingHeight -= pageCanvasHeight;
          position += pageCanvasHeight;
        }
      }

      const fileName = `${(personal.name || "Resume").replace(/\s+/g, "_")}_Resume_VazhiAI.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to download resume. Please try again.");
    } finally {
      setDownloadLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2, borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  const initials = getInitials(user?.name || "Student");

  return (
    <div className="flex min-h-screen" style={{ background: "transparent" }}>



      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col sticky top-0 h-screen overflow-y-auto no-print"
        style={{ width: 220, minWidth: 220, background: "var(--surface)", borderRight: "0.5px solid var(--border)" }}
      >
        <div className="px-5 py-6" style={{ borderBottom: "0.5px solid var(--border)" }}>
          <div className="text-xl font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
            Vazhi<span style={{ color: "var(--accent)" }}>AI</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="text-[10px] font-extrabold tracking-widest uppercase px-2 mb-2" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Menu</p>
          <div className="flex flex-col gap-0.5 mb-6">
            {MENU_ITEMS.map((item) => {
              const active = item.label === "Create Resume";
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

          <p className="text-[10px] font-extrabold tracking-widest uppercase px-2 mb-2" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Resources</p>
          <div className="flex flex-col gap-0.5">
            {RESOURCE_ITEMS.map((item) => {
              const active = item.label === "Create Resume"; // none of these are active
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
                  <span className="text-sm font-medium" style={{ fontFamily: "var(--font-syne)" }}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-4" style={{ borderTop: "0.5px solid var(--border)" }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="flex items-center justify-center rounded-full text-sm font-bold text-white shrink-0"
              style={{ width: 36, height: 36, background: "var(--accent)", fontFamily: "var(--font-syne)" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: "var(--text)", fontFamily: "var(--font-syne)" }}>{user?.name}</div>
              <div className="text-xs truncate font-medium" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>{user?.educational_status || "Student"}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-xs py-2 rounded-xl font-medium text-center"
            style={{ border: "0.5px solid var(--border2)", color: "var(--text3)", background: "transparent", fontFamily: "var(--font-syne)", cursor: "pointer" }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Workspace ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="flex items-center justify-between px-8 py-4 fixed top-0 right-0 z-20 no-print"
          style={{ left: "220px", background: "var(--header-bg)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>AI Resume Builder</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>Pre-filled from profile & verified roadmap progress</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => router.push("/home")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer bg-transparent"
              style={{ borderColor: "var(--border2)", color: "var(--text2)", fontFamily: "var(--font-syne)" }}
            >
              ← Back to Home Page
            </button>
          </div>
        </header>

        {/* Workspace Container */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 p-8 pt-24 gap-8 overflow-y-auto">
          
          {/* Form Column (Left) */}
          <div className="flex flex-col gap-6 form-column no-print">
            
            {/* Action Buttons Row */}
            <div className="flex gap-3 action-row">
              <button
                onClick={handleOptimizeResume}
                disabled={optimizeLoading}
                className="flex-1 py-3.5 rounded-2xl text-white font-bold text-sm border-none cursor-pointer flex items-center justify-center gap-2"
                style={{ background: "var(--accent)", boxShadow: "var(--shadow-accent)" }}
              >
                {optimizeLoading ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Optimizing with LLM...
                  </>
                ) : (
                  <>✦ Optimize with AI</>
                )}
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={downloadLoading}
                className="py-3.5 px-6 rounded-2xl font-bold text-sm cursor-pointer border flex items-center justify-center gap-2 bg-transparent"
                style={{ borderColor: "var(--border2)", color: "var(--text)" }}
              >
                {downloadLoading ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Generating PDF...
                  </>
                ) : (
                  <>📄 Download PDF</>
                )}
              </button>
            </div>

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-medium rounded-xl p-3 text-center"
                style={{ background: "rgba(42,122,110,0.08)", color: "var(--teal)", border: "0.5px solid rgba(42,122,110,0.2)" }}
              >
                {successMsg}
              </motion.div>
            )}

            {/* Form Navigation Tabs */}
            <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
              {[
                { id: "profile", label: "Profile Details" },
                { id: "education_work", label: "Education / Work" },
                { id: "projects", label: "Projects" },
                { id: "skills", label: "Skills" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className="py-2.5 px-4 text-xs font-bold transition-all border-none bg-transparent cursor-pointer relative"
                  style={{
                    color: activeTab === tab.id ? "var(--accent)" : "var(--text2)",
                    fontFamily: "var(--font-syne)",
                  }}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: "var(--accent)" }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Workspace Panels */}
            <div className="flex-1">
              
              {/* Tab 1: Profile & Summary */}
              {activeTab === "profile" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
                  <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                    <h3 className="text-sm font-extrabold mb-4" style={{ fontFamily: "var(--font-syne)" }}>Contact Information</h3>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Full Name</label>
                        <input
                          type="text" className="field-input text-xs"
                          value={personal.name} onChange={(e) => setPersonal({ ...personal, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Email Address</label>
                        <input
                          type="email" className="field-input text-xs"
                          value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Phone Number</label>
                        <input
                          type="text" className="field-input text-xs" placeholder="+91 98765 43210"
                          value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>LinkedIn Profile</label>
                          <input
                            type="text" className="field-input text-xs" placeholder="linkedin.com/in/username"
                            value={personal.linkedin} onChange={(e) => setPersonal({ ...personal, linkedin: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>GitHub Link</label>
                          <input
                            type="text" className="field-input text-xs" placeholder="github.com/username"
                            value={personal.github} onChange={(e) => setPersonal({ ...personal, github: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Portfolio / Website</label>
                        <input
                          type="text" className="field-input text-xs" placeholder="https://mywebsite.com"
                          value={personal.portfolio} onChange={(e) => setPersonal({ ...personal, portfolio: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                    <h3 className="text-sm font-extrabold mb-2" style={{ fontFamily: "var(--font-syne)" }}>Professional Summary</h3>
                    <p className="text-[10px] text-gray-500 mb-3">Brief professional pitch. The LLM optimizer can refine this to fit your target job role.</p>
                    <textarea
                      rows={4} className="field-textarea text-xs w-full"
                      value={personal.summary} onChange={(e) => setPersonal({ ...personal, summary: e.target.value })}
                    />
                  </div>
                </motion.div>
              )}

              {/* Tab 2: Education & Work Experience */}
              {activeTab === "education_work" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                  
                  {/* Education List */}
                  <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-extrabold" style={{ fontFamily: "var(--font-syne)" }}>Education History</h3>
                      <button
                        onClick={handleAddEducation}
                        className="text-xs font-bold cursor-pointer"
                        style={{ color: "var(--accent)", background: "transparent", border: "none" }}
                      >
                        + Add Education
                      </button>
                    </div>

                    <div className="flex flex-col gap-5">
                      {educationList.map((edu, idx) => (
                        <div key={idx} className="p-4 rounded-xl border flex flex-col gap-3 relative" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                          <button
                            onClick={() => handleRemoveEducation(idx)}
                            className="absolute top-3 right-3 text-xs font-semibold cursor-pointer border-none bg-transparent"
                            style={{ color: "var(--accent)" }}
                          >
                            Remove
                          </button>
                          <div>
                            <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: "var(--text3)" }}>Institution Name</label>
                            <input
                              type="text" className="field-input text-xs" placeholder="e.g. Indian Institute of Technology"
                              value={edu.institution} onChange={(e) => handleUpdateEducation(idx, "institution", e.target.value)}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: "var(--text3)" }}>Degree / Program</label>
                              <input
                                type="text" className="field-input text-xs" placeholder="e.g. B.Tech"
                                value={edu.degree} onChange={(e) => handleUpdateEducation(idx, "degree", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: "var(--text3)" }}>Field of Study</label>
                              <input
                                type="text" className="field-input text-xs" placeholder="e.g. Computer Science"
                                value={edu.field_of_study} onChange={(e) => handleUpdateEducation(idx, "field_of_study", e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: "var(--text3)" }}>Start Year</label>
                              <input
                                type="text" className="field-input text-xs" placeholder="2022"
                                value={edu.start_year} onChange={(e) => handleUpdateEducation(idx, "start_year", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: "var(--text3)" }}>End Year</label>
                              <input
                                type="text" className="field-input text-xs" placeholder="2026"
                                value={edu.end_year} onChange={(e) => handleUpdateEducation(idx, "end_year", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: "var(--text3)" }}>Grade / GPA</label>
                              <input
                                type="text" className="field-input text-xs" placeholder="e.g. 8.5 CGPA"
                                value={edu.grade} onChange={(e) => handleUpdateEducation(idx, "grade", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {educationList.length === 0 && (
                        <p className="text-xs text-center py-4" style={{ color: "var(--text3)" }}>No education entries added yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Experience List */}
                  <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-extrabold" style={{ fontFamily: "var(--font-syne)" }}>Work Experience / Internships</h3>
                      <button
                        onClick={handleAddExperience}
                        className="text-xs font-bold cursor-pointer"
                        style={{ color: "var(--accent)", background: "transparent", border: "none" }}
                      >
                        + Add Experience
                      </button>
                    </div>

                    <div className="flex flex-col gap-5">
                      {experienceList.map((exp, idx) => (
                        <div key={idx} className="p-4 rounded-xl border flex flex-col gap-3 relative" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                          <button
                            onClick={() => handleRemoveExperience(idx)}
                            className="absolute top-3 right-3 text-xs font-semibold cursor-pointer border-none bg-transparent"
                            style={{ color: "var(--accent)" }}
                          >
                            Remove
                          </button>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: "var(--text3)" }}>Company Name</label>
                              <input
                                type="text" className="field-input text-xs" placeholder="e.g. Google"
                                value={exp.company} onChange={(e) => handleUpdateExperience(idx, "company", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: "var(--text3)" }}>Job Role / Title</label>
                              <input
                                type="text" className="field-input text-xs" placeholder="e.g. Software Engineer Intern"
                                value={exp.role} onChange={(e) => handleUpdateExperience(idx, "role", e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: "var(--text3)" }}>Location</label>
                              <input
                                type="text" className="field-input text-xs" placeholder="e.g. Bangalore, IN"
                                value={exp.location} onChange={(e) => handleUpdateExperience(idx, "location", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: "var(--text3)" }}>Start Date</label>
                              <input
                                type="text" className="field-input text-xs" placeholder="June 2024"
                                value={exp.start_date} onChange={(e) => handleUpdateExperience(idx, "start_date", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: "var(--text3)" }}>End Date</label>
                              <input
                                type="text" className="field-input text-xs" placeholder="Present / Aug 2024"
                                value={exp.end_date} onChange={(e) => handleUpdateExperience(idx, "end_date", e.target.value)}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: "var(--text3)" }}>Job Description / Achievements</label>
                            <p className="text-[9px] text-gray-500 mb-1">List key accomplishments, split by newlines. LLM optimizer will write detailed bullet points.</p>
                            <textarea
                              rows={3} className="field-textarea text-xs w-full" placeholder="- Handled frontend features using React&#10;- Improved app load times by 20%..."
                              value={exp.description} onChange={(e) => handleUpdateExperience(idx, "description", e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                      {experienceList.length === 0 && (
                        <p className="text-xs text-center py-4" style={{ color: "var(--text3)" }}>No experience entries added yet.</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab 3: Projects */}
              {activeTab === "projects" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                  
                  {/* New Project Form */}
                  <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                    <h3 className="text-sm font-extrabold mb-4" style={{ fontFamily: "var(--font-syne)" }}>Add New Project</h3>
                    <form onSubmit={handleAddProject} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Project Title</label>
                        <input
                          type="text" className="field-input text-xs" placeholder="e.g. Chat App Portfolio"
                          value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Project Link / GitHub</label>
                        <input
                          type="text" className="field-input text-xs" placeholder="e.g. https://github.com/my-project"
                          value={newProject.link} onChange={(e) => setNewProject({ ...newProject, link: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Project Description</label>
                        <textarea
                          rows={3} className="field-textarea text-xs w-full" placeholder="Built a fullstack chat app with WebSockets, React, and Node.js. Optimized for 100+ concurrent messages..."
                          value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        />
                      </div>

                      {/* Tech stack tags input */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text3)", fontFamily: "var(--font-syne)" }}>Technologies Used</label>
                        <div className="flex gap-2">
                          <input
                            type="text" className="field-input text-xs" placeholder="e.g. React"
                            value={techInput} onChange={(e) => setTechInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTechTag())}
                          />
                          <button
                            type="button" onClick={handleAddTechTag}
                            className="px-4 rounded-xl text-xs font-bold text-white border-none cursor-pointer"
                            style={{ background: "var(--accent)" }}
                          >
                            Add
                          </button>
                        </div>
                        {newProject.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {newProject.technologies.map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5"
                                style={{ background: "var(--surface2)", color: "var(--text2)", border: "0.5px solid var(--border)" }}
                              >
                                {t}
                                <span onClick={() => handleRemoveTechTag(idx)} className="cursor-pointer font-bold text-red-500">×</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="py-2.5 rounded-xl text-white font-bold text-xs border-none cursor-pointer mt-2"
                        style={{ background: "var(--accent)" }}
                      >
                        + Add Project to Resume
                      </button>
                    </form>
                  </div>

                  {/* Added Projects List */}
                  <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                    <h3 className="text-sm font-extrabold mb-4" style={{ fontFamily: "var(--font-syne)" }}>Completed Projects</h3>
                    <div className="flex flex-col gap-4">
                      {projectsList.map((proj, idx) => (
                        <div key={idx} className="p-4 rounded-xl border flex flex-col gap-2 relative" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                          <button
                            onClick={() => handleRemoveProject(idx)}
                            className="absolute top-3 right-3 text-xs font-semibold cursor-pointer border-none bg-transparent"
                            style={{ color: "var(--accent)" }}
                          >
                            Remove
                          </button>
                          <div className="text-xs font-bold" style={{ color: "var(--text)" }}>{proj.title}</div>
                          {proj.link && <a href={proj.link} target="_blank" className="text-[10px] text-blue-500 font-semibold truncate block" style={{ textDecoration: "none" }}>{proj.link}</a>}
                          <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>{proj.description}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {proj.technologies.map((tech) => (
                              <span key={tech} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-light)", color: "var(--accent2)" }}>
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {projectsList.length === 0 && (
                        <p className="text-xs text-center py-4" style={{ color: "var(--text3)" }}>No projects added yet. Add projects using the form above.</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab 4: Skills */}
              {activeTab === "skills" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                  <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                    <h3 className="text-sm font-extrabold mb-1" style={{ fontFamily: "var(--font-syne)" }}>Add Custom Skill</h3>
                    <p className="text-[10px] text-gray-500 mb-4">Auto-compiles profile skills and completed roadmap study topics. Add custom skills below.</p>
                    
                    <div className="flex gap-2">
                      <input
                        type="text" className="field-input text-xs" placeholder="e.g. Docker"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSkill((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
                    <h3 className="text-sm font-extrabold mb-4" style={{ fontFamily: "var(--font-syne)" }}>Verified & Profile Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {skillsList.map((skill) => (
                        <span
                          key={skill}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-2"
                          style={{ background: "var(--surface2)", color: "var(--text2)", border: "0.5px solid var(--border)" }}
                        >
                          {skill}
                          <span onClick={() => handleRemoveSkill(skill)} className="cursor-pointer font-bold text-red-500">×</span>
                        </span>
                      ))}
                      {skillsList.length === 0 && (
                        <p className="text-xs text-center py-4 w-full" style={{ color: "var(--text3)" }}>No skills listed. Type a skill and press Enter above.</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

            </div>

          </div>

          {/* Resume Preview Column (Right) */}
          <div className="flex flex-col gap-4 preview-column">
            
            {/* Action instructions bar */}
            <div className="rounded-xl p-4 flex items-center justify-between no-print" style={{ background: "var(--surface2)", border: "0.5px solid var(--border)" }}>
              <span className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
                📄 Live Resume Preview
              </span>
              <button
                onClick={handleDownloadPDF}
                disabled={downloadLoading}
                className="py-1 px-3 rounded-lg text-[10px] font-bold text-white cursor-pointer border-none"
                style={{ background: "var(--accent)" }}
              >
                {downloadLoading ? "Generating..." : "Download PDF ↗"}
              </button>
            </div>

            {/* Resume Sheet Preview */}
            <div
              ref={resumePreviewRef}
              className="rounded-xl p-8 preview-card flex flex-col"
              style={{
                background: "white",
                color: "#1a1612",
                boxShadow: "var(--shadow)",
                border: "0.5px solid var(--border)",
                minHeight: "842px", // standard A4 aspect ratio approximation
                fontFamily: "var(--font-dm)",
              }}
            >
              
              {/* Resume Sheet Content Wrapper */}
              <div className="resume-sheet flex-1 flex flex-col text-left">
                
                {/* ── Header ── */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: "#1a1612", fontFamily: "var(--font-syne)" }}>
                    {personal.name || "YOUR NAME"}
                  </h1>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
                    {user?.dream_job || "Professional"}
                  </p>
                  
                  {/* Contact detail line */}
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-gray-600 font-medium">
                    {personal.email && <span>{personal.email}</span>}
                    {personal.phone && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span>{personal.phone}</span>
                      </>
                    )}
                    {personal.linkedin && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span>{personal.linkedin}</span>
                      </>
                    )}
                    {personal.github && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span>{personal.github}</span>
                      </>
                    )}
                    {personal.portfolio && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span>{personal.portfolio}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Summary ── */}
                {personal.summary && (
                  <div className="mb-6 resume-section">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider mb-1.5 pb-1" style={{ color: "#1a1612", fontFamily: "var(--font-syne)", borderBottom: "1px solid #e5e5e5" }}>
                      Professional Summary
                    </h2>
                    <p className="text-xs leading-relaxed text-gray-700">{personal.summary}</p>
                  </div>
                )}

                {/* ── Skills ── */}
                {skillsList.length > 0 && (
                  <div className="mb-6 resume-section">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider mb-2 pb-1" style={{ color: "#1a1612", fontFamily: "var(--font-syne)", borderBottom: "1px solid #e5e5e5" }}>
                      Skills
                    </h2>
                    <div className="text-xs text-gray-700 leading-relaxed font-semibold">
                      {skillsList.join("  •  ")}
                    </div>
                  </div>
                )}

                {/* ── Work Experience ── */}
                {experienceList.length > 0 && (
                  <div className="mb-6 resume-section">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider mb-3 pb-1" style={{ color: "#1a1612", fontFamily: "var(--font-syne)", borderBottom: "1px solid #e5e5e5" }}>
                      Work Experience
                    </h2>
                    <div className="flex flex-col gap-4">
                      {experienceList.map((exp, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className="flex items-start justify-between text-xs">
                            <div>
                              <strong style={{ color: "#1a1612" }}>{exp.role || "Job Title"}</strong>
                              {exp.company && <span className="text-gray-500 font-medium"> at {exp.company}</span>}
                            </div>
                            <span className="text-gray-500 font-medium text-right shrink-0">
                              {exp.start_date && `${exp.start_date} – `}{exp.end_date}
                            </span>
                          </div>
                          {exp.location && <div className="text-[10px] text-gray-500 font-medium">{exp.location}</div>}
                          {exp.description && (
                            <ul className="text-xs text-gray-700 pl-4 list-disc flex flex-col gap-1 mt-1 leading-relaxed">
                              {exp.description.split("\n").filter(Boolean).map((bullet, i) => (
                                <li key={i}>{bullet.replace(/^-\s*/, "")}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Projects ── */}
                {projectsList.length > 0 && (
                  <div className="mb-6 resume-section">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider mb-3 pb-1" style={{ color: "#1a1612", fontFamily: "var(--font-syne)", borderBottom: "1px solid #e5e5e5" }}>
                      Key Projects
                    </h2>
                    <div className="flex flex-col gap-4">
                      {projectsList.map((proj, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className="flex items-start justify-between text-xs">
                            <div>
                              <strong style={{ color: "#1a1612" }}>{proj.title || "Project Title"}</strong>
                              {proj.technologies && proj.technologies.length > 0 && (
                                <span className="text-[10px] text-gray-500 font-medium"> ({proj.technologies.join(", ")})</span>
                              )}
                            </div>
                            {proj.link && (
                              <span className="text-[10px] text-blue-500 font-semibold max-w-[150px] truncate block text-right no-print">
                                {proj.link}
                              </span>
                            )}
                          </div>
                          {proj.description && (
                            <ul className="text-xs text-gray-700 pl-4 list-disc flex flex-col gap-1 leading-relaxed">
                              {proj.description.split("\n").filter(Boolean).map((bullet, i) => (
                                <li key={i}>{bullet.replace(/^-\s*/, "")}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Education ── */}
                {educationList.length > 0 && (
                  <div className="mb-6 resume-section">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider mb-3 pb-1" style={{ color: "#1a1612", fontFamily: "var(--font-syne)", borderBottom: "1px solid #e5e5e5" }}>
                      Education
                    </h2>
                    <div className="flex flex-col gap-3">
                      {educationList.map((edu, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5">
                          <div className="flex items-start justify-between text-xs">
                            <div>
                              <strong style={{ color: "#1a1612" }}>{edu.degree || "Degree"}</strong>
                              {edu.field_of_study && <span> in {edu.field_of_study}</span>}
                              {edu.institution && <span className="text-gray-500 font-medium">, {edu.institution}</span>}
                            </div>
                            <span className="text-gray-500 font-medium text-right shrink-0">
                              {edu.start_year && `${edu.start_year} – `}{edu.end_year}
                            </span>
                          </div>
                          {edu.grade && <div className="text-[10px] text-gray-500 font-semibold">Grade: {edu.grade}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Watermark at the bottom */}
                <div style={{ textAlign: "center", fontSize: "9px", color: "var(--text3)", marginTop: "auto", borderTop: "0.5px solid #e5e5e5", paddingTop: "12px", fontFamily: "var(--font-syne)" }}>
                  Powered by Vazhi<span style={{ color: "var(--accent)", fontWeight: "bold" }}>AI</span> — Career Guidance Resume Builder
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
