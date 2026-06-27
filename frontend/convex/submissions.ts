import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    problemId: v.id("problems"),
    userId: v.string(),
    language: v.string(),
    sourceCode: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("submissions", {
      problemId: args.problemId,
      userId: args.userId,
      language: args.language,
      sourceCode: args.sourceCode,
      status: "pending",
      passedCount: 0,
      totalCount: 0,
    });
  },
});

export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getById = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.submissionId);
  },
});

export const listByUserAndProblem = query({
  args: { userId: v.string(), problemId: v.id("problems") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_problem", (q) => q.eq("problemId", args.problemId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
  },
});

export const updateResult = mutation({
  args: {
    submissionId: v.id("submissions"),
    status: v.string(),
    passedCount: v.number(),
    totalCount: v.number(),
    runtimeMs: v.optional(v.number()),
    testResults: v.optional(v.array(v.any())),
    stderr: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { submissionId, ...updates } = args;
    await ctx.db.patch(submissionId, updates);
  },
});
