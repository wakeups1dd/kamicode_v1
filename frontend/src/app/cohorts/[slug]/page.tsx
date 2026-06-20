"use client";

import { useEffect, useState, use } from "react";
import { getCohortDetail, getCohortLeaderboard, leaveCohort, updateCohort, deleteCohort, getTodayChallenge, setTodayChallenge } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { CohortDetailResponse, LeaderboardEntry } from "@/lib/types";
import { Users, ShieldCheck, Clipboard, Check, FolderOpen, ArrowLeft, LogOut, Trash2, Edit, Calendar, Code, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";

export default function CohortDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  
  const [activeCohort, setActiveCohort] = useState<CohortDetailResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [editingCohort, setEditingCohort] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);
  const [challengeInputId, setChallengeInputId] = useState("");
  const [challengeLoading, setChallengeLoading] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    isDestructive: false,
    hideCancel: false,
    confirmText: "Confirm",
    onConfirm: () => {},
  });

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const showAlert = (message: string, isDestructive = false) => {
    setConfirmModal({
      isOpen: true,
      title: isDestructive ? "Error" : "Notice",
      message,
      isDestructive,
      hideCancel: true,
      confirmText: "OK",
      onConfirm: closeConfirmModal,
    });
  };

  const loadCohortDetail = async (cohortSlug: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await getCohortDetail(cohortSlug);
      setActiveCohort(detail);
      setEditName(detail.name);
      setEditDesc(detail.description || "");
      setEditingCohort(false);
      const lb = await getCohortLeaderboard(detail.id);
      setLeaderboard(lb);
      
      try {
        const challenge = await getTodayChallenge(cohortSlug);
        setDailyChallenge(challenge);
      } catch (e) {
        setDailyChallenge(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load cohort details.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadCohortDetail(slug);
  }, [slug]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleLeaveCohort = (slug: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Leave League",
      message: "Are you sure you want to leave this league?",
      isDestructive: true,
      hideCancel: false,
      confirmText: "Leave",
      onConfirm: async () => {
        closeConfirmModal();
        setActionLoading(true);
        try {
          await leaveCohort(slug);
          router.push("/cohorts");
        } catch (err: any) {
          showAlert(err.message || "Failed to leave league. You might be the only admin.", true);
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleDeleteCohort = (slug: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete League",
      message: "Are you sure you want to permanently delete this league? This action cannot be undone.",
      isDestructive: true,
      hideCancel: false,
      confirmText: "Delete",
      onConfirm: async () => {
        closeConfirmModal();
        setActionLoading(true);
        try {
          await deleteCohort(slug);
          router.push("/cohorts");
        } catch (err: any) {
          showAlert(err.message || "Failed to delete league.", true);
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleUpdateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCohort || !editName.trim()) return;
    setActionLoading(true);
    try {
      const updated = await updateCohort(activeCohort.slug, {
        name: editName,
        description: editDesc || undefined,
      });
      await loadCohortDetail(updated.slug);
      setEditingCohort(false);
    } catch (err: any) {
      showAlert(err.message || "Failed to update league.", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeInputId || isNaN(Number(challengeInputId))) return;
    setChallengeLoading(true);
    try {
      const challenge = await setTodayChallenge(slug, Number(challengeInputId));
      setDailyChallenge(challenge);
      setChallengeInputId("");
    } catch (err: any) {
      showAlert(err.message || "Failed to set challenge.", true);
    } finally {
      setChallengeLoading(false);
    }
  };

  const isAdmin = activeCohort?.members?.some(m => m.user_id === user?.id && m.role === "admin");

  if (detailLoading) {
    return (
      <div className="min-h-full bg-background text-foreground font-sans pb-12 animate-fade">
        <div className="bg-secondary-background border-b-4 border-black py-5 sm:py-7 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1100px] mx-auto space-y-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-500" />
              <span>Collegiate Coding <span className="text-main">Cohorts</span></span>
            </h1>
          </div>
        </div>
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col items-center justify-center py-20 bg-secondary-background border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-transparent border-t-main animate-spin" />
            <span className="text-xs font-mono font-bold text-muted-foreground">Loading details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !activeCohort) {
    return (
      <div className="min-h-full bg-background text-foreground font-sans pb-12 animate-fade">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
          <div className="p-6 bg-red-500/10 border-2 border-black text-red-500 text-sm font-bold rounded-2xl text-center">
            ⚠️ {error || "Cohort not found."}
          </div>
          <button onClick={() => router.push("/cohorts")} className="mt-4 px-4 py-2 border-2 border-black rounded-xl font-black">
            Back to Cohorts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background text-foreground font-sans pb-12 animate-fade">
      {/* Header section */}
      <div className="bg-secondary-background border-b-4 border-black py-5 sm:py-7 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1100px] mx-auto space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono font-bold">
            <span>League</span>
            <span>/</span>
            <span onClick={() => router.push('/cohorts')} className="text-foreground font-black hover:underline cursor-pointer">cohorts</span>
            <span>/</span>
            <span className="text-[9px] px-2 py-0.5 rounded-xl border-2 border-black bg-main text-main-foreground font-black uppercase tracking-wider">
              {activeCohort.slug}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-500" />
            <span>Collegiate Coding <span className="text-main">Cohorts</span></span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Join or launch private leagues for your university coding clubs, placement cells, or dev teams.
          </p>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <button
              onClick={() => router.push('/cohorts')}
              className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black rounded-xl bg-secondary-background text-xs font-black hover:bg-main hover:text-main-foreground shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Cohorts</span>
            </button>

            <div className="flex gap-2">
              {isAdmin && (
                <>
                  <button
                    onClick={() => setEditingCohort(!editingCohort)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black rounded-xl bg-secondary-background text-xs font-black hover:bg-main hover:text-main-foreground shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">{editingCohort ? "Cancel" : "Edit"}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCohort(activeCohort.slug)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black rounded-xl bg-red-100 text-red-600 text-xs font-black hover:bg-red-500 hover:text-white shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </>
              )}
              <button
                onClick={() => handleLeaveCohort(activeCohort.slug)}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black rounded-xl bg-red-100 text-red-600 text-xs font-black hover:bg-red-500 hover:text-white shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{actionLoading ? "Leaving..." : "Leave"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cohort profile card */}
            <div className="bg-secondary-background border-4 border-black rounded-xl p-5 md:p-6 shadow-[4px_4px_0px_#000] space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="bg-main/10 border-2 border-black p-3.5 rounded-2xl flex items-center justify-center gap-2">
                  <FolderOpen className="w-6 h-6 text-[#a855f7] dark:text-[#c084fc]" />
                  <span className="font-mono font-black text-sm uppercase tracking-wider text-black dark:text-white">Active League Hub</span>
                </div>

                {editingCohort ? (
                  <form onSubmit={handleUpdateCohort} className="space-y-3">
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full font-bold text-lg py-1.5 px-2 border-2 border-black rounded-2xl bg-white dark:bg-zinc-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a855f7]"
                    />
                    <textarea
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full font-medium text-sm py-1.5 px-2 border-2 border-black rounded-2xl bg-white dark:bg-zinc-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a855f7] resize-none"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading || !editName.trim()}
                      className="bg-main text-main-foreground font-black py-1.5 px-3 border-2 border-black rounded shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer text-xs disabled:opacity-50"
                    >
                      Save Changes
                    </button>
                  </form>
                ) : (
                  <>
                    <h2 className="text-2xl font-black text-foreground">{activeCohort.name}</h2>
                    {activeCohort.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed bg-background/50 border border-black p-3 rounded-2xl">
                        {activeCohort.description}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Share invite code block */}
              <div className="bg-zinc-50 dark:bg-zinc-900 border-2 border-black p-4.5 rounded-2xl space-y-2 mt-4">
                <div className="text-[10px] uppercase font-black text-zinc-500">League Invite Code</div>
                <div className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-950 border border-black p-2 rounded">
                  <code className="font-mono font-black text-lg text-main select-all">{activeCohort.invite_code}</code>
                  <button
                    onClick={() => handleCopyCode(activeCohort.invite_code)}
                    className="p-1 border border-black rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Copy code"
                  >
                    {copiedCode === activeCohort.invite_code ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clipboard className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono leading-tight">
                  Share this code with students to let them join this coding league automatically.
                </p>
              </div>

              {/* Daily Challenge Block */}
              <div className="bg-background border-2 border-black rounded-xl shadow-[4px_4px_0px_#000] p-4 mt-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-main" />
                  <h3 className="font-black uppercase tracking-tight text-sm">Daily Challenge</h3>
                </div>
                
                {dailyChallenge ? (
                  <div className="bg-secondary-background border-2 border-black p-3 rounded-xl flex flex-col gap-2">
                    <div className="text-xs font-bold text-muted-foreground">Today's Problem:</div>
                    <div className="font-black text-main">{dailyChallenge.problem_title || `Problem ID: ${dailyChallenge.problem_id}`}</div>
                    {dailyChallenge.problem_slug && (
                      <button 
                        onClick={() => router.push(`/problems/${dailyChallenge.problem_slug}`)}
                        className="w-full bg-main text-main-foreground font-black uppercase text-xs py-2 rounded border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000]"
                      >
                        Solve Now
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs font-bold text-muted-foreground bg-secondary-background border-2 border-black border-dashed p-3 rounded-xl text-center">
                    No challenge set for today.
                  </div>
                )}

                {isAdmin && (
                  <form onSubmit={handleSetChallenge} className="pt-2 border-t-2 border-black mt-2 flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase text-zinc-500">Admin: Set Challenge</span>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Problem ID"
                        value={challengeInputId}
                        onChange={(e) => setChallengeInputId(e.target.value)}
                        className="flex-1 px-2 py-1 border-2 border-black rounded bg-background text-xs font-bold"
                        required
                      />
                      <button
                        type="submit"
                        disabled={challengeLoading}
                        className="bg-main text-main-foreground font-black px-3 py-1 rounded border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none text-xs"
                      >
                        Set
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Cohort Leaderboard */}
            <div className="bg-secondary-background border-4 border-black rounded-xl shadow-[4px_4px_0px_#000] overflow-hidden lg:col-span-2">
              <div className="bg-main border-b-4 border-black px-4.5 py-3.5 flex items-center justify-between">
                <span className="font-mono font-black text-xs uppercase tracking-wider text-main-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Private Leaderboard</span>
                </span>
              </div>

              <div className="divide-y-2 divide-black">
                {leaderboard.map((entry) => {
                  const initial = (entry.display_name || entry.username).charAt(0).toUpperCase();
                  const isMe = user && entry.user_id === user.id;

                  return (
                    <div key={entry.user_id} className={`p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 ${isMe ? "bg-purple-100/20 dark:bg-purple-900/5" : ""}`}>
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <span className="font-black text-lg w-6 text-center text-zinc-400">
                          #{entry.rank}
                        </span>
                        {entry.avatar_url ? (
                          <img
                            src={entry.avatar_url}
                            alt={entry.username}
                            className="w-10 h-10 rounded-full border-2 border-black object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full border-2 border-black bg-purple-200 dark:bg-purple-800 flex items-center justify-center font-mono font-black text-base text-black">
                            {initial}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-black text-foreground flex items-center gap-1.5">
                            <span>{entry.display_name || entry.username}</span>
                            {isMe && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded border border-black bg-main text-main-foreground font-black uppercase">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">@{entry.username}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-right">
                        <div className="hidden sm:block">
                          <div className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Streak</div>
                          <div className="font-mono font-bold text-sm text-[#ffbf00]">🔥 {entry.current_streak}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Solves</div>
                          <div className="font-mono font-black text-lg text-foreground">{entry.total_solves}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDestructive={confirmModal.isDestructive}
        hideCancel={confirmModal.hideCancel}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
      />
    </div>
  );
}
