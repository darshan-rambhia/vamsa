import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { getActiveServerUrl } from "./server-config";

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

function buildClient(baseUrl: string) {
  return createAuthClient({
    baseURL: baseUrl,
    plugins: [
      expoClient({
        storage,
        storagePrefix: "vamsa-mobile",
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
