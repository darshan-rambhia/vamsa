import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import type { ServerConfig } from "@/src/lib/server-config";
import { getAuthClient, resetAuthClient } from "@/src/lib/auth-client";
import {
  getActiveServerUrl,
  loadServers,
  probeServer,
  resolveServerByNetwork,
  saveServers,
  setActiveServerUrl,
} from "@/src/lib/server-config";

interface ServerConfigContextValue {
  servers: Array<ServerConfig>;
  activeUrl: string;
  addServer: (config: Omit<ServerConfig, "id">) => void;
  updateServer: (id: string, updates: Partial<ServerConfig>) => void;
  removeServer: (id: string) => void;
  switchServer: (url: string) => Promise<void>;
  probeServer: (url: string) => Promise<boolean>;
  autoResolving: boolean;
}

const ServerConfigContext = createContext<ServerConfigContextValue | null>(
  null
);

export function useServerConfig(): ServerConfigContextValue {
  const ctx = useContext(ServerConfigContext);
  if (!ctx) {
    throw new Error("useServerConfig must be used within ServerConfigProvider");
  }
  return ctx;
}

export function ServerConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [servers, setServers] = useState<Array<ServerConfig>>(() =>
    loadServers()
  );
  const [activeUrl, setActiveUrlState] = useState<string>(() =>
    getActiveServerUrl()
  );
  const [autoResolving, setAutoResolving] = useState(false);
  const switchingRef = useRef(false);

  const switchServer = useCallback(async (url: string) => {
    if (switchingRef.current) return;
    switchingRef.current = true;
    try {
      try {
        await getAuthClient().signOut();
      } catch {
        // ignore sign-out errors when switching servers
      }
      setActiveServerUrl(url);
      resetAuthClient();
      setActiveUrlState(url);
    } finally {
      switchingRef.current = false;
    }
  }, []);

  const autoResolve = useCallback(
    async (currentServers: Array<ServerConfig>) => {
      if (currentServers.length === 0) return;
      setAutoResolving(true);
      try {
        const best = await resolveServerByNetwork(currentServers);
        if (best && best.url !== getActiveServerUrl()) {
          const reachable = await probeServer(best.url);
          if (reachable) {
            await switchServer(best.url);
          }
        }
      } catch {
        // ignore auto-resolve errors
      } finally {
        setAutoResolving(false);
      }
    },
    [switchServer]
  );

  // Auto-resolve on mount
  useEffect(() => {
    autoResolve(servers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for network changes (native only)
  useEffect(() => {
    if (Platform.OS === "web") return;

    let removeListener: (() => void) | undefined;

    import("expo-network")
      .then((Network) => {
        const subscription = Network.addNetworkStateListener(() => {
          autoResolve(servers);
        });
        removeListener = () => subscription.remove();
      })
      .catch(() => {
        // expo-network not available, skip
      });

    return () => {
      removeListener?.();
    };
  }, [servers, autoResolve]);

  const addServer = useCallback(
    (config: Omit<ServerConfig, "id">) => {
      const newServer: ServerConfig = {
        ...config,
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      };
      const updated = [...servers, newServer];
      setServers(updated);
      saveServers(updated);
    },
    [servers]
  );

  const updateServer = useCallback(
    (id: string, updates: Partial<ServerConfig>) => {
      const updated = servers.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      );
      setServers(updated);
      saveServers(updated);
    },
    [servers]
  );

  const removeServer = useCallback(
    async (id: string) => {
      const updated = servers.filter((s) => s.id !== id);
      setServers(updated);
      saveServers(updated);

      // If we removed the active server, switch to the first remaining one
      const removedServer = servers.find((s) => s.id === id);
      if (removedServer && removedServer.url === activeUrl) {
        const next = updated[0];
        if (next) {
          await switchServer(next.url);
        }
      }
    },
    [servers, activeUrl, switchServer]
  );

  const value: ServerConfigContextValue = {
    servers,
    activeUrl,
    addServer,
    updateServer,
    removeServer,
    switchServer,
    probeServer,
    autoResolving,
  };

  return (
    <ServerConfigContext.Provider value={value}>
      {children}
    </ServerConfigContext.Provider>
  );
}
