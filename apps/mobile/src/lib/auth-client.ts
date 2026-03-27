import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { getServerBaseUrl } from "./api-base-url";

const storage =
  Platform.OS === "web"
    ? {
        getItem: (key: string): string | null => {
          if (typeof window === "undefined") {
            return null;
          }

          try {
            return window.localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: (key: string, value: string) => {
          if (typeof window === "undefined") {
            return;
          }

          try {
            window.localStorage.setItem(key, value);
          } catch {
            // ignore storage write failures in constrained web contexts
          }
        },
      }
    : {
        getItem: (key: string): string | null => {
          try {
            return SecureStore.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: (key: string, value: string) => {
          try {
            SecureStore.setItem(key, value);
          } catch {
            // ignore storage write failures, auth fetch hooks will still work
          }
        },
      };

export const authClient = createAuthClient({
  baseURL: getServerBaseUrl(),
  plugins: [
    expoClient({
      storage,
      storagePrefix: "vamsa-mobile",
      cookiePrefix: "better-auth",
      scheme: "mobile",
    }),
  ],
});
