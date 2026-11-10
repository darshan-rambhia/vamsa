import { useSyncExternalStore } from "react";

import { getAuthClient } from "@/src/lib/auth-client";
import {
  getAuthCookie,
  getAuthCookieSource,
  getAuthVersionSnapshot,
  subscribeAuthChange,
} from "./api";

export function useAuthState() {
  const { data: session, isPending } = getAuthClient().useSession();
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
