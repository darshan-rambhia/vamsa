/**
 * Profile claiming status (public by design)
 *
 * The login and claim pages read this before a session exists, so it is
 * intentionally unauthenticated. It returns a single boolean and nothing else.
 * Lives in its own module so route files can import it without pulling in
 * auth.functions (see the circular-dependency note in routes/_authenticated.tsx).
 */

import { createServerFn } from "@tanstack/react-start";
import { isProfileClaimingEnabledData } from "@vamsa/lib/server/business/settings";

export const getProfileClaimingStatus = createServerFn({
  method: "GET",
}).handler(async () => ({ enabled: await isProfileClaimingEnabledData() }));
