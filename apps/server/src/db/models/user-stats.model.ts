import { Schema, model, Model, Document, Types } from "mongoose";

// === Type Definitions ===
export interface IUserStats extends Document {
  _id: Types.ObjectId;
  userId: string; // Better Auth user ID
  total_swipes: number;
  right_swipes: number;
  left_swipes: number;
  up_swipes: number;
  down_swipes: number;
  matches: number;
  recipes_cooked: number;
  recipes_saved: number;
  last_active: Date;
  daily_streak: number;
  longest_streak: number;
  total_cook_time: number; // Total minutes spent cooking
  average_recipe_rating: number;
  preferred_swipe_time: string; // e.g., "evening", "morning"
  most_active_day: string; // e.g., "Monday"
  engagement_score: number; // Calculated engagement metric
  createdAt: Date;
  updatedAt: Date;

  // Virtual fields
  matchRate: number;
  swipeRate: number;

  // Instance methods
  recordSwipe(direction: "left" | "right" | "up" | "down"): Promise<IUserStats>;
  recordMatch(): Promise<IUserStats>;
  recordCookedRecipe(cookTime?: number): Promise<IUserStats>;
  updateActivity(): Promise<IUserStats>;
  updateStreak(): Promise<IUserStats>;
  calculateEngagementScore(): Promise<IUserStats>;
}

export interface IUserStatsStatics {
  findByUserId(userId: string): Promise<IUserStats | null>;
  createDefaultStats(userId: string): Promise<IUserStats>;
  getTopUsers(
    metric: "swipes" | "matches" | "cooked",
    limit?: number
  ): Promise<IUserStats[]>;
  getUserRankings(
    userId: string
  ): Promise<{ swipeRank: number; matchRank: number; cookRank: number }>;
}

type UserStatsModel = Model<IUserStats> & IUserStatsStatics;

// === Main Schema ===
const UserStatsSchema = new Schema<IUserStats, UserStatsModel>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    total_swipes: {
      type: Number,
      default: 0,
      min: 0,
    },
    right_swipes: {
      type: Number,
      default: 0,
      min: 0,
    },
    left_swipes: {
      type: Number,
      default: 0,
      min: 0,
    },
    up_swipes: {
      type: Number,
      default: 0,
      min: 0,
    },
    down_swipes: {
      type: Number,
      default: 0,
      min: 0,
    },
    matches: {
      type: Number,
      default: 0,
      min: 0,
    },
    recipes_cooked: {
      type: Number,
      default: 0,
      min: 0,
    },
    recipes_saved: {
      type: Number,
      default: 0,
      min: 0,
    },
    last_active: {
      type: Date,
      default: Date.now,
    },
    daily_streak: {
      type: Number,
      default: 0,
      min: 0,
    },
    longest_streak: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_cook_time: {
      type: Number,
      default: 0,
      min: 0,
    },
    average_recipe_rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    preferred_swipe_time: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      default: "evening",
    },
    most_active_day: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      default: "Friday",
    },
    engagement_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// === Indexes ===
UserStatsSchema.index({ userId: 1 });
UserStatsSchema.index({ total_swipes: -1 });
UserStatsSchema.index({ matches: -1 });
UserStatsSchema.index({ recipes_cooked: -1 });
UserStatsSchema.index({ engagement_score: -1 });
UserStatsSchema.index({ last_active: -1 });

// === Virtual Fields ===

// Calculate match rate (percentage of right swipes that result in matches)
UserStatsSchema.virtual("matchRate").get(function (this: IUserStats): number {
  if (this.right_swipes === 0) return 0;
  return (this.matches / this.right_swipes) * 100;
});

// Calculate swipe rate (percentage of right swipes vs total swipes)
UserStatsSchema.virtual("swipeRate").get(function (this: IUserStats): number {
  if (this.total_swipes === 0) return 0;
  return (this.right_swipes / this.total_swipes) * 100;
});

// === Static Methods ===

// Find stats by user ID
UserStatsSchema.statics.findByUserId = function (
  this: UserStatsModel,
  userId: string
): Promise<IUserStats | null> {
  return this.findOne({ userId });
};

// Create default stats for a new user
UserStatsSchema.statics.createDefaultStats = function (
  this: UserStatsModel,
  userId: string
): Promise<IUserStats> {
  return this.create({
    userId,
    total_swipes: 0,
    right_swipes: 0,
    left_swipes: 0,
    up_swipes: 0,
    down_swipes: 0,
    matches: 0,
    recipes_cooked: 0,
    recipes_saved: 0,
    last_active: new Date(),
    daily_streak: 0,
    longest_streak: 0,
    total_cook_time: 0,
    average_recipe_rating: 0,
    preferred_swipe_time: "evening",
    most_active_day: "Friday",
    engagement_score: 0,
  });
};

