"use client";

import { useEffect, useState } from "react";
import { getMyCohorts, createCohort, joinCohort, getCohortDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { CohortResponse, CohortDetailResponse } from "@/lib/types";
import { Users, Plus, ShieldCheck, Clipboard, Check, Sparkles, FolderOpen, ArrowLeft, Send } from "lucide-react";

export default function CohortsPage() {
  const { user } = useAuth();
  
  // States
  const [cohorts, setCohorts] = useState<CohortResponse[]>([]);
  const [activeCohort, setActiveCohort] = useState<CohortDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [cohortName, setCohortName] = useState("");
  const [cohortDesc, setCohortDesc] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load cohorts
  const loadCohorts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyCohorts();
      setCohorts(data);
    } catch (err: any) {
      setError(err.message || "Failed to load cohorts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCohorts();
  }, []);

  // Create Cohort
  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cohortName.trim()) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const newCohort = await createCohort({
        name: cohortName,
        description: cohortDesc || undefined
      });
      setCohortName("");
      setCohortDesc("");
      loadCohorts();
      // Load details of the newly created cohort
      loadCohortDetail(newCohort.slug);
    } catch (err: any) {
      setFormError(err.message || "Failed to create cohort.");
    } finally {
      setFormLoading(false);
    }
  };

  // Join Cohort
  const handleJoinCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const joined = await joinCohort(inviteCodeInput);
      setInviteCodeInput("");
      loadCohorts();
      loadCohortDetail(joined.slug);
    } catch (err: any) {
      setFormError(err.message || "Invalid or inactive invite code.");
    } finally {
      setFormLoading(false);
    }
  };

  // Load cohort detail
  const loadCohortDetail = async (slug: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await getCohortDetail(slug);
      setActiveCohort(detail);
    } catch (err: any) {
      setError(err.message || "Failed to load cohort details.");
    } finally {
      setDetailLoading(false);
    }
  };

  // Copy invite code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-full bg-background text-foreground font-sans pb-12 animate-fade">
      {/* Header section */}
      <div className="bg-secondary-background border-b-4 border-black py-7 px-6 sm:px-8">
        <div className="max-w-[1100px] mx-auto space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono font-bold">
            <span>League</span>
            <span>/</span>
            <span className="text-foreground font-black hover:underline cursor-pointer">cohorts</span>
            <span className="text-[9px] px-2 py-0.5 rounded-[4px] border-2 border-black bg-main text-main-foreground font-black uppercase tracking-wider">
              hubs
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

      <div className="max-w-[1100px] mx-auto px-6 py-8">
        {activeCohort ? (
          /* ─── Detail View ────────────────────────────────────────── */
          <div className="space-y-6">
            <button
              onClick={() => setActiveCohort(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black rounded-[6px] bg-secondary-background text-xs font-black hover:bg-main hover:text-main-foreground shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Cohorts</span>
            </button>

            {detailLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-secondary-background border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_#000] gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-transparent border-t-main animate-spin" />
                <span className="text-xs font-mono font-bold text-muted-foreground">Loading details...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cohort profile card */}
                <div className="bg-secondary-background border-4 border-black rounded-xl p-5 md:p-6 shadow-[4px_4px_0px_#000] space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="bg-main/10 border-2 border-black p-3.5 rounded-lg flex items-center justify-center gap-2">
                      <FolderOpen className="w-6 h-6 text-[#a855f7] dark:text-[#c084fc]" />
                      <span className="font-mono font-black text-sm uppercase tracking-wider text-black dark:text-white">Active League Hub</span>
                    </div>

                    <h2 className="text-2xl font-black text-foreground">{activeCohort.name}</h2>
                    {activeCohort.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed bg-background/50 border border-black p-3 rounded-lg">
                        {activeCohort.description}
                      </p>
                    )}
                  </div>

                  {/* Share invite code block */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 border-2 border-black p-4.5 rounded-lg space-y-2 mt-4">
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
                </div>

                {/* Cohort Members standings roster */}
                <div className="bg-secondary-background border-4 border-black rounded-xl shadow-[4px_4px_0px_#000] overflow-hidden lg:col-span-2">
                  <div className="bg-main border-b-4 border-black px-4.5 py-3.5 flex items-center justify-between">
                    <span className="font-mono font-black text-xs uppercase tracking-wider text-main-foreground flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>Cohort Members ({activeCohort.members.length})</span>
                    </span>
                  </div>

                  <div className="divide-y-2 divide-black">
                    {activeCohort.members.map((member, idx) => {
                      const initial = (member.display_name || member.username).charAt(0).toUpperCase();
                      const isOwner = member.role === "admin";
                      const isMe = user && member.user_id === user.id;

                      return (
                        <div key={member.user_id} className={`p-4 flex items-center justify-between gap-4 ${isMe ? "bg-purple-100/20 dark:bg-purple-900/5" : ""}`}>
                          <div className="flex items-center gap-3">
                            {member.avatar_url ? (
                              <img
                                src={member.avatar_url}
                                alt={member.username}
                                className="w-8 h-8 rounded-full border-2 border-black object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full border-2 border-black bg-purple-200 dark:bg-purple-800 flex items-center justify-center font-mono font-black text-xs text-black">
                                {initial}
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-black text-foreground flex items-center gap-1.5">
                                <span>{member.display_name || member.username}</span>
                                {isMe && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded border border-black bg-main text-main-foreground font-black uppercase">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono">@{member.username}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[9.5px] text-zinc-500 font-bold">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </span>
                            {isOwner ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border-2 border-black rounded bg-[#ffbf00] text-black">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Admin</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border-2 border-black rounded bg-background text-foreground">
                                Member
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ─── List / Management View ────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left columns:joined cohorts list */}
            <div className="lg:col-span-2 space-y-5">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2 select-none">
                <span>Joined Coding Leagues</span>
                <span className="font-mono text-xs font-bold text-zinc-500 bg-secondary-background border border-black px-2 py-0.5 rounded">
                  {cohorts.length} total
                </span>
              </h2>

              {loading ? (
                <div className="flex justify-center py-24 bg-secondary-background border-4 border-black rounded-lg">
                  <div className="w-8 h-8 rounded-full border-4 border-transparent border-t-main animate-spin" />
                </div>
              ) : error ? (
                <div className="p-6 bg-red-500/10 border-2 border-black text-red-500 text-sm font-bold rounded-lg text-center">
                  ⚠️ Failed to load leagues: {error}
                </div>
              ) : cohorts.length === 0 ? (
                <div className="bg-secondary-background border-4 border-black p-10 rounded-lg text-center space-y-4 shadow-[4px_4px_0px_#000] select-none">
                  <div className="text-3xl">🌌</div>
                  <h3 className="font-bold text-sm text-zinc-700 dark:text-zinc-300">You haven't joined any coding leagues yet.</h3>
                  <p className="text-xs text-muted-foreground font-mono max-w-sm mx-auto leading-relaxed">
                    Create a new collegiate league hub for your teammates, or enter an invite code on the right to participate.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cohorts.map((cohort) => {
                    return (
                      <div
                        key={cohort.id}
                        onClick={() => loadCohortDetail(cohort.slug)}
                        className="bg-secondary-background border-4 border-black p-5 rounded-lg shadow-[3.5px_3.5px_0px_#000] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#000] cursor-pointer transition-all flex flex-col justify-between h-44 select-none relative group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] text-[#a855f7] dark:text-[#c084fc] font-black uppercase tracking-wider">
                              Active Cohort
                            </span>
                            <span className="font-mono text-[9px] bg-background text-foreground border border-black px-1.5 py-0.5 rounded">
                              CODE: {cohort.invite_code}
                            </span>
                          </div>
                          <h3 className="font-black text-base text-foreground group-hover:text-main transition-colors truncate">
                            {cohort.name}
                          </h3>
                          <p className="text-xs text-zinc-500 font-medium line-clamp-2">
                            {cohort.description || "A competitive coding league for developers to solve DSA problems."}
                          </p>
                        </div>

                        <div className="border-t border-black pt-3 flex items-center justify-between text-[10.5px] font-bold text-zinc-600 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>View League Hub</span>
                          </span>
                          <span className="font-mono text-[9px]">
                            Joined {new Date(cohort.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right column: Action forms */}
            <div className="space-y-6">
              
              {/* Join cohort form */}
              <div className="bg-secondary-background border-4 border-black p-5 md:p-6 rounded-xl shadow-[4px_4px_0px_#000] space-y-4">
                <h3 className="font-black text-base text-foreground flex items-center gap-2 select-none">
                  <Send className="w-4 h-4 text-main" />
                  <span>Join with Code</span>
                </h3>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed select-none">
                  Got an invite code? Paste it below to participate in a private university league.
                </p>

                {formError && (
                  <div className="bg-red-100 dark:bg-red-950 border-2 border-red-500 text-red-700 dark:text-red-300 p-2.5 rounded font-mono text-[10.5px] font-bold">
                    ⚠️ {formError}
                  </div>
                )}

                <form onSubmit={handleJoinCohort} className="space-y-3.5">
                  <input
                    type="text"
                    required
                    placeholder="E.g. KAMI92"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value)}
                    className="w-full uppercase font-mono font-black text-center text-sm py-2 px-3 border-2 border-black rounded-lg bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a855f7]"
                  />
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full bg-[#a855f7] dark:bg-[#c084fc] text-black font-black py-2.5 px-4 border-2 border-black rounded-lg shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer text-xs"
                  >
                    {formLoading ? "Joining..." : "Enter League"}
                  </button>
                </form>
              </div>

              {/* Create cohort form */}
              <div className="bg-secondary-background border-4 border-black p-5 md:p-6 rounded-xl shadow-[4px_4px_0px_#000] space-y-4">
                <h3 className="font-black text-base text-foreground flex items-center gap-2 select-none">
                  <Plus className="w-4 h-4 text-main" />
                  <span>Create League</span>
                </h3>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed select-none">
                  Establish a new private cohort, track streak scores, and generate invite codes.
                </p>

                <form onSubmit={handleCreateCohort} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 select-none">Cohort League Name</label>
                    <input
                      type="text"
                      required
                      placeholder="University Coding Club"
                      value={cohortName}
                      onChange={(e) => setCohortName(e.target.value)}
                      className="w-full font-bold text-xs py-2 px-3 border-2 border-black rounded-lg bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a855f7]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 select-none">Description (Optional)</label>
                    <textarea
                      rows={2.5}
                      placeholder="Private coding hub for placement preparation."
                      value={cohortDesc}
                      onChange={(e) => setCohortDesc(e.target.value)}
                      className="w-full font-bold text-xs py-2 px-3 border-2 border-black rounded-lg bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a855f7] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={formLoading || !cohortName.trim()}
                    className="w-full bg-[#a855f7] dark:bg-[#c084fc] text-black font-black py-2.5 px-4 border-2 border-black rounded-lg shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer text-xs disabled:opacity-40"
                  >
                    {formLoading ? "Creating..." : "Launch League Hub"}
                  </button>
                </form>
              </div>

            </div>

          </div>
        )}
      </div>
    </div>
  );
}
