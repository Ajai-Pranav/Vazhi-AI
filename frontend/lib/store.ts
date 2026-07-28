"use client";

import { StudentProfile, CareerSuggestion } from "@/types";

// Lightweight in-memory store for session-scoped state
// Persists selected suggestion until page refresh (user can re-fetch from DB)
let _profile: StudentProfile | null = null;
let _suggestions: CareerSuggestion[] = [];
let _chosen: CareerSuggestion | null = null;

// Study Material prefill — set by the "Generate Study Material" button on the
// roadmap Day Plan page, consumed once by the Study Material page on load.
export interface StudyMaterialPrefill {
  topics: string[];
}
let _studyMaterialPrefill: StudyMaterialPrefill | null = null;

export const store = {
  setProfile: (p: StudentProfile) => { _profile = p; },
  getProfile: () => _profile,
  setSuggestions: (s: CareerSuggestion[]) => { _suggestions = s; },
  getSuggestions: () => _suggestions,
  setChosen: (c: CareerSuggestion) => { _chosen = c; },
  getChosen: () => _chosen,
  setStudyMaterialPrefill: (p: StudyMaterialPrefill) => { _studyMaterialPrefill = p; },
  // Read-once: returns the pending prefill (if any) and clears it, so
  // navigating back to the page later doesn't re-apply stale data.
  consumeStudyMaterialPrefill: () => {
    const p = _studyMaterialPrefill;
    _studyMaterialPrefill = null;
    return p;
  },
  clear: () => {
    _profile = null;
    _suggestions = [];
    _chosen = null;
    _studyMaterialPrefill = null;
  },
};
