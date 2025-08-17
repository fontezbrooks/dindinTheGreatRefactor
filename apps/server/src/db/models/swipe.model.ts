import { Schema, model, Model, Document, Types } from 'mongoose';

// === Type Definitions ===
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface IDeviceInfo {
  platform?: string;
  version?: string;
  model?: string;
  userAgent?: string;
}

export interface ISwipeStats {
  totalSwipes: number;
  rightSwipes: number;
  leftSwipes: number;
  upSwipes: number;
  downSwipes: number;
  swipeRate: number;
}

export interface IMatchResult {
  recipeId: Types.ObjectId;
  matchedUserId: Types.ObjectId;
  matchedAt: Date;
  confidence: number;
}

export interface ISwipe extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  recipeId: Types.ObjectId;
  direction: SwipeDirection;
  timestamp: Date;
  sessionId?: string;
  deviceInfo?: IDeviceInfo;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  checkForMatch(): Promise<IMatchResult | null>;
}

export interface ISwipeStatics {
  getSwipeHistory(userId: Types.ObjectId | string, limit?: number, skip?: number): Promise<ISwipe[]>;
  getSwipeStats(userId: Types.ObjectId | string): Promise<ISwipeStats>;
  findMatches(userId: Types.ObjectId | string, recipeId: Types.ObjectId | string): Promise<ISwipe[]>;
  hasUserSwipedRecipe(userId: Types.ObjectId | string, recipeId: Types.ObjectId | string): Promise<boolean>;
  getRecentSwipes(userId: Types.ObjectId | string, limit?: number): Promise<ISwipe[]>;
}

type SwipeModel = Model<ISwipe> & ISwipeStatics;

// === Main Swipe Schema ===
const SwipeSchema = new Schema<ISwipe, SwipeModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipeId: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
      required: true,
    },
    direction: {
      type: String,
      required: true,
      enum: ['left', 'right', 'up', 'down'],
      lowercase: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    sessionId: {
      type: String,
      trim: true,
    },
    deviceInfo: {
      platform: String,
      version: String,
      model: String,
      userAgent: String,
    },
  },
  {
    timestamps: true,
  }
);

// === Indexes for Performance ===
SwipeSchema.index({ userId: 1, timestamp: -1 }); // User's swipe history
SwipeSchema.index({ recipeId: 1 }); // Recipe popularity tracking
SwipeSchema.index({ userId: 1, recipeId: 1 }, { unique: true }); // Prevent duplicate swipes
SwipeSchema.index({ timestamp: -1 }); // Recent swipes
SwipeSchema.index({ direction: 1 }); // Filter by swipe direction

// === Static Methods ===

// Get user's swipe history
SwipeSchema.statics.getSwipeHistory = function (
  this: SwipeModel,
  userId: Types.ObjectId | string,
  limit = 100,
  skip = 0
): Promise<ISwipe[]> {
  return this.find({ userId })
    .populate('recipeId', 'title image image_url difficulty cuisine_type')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);
};

// Get swipe statistics for a user
SwipeSchema.statics.getSwipeStats = function (
  this: SwipeModel,
  userId: Types.ObjectId | string
): Promise<ISwipeStats> {
  return this.aggregate([
    { $match: { userId: new Types.ObjectId(userId.toString()) } },
    {
      $group: {
        _id: '$direction',
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: null,
        totalSwipes: { $sum: '$count' },
        directions: {
          $push: {
            direction: '$_id',
            count: '$count',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalSwipes: 1,
        rightSwipes: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$directions',
                  cond: { $eq: ['$$this.direction', 'right'] },
                },
              },
              as: 'item',
              in: '$$item.count',
            },
          },
        },
        leftSwipes: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$directions',
                  cond: { $eq: ['$$this.direction', 'left'] },
                },
              },
              as: 'item',
              in: '$$item.count',
            },
          },
        },
        upSwipes: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$directions',
                  cond: { $eq: ['$$this.direction', 'up'] },
                },
              },
              as: 'item',
              in: '$$item.count',
            },
          },
        },
        downSwipes: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$directions',
                  cond: { $eq: ['$$this.direction', 'down'] },
                },
              },
              as: 'item',
              in: '$$item.count',
            },
          },
        },
      },
    },
    {
      $addFields: {
        swipeRate: {
          $cond: {
            if: { $eq: ['$totalSwipes', 0] },
            then: 0,
            else: { $divide: ['$rightSwipes', '$totalSwipes'] },
          },
        },
      },
    },
  ]).then((result) => {
    if (result.length === 0) {
      return {
        totalSwipes: 0,
        rightSwipes: 0,
        leftSwipes: 0,
        upSwipes: 0,
        downSwipes: 0,
        swipeRate: 0,
      };
    }
    return result[0] as ISwipeStats;
  });
};

// Find potential matches (other users who swiped right on the same recipe)
SwipeSchema.statics.findMatches = function (
  this: SwipeModel,
  userId: Types.ObjectId | string,
  recipeId: Types.ObjectId | string
): Promise<ISwipe[]> {
  return this.find({
    recipeId: new Types.ObjectId(recipeId.toString()),
    direction: 'right',
    userId: { $ne: new Types.ObjectId(userId.toString()) },
  })
    .populate('userId', 'name email')
    .populate('recipeId', 'title image image_url difficulty cuisine_type')
    .limit(10);
};

// Check if user has already swiped a recipe
SwipeSchema.statics.hasUserSwipedRecipe = async function (
  this: SwipeModel,
  userId: Types.ObjectId | string,
  recipeId: Types.ObjectId | string
): Promise<boolean> {
  const swipe = await this.findOne({
    userId: new Types.ObjectId(userId.toString()),
    recipeId: new Types.ObjectId(recipeId.toString()),
  });
  return !!swipe;
};

// Get recent swipes for a user
SwipeSchema.statics.getRecentSwipes = function (
  this: SwipeModel,
  userId: Types.ObjectId | string,
  limit = 10
): Promise<ISwipe[]> {
  return this.find({ userId: new Types.ObjectId(userId.toString()) })
    .populate('recipeId', 'title image image_url')
    .sort({ timestamp: -1 })
    .limit(limit);
};

// === Instance Methods ===

// Check if this swipe creates a match
SwipeSchema.methods.checkForMatch = async function (
  this: ISwipe
): Promise<IMatchResult | null> {
  // Only right swipes can create matches
  if (this.direction !== 'right') return null;

  // Simple match simulation for demo - 30% chance
  const shouldMatch = Math.random() < 0.3;

  if (shouldMatch) {
    // In production, this would check for mutual right swipes
    // or matching with other users who liked the same recipe
    const SwipeModel = this.constructor as SwipeModel;
    const potentialMatches = await SwipeModel.findMatches(
      this.userId,
      this.recipeId
    );

    if (potentialMatches.length > 0) {
      // Select a random match for demo purposes
      const randomMatch = potentialMatches[Math.floor(Math.random() * potentialMatches.length)];

      return {
        recipeId: this.recipeId,
        matchedUserId: randomMatch.userId,
        matchedAt: new Date(),
        confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
      };
    }
  }

  return null;
};

// === Export Model ===
const Swipe = model<ISwipe, SwipeModel>('Swipe', SwipeSchema);
export default Swipe;