/**
 * Static guard for server functions under apps/web/src.
 *
 * 1. Every createServerFn must call an auth helper (requireAuth or
 *    getCurrentAuthenticatedUser), inline or via a handler it delegates to,
 *    or be on PUBLIC_BY_DESIGN with a reason.
 * 2. Every authenticated function requires the role in EXPECTED_ROLE.
 *
 * Adding an unauthenticated server function fails this test on purpose.
 */

import { describe, expect, it } from "vitest";
import { collectServerFns, hasAuthCheck, roleOf } from "@test/server-fn-scan";
import type { Role } from "@test/server-fn-scan";

/**
 * Public by design. Key: "<path relative to apps/web/src>#<export name>".
 * Every entry needs a reason; stale entries fail the test.
 */
const PUBLIC_BY_DESIGN: Record<string, string> = {
  "routes/__root.tsx#getCspNonceServerFn":
    "Returns the per-request CSP nonce during SSR, before any session exists. No data.",
  "routes/_authenticated.tsx#checkAuthInline":
    "Route-guard session probe. Returns { valid: false } for anonymous callers; only the caller's own session otherwise.",
  "server/auth.functions.ts#getSession":
    "Session probe. Returns null for anonymous callers.",
  "server/auth.functions.ts#getCurrentUser":
    "Session probe alias of getSession. Returns null for anonymous callers.",
  "server/auth.functions.ts#checkAuth":
    "Session probe. Returns { valid: false } for anonymous callers.",
  "server/auth.functions.ts#validateSession":
    "Session probe alias of checkAuth.",
  "server/auth.functions.ts#logout":
    "Signs out the current cookie. No data; must work when already logged out.",
  "server/auth.functions.ts#getRegistrationStatus":
    "Returns { selfSignupEnabled } only. Login page needs it before sign-in.",
  "server/auth.functions.ts#getAvailableProviders":
    "Lists which SSO/password providers are configured. Needed by the login page.",
  "server/auth.functions.ts#getUnclaimedProfiles":
    "Used by the public claim page. Returns [] unless an admin enabled profile claiming.",
  "server/auth.functions.ts#claimProfile":
    "Pre-login claim (creates an account). Refuses unless an admin enabled claiming; IP rate limited.",
  "server/profile-claiming.ts#getProfileClaimingStatus":
    "Returns { enabled } only. Login and claim pages need it before sign-in.",
  "server/invites.ts#getInviteByToken":
    "Invite acceptance. Bearer token is the credential; returns invite details for that token only.",
  "server/invites.ts#acceptInvite":
    "Invite acceptance. Bearer token is the credential; creates the invited account.",
  "server/calendar.ts#validateCalendarToken":
    "Calendar feed clients present a secret token. Returns validity for that token only.",
};

/**
 * Required role per authenticated server function (from requireAuth in the
 * wrapper or the handler it delegates to). Locks the classification: changing
 * a role means editing this table on purpose.
 */
