/**
 * Dev-route gate
 *
 * Developer-only pages (e.g. /dev/errors) are normally 404 in production
 * builds. VAMSA_ENABLE_DEV_ROUTES=true re-enables them at runtime. It is off
 * by default and is set only in the E2E server config (docker-compose e2e
 * profile and the Playwright webServer). Never set it in production or
 * Docker deployment docs.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./middleware/require-auth";

export const isDevRoutesEnabled = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => {
    await requireAuth("VIEWER");
    return process.env.VAMSA_ENABLE_DEV_ROUTES === "true";
  }
);
