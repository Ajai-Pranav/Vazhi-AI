/**
 * api.ts — Centralized API client for VazhiAI
 * ──────────────────────────────────────────
 * All requests use `credentials: "include"` so HTTP-Only auth cookies
 * are sent automatically by the browser. No token is ever read from
 * JavaScript — this eliminates the XSS token-theft attack surface.
 *
 * Automatic 401 handling:
 *   On a 401 response, the client attempts POST /auth/refresh once.
 *   If refresh succeeds the original request is retried with fresh cookies.
 *   If refresh fails the user is redirected to /auth/login.
 */
import {
  StudentProfile, SuggestionsResponse, ChatMessage, ChatRefineResponse,
  RoadmapOutlineResponse, DayRoadmapDetails, DailyProgressResponse,
  TestScoreResponse, BroadOnboardingRequest, UserPublic,
  StudyMaterialRequest, StudyMaterialResponse, StudyMaterialListItem,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Core fetch wrapper with silent refresh ────────────────────────────────────

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const mergedInit: RequestInit = {
    ...init,
    credentials: "include",           // Send HTTP-Only cookies automatically
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  };

  let res = await fetch(`${API_URL}${path}`, mergedInit);

  if (res.status === 401) {
    // Try silent token refresh
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (refreshRes.ok) {
      // Retry original request with new cookies
      res = await fetch(`${API_URL}${path}`, mergedInit);
    } else {
      // Session fully expired — send to login
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    }
  }

  return res;
}

