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
