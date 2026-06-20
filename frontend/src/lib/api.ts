import type {
  ProblemSummary,
  ProblemDetail,
  SubmissionResponse,
  AIAnalysisResponse,
  CohortResponse,
  CohortDetailResponse,
  UserStreakResponse,
  LeaderboardEntry,
  BadgeResponse,
  UserBadgeResponse,
} from "./types";
import { supabase } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const isBypass = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

const getMockToken = () => {
  const payload = {
    sub: "dev-user-id",
    email: "dev@kamicode.local",
    user_metadata: {
      display_name: "Dev User",
    },
  };
  const str = JSON.stringify(payload);
  const base64 = typeof window !== "undefined"
    ? btoa(str)
    : Buffer.from(str).toString("base64");
  const base64Url = base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64Url}.mock_signature`;
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let token: string | undefined;
  if (isBypass) {
    token = getMockToken();
  } else {
    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
    } catch (err) {
      // If Supabase is disabled/unconfigured, ignore session retrieval
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...headers, ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API Error: ${res.status}`);
  }
  
  if (res.status === 204) {
    return undefined as unknown as T;
  }
  
  return res.json();
}

// ---------- Auth ----------

export async function getCurrentUser() {
  if (isBypass) {
    return { id: "dev-user-id" };
  }
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user || null;
  } catch (err) {
    return null;
  }
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

export async function listMySubmissions(): Promise<SubmissionResponse[]> {
  return apiFetch<SubmissionResponse[]>("/api/submissions/user/me");
}

export async function getUserProblemStatus(problemId: number): Promise<{
  solved: boolean;
  status: string | null;
  attempts: number;
}> {
  return apiFetch<{
    solved: boolean;
    status: string | null;
    attempts: number;
  }>(`/api/submissions/problem/${problemId}/status`);
}

export async function getAIAnalysis(submissionId: number): Promise<AIAnalysisResponse> {
  return apiFetch<AIAnalysisResponse>(`/api/analysis/${submissionId}`);
}

// ---------- Leaderboards ----------

export async function getGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  return apiFetch<LeaderboardEntry[]>("/api/leaderboard/global");
}

export async function getCohortLeaderboard(cohortId: number): Promise<LeaderboardEntry[]> {
  return apiFetch<LeaderboardEntry[]>(`/api/leaderboard/cohort/${cohortId}`);
}

// ---------- Cohorts ----------

export async function getMyCohorts(): Promise<CohortResponse[]> {
  return apiFetch<CohortResponse[]>("/api/cohorts/me");
}

export async function getCohortDetail(slug: string): Promise<CohortDetailResponse> {
  return apiFetch<CohortDetailResponse>(`/api/cohorts/${slug}`);
}

export async function createCohort(payload: { name: string; description?: string }): Promise<CohortResponse> {
  return apiFetch<CohortResponse>("/api/cohorts/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function joinCohort(inviteCode: string): Promise<CohortResponse> {
  return apiFetch<CohortResponse>("/api/cohorts/join", {
    method: "POST",
    body: JSON.stringify({ invite_code: inviteCode }),
  });
}

export async function leaveCohort(slug: string): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>(`/api/cohorts/${slug}/leave`, {
    method: "POST",
  });
}

export async function updateCohort(slug: string, payload: { name?: string; description?: string }): Promise<CohortResponse> {
  return apiFetch<CohortResponse>(`/api/cohorts/${slug}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteCohort(slug: string): Promise<void> {
  return apiFetch<void>(`/api/cohorts/${slug}`, {
    method: "DELETE",
  });
}

export interface DailyChallengeResponse {
  id: number;
  cohort_id: number;
  problem_id: number;
  date: string;
  problem_slug: string;
  problem_title: string;
}

export async function getCohortDailyChallenge(slug: string): Promise<DailyChallengeResponse> {
  return apiFetch<DailyChallengeResponse>(`/api/cohorts/${slug}/daily-challenge`);
}

// ---------- Cohort Challenges ----------

export async function getTodayChallenge(slug: string): Promise<{
  id: number;
  cohort_id: number;
  problem_id: number;
  date: string;
  problem_title: string | null;
  problem_slug: string | null;
}> {
  return apiFetch(`/api/cohorts/${slug}/challenges/today`);
}

export async function setTodayChallenge(slug: string, problemId: number): Promise<any> {
  return apiFetch(`/api/cohorts/${slug}/challenges`, {
    method: "POST",
    body: JSON.stringify({ problem_id: problemId }),
  });
}

// ---------- Streaks ----------

export async function getMyStreak(): Promise<UserStreakResponse> {
  return apiFetch<UserStreakResponse>("/api/streaks/me");
}

// ---------- Badges ----------

export async function getMyBadges(): Promise<UserBadgeResponse[]> {
  return apiFetch<UserBadgeResponse[]>("/api/badges/me");
}

export async function getAllBadges(): Promise<BadgeResponse[]> {
  return apiFetch<BadgeResponse[]>("/api/badges/all");
}

// ---------- Friends ----------

export interface FriendshipResponse {
  id: number;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  friend_username: string;
  friend_display_name: string | null;
  friend_avatar_url: string | null;
}

export async function getFriends(): Promise<FriendshipResponse[]> {
  return apiFetch<FriendshipResponse[]>("/api/friends/");
}

export async function sendFriendRequest(friendUsername: string): Promise<FriendshipResponse> {
  return apiFetch<FriendshipResponse>("/api/friends/request", {
    method: "POST",
    body: JSON.stringify({ friend_username: friendUsername }),
  });
}

export async function acceptFriendRequest(friendshipId: number): Promise<FriendshipResponse> {
  return apiFetch<FriendshipResponse>(`/api/friends/accept/${friendshipId}`, {
    method: "POST",
  });
}

export async function rejectFriendRequest(friendshipId: number): Promise<FriendshipResponse> {
  return apiFetch<FriendshipResponse>(`/api/friends/reject/${friendshipId}`, {
    method: "POST",
  });
}

export async function sendArenaInvite(targetUserId: string, roomCode: string): Promise<void> {
  return apiFetch<void>("/api/arena/invite", {
    method: "POST",
    body: JSON.stringify({ target_user_id: targetUserId, room_code: roomCode }),
  });
}

export async function getArenaInvites(): Promise<{room_code: string, sender_id: string, sender_name: string}[]> {
  return apiFetch<{room_code: string, sender_id: string, sender_name: string}[]>("/api/arena/invites");
}
