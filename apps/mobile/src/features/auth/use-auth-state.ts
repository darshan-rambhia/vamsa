import { useSyncExternalStore } from "react";

import {
  getAuthCookie,
  getAuthCookieSource,
  getAuthVersionSnapshot,
  subscribeAuthChange,
} from "./api";
import { getAuthClient } from "@/src/lib/auth-client";

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
