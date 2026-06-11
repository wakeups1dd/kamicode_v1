import type { ProblemSummary, ProblemDetail, SubmissionResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API Error: ${res.status}`);
  }
  return res.json();
}

// ---------- Problems ----------

export async function listProblems(
  filters?: { difficulty?: string; topic?: string }
): Promise<ProblemSummary[]> {
  const params = new URLSearchParams();
  if (filters?.difficulty) params.set("difficulty", filters.difficulty);
  if (filters?.topic) params.set("topic", filters.topic);
  const query = params.toString() ? `?${params}` : "";
  return apiFetch<ProblemSummary[]>(`/api/problems/${query}`);
}

export async function getProblem(slug: string): Promise<ProblemDetail> {
  return apiFetch<ProblemDetail>(`/api/problems/${slug}`);
}

// ---------- Submissions ----------

export async function submitCode(payload: {
  problem_id: number;
  language?: string;
  source_code: string;
}): Promise<SubmissionResponse> {
  return apiFetch<SubmissionResponse>("/api/submissions/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSubmission(id: number): Promise<SubmissionResponse> {
  return apiFetch<SubmissionResponse>(`/api/submissions/${id}`);
}

export async function pollSubmission(
  id: number,
  maxRetries = 30,
  intervalMs = 1500
): Promise<SubmissionResponse> {
  for (let i = 0; i < maxRetries; i++) {
    const submission = await getSubmission(id);
    if (submission.status !== "pending" && submission.status !== "running") {
      return submission;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Submission timed out");
}