// Get top users by metric
UserStatsSchema.statics.getTopUsers = function (
  this: UserStatsModel,
  metric: "swipes" | "matches" | "cooked",
  limit = 10
): Promise<IUserStats[]> {
  const sortField =
    metric === "swipes"
      ? "total_swipes"
      : metric === "matches"
      ? "matches"
      : "recipes_cooked";

  return this.find({})
    .sort({ [sortField]: -1 })
    .limit(limit);
};

// Get user rankings
UserStatsSchema.statics.getUserRankings = async function (
  this: UserStatsModel,
  userId: string
): Promise<{ swipeRank: number; matchRank: number; cookRank: number }> {
  const userStats = await this.findByUserId(userId);

  if (!userStats) {
    return { swipeRank: 0, matchRank: 0, cookRank: 0 };
  }

  const [swipeRank, matchRank, cookRank] = await Promise.all([
    this.countDocuments({ total_swipes: { $gt: userStats.total_swipes } }),
    this.countDocuments({ matches: { $gt: userStats.matches } }),
    this.countDocuments({ recipes_cooked: { $gt: userStats.recipes_cooked } }),
  ]);

  return {
    swipeRank: swipeRank + 1,
    matchRank: matchRank + 1,
    cookRank: cookRank + 1,
  };
};

// === Instance Methods ===

// Record a swipe
UserStatsSchema.methods.recordSwipe = function (
  this: IUserStats,
  direction: "left" | "right" | "up" | "down"
): Promise<IUserStats> {
  this.total_swipes += 1;

  switch (direction) {
    case "right":
      this.right_swipes += 1;
      break;
    case "left":
      this.left_swipes += 1;
      break;
    case "up":
      this.up_swipes += 1;
      break;
    case "down":
      this.down_swipes += 1;
      break;
  }

  this.last_active = new Date();
  return this.save();
};

// Record a match
UserStatsSchema.methods.recordMatch = function (
  this: IUserStats
): Promise<IUserStats> {
  this.matches += 1;
  this.last_active = new Date();
  return this.save();
};

// Record a cooked recipe
UserStatsSchema.methods.recordCookedRecipe = function (
  this: IUserStats,
  cookTime = 0
): Promise<IUserStats> {
  this.recipes_cooked += 1;
  this.total_cook_time += cookTime;
  this.last_active = new Date();
  return this.save();
};

// Update last activity
UserStatsSchema.methods.updateActivity = function (
  this: IUserStats
): Promise<IUserStats> {
  this.last_active = new Date();
  return this.updateStreak();
};

// Update streak
UserStatsSchema.methods.updateStreak = function (
  this: IUserStats
): Promise<IUserStats> {
  const now = new Date();
  const lastActive = new Date(this.last_active);
  const daysDiff = Math.floor(
    (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff === 0) {
    // Same day, no streak change needed
    return this.save();
  } else if (daysDiff === 1) {
    // Next day, increment streak
    this.daily_streak += 1;
    if (this.daily_streak > this.longest_streak) {
      this.longest_streak = this.daily_streak;
    }
  } else {
    // Streak broken
    this.daily_streak = 1;
  }

  this.last_active = now;
  return this.save();
};

// Calculate engagement score
UserStatsSchema.methods.calculateEngagementScore = function (
  this: IUserStats
): Promise<IUserStats> {
  // Engagement score based on various factors
  const swipeScore = Math.min(this.total_swipes / 100, 20); // Max 20 points
  const matchScore = Math.min(this.matches / 10, 20); // Max 20 points
  const cookScore = Math.min(this.recipes_cooked / 5, 20); // Max 20 points
  const streakScore = Math.min(this.daily_streak / 7, 20); // Max 20 points

  // Activity recency bonus
  const now = new Date();
  const lastActive = new Date(this.last_active);
  const daysSinceActive = Math.floor(
    (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
  );
  const recencyScore = Math.max(20 - daysSinceActive * 2, 0); // Max 20 points

  this.engagement_score = Math.round(
    swipeScore + matchScore + cookScore + streakScore + recencyScore
  );

  return this.save();
};

// === Export Model ===
const UserStats = model<IUserStats, UserStatsModel>(
  "UserStats",
  UserStatsSchema
);
export default UserStats;
