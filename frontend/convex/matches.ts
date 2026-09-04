import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const recordResult = mutation({
  args: {
    matchId: v.string(),
    player1Id: v.string(),
    player2Id: v.string(),
    winnerId: v.optional(v.string()),
    problemId: v.string(),
    status: v.string(),
    durationSeconds: v.optional(v.number()),
    p1EloBefore: v.optional(v.number()),
    p1EloAfter: v.optional(v.number()),
    p2EloBefore: v.optional(v.number()),
    p2EloAfter: v.optional(v.number()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if match already recorded
    const existing = await ctx.db
      .query("matches")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .first();

    let matchRecordId;
    if (existing) {
      await ctx.db.patch(existing._id, {
        winnerId: args.winnerId,
        status: args.status,
        durationSeconds: args.durationSeconds,
        p1EloAfter: args.p1EloAfter,
        p2EloAfter: args.p2EloAfter,
        endedAt: args.endedAt || Date.now(),
      });
      matchRecordId = existing._id;
    } else {
      matchRecordId = await ctx.db.insert("matches", {
        matchId: args.matchId,
        player1Id: args.player1Id,
        player2Id: args.player2Id,
        winnerId: args.winnerId,
        problemId: args.problemId,
        status: args.status,
        durationSeconds: args.durationSeconds,
        p1EloBefore: args.p1EloBefore,
        p1EloAfter: args.p1EloAfter,
        p2EloBefore: args.p2EloBefore,
        p2EloAfter: args.p2EloAfter,
        startedAt: args.startedAt,
        endedAt: args.endedAt || Date.now(),
      });
    }

    // Update Player 1 Stats & Elo
    if (args.p1EloAfter !== undefined) {
      const p1User = await ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", args.player1Id))
        .first();
      if (p1User) {
        await ctx.db.patch(p1User._id, { eloRating: args.p1EloAfter });
      }

      const p1Stats = await ctx.db
        .query("userStats")
        .withIndex("by_userId", (q) => q.eq("userId", args.player1Id))
        .first();
      if (p1Stats) {
        await ctx.db.patch(p1Stats._id, {
          arenaMatches: p1Stats.arenaMatches + 1,
          arenaWins: p1Stats.arenaWins + (args.winnerId === args.player1Id ? 1 : 0),
          eloRating: args.p1EloAfter,
        });
      } else {
        await ctx.db.insert("userStats", {
          userId: args.player1Id,
          arenaMatches: 1,
          arenaWins: args.winnerId === args.player1Id ? 1 : 0,
          eloRating: args.p1EloAfter,
        });
      }
    }

    // Update Player 2 Stats & Elo
    if (args.p2EloAfter !== undefined) {
      const p2User = await ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", args.player2Id))
        .first();
      if (p2User) {
        await ctx.db.patch(p2User._id, { eloRating: args.p2EloAfter });
      }

      const p2Stats = await ctx.db
        .query("userStats")
        .withIndex("by_userId", (q) => q.eq("userId", args.player2Id))
        .first();
      if (p2Stats) {
        await ctx.db.patch(p2Stats._id, {
          arenaMatches: p2Stats.arenaMatches + 1,
          arenaWins: p2Stats.arenaWins + (args.winnerId === args.player2Id ? 1 : 0),
          eloRating: args.p2EloAfter,
        });
      } else {
        await ctx.db.insert("userStats", {
          userId: args.player2Id,
          arenaMatches: 1,
          arenaWins: args.winnerId === args.player2Id ? 1 : 0,
          eloRating: args.p2EloAfter,
        });
      }
    }

    return matchRecordId;
  },
});

export const getRecentByUserId = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const maxLimit = args.limit || 10;
    const p1Matches = await ctx.db
      .query("matches")
      .withIndex("by_player1", (q) => q.eq("player1Id", args.userId))
      .order("desc")
      .take(maxLimit);

    const p2Matches = await ctx.db
      .query("matches")
      .withIndex("by_player2", (q) => q.eq("player2Id", args.userId))
      .order("desc")
      .take(maxLimit);

    const allMatches = [...p1Matches, ...p2Matches];
    allMatches.sort((a, b) => b.startedAt - a.startedAt);
    return allMatches.slice(0, maxLimit);
  },
});
