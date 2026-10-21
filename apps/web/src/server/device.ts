/**
 * Server functions for the /device page (approve a `vamsa login`).
 * Handlers live in device.server.ts so server code stays out of the client.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  decideDeviceRequestHandler,
  getDeviceRequestHandler,
} from "./device.server";

export type { DeviceRequestView, DeviceState } from "./device.server";

/**
 * Server function: details of a device login request
 * @requires VIEWER role or higher (any signed-in user)
 */
export const getDeviceRequest = createServerFn({ method: "GET" })
  .validator((data: { userCode: string }) => data)
  .handler(async ({ data }) => getDeviceRequestHandler(data.userCode));

/**
 * Server function: approve or deny a device login request
 * @requires VIEWER role or higher (any signed-in user)
 */
export const decideDeviceRequest = createServerFn({ method: "POST" })
  .validator((data: { userCode: string; approve: boolean }) => data)
  .handler(async ({ data }) => decideDeviceRequestHandler(data));
