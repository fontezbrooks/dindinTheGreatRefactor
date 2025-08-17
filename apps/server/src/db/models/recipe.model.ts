import { Schema, model, Model, Document, Types } from 'mongoose';

// === Type Definitions ===
export interface IIngredient {
  name: string;
  amount: string;
  unit?: string | null;
}

export interface IInstruction {
  step: number;
  description: string;
  duration?: number | null;
}

export interface INutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

export interface IImportMetadata {
  source_url: string;
  scraper_name: string;
  scraper_version: string;
  confidence_score: number;
  extracted_at: string;
  notes: string;
}

export interface IRecipe extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: IIngredient[];
  instructions: IInstruction[];
  cook_time?: number;
  cookTime?: number;
  prep_time?: number;
  prepTime?: number;
  image?: string;
  image_url?: string;
  cuisine: string[];
  cuisine_type?: string;
  dietary: string[];
  dietary_tags: string[];
  tags: string[];
  likes: number;
  dislikes: number;
  servings: number;
  nutrition?: INutrition;
  import_metadata?: IImportMetadata;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  totalTime: number; // virtual
  rating: number; // virtual
  
  // Instance methods
  like(): Promise<IRecipe>;
  dislike(): Promise<IRecipe>;
}

export interface IRecipeStatics {
  getRandomRecipes(limit?: number, filters?: Record<string, unknown>): Promise<IRecipe[]>;
  searchRecipes(searchText: string, filters?: Record<string, unknown>, limit?: number): Promise<IRecipe[]>;
  getPersonalizedRecipes(userId: string, limit?: number): Promise<IRecipe[]>;
}

type RecipeModel = Model<IRecipe> & IRecipeStatics;

// === Subdocument Schemas ===
const IngredientSchema = new Schema<IIngredient>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: String,
    required: true,
    trim: true,
  },
  unit: {
    type: String,
    default: null,
    trim: true,
  },
});

const InstructionSchema = new Schema<IInstruction>({
  step: {
    type: Number,
    required: true,
    min: 1,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  duration: {
    type: Number,
    default: null,
    min: 0,
  },
});

const NutritionSchema = new Schema<INutrition>({
  calories: {
    type: Number,
    required: true,
    min: 0,
  },
  protein: {
    type: Number,
    required: true,
    min: 0,
  },
  carbs: {
    type: Number,
    required: true,
    min: 0,
  },
  fat: {
    type: Number,
    required: true,
    min: 0,
  },
  fiber: {
    type: Number,
    required: true,
    min: 0,
  },
  sugar: {
    type: Number,
    required: true,
    min: 0,
  },
});

const ImportMetadataSchema = new Schema<IImportMetadata>({
  source_url: {
    type: String,
    required: true,
  },
  scraper_name: {
    type: String,
    required: true,
  },
  scraper_version: {
    type: String,
    required: true,
  },
  confidence_score: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  extracted_at: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
    required: true,
  },
});

// === Main Recipe Schema ===
const RecipeSchema = new Schema<IRecipe, RecipeModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['easy', 'medium', 'hard'],
      lowercase: true,
    },
    ingredients: {
      type: [IngredientSchema],
      required: true,
      validate: {
        validator: function (v: IIngredient[]): boolean {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Recipe must have at least one ingredient',
      },
    },
    instructions: {
      type: [InstructionSchema],
      required: true,
      validate: {
        validator: function (v: IInstruction[]): boolean {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Recipe must have at least one instruction',
      },
    },
    // Timing fields (support both naming conventions)
    cook_time: {
      type: Number,
      min: 0,
    },
    cookTime: {
      type: Number,
      min: 0,
    },
    prep_time: {
      type: Number,
      min: 0,
    },
    prepTime: {
      type: Number,
      min: 0,
    },
    // Media (support both naming conventions)
    image: {
      type: String,
      trim: true,
    },
    image_url: {
      type: String,
      trim: true,
    },
    // Categories and tags
    cuisine: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    cuisine_type: {
      type: String,
      trim: true,
      lowercase: true,
    },
    dietary: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    dietary_tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    // Engagement metrics
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
      min: 0,
    },
    servings: {
      type: Number,
      min: 1,
      default: 4,
    },
    // Optional nutrition info
    nutrition: NutritionSchema,
    // Import metadata for scraped recipes
    import_metadata: ImportMetadataSchema,
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// === Indexes for Performance ===
RecipeSchema.index({ title: 'text', description: 'text' }); // Text search
RecipeSchema.index({ difficulty: 1 });
RecipeSchema.index({ cuisine_type: 1 });
RecipeSchema.index({ dietary_tags: 1 });
RecipeSchema.index({ tags: 1 });
RecipeSchema.index({ isActive: 1 });
RecipeSchema.index({ likes: -1 }); // Sort by popularity
RecipeSchema.index({ createdAt: -1 }); // Sort by newest

// === Virtual Fields ===
RecipeSchema.virtual('totalTime').get(function (this: IRecipe): number {
  const cookTime = this.cook_time || this.cookTime || 0;
  const prepTime = this.prep_time || this.prepTime || 0;
  return cookTime + prepTime;
});

RecipeSchema.virtual('rating').get(function (this: IRecipe): number {
  const total = this.likes + this.dislikes;
  if (total === 0) return 0;
  return (this.likes / total) * 5;
});

// === Static Methods ===
RecipeSchema.statics.getRandomRecipes = function (
  this: RecipeModel,
  limit = 50,
  filters: Record<string, unknown> = {}
): Promise<IRecipe[]> {
  const matchStage = { isActive: true, ...filters };
  return this.aggregate([
    { $match: matchStage },
    { $sample: { size: limit } }
  ]);
};

RecipeSchema.statics.searchRecipes = function (
  this: RecipeModel,
  searchText: string,
  filters: Record<string, unknown> = {},
  limit = 20
): Promise<IRecipe[]> {
  const matchStage = {
    isActive: true,
    $text: { $search: searchText },
    ...filters,
  };

  return this.find(matchStage, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit);
};

RecipeSchema.statics.getPersonalizedRecipes = async function (
  this: RecipeModel,
  userId: string,
  limit = 50
): Promise<IRecipe[]> {
  // TODO: Implement personalization logic based on user preferences
  // For now, return random recipes
  // This will be enhanced when UserPreferences model is implemented
  return this.getRandomRecipes(limit);
};

// === Instance Methods ===
RecipeSchema.methods.like = function (this: IRecipe): Promise<IRecipe> {
  this.likes = (this.likes || 0) + 1;
  return this.save();
};

RecipeSchema.methods.dislike = function (this: IRecipe): Promise<IRecipe> {
  this.dislikes = (this.dislikes || 0) + 1;
  return this.save();
};

// === Pre-save Middleware ===
RecipeSchema.pre<IRecipe>('save', function (next) {
  if (this.isModified('instructions')) {
    // Ensure instruction steps are sequential
    this.instructions.sort((a, b) => a.step - b.step);
    
    // Renumber steps to be sequential starting from 1
    this.instructions.forEach((instruction, index) => {
      instruction.step = index + 1;
    });
  }
  next();
});

// === Export Model ===
const Recipe = model<IRecipe, RecipeModel>('Recipe', RecipeSchema);
export default Recipe;