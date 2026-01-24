/**
 * Cross-runtime password hashing
 *
 * Works in both Node.js (Vite dev server) and Bun (production/seed)
 * Uses scrypt for compatibility with Better Auth's default password verification
 */

const isBunRuntime = typeof globalThis.Bun !== "undefined";

export async function hashPassword(password: string): Promise<string> {
  if (isBunRuntime) {
    // Use Node.js crypto even in Bun for cross-runtime compatibility
    const { scrypt, randomBytes } = await import("crypto");
    const salt = randomBytes(16).toString("hex");
    return new Promise((resolve, reject) => {
      scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(`scrypt:${salt}:${derivedKey.toString("hex")}`);
      });
    });
  }
  // For Node.js, use the same scrypt approach
  const { scrypt, randomBytes } = await import("crypto");
  const salt = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Handle our scrypt format
  if (hash.startsWith("scrypt:")) {
    const { scrypt, timingSafeEqual } = await import("crypto");
    const [, salt, storedHash] = hash.split(":");
    return new Promise((resolve, reject) => {
      scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(timingSafeEqual(Buffer.from(storedHash, "hex"), derivedKey));
      });
    });
  }

  // For argon2id hashes created by Bun (legacy support)
  if (isBunRuntime && hash.startsWith("$argon2")) {
    return globalThis.Bun.password.verify(password, hash);
  }

  return false;
}
