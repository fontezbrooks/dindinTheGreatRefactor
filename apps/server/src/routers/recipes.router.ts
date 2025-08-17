import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../lib/trpc';
import { Recipe, UserPreferences, Swipe } from '../db/models/index.js';

// Input validation schemas
const getRecipeByIdSchema = z.object({
  id: z.string().min(1, 'Recipe ID is required'),
});

const getPersonalizedRecipesSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  skip: z.number().min(0).default(0),
  excludeSwipedRecipes: z.boolean().default(true),
});

const getAllRecipesSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  skip: z.number().min(0).default(0),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  cuisine: z.string().optional(),
  search: z.string().optional(),
});

const likeRecipeSchema = z.object({
  recipeId: z.string().min(1, 'Recipe ID is required'),
});

export const recipesRouter = router({
  // Get all recipes (public endpoint)
  getAll: publicProcedure
    .input(getAllRecipesSchema)
    .query(async ({ input }) => {
      const { limit, skip, difficulty, cuisine, search } = input;

      // Build filter object
      const filters: Record<string, any> = {
        isActive: true,
      };

      if (difficulty) {
        filters.difficulty = difficulty;
      }

      if (cuisine) {
        filters.$or = [
          { cuisine: { $regex: cuisine, $options: 'i' } },
          { cuisine_type: { $regex: cuisine, $options: 'i' } },
        ];
      }

      let recipesQuery;

      if (search) {
        // Use text search if search term is provided
        recipesQuery = Recipe.searchRecipes(search, filters, limit);
      } else {
        // Regular find with filters
        recipesQuery = Recipe.find(filters)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 });
      }

      const recipes = await recipesQuery;
      const totalCount = await Recipe.countDocuments(filters);

      return {
        recipes,
        pagination: {
          total: totalCount,
          skip,
          limit,
          hasMore: skip + limit < totalCount,
        },
      };
    }),

  // Get a single recipe by ID (public endpoint)
  getById: publicProcedure
    .input(getRecipeByIdSchema)
    .query(async ({ input }) => {
      const recipe = await Recipe.findOne({
        _id: input.id,
        isActive: true,
      });

      if (!recipe) {
        throw new Error('Recipe not found');
      }

      return recipe;
    }),

  // Get personalized recipes based on user preferences (protected)
  getPersonalized: protectedProcedure
    .input(getPersonalizedRecipesSchema)
    .query(async ({ input, ctx }) => {
      const { limit, skip, excludeSwipedRecipes } = input;
      const userId = ctx.session.user.id;

      // Get user preferences
      const userPreferences = await UserPreferences.findByUserId(userId);
      
      // Get filters based on preferences
      const filters = userPreferences 
        ? await UserPreferences.getRecommendationFilters(userId)
        : { isActive: true };

      // If user wants to exclude swiped recipes, add that filter
      if (excludeSwipedRecipes) {
        const swipedRecipeIds = await Swipe.find({ userId })
          .distinct('recipeId')
          .limit(1000); // Limit to prevent memory issues

        if (swipedRecipeIds.length > 0) {
          filters._id = { $nin: swipedRecipeIds };
        }
      }

      // Get random recipes that match the filters
      const recipes = await Recipe.getRandomRecipes(limit + skip, filters);
      
      // Apply skip manually since $sample doesn't support skip
      const paginatedRecipes = recipes.slice(skip, skip + limit);

      return {
        recipes: paginatedRecipes,
        pagination: {
          total: recipes.length, // Note: This is an approximation for random results
          skip,
          limit,
          hasMore: paginatedRecipes.length === limit,
        },
        appliedFilters: filters,
        hasPreferences: !!userPreferences,
      };
    }),

  // Get random recipes for discovery (protected)
  getForDiscovery: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      excludeSwipedRecipes: z.boolean().default(true),
    }))
    .query(async ({ input, ctx }) => {
      const { limit, excludeSwipedRecipes } = input;
      const userId = ctx.session.user.id;

      let filters: Record<string, any> = { isActive: true };

      // Exclude already swiped recipes
      if (excludeSwipedRecipes) {
        const swipedRecipeIds = await Swipe.find({ userId })
          .distinct('recipeId')
          .limit(1000);

        if (swipedRecipeIds.length > 0) {
          filters._id = { $nin: swipedRecipeIds };
        }
      }

      // Try to get personalized recommendations first
      const userPreferences = await UserPreferences.findByUserId(userId);
      if (userPreferences) {
        const personalizedFilters = await UserPreferences.getRecommendationFilters(userId);
        filters = { ...filters, ...personalizedFilters };
      }

      const recipes = await Recipe.getRandomRecipes(limit, filters);

      return {
        recipes,
        isPersonalized: !!userPreferences,
      };
    }),

  // Like a recipe (protected)
  like: protectedProcedure
    .input(likeRecipeSchema)
    .mutation(async ({ input }) => {
      const recipe = await Recipe.findById(input.recipeId);
      
      if (!recipe) {
        throw new Error('Recipe not found');
      }

      await recipe.like();
      
      return {
        success: true,
        likes: recipe.likes,
        rating: recipe.rating,
      };
    }),

  // Dislike a recipe (protected)
  dislike: protectedProcedure
    .input(likeRecipeSchema)
    .mutation(async ({ input }) => {
      const recipe = await Recipe.findById(input.recipeId);
      
      if (!recipe) {
        throw new Error('Recipe not found');
      }

      await recipe.dislike();
      
      return {
        success: true,
        dislikes: recipe.dislikes,
        rating: recipe.rating,
      };
    }),

  // Get user's favorite recipes (protected)
  getFavorites: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      skip: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const { limit, skip } = input;
      const userId = ctx.session.user.id;

      const userPreferences = await UserPreferences.findByUserId(userId);
      
      if (!userPreferences || userPreferences.favorite_recipes.length === 0) {
        return {
          recipes: [],
          pagination: {
            total: 0,
            skip,
            limit,
            hasMore: false,
          },
        };
      }

      const favoriteRecipeIds = userPreferences.favorite_recipes.slice(skip, skip + limit);
      const recipes = await Recipe.find({
        _id: { $in: favoriteRecipeIds },
        isActive: true,
      });

      return {
        recipes,
        pagination: {
          total: userPreferences.favorite_recipes.length,
          skip,
          limit,
          hasMore: skip + limit < userPreferences.favorite_recipes.length,
        },
      };
    }),

  // Get recipe statistics
  getStats: publicProcedure
    .input(getRecipeByIdSchema)
    .query(async ({ input }) => {
      const recipe = await Recipe.findById(input.id);
      
      if (!recipe) {
        throw new Error('Recipe not found');
      }

      // Get swipe statistics for this recipe
      const swipeStats = await Swipe.aggregate([
        { $match: { recipeId: recipe._id } },
        {
          $group: {
            _id: '$direction',
            count: { $sum: 1 },
          },
        },
      ]);

      const stats = {
        likes: recipe.likes,
        dislikes: recipe.dislikes,
        rating: recipe.rating,
        totalSwipes: swipeStats.reduce((sum, stat) => sum + stat.count, 0),
        swipeBreakdown: swipeStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {} as Record<string, number>),
      };

      return stats;
    }),
});