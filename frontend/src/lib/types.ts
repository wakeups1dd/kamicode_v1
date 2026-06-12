// API types matching the backend schemas

export interface ProblemSummary {
  id: number;
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
  id: number;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  topic: string;
  constraints?: string;
  examples?: ExampleCase[];
  starter_code?: string;
  time_limit_ms: number;
  memory_limit_kb: number;
  created_at?: string;
}

export interface TestResultItem {
  passed: boolean;
  input: string;
  expected: string;
  actual?: string;
  error?: string;
}

export interface SubmissionResponse {
  id: number;
  problem_id: number;
  language: string;
  status: string;
  runtime_ms?: number;
  memory_kb?: number;
  test_results?: TestResultItem[];
  passed_count: number;
  total_count: number;
  stdout?: string;
  stderr?: string;
  created_at?: string;
}

export interface AIAnalysisResponse {
  id: number;
  submission_id: number;
  problem_id: number;
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
  created_at?: string;
}

export interface CohortResponse {
  id: number;
  name: string;
  slug: string;
  description?: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface CohortMemberResponse {
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  role: string;
  joined_at: string;
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
