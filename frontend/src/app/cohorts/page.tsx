"use client";

import { useEffect, useState } from "react";
import { getMyCohorts, createCohort, joinCohort } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { CohortResponse } from "@/lib/types";
import { Users, Plus, Send } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CohortsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // States
  const [cohorts, setCohorts] = useState<CohortResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [cohortName, setCohortName] = useState("");
  const [cohortDesc, setCohortDesc] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      router.push(`/cohorts/${newCohort.slug}`);
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
      router.push(`/cohorts/${joined.slug}`);
    } catch (err: any) {
      setFormError(err.message || "Invalid or inactive invite code.");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-background text-foreground font-sans pb-12 animate-fade">
      {/* Header section */}
      <div className="bg-secondary-background border-b-4 border-black py-5 sm:py-7 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1100px] mx-auto space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono font-bold">
            <span>League</span>
            <span>/</span>
            <span className="text-foreground font-black hover:underline cursor-pointer">cohorts</span>
            <span className="text-[9px] px-2 py-0.5 rounded-xl border-2 border-black bg-main text-main-foreground font-black uppercase tracking-wider">
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

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          
          {/* Left columns:joined cohorts list */}
          <div className="lg:col-span-2 space-y-5">
            <h2 className="text-lg font-black text-foreground flex items-center gap-2 select-none">
              <span>Joined Coding Leagues</span>
              <span className="font-mono text-xs font-bold text-zinc-500 bg-secondary-background border border-black px-2 py-0.5 rounded">
                {cohorts.length} total
              </span>
            </h2>

            {loading ? (
              <div className="flex justify-center py-24 bg-secondary-background border-4 border-black rounded-2xl">
                <div className="w-8 h-8 rounded-full border-4 border-transparent border-t-main animate-spin" />
              </div>
            ) : error ? (
              <div className="p-6 bg-red-500/10 border-2 border-black text-red-500 text-sm font-bold rounded-2xl text-center">
                ⚠️ Failed to load leagues: {error}
              </div>
            ) : cohorts.length === 0 ? (
              <div className="bg-secondary-background border-4 border-black p-10 rounded-2xl text-center space-y-4 shadow-[4px_4px_0px_#000] select-none">
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
                      onClick={() => router.push(`/cohorts/${cohort.slug}`)}
                      className="bg-secondary-background border-4 border-black p-5 rounded-2xl shadow-[3.5px_3.5px_0px_#000] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#000] cursor-pointer transition-all flex flex-col justify-between h-44 select-none relative group"
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
                  className="w-full uppercase font-mono font-black text-center text-sm py-2 px-3 border-2 border-black rounded-2xl bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a855f7]"
                />
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full bg-[#a855f7] dark:bg-[#c084fc] text-black font-black py-2.5 px-4 border-2 border-black rounded-2xl shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer text-xs"
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
                    className="w-full font-bold text-xs py-2 px-3 border-2 border-black rounded-2xl bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a855f7]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 select-none">Description (Optional)</label>
                  <textarea
                    rows={2.5}
                    placeholder="Private coding hub for placement preparation."
                    value={cohortDesc}
                    onChange={(e) => setCohortDesc(e.target.value)}
                    className="w-full font-bold text-xs py-2 px-3 border-2 border-black rounded-2xl bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#a855f7] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading || !cohortName.trim()}
                  className="w-full bg-[#a855f7] dark:bg-[#c084fc] text-black font-black py-2.5 px-4 border-2 border-black rounded-2xl shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer text-xs disabled:opacity-40"
                >
                  {formLoading ? "Creating..." : "Launch League Hub"}
                </button>
              </form>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