async function handleResponse(res: Response, fallbackMessage: string) {
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server error: ${res.status} ${res.statusText || "Internal Server Error"}`);
  }
  if (!res.ok) {
    throw new Error(data?.detail || fallbackMessage);
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function apiSignup(
  email: string,
  password: string,
  name: string,
  educational_status?: string,
  field?: string,
) {
  // Auth endpoints don't need cookie auth — they SET the cookies
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    credentials: "include",          // Receive Set-Cookie from server
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, educational_status, field }),
  });
  return handleResponse(res, "Signup failed");
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    credentials: "include",          // Receive Set-Cookie from server
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res, "Login failed");
}

export async function apiGetMe(): Promise<UserPublic> {
  const res = await apiFetch("/auth/me");
  return handleResponse(res, "Failed to fetch user");
}

export async function apiUpdateProfile(updates: Partial<UserPublic>) {
  const res = await apiFetch("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  return handleResponse(res, "Profile update failed");
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export async function apiCompleteOnboarding(data: BroadOnboardingRequest): Promise<UserPublic> {
  const res = await apiFetch("/onboarding/complete", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return handleResponse(res, "Onboarding failed");
}

export async function apiGetProfileExtension() {
  const res = await apiFetch("/onboarding/profile");
  if (res.status === 404) return null;
  return handleResponse(res, "Failed to fetch profile extension");
}

// ── Suggestions ───────────────────────────────────────────────────────────────

export async function generateSuggestions(profile: StudentProfile): Promise<SuggestionsResponse> {
  const res = await apiFetch("/generate-suggestions", {
    method: "POST",
    body: JSON.stringify(profile),
  });
  return handleResponse(res, "Failed to generate suggestions");
}

export async function chatRefineSuggestions(
  profile: StudentProfile,
  history: ChatMessage[],
  message: string
): Promise<ChatRefineResponse> {
  const res = await apiFetch("/chat/refine-suggestions", {
    method: "POST",
    body: JSON.stringify({ profile, history, message }),
  });
  return handleResponse(res, "Failed to refine suggestions");
}

// ── Roadmaps ──────────────────────────────────────────────────────────────────

export async function saveRoadmap(roadmap: {
  title: string;
  description?: string;
  why_this_fits_user?: string;
  required_skills: string[];
  roadmap_steps: string[];
  estimated_timeline?: string;
  difficulty?: string;
}) {
  const res = await apiFetch("/roadmaps", {
    method: "POST",
    body: JSON.stringify(roadmap),
  });
  return handleResponse(res, "Save failed");
}

export async function getActiveRoadmap() {
  const res = await apiFetch("/roadmaps/active");
  if (res.status === 404) return null;
  return handleResponse(res, "Failed to fetch roadmap");
}

export async function confirmActiveRoadmap() {
  const res = await apiFetch("/roadmaps/active/confirm", { method: "POST" });
  return handleResponse(res, "Confirm failed");
}

export async function confirmAndCustomizeRoadmap(config: {
  duration_weeks: number;
  experience_level: string;
  available_time: string;
  learning_pace: string;
}): Promise<RoadmapOutlineResponse> {
  const res = await apiFetch("/roadmaps/active/confirm-custom", {
    method: "POST",
    body: JSON.stringify(config),
  });
  return handleResponse(res, "Failed to confirm and customize roadmap");
}

export async function getDayDetails(dayNumber: number): Promise<DayRoadmapDetails> {
  const res = await apiFetch(`/roadmaps/active/day/${dayNumber}`);
  return handleResponse(res, `Failed to load Day ${dayNumber} details`);
}

export async function saveDailyProgress(progress: {
  date: string;
  day_number: number;
  completed_tasks: string[];
  solved_problems: string[];
  notes: string;
}): Promise<DailyProgressResponse> {
  const res = await apiFetch("/roadmaps/active/progress", {
    method: "POST",
    body: JSON.stringify(progress),
  });
  return handleResponse(res, "Failed to save progress");
}

export async function getDailyProgress(): Promise<DailyProgressResponse[]> {
  const res = await apiFetch("/roadmaps/active/progress");
  return handleResponse(res, "Failed to fetch progress logs");
}

export async function optimizeResume(resumeData: any, targetRole: string): Promise<any> {
  const res = await apiFetch("/resume/optimize", {
    method: "POST",
    body: JSON.stringify({ resume_data: resumeData, target_role: targetRole }),
  });
  return handleResponse(res, "Failed to optimize resume");
}

export async function submitMCQTest(dayNumber: number, answers: string[]): Promise<TestScoreResponse> {
  const res = await apiFetch(`/roadmaps/active/tests?day_number=${dayNumber}`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
  return handleResponse(res, "Failed to submit test");
}

export async function getTestScores(): Promise<TestScoreResponse[]> {
  const res = await apiFetch("/roadmaps/active/tests");
  return handleResponse(res, "Failed to fetch test scores");
}

export async function getChatHistory(sessionId?: string): Promise<ChatMessage[]> {
  const path = sessionId
    ? `/chat/history?session_id=${sessionId}`
    : `/chat/history`;
  const res = await apiFetch(path);
  return handleResponse(res, "Failed to fetch chat history");
}

export async function sendChatMessage(
  message: string,
  sessionId?: string,
  dayNumber?: number
) {
  const res = await apiFetch("/chat/message", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId, day_number: dayNumber }),
  });
  return handleResponse(res, "Failed to send chat message");
}

// ── Explore Paths ─────────────────────────────────────────────────────────────

export interface ExplorePathsResponse {
  reply: string;
  intent: string;
  roadmap_updated: boolean;
  needs_confirmation: boolean;
  updated_roadmap: any | null;
}

export async function explorePathsChat(
  message: string,
  history: Array<{ role: string; content: string }>,
  confirmNewRoadmap: boolean = false,
): Promise<ExplorePathsResponse> {
  const res = await apiFetch("/chat/explore-paths", {
    method: "POST",
    body: JSON.stringify({
      message,
      history,
      confirm_new_roadmap: confirmNewRoadmap,
    }),
  });
  return handleResponse(res, "Failed to process explore paths request");
}

// ── Password Recovery ─────────────────────────────────────────────────────────

export async function apiForgotPassword(email: string) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res, "Failed to request OTP");
}

export async function apiVerifyOtp(email: string, otp: string) {
  const res = await fetch(`${API_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  return handleResponse(res, "OTP verification failed");
}

export async function apiResetPassword(email: string, otp: string, newPassword: string) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, new_password: newPassword }),
  });
  return handleResponse(res, "Password reset failed");
}

// ── Study Material ─────────────────────────────────────────────────────────────

export async function generateStudyMaterial(req: StudyMaterialRequest): Promise<StudyMaterialResponse> {
  const res = await apiFetch("/study-material/generate", {
    method: "POST",
    body: JSON.stringify(req),
  });
  return handleResponse(res, "Failed to generate study material");
}

export async function getStudyMaterialHistory(): Promise<StudyMaterialListItem[]> {
  const res = await apiFetch("/study-material/history");
  return handleResponse(res, "Failed to fetch study material history");
}

export async function getStudyMaterial(id: string): Promise<StudyMaterialResponse> {
  const res = await apiFetch(`/study-material/${id}`);
  return handleResponse(res, "Failed to fetch study material details");
}

export async function deleteStudyMaterial(id: string): Promise<void> {
  const res = await apiFetch(`/study-material/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || "Failed to delete study material");
  }
}

