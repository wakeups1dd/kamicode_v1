import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const sendRequest = mutation({
  args: { userId: v.string(), friendId: v.string() },
  handler: async (ctx, args) => {
    // Check if already exists in either direction
    const existing = await ctx.db
      .query("friendships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("friendId"), args.friendId))
      .first();

    const existingReverse = await ctx.db
      .query("friendships")
      .withIndex("by_user", (q) => q.eq("userId", args.friendId))
      .filter((q) => q.eq(q.field("friendId"), args.userId))
      .first();

    if (existing || existingReverse) {
      throw new Error("Friendship or request already exists");
    }

    await ctx.db.insert("friendships", {
      userId: args.userId,
      friendId: args.friendId,
      status: "pending",
    });
  },
});

export const acceptRequest = mutation({
  args: { requestId: v.id("friendships") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, { status: "accepted" });
  },
});

export const rejectRequest = mutation({
  args: { requestId: v.id("friendships") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, { status: "rejected" });
  },
});

export const listFriends = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const sent = await ctx.db
      .query("friendships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const received = await ctx.db
      .query("friendships")
      .withIndex("by_friend", (q) => q.eq("friendId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const friends = [];

    // Fetch user details for each friend
    for (const f of sent) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", f.friendId))
        .first();
      if (user) friends.push(user);
    }
    for (const f of received) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", f.userId))
        .first();
      if (user) friends.push(user);
    }

    return friends;
  },
});

export const listPendingRequests = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const received = await ctx.db
      .query("friendships")
      .withIndex("by_friend", (q) => q.eq("friendId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const requests = [];
    for (const r of received) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", r.userId))
        .first();
      if (user) {
        requests.push({ request: r, user });
      }
    }
    return requests;
  },
});

export const listAllForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const sent = await ctx.db
      .query("friendships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const received = await ctx.db
      .query("friendships")
      .withIndex("by_friend", (q) => q.eq("friendId", args.userId))
      .collect();

    const allFriendships = [...sent, ...received];
    const result = [];

    for (const f of allFriendships) {
      if (f.status === "rejected") continue;

      const otherUserId = f.userId === args.userId ? f.friendId : f.userId;
      const otherUser = await ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", otherUserId))
        .first();

      result.push({
        id: String(f._id),
        user_id: f.userId,
        friend_id: f.friendId,
        status: f.status,
        friend_username: otherUser?.username || (otherUserId === "dev-user-id" ? "dev_user" : `user_${otherUserId.slice(-6)}`),
        friend_display_name: otherUser?.displayName || otherUser?.username || "Developer",
        friend_avatar_url: otherUser?.avatarUrl || null,
        created_at: f._creationTime,
      });
    }

    return result;
  },
});
