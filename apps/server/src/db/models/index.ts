// Central export for all database models
export { default as Recipe } from './recipe.model.js';
export { default as Swipe } from './swipe.model.js';
export { default as UserPreferences } from './user-preferences.model.js';
export { default as UserStats } from './user-stats.model.js';

// Export types
export type {
  IRecipe,
  IIngredient,
  IInstruction,
  INutrition,
  IImportMetadata,
  IRecipeStatics,
} from './recipe.model.js';

export type {
  ISwipe,
  ISwipeStats,
  IMatchResult,
  IDeviceInfo,
  SwipeDirection,
  ISwipeStatics,
} from './swipe.model.js';

export type {
  IUserPreferences,
  DietaryRestriction,
  DifficultyPreference,
  SpiceTolerance,
  IUserPreferencesStatics,
} from './user-preferences.model.js';

export type {
  IUserStats,
  IUserStatsStatics,
} from './user-stats.model.js';