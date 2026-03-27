import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export interface ServerConfig {
  id: string;
  name: string;
  url: string;
  localIpPrefix?: string;
  isDefault?: boolean;
}

const SERVERS_KEY = "vamsa_servers";
const ACTIVE_SERVER_URL_KEY = "vamsa_active_server_url";

function getDefaultUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }

  return "http://localhost:3000";
}

function readFromStorage(key: string): string | null {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return SecureStore.getItem(key);
  } catch {
    return null;
  }
}

function writeToStorage(key: string, value: string): void {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
    return;
  }
  try {
    SecureStore.setItem(key, value);
  } catch {
    // ignore
  }
}

// Initialize synchronously at module load
let _activeUrl: string = (() => {
  return readFromStorage(ACTIVE_SERVER_URL_KEY) ?? getDefaultUrl();
})();

export function getActiveServerUrl(): string {
  return _activeUrl;
}

export function setActiveServerUrl(url: string): void {
  _activeUrl = url;
  writeToStorage(ACTIVE_SERVER_URL_KEY, url);
}

export function loadServers(): Array<ServerConfig> {
  const raw = readFromStorage(SERVERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as Array<ServerConfig>;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveServers(servers: Array<ServerConfig>): void {
  try {
    writeToStorage(SERVERS_KEY, JSON.stringify(servers));
  } catch {
    // ignore
  }
}

export async function probeServer(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(`${url}/health`, {
      signal: controller.signal,
    });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveServerByNetwork(
  servers: Array<ServerConfig>
): Promise<ServerConfig | null> {
  try {
    // expo-network is not available on web
    if (Platform.OS === "web") return null;

    const Network = await import("expo-network");
    const ipAddress = await Network.getIpAddressAsync();

    if (!ipAddress) return null;

    // Find servers whose localIpPrefix matches the device's current IP
    const candidates = servers.filter(
      (s) => s.localIpPrefix && ipAddress.startsWith(s.localIpPrefix)
    );

    if (candidates.length === 0) return null;

    // Return the first matching candidate (prefer more specific prefix)
    candidates.sort(
      (a, b) => (b.localIpPrefix?.length ?? 0) - (a.localIpPrefix?.length ?? 0)
    );

    return candidates[0] ?? null;
  } catch {
    return null;
  }
}
