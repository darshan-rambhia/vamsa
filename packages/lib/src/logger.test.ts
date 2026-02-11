import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import pino from "pino";

import {
  createContextLogger,
  createRequestLogger,
  logger,
  serializeError,
  startTimer,
} from "./logger";

describe("Logger", () => {
  it("should be defined", () => {
    expect(logger).toBeDefined();
  });

  it("should have info method", () => {
    expect(typeof logger.info).toBe("function");
  });

  it("should have error method", () => {
    expect(typeof logger.error).toBe("function");
  });

  it("should have warn method", () => {
    expect(typeof logger.warn).toBe("function");
  });

  it("should have debug method", () => {
    expect(typeof logger.debug).toBe("function");
  });

  it("should support info logging", () => {
    expect(() => {
      logger.info("Test message");
    }).not.toThrow();
  });

  it("should support info logging with metadata", () => {
    expect(() => {
      logger.info({ userId: "123" }, "User action");
    }).not.toThrow();
  });

  it("should support error logging", () => {
    expect(() => {
      logger.error({ code: "ERR_001" }, "Error occurred");
    }).not.toThrow();
  });

  describe("createContextLogger", () => {
    it("should return a logger", () => {
      const contextLogger = createContextLogger({ service: "test" });
      expect(contextLogger).toBeDefined();
      expect(typeof contextLogger.info).toBe("function");
    });

    it("should support logging with context", () => {
      const contextLogger = createContextLogger({
        operation: "testOperation",
      });
      expect(() => {
        contextLogger.info("Operation started");
      }).not.toThrow();
    });
  });

  describe("createRequestLogger", () => {
    it("should return a logger with requestId", () => {
      const requestLogger = createRequestLogger("req-123");
      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.info).toBe("function");
    });

    it("should support logging with request context", () => {
      const requestLogger = createRequestLogger("req-456");
      expect(() => {
        requestLogger.info({ path: "/api/test" }, "Processing request");
      }).not.toThrow();
    });
  });

  describe("startTimer", () => {
    it("should return a function", () => {
      const timer = startTimer();
      expect(typeof timer).toBe("function");
    });

    it("should measure time", () => {
      const timer = startTimer();
      // Simulate some work
      for (let i = 0; i < 1000; i++) {
        // no-op
      }
      expect(() => {
        timer({ label: "test" });
      }).not.toThrow();
    });
  });

  describe("serializeError", () => {
    it("should serialize Error objects", () => {
      const error = new Error("Test error");
      const serialized = serializeError(error);

      expect(serialized).toBeDefined();
      expect(serialized.message, `${serialized}`).toBe("Test error");
      expect(serialized.name).toBe("Error");
      expect(serialized.stack).toBeDefined();
    });

    it("should wrap unknown values in value property", () => {
      const value = "not an error";
      const serialized = serializeError(value);
      expect(serialized).toEqual({ value: "not an error" });
    });

    it("should handle Error with cause", () => {
      const cause = new Error("Cause error");
      const error = new Error("Main error");
      (error as unknown as { cause: Error }).cause = cause;

      const serialized = serializeError(error);
      expect(serialized).toBeDefined();
      expect(serialized.message).toBe("Main error");
      expect(serialized.cause).toBeDefined();
    });
  });

  describe("log levels", () => {
    it("should support trace level", () => {
      expect(() => {
        logger.trace("Trace message");
      }).not.toThrow();
    });

    it("should support debug level", () => {
      expect(() => {
        logger.debug("Debug message");
      }).not.toThrow();
    });

    it("should support info level", () => {
      expect(() => {
        logger.info("Info message");
      }).not.toThrow();
    });

    it("should support warn level", () => {
      expect(() => {
        logger.warn("Warn message");
      }).not.toThrow();
    });

    it("should support error level", () => {
      expect(() => {
        logger.error("Error message");
      }).not.toThrow();
    });

    it("should support fatal level", () => {
      expect(() => {
        logger.fatal("Fatal message");
      }).not.toThrow();
    });
  });

  describe("metadata support", () => {
    it("should include metadata in logs", () => {
      expect(() => {
        logger.info(
          {
            userId: "user-123",
            action: "login",
            timestamp: new Date().toISOString(),
          },
          "User logged in"
        );
      }).not.toThrow();
    });

    it("should include metadata with context logger", () => {
      const contextLogger = createContextLogger({
        service: "auth",
        version: "1.0",
      });
      expect(() => {
        contextLogger.info({ userId: "user-456" }, "Authentication check");
      }).not.toThrow();
    });
  });

  describe("redaction", () => {
    function createTestLogger() {
      const chunks: Array<string> = [];
      const stream = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(chunk.toString());
          callback();
        },
      });

      const testLogger = pino(
        {
          level: "info",
          redact: {
            paths: [
              "password",
              "passwordHash",
              "currentPassword",
              "newPassword",
              "confirmPassword",
              "token",
              "accessToken",
              "refreshToken",
              "sessionToken",
              "csrfToken",
              "apiKey",
              "secret",
              "authorization",
              "credentials",
              "cookie",
              "cookies",
              "creditCard",
              "ssn",
              "socialSecurityNumber",
              "*.password",
              "*.passwordHash",
              "*.currentPassword",
              "*.newPassword",
              "*.confirmPassword",
              "*.token",
              "*.accessToken",
              "*.refreshToken",
              "*.sessionToken",
              "*.csrfToken",
              "*.secret",
              "*.cookie",
              "*.cookies",
              "*.authorization",
              "*.apiKey",
              "*.credentials",
              "*.*.password",
              "*.*.token",
              "*.*.secret",
              "*.*.cookie",
              "*.*.authorization",
              "body.password",
              "body.currentPassword",
              "body.newPassword",
              "body.confirmPassword",
              "headers.cookie",
              "headers.authorization",
              "headers.Cookie",
              "headers.Authorization",
              "bodyText",
              "responseBody",
            ],
            remove: true,
          },
          serializers: {
            err: pino.stdSerializers.err,
            headers: (headers: Record<string, string> | undefined) => {
              if (!headers) return headers;
              const safe = { ...headers };
              delete safe.cookie;
              delete safe.Cookie;
              delete safe.authorization;
              delete safe.Authorization;
              if (safe["set-cookie"]) safe["set-cookie"] = "[REDACTED]";
              return safe;
            },
          },
        },
        stream
      );

      return { logger: testLogger, chunks };
    }

    it("should redact password fields", () => {
      const { logger: testLogger, chunks } = createTestLogger();
      testLogger.info(
        {
          userId: "user-123",
          password: "super-secret-password",
          action: "login",
        },
        "User action"
      );

      const output = JSON.parse(chunks[0]);
      expect(output.password).toBeUndefined();
      expect(output.userId).toBe("user-123");
      expect(output.action).toBe("login");
    });

    it("should redact nested password fields", () => {
      const { logger: testLogger, chunks } = createTestLogger();
      testLogger.info(
        {
          user: {
            id: "user-123",
            password: "super-secret-password",
          },
          action: "login",
        },
        "Nested data"
      );

      const output = JSON.parse(chunks[0]);
      expect(output.user.password).toBeUndefined();
      expect(output.user.id).toBe("user-123");
    });

    it("should redact token fields", () => {
      const { logger: testLogger, chunks } = createTestLogger();
      testLogger.info(
        {
          userId: "user-123",
          accessToken: "jwt-token-123",
          refreshToken: "refresh-123",
        },
        "Token info"
      );

      const output = JSON.parse(chunks[0]);
      expect(output.accessToken).toBeUndefined();
      expect(output.refreshToken).toBeUndefined();
      expect(output.userId).toBe("user-123");
    });

    it("should redact authorization headers", () => {
      const { logger: testLogger, chunks } = createTestLogger();
      testLogger.info(
        {
          headers: {
            "content-type": "application/json",
            authorization: "Bearer token-123",
            cookie: "session=abc123",
          },
        },
        "Request headers"
      );

      const output = JSON.parse(chunks[0]);
      expect(output.headers.authorization).toBeUndefined();
      expect(output.headers.cookie).toBeUndefined();
      expect(output.headers["content-type"]).toBe("application/json");
    });

    it("should redact bodyText fields", () => {
      const { logger: testLogger, chunks } = createTestLogger();
      testLogger.info(
        {
          url: "/api/auth",
          method: "POST",
          bodyText: '{"password":"secret123"}',
        },
        "Auth request"
      );

      const output = JSON.parse(chunks[0]);
      expect(output.bodyText).toBeUndefined();
      expect(output.url).toBe("/api/auth");
      expect(output.method).toBe("POST");
    });

    it("should redact responseBody fields", () => {
      const { logger: testLogger, chunks } = createTestLogger();
      testLogger.info(
        {
          status: 200,
          responseBody: '{"token":"jwt-token-123"}',
        },
        "Auth response"
      );

      const output = JSON.parse(chunks[0]);
      expect(output.responseBody).toBeUndefined();
      expect(output.status).toBe(200);
    });

    it("should redact multiple sensitive fields simultaneously", () => {
      const { logger: testLogger, chunks } = createTestLogger();
      testLogger.info(
        {
          userId: "user-123",
          password: "secret-123",
          currentPassword: "old-secret",
          newPassword: "new-secret",
          apiKey: "key-abc123",
          token: "token-xyz789",
          action: "change-password",
        },
        "Password change"
      );

      const output = JSON.parse(chunks[0]);
      expect(output.password).toBeUndefined();
      expect(output.currentPassword).toBeUndefined();
      expect(output.newPassword).toBeUndefined();
      expect(output.apiKey).toBeUndefined();
      expect(output.token).toBeUndefined();
      expect(output.userId).toBe("user-123");
      expect(output.action).toBe("change-password");
    });

    it("should handle headers serializer with set-cookie", () => {
      const { logger: testLogger, chunks } = createTestLogger();
      testLogger.info(
        {
          headers: {
            "content-type": "application/json",
            "set-cookie": "session=abc123; Path=/",
          },
        },
        "Response headers"
      );

      const output = JSON.parse(chunks[0]);
      expect(output.headers["set-cookie"]).toBe("[REDACTED]");
      expect(output.headers["content-type"]).toBe("application/json");
    });

    it("should pass through non-sensitive fields", () => {
      const { logger: testLogger, chunks } = createTestLogger();
      testLogger.info(
        {
          userId: "user-123",
          action: "login",
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          timestamp: "2024-01-01T00:00:00Z",
        },
        "User activity"
      );

      const output = JSON.parse(chunks[0]);
      expect(output.userId).toBe("user-123");
      expect(output.action).toBe("login");
      expect(output.ipAddress).toBe("192.168.1.1");
      expect(output.userAgent).toBe("Mozilla/5.0");
      expect(output.timestamp).toBe("2024-01-01T00:00:00Z");
    });

    it("should redact double-nested sensitive fields with wildcard patterns", () => {
      const { logger: testLogger, chunks } = createTestLogger();
      testLogger.info(
        {
          data: {
            token: "secret-token-123",
            secret: "super-secret",
          },
          user: {
            token: "user-token-123",
          },
          action: "login",
        },
        "Double nesting"
      );

      const output = JSON.parse(chunks[0]);
      // Pino redacts *.token patterns in one level of nesting
      expect(output.data.token).toBeUndefined();
      expect(output.data.secret).toBeUndefined();
      expect(output.user.token).toBeUndefined();
      expect(output.action).toBe("login");
    });
  });
});
