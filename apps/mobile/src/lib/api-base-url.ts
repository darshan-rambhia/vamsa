import { Platform } from "react-native";

const removeTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export function getServerBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured) {
    return removeTrailingSlash(configured);
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return removeTrailingSlash(window.location.origin);
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }

  return "http://localhost:3000";
}

export function getApiBaseUrl(): string {
  return `${getServerBaseUrl()}/api/v1`;
}
