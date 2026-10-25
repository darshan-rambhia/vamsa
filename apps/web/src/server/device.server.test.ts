import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  decideDeviceRequestHandler,
  getDeviceRequestHandler,
} from "./device.server";

const { mockVerify, mockApprove, mockDeny, mockRateLimit, mockDetails } =
  vi.hoisted(() => ({
    mockDetails: vi.fn(
      async (): Promise<Record<string, unknown> | null> => null
    ),
    mockVerify: vi.fn(),
    mockApprove: vi.fn(),
    mockDeny: vi.fn(),
    mockRateLimit: vi.fn(async () => {}),
  }));

vi.mock("@tanstack/react-start/server", () => ({
  getRequestHeaders: () => new Headers(),
}));
vi.mock("@vamsa/lib/server/business/auth-better", () => ({
  auth: {
    api: {
      deviceVerify: mockVerify,
      deviceApprove: mockApprove,
      deviceDeny: mockDeny,
    },
  },
}));
vi.mock("@vamsa/lib/server/business/device-auth", () => ({
  normalizeUserCode: (c: string) =>
    c.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
  formatUserCode: (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`,
  getDeviceRequestDetails: mockDetails,
}));
vi.mock("./middleware/require-auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "user-1", role: "VIEWER" })),
}));
vi.mock("./middleware/rate-limiter", () => ({
  checkRateLimit: mockRateLimit,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockDetails.mockResolvedValue(null);
  mockVerify.mockResolvedValue({ status: "pending", client_id: "vamsa-cli" });
  mockApprove.mockResolvedValue({ success: true });
  mockDeny.mockResolvedValue({ success: true });
});

describe("device handlers", () => {
  it("lookup is rate limited per user and never approves", async () => {
    const view = await getDeviceRequestHandler("abcd-efgh");
    expect(mockRateLimit).toHaveBeenCalledWith("deviceAuth", "user-1");
    expect(view.state).toBe("pending");
    expect(mockApprove).not.toHaveBeenCalled();
    expect(mockDeny).not.toHaveBeenCalled();
  });

  it("lost claim race: still shown when the row is claimed by this user", async () => {
    // Second concurrent lookup: Better Auth omits client_id
    mockVerify.mockResolvedValue({ status: "pending" });
    mockDetails.mockResolvedValue({
      userId: "user-1",
      clientId: "vamsa-cli",
      clientName: "Vamsa CLI",
      expiresAt: new Date(),
    });
    expect((await getDeviceRequestHandler("ABCDEFGH")).state).toBe("pending");
  });

  it("code claimed by someone else is invalid", async () => {
    mockVerify.mockResolvedValue({ status: "pending" });
    mockDetails.mockResolvedValue({
      userId: "user-2",
      clientId: "vamsa-cli",
      expiresAt: new Date(),
    });
    const view = await getDeviceRequestHandler("ABCDEFGH");
    expect(view).toEqual({ state: "invalid", userCode: "ABCD-EFGH" });
  });

  it("decide is rate limited per user", async () => {
    await decideDeviceRequestHandler({ userCode: "ABCDEFGH", approve: true });
    expect(mockRateLimit).toHaveBeenCalledWith("deviceAuth", "user-1");
    expect(mockApprove).toHaveBeenCalledTimes(1);
  });

  it("over the limit: no lookup or decision reaches Better Auth", async () => {
    mockRateLimit.mockRejectedValueOnce(new Error("Too many requests"));
    await expect(getDeviceRequestHandler("ABCDEFGH")).rejects.toThrow(
      "Too many requests"
    );
    mockRateLimit.mockRejectedValueOnce(new Error("Too many requests"));
    await expect(
      decideDeviceRequestHandler({ userCode: "ABCDEFGH", approve: true })
    ).rejects.toThrow("Too many requests");
    expect(mockVerify).not.toHaveBeenCalled();
    expect(mockApprove).not.toHaveBeenCalled();
  });
});
