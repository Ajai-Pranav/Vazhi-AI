"use client";

import { StudentProfile, CareerSuggestion } from "@/types";

// Lightweight in-memory store for session-scoped state
// Persists selected suggestion until page refresh (user can re-fetch from DB)
let _profile: StudentProfile | null = null;
let _suggestions: CareerSuggestion[] = [];
let _chosen: CareerSuggestion | null = null;

export const store = {
  setProfile: (p: StudentProfile) => { _profile = p; },
  getProfile: () => _profile,
  setSuggestions: (s: CareerSuggestion[]) => { _suggestions = s; },
  getSuggestions: () => _suggestions,
  setChosen: (c: CareerSuggestion) => { _chosen = c; },
  getChosen: () => _chosen,
  clear: () => {
    _profile = null;
    _suggestions = [];
    _chosen = null;
  },
};
