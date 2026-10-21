/**
 * Typed business errors. Transport layers (REST routers) map these to HTTP
 * statuses by class instead of guessing from message text.
 *
 * They extend Error and keep their message, so existing callers that only
 * read `error.message` (server functions, UI) are unaffected.
 */

export class NotFoundError extends Error {
  override readonly name = "NotFoundError";
}

export class ConflictError extends Error {
  override readonly name = "ConflictError";
}

export class ValidationError extends Error {
  override readonly name = "ValidationError";
}
