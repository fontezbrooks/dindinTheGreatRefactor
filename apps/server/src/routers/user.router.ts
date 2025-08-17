import { z } from "zod";
import { protectedProcedure, router } from "../lib/trpc";
import { UserPreferences, UserStats } from "../db/models/index.js";
import type {
  DietaryRestriction,
  DifficultyPreference,
  SpiceTolerance,
} from "../db/models/user-preferences.model.js";

// Input validation schemas
const updatePreferencesSchema = z.object({
  dietary_restrictions: z
    .array(
      z.enum([
        "vegetarian",
        "vegan",
        "gluten-free",
        "dairy-free",
        "nut-free",
        "keto",
        "paleo",
        "pescatarian",
      ])
    )
    .optional(),
  cuisine_preferences: z.array(z.string()).optional(),
  difficulty_preference: z.enum(["easy", "medium", "hard", "any"]).optional(),
  max_cook_time: z.number().min(0).max(480).optional(),
  spice_tolerance: z
    .enum(["none", "mild", "medium", "hot", "very-hot"])
    .optional(),
  excluded_ingredients: z.array(z.string()).optional(),
  cooking_skill_level: z
    .enum(["beginner", "intermediate", "advanced"])
    .optional(),
  household_size: z.number().min(1).max(20).optional(),
  meal_planning_enabled: z.boolean().optional(),
  notification_preferences: z
    .object({
      new_matches: z.boolean().optional(),
      weekly_recommendations: z.boolean().optional(),
      cooking_reminders: z.boolean().optional(),
    })
    .optional(),
});

const manageFavoriteSchema = z.object({
  recipeId: z.string().min(1, "Recipe ID is required"),
});

const recordCookedRecipeSchema = z.object({
  recipeId: z.string().min(1, "Recipe ID is required"),
  cookTime: z.number().min(0).optional(),
  rating: z.number().min(1).max(5).optional(),
});

export const userRouter = router({
  // Get user profile (preferences + stats)
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [preferences, stats] = await Promise.all([
      UserPreferences.findByUserId(userId) ||
        UserPreferences.createDefaultPreferences(userId),
      UserStats.findByUserId(userId) || UserStats.createDefaultStats(userId),
    ]);

    return {
      user: ctx.session.user,
      preferences,
      stats,
    };
  }),

  // Get user preferences
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    let preferences = await UserPreferences.findByUserId(userId);

    if (!preferences) {
      preferences = await UserPreferences.createDefaultPreferences(userId);
    }

    return preferences;
  }),

  // Update user preferences
  updatePreferences: protectedProcedure
    .input(updatePreferencesSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      let preferences = await UserPreferences.findByUserId(userId);

      if (!preferences) {
        preferences = await UserPreferences.createDefaultPreferences(userId);
      }

      // Update only provided fields
      Object.keys(input).forEach((key) => {
        if (input[key as keyof typeof input] !== undefined) {
          (preferences as any)[key] = input[key as keyof typeof input];
        }
      });

      await preferences.save();

      // Update user activity
      const userStats =
        (await UserStats.findByUserId(userId)) ||
        (await UserStats.createDefaultStats(userId));
      await userStats.updateActivity();

      return {
        success: true,
        preferences,
      };
    }),

  // Get user statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    let stats = await UserStats.findByUserId(userId);

    if (!stats) {
      stats = await UserStats.createDefaultStats(userId);
    }

    // Get user rankings
    const rankings = await UserStats.getUserRankings(userId);

    return {
      stats,
      rankings,
    };
  }),

  // Add recipe to favorites
  addFavorite: protectedProcedure
    .input(manageFavoriteSchema)
    .mutation(async ({ input, ctx }) => {
      const { recipeId } = input;
      const userId = ctx.session.user.id;

      let preferences = await UserPreferences.findByUserId(userId);

      if (!preferences) {
        preferences = await UserPreferences.createDefaultPreferences(userId);
      }

      await preferences.addFavoriteRecipe(recipeId);

      // Update stats
      const userStats =
        (await UserStats.findByUserId(userId)) ||
        (await UserStats.createDefaultStats(userId));
      userStats.recipes_saved += 1;
      await userStats.save();

      return {
        success: true,
        favoriteCount: preferences.favorite_recipes.length,
      };
    }),

  // Remove recipe from favorites
  removeFavorite: protectedProcedure
    .input(manageFavoriteSchema)
    .mutation(async ({ input, ctx }) => {
      const { recipeId } = input;
      const userId = ctx.session.user.id;

      const preferences = await UserPreferences.findByUserId(userId);

      if (!preferences) {
        throw new Error("User preferences not found");
      }

      await preferences.removeFavoriteRecipe(recipeId);

      // Update stats
      const userStats = await UserStats.findByUserId(userId);
      if (userStats && userStats.recipes_saved > 0) {
        userStats.recipes_saved -= 1;
        await userStats.save();
      }

      return {
        success: true,
        favoriteCount: preferences.favorite_recipes.length,
      };
    }),

  // Record that user cooked a recipe
  recordCookedRecipe: protectedProcedure
    .input(recordCookedRecipeSchema)
    .mutation(async ({ input, ctx }) => {
      const { recipeId, cookTime = 0, rating } = input;
      const userId = ctx.session.user.id;

      const userStats =
        (await UserStats.findByUserId(userId)) ||
        (await UserStats.createDefaultStats(userId));

      await userStats.recordCookedRecipe(cookTime);

      // Update average rating if provided
      if (rating) {
        const currentRating = userStats.average_recipe_rating;
        const currentCount = userStats.recipes_cooked - 1; // Subtract 1 since we just incremented

        if (currentCount === 0) {
          userStats.average_recipe_rating = rating;
        } else {
          userStats.average_recipe_rating =
            (currentRating * currentCount + rating) / userStats.recipes_cooked;
        }

        await userStats.save();
      }

      return {
        success: true,
        stats: {
          recipes_cooked: userStats.recipes_cooked,
          total_cook_time: userStats.total_cook_time,
          average_recipe_rating: userStats.average_recipe_rating,
        },
      };
    }),

  // Get leaderboard/rankings
  getLeaderboard: protectedProcedure
    .input(
      z.object({
        metric: z.enum(["swipes", "matches", "cooked"]).default("swipes"),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ input }) => {
      const { metric, limit } = input;

      const topUsers = await UserStats.getTopUsers(metric, limit);

      return {
        leaderboard: topUsers,
        metric,
      };
    }),

  // Update user activity (for tracking engagement)
  updateActivity: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const userStats =
      (await UserStats.findByUserId(userId)) ||
      (await UserStats.createDefaultStats(userId));

    await userStats.updateActivity();
    await userStats.calculateEngagementScore();

    return {
      success: true,
      lastActive: userStats.last_active,
      dailyStreak: userStats.daily_streak,
      engagementScore: userStats.engagement_score,
    };
  }),

  // Delete user data (GDPR compliance)
  deleteUserData: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Note: This doesn't delete the Better Auth user, just our custom data
    await Promise.all([
      UserPreferences.deleteOne({ userId }),
      UserStats.deleteOne({ userId }),
      // Note: We might want to keep swipes for analytics but anonymize them
      // Swipe.deleteMany({ userId }),
    ]);

    return {
      success: true,
      message: "User data deleted successfully",
    };
  }),

  // Export user data (GDPR compliance)
  exportUserData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [preferences, stats] = await Promise.all([
      UserPreferences.findByUserId(userId),
      UserStats.findByUserId(userId),
    ]);

    return {
      user: ctx.session.user,
      preferences,
      stats,
      exportedAt: new Date(),
    };
  }),
});
