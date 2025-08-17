import {
  protectedProcedure, publicProcedure,
  router,
} from "../lib/trpc";
import { recipesRouter } from "./recipes.router";
import { swipesRouter } from "./swipes.router";
import { userRouter } from "./user.router";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  
  // DinDin-specific routers
  recipes: recipesRouter,
  swipes: swipesRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
