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

  users: defineTable({
    userId: v.string(), // Clerk ID
    username: v.string(),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  }).index("by_userId", ["userId"]).index("by_username", ["username"]),

  userStreaks: defineTable({
    userId: v.string(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastSolveDate: v.optional(v.string()), // YYYY-MM-DD
    totalSolves: v.number(),
  }).index("by_userId", ["userId"]),

  userStats: defineTable({
    userId: v.string(),
    arenaMatches: v.number(),
    arenaWins: v.number(),
  }).index("by_userId", ["userId"]),

  aiAnalyses: defineTable({
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
  }).index("by_submissionId", ["submissionId"]),

  cohorts: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    inviteCode: v.string(),
    createdBy: v.string(),
  }).index("by_slug", ["slug"]).index("by_inviteCode", ["inviteCode"]),

  cohortMembers: defineTable({
    cohortId: v.id("cohorts"),
    userId: v.string(),
    role: v.string(), // "admin" | "member"
  }).index("by_cohort", ["cohortId"]).index("by_user", ["userId"]),

  dailyChallenges: defineTable({
    cohortId: v.id("cohorts"),
    problemId: v.string(),
    date: v.string(), // YYYY-MM-DD
  }).index("by_cohort", ["cohortId"]),

  badges: defineTable({
    name: v.string(),
    description: v.string(),
    iconName: v.string(),
    conditionType: v.string(), // "total_solves", "arena_wins", "streak"
    conditionValue: v.number(),
  }),

  userBadges: defineTable({
    userId: v.string(),
    badgeId: v.id("badges"),
  }).index("by_user", ["userId"]),

  friendships: defineTable({
    userId: v.string(),
    friendId: v.string(),
    status: v.string(), // "pending", "accepted", "rejected"
  }).index("by_user", ["userId"]).index("by_friend", ["friendId"]),
});