const EXPECTED_ROLE: Record<string, Role> = {
  "components/dashboard/widgets/CalendarWidget.tsx#getUpcomingEvents": "VIEWER",
  "server/ai.ts#getAIAvailabilityFn": "VIEWER",
  "server/ai.ts#generateStoryFn": "MEMBER",
  "server/ai.ts#suggestFieldsFn": "MEMBER",
  "server/auth.functions.ts#changePassword": "VIEWER",
  "server/backup.ts#exportBackup": "ADMIN",
  "server/backup.ts#listBackups": "ADMIN",
  "server/backup.ts#downloadBackup": "ADMIN",
  "server/backup.ts#verifyBackup": "ADMIN",
  "server/backup.ts#deleteBackup": "ADMIN",
  "server/backup.ts#importBackup": "ADMIN",
  "server/backup.ts#getBackupSettings": "ADMIN",
  "server/backup.ts#scheduleBackup": "ADMIN",
  "server/calendar-tokens.ts#getCalendarTokens": "MEMBER",
  "server/calendar-tokens.ts#createCalendarToken": "MEMBER",
  "server/calendar-tokens.ts#rotateCalendarToken": "MEMBER",
  "server/calendar-tokens.ts#revokeCalendarToken": "MEMBER",
  "server/calendar-tokens.ts#updateTokenName": "MEMBER",
  "server/calendar-tokens.ts#deleteCalendarToken": "MEMBER",
  "server/calendar-tokens.ts#getAllCalendarTokens": "ADMIN",
  "server/calendar.ts#generateCalendarToken": "MEMBER",
  "server/calendar.ts#revokeCalendarToken": "MEMBER",
  "server/calendar.ts#listCalendarTokens": "VIEWER",
  "server/calendar.ts#deleteCalendarToken": "MEMBER",
  "server/charts.ts#getAncestorChart": "VIEWER",
  "server/charts.ts#getDescendantChart": "VIEWER",
  "server/charts.ts#getHourglassChart": "VIEWER",
  "server/charts.ts#getFanChart": "VIEWER",
  "server/charts.ts#getTimelineChart": "VIEWER",
  "server/charts.ts#getRelationshipMatrix": "VIEWER",
  "server/charts.ts#getBowtieChart": "VIEWER",
  "server/charts.ts#getCompactTree": "VIEWER",
  "server/charts.ts#getStatistics": "VIEWER",
  "server/charts.ts#getTreeChart": "VIEWER",
  "server/charts.ts#getFamilyTree": "VIEWER",
  "server/charts.ts#exportChartPDF": "VIEWER",
  "server/charts.ts#exportChartSVG": "VIEWER",
  "server/claim.functions.ts#getOIDCClaimableProfiles": "VIEWER",
  "server/claim.functions.ts#claimProfileOIDC": "VIEWER",
  "server/claim.functions.ts#skipProfileClaim": "VIEWER",
  "server/claim.functions.ts#getOIDCClaimStatus": "VIEWER",
  "server/dev-routes.ts#isDevRoutesEnabled": "VIEWER",
  "server/dashboard-preferences.ts#getDashboardPreferences": "VIEWER",
  "server/dashboard-preferences.ts#saveDashboardPreferences": "VIEWER",
  "server/dashboard-preferences.ts#resetDashboardPreferences": "VIEWER",
  "server/dashboard.ts#getDashboardStats": "VIEWER",
  "server/dashboard.ts#getRecentActivity": "VIEWER",
  "server/dashboard.ts#getActivityFilterOptions": "VIEWER",
  "server/dashboard.ts#getPendingSuggestions": "VIEWER",
  "server/events.ts#getPersonEvents": "VIEWER",
  "server/events.ts#createEvent": "MEMBER",
  "server/events.ts#updateEvent": "MEMBER",
  "server/events.ts#deleteEvent": "ADMIN",
  "server/events.ts#addEventParticipant": "MEMBER",
  "server/events.ts#removeEventParticipant": "MEMBER",
  "server/gedcom.ts#validateGedcom": "ADMIN",
  "server/gedcom.ts#importGedcom": "ADMIN",
  "server/gedcom.ts#exportGedcom": "ADMIN",
  "server/gedcom.ts#exportGedZip": "ADMIN",
  "server/invites.ts#getInvites": "ADMIN",
  "server/invites.ts#createInvite": "ADMIN",
  "server/invites.ts#revokeInvite": "ADMIN",
  "server/invites.ts#deleteInvite": "ADMIN",
  "server/invites.ts#resendInvite": "ADMIN",
  "server/maps.ts#getPlacesForMap": "VIEWER",
  "server/maps.ts#getPersonLocations": "VIEWER",
  "server/maps.ts#getFamilyLocations": "VIEWER",
  "server/maps.ts#getPlacesByTimeRange": "VIEWER",
  "server/maps.ts#getPlaceClusters": "VIEWER",
  "server/media.ts#getPersonMedia": "VIEWER",
  "server/media.ts#getMediaObject": "VIEWER",
  "server/media.ts#deleteMedia": "ADMIN",
  "server/media.ts#updateMediaMetadata": "MEMBER",
  "server/media.ts#setPrimaryPhoto": "MEMBER",
  "server/media.ts#reorderMedia": "MEMBER",
  "server/media.ts#linkMediaToEvent": "MEMBER",
  "server/media.ts#uploadMedia": "MEMBER",
  "server/metrics.ts#getMetricsSnapshot": "ADMIN",
  "server/metrics.ts#getPrometheusStatus": "ADMIN",
  "server/notifications.ts#getEmailNotificationPreferences": "VIEWER",
  "server/notifications.ts#updateEmailNotificationPreferences": "VIEWER",
  "server/persons.functions.ts#listPersons": "VIEWER",
  "server/persons.functions.ts#getPerson": "VIEWER",
  "server/persons.functions.ts#createPerson": "MEMBER",
  "server/persons.functions.ts#updatePerson": "MEMBER",
  "server/persons.functions.ts#deletePerson": "ADMIN",
  "server/persons.functions.ts#searchPersons": "VIEWER",
  "server/places.ts#getPlace": "VIEWER",
  "server/places.ts#searchPlaces": "VIEWER",
  "server/places.ts#getPlaceHierarchy": "VIEWER",
  "server/places.ts#getPersonPlaces": "VIEWER",
  "server/places.ts#createPlace": "MEMBER",
  "server/places.ts#updatePlace": "MEMBER",
  "server/places.ts#deletePlace": "ADMIN",
  "server/places.ts#linkPersonToPlace": "MEMBER",
  "server/places.ts#getPlaceHierarchyPath": "VIEWER",
  "server/places.ts#getPlaceChildren": "VIEWER",
  "server/places.ts#updatePlacePersonLink": "MEMBER",
  "server/places.ts#unlinkPersonFromPlace": "MEMBER",
  "server/relationships.ts#listRelationships": "VIEWER",
  "server/relationships.ts#getRelationship": "VIEWER",
  "server/relationships.ts#createRelationship": "MEMBER",
  "server/relationships.ts#updateRelationship": "MEMBER",
  "server/relationships.ts#deleteRelationship": "ADMIN",
  "server/relationships.ts#getFamilyTree": "VIEWER",
  "server/restore.ts#validateBackup": "ADMIN",
  "server/restore.ts#previewImport": "ADMIN",
  "server/restore.ts#importBackup": "ADMIN",
  "server/restore.ts#getImportHistory": "ADMIN",
  "server/search.ts#searchPeople": "VIEWER",
  "server/settings.ts#getFamilySettings": "VIEWER",
  "server/settings.ts#updateFamilySettings": "ADMIN",
  "server/settings.ts#getUserLanguagePreference": "VIEWER",
  "server/settings.ts#setUserLanguagePreference": "VIEWER",
  "server/sources.ts#getSource": "VIEWER",
  "server/sources.ts#listSources": "VIEWER",
  "server/sources.ts#createSource": "MEMBER",
  "server/sources.ts#updateSource": "MEMBER",
  "server/sources.ts#deleteSource": "ADMIN",
  "server/sources.ts#createResearchNote": "MEMBER",
  "server/sources.ts#updateResearchNote": "MEMBER",
  "server/sources.ts#deleteResearchNote": "ADMIN",
  "server/sources.ts#linkSourceToEvent": "MEMBER",
  "server/sources.ts#getResearchNotes": "VIEWER",
  "server/sources.ts#generateCitation": "VIEWER",
  "server/sources.ts#getPersonSources": "VIEWER",
  "server/statistics.ts#getPeopleStatistics": "VIEWER",
  "server/suggestions.ts#getSuggestions": "VIEWER",
  "server/suggestions.ts#getPendingSuggestionsCount": "VIEWER",
  "server/suggestions.ts#createSuggestion": "MEMBER",
  "server/suggestions.ts#reviewSuggestion": "ADMIN",
  "server/users.ts#getUsers": "ADMIN",
  "server/users.ts#getUser": "ADMIN",
  "server/users.ts#updateUser": "ADMIN",
  "server/users.ts#deleteUser": "ADMIN",
  "server/users.ts#searchAvailablePersons": "ADMIN",
  "server/users.ts#unlockAccount": "ADMIN",
  "server/users.ts#updateUserRole": "ADMIN",
  "server/users.ts#toggleUserActive": "ADMIN",
  "server/users.ts#linkUserToPerson": "ADMIN",
};

