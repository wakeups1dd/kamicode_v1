import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getForDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("globalDailyChallenges")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 30;
    const all = await ctx.db
      .query("globalDailyChallenges")
      .order("desc")
      .take(limit);
    return all;
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    problemId: v.string(),
    problemSlug: v.string(),
    problemTitle: v.string(),
    difficulty: v.string(),
    topic: v.string(),
    generatedByAi: v.boolean(),
    aiModel: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("globalDailyChallenges")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    if (existing) {
      return existing;
    }

    const id = await ctx.db.insert("globalDailyChallenges", args);
    return await ctx.db.get(id);
  },
});
