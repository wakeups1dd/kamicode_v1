// API types matching the backend schemas

export interface ProblemSummary {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  topic: string;
}

export interface ExampleCase {
  input: string;
  output: string;
  explanation?: string;
}

export interface ProblemDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  topic: string;
  constraints?: string | string[];
  examples?: ExampleCase[];
  test_cases?: Array<{ input: string; expected_output: string; is_hidden?: boolean }>;
  starter_code?: string;
  time_limit_ms?: number;
  memory_limit_kb?: number;
  created_at?: string | number;
}

export interface TestResultItem {
  passed: boolean;
  input: string;
  expected: string;
  actual?: string;
  error?: string;
  is_hidden?: boolean;
}

export interface SubmissionResponse {
  id: string;
  problem_id: string;
  language: string;
  status: string;
  runtime_ms?: number;
  memory_kb?: number;
  test_results?: TestResultItem[];
  passed_count: number;
  total_count: number;
  stdout?: string;
  stderr?: string;
  created_at?: string | number;
}

export interface AIAnalysisResponse {
  id: string;
  submission_id: string;
  problem_id: string;
  time_complexity?: string;
  space_complexity?: string;
  approach?: string;
  approach_explanation?: string;
  efficiency_score?: number;
  code_quality_score?: number;
  overall_score?: number;
  strengths?: string[];
  improvements?: string[];
  optimized_solution_hint?: string;
  created_at?: string | number;
}

export interface CohortResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  invite_code: string;
  created_by: string;
  created_at?: string | number;
}

export interface CohortMemberResponse {
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  role: string;
  joined_at?: string | number;
}

export interface CohortDetailResponse extends CohortResponse {
  members: CohortMemberResponse[];
}

export interface UserStreakResponse {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_solve_date?: string;
  total_solves: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  total_solves: number;
  current_streak: number;
  longest_streak: number;
}

export interface BadgeResponse {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  condition_type: string;
  condition_value: number;
  created_at?: string | number;
}

export interface UserBadgeResponse {
  id: string;
  user_id: string;
  badge: BadgeResponse;
  awarded_at?: string | number;
}
