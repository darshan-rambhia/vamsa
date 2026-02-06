import { describe, expect, it } from "vitest";
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
});
