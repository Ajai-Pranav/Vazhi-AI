"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { store } from "@/lib/store";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getInitials } from "@/lib/utils";
import {
  generateStudyMaterial,
  getStudyMaterialHistory,
  getStudyMaterial,
  deleteStudyMaterial,
} from "@/lib/api";
import { StudyMaterialResponse, StudyMaterialListItem } from "@/types";

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

// ─── Sidebar Component ────────────────────────────────────────────────────────
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
                      className="spinner"
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
                      className="spinner"
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

// ─── Lightweight Markdown Parser ─────────────────────────────────────────────
function parseMarkdown(md: string): string {
  if (!md) return "";

  // Replace HTML special characters to prevent XSS
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Checklist tasks (- [ ] task or - [x] task)
  html = html.replace(/- \[\s*\]\s*(.*)/g, '<div class="flex items-center gap-2 mb-1.5"><input type="checkbox" disabled /> <span>$1</span></div>');
  html = html.replace(/- \[x\]\s*(.*)/g, '<div class="flex items-center gap-2 mb-1.5"><input type="checkbox" checked disabled /> <span class="line-through opacity-70">$1</span></div>');

  // Split into lines for headings, paragraphs, lists, tables
  const lines = html.split("\n");
  let result: string[] = [];
  let inList = false;
  let listType = ""; // "ul" or "ol"
  let inTable = false;
  let tableRows: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check list end
    if (inList && !line.startsWith("- ") && !/^\d+\.\s/.test(line) && !line.startsWith("<div class=\"flex")) {
      result.push(`</${listType}>`);
      inList = false;
      listType = "";
    }

    // Check table end
    if (inTable && !line.startsWith("|")) {
      result.push(buildTableHtml(tableRows));
      inTable = false;
      tableRows = [];
    }

    if (line.startsWith("## ")) {
      result.push(`<h2>${line.substring(3).trim()}</h2>`);
    } else if (line.startsWith("### ")) {
      result.push(`<h3>${line.substring(4).trim()}</h3>`);
    } else if (line.startsWith("- ") && !line.startsWith("<div class=\"flex")) {
      if (!inList || listType !== "ul") {
        if (inList) result.push(`</${listType}>`);
        result.push("<ul>");
        inList = true;
        listType = "ul";
      }
      result.push(`<li>${line.substring(2).trim()}</li>`);
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      const content = match ? match[2].trim() : line;
      if (!inList || listType !== "ol") {
        if (inList) result.push(`</${listType}>`);
        result.push("<ol>");
        inList = true;
        listType = "ol";
      }
      result.push(`<li>${content}</li>`);
    } else if (line.startsWith("<div class=\"flex")) {
      // It's a checklist item parsed above
      result.push(line);
    } else if (line.startsWith("|")) {
      inTable = true;
      tableRows.push(line);
    } else if (line === "") {
      // Empty line
    } else {
      result.push(`<p>${line}</p>`);
    }
  }

  // Close any open tags at EOF
  if (inList) result.push(`</${listType}>`);
  if (inTable) result.push(buildTableHtml(tableRows));

  return result.join("\n");
}

function buildTableHtml(rows: string[]): string {
  if (rows.length === 0) return "";
  let html = "<table>";
  const hasDivider = rows.length > 1 && rows[1].includes("-");
  const startIndex = hasDivider ? 2 : 1;

  // Header row
  const headerCols = rows[0]
    .split("|")
    .map((c) => c.trim())
    .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
  
  html += "<thead><tr>";
  headerCols.forEach((col) => {
    html += `<th>${col}</th>`;
  });
  html += "</tr></thead><tbody>";

  // Data rows
  for (let i = startIndex; i < rows.length; i++) {
    const cols = rows[i]
      .split("|")
      .map((c) => c.trim())
      .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
    
    html += "<tr>";
    cols.forEach((col) => {
      html += `<td>${col}</td>`;
    });
    html += "</tr>";
  }
  
  html += "</tbody></table>";
  return html;
}

