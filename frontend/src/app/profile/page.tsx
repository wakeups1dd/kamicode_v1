"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  listMySubmissions,
  listProblems,
  getMyStreak,
  getUserProfile,
  sendArenaInvite,
} from "@/lib/api";
import type {
  SubmissionResponse,
  ProblemSummary,
  UserStreakResponse,
  UserProfileResponse,
} from "@/lib/types";
import Link from "next/link";
import { TrophyCabinet } from "@/components/TrophyCabinet";
import {
  User,
  Zap,
  Code,
  ShieldAlert,
  Award,
  Calendar,
  ExternalLink,
  Activity,
  ArrowLeft,
  Swords,
  Check,
} from "lucide-react";

export function ProfileContent({ initialUsername }: { initialUsername?: string }) {
  const searchParams = useSearchParams();
  const queryUsername = searchParams ? searchParams.get("username") : null;
  const targetUsername = (queryUsername || initialUsername || "").trim();

  const { user, loading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [problemMap, setProblemMap] = useState<Record<string, ProblemSummary>>({});
  const [streak, setStreak] = useState<UserStreakResponse | null>(null);
  const [otherProfile, setOtherProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [challengeSuccess, setChallengeSuccess] = useState<string | null>(null);

  // Derive current logged-in user credentials
  const email = user?.primaryEmailAddress?.emailAddress || user?.email || "";
  const ghAccount = user?.externalAccounts?.find(
    (acc: any) => acc.provider === "github" || acc.provider === "oauth_github"
  );
  const ghUsername = (ghAccount as any)?.username;
  const myUsername = (user?.username || ghUsername || (email ? email.split("@")[0] : "")).toLowerCase();

  // Determine if viewing another user's profile
  const isOtherUser = !!targetUsername && targetUsername.toLowerCase() !== myUsername;

  useEffect(() => {
    if (authLoading) return;

    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isOtherUser) {
          // Fetch public friend profile
          const [profileData, problemsData] = await Promise.all([
            getUserProfile(targetUsername),
            listProblems().catch(() => []),
          ]);

          setOtherProfile(profileData);
          setSubmissions(profileData.submissions || []);
          setStreak(profileData.streak || null);

          const pMap: Record<string, ProblemSummary> = {};
          if (Array.isArray(problemsData)) {
            problemsData.forEach((p) => {
              pMap[String(p.id)] = p;
            });
          }
          setProblemMap(pMap);
        } else {
          // Current logged-in user
          if (!user) {
            setLoading(false);
            return;
          }

          const [subsData, problemsData, streakData] = await Promise.all([
            listMySubmissions().catch(() => []),
            listProblems().catch(() => []),
            getMyStreak().catch(() => null),
          ]);

          setSubmissions(subsData || []);
          setStreak(streakData);

          const pMap: Record<string, ProblemSummary> = {};
          if (Array.isArray(problemsData)) {
            problemsData.forEach((p) => {
              pMap[String(p.id)] = p;
            });
          }
          setProblemMap(pMap);
        }
      } catch (err: any) {
        setError(err.message || `Failed to load profile for @${targetUsername || "user"}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [authLoading, user, targetUsername, isOtherUser]);

  const handleChallengeFriend = async () => {
    if (!otherProfile?.user_id) return;
    const roomCode = `KAMIDUEL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    try {
      await sendArenaInvite(otherProfile.user_id, roomCode);
      setChallengeSuccess(`Duel challenge sent to @${otherProfile.username}! Room: ${roomCode}`);
      setTimeout(() => setChallengeSuccess(null), 6000);
    } catch (err: any) {
      setError(err.message || "Failed to send duel invite");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-transparent border-t-main animate-spin" />
          <span className="text-xs font-mono font-bold text-muted-foreground">
            {isOtherUser ? `Loading @${targetUsername}'s profile...` : "Loading developer profile..."}
          </span>
        </div>
      </div>
    );
  }

  // If viewing friend profile and an error/not found occurred
  if (isOtherUser && error) {
    return (
      <div className="min-h-full bg-background text-foreground font-sans pb-12 animate-fade">
        <div className="max-w-[600px] mx-auto px-4 py-16 text-center space-y-6">
          <div className="bg-secondary-background border-4 border-black p-8 rounded-2xl shadow-[8px_8px_0px_#000] space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 border-2 border-black mx-auto flex items-center justify-center shadow-[3px_3px_0px_#000]">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-foreground">Developer Not Found</h2>
            <p className="text-sm text-muted-foreground font-medium">
              We couldn&apos;t find a coder with username{" "}
              <span className="font-mono font-bold text-foreground">@{targetUsername}</span>.
            </p>
            <div className="pt-2">
              <Link
                href="/friends"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-main text-main-foreground font-black text-sm border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Developer Network</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If viewing own profile and unauthenticated
  if (!isOtherUser && !user) {
    return (
      <div className="min-h-full bg-background text-foreground font-sans pb-12 animate-fade">
        <div className="bg-secondary-background border-b-4 border-black py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1000px] mx-auto space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
              <User className="w-7 h-7 text-main" />
              <span>Developer <span className="text-main">Profile</span></span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Authenticate to access your solve distributions, streak logs, Elo rating, and trophy showcase.
            </p>
          </div>
        </div>

        <div className="max-w-[600px] mx-auto px-4 py-16 text-center space-y-6">
          <div className="bg-secondary-background border-4 border-black p-8 rounded-2xl shadow-[8px_8px_0px_#000] space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-main border-2 border-black mx-auto flex items-center justify-center shadow-[3px_3px_0px_#000]">
              <Zap className="w-8 h-8 text-main-foreground" />
            </div>
            <h2 className="text-2xl font-black text-foreground">Sign In to View Your Profile</h2>
            <p className="text-sm text-muted-foreground font-medium">
              Create an account or sign in with GitHub to track your competitive coding progress, maintain daily streaks, and earn badges.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/auth"
                className="px-6 py-3 rounded-xl bg-main text-main-foreground font-black text-sm border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
              >
                Sign In with GitHub
              </Link>
              <Link
                href="/auth?mode=signup"
                className="px-6 py-3 rounded-xl bg-background text-foreground font-bold text-sm border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compute solve metrics
  const acceptedSubmissions = submissions.filter((s) => s.status === "accepted");
  const solvedProblemIds = new Set(acceptedSubmissions.map((s) => s.problem_id));
  const totalSolvedCount = solvedProblemIds.size;

  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;

  solvedProblemIds.forEach((id) => {
    const prob = problemMap[id];
    if (prob) {
      if (prob.difficulty === "easy") easySolved++;
      if (prob.difficulty === "medium") mediumSolved++;
      if (prob.difficulty === "hard") hardSolved++;
    }
  });

  const getVerdictBadge = (status: string) => {
    const config: Record<string, { label: string; bg: string }> = {
      accepted: { label: "Accepted", bg: "bg-[#8bd600] text-black" },
      wrong_answer: { label: "Wrong Answer", bg: "bg-[#f85149] text-white" },
      time_limit_exceeded: { label: "TLE", bg: "bg-[#ffbf00] text-black" },
      runtime_error: { label: "Runtime Error", bg: "bg-[#f85149] text-white" },
      compilation_error: { label: "Compilation Error", bg: "bg-[#f85149] text-white" },
    };

    const c = config[status] || { label: status.toUpperCase(), bg: "bg-zinc-500 text-white" };
    return (
      <span className={`px-2 py-0.5 rounded-xl border border-black font-mono font-black text-[9px] uppercase shadow-[1px_1px_0px_#000] ${c.bg}`}>
        {c.label}
      </span>
    );
  };

  // Derive profile display fields
  const displayUsername = isOtherUser
    ? (otherProfile?.username || targetUsername)
    : (user?.username || ghUsername || (email ? email.split("@")[0] : "coder"));

  const displayName = isOtherUser
    ? (otherProfile?.display_name || otherProfile?.username || targetUsername)
    : (user?.fullName || user?.firstName || (ghUsername ? ghUsername : displayUsername));

  const avatarUrl = isOtherUser
    ? otherProfile?.avatar_url
    : (user?.imageUrl || user?.user_metadata?.avatar_url);

  const avatarInit = (displayName || "C").charAt(0).toUpperCase();

  const createdAt = isOtherUser
    ? (otherProfile?.created_at ? new Date(otherProfile.created_at).toLocaleDateString() : "Active Member")
    : (user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : user?.created_at
        ? new Date(user.created_at).toLocaleDateString()
        : "N/A");

  return (
    <div className="min-h-full bg-background text-foreground font-sans pb-12 animate-fade">
      {/* Header section */}
      <div className="bg-secondary-background border-b-4 border-black py-5 sm:py-7 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono font-bold">
              {isOtherUser ? (
                <>
                  <Link href="/friends" className="hover:text-foreground flex items-center gap-1 hover:underline">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Friends</span>
                  </Link>
                  <span>/</span>
                  <span className="text-foreground font-black">@{displayUsername}</span>
                  {otherProfile?.is_online ? (
                    <span className="text-[9px] px-2 py-0.5 rounded-xl border-2 border-black bg-[#8bd600] text-black font-black uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-black inline-block animate-ping" />
                      <span>Online</span>
                    </span>
                  ) : (
                    <span className="text-[9px] px-2 py-0.5 rounded-xl border-2 border-black bg-zinc-200 dark:bg-zinc-800 text-muted-foreground font-black uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 inline-block" />
                      <span>Offline</span>
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span>User</span>
                  <span>/</span>
                  <span className="text-foreground font-black hover:underline cursor-pointer">profile</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-xl border-2 border-black bg-main text-main-foreground font-black uppercase tracking-wider">
                    developer
                  </span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <User className="w-6 h-6 text-main" />
              <span>
                {isOtherUser ? (
                  <>
                    {displayName}&apos;s <span className="text-main">Profile</span>
                  </>
                ) : (
                  <>
                    Developer <span className="text-main">Profile</span>
                  </>
                )}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              {isOtherUser
                ? `Review solve distributions, hot streaks, and submissions showcase for @${displayUsername}.`
                : "Review solve distributions, streak statistics, and historical code submission logs."}
            </p>
          </div>

          {/* Action buttons on header */}
          {isOtherUser && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/friends"
                className="px-3.5 py-2 rounded-xl bg-background hover:bg-zinc-200 dark:hover:bg-zinc-800 text-foreground font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Friends</span>
              </Link>
              {user && (
                <button
                  onClick={handleChallengeFriend}
                  className="px-3.5 py-2 rounded-xl bg-main text-main-foreground font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Challenge to 1v1 Arena duel"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Challenge to Duel</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {challengeSuccess && (
          <div className="p-3 bg-main/20 border-2 border-black rounded-xl text-xs font-bold text-foreground flex items-center gap-2">
            <Check className="w-4 h-4 text-[#8bd600] stroke-[3]" />
            <span>{challengeSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border-2 border-black rounded-2xl text-red-500 text-xs font-bold text-center">
            ⚠️ {error}
          </div>
        )}

        {/* Profile Card & Streak Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main User Card */}
          <div className="bg-secondary-background border-4 border-black p-6 rounded-xl shadow-[4px_4px_0px_#000] flex flex-col items-center justify-center text-center gap-4 select-none">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayUsername}
                  className="w-20 h-20 rounded-full border-4 border-black shadow-[3px_3px_0px_#000] object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-black bg-purple-300 dark:bg-purple-700 flex items-center justify-center font-mono font-black text-3xl text-black shadow-[3px_3px_0px_#000]">
                  {avatarInit}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center ${
                  (!isOtherUser || otherProfile?.is_online) ? "bg-[#8bd600]" : "bg-zinc-400 dark:bg-zinc-600"
                }`}
                title={(!isOtherUser || otherProfile?.is_online) ? "Online" : "Offline"}
              >
                {(!isOtherUser || otherProfile?.is_online) && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8bd600] opacity-75" />
                )}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-foreground">{displayName}</h2>
              <p className="text-xs text-zinc-500 font-mono">@{displayUsername}</p>
            </div>

            <div className="w-full border-t border-black pt-3 flex flex-col gap-1.5 font-mono text-[10px] text-zinc-500 font-bold">
              {!isOtherUser ? (
                <>
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    <span className="text-[#8bd600] font-black flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8bd600] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8bd600]" />
                      </span>
                      <span>Online</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Account Email:</span>
                    <span className="text-foreground truncate max-w-[150px]">{email || "N/A"}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span>Status:</span>
                  {otherProfile?.is_online ? (
                    <span className="text-[#8bd600] font-black flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8bd600] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8bd600]" />
                      </span>
                      <span>Online</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500 font-black flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 inline-block" />
                      <span>Offline</span>
                    </span>
                  )}
                </div>
              )}
              <div className="flex justify-between">
                <span>Member Since:</span>
                <span className="text-foreground">{createdAt}</span>
              </div>
            </div>
          </div>

          {/* Stats & Streak Box */}
          <div className="border-4 border-black p-6 rounded-xl bg-secondary-background shadow-[4px_4px_0px_#000] flex flex-col justify-between select-none">
            <div className="space-y-4">
              <h3 className="font-mono font-black text-xs uppercase tracking-wider text-zinc-500">Solve Streaks</h3>

              <div className="flex items-center justify-between border-2 border-black p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-[#ffbf00] fill-current" />
                  <div>
                    <div className="text-[9px] uppercase font-black text-zinc-500">Current Streak</div>
                    <div className="font-mono font-black text-xl text-foreground">
                      {streak?.current_streak || 0} days
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-2 border-black p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 shadow-[2px_2px_0px_#000]">
                <div className="flex items-center gap-3">
                  <Award className="w-8 h-8 text-main" />
                  <div>
                    <div className="text-[9px] uppercase font-black text-zinc-500">Longest Streak</div>
                    <div className="font-mono font-black text-xl text-foreground">
                      {streak?.longest_streak || 0} days
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground font-mono leading-tight mt-4">
              {isOtherUser
                ? `@${displayUsername} has logged ${streak?.total_solves || 0} accepted solves on KamiCode!`
                : "Solve at least one coding challenge daily to maintain and compound your hot streak!"}
            </div>
          </div>

          {/* Solve breakdown */}
          <div className="border-4 border-black p-6 rounded-xl bg-secondary-background shadow-[4px_4px_0px_#000] space-y-4 select-none">
            <h3 className="font-mono font-black text-xs uppercase tracking-wider text-zinc-500">DSA Solve Metrics</h3>

            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-main">{totalSolvedCount}</span>
              <span className="text-[10px] uppercase font-black text-zinc-400">Total Solved</span>
            </div>

            <div className="space-y-3 font-mono font-black text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#8bd600]">EASY</span>
                  <span className="text-foreground">{easySolved} solved</span>
                </div>
                <div className="w-full h-2 border border-black rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="bg-[#8bd600] h-full"
                    style={{ width: `${totalSolvedCount > 0 ? (easySolved / totalSolvedCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#ffbf00]">MEDIUM</span>
                  <span className="text-foreground">{mediumSolved} solved</span>
                </div>
                <div className="w-full h-2 border border-black rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="bg-[#ffbf00] h-full"
                    style={{ width: `${totalSolvedCount > 0 ? (mediumSolved / totalSolvedCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#f85149]">HARD</span>
                  <span className="text-foreground">{hardSolved} solved</span>
                </div>
                <div className="w-full h-2 border border-black rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="bg-[#f85149] h-full"
                    style={{ width: `${totalSolvedCount > 0 ? (hardSolved / totalSolvedCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trophy Cabinet */}
        <TrophyCabinet
          userBadges={isOtherUser ? otherProfile?.badges : undefined}
          title={isOtherUser ? `@${displayUsername}'s Trophy Cabinet` : "Trophy Cabinet"}
        />

        {/* Historical Submissions Logs */}
        <div className="bg-secondary-background border-4 border-black rounded-xl shadow-[4px_4px_0px_#000] overflow-hidden">
          <div className="bg-main border-b-4 border-black px-5 py-4 flex items-center justify-between">
            <span className="font-mono font-black text-xs uppercase tracking-wider text-main-foreground flex items-center gap-1.5 select-none">
              <Activity className="w-4 h-4" />
              <span>{isOtherUser ? `@${displayUsername}'s Historical Submissions` : "Historical Submission Logs"}</span>
            </span>
            <span className="font-mono text-[10px] font-bold bg-white dark:bg-zinc-900 border-2 border-black px-2 py-0.5 rounded text-black dark:text-white">
              {submissions.length} Total Attempts
            </span>
          </div>

          {submissions.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center gap-2 select-none">
              <Code className="w-10 h-10 text-zinc-400" />
              <span className="text-sm font-bold text-zinc-500">No submissions found.</span>
              <p className="text-xs text-zinc-400 font-mono">
                {isOtherUser ? `@${displayUsername} hasn't submitted solutions yet.` : "Solve a challenge to start logs!"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-mono font-black text-[10px] uppercase select-none">
                    <th className="py-3 px-3 sm:px-5">Problem Challenge</th>
                    <th className="py-3 px-3 sm:px-5 text-center w-28">Verdict</th>
                    <th className="py-3 px-3 sm:px-5 text-center w-24 hidden sm:table-cell">Runtime</th>
                    <th className="py-3 px-3 sm:px-5 text-center w-24 hidden md:table-cell">Language</th>
                    <th className="py-3 px-3 sm:px-5 text-center w-36 hidden lg:table-cell">Timestamp</th>
                    <th className="py-3 px-3 sm:px-5 text-center w-16 hidden sm:table-cell">Arena</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {submissions.map((sub) => {
                    const prob = problemMap[sub.problem_id];
                    const probTitle = prob?.title || `Problem ID: ${sub.problem_id}`;
                    const probSlug = prob?.slug;

                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-zinc-100 dark:hover:bg-zinc-800/30 text-xs font-bold transition-colors"
                      >
                        {/* Title / Problem */}
                        <td className="py-3.5 px-5">
                          {probSlug ? (
                            <Link
                              href={`/problems/${probSlug}`}
                              className="hover:text-main hover:underline flex items-center gap-1"
                            >
                              <span>{probTitle}</span>
                            </Link>
                          ) : (
                            <span>{probTitle}</span>
                          )}
                        </td>

                        {/* Verdict */}
                        <td className="py-3.5 px-5 text-center">{getVerdictBadge(sub.status)}</td>

                        <td className="py-3.5 px-3 sm:px-5 text-center font-mono hidden sm:table-cell">
                          {sub.runtime_ms != null ? `${sub.runtime_ms}ms` : "—"}
                        </td>

                        <td className="py-3.5 px-3 sm:px-5 text-center font-mono uppercase text-[10px] text-zinc-600 dark:text-zinc-400 hidden md:table-cell">
                          {sub.language}
                        </td>

                        <td className="py-3.5 px-3 sm:px-5 text-center font-mono text-zinc-500 font-medium hidden lg:table-cell">
                          {sub.created_at ? new Date(sub.created_at).toLocaleString() : "—"}
                        </td>

                        <td className="py-3.5 px-3 sm:px-5 text-center hidden sm:table-cell">
                          {probSlug ? (
                            <Link
                              href={`/problems/${probSlug}`}
                              className="inline-flex items-center text-main hover:text-main/80"
                              title="Go to arena"
                            >
                              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                            </Link>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-background select-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-transparent border-t-main animate-spin" />
            <span className="text-xs font-mono font-bold text-muted-foreground">Loading developer profile...</span>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
