import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  problems: defineTable({
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
  }).index("by_slug", ["slug"]),

  submissions: defineTable({
    problemId: v.id("problems"),
    userId: v.string(),
    language: v.string(),
    sourceCode: v.string(),
    status: v.string(),
    passedCount: v.number(),
    totalCount: v.number(),
    testResults: v.optional(v.array(v.any())),
    stderr: v.optional(v.string()),
    runtimeMs: v.optional(v.number()),
  }).index("by_user", ["userId"]).index("by_problem", ["problemId"]),
});
