import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getBySubmissionId = query({
  args: { submissionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiAnalyses")
      .withIndex("by_submissionId", (q) => q.eq("submissionId", args.submissionId))
      .first();
  },
});

export const create = mutation({
  args: {
    submissionId: v.string(),
    problemId: v.string(),
    timeComplexity: v.optional(v.string()),
    spaceComplexity: v.optional(v.string()),
    approach: v.optional(v.string()),
    approachExplanation: v.optional(v.string()),
    efficiencyScore: v.optional(v.number()),
    codeQualityScore: v.optional(v.number()),
    overallScore: v.optional(v.number()),
    strengths: v.optional(v.array(v.string())),
    improvements: v.optional(v.array(v.string())),
    optimizedSolutionHint: v.optional(v.string()),
    rawResponse: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiAnalyses", args);
  },
});