describe("server function auth guard", () => {
  const decls = collectServerFns();
  const keyOf = (d: { file: string; name: string }) => `${d.file}#${d.name}`;

  it("finds the server functions it is guarding", () => {
    expect(decls.length).toBeGreaterThan(100);
  });

  it("every createServerFn is authenticated or explicitly public", () => {
    const unguarded = decls
      .filter((d) => !hasAuthCheck(d))
      .filter((d) => !(keyOf(d) in PUBLIC_BY_DESIGN))
      .map(keyOf);

    expect(
      unguarded,
      `Unauthenticated server functions:\n${unguarded.join("\n")}`
    ).toEqual([]);
  });

  it("allowlist has no stale entries and no auth-protected entries", () => {
    const keys = new Set(decls.map(keyOf));
    const stale = Object.keys(PUBLIC_BY_DESIGN).filter((k) => !keys.has(k));
    const redundant = decls
      .filter((d) => keyOf(d) in PUBLIC_BY_DESIGN && hasAuthCheck(d))
      .map(keyOf);

    expect(stale).toEqual([]);
    expect(redundant).toEqual([]);
  });

  it("every allowlist entry has a justification", () => {
    for (const [key, reason] of Object.entries(PUBLIC_BY_DESIGN)) {
      expect(reason.trim().length, key).toBeGreaterThan(20);
    }
  });

  it("every authenticated function requires the expected role", () => {
    const mismatched = decls
      .filter((d) => hasAuthCheck(d) && !(keyOf(d) in PUBLIC_BY_DESIGN))
      .map((d) => ({
        key: keyOf(d),
        actual: roleOf(d),
        expected: EXPECTED_ROLE[keyOf(d)],
      }))
      .filter((r) => r.actual !== r.expected);

    expect(mismatched).toEqual([]);
  });

  it("EXPECTED_ROLE has no stale entries", () => {
    const keys = new Set(decls.map(keyOf));
    const stale = Object.keys(EXPECTED_ROLE).filter((k) => !keys.has(k));
    expect(stale).toEqual([]);
  });
});
