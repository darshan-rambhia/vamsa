/**
 * /api/v1/admin: user, invite and family-settings management.
 * Mounted behind requireApiAuth("ADMIN") in index.ts.
 */

import { OpenAPIHono, z } from "@hono/zod-openapi";
import { userRoleEnum, userUpdateSchema } from "@vamsa/schemas";
import {
  createInviteData,
  deleteInviteData,
  deleteUserData,
  getFamilySettingsData,
  getInvitesData,
  getUserData,
  getUsersData,
  resendInviteData,
  revokeInviteData,
  searchAvailablePersonsData,
  unlockUserAccountData,
  updateFamilySettingsData,
  updateUserData,
} from "@vamsa/lib/server/business";
import { idParam, jsonBody, jsonRoute, respond } from "./route-helpers";
import type { UserRole } from "@vamsa/schemas";

const USERS = "Admin: Users";
const INVITES = "Admin: Invites";
const SETTINGS = "Admin: Settings";

const adminRouter = new OpenAPIHono();

const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
};

// ---------------------------------------------------------------- users

adminRouter.openapi(
  jsonRoute({
    method: "get",
    path: "/users",
    tag: USERS,
    summary: "List users",
    operationId: "adminListUsers",
    request: {
      query: z.object({
        ...pageQuery,
        search: z.string().optional(),
        role: userRoleEnum.optional(),
        active: z.enum(["true", "false"]).optional(),
      }),
    },
  }),
  (c) => {
    const { active, ...q } = c.req.valid("query");
    return respond(c, () =>
      getUsersData({
        ...q,
        isActive: active === undefined ? undefined : active === "true",
      })
    );
  }
);

adminRouter.openapi(
  jsonRoute({
    method: "get",
    path: "/users/{id}",
    tag: USERS,
    summary: "Get a user",
    operationId: "adminGetUser",
    request: { params: idParam() },
  }),
  (c) => respond(c, () => getUserData(c.req.valid("param").id))
);

adminRouter.openapi(
  jsonRoute({
    method: "patch",
    path: "/users/{id}",
    tag: USERS,
    summary: "Update a user (name, email, role, active, linked person)",
    description:
      "You cannot demote or deactivate yourself. Deactivating ends the user's sessions and revokes their API tokens.",
    operationId: "adminUpdateUser",
    request: { params: idParam(), body: jsonBody(userUpdateSchema) },
  }),
  (c) =>
    respond(c, () =>
      updateUserData(
        c.req.valid("param").id,
        c.req.valid("json"),
        c.get("user").id
      )
    )
);

adminRouter.openapi(
  jsonRoute({
    method: "delete",
    path: "/users/{id}",
    tag: USERS,
    summary: "Delete a user",
    operationId: "adminDeleteUser",
    request: { params: idParam() },
  }),
  (c) =>
    respond(c, () => deleteUserData(c.req.valid("param").id, c.get("user").id))
);

adminRouter.openapi(
  jsonRoute({
    method: "post",
    path: "/users/{id}/unlock",
    tag: USERS,
    summary: "Clear a failed-login lockout",
    operationId: "adminUnlockUser",
    request: { params: idParam() },
  }),
  (c) =>
    respond(c, () =>
      unlockUserAccountData(c.req.valid("param").id, c.get("user").id)
    )
);

adminRouter.openapi(
  jsonRoute({
    method: "put",
    path: "/users/{id}/person",
    tag: USERS,
    summary: "Link a user to a person (personId null to unlink)",
    operationId: "adminLinkUserPerson",
    request: {
      params: idParam(),
      body: jsonBody(z.object({ personId: z.string().min(1).nullable() })),
    },
  }),
  (c) =>
    respond(c, () =>
      updateUserData(
        c.req.valid("param").id,
        { personId: c.req.valid("json").personId },
        c.get("user").id
      )
    )
);

