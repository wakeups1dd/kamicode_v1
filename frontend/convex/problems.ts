import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { difficulty: v.optional(v.string()), topic: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("problems");
    const problems = await q.collect();
    
    return problems.filter(p => {
      if (args.difficulty && p.difficulty !== args.difficulty) return false;
      if (args.topic && p.topic !== args.topic) return false;
      return true;
    });
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const getById = query({
  args: { problemId: v.id("problems") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.problemId);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    difficulty: v.string(),
    topic: v.string(),
    constraints: v.array(v.string()),
    examples: v.optional(v.array(v.any())),
    testCases: v.array(v.any()),
    starterCode: v.optional(v.string()),
    timeLimitMs: v.optional(v.number()),
    memoryLimitKb: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
      
    if (existing) {
      throw new Error("A problem with this slug already exists");
    }
    
    const id = await ctx.db.insert("problems", args);
    return await ctx.db.get(id);
  },
});
