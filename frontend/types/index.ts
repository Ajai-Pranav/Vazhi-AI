// ── Enums / Constants ─────────────────────────────────────────────────────

export type EducationalStatus = "Student" | "Working Professional" | "Job Seeker";

export type UserField =
  | "Computer Science / IT"
  | "Mechanical Engineering"
  | "Civil Engineering"
  | "Electronics & Communication"
  | "Electrical & Electronics"
  | "Arts & Science"
  | "Commerce"
  | "Other";

export type ExperienceLevel =
  | "Absolute Beginner"
  | "Beginner"
  | "Intermediate"
  | "Advanced";

// ── User Profile ──────────────────────────────────────────────────────────

export interface UserPublic {
  id: string;
  email: string;
  name?: string;
  educational_status?: EducationalStatus;
  field?: UserField;
  experience_level?: ExperienceLevel;
  dream_job?: string;
  custom_goal?: string;
  confusion?: string;
  tech_stack?: string[];
  age?: number;
  // Student-specific
  college?: string;
  course?: string;
  current_year?: number;
  total_years?: number;
  // Professional-specific
  current_company?: string;
  years_of_experience?: number;
  current_role?: string;
  // Legacy
  profession?: string;
  has_profile: boolean;
}

export interface BroadOnboardingRequest {
  educational_status: EducationalStatus;
  field: UserField;
  dream_job: string;
  custom_goal?: string;
  experience_level: ExperienceLevel;
  confusion?: string;
  tech_stack?: string[];
  age?: number;
  // Student-specific
  college?: string;
  course?: string;
  current_year?: number;
  total_years?: number;
  // Professional-specific
  current_company?: string;
  years_of_experience?: number;
  current_role?: string;
  // Profile extension
  known_tools?: string[];
  target_skills?: string[];
  interests?: string[];
  certifications_done?: string[];
  certifications_target?: string[];
  extra_data?: Record<string, unknown>;
}

/** Legacy — kept for backward compat with existing suggestion/profile pages */
export interface StudentProfile {
  name: string;
  age?: number;
  college?: string;
  course?: string;
  current_year?: number;
  total_years?: number;
  tech_stack?: string[];
  dream_job: string;
  confusion?: string;
  educational_status?: EducationalStatus;
  field?: UserField;
  experience_level?: ExperienceLevel;
  current_company?: string;
  years_of_experience?: number;
  current_role?: string;
}

// ── Career Suggestions ────────────────────────────────────────────────────

export interface CareerSuggestion {
  title: string;
  description: string;
  why_this_fits_user: string;
  required_skills: string[];
  roadmap_steps: string[];
  estimated_timeline: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

export interface SuggestionsResponse {
  suggestions: CareerSuggestion[];
}

// ── Chat ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRefineResponse {
  reply: string;
  suggestions: CareerSuggestion[] | null;
}

// ── Roadmap ───────────────────────────────────────────────────────────────

export interface RoadmapOutlineItem {
  day: number;
  title: string;
  focus: string;
  module?: string;
  difficulty?: string;
}

export interface RoadmapOutlineResponse {
  id: string;
  title: string;
  is_confirmed: boolean;
  duration_weeks?: number;
  experience_level?: string;
  available_time?: string;
  learning_pace?: string;
  outline: RoadmapOutlineItem[];
  created_at?: string;
  user_field?: string;
  user_educational_status?: string;
  user_dream_job?: string;
}

export interface LearningResource {
  type: string;
  title: string;
  link: string;
}

export interface PracticeProblem {
  platform: string;
  problem: string;
  difficulty: string;
  link: string;
}

export interface MCQQuestion {
  question: string;
  options: string[];
  answer: string;
  difficulty?: "Easy" | "Medium" | "Hard";
}

export interface DayRoadmapDetails {
  day: number;
  title: string;
  duration: string;
  topics: string[];
  resources: LearningResource[];
  practice: PracticeProblem[];
  mcqTest: MCQQuestion[];
  codingAssignment?: string;
  revisionTasks?: string[];
}

export interface TestQuestionResult {
  question: string;
  options: string[];
  selected: string;
  correct: string;
}

export interface TestScoreResponse {
  day_number: number;
  score: number;
  total_questions: number;
  correct_answers: number;
  answers: TestQuestionResult[];
}

export interface DailyProgressResponse {
  id: string;
  date: string;
  day_number?: number;
  completed_tasks: string[];
  solved_problems: string[];
  notes?: string;
}

// ── Study Material ─────────────────────────────────────────────────────────────

export interface StudyMaterialRequest {
  topics: string[];
  education_level?: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Comprehensive";
  language?: string;
  output_length: "Short" | "Medium" | "Detailed";
}

export interface StudyMaterialResponse {
  id: string;
  topics: string[];
  difficulty: string;
  language: string;
  output_length: string;
  markdown_content: string;
  generated_at: string;
}

export interface StudyMaterialListItem {
  id: string;
  topics: string[];
  difficulty: string;
  language: string;
  output_length: string;
  generated_at: string;
}

