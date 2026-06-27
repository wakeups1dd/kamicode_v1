import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    inviteCode: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const cohortId = await ctx.db.insert("cohorts", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      inviteCode: args.inviteCode,
      createdBy: args.createdBy,
    });

    await ctx.db.insert("cohortMembers", {
      cohortId,
      userId: args.createdBy,
      role: "admin",
    });

    return cohortId;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cohorts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cohorts")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .first();
  },
});

export const join = mutation({
  args: { cohortId: v.id("cohorts"), userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!existing) {
      await ctx.db.insert("cohortMembers", {
        cohortId: args.cohortId,
        userId: args.userId,
        role: "member",
      });
    }
  },
});

export const listForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const cohorts = [];
    for (const m of memberships) {
      const cohort = await ctx.db.get(m.cohortId);
      if (cohort) {
        cohorts.push(cohort);
      }
    }
    return cohorts;
  },
});

export const createDailyChallenge = mutation({
  args: { cohortId: v.id("cohorts"), problemId: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dailyChallenges", {
      cohortId: args.cohortId,
      problemId: args.problemId,
      date: args.date,
    });
  },
});

export const getDailyChallenge = query({
  args: { cohortId: v.id("cohorts"), date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dailyChallenges")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .first();
  },
});

export const update = mutation({
  args: { cohortId: v.id("cohorts"), name: v.optional(v.string()), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const patch: any = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    await ctx.db.patch(args.cohortId, patch);
  },
});

export const leave = mutation({
  args: { cohortId: v.id("cohorts"), userId: v.string() },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    if (member) {
      await ctx.db.delete(member._id);
    }
  },
});

export const deleteCohort = mutation({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    // delete members
    const members = await ctx.db.query("cohortMembers").withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId)).collect();
    for (const m of members) await ctx.db.delete(m._id);
    // delete challenges
    const challenges = await ctx.db.query("dailyChallenges").withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId)).collect();
    for (const c of challenges) await ctx.db.delete(c._id);
    
    await ctx.db.delete(args.cohortId);
  },
});

export const getMembers = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    const members = await ctx.db.query("cohortMembers").withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId)).collect();
    const result = [];
    for (const m of members) {
      const u = await ctx.db.query("users").withIndex("by_userId", (q) => q.eq("userId", m.userId)).first();
      result.push({
        userId: m.userId,
        role: m.role,
        joinedAt: m._creationTime,
        username: u?.username,
        displayName: u?.displayName,
        avatarUrl: u?.avatarUrl
      });
    }
    return result;
  },
});

