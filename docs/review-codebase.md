<!-- @format -->

# Vamsa Codebase Review

**Date**: January 28, 2026
**Scope**: Full Stack Monorepo (Apps + Packages)
**Focus**: Architecture, Code Quality, Security, Testing, and Maintainability.

## 1. Executive Summary

Vamsa is a **robust, well-structured monorepo** leveraging modern web standards. It successfully separates concerns between the Data Access Layer (`packages/api`), Business Logic (`packages/lib`), and Presentation Layer (`apps/web`).

**Assessment**:

- **Architecture**: 🟢 **Strong**. Clear boundaries (BFF pattern).
- **Code Quality**: 🟢 **High**. Strict TypeScript usage; minimal "any" types.
- **Security**: 🟢 **Good**. Audit logs, secure headers, and separated auth logic.
- **Testing**: 🟡 **Medium**. Good Unit/E2E setup, but coverage varies by module.
- **Complexity**: 🟡 **Medium**. Some duplication in type definitions (Zod vs Drizzle).

---

## 2. Detailed Findings

### 2.1 Architecture & Separation of Concerns

The project follows a "Monolith in a Monorepo" strategy, which is excellent for velocity.

- **`packages/api` (DAL)**: Pure Drizzle schemas and client. It correctly avoids business logic.
- **`packages/lib` (BL)**: Contains the core business rules (e.g., `server/business/persons.ts`). This is the **strongest architectural decision**, as it allows re-using logic across different apps (e.g., CLI, Workers, separate API) without duplicating code.
- **`apps/web/server` (BFF)**: The Hono instance acts as a Gateway/BFF. It handles Validation (Zod) and Response formatting but delegates actual work to `packages/lib`.

**Recommendation**:

- Continue enforcing the rule that `apps/web` should _never_ import `drizzleDb` directly for writes. All writes must go through `packages/lib` to ensure Audit Logs are created.

### 2.2 Database & Data Integrety

**Schema (`drizzle/schema`)**:

- **Normalization**: Good usage of separate tables for `Persons`, `Relationships`, `Places`.
- **Indexing**: `persons` table has comprehensive indices on `lastName`, `dateOfBirth`, `isLiving`.
- **Soft Deletes**: Not universally applied. Deletes currently seem to be hard-deletes (`deletePersonData` performs `db.delete`).
  - **Risk**: hard deleting a Person without cascading delete checks might orphan `Relationship` records or `Event` links.

### 2.3 API & Error Handling

**Pattern**: `Hono` + `OpenAPI` (`@hono/zod-openapi`).

- **Validation**: Strict Input/Output validation using shared Zod schemas. This prevents data leaks (e.g., accidentally exposing `hashedPassword`).
- **Error Handling**: The Service Layer (`packages/lib`) throws generic Errors (translated via i18n), which the API layer catches and converts to JSON 4xx/500 responses.
  - **Critique**: `catch (error)` often logs `error.message`. Ensure `withErr(error)` logs the _Stack Trace_ for 500 errors to debugging.

### 2.4 Code Quality & TypeScript

- **Type Safety**: Excellent. `InferSelectModel` and Zod types are used consistently.
- **"Any" Usage**: Rare. Found mostly in test setups or complex Drizzle relations where inference fails.
- **Linting**: ESLint config supports React Hooks and A11y rules.

### 2.5 Testing

**Stack**: Bun Test + Playwright + Stryker.

- **Unit Tests**: `packages/lib` has good coverage for business logic (e.g., `persons.test.ts`).
- **E2E Tests**: `apps/web/e2e` covers critical flows.
- **Mutation Testing**: Stryker is configured (`stryker.config.json`), indicating a commitment to _test quality_, not just _code coverage_.

### 2.6 Security

- **Authentication**: `Better-Auth` handles sessions.
- **Audit Logging**: `createPersonData` / `updatePersonData` automatically write to `auditLogs` table. This is critical for data integrity in a collaborative genealogy platform.
- **RBAC**: Basic Role-Based Access Control is visible in `updatePersonData` (checks `linkedUserId` vs `userId`), ensuring users can't edit others' profiles unless Admin.

---

## 3. High-Priority Recommendations

### 1. Hard Delete vs Soft Delete

**Finding**: `deletePersonData` performs a hard SQL `DELETE`.
**Risk**: Data loss.
**Action**: Implement a `deletedAt` column (Soft Delete) or ensure strictly enforceable Foreign Key cascades to avoid orphaned relationship records.

### 2. Audit Trail Reliability

**Finding**: Audit logging is a function call _after_ the DB write.
**Risk**: If the DB write succeeds but the Audit Log write fails (rare, but possible), the action is unlogged.
**Action**: Wrap the Operation + Audit Log in a **Database Transaction** (`db.transaction(...)`) to guarantee atomicity.

### 3. Rate Limiting

**Finding**: Rate Limiting middleware was mentioned in `server/index.ts` imports but not found in the `middleware` directory listing during review.
**Action**: Verify `hono-rate-limiter` is properly configured for the `/api` routes to prevent scraping/abuse.

### 4. Dependency Management

**Finding**: Multiple packages (UI, Web) declare `tailwindcss`.
**Action**: Ensure `tailwindcss` and `postcss` versions are synchronized across the workspace to avoid build conflicts.

---

## 4. Conclusion

The Vamsa codebase is mature and production-ready from a quality standpoint. The separation of **Business Logic** into `packages/lib` is a standout feature that ensures long-term maintainability. By addressing the "Hard Delete" and "Transaction" risks, the system will meet enterprise-grade data integrity standards.
