/**
 * Unit tests for server-side credential account creation
 *
 * Verifies the user and its credential Account row are written the way
 * Better Auth's sign-up does, without going through the sign-up endpoint.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCredentialAccount } from "./auth-accounts";

const { mockSendVerification } = vi.hoisted(() => ({
  mockSendVerification: vi.fn(async (_email: string) => ({})),
}));

vi.mock("./auth-better", () => ({
  auth: {
    api: { sendVerificationEmail: mockSendVerification },
    $context: Promise.resolve({}),
  },
}));

function makeContext(createdUser: { id: string } | null = { id: "user-1" }) {
  const createUser = vi.fn(
    async (_data: Record<string, unknown>, _source: unknown) => createdUser
  );
  const linkAccount = vi.fn(async (_account: Record<string, unknown>) => ({}));
  const hash = vi.fn(async (password: string) => `hashed:${password}`);
  return {
    ctx: {
      internalAdapter: { createUser, linkAccount },
      password: { hash },
    } as any,
    createUser,
    linkAccount,
    hash,
  };
}

describe("createCredentialAccount", () => {
  beforeEach(() => {
    mockSendVerification.mockClear();
  });

  it("creates the user and a credential account with the hashed password", async () => {
    const { ctx, createUser, linkAccount, hash } = makeContext();

    const result = await createCredentialAccount(
      {
        email: "New@Example.com",
        name: "New",
        password: "pw-123456789",
        emailVerified: true,
      },
      {
        getContext: async () => ctx,
        sendVerificationEmail: mockSendVerification,
      }
    );

    expect(result).toEqual({ userId: "user-1" });
    expect(hash).toHaveBeenCalledWith("pw-123456789");
    expect(createUser.mock.calls[0]?.[0]).toMatchObject({
      email: "new@example.com",
      name: "New",
      emailVerified: true,
    });
    expect(linkAccount).toHaveBeenCalledWith({
      userId: "user-1",
      providerId: "credential",
      accountId: "user-1",
      password: "hashed:pw-123456789",
    });
  });

  it("writes Vamsa fields passed by trusted server code", async () => {
    const { ctx, createUser } = makeContext();

    await createCredentialAccount(
      {
        email: "member@example.com",
        name: "Member",
        password: "pw-123456789",
        emailVerified: true,
        role: "MEMBER",
        personId: "person-9",
        invitedById: "admin-1",
      },
      {
        getContext: async () => ctx,
        sendVerificationEmail: mockSendVerification,
      }
    );

    expect(createUser.mock.calls[0]?.[0]).toMatchObject({
      role: "MEMBER",
      personId: "person-9",
      invitedById: "admin-1",
    });
  });

  it("sends a verification email for unverified accounts", async () => {
    const { ctx } = makeContext();

    await createCredentialAccount(
      { email: "claim@example.com", name: "Claim", password: "pw-123456789" },
      {
        getContext: async () => ctx,
        sendVerificationEmail: mockSendVerification,
      }
    );

    expect(mockSendVerification).toHaveBeenCalledWith("claim@example.com");
  });

  it("does not send a verification email when already verified", async () => {
    const { ctx } = makeContext();

    await createCredentialAccount(
      {
        email: "inv@example.com",
        name: "Inv",
        password: "pw-123456789",
        emailVerified: true,
      },
      {
        getContext: async () => ctx,
        sendVerificationEmail: mockSendVerification,
      }
    );

    expect(mockSendVerification).not.toHaveBeenCalled();
  });

  it("still succeeds when the verification email fails", async () => {
    const { ctx } = makeContext();
    const failing = vi.fn(async () => {
      throw new Error("smtp down");
    });

    await expect(
      createCredentialAccount(
        { email: "x@example.com", name: "X", password: "pw-123456789" },
        { getContext: async () => ctx, sendVerificationEmail: failing }
      )
    ).resolves.toEqual({ userId: "user-1" });
  });

  it("throws and writes no account row when the user is not created", async () => {
    const { ctx, linkAccount } = makeContext(null);

    await expect(
      createCredentialAccount(
        { email: "x@example.com", name: "X", password: "pw-123456789" },
        {
          getContext: async () => ctx,
          sendVerificationEmail: mockSendVerification,
        }
      )
    ).rejects.toThrow("Failed to create user");
    expect(linkAccount).not.toHaveBeenCalled();
  });
});
