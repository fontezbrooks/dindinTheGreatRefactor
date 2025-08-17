

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { expo } from "@better-auth/expo";
import { client } from "../db";

export const auth = betterAuth({
  database: mongodbAdapter(client),
  trustedOrigins: [
    process.env.CORS_ORIGIN || "",
    "my-better-t-app://",
  ],
  emailAndPassword: {
    enabled: true,
  }
  , plugins: [expo()]
});

