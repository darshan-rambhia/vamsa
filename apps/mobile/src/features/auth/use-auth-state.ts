import { useSyncExternalStore } from "react";

import {
  getAuthCookie,
  getAuthCookieSource,
  getAuthVersionSnapshot,
  subscribeAuthChange,
} from "./api";
import { authClient } from "@/src/lib/auth-client";

export function useAuthState() {
  const { data: session, isPending } = authClient.useSession();
  useSyncExternalStore(
    subscribeAuthChange,
    getAuthVersionSnapshot,
    getAuthVersionSnapshot
  );

  const cookie = getAuthCookie();

  return {
    user: session?.user,
    loading: isPending,
    cookie,
    source: getAuthCookieSource(),
  };
}