// ─── Main Study Material Page Component ───────────────────────────────────────
export default function StudyMaterialPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  // State
  const [history, setHistory] = useState<StudyMaterialListItem[]>([]);
  const [activeMaterial, setActiveMaterial] = useState<StudyMaterialResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Form Inputs
  const [topics, setTopics] = useState<string[]>([]);
  const [currentTopic, setCurrentTopic] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced" | "Comprehensive">("Comprehensive");
  const [language, setLanguage] = useState("English");
  const [outputLength, setOutputLength] = useState<"Short" | "Medium" | "Detailed">("Detailed");

  // Show generate form or content preview
  const [viewMode, setViewMode] = useState<"form" | "preview">("form");

  // PDF Ref
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login");
      return;
    }
    if (user) {
      loadHistory();
    }
  }, [authLoading, user]);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await getStudyMaterialHistory();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load study history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddTopic = () => {
    const trimmed = currentTopic.trim();
    if (!trimmed) return;
    if (topics.includes(trimmed)) {
      setCurrentTopic("");
      return;
    }
    if (topics.length >= 5) {
      alert("A maximum of 5 topics are allowed.");
      return;
    }
    setTopics([...topics, trimmed]);
    setCurrentTopic("");
  };

  const handleRemoveTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  const handleKeyDownTopic = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTopic();
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topics.length === 0) {
      setError("Please add at least one topic to generate study material.");
      return;
    }
    setError(null);
    setGenerating(true);

    try {
      const response = await generateStudyMaterial({
        topics,
        education_level: educationLevel || undefined,
        difficulty,
        language,
        output_length: outputLength,
      });

      setActiveMaterial(response);
      setViewMode("preview");
      // Reload history in background
      loadHistory();
    } catch (err: any) {
      setError(err?.message || "Failed to generate study material. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleLoadDetails = async (id: string) => {
    setError(null);
    setGenerating(true);
    try {
      const details = await getStudyMaterial(id);
      setActiveMaterial(details);
      setTopics(details.topics);
      setDifficulty(details.difficulty as any);
      setLanguage(details.language);
      setOutputLength(details.output_length as any);
      setViewMode("preview");
    } catch (err: any) {
      setError(err?.message || "Failed to load study material details.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this study material?")) return;
    try {
      await deleteStudyMaterial(id);
      setHistory(history.filter(item => item.id !== id));
      if (activeMaterial?.id === id) {
        setActiveMaterial(null);
        setViewMode("form");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete item");
    }
  };

  const handleLogout = () => {
    logout();
    store.clear();
    router.push("/auth/login");
  };

  const handleCopyMarkdown = () => {
    if (!activeMaterial) return;
    navigator.clipboard.writeText(activeMaterial.markdown_content);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!activeMaterial || !previewRef.current) return;
    setDownloadingPdf(true);

    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      // We create a temporary element styled specifically for printing/exporting PDF,
      // to ensure perfect styling, alignment, watermark on each page, and high quality.
      const printContainer = document.createElement("div");
      printContainer.style.width = "750px";
      printContainer.style.padding = "40px";
      printContainer.style.background = "#ffffff";
      printContainer.style.color = "#1a1a1a";
      printContainer.style.fontFamily = "sans-serif";
      printContainer.style.position = "absolute";
      printContainer.style.left = "-9999px";
      printContainer.style.top = "0";

      // 1. Title Page
      const titlePage = document.createElement("div");
      titlePage.style.height = "1050px"; // approximate page height
      titlePage.style.display = "flex";
      titlePage.style.flexDirection = "column";
      titlePage.style.justifyContent = "center";
      titlePage.style.alignItems = "center";
      titlePage.style.textAlign = "center";
      titlePage.style.border = "2px solid #5a4fcf";
      titlePage.style.borderRadius = "12px";
      titlePage.style.margin = "20px";
      titlePage.style.padding = "40px";

      titlePage.innerHTML = `
        <div style="font-size: 16px; font-weight: 800; color: #5a4fcf; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px;">Study Material</div>
        <h1 style="font-size: 36px; font-weight: 800; margin-bottom: 16px; color: #111;">${activeMaterial.topics.join(", ")}</h1>
        <div style="font-size: 14px; color: #666; margin-bottom: 40px;">
          Difficulty: <strong>${activeMaterial.difficulty}</strong> &nbsp;|&nbsp; 
          Language: <strong>${activeMaterial.language}</strong>
        </div>
        <div style="width: 100px; height: 3px; background: #5a4fcf; margin-bottom: 40px;"></div>
        <div style="font-size: 13px; color: #999; margin-top: 100px;">
          Generated using <strong>VAZHI AI</strong>
        </div>
        <div style="font-size: 11px; color: #aaa; margin-top: 8px;">
          Date: ${new Date(activeMaterial.generated_at).toLocaleDateString()}
        </div>
      `;
      printContainer.appendChild(titlePage);

      // 2. Table of Contents
      const tocPage = document.createElement("div");
      tocPage.style.height = "1050px";
      tocPage.style.padding = "20px";
      
      // Parse headings for TOC
      const headings = activeMaterial.markdown_content
        .split("\n")
        .filter(line => line.startsWith("## "))
        .map(line => line.substring(3).trim());

      let tocListHtml = "";
      headings.forEach((heading, idx) => {
        tocListHtml += `
          <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 14px; border-bottom: 1px dashed #ddd; pb: 4px;">
            <span style="font-weight: 600; color: #111;">${idx + 1}. ${heading}</span>
            <span style="color: #666;">Page ${idx + 2}</span>
          </div>
        `;
      });

      tocPage.innerHTML = `
        <h2 style="font-size: 24px; font-weight: 800; color: #111; margin-bottom: 30px; border-bottom: 2px solid #5a4fcf; padding-bottom: 8px;">Table of Contents</h2>
        <div style="margin-top: 20px;">
          ${tocListHtml}
        </div>
        <div style="margin-top: 100px; font-size: 11px; color: #999; text-align: center;">
          Generated using VAZHI AI
        </div>
      `;
      printContainer.appendChild(tocPage);

      // 3. Document Sections
      const rawHtml = parseMarkdown(activeMaterial.markdown_content);
      const tempWrapper = document.createElement("div");
      tempWrapper.innerHTML = rawHtml;

      // Extract all children (h2, h3, p, pre, ul, ol, table)
      // We will place them into pages, ensuring we don't break items weirdly
      const elements = Array.from(tempWrapper.children);
      
      let currentPage = document.createElement("div");
      currentPage.style.padding = "20px";
      currentPage.style.minHeight = "1050px";
      currentPage.style.position = "relative";
      printContainer.appendChild(currentPage);

      let currentHeight = 0;
      const maxHeight = 920; // safe printable area height in pixels

      // Simple HTML styling mappings for PDF export
      elements.forEach((el) => {
        const clone = el.cloneNode(true) as HTMLElement;
        
        // Apply offline print styles to cloned element
        if (clone.tagName === "H2") {
          clone.style.fontSize = "20px";
          clone.style.fontWeight = "800";
          clone.style.color = "#5a4fcf";
          clone.style.marginTop = "28px";
          clone.style.marginBottom = "14px";
          clone.style.borderBottom = "1px solid #eee";
          clone.style.paddingBottom = "6px";
        } else if (clone.tagName === "H3") {
          clone.style.fontSize = "16px";
          clone.style.fontWeight = "700";
          clone.style.color = "#333";
          clone.style.marginTop = "20px";
          clone.style.marginBottom = "10px";
        } else if (clone.tagName === "P") {
          clone.style.fontSize = "12px";
          clone.style.lineHeight = "1.6";
          clone.style.color = "#333";
          clone.style.marginBottom = "12px";
        } else if (clone.tagName === "PRE") {
          clone.style.background = "#f4f5f8";
          clone.style.border = "1px solid #e1e3ea";
          clone.style.padding = "12px";
          clone.style.borderRadius = "6px";
          clone.style.overflowX = "auto";
          clone.style.marginBottom = "14px";
          
          const codeEl = clone.querySelector("code");
          if (codeEl) {
            codeEl.style.fontFamily = "monospace";
            codeEl.style.fontSize = "10.5px";
            codeEl.style.color = "#a71d5d";
            codeEl.style.background = "transparent";
          }
        } else if (clone.tagName === "TABLE") {
          clone.style.width = "100%";
          clone.style.borderCollapse = "collapse";
          clone.style.marginBottom = "16px";
          clone.style.fontSize = "11px";
          
          const cells = clone.querySelectorAll("th, td");
          cells.forEach((cell: any) => {
            cell.style.border = "1px solid #ddd";
            cell.style.padding = "8px";
          });
          const ths = clone.querySelectorAll("th");
          ths.forEach((th: any) => {
            th.style.background = "#f4f5f8";
            th.style.fontWeight = "bold";
          });
        } else {
          clone.style.fontSize = "12px";
          clone.style.lineHeight = "1.6";
          clone.style.color = "#333";
          clone.style.marginBottom = "12px";
        }

        // Add to temp wrapper to measure height
        document.body.appendChild(clone);
        const elHeight = clone.offsetHeight;
        document.body.removeChild(clone);

        if (currentHeight + elHeight > maxHeight) {
          // Add page number & watermark footer to current page before starting a new one
          const footer = document.createElement("div");
          footer.style.display = "flex";
          footer.style.justifyContent = "space-between";
          footer.style.fontSize = "10px";
          footer.style.color = "#999";
          footer.style.borderTop = "0.5px solid #eee";
          footer.style.paddingTop = "10px";
          footer.style.marginTop = "20px";
          footer.innerHTML = `
            <span>VAZHI AI &mdash; Study Material</span>
            <span>Generated using VAZHI AI</span>
          `;
          currentPage.appendChild(footer);

          // Add diagonal background watermark text
          const printWatermark = document.createElement("div");
          printWatermark.style.position = "absolute";
          printWatermark.style.top = "50%";
          printWatermark.style.left = "50%";
          printWatermark.style.transform = "translate(-50%, -50%) rotate(-30deg)";
          printWatermark.style.fontSize = "48px";
          printWatermark.style.fontWeight = "900";
          printWatermark.style.color = "rgba(90, 79, 207, 0.03)";
          printWatermark.style.zIndex = "-1";
          printWatermark.style.pointerEvents = "none";
          printWatermark.innerText = "VAZHI AI";
          currentPage.appendChild(printWatermark);

          // Break page
          currentPage = document.createElement("div");
          currentPage.style.padding = "20px";
          currentPage.style.minHeight = "1050px";
          currentPage.style.position = "relative";
          printContainer.appendChild(currentPage);
          currentHeight = 0;
        }

        currentPage.appendChild(clone);
        currentHeight += elHeight;
      });

      // Add footer & watermark to the final content page
      const lastFooter = document.createElement("div");
      lastFooter.style.display = "flex";
      lastFooter.style.justifyContent = "space-between";
      lastFooter.style.fontSize = "10px";
      lastFooter.style.color = "#999";
      lastFooter.style.borderTop = "0.5px solid #eee";
      lastFooter.style.paddingTop = "10px";
      lastFooter.style.marginTop = "20px";
      lastFooter.innerHTML = `
        <span>VAZHI AI &mdash; Study Material</span>
        <span>Generated using VAZHI AI</span>
      `;
      currentPage.appendChild(lastFooter);

      const lastWatermark = document.createElement("div");
      lastWatermark.style.position = "absolute";
      lastWatermark.style.top = "50%";
      lastWatermark.style.left = "50%";
      lastWatermark.style.transform = "translate(-50%, -50%) rotate(-30deg)";
      lastWatermark.style.fontSize = "48px";
      lastWatermark.style.fontWeight = "900";
      lastWatermark.style.color = "rgba(90, 79, 207, 0.03)";
      lastWatermark.style.zIndex = "-1";
      lastWatermark.style.pointerEvents = "none";
      lastWatermark.innerText = "VAZHI AI";
      currentPage.appendChild(lastWatermark);

      // Add a distinct final watermark block at the very end of the content
      const endWatermarkBlock = document.createElement("div");
      endWatermarkBlock.style.marginTop = "40px";
      endWatermarkBlock.style.padding = "20px";
      endWatermarkBlock.style.border = "1px solid #e1e3ea";
      endWatermarkBlock.style.borderRadius = "8px";
      endWatermarkBlock.style.background = "#fdfdfd";
      endWatermarkBlock.style.textAlign = "center";
      endWatermarkBlock.innerHTML = `
        <div style="font-size: 14px; font-weight: 700; color: #5a4fcf; margin-bottom: 4px;">VAZHI AI</div>
        <div style="font-size: 11px; color: #777;">Material generated using "VAZHI AI" Study Generator</div>
      `;
      currentPage.appendChild(endWatermarkBlock);

      document.body.appendChild(printContainer);

      // Generate PDF page-by-page from printContainer children
      const doc = new jsPDF("p", "pt", "a4");
      const pdfPages = Array.from(printContainer.children).filter(el => el.tagName === "DIV");

      for (let index = 0; index < pdfPages.length; index++) {
        const pageEl = pdfPages[index] as HTMLElement;
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/png");
        
        if (index > 0) {
          doc.addPage();
        }

        // A4 dimension: 595.28 x 841.89 pt
        doc.addImage(imgData, "PNG", 0, 0, 595.28, 841.89);
      }

      const safeName = activeMaterial.topics.join("_").replace(/[^a-zA-Z0-9_]/g, "");
      doc.save(`VAZHI_AI_Study_${safeName}.pdf`);

      document.body.removeChild(printContainer);
    } catch (err: any) {
      console.error(err);
      alert("Failed to export PDF: " + (err.message || err));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getDifficultyClass = (diff: string) => {
    const d = diff.toLowerCase();
    if (d.includes("beginner")) return "diff-beginner";
    if (d.includes("advanced")) return "diff-advanced";
    return "diff-intermediate";
  };

  // Auth loading state
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2, borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar
        activeLabel="Study Material"
        userName={user.name || "User"}
        initials={getInitials(user.name || "User")}
        userStatus={user.educational_status || "Student"}
        onLogout={handleLogout}
      />

      {/* Main Panel */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto" style={{ background: "var(--bg)" }}>
        {/* Header */}
        <header
          className="flex items-center px-8 py-4 sticky top-0 z-40"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--header-bg)", backdropFilter: "blur(16px)" }}
        >
          <div className="mr-auto">
            <h1 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
              📚 Study Material <span style={{ color: "var(--accent)" }}>Generator</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main workspace */}
          <div className="flex-1 overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              {viewMode === "form" ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-xl mx-auto"
                >
                  <div
                    className="p-8 rounded-[20px] shadow-lg border"
                    style={{ background: "var(--surface)", borderColor: "var(--border2)" }}
                  >
                    <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-syne)" }}>
                      Create Custom Material
                    </h2>
                    <p className="text-sm text-gray-400 mb-6" style={{ color: "var(--text3)" }}>
                      Input one or more topics below. Our AI will compile an exhaustive study manual, including practical examples, misconceptions, key takeaways, and test questions.
                    </p>

                    <form onSubmit={handleGenerate} className="flex flex-col gap-5">
                      {/* Topic Tags Input */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>
                          Study Topics (1 to 5)
                        </label>
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            placeholder="e.g. Python Asyncio, REST APIs"
                            value={currentTopic}
                            onChange={(e) => setCurrentTopic(e.target.value)}
                            onKeyDown={handleKeyDownTopic}
                            disabled={generating}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm"
                            style={{
                              background: "var(--surface2)",
                              border: "1px solid var(--border2)",
                              color: "var(--text)",
                              outline: "none",
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddTopic}
                            disabled={generating}
                            className="px-4 rounded-xl text-sm font-semibold transition-all"
                            style={{
                              background: "var(--accent-light)",
                              color: "var(--accent)",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            + Add
                          </button>
                        </div>

                        {/* Tag Chips */}
                        <div className="flex flex-wrap gap-2 min-h-[32px]">
                          {topics.map((t, idx) => (
                            <span key={idx} className="tag-chip">
                              {t}
                              <button
                                type="button"
                                onClick={() => handleRemoveTopic(idx)}
                                className="tag-chip-remove"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                          {topics.length === 0 && (
                            <span className="text-xs text-gray-500 italic" style={{ color: "var(--text3)" }}>No topics added yet</span>
                          )}
                        </div>
                      </div>

                      {/* Education Level (Optional) */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>
                          Education Level (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. High School, Graduate, Professional"
                          value={educationLevel}
                          onChange={(e) => setEducationLevel(e.target.value)}
                          disabled={generating}
                          className="w-full px-4 py-2.5 rounded-xl text-sm"
                          style={{
                            background: "var(--surface2)",
                            border: "1px solid var(--border2)",
                            color: "var(--text)",
                            outline: "none",
                          }}
                        />
                      </div>

                      {/* Difficulty Select */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>
                          Difficulty Level
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {(["Beginner", "Intermediate", "Advanced", "Comprehensive"] as const).map((diff) => (
                            <button
                              key={diff}
                              type="button"
                              onClick={() => setDifficulty(diff)}
                              className="py-2 rounded-xl text-xs font-semibold border transition-all"
                              style={{
                                background: difficulty === diff ? "var(--accent)" : "transparent",
                                color: difficulty === diff ? "#ffffff" : "var(--text2)",
                                borderColor: difficulty === diff ? "var(--accent)" : "var(--border2)",
                                cursor: "pointer",
                              }}
                            >
                              {diff}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Output Length */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>
                          Manual Length
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["Short", "Medium", "Detailed"] as const).map((len) => (
                            <button
                              key={len}
                              type="button"
                              onClick={() => setOutputLength(len)}
                              className="py-2 rounded-xl text-xs font-semibold border transition-all"
                              style={{
                                background: outputLength === len ? "var(--accent)" : "transparent",
                                color: outputLength === len ? "#ffffff" : "var(--text2)",
                                borderColor: outputLength === len ? "var(--accent)" : "var(--border2)",
                                cursor: "pointer",
                              }}
                            >
                              {len}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Language */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>
                          Preferred Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          disabled={generating}
                          className="w-full px-4 py-2.5 rounded-xl text-sm"
                          style={{
                            background: "var(--surface2)",
                            border: "1px solid var(--border2)",
                            color: "var(--text)",
                            outline: "none",
                          }}
                        >
                          <option value="English">English</option>
                          <option value="Spanish">Spanish</option>
                          <option value="French">French</option>
                          <option value="German">German</option>
                          <option value="Tamil">Tamil</option>
                          <option value="Hindi">Hindi</option>
                          <option value="Malayalam">Malayalam</option>
                        </select>
                      </div>

                      {error && (
                        <div className="text-sm p-3 rounded-xl" style={{ background: "rgba(220,53,69,0.1)", color: "var(--rose)", border: "0.5px solid rgba(220,53,69,0.2)" }}>
                          ⚠️ {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={generating || topics.length === 0}
                        className="w-full py-3 rounded-xl font-bold transition-all text-white mt-2"
                        style={{
                          background: "var(--accent)",
                          boxShadow: "var(--shadow-accent)",
                          cursor: (generating || topics.length === 0) ? "not-allowed" : "pointer",
                          opacity: (generating || topics.length === 0) ? 0.6 : 1,
                        }}
                      >
                        {generating ? (
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className="spinner"
                              style={{
                                display: "inline-block",
                                width: 14,
                                height: 14,
                                border: "2px solid rgba(255,255,255,0.3)",
                                borderTopColor: "#fff",
                                borderRadius: "50%",
                                animation: "spin 0.7s linear infinite",
                              }}
                            />
                            Generating study manual...
                          </div>
                        ) : (
                          "✦ Generate Study Material"
                        )}
                      </button>
                    </form>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-4xl mx-auto"
                >
                  {/* Preview Toolbar */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border mb-6"
                    style={{ background: "var(--surface)", borderColor: "var(--border2)" }}
                  >
                    <button
                      onClick={() => setViewMode("form")}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: "transparent",
                        border: "1px solid var(--border2)",
                        color: "var(--text2)",
                        cursor: "pointer",
                      }}
                    >
                      &larr; Create New
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyMarkdown}
                        className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background: "transparent",
                          border: "1px solid var(--border2)",
                          color: "var(--text2)",
                          cursor: "pointer",
                        }}
                      >
                        {copySuccess ? "✓ Copied!" : "📋 Copy Markdown"}
                      </button>

                      <button
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2"
                        style={{
                          background: "var(--accent)",
                          boxShadow: "var(--shadow-accent)",
                          cursor: downloadingPdf ? "not-allowed" : "pointer",
                        }}
                      >
                        {downloadingPdf ? (
                          <>
                            <span
                              className="spinner"
                              style={{
                                display: "inline-block",
                                width: 12,
                                height: 12,
                                border: "1.5px solid rgba(255,255,255,0.3)",
                                borderTopColor: "#fff",
                                borderRadius: "50%",
                                animation: "spin 0.7s linear infinite",
                              }}
                            />
                            Assembling PDF...
                          </>
                        ) : (
                          "📥 Download PDF"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Document Container */}
                  {activeMaterial && (
                    <div
                      className="p-10 rounded-[24px] border relative watermark-container"
                      style={{ background: "var(--surface)", borderColor: "var(--border2)" }}
                    >
                      {/* Diagonal screen preview watermark */}
                      <div className="screen-watermark">VAZHI AI</div>

                      {/* Header block info */}
                      <div className="mb-8 border-b pb-6" style={{ borderColor: "var(--border)" }}>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 ${getDifficultyClass(activeMaterial.difficulty)}`}>
                          {activeMaterial.difficulty}
                        </span>
                        <h1 className="text-3xl font-extrabold mb-3 leading-tight" style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}>
                          {activeMaterial.topics.join(", ")}
                        </h1>
                        <p className="text-xs font-medium" style={{ color: "var(--text3)" }}>
                          Output Size: <strong>{activeMaterial.output_length}</strong> &nbsp;|&nbsp; 
                          Language: <strong>{activeMaterial.language}</strong> &nbsp;|&nbsp;
                          Created: <strong>{new Date(activeMaterial.generated_at).toLocaleDateString()}</strong>
                        </p>
                      </div>

                      {/* Main Prose Content */}
                      <div
                        ref={previewRef}
                        className="study-prose"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(activeMaterial.markdown_content) }}
                      />

                      {/* End Watermark Footer */}
                      <div
                        className="mt-12 pt-6 border-t text-center text-xs font-medium"
                        style={{ borderColor: "var(--border)", color: "var(--text3)" }}
                      >
                        Material generated using &ldquo;VAZHI AI&rdquo; Study Material Generator.
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History Sidebar Panel */}
          <div
            className="w-72 border-l flex flex-col"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-syne)" }}>
                Generation History
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {loadingHistory ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-16 rounded-xl shimmer-bg" />
                ))
              ) : history.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-500 italic" style={{ color: "var(--text3)" }}>
                  No manuals generated yet.
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadDetails(item.id)}
                    className="p-3.5 rounded-xl border transition-all hover:-translate-y-0.5 cursor-pointer flex flex-col gap-2 group relative"
                    style={{
                      background: activeMaterial?.id === item.id ? "var(--surface2)" : "var(--surface)",
                      borderColor: activeMaterial?.id === item.id ? "var(--accent)" : "var(--border2)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-bold truncate pr-6" style={{ color: "var(--text)" }}>
                        {item.topics.join(", ")}
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, item.id)}
                        className="opacity-0 group-hover:opacity-100 absolute top-3 right-3 text-xs font-bold text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer transition-all"
                      >
                        &times;
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--text3)" }}>
                      <span className="font-semibold">{item.difficulty}</span>
                      <span>{new Date(item.generated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
