import mongoose from "mongoose";

// Import models to ensure they are registered with mongoose
import "./models/recipe.model.js";
import "./models/swipe.model.js";
import "./models/user-preferences.model.js";
import "./models/user-stats.model.js";

await mongoose.connect(process.env.DATABASE_URL || "").catch((error) => {
  console.log("Error connecting to database:", error);
});

const client = mongoose.connection.getClient().db("myDB");

// Export models for convenience
export * from "./models/index.js";
export { client };
