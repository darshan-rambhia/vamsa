# Structured Logging System

This project uses **pino** for structured JSON logging with automatic pretty-printing in development.

## Overview

- **Library**: [pino](https://getpino.io) - Fast, low-overhead JSON logging
- **Pretty formatting**: [pino-pretty](https://github.com/pinojs/pino-pretty) in development
- **Automatic redaction**: Sensitive data (passwords, tokens, etc.) are automatically removed
- **Location**: `packages/lib/src/logger.ts`
- **Export**: Via `@vamsa/lib` package

## Features

- Structured metadata support (userId, requestId, etc.)
- Child loggers with context
- Request correlation IDs
- Performance timing helpers
- Automatic sensitive data redaction
- Different output formats: pretty (dev) vs JSON (prod)
- Log level configuration via `LOG_LEVEL` env var

## Usage

### Basic Logging

```typescript
import { logger } from "@vamsa/lib";

// Simple message
logger.info("Application started");

// With metadata
logger.info({ userId: "user-123" }, "User logged in");

// Different log levels
logger.debug({ data }, "Debug information");
logger.info("Normal info message");
logger.warn({ deprecation: true }, "Warning message");
logger.error({ code: "ERR_001" }, "Error occurred");
logger.fatal("Critical failure");
```

### Child Loggers with Context

Use child loggers to automatically include context in all logs:

```typescript
import { createContextLogger, createRequestLogger } from "@vamsa/lib";

// Create a logger for a specific operation
const dbLogger = createContextLogger({
  service: "database",
  environment: process.env.NODE_ENV,
});
dbLogger.info("Query executed"); // includes service and environment

// Create a request-scoped logger
const requestId = generateId();
const requestLogger = createRequestLogger(requestId);
requestLogger.info("Processing request"); // includes requestId
```

### Performance Timing

```typescript
import { startTimer } from "@vamsa/lib";

const timer = startTimer();
// ... do some work
timer({ label: "database-query", table: "users" });
// Output: { label: 'database-query', table: 'users', duration: 125 } Operation completed
```

### Error Serialization

```typescript
import { logger, serializeError } from "@vamsa/lib";

try {
  // ... some operation
} catch (error) {
  logger.error(
    { error: serializeError(error) },
    "Operation failed"
  );
}
```

## Log Levels

From most to least verbose:

1. **trace** - Very detailed debugging information
2. **debug** - Detailed information useful during development
3. **info** - General informational messages (default in production)
4. **warn** - Warning messages for potentially harmful situations
5. **error** - Error messages for exceptional conditions
6. **fatal** - Critical failures that require immediate attention

## Configuration

### Environment Variables

```bash
# Set log level (default: "debug" in dev, "info" in prod)
LOG_LEVEL=debug

# NODE_ENV determines output format
NODE_ENV=development  # Pretty-printed logs
NODE_ENV=production   # JSON-formatted logs
```

### Default Behavior

- **Development** (`NODE_ENV !== "production"`)
  - Level: debug
  - Format: Pretty-printed with colors
  - Fields ignored: pid, hostname
  - Timestamp: Standard format

- **Production**
  - Level: info
  - Format: JSON (one line per log)
  - Timestamp: ISO format
  - All fields included for log aggregation

## Redacted Fields

The logger automatically removes/redacts these sensitive fields:

- password
- passwordHash
- token
- accessToken
- refreshToken
- apiKey
- secret
- authorization
- credentials

**Never log sensitive data directly.** The logger will remove common secrets, but it's better to be explicit:

```typescript
// Bad - relies on redaction
logger.info({ user }, "User created");

// Good - exclude sensitive fields
logger.info(
  { userId: user.id, email: user.email },
  "User created"
);
```

## Example Output

### Development (Pretty)

```
INFO  Starting database seed...
INFO  Current database state persons=0 users=0
INFO  Created 30 family members across 5 generations
INFO  Creating family relationships...
INFO  Added event participants for marriage events
```

### Production (JSON)

```json
{"level":"INFO","time":"2026-01-11T10:30:45.123Z","persons":0,"users":0,"msg":"Current database state"}
{"level":"INFO","time":"2026-01-11T10:30:47.456Z","msg":"Created 30 family members across 5 generations"}
```

## Integration Points

### In Server Functions

```typescript
import { createContextLogger } from "@vamsa/lib";

export async function createPerson(input: PersonInput) {
  const logger = createContextLogger({ operation: "createPerson" });

  logger.info({ input }, "Creating new person");

  try {
    const result = await db.person.create({ data: input });
    logger.info({ personId: result.id }, "Person created successfully");
    return result;
  } catch (error) {
    logger.error({ error }, "Failed to create person");
    throw error;
  }
}
```

### In Database Operations

```typescript
import { logger } from "@vamsa/lib";

const timer = startTimer();
const result = await db.query(sql);
timer({ operation: "dbQuery", table: "users" });
```

### In Error Handlers

```typescript
import { logger, serializeError } from "@vamsa/lib";

export async function handleRequest(req: Request) {
  try {
    return await processRequest(req);
  } catch (error) {
    logger.error(
      {
        error: serializeError(error),
        requestUrl: req.url,
        method: req.method,
      },
      "Request failed"
    );
    return new Response("Error", { status: 500 });
  }
}
```

## Best Practices

1. **Use structured metadata**: Include relevant context as objects, not string concatenation
   ```typescript
   // Good
   logger.info({ userId, action }, "User action performed");

   // Bad
   logger.info(`User ${userId} performed ${action}`);
   ```

2. **Use appropriate log levels**: Don't use error/fatal for recoverable issues
   ```typescript
   // Good
   if (userNotFound) {
     logger.warn({ userId }, "User not found");
   }

   // Bad
   logger.error({ userId }, "User not found"); // Not an error
   ```

3. **Include correlation IDs**: Helps trace requests through the system
   ```typescript
   const requestLogger = createRequestLogger(requestId);
   // All logs from this logger will include requestId
   ```

4. **Don't log sensitive data**: Rely on the redaction list for common secrets
   ```typescript
   // Sensitive fields are redacted, but better to exclude them
   logger.info(
     { userId: user.id }, // Good
     "User action"
   );
   ```

5. **Use child loggers for context**: Reduces boilerplate and ensures consistency
   ```typescript
   const operationLogger = createContextLogger({
     operation: "importGEDCOM",
     familyId,
   });
   operationLogger.info("Starting import");
   ```

## Testing Logs

During development, you can filter logs by level:

```bash
# Show only warnings and errors
LOG_LEVEL=warn pnpm dev

# Show all logs
LOG_LEVEL=trace pnpm dev
```

In production, route JSON logs to aggregation services:
- Datadog
- CloudWatch
- ELK Stack
- Splunk
- New Relic

## Migration from console.log

Replaced console statements:

- `packages/api/prisma/seed.ts` - 24+ console.log statements
- `scripts/dev.ts` - 9 console.log statements

All replaced with structured logger calls with appropriate context.

## Files Updated

- `packages/lib/src/logger.ts` - New logger utility
- `packages/lib/src/index.ts` - Export logger
- `packages/lib/package.json` - Added pino dependencies
- `packages/api/prisma/seed.ts` - Converted to use logger
- `scripts/dev.ts` - Converted to use logger
