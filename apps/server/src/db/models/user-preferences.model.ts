import { Schema, model, Model, Document, Types } from "mongoose";

// === Type Definitions ===
export type DietaryRestriction =
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "dairy-free"
  | "nut-free"
  | "keto"
  | "paleo"
  | "pescatarian";

export type DifficultyPreference = "easy" | "medium" | "hard" | "any";
export type SpiceTolerance = "none" | "mild" | "medium" | "hot" | "very-hot";

export interface IUserPreferences extends Document {
  _id: Types.ObjectId;
  userId: string; // Better Auth user ID
  dietary_restrictions: DietaryRestriction[];
  cuisine_preferences: string[];
  difficulty_preference: DifficultyPreference;
  max_cook_time: number; // in minutes
  spice_tolerance: SpiceTolerance;
  excluded_ingredients: string[]; // Ingredients to avoid
  favorite_recipes: Types.ObjectId[]; // Recipe IDs
  cooking_skill_level: "beginner" | "intermediate" | "advanced";
  household_size: number;
  meal_planning_enabled: boolean;
  notification_preferences: {
    new_matches: boolean;
    weekly_recommendations: boolean;
    cooking_reminders: boolean;
  };
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addFavoriteRecipe(
    recipeId: Types.ObjectId | string
  ): Promise<IUserPreferences>;
  removeFavoriteRecipe(
    recipeId: Types.ObjectId | string
  ): Promise<IUserPreferences>;
  updateDietaryRestrictions(
    restrictions: DietaryRestriction[]
  ): Promise<IUserPreferences>;
}

export interface IUserPreferencesStatics {
  findByUserId(userId: string): Promise<IUserPreferences | null>;
  createDefaultPreferences(userId: string): Promise<IUserPreferences>;
  getRecommendationFilters(userId: string): Promise<Record<string, any>>;
}

type UserPreferencesModel = Model<IUserPreferences> & IUserPreferencesStatics;

// === Main Schema ===
const UserPreferencesSchema = new Schema<
  IUserPreferences,
  UserPreferencesModel
>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    dietary_restrictions: [
      {
        type: String,
        enum: [
          "vegetarian",
          "vegan",
          "gluten-free",
          "dairy-free",
          "nut-free",
          "keto",
          "paleo",
          "pescatarian",
        ],
      },
    ],
    cuisine_preferences: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    difficulty_preference: {
      type: String,
      enum: ["easy", "medium", "hard", "any"],
      default: "any",
    },
    max_cook_time: {
      type: Number,
      default: 60,
      min: 0,
      max: 480, // 8 hours max
    },
    spice_tolerance: {
      type: String,
      enum: ["none", "mild", "medium", "hot", "very-hot"],
      default: "medium",
    },
    excluded_ingredients: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    favorite_recipes: [
      {
        type: Schema.Types.ObjectId,
        ref: "Recipe",
      },
    ],
    cooking_skill_level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
    },
    household_size: {
      type: Number,
      default: 2,
      min: 1,
      max: 20,
    },
    meal_planning_enabled: {
      type: Boolean,
      default: false,
    },
    notification_preferences: {
      new_matches: {
        type: Boolean,
        default: true,
      },
      weekly_recommendations: {
        type: Boolean,
        default: true,
      },
      cooking_reminders: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// === Indexes ===
UserPreferencesSchema.index({ userId: 1 });
UserPreferencesSchema.index({ dietary_restrictions: 1 });
UserPreferencesSchema.index({ cuisine_preferences: 1 });

// === Static Methods ===

// Find preferences by user ID
UserPreferencesSchema.statics.findByUserId = function (
  this: UserPreferencesModel,
  userId: string
): Promise<IUserPreferences | null> {
  return this.findOne({ userId });
};

// Create default preferences for a new user
UserPreferencesSchema.statics.createDefaultPreferences = function (
  this: UserPreferencesModel,
  userId: string
): Promise<IUserPreferences> {
  return this.create({
    userId,
    dietary_restrictions: [],
    cuisine_preferences: [],
    difficulty_preference: "any",
    max_cook_time: 60,
    spice_tolerance: "medium",
    excluded_ingredients: [],
    favorite_recipes: [],
    cooking_skill_level: "intermediate",
    household_size: 2,
    meal_planning_enabled: false,
    notification_preferences: {
      new_matches: true,
      weekly_recommendations: true,
      cooking_reminders: false,
    },
  });
};

// Get filters for recipe recommendations based on preferences
UserPreferencesSchema.statics.getRecommendationFilters = async function (
  this: UserPreferencesModel,
  userId: string
): Promise<Record<string, any>> {
  const preferences = await this.findByUserId(userId);

  if (!preferences) {
    return {};
  }

  const filters: Record<string, any> = {
    isActive: true,
  };

  // Apply dietary restrictions
  if (preferences.dietary_restrictions.length > 0) {
    filters.dietary_tags = { $in: preferences.dietary_restrictions };
  }

  // Apply cuisine preferences
  if (preferences.cuisine_preferences.length > 0) {
    filters.$or = [
      { cuisine: { $in: preferences.cuisine_preferences } },
      { cuisine_type: { $in: preferences.cuisine_preferences } },
    ];
  }

  // Apply difficulty preference
  if (preferences.difficulty_preference !== "any") {
    filters.difficulty = preferences.difficulty_preference;
  }

  // Apply max cook time (check both cook_time and cookTime fields)
  if (preferences.max_cook_time > 0) {
    filters.$and = [
      {
        $or: [
          { cook_time: { $lte: preferences.max_cook_time } },
          { cookTime: { $lte: preferences.max_cook_time } },
          { cook_time: { $exists: false } },
          { cookTime: { $exists: false } },
        ],
      },
    ];
  }

  return filters;
};

// === Instance Methods ===

// Add a recipe to favorites
UserPreferencesSchema.methods.addFavoriteRecipe = function (
  this: IUserPreferences,
  recipeId: Types.ObjectId | string
): Promise<IUserPreferences> {
  const recipeObjectId = new Types.ObjectId(recipeId.toString());

  // Check if already in favorites
  if (!this.favorite_recipes.some((id) => id.equals(recipeObjectId))) {
    this.favorite_recipes.push(recipeObjectId);
  }

  return this.save();
};

// Remove a recipe from favorites
UserPreferencesSchema.methods.removeFavoriteRecipe = function (
  this: IUserPreferences,
  recipeId: Types.ObjectId | string
): Promise<IUserPreferences> {
  const recipeObjectId = new Types.ObjectId(recipeId.toString());

  this.favorite_recipes = this.favorite_recipes.filter(
    (id) => !id.equals(recipeObjectId)
  );

  return this.save();
};

// Update dietary restrictions
UserPreferencesSchema.methods.updateDietaryRestrictions = function (
  this: IUserPreferences,
  restrictions: DietaryRestriction[]
): Promise<IUserPreferences> {
  this.dietary_restrictions = restrictions;
  return this.save();
};

// === Export Model ===
const UserPreferences = model<IUserPreferences, UserPreferencesModel>(
  "UserPreferences",
  UserPreferencesSchema
);
export default UserPreferences;
