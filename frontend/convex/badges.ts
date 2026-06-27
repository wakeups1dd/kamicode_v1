import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("badges").collect();
  },
});

export const listForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const userBadges = await ctx.db
      .query("userBadges")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const badges = [];
    for (const ub of userBadges) {
      const badge = await ctx.db.get(ub.badgeId);
      if (badge) {
        badges.push({ ...badge, awardedAt: ub._creationTime });
      }
    }
    return badges;
  },
});

export const award = mutation({
  args: { userId: v.string(), badgeId: v.id("badges") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userBadges")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("badgeId"), args.badgeId))
      .first();

    if (!existing) {
      await ctx.db.insert("userBadges", {
        userId: args.userId,
        badgeId: args.badgeId,
      });
    }
  },
});

export const seed = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("badges").first();
    if (existing) return; // Already seeded

    const badges = [
      { name: "First Blood", description: "Solve your first problem.", iconName: "Swords", conditionType: "total_solves", conditionValue: 1 },
      { name: "Persistent", description: "Achieve a 7-day streak.", iconName: "Flame", conditionType: "streak", conditionValue: 7 },
      { name: "Gladiator", description: "Win 5 Arena matches.", iconName: "Trophy", conditionType: "arena_wins", conditionValue: 5 },
    ];

    for (const b of badges) {
      await ctx.db.insert("badges", b);
    }
  },
});
