"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiCompleteOnboarding } from "@/lib/api";
import { useAuth, type AuthUser } from "@/lib/auth";
import {
  FIELD_OPTIONS, EXPERIENCE_LEVELS, CAREER_GOALS_BY_FIELD,
  EDUCATIONAL_STATUS_OPTIONS, DOMAIN_TOOLS,
} from "@/lib/constants";
import type { EducationalStatus, UserField, ExperienceLevel, BroadOnboardingRequest } from "@/types";

const TOTAL_STEPS = 5;

type StepData = Partial<BroadOnboardingRequest>;

export default function OnboardingPage() {
  const router = useRouter();
  const { updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<StepData>({
    tech_stack: [],
    known_tools: [],
    target_skills: [],
  });

  const update = (patch: Partial<StepData>) => setData(prev => ({ ...prev, ...patch }));

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep(s => Math.max(s - 1, 1));

  const canProceed = () => {
    if (step === 1) return !!data.educational_status;
    if (step === 2) return !!data.field;
    if (step === 3) return !!data.dream_job && !!data.experience_level;
    if (step === 4) return true; // Tools — optional
    if (step === 5) return true; // Review
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const payload: BroadOnboardingRequest = {
        educational_status: data.educational_status as EducationalStatus,
        field: data.field as UserField,
        dream_job: data.dream_job!,
        custom_goal: data.custom_goal,
        experience_level: data.experience_level as ExperienceLevel,
        confusion: data.confusion,
        tech_stack: data.tech_stack || [],
        known_tools: data.known_tools || [],
        target_skills: data.target_skills || [],
        age: data.age,
        college: data.college,
        course: data.course,
        current_year: data.current_year,
        total_years: data.total_years,
        current_company: data.current_company,
        years_of_experience: data.years_of_experience,
        current_role: data.current_role,
      };
      const updatedUser = await apiCompleteOnboarding(payload);
      updateUser({ ...updatedUser, has_profile: true } as unknown as AuthUser);
      router.push("/get-started");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
    >
      {/* Blobs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -100, left: -100, width: 380, height: 380,
          background: "radial-gradient(circle, var(--glow2-color) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: -80, right: -60, width: 300, height: 300,
          background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />

      <div className="w-full max-w-2xl z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-block text-3xl font-extrabold mb-3"
            style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
          >
            Vazhi<span style={{ color: "var(--accent)" }}>AI</span>
          </div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
          >
            Let&apos;s personalize your path
          </h1>
          <p className="text-sm" style={{ color: "var(--text2)" }}>Step {step} of {TOTAL_STEPS}</p>
        </div>

        {/* Progress bar */}
        <div
          className="w-full rounded-full h-1.5 mb-8"
          style={{ background: "var(--surface2)", border: "0.5px solid var(--border)" }}
        >
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: "var(--accent)" }}
          />
        </div>

        {/* Step card */}
        <div
          className="rounded-[20px] p-8"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border2)",
            boxShadow: "var(--shadow2)",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* ── Step 1: Educational Status ─────────────────────────────── */}
              {step === 1 && (
                <div>
                  <h2
                    className="text-xl font-bold mb-2"
                    style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
                  >
                    What describes you best?
                  </h2>
                  <p className="mb-6 text-xs" style={{ color: "var(--text2)" }}>
                    We&apos;ll tailor your roadmap based on your current situation.
                  </p>
                  <div className="grid gap-3">
                    {EDUCATIONAL_STATUS_OPTIONS.map(status => {
                      const isSelected = data.educational_status === status;
                      return (
                        <motion.button
                          key={status}
                          onClick={() => update({ educational_status: status })}
                          className="w-full text-left px-5 py-4 rounded-xl border transition-all cursor-pointer"
                          style={{
                            border: isSelected ? "1.5px solid var(--accent)" : "0.5px solid var(--border2)",
                            background: isSelected ? "var(--accent-light)" : "var(--surface2)",
                            color: isSelected ? "var(--accent2)" : "var(--text)",
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        >
                          <div className="font-semibold text-sm">{status}</div>
                          <div
                            className="text-xs mt-0.5"
                            style={{ color: isSelected ? "var(--accent)" : "var(--text3)" }}
                          >
                            {status === "Student" && "Currently enrolled in college/university"}
                            {status === "Working Professional" && "Currently employed, looking to upskill or switch"}
                            {status === "Job Seeker" && "Looking for your next opportunity"}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Step 2: Field / Department ────────────────────────────── */}
              {step === 2 && (
                <div>
                  <h2
                    className="text-xl font-bold mb-2"
                    style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
                  >
                    What&apos;s your field?
                  </h2>
                  <p className="mb-6 text-xs" style={{ color: "var(--text2)" }}>
                    This determines the tools, platforms, and resources we recommend.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {FIELD_OPTIONS.map(f => {
                      const isSelected = data.field === f.value;
                      return (
                        <button
                          key={f.value}
                          onClick={() => update({ field: f.value, dream_job: undefined })}
                          className="text-left px-4 py-4 rounded-xl border transition-all cursor-pointer"
                          style={{
                            border: isSelected ? "1.5px solid var(--accent)" : "0.5px solid var(--border2)",
                            background: isSelected ? "var(--accent-light)" : "var(--surface2)",
                            color: isSelected ? "var(--accent2)" : "var(--text)",
                          }}
                        >
                          <div className="text-2xl mb-1">{f.icon}</div>
                          <div className="font-semibold text-sm">{f.label}</div>
                          <div
                            className="text-xs mt-0.5"
                            style={{ color: isSelected ? "var(--accent)" : "var(--text3)" }}
                          >
                            {f.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Context fields for Student */}
                  {data.educational_status === "Student" && data.field && (
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <input
                        placeholder="College / University"
                        className="col-span-2 field-input"
                        value={data.college || ""}
                        onChange={e => update({ college: e.target.value })}
                      />
                      <input
                        placeholder="Course / Degree (e.g. B.Tech)"
                        className="field-input"
                        value={data.course || ""}
                        onChange={e => update({ course: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <input
                          placeholder="Year"
                          type="number"
                          min={1} max={6}
                          className="w-1/2 field-input"
                          value={data.current_year || ""}
                          onChange={e => update({ current_year: parseInt(e.target.value) || undefined })}
                        />
                        <input
                          placeholder="of"
                          type="number"
                          min={2} max={6}
                          className="w-1/2 field-input"
                          value={data.total_years || ""}
                          onChange={e => update({ total_years: parseInt(e.target.value) || undefined })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Context fields for Professional / Job Seeker */}
                  {(data.educational_status === "Working Professional" || data.educational_status === "Job Seeker") && data.field && (
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <input
                        placeholder="Current / Last Role"
                        className="field-input"
                        value={data.current_role || ""}
                        onChange={e => update({ current_role: e.target.value })}
                      />
                      <input
                        placeholder="Years of Experience"
                        type="number"
                        min={0}
                        className="field-input"
                        value={data.years_of_experience || ""}
                        onChange={e => update({ years_of_experience: parseInt(e.target.value) || 0 })}
                      />
                      {data.educational_status === "Working Professional" && (
                        <input
                          placeholder="Current Company"
                          className="col-span-2 field-input"
                          value={data.current_company || ""}
                          onChange={e => update({ current_company: e.target.value })}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 3: Goal + Experience Level ──────────────────────── */}
              {step === 3 && (
                <div>
                  <h2
                    className="text-xl font-bold mb-2"
                    style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
                  >
                    Where do you want to go?
                  </h2>
                  <p className="mb-6 text-xs" style={{ color: "var(--text2)" }}>
                    Select your career goal and current skill level.
                  </p>

                  <div className="mb-5">
                    <label
                      className="text-xs font-bold tracking-widest uppercase mb-3 block"
                      style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}
                    >
                      Career Goal
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(data.field ? CAREER_GOALS_BY_FIELD[data.field] : []).map(goal => {
                        const isSelected = data.dream_job === goal.value;
                        return (
                          <button
                            key={goal.value}
                            onClick={() => update({ dream_job: goal.value, custom_goal: goal.value === "Custom Goal" ? "" : undefined })}
                            className="text-left px-4 py-3 rounded-xl border text-sm transition-all cursor-pointer font-medium"
                            style={{
                              border: isSelected ? "1.5px solid var(--accent)" : "0.5px solid var(--border2)",
                              background: isSelected ? "var(--accent-light)" : "var(--surface2)",
                              color: isSelected ? "var(--accent2)" : "var(--text)",
                            }}
                          >
                            {goal.label}
                          </button>
                        );
                      })}
                    </div>
                    {data.dream_job === "Custom Goal" && (
                      <input
                        placeholder="Describe your goal..."
                        className="mt-3 w-full field-input"
                        value={data.custom_goal || ""}
                        onChange={e => update({ custom_goal: e.target.value })}
                        autoFocus
                      />
                    )}
                  </div>

                  <div>
                    <label
                      className="text-xs font-bold tracking-widest uppercase mb-3 block"
                      style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}
                    >
                      Experience Level
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {EXPERIENCE_LEVELS.map(lvl => {
                        const isSelected = data.experience_level === lvl.value;
                        return (
                          <button
                            key={lvl.value}
                            onClick={() => update({ experience_level: lvl.value })}
                            className="text-left px-4 py-3 rounded-xl border text-sm transition-all cursor-pointer"
                            style={{
                              border: isSelected ? "1.5px solid var(--teal)" : "0.5px solid var(--border2)",
                              background: isSelected ? "var(--teal-light)" : "var(--surface2)",
                              color: isSelected ? "var(--teal)" : "var(--text)",
                            }}
                          >
                            <div className="font-semibold">{lvl.label}</div>
                            <div
                              className="text-xs mt-0.5"
                              style={{ color: isSelected ? "var(--teal)" : "var(--text3)" }}
                            >
                              {lvl.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 4: Tools + Confusion ─────────────────────────────── */}
              {step === 4 && (
                <div>
                  <h2
                    className="text-xl font-bold mb-2"
                    style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
                  >
                    What do you already know?
                  </h2>
                  <p className="mb-6 text-xs" style={{ color: "var(--text2)" }}>
                    Select recommended skills you know, or add your own.
                  </p>

                  {data.field && (() => {
                    const recommended = DOMAIN_TOOLS[data.field] || [];
                    const customSkills = (data.known_tools || []).filter(t => !recommended.includes(t));

                    return (
                      <div className="mb-5">
                        <label
                          className="text-xs font-bold tracking-widest uppercase mb-3 block"
                          style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}
                        >
                          Recommended for {data.field}
                        </label>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {recommended.map(tool => {
                            const selected = (data.known_tools || []).includes(tool);
                            return (
                              <button
                                key={tool}
                                onClick={() => {
                                  const current = data.known_tools || [];
                                  update({
                                    known_tools: selected
                                      ? current.filter(t => t !== tool)
                                      : [...current, tool],
                                    tech_stack: selected
                                      ? (data.tech_stack || []).filter(t => t !== tool)
                                      : [...(data.tech_stack || []), tool],
                                  });
                                }}
                                className="px-3 py-1.5 rounded-lg text-sm transition-all cursor-pointer font-medium"
                                style={{
                                  border: selected ? "1px solid var(--teal)" : "0.5px solid var(--border2)",
                                  background: selected ? "var(--teal-light)" : "var(--surface2)",
                                  color: selected ? "var(--teal)" : "var(--text2)",
                                }}
                              >
                                {selected ? "✓ " : ""}{tool}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom skill chips */}
                        {customSkills.length > 0 && (
                          <div className="mb-3">
                            <label
                              className="text-xs font-bold tracking-widest uppercase mb-2 block"
                              style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}
                            >
                              Your added skills
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {customSkills.map(skill => (
                                <span
                                  key={skill}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                                  style={{
                                    border: "1px solid var(--accent)",
                                    background: "var(--accent-light)",
                                    color: "var(--accent2)",
                                  }}
                                >
                                  {skill}
                                  <button
                                    onClick={() => {
                                      update({
                                        known_tools: (data.known_tools || []).filter(t => t !== skill),
                                        tech_stack: (data.tech_stack || []).filter(t => t !== skill),
                                      });
                                    }}
                                    className="ml-0.5 text-xs font-bold rounded-full flex items-center justify-center"
                                    style={{
                                    width: 16, height: 16,
                                      background: "var(--accent-light)",
                                      color: "var(--accent)",
                                      border: "none",
                                      cursor: "pointer",
                                      lineHeight: 1,
                                    }}
                                    aria-label={`Remove ${skill}`}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add custom skill input */}
                        <div className="flex gap-2 items-center">
                          <input
                            id="custom-skill-input"
                            type="text"
                            placeholder="Add a skill not listed above..."
                            className="flex-1 field-input"
                            style={{ marginBottom: 0 }}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const input = e.currentTarget;
                                const val = input.value.trim();
                                if (val && !(data.known_tools || []).some(t => t.toLowerCase() === val.toLowerCase())) {
                                  update({
                                    known_tools: [...(data.known_tools || []), val],
                                    tech_stack: [...(data.tech_stack || []), val],
                                  });
                                  input.value = "";
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById("custom-skill-input") as HTMLInputElement;
                              const val = input?.value.trim();
                              if (val && !(data.known_tools || []).some(t => t.toLowerCase() === val.toLowerCase())) {
                                update({
                                  known_tools: [...(data.known_tools || []), val],
                                  tech_stack: [...(data.tech_stack || []), val],
                                });
                                input.value = "";
                                input.focus();
                              }
                            }}
                            className="px-4 py-2.5 rounded-xl text-sm font-semibold border-none cursor-pointer shrink-0"
                            style={{
                              background: "var(--accent)",
                              color: "#fff",
                              fontFamily: "var(--font-syne)",
                              boxShadow: "var(--shadow-accent)",
                            }}
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label
                      className="text-xs font-bold tracking-widest uppercase mb-3 block"
                      style={{ color: "var(--text2)", fontFamily: "var(--font-syne)" }}
                    >
                      What&apos;s your biggest challenge or confusion right now? <span style={{ color: "var(--text3)" }}>(optional)</span>
                    </label>
                    <textarea
                      placeholder={`E.g. "I don't know where to start with ${data.dream_job === "Custom Goal" ? (data.custom_goal || 'my goal') : (data.dream_job || 'my goal')}" or "I'm confused between different career paths"`}
                      className="w-full field-textarea resize-none"
                      rows={3}
                      value={data.confusion || ""}
                      onChange={e => update({ confusion: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* ── Step 5: Review ────────────────────────────────────────── */}
              {step === 5 && (
                <div>
                  <h2
                    className="text-xl font-bold mb-2"
                    style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
                  >
                    Review your profile
                  </h2>
                  <p className="mb-6 text-xs" style={{ color: "var(--text2)" }}>
                    Looks good? We&apos;ll generate personalized career paths for you.
                  </p>

                  <div className="space-y-3">
                    {[
                      { label: "Status", value: data.educational_status },
                      { label: "Field", value: data.field },
                      { label: "Career Goal", value: data.dream_job === "Custom Goal" ? data.custom_goal : data.dream_job },
                      { label: "Experience Level", value: data.experience_level },
                      ...(data.college ? [{ label: "College", value: data.college }] : []),
                      ...(data.current_role ? [{ label: "Current Role", value: data.current_role }] : []),
                      ...(data.known_tools?.length ? [{ label: "Known Tools", value: data.known_tools.join(", ") }] : []),
                      ...(data.confusion ? [{ label: "Biggest Challenge", value: data.confusion }] : []),
                    ].map(item => (
                      <div
                        key={item.label}
                        className="flex items-start gap-3 rounded-xl px-4 py-3"
                        style={{ background: "var(--surface2)", border: "0.5px solid var(--border)" }}
                      >
                        <span className="text-xs font-semibold w-32 shrink-0" style={{ color: "var(--text2)" }}>{item.label}</span>
                        <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{item.value || "—"}</span>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <div
                      className="mt-4 border rounded-xl px-4 py-3 text-sm"
                      style={{ background: "var(--accent-light)", color: "var(--accent)", borderColor: "var(--accent-glow)" }}
                    >
                      {error}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={back}
              disabled={step === 1}
              className="px-5 py-2.5 rounded-xl border transition-all text-sm font-semibold"
              style={{
                borderColor: "var(--border2)",
                color: "var(--text2)",
                background: "var(--surface2)",
                cursor: step === 1 ? "not-allowed" : "pointer",
                opacity: step === 1 ? 0.3 : 1,
                fontFamily: "var(--font-syne)"
              }}
            >
              ← Back
            </button>

            {step < TOTAL_STEPS ? (
              <button
                onClick={next}
                disabled={!canProceed()}
                className="px-6 py-2.5 rounded-2xl text-white font-semibold text-sm transition-all"
                style={{
                  background: !canProceed() ? "var(--text3)" : "var(--accent)",
                  cursor: !canProceed() ? "not-allowed" : "pointer",
                  border: "none",
                  boxShadow: canProceed() ? "var(--shadow-accent)" : "none",
                  fontFamily: "var(--font-syne)"
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2.5 rounded-2xl text-white font-semibold text-sm transition-all"
                style={{
                  background: loading ? "var(--text3)" : "var(--accent)",
                  cursor: loading ? "not-allowed" : "pointer",
                  border: "none",
                  boxShadow: !loading ? "var(--shadow-accent)" : "none",
                  fontFamily: "var(--font-syne)"
                }}
              >
                {loading ? "Generating your paths..." : "Generate My Roadmap ✨"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}