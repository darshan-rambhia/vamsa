import { createServerFn } from "@tanstack/react-start";
import {
  createCalendarTokenData,
  deleteCalendarTokenData,
  getAllCalendarTokensData,
  getCalendarTokensData,
  revokeCalendarTokenData,
  rotateCalendarTokenData,
  updateTokenNameData,
} from "@vamsa/lib/server/business";
import { requireAuth } from "./middleware/require-auth";
import type {
  CreateCalendarTokenInput,
  DeleteCalendarTokenResult,
  UpdateTokenNameResult,
} from "@vamsa/lib/server/business";

/**
 * Server function: Get current user's calendar tokens
 * @returns List of calendar tokens for the authenticated user
 * @requires MEMBER role or higher
 */
export const getCalendarTokens = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await requireAuth("MEMBER");
    return getCalendarTokensData(user.id);
  }
);

/**
 * Server function: Create new calendar token
 * @returns Created calendar token
 * @requires MEMBER role or higher
 */
export const createCalendarToken = createServerFn({ method: "POST" })
  .inputValidator((data: { name?: string; rotationPolicy?: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");
    const input: CreateCalendarTokenInput = {
      name: data.name,
      rotationPolicy: data.rotationPolicy,
    };
    return createCalendarTokenData(user.id, input);
  });

/**
 * Server function: Rotate a calendar token
 * @returns Newly created token after rotation
 * @requires MEMBER role or higher
 */
export const rotateCalendarToken = createServerFn({ method: "POST" })
  .inputValidator((data: { tokenId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");
    return rotateCalendarTokenData(data.tokenId, user.id);
  });

/**
 * Server function: Revoke a calendar token
 * @returns The revoked token
 * @requires MEMBER role or higher
 */
export const revokeCalendarToken = createServerFn({ method: "POST" })
  .inputValidator((data: { tokenId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth("MEMBER");
    return revokeCalendarTokenData(data.tokenId, user.id);
  });

/**
 * Server function: Update calendar token name
 * @returns Updated token with name and timestamp
 * @requires MEMBER role or higher
 */
export const updateTokenName = createServerFn({ method: "POST" })
  .inputValidator((data: { tokenId: string; name: string }) => data)
  .handler(async ({ data }): Promise<UpdateTokenNameResult> => {
    const user = await requireAuth("MEMBER");
    return updateTokenNameData(data.tokenId, data.name, user.id);
  });

/**
 * Server function: Delete a revoked calendar token (permanent deletion)
 * Only revoked (inactive) tokens can be deleted
 * @returns Success status with deleted token ID
 * @requires MEMBER role or higher
 */
export const deleteCalendarToken = createServerFn({ method: "POST" })
  .inputValidator((data: { tokenId: string }) => data)
  .handler(async ({ data }): Promise<DeleteCalendarTokenResult> => {
    const user = await requireAuth("MEMBER");
    return deleteCalendarTokenData(data.tokenId, user.id);
  });

/**
 * Server function: Get all calendar tokens across all users (Admin only)
 * @returns List of all calendar tokens with user information
 * @requires ADMIN role
 */
export const getAllCalendarTokens = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAuth("ADMIN");
    return getAllCalendarTokensData();
  }
);
