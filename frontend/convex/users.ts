import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const sync = mutation({
  args: {
    userId: v.string(),
    username: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    let userDocId;
    if (existing) {
      await ctx.db.patch(existing._id, {
        username: args.username,
        email: args.email,
        avatarUrl: args.avatarUrl,
        displayName: args.displayName,
      });
      userDocId = existing._id;
    } else {
      userDocId = await ctx.db.insert("users", {
        userId: args.userId,
        username: args.username,
        email: args.email,
        avatarUrl: args.avatarUrl,
        displayName: args.displayName,
        eloRating: 1200,
      });
    }

    // Ensure user streak record exists
    const existingStreak = await ctx.db
      .query("userStreaks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!existingStreak) {
      await ctx.db.insert("userStreaks", {
        userId: args.userId,
        currentStreak: 0,
        longestStreak: 0,
        totalSolves: 0,
      });
    }

    // Ensure user stats record exists
    const existingStats = await ctx.db
      .query("userStats")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!existingStats) {
      await ctx.db.insert("userStats", {
        userId: args.userId,
        arenaMatches: 0,
        arenaWins: 0,
        eloRating: 1200,
      });
    }

    return userDocId;
  },
});

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
  },
});
