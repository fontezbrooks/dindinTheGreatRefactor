import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_SERVER_URL,
  plugins: [
    expoClient({
      storagePrefix: "my-better-t-app",
      storage: SecureStore,
    }),
  ],
});

// Placeholder useSession hook to silence TypeScript errors
// TODO: Implement proper session management
export const useSession = () => {
  return {
    data: {
      user: {
        id: "placeholder-user-id",
        name: "Placeholder User",
        email: "placeholder@example.com",
      },
    },
    isLoading: false,
    isError: false,
  };
};
