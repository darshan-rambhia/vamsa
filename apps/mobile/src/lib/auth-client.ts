import { expoClient, getCookie } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { getActiveServerUrl } from "./server-config";

const STORAGE_PREFIX = "vamsa-mobile";

const syncStorage =
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

// better-auth 1.7 requires the async variants on ExpoClientStorage
const storage = {
  ...syncStorage,
  getItemAsync: async (key: string) => syncStorage.getItem(key),
  setItemAsync: async (key: string, value: string) =>
    syncStorage.setItem(key, value),
};

// Sync read of the plugin's stored cookie (client.getCookie() is async in 1.7)
export function getClientCookie(): string {
  return getCookie(syncStorage.getItem(`${STORAGE_PREFIX}_cookie`));
}

function buildClient(baseUrl: string) {
  return createAuthClient({
    baseURL: baseUrl,
    plugins: [
      expoClient({
        storage,
        storagePrefix: STORAGE_PREFIX,
        cookiePrefix: "better-auth",
        scheme: "mobile",
      }),
    ],
  });
}

type AuthClient = ReturnType<typeof buildClient>;

let _client: AuthClient | null = null;

export function getAuthClient(): AuthClient {
  if (!_client) {
    _client = buildClient(getActiveServerUrl());
  }
  return _client;
}

export function resetAuthClient(): void {
  _client = null;
}
