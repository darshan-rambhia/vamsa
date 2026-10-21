import { describe, expect, it, vi } from "vitest";
import {
  deviceVerificationUri,
  formatUserCode,
  getDeviceRequestDetails,
  isDeviceClient,
  normalizeUserCode,
  recordDeviceUserAgent,
} from "./device-auth";
import type { DeviceAuthDb } from "./device-auth";

describe("device-auth helpers", () => {
  it("normalizes typed codes", () => {
    expect(normalizeUserCode(" abcd-efgh ")).toBe("ABCDEFGH");
  });

  it("formats 8-char codes as XXXX-XXXX", () => {
    expect(formatUserCode("ABCDEFGH")).toBe("ABCD-EFGH");
    expect(formatUserCode("abc")).toBe("ABC");
  });

  it("allows only known clients (no prototype keys)", () => {
    expect(isDeviceClient("vamsa-cli")).toBe(true);
    expect(isDeviceClient("__proto__")).toBe(false);
    expect(isDeviceClient("")).toBe(false);
  });

  it("builds the page URL from APP_URL, then BETTER_AUTH_URL", () => {
    expect(deviceVerificationUri({ APP_URL: "https://v.example/" })).toBe(
      "https://v.example/device"
    );
    expect(
      deviceVerificationUri({ BETTER_AUTH_URL: "https://a.example" })
    ).toBe("https://a.example/device");
    expect(deviceVerificationUri({})).toBe("http://localhost:3000/device");
  });
});

function selectDb(rows: Array<Record<string, unknown>>) {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: async () => rows,
  };
  return { select: () => chain } as unknown as DeviceAuthDb;
}

describe("getDeviceRequestDetails", () => {
  it("returns display fields with the client's name", async () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const details = await getDeviceRequestDetails(
      "abcd-efgh",
      selectDb([
        {
          userCode: "ABCDEFGH",
          clientId: "vamsa-cli",
          scope: "write",
          userAgent: "vamsa-cli/0.2.0",
          createdAt,
          expiresAt: createdAt,
        },
      ])
    );
    expect(details).toEqual({
      userCode: "ABCD-EFGH",
      clientId: "vamsa-cli",
      clientName: "Vamsa CLI",
      scope: "write",
      userAgent: "vamsa-cli/0.2.0",
      createdAt,
      expiresAt: createdAt,
    });
  });

  it("returns null for unknown codes", async () => {
    expect(await getDeviceRequestDetails("ZZZZ", selectDb([]))).toBeNull();
  });
});

describe("recordDeviceUserAgent", () => {
  it("skips when there is no user agent", async () => {
    const update = vi.fn();
    await recordDeviceUserAgent("dc", undefined, {
      update,
    } as unknown as DeviceAuthDb);
    expect(update).not.toHaveBeenCalled();
  });

  it("never throws on a database error", async () => {
    const db = {
      update: () => {
        throw new Error("db down");
      },
    } as unknown as DeviceAuthDb;
    await expect(
      recordDeviceUserAgent("dc", "vamsa-cli", db)
    ).resolves.toBeUndefined();
  });
});