adminRouter.openapi(
  jsonRoute({
    method: "get",
    path: "/persons/available",
    tag: USERS,
    summary: "People not yet linked to a user",
    operationId: "adminAvailablePersons",
    request: { query: z.object({ q: z.string().optional() }) },
  }),
  (c) =>
    respond(c, async () => {
      const items = await searchAvailablePersonsData(c.req.valid("query").q);
      return { items, total: items.length };
    })
);

// ---------------------------------------------------------------- invites

adminRouter.openapi(
  jsonRoute({
    method: "get",
    path: "/invites",
    tag: INVITES,
    summary: "List invites",
    operationId: "adminListInvites",
    request: {
      query: z.object({
        ...pageQuery,
        status: z
          .enum(["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"])
          .optional(),
      }),
    },
  }),
  (c) => {
    const { page, limit, sortOrder, status } = c.req.valid("query");
    return respond(c, () => getInvitesData(page, limit, sortOrder, status));
  }
);

adminRouter.openapi(
  jsonRoute({
    method: "post",
    path: "/invites",
    tag: INVITES,
    summary: "Invite someone by email",
    operationId: "adminCreateInvite",
    request: {
      body: jsonBody(
        z.object({
          email: z.string().email(),
          role: userRoleEnum.default("MEMBER"),
          personId: z.string().min(1).nullable().optional(),
        })
      ),
    },
    status: 201,
  }),
  (c) => {
    const { email, role, personId } = c.req.valid("json");
    return respond(
      c,
      () => createInviteData(email, role, personId, c.get("user").id),
      201
    );
  }
);

adminRouter.openapi(
  jsonRoute({
    method: "post",
    path: "/invites/{id}/revoke",
    tag: INVITES,
    summary: "Revoke a pending invite",
    operationId: "adminRevokeInvite",
    request: { params: idParam() },
  }),
  (c) =>
    respond(c, () =>
      revokeInviteData(c.req.valid("param").id, c.get("user").id)
    )
);

adminRouter.openapi(
  jsonRoute({
    method: "post",
    path: "/invites/{id}/resend",
    tag: INVITES,
    summary: "Resend an invite with a fresh token and expiry",
    operationId: "adminResendInvite",
    request: { params: idParam() },
  }),
  (c) => respond(c, () => resendInviteData(c.req.valid("param").id))
);

adminRouter.openapi(
  jsonRoute({
    method: "delete",
    path: "/invites/{id}",
    tag: INVITES,
    summary: "Delete a revoked invite",
    operationId: "adminDeleteInvite",
    request: { params: idParam() },
  }),
  (c) =>
    respond(c, () =>
      deleteInviteData(c.req.valid("param").id, c.get("user").id)
    )
);

// ---------------------------------------------------------------- settings

const settingsBody = z
  .object({
    familyName: z.string().min(1).max(200),
    description: z.string().max(2000),
    allowSelfRegistration: z.boolean(),
    requireApprovalForEdits: z.boolean(),
    allowProfileClaiming: z.boolean(),
    metricsDashboardUrl: z.string().url().nullable(),
    metricsApiUrl: z.string().url().nullable(),
  })
  .partial()
  .strict()
  .openapi("FamilySettingsUpdate");

adminRouter.openapi(
  jsonRoute({
    method: "get",
    path: "/settings",
    tag: SETTINGS,
    summary: "Get family settings",
    operationId: "adminGetSettings",
  }),
  (c) => respond(c, () => getFamilySettingsData())
);

adminRouter.openapi(
  jsonRoute({
    method: "put",
    path: "/settings",
    tag: SETTINGS,
    summary: "Update family settings",
    description:
      "Send only the keys to change; they are merged over the current settings. Unknown keys are rejected.",
    operationId: "adminUpdateSettings",
    request: { body: jsonBody(settingsBody) },
  }),
  (c) =>
    respond(c, async () => {
      const current = await getFamilySettingsData();
      const user = c.get("user");
      const { id: _id, ...base } = current;
      return updateFamilySettingsData(
        { ...base, ...c.req.valid("json") },
        user.role as UserRole,
        user.id
      );
    })
);

export default adminRouter;
