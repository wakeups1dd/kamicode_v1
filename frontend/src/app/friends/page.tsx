"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  FriendshipResponse,
  sendArenaInvite,
} from "@/lib/api";
import {
  UserPlus,
  Check,
  Clock,
  Users,
  X,
  Swords,
  Inbox,
  Send,
  Sparkles,
} from "lucide-react";

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const [friendships, setFriendships] = useState<FriendshipResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [usernameInput, setUsernameInput] = useState("");
  const [sending, setSending] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requestTab, setRequestTab] = useState<"incoming" | "outgoing">("incoming");
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const fetchFriends = async () => {
    try {
      const data = await getFriends();
      setFriendships(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load friends");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchFriends();
  }, [authLoading, user]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = usernameInput.trim();
    if (!cleanUsername) return;

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      await sendFriendRequest(cleanUsername);
      setSuccess(`Friend request sent to @${cleanUsername}!`);
      setUsernameInput("");
      await fetchFriends();
      setRequestTab("outgoing");
    } catch (err: any) {
      setError(err.message || "Failed to send request");
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (id: string | number, friendName: string) => {
    setActionInProgress(String(id));
    setError(null);
    try {
      await acceptFriendRequest(id);
      setSuccess(`You are now friends with @${friendName}!`);
      await fetchFriends();
    } catch (err: any) {
      setError(err.message || "Failed to accept request");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (id: string | number) => {
    setActionInProgress(String(id));
    setError(null);
    try {
      await rejectFriendRequest(id);
      await fetchFriends();
    } catch (err: any) {
      setError(err.message || "Failed to decline request");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleChallenge = async (friendId: string, friendUsername: string) => {
    const roomCode = `KAMIDUEL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    try {
      await sendArenaInvite(friendId, roomCode);
      setInviteSuccess(`Duel challenge sent to @${friendUsername}! Room: ${roomCode}`);
      setTimeout(() => setInviteSuccess(null), 6000);
    } catch (err: any) {
      setError(err.message || "Failed to send arena invite");
    }
  };

  if (authLoading || (loading && user)) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-foreground gap-4 select-none">
        <div className="w-10 h-10 rounded-full border-4 border-transparent border-t-main animate-spin" />
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Loading developer network...
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto p-6 md:p-12 text-center animate-fade space-y-6 select-none">
        <div className="bg-secondary-background border-4 border-black p-8 rounded-2xl shadow-[8px_8px_0px_#000] space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-main border-2 border-black mx-auto flex items-center justify-center shadow-[3px_3px_0px_#000]">
            <Users className="w-8 h-8 text-main-foreground" />
          </div>
          <h2 className="text-2xl font-black text-foreground">Sign In to Connect with Friends</h2>
          <p className="text-sm text-muted-foreground font-medium">
            Join the developer network, send friend requests by username, accept incoming requests, and challenge your peers to 1v1 Arena duels.
          </p>
          <div className="pt-2">
            <Link
              href="/auth"
              className="inline-block px-6 py-3 rounded-xl bg-main text-main-foreground font-black text-sm border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
            >
              Sign In to KamiCode
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const myId = user.id;

  const accepted = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter(
    (f) => f.status === "pending" && f.friend_id === myId
  );
  const outgoing = friendships.filter(
    (f) => f.status === "pending" && f.user_id === myId
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade pb-16">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-black pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-muted-foreground mb-1">
            <span>Community</span>
            <span>/</span>
            <span className="text-foreground font-black">friends</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-main" />
            <span>Developer Network</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-secondary-background border-2 border-black px-3 py-1.5 rounded-xl font-mono text-xs font-bold shadow-[2px_2px_0px_#000]">
            <span className="text-muted-foreground">Friends: </span>
            <span className="text-main font-black">{accepted.length}</span>
          </div>
          {incoming.length > 0 && (
            <div className="bg-[#ffbf00] text-black border-2 border-black px-3 py-1.5 rounded-xl font-mono text-xs font-black shadow-[2px_2px_0px_#000] animate-bounce">
              {incoming.length} New Request{incoming.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-6 bg-[#f85149]/10 border-2 border-[#f85149] text-[#f85149] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-[#8bd600]/10 border-2 border-[#8bd600] text-[#8bd600] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-between">
          <span>✨ {success}</span>
          <button onClick={() => setSuccess(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {inviteSuccess && (
        <div className="mb-6 bg-[#a855f7]/10 border-2 border-[#a855f7] text-[#a855f7] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-between">
          <span>⚔️ {inviteSuccess}</span>
          <button onClick={() => setInviteSuccess(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Add Friend & Friend Requests Inbox */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Add Friend Form */}
          <div className="bg-secondary-background border-4 border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000]">
            <h2 className="text-base font-black uppercase tracking-tight mb-2 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-main" />
              <span>Add Friend</span>
            </h2>
            <p className="text-xs text-muted-foreground font-medium mb-4 leading-relaxed">
              Enter any coder's exact username to send them a connection invite.
            </p>
            <form onSubmit={handleSendRequest} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Username (e.g. alex_dev)"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border-2 border-black rounded-xl text-xs font-bold placeholder:text-muted-foreground outline-none focus:border-main focus:shadow-[2px_2px_0px_#000] transition-all"
              />
              <button
                type="submit"
                disabled={sending || !usernameInput.trim()}
                className="w-full bg-main text-main-foreground font-black text-xs uppercase py-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50 cursor-pointer"
              >
                {sending ? "Sending..." : "Send Request"}
              </button>
            </form>
          </div>

          {/* Dedicated Always-Visible Friend Requests Inbox */}
          <div className="bg-secondary-background border-4 border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <Inbox className="w-5 h-5 text-[#ffbf00]" />
                <span>Friend Requests</span>
              </h2>
              {incoming.length > 0 && (
                <span className="bg-main text-main-foreground text-[10px] font-black font-mono px-2 py-0.5 rounded-full border border-black">
                  {incoming.length}
                </span>
              )}
            </div>

            {/* Tabs for Incoming vs Outgoing */}
            <div className="flex border-2 border-black rounded-xl overflow-hidden mb-4 bg-background">
              <button
                type="button"
                onClick={() => setRequestTab("incoming")}
                className={`flex-1 py-2 text-xs font-black transition-colors flex items-center justify-center gap-1.5 ${
                  requestTab === "incoming"
                    ? "bg-main text-main-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Incoming</span>
                {incoming.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black text-white font-mono">
                    {incoming.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setRequestTab("outgoing")}
                className={`flex-1 py-2 text-xs font-black transition-colors flex items-center justify-center gap-1.5 border-l-2 border-black ${
                  requestTab === "outgoing"
                    ? "bg-main text-main-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Sent</span>
                {outgoing.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black text-white font-mono">
                    {outgoing.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Contents: Incoming Requests */}
            {requestTab === "incoming" && (
              <div className="space-y-3">
                {incoming.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl space-y-1">
                    <p className="text-xs font-bold text-muted-foreground">
                      No incoming friend requests.
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      When other coders add you, their invitations will appear here to accept or decline.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {incoming.map((f) => (
                      <div
                        key={f.id}
                        className="bg-background border-2 border-black rounded-xl p-3 flex items-center justify-between gap-2 shadow-[2px_2px_0px_#000]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {f.friend_avatar_url ? (
                            <img
                              src={f.friend_avatar_url}
                              alt={f.friend_username}
                              className="w-9 h-9 rounded-lg border border-black object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-[#a855f7] border border-black flex items-center justify-center text-xs font-black text-white flex-shrink-0">
                              {f.friend_username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-black text-xs truncate">
                              {f.friend_display_name || f.friend_username}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground truncate">
                              @{f.friend_username}
                            </div>
                          </div>
                        </div>

                        {/* Accept & Reject Action Buttons */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleAccept(f.id, f.friend_username)}
                            disabled={actionInProgress === String(f.id)}
                            className="bg-[#8bd600] text-black px-2.5 py-1 rounded-lg border-2 border-black flex items-center gap-1 text-[10px] font-black shadow-[1px_1px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer disabled:opacity-50"
                            title="Accept request"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => handleReject(f.id)}
                            disabled={actionInProgress === String(f.id)}
                            className="bg-[#f85149] text-white p-1 rounded-lg border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer disabled:opacity-50"
                            title="Decline request"
                          >
                            <X className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab Contents: Outgoing / Sent Requests */}
            {requestTab === "outgoing" && (
              <div className="space-y-3">
                {outgoing.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl space-y-1">
                    <p className="text-xs font-bold text-muted-foreground">
                      No sent requests pending.
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      Use the "Add Friend" form above to search for coders by username.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {outgoing.map((f) => (
                      <div
                        key={f.id}
                        className="bg-background border-2 border-black rounded-xl p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Send className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-bold text-xs truncate">
                            @{f.friend_username}
                          </span>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Friends List */}
        <div className="lg:col-span-2">
          <div className="bg-secondary-background border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000] min-h-[440px]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-black">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                  <span>My Friends</span>
                  <span className="text-xs font-mono font-bold bg-main text-main-foreground px-2 py-0.5 rounded-md border border-black">
                    {accepted.length}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  Connected developers you can practice with and challenge to 1v1 Arena matches.
                </p>
              </div>
            </div>

            {accepted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground select-none">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-black flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 opacity-40 text-foreground" />
                </div>
                <h3 className="font-black text-sm text-foreground">You have no friends added yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
                  Enter a friend's username in the left panel to send an invite, or accept incoming requests in your Requests inbox.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {accepted.map((f) => (
                  <div
                    key={f.id}
                    className="bg-background border-3 border-black rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#000] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {f.friend_avatar_url ? (
                        <img
                          src={f.friend_avatar_url}
                          alt={f.friend_username}
                          className="w-12 h-12 rounded-xl border-2 border-black object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-main border-2 border-black flex items-center justify-center text-lg font-black text-main-foreground flex-shrink-0">
                          {f.friend_username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-sm truncate text-foreground">
                          {f.friend_display_name || f.friend_username}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground truncate">
                          @{f.friend_username}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-black/15 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#8bd600] inline-block" />
                        <span>Connected</span>
                      </span>
                      <button
                        onClick={() =>
                          handleChallenge(
                            f.user_id === myId ? f.friend_id : f.user_id,
                            f.friend_username
                          )
                        }
                        className="bg-main text-main-foreground px-3 py-1.5 rounded-lg border-2 border-black font-black text-xs shadow-[1.5px_1.5px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Challenge to 1v1 Arena duel"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>Challenge</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
