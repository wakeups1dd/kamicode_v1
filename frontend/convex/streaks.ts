import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userStreaks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const updateStreak = mutation({
  args: {
    userId: v.string(),
    isAccepted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userStreaks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    if (!existing) {
      if (args.isAccepted) {
        await ctx.db.insert("userStreaks", {
          userId: args.userId,
          currentStreak: 1,
          longestStreak: 1,
          lastSolveDate: today,
          totalSolves: 1,
        });
      }
      return;
    }

    if (args.isAccepted) {
      if (existing.lastSolveDate === today) {
        // Already solved today, just increment total solves
        await ctx.db.patch(existing._id, {
          totalSolves: existing.totalSolves + 1,
        });
      } else {
        const lastDate = new Date(existing.lastSolveDate || "2000-01-01");
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        let newStreak = existing.currentStreak;
        if (existing.lastSolveDate === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }

        await ctx.db.patch(existing._id, {
          currentStreak: newStreak,
          longestStreak: Math.max(existing.longestStreak, newStreak),
          lastSolveDate: today,
          totalSolves: existing.totalSolves + 1,
        });
      }
    }
  },
});

// User Stats (Arena)
export const getStats = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userStats")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const updateStats = mutation({
  args: {
    userId: v.string(),
    matchPlayed: v.boolean(),
    matchWon: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userStats")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!existing) {
      await ctx.db.insert("userStats", {
        userId: args.userId,
        arenaMatches: args.matchPlayed ? 1 : 0,
        arenaWins: args.matchWon ? 1 : 0,
      });
    } else {
      await ctx.db.patch(existing._id, {
        arenaMatches: existing.arenaMatches + (args.matchPlayed ? 1 : 0),
        arenaWins: existing.arenaWins + (args.matchWon ? 1 : 0),
      });
    }
  },
});

export const getGlobalLeaderboard = query({
  handler: async (ctx) => {
    const streaks = await ctx.db.query("userStreaks").collect();
    // Sort by totalSolves desc, then currentStreak desc
    streaks.sort((a, b) => {
      if (b.totalSolves !== a.totalSolves) {
        return b.totalSolves - a.totalSolves;
      }
      return b.currentStreak - a.currentStreak;
    });
    
    const top = streaks.slice(0, 100);
    const result = [];
    for (const s of top) {
      const u = await ctx.db.query("users").withIndex("by_userId", (q) => q.eq("userId", s.userId)).first();
      result.push({
        userId: s.userId,
        totalSolves: s.totalSolves,
        currentStreak: s.currentStreak,
        longestStreak: s.longestStreak,
        username: u?.username || "Unknown",
        displayName: u?.displayName,
        avatarUrl: u?.avatarUrl
      });
    }
    return result;
  }
});

export const getCohortLeaderboard = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    const members = await ctx.db.query("cohortMembers").withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId)).collect();
    const result = [];
    
    for (const m of members) {
      const u = await ctx.db.query("users").withIndex("by_userId", (q) => q.eq("userId", m.userId)).first();
      const s = await ctx.db.query("userStreaks").withIndex("by_userId", (q) => q.eq("userId", m.userId)).first();
      
      result.push({
        userId: m.userId,
        totalSolves: s?.totalSolves || 0,
        currentStreak: s?.currentStreak || 0,
        longestStreak: s?.longestStreak || 0,
        username: u?.username || "Unknown",
        displayName: u?.displayName,
        avatarUrl: u?.avatarUrl
      });
    }
    
    result.sort((a, b) => {
      if (b.totalSolves !== a.totalSolves) {
        return b.totalSolves - a.totalSolves;
      }
      return b.currentStreak - a.currentStreak;
    });
    
    return result;
  }
});

