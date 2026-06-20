"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getFriends, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, FriendshipResponse } from "@/lib/api";
import { UserPlus, Check, Clock, Users, X } from "lucide-react";

export default function FriendsPage() {
  const { user } = useAuth();
  const [friendships, setFriendships] = useState<FriendshipResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [usernameInput, setUsernameInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchFriends = async () => {
    try {
      const data = await getFriends();
      setFriendships(data);
    } catch (err: any) {
      setError(err.message || "Failed to load friends");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    
    setSending(true);
    setError(null);
    setSuccess(null);
    
    try {
      await sendFriendRequest(usernameInput.trim());
      setSuccess(`Friend request sent to ${usernameInput}!`);
      setUsernameInput("");
      fetchFriends();
    } catch (err: any) {
      setError(err.message || "Failed to send request");
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await acceptFriendRequest(id);
      fetchFriends();
    } catch (err: any) {
      setError(err.message || "Failed to accept request");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectFriendRequest(id);
      fetchFriends();
    } catch (err: any) {
      setError(err.message || "Failed to reject request");
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-foreground gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-transparent border-t-main animate-spin" />
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Loading Friends...</span>
      </div>
    );
  }

  const myId = user?.id || "dev-user-id"; // using dev fallback

  const accepted = friendships.filter(f => f.status === "accepted");
  const incoming = friendships.filter(f => f.status === "pending" && f.friend_id === myId);
  const outgoing = friendships.filter(f => f.status === "pending" && f.user_id === myId);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <Users className="w-8 h-8 text-main" />
          Friends
        </h1>
      </div>

      {error && (
        <div className="mb-6 bg-[#f85149]/10 border-2 border-[#f85149] text-[#f85149] px-4 py-3 rounded-xl font-bold text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-[#8bd600]/10 border-2 border-[#8bd600] text-[#8bd600] px-4 py-3 rounded-xl font-bold text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Add Friend & Pending */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <div className="bg-secondary-background border-2 border-black rounded-xl p-5 shadow-[4px_4px_0px_0px_#000]">
            <h2 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-main" />
              Add Friend
            </h2>
            <form onSubmit={handleSendRequest} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full px-3 py-2 bg-background border-2 border-black rounded-lg text-sm font-bold placeholder:text-muted-foreground outline-none focus:border-main focus:shadow-[2px_2px_0px_0px_#000] transition-all"
              />
              <button
                type="submit"
                disabled={sending || !usernameInput.trim()}
                className="w-full bg-main text-main-foreground font-black text-sm uppercase px-4 py-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send Request"}
              </button>
            </form>
          </div>

          {(incoming.length > 0 || outgoing.length > 0) && (
            <div className="bg-secondary-background border-2 border-black rounded-xl p-5 shadow-[4px_4px_0px_0px_#000]">
              <h2 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#ffbf00]" />
                Pending Requests
              </h2>
              
              {incoming.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-black uppercase text-muted-foreground mb-2">Incoming</h3>
                  <div className="flex flex-col gap-2">
                    {incoming.map(f => (
                      <div key={f.id} className="bg-background border-2 border-black rounded-lg p-2.5 flex items-center justify-between">
                        <span className="font-bold text-sm truncate">{f.friend_username}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept(f.id)}
                            className="bg-[#8bd600] text-black w-7 h-7 rounded border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(f.id)}
                            className="bg-[#f85149] text-white w-7 h-7 rounded border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {outgoing.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase text-muted-foreground mb-2">Outgoing</h3>
                  <div className="flex flex-col gap-2">
                    {outgoing.map(f => (
                      <div key={f.id} className="bg-background border-2 border-black rounded-lg p-2.5 flex items-center justify-between opacity-70">
                        <span className="font-bold text-sm truncate">{f.friend_username}</span>
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Sent</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Friends List */}
        <div className="md:col-span-2">
          <div className="bg-secondary-background border-2 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_#000] h-full min-h-[400px]">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6">My Friends ({accepted.length})</h2>
            
            {accepted.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                <Users className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-bold text-sm">You haven't added any friends yet.</p>
                <p className="text-xs mt-1">Search for a username to send a friend request!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {accepted.map(f => (
                  <div key={f.id} className="bg-background border-2 border-black rounded-xl p-4 flex items-center gap-4 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#000] transition-all">
                    {f.friend_avatar_url ? (
                      <img src={f.friend_avatar_url} alt={f.friend_username} className="w-12 h-12 rounded-lg border-2 border-black object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-main border-2 border-black flex items-center justify-center text-xl font-black text-main-foreground flex-shrink-0">
                        {f.friend_username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-base truncate">{f.friend_display_name || f.friend_username}</div>
                      <div className="font-mono text-xs text-muted-foreground truncate">@{f.friend_username}</div>
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
