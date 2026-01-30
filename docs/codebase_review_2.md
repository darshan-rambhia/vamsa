<!-- @format -->

# Vamsa Codebase Review

**Date**: January 28, 2026
**Scope**: Full Stack Monorepo Review
**Objective**: Assess current state and identify path for React Native expansion.

## 1. Executive Summary

The Vamsa codebase is a **high-quality, modern monorepo** built with excellent tooling choices (Bun, Hono, TanStack Start, Drizzle). The architecture currently follows a "Monolith in a Monorepo" pattern where the backend logic is tightly coupled to the web application deployment, although code logic is well-separated into packages.

**Readiness for React Native:** 🟡 **Medium**

- ✅ **API**: Cleanly separated via Hono router and OpenAPI specs.
- ✅ **Data Layer**: Shared Zod schemas in `@vamsa/schemas` allow type reuse.
- ⚠️ **UI**: Component library (`@vamsa/ui`) is DOM-heavy (Radix UI) and cannot be directly shared with React Native.
- ⚠️ **Client**: No shared API client type definition (Hono RPC) or generated client SDK currently exists.

---

## 2. Assessment Scorecard

| Dimension         | Rating  | Key Strength                                            | Primary Improvement Area                                                |
| :---------------- | :------ | :------------------------------------------------------ | :---------------------------------------------------------------------- |
| **Architecture**  | 🟢 Good | Clear Monorepo separation (apps vs packages).           | Move server code out of `apps/web` to `apps/api` or `packages/backend`. |
| **Code Quality**  | 🟢 Good | Strong TypeScript usage, formatting, and linting.       |                                                                         |
| **UI/UX**         | 🟢 Good | Modern stack (Tailwind v4, Radix).                      | UI currently tied to DOM; needs abstraction for Mobile.                 |
| **Testing**       | 🟢 Good | Unit, E2E (Playwright), and Mutation testing (Stryker). |                                                                         |
| **DevEx**         | 🟢 Good | Bun is fast. Docker setup is robust.                    |                                                                         |
| **Observability** | 🟢 Good | OpenTelemetry, Prometheus, Grafana built-in.            |                                                                         |
| **Security**      | 🟢 Good | Better-Auth, Security Headers (CSP), Docker isolation.  |                                                                         |

---

## 3. Deep Dive Analysis

### 3.1 Architecture & Directory Structure

**Structure**:

- `apps/web`: Frontend + BFF (Backend for Frontend).
- `packages/api`: Data Access Layer (Drizzle, Email).
- `packages/lib`: Shared utilities.
- `packages/ui`: Component library.
- `packages/schemas`: Shared Zod definitions.

**Review**:
The separation of the **Data Access Layer** (`packages/api`) from the **Server Implementation** (`apps/web/server`) is a smart move. It allows any future app (like a CLI or separate Worker) to access the DB safely.
**Critique**: Putting the MAIN server inside `apps/web/server` treats the API as just a feature of the website. For a multi-client future (Web + Mobile), the API should ideally be a first-class citizen, perhaps in `apps/server` or at least explicitly designed to be client-agnostic.

### 3.2 UI/UX and Component Library

**Stack**: React 19, Tailwind v4, Radix UI.
**Review**:
The setup is cutting-edge. Using Ladle for stories is great for speed.
**Mobile Challenge**: Radix UI relies on DOM nodes (`div`, `span`). These will break in React Native.
**Solution Path**:

1. **Parallel Components**: Build `apps/mobile/src/components` using React Native primitives.
2. **Universal Design System**: Use a library like Tamagui or carefully abstract logic from view. Given the current investment in Radix+Tailwind, a **Parallel** approach sharing Design Tokens (colors, spacing) from `packages/ui` is likely the most pragmatic path.

### 3.3 Backend & API

**Stack**: Hono, Better-Auth, Drizzle, OpenAPI.
**Review**:
Hono is an excellent choice for a lightweight, edge-compatible server.
**OpenAPI**: Usage of `@hono/zod-openapi` is fantastic. It documents the API automatically.
**Hono RPC**: Currently, the app does **not** seem to export the `AppType` for Hono RPC. Enabling this would allow the React Native client to have full type-safety without code generation, though generic OpenAPI generation is also a valid strategy.

### 3.4 Data & State Management

**Stack**: TanStack Query, TanStack Start, React Context.
**React Native Strategy**: TanStack Query is **Universal**. Code in `apps/web/src/lib` using `useQuery` can often be moved to `packages/client-hooks` and reused 100% in React Native.

### 3.5 DevOps & CI/CD

**Review**:

- **Docker**: Comprehensive `docker-compose` with databases and observance.
- **CI**: Github Actions for E2E and deployment.
- **Observability**: Ahead of the curve for a personal project. OTel + Grafana is "Enterprise Grade" setup.

---

## 4. Roadmap to React Native

To support the React Native client, we should execute the following phases:

### Phase 1: API Decoupling (Low Effort, High Value)

- [ ] Move `apps/web/server` logic to a shared location or ensure it acts as a standalone API.
- [ ] Ensure `packages/schemas` is used for ALL request/response validation.
- [ ] Export `AppType` from the Hono server or Generate a TypeScript Client from OpenAPI to be consumed by the mobile app.

### Phase 2: Shared Client Logic (Medium Effort)

- [ ] Create `packages/client`:
  - Move `auth-client.ts` here.
  - Create a shared `apiClient` instance.
  - Move generic TanStack Query hooks (e.g. `useUser`, `useFamilyTree`) here.
- [ ] Ensure this package has no DOM dependencies.

### Phase 3: Mobile App Scaffold (High Effort)

- [ ] Initialize `apps/mobile` (Expo is recommended).
- [ ] Setup `metro.config.js` to handle the monorepo (Bun workspaces).
- [ ] Install Native-compatible UI library (e.g., React Native Paper, GlueStack, or just primitives).

### Phase 4: UI Migration

- [ ] Audit `packages/ui` for any "pure logic" hooks that can be shared.
- [ ] Re-implement components in `apps/mobile` matching the `packages/ui` design tokens.

---

## 5. Conclusion

Vamsa is a very healthy codebase. It avoids "Spaghetti code" through strict package boundaries. The biggest hurdle for React Native will not be logic (which is well separated via `packages/api` and `schemas`) but UI components (Radix is Web-only).

**Recommended Next Step**: Refactor the API client consumption in `web` to use a generated client or Hono RPC, paving the way for the Mobile app to simply "plug in" to the same client.
