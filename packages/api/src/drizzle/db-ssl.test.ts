import * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSslConfig } from "./db";

describe("getSslConfig", () => {
  beforeEach(() => {
    // Store original env vars
    vi.stubEnv("DB_SSL_MODE", undefined);
    vi.stubEnv("DB_SSL_CA_CERT", undefined);
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("disable mode", () => {
    it("should return undefined when DB_SSL_MODE=disable", () => {
      vi.stubEnv("DB_SSL_MODE", "disable");

      const config = getSslConfig();

      expect(config).toBeUndefined();
    });
  });

  describe("require mode", () => {
    it("should return { rejectUnauthorized: false } when DB_SSL_MODE=require", () => {
      vi.stubEnv("DB_SSL_MODE", "require");

      const config = getSslConfig();

      expect(config).toEqual({ rejectUnauthorized: false });
    });
  });

  describe("verify-ca mode", () => {
    it("should throw error when DB_SSL_MODE=verify-ca but DB_SSL_CA_CERT is not set", () => {
      vi.stubEnv("DB_SSL_MODE", "verify-ca");
      vi.stubEnv("DB_SSL_CA_CERT", undefined);

      expect(() => getSslConfig()).toThrow(
        "DB_SSL_MODE=verify-ca requires DB_SSL_CA_CERT environment variable to be set"
      );
    });

    it("should throw error when CA cert file does not exist", () => {
      const nonExistentPath = "/tmp/non-existent-cert-12345.pem";
      vi.stubEnv("DB_SSL_MODE", "verify-ca");
      vi.stubEnv("DB_SSL_CA_CERT", nonExistentPath);

      expect(() => getSslConfig()).toThrow(
        `Failed to read CA certificate from`
      );
    });

    it("should return config with CA cert content when valid", () => {
      const tempCert = "/tmp/test-ca-cert-verify-ca.pem";
      const certContent = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHHCgVZKwVPMA0GCSqGSIb3DQEBBQUAMBMxETAPBgNVBAMMCENv
-----END CERTIFICATE-----`;

      fs.writeFileSync(tempCert, certContent, "utf-8");

      try {
        vi.stubEnv("DB_SSL_MODE", "verify-ca");
        vi.stubEnv("DB_SSL_CA_CERT", tempCert);

        const config = getSslConfig();

        expect(config).toEqual({
          rejectUnauthorized: true,
          ca: certContent,
        });
      } finally {
        fs.unlinkSync(tempCert);
      }
    });
  });

  describe("verify-full mode", () => {
    it("should throw error when DB_SSL_MODE=verify-full but DB_SSL_CA_CERT is not set", () => {
      vi.stubEnv("DB_SSL_MODE", "verify-full");
      vi.stubEnv("DB_SSL_CA_CERT", undefined);

      expect(() => getSslConfig()).toThrow(
        "DB_SSL_MODE=verify-full requires DB_SSL_CA_CERT environment variable to be set"
      );
    });

    it("should throw error when CA cert file does not exist for verify-full", () => {
      const nonExistentPath = "/tmp/non-existent-cert-67890.pem";
      vi.stubEnv("DB_SSL_MODE", "verify-full");
      vi.stubEnv("DB_SSL_CA_CERT", nonExistentPath);

      expect(() => getSslConfig()).toThrow(
        `Failed to read CA certificate from`
      );
    });

    it("should return config with CA cert content when valid for verify-full", () => {
      const tempCert = "/tmp/test-ca-cert-verify-full.pem";
      const certContent = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHHCgVZKwVOMA0GCSqGSIb3DQEBBQUAMBMxETAPBgNVBAMMCENv
-----END CERTIFICATE-----`;

      fs.writeFileSync(tempCert, certContent, "utf-8");

      try {
        vi.stubEnv("DB_SSL_MODE", "verify-full");
        vi.stubEnv("DB_SSL_CA_CERT", tempCert);

        const config = getSslConfig();

        expect(config).toEqual({
          rejectUnauthorized: true,
          ca: certContent,
        });
      } finally {
        fs.unlinkSync(tempCert);
      }
    });
  });

  describe("backward compatibility", () => {
    it("should return { rejectUnauthorized: false } in production when DB_SSL_MODE is unset", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("DB_SSL_MODE", undefined);

      const config = getSslConfig();

      expect(config).toEqual({ rejectUnauthorized: false });
    });

    it("should return undefined in development when DB_SSL_MODE is unset", () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("DB_SSL_MODE", undefined);

      const config = getSslConfig();

      expect(config).toBeUndefined();
    });

    it("should return undefined in test env when DB_SSL_MODE is unset", () => {
      vi.stubEnv("NODE_ENV", "test");
      vi.stubEnv("DB_SSL_MODE", undefined);

      const config = getSslConfig();

      expect(config).toBeUndefined();
    });
  });

  describe("invalid modes", () => {
    it("should use default behavior for unrecognized SSL mode", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("DB_SSL_MODE", "invalid-mode" as any);

      const config = getSslConfig();

      expect(config).toEqual({ rejectUnauthorized: false });
    });
  });

  describe("CA cert file reading edge cases", () => {
    it("should read CA cert file with various encodings", () => {
      const tempCert = "/tmp/test-ca-cert-encoding.pem";
      const certContent = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHHCgVZKwVPMA0GCSqGSIb3DQEBAQUAMA0GCSqGSIb3DQEB
-----END CERTIFICATE-----`;

      fs.writeFileSync(tempCert, certContent, "utf-8");

      try {
        vi.stubEnv("DB_SSL_MODE", "verify-ca");
        vi.stubEnv("DB_SSL_CA_CERT", tempCert);

        const config = getSslConfig();

        expect(config?.ca).toBe(certContent);
      } finally {
        fs.unlinkSync(tempCert);
      }
    });
  });
});
