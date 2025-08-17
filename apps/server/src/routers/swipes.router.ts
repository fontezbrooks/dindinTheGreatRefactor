import { z } from "zod";
import { protectedProcedure, router } from "../lib/trpc";
import {
  Swipe,
  UserStats,
  Recipe,
  UserPreferences,
} from "../db/models/index.js";
import type { SwipeDirection } from "../db/models/swipe.model.js";

// Input validation schemas
const createSwipeSchema = z.object({
  recipeId: z.string().min(1, "Recipe ID is required"),
  direction: z.enum(["left", "right", "up", "down"]),
  sessionId: z.string().optional(),
  deviceInfo: z
    .object({
      platform: z.string().optional(),
      version: z.string().optional(),
      model: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .optional(),
});

const getSwipeHistorySchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  skip: z.number().min(0).default(0),
});

const bulkSwipeSchema = z.object({
  swipes: z
    .array(
      z.object({
        recipeId: z.string().min(1),
        direction: z.enum(["left", "right", "up", "down"]),
      })
    )
    .min(1)
    .max(10), // Allow up to 10 swipes at once
  sessionId: z.string().optional(),
  deviceInfo: z
    .object({
      platform: z.string().optional(),
      version: z.string().optional(),
      model: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .optional(),
});

export const swipesRouter = router({
  // Create a new swipe
  create: protectedProcedure
    .input(createSwipeSchema)
    .mutation(async ({ input, ctx }) => {
      const { recipeId, direction, sessionId, deviceInfo } = input;
      const userId = ctx.session.user.id;

      // Check if user has already swiped this recipe
      const existingSwipe = await Swipe.hasUserSwipedRecipe(userId, recipeId);
      if (existingSwipe) {
        throw new Error("You have already swiped on this recipe");
      }

      // Verify recipe exists
      const recipe = await Recipe.findById(recipeId);
      if (!recipe || !recipe.isActive) {
        throw new Error("Recipe not found or inactive");
      }

      // Create the swipe
      const swipe = new Swipe({
        userId,
        recipeId,
        direction,
        sessionId,
        deviceInfo,
        timestamp: new Date(),
      });

      await swipe.save();

      // Update user stats
      const userStats =
        (await UserStats.findByUserId(userId)) ||
        (await UserStats.createDefaultStats(userId));

      await userStats.recordSwipe(direction as SwipeDirection);

      // Check for potential matches
      let matchResult = null;
      if (direction === "right") {
        matchResult = await swipe.checkForMatch();

        // If we have a match, record it in user stats
        if (matchResult) {
          await userStats.recordMatch();

          // Also update the matched user's stats
          const matchedUserStats =
            (await UserStats.findByUserId(
              matchResult.matchedUserId.toString()
            )) ||
            (await UserStats.createDefaultStats(
              matchResult.matchedUserId.toString()
            ));
          await matchedUserStats.recordMatch();
        }

        // If it's a right swipe, add to favorites
        const userPreferences =
          (await UserPreferences.findByUserId(userId)) ||
          (await UserPreferences.createDefaultPreferences(userId));
        await userPreferences.addFavoriteRecipe(recipeId);
      }

      // Update recipe likes/dislikes
      if (direction === "right") {
        await recipe.like();
      } else if (direction === "left") {
        await recipe.dislike();
      }

      return {
        swipe: {
          id: swipe._id,
          recipeId: swipe.recipeId,
          direction: swipe.direction,
          timestamp: swipe.timestamp,
        },
        match: matchResult,
        userStats: {
          totalSwipes: userStats.total_swipes,
          rightSwipes: userStats.right_swipes,
          matches: userStats.matches,
          matchRate: userStats.matchRate,
        },
        recipe: {
          id: recipe._id,
          title: recipe.title,
          likes: recipe.likes,
          dislikes: recipe.dislikes,
          rating: recipe.rating,
        },
      };
    }),

  // Bulk create swipes (for offline sync)
  createBulk: protectedProcedure
    .input(bulkSwipeSchema)
    .mutation(async ({ input, ctx }) => {
      const { swipes, sessionId, deviceInfo } = input;
      const userId = ctx.session.user.id;

      const results = [];
      const matches = [];

      for (const swipeData of swipes) {
        try {
          // Check if already swiped
          const existingSwipe = await Swipe.hasUserSwipedRecipe(
            userId,
            swipeData.recipeId
          );
          if (existingSwipe) {
            results.push({
              recipeId: swipeData.recipeId,
              success: false,
              error: "Already swiped",
            });
            continue;
          }

          // Create swipe
          const swipe = new Swipe({
            userId,
            recipeId: swipeData.recipeId,
            direction: swipeData.direction,
            sessionId,
            deviceInfo,
            timestamp: new Date(),
          });

          await swipe.save();

          // Check for matches on right swipes
          let matchResult = null;
          if (swipeData.direction === "right") {
            matchResult = await swipe.checkForMatch();
            if (matchResult) {
              matches.push(matchResult);
            }
          }

          results.push({
            recipeId: swipeData.recipeId,
            success: true,
            match: matchResult,
          });
        } catch (error) {
          results.push({
            recipeId: swipeData.recipeId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Update user stats once for all swipes
      const userStats =
        (await UserStats.findByUserId(userId)) ||
        (await UserStats.createDefaultStats(userId));

      for (const swipeData of swipes) {
        await userStats.recordSwipe(swipeData.direction as SwipeDirection);
      }

      // Record matches
      for (let i = 0; i < matches.length; i++) {
        await userStats.recordMatch();
      }

      return {
        results,
        totalProcessed: swipes.length,
        successCount: results.filter((r) => r.success).length,
        matchCount: matches.length,
        userStats: {
          totalSwipes: userStats.total_swipes,
          rightSwipes: userStats.right_swipes,
          matches: userStats.matches,
          matchRate: userStats.matchRate,
        },
      };
    }),

  // Get user's swipe history
  getHistory: protectedProcedure
    .input(getSwipeHistorySchema)
    .query(async ({ input, ctx }) => {
      const { limit, skip } = input;
      const userId = ctx.session.user.id;

      const swipes = await Swipe.getSwipeHistory(userId, limit, skip);
      const totalCount = await Swipe.countDocuments({ userId });

      return {
        swipes,
        pagination: {
          total: totalCount,
          skip,
          limit,
          hasMore: skip + limit < totalCount,
        },
      };
    }),

  // Get user's swipe statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [swipeStats, userStats] = await Promise.all([
      Swipe.getSwipeStats(userId),
      UserStats.findByUserId(userId),
    ]);

    // Get recent swipes
    const recentSwipes = await Swipe.getRecentSwipes(userId, 5);

    return {
      swipeStats,
      userStats: userStats || (await UserStats.createDefaultStats(userId)),
      recentSwipes,
    };
  }),

  // Get potential matches
  getMatches: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit } = input;
      const userId = ctx.session.user.id;

      // Get recipes the user has swiped right on
      const rightSwipes = await Swipe.find({
        userId,
        direction: "right",
      }).populate("recipeId");

      const matches = [];

      // For each right swipe, find potential matches
      for (const swipe of rightSwipes.slice(0, limit)) {
        if (swipe.recipeId) {
          const potentialMatches = await Swipe.findMatches(
            userId,
            swipe.recipeId
          );

          if (potentialMatches.length > 0) {
            matches.push({
              recipe: swipe.recipeId,
              potentialMatches: potentialMatches.slice(0, 3), // Limit to 3 matches per recipe
              matchCount: potentialMatches.length,
            });
          }
        }
      }

      return {
        matches,
        totalMatchedRecipes: matches.length,
      };
    }),

  // Check if user has swiped a specific recipe
  hasSwipedRecipe: protectedProcedure
    .input(
      z.object({
        recipeId: z.string().min(1),
      })
    )
    .query(async ({ input, ctx }) => {
      const { recipeId } = input;
      const userId = ctx.session.user.id;

      const hasSwipped = await Swipe.hasUserSwipedRecipe(userId, recipeId);

      if (hasSwipped) {
        const swipe = await Swipe.findOne({
          userId,
          recipeId,
        });

        return {
          hasSwipped: true,
          direction: swipe?.direction,
          timestamp: swipe?.timestamp,
        };
      }

      return {
        hasSwipped: false,
      };
    }),

  // Get swipe analytics
  getAnalytics: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      const { days } = input;
      const userId = ctx.session.user.id;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get swipes in the date range
      const swipes = await Swipe.find({
        userId,
        timestamp: { $gte: startDate },
      }).sort({ timestamp: 1 });

      // Aggregate by day
      const dailyStats = swipes.reduce((acc, swipe) => {
        const date = swipe.timestamp.toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = { total: 0, right: 0, left: 0, up: 0, down: 0 };
        }
        acc[date].total++;
        acc[date][swipe.direction]++;
        return acc;
      }, {} as Record<string, any>);

      // Get user's overall stats
      const userStats = await UserStats.findByUserId(userId);

      return {
        period: {
          days,
          startDate,
          endDate: new Date(),
        },
        dailyStats,
        totalInPeriod: swipes.length,
        averagePerDay: swipes.length / days,
        userStats,
      };
    }),
});
