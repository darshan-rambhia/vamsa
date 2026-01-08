import { createServerFn } from "@tanstack/start";
import { getCookie, setCookie, deleteCookie } from "vinxi/http";

const TOKEN_COOKIE_NAME = "vamsa-session";
const TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export const getSessionToken = createServerFn({ method: "GET" }).handler(
  async () => {
    const token = getCookie(TOKEN_COOKIE_NAME);
    return token ?? null;
  }
);

export const setSessionToken = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    setCookie(TOKEN_COOKIE_NAME, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE,
      path: "/",
    });
    return { success: true };
  });

export const clearSessionToken = createServerFn({ method: "POST" }).handler(
  async () => {
    deleteCookie(TOKEN_COOKIE_NAME);
    return { success: true };
  }
);
