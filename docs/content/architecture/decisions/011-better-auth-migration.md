# ADR 011: Migration from Custom Auth to Better Auth

**Status:** Accepted
**Date:** 2025-01-22
**Deciders:** @rambhiad

## Context

Vamsa currently implements authentication manually using:
- **Arctic v3.7.0** for OAuth (Google, Microsoft, GitHub)
- **Custom session management** with bcrypt password hashing and SHA-256 token hashing
- **~780 lines of manual OAuth code** in `packages/lib/src/server/business/auth-oidc.ts`
- **Hardcoded providers** - no support for generic OIDC (Authentik, Keycloak, etc.)

### Problems with Current Approach

1. **Maintenance burden**: ~150 lines of boilerplate per OAuth provider
2. **No generic OIDC**: Self-hosters using Authentik/Keycloak cannot authenticate
3. **Flaky integrations**: Each provider has unique edge cases to handle
4. **Mobile future**: Need consistent auth for React Native clients

### Requirements

- Support self-hosted identity providers (Authentik, Keycloak, Authelia)
- Consistent auth workflow across web and future mobile clients
- Reduced maintenance burden
- TypeScript-first with good DX

## Decision

Migrate from custom auth implementation to **Better Auth**.

### Why Better Auth?

| Criteria | Better Auth | Arctic (Current) |
|----------|-------------|------------------|
| Generic OIDC | Yes (plugin) | Manual via OAuth2Client |
| Session management | Built-in | Manual |
| TanStack Start | Official integration | Manual |
| React Native/Expo | Official plugin | Manual |
| Maintenance | Framework handles it | We maintain it |
| Type safety | Full | Partial |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Hono Server                                                      │
│                                                                  │
│  ┌─ /api/auth/* ─────────────────────────────────────────────┐  │
│  │  auth.handler (Better Auth HTTP endpoints)                │  │
│  │  - Handles OAuth flows, sessions, callbacks               │  │
│  │  - Mobile clients POST here directly                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ /* → TanStack Start ─────────────────────────────────────┐  │
│  │                                                           │  │
│  │  Server Functions:                                        │  │
│  │  - Wrap auth.api.* calls for web client                   │  │
│  │  - tanstackStartCookies plugin handles Set-Cookie         │  │
│  │                                                           │  │
│  │  Route Protection:                                        │  │
│  │  - Loaders call auth.api.getSession({ headers })          │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Points

1. **Hono level**: Mount `auth.handler` at `/api/auth/*` for API-first access
2. **TanStack Start**: Wrap `auth.api.*` in server functions, use `tanstackStartCookies` plugin
3. **Mobile (future)**: Use `@better-auth/expo` plugin, same `/api/auth/*` endpoints

### User Model Strategy

Extend Better Auth's user model with Vamsa-specific fields:

```typescript
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "VIEWER" },
      personId: { type: "string", required: false },
      mustChangePassword: { type: "boolean", defaultValue: false },
      profileClaimStatus: { type: "string", defaultValue: "PENDING" },
      preferredLanguage: { type: "string", defaultValue: "en" },
      isActive: { type: "boolean", defaultValue: true },
      // Account lockout
      failedLoginAttempts: { type: "number", defaultValue: 0 },
      lockedUntil: { type: "date", required: false },
    },
  },
  plugins: [
    genericOAuth({
      // Self-hosters configure their OIDC provider
      config: [{
        providerId: "oidc",
        discoveryUrl: process.env.OIDC_DISCOVERY_URL,
        clientId: process.env.OIDC_CLIENT_ID,
        clientSecret: process.env.OIDC_CLIENT_SECRET,
      }],
    }),
    tanstackStartCookies(),
  ],
});
```

### Session Data

Session will include custom fields automatically:

```typescript
const session = await auth.api.getSession({ headers });
// session.user includes: id, email, name, role, personId, profileClaimStatus, etc.
```

## Consequences

### Positive

- **Generic OIDC support**: Self-hosters can use any OIDC provider
- **Less code to maintain**: ~780 lines of auth code removed
- **Mobile-ready**: Official Expo plugin for future React Native clients
- **Consistent patterns**: Same auth flow for web and mobile
- **Active development**: Better Auth is YC-backed, actively maintained

### Negative

- **Migration effort**: Need to migrate existing users and sessions
- **Schema changes**: Better Auth has opinions about table structure
- **New dependency**: Adding a framework vs. DIY
- **Learning curve**: Team needs to learn Better Auth patterns

### Neutral

- **Breaking change**: Acceptable since app is pre-alpha
- **Database migration**: Will need to transform existing User/Session tables

## Migration Plan

### Phase 1: Setup Better Auth
- Install `better-auth` and adapters
- Configure auth instance with Prisma adapter
- Add custom user fields
- Mount handler at Hono level

### Phase 2: Database Migration
- Create migration to add Better Auth required columns
- Transform existing sessions to Better Auth format
- Preserve existing user data (passwords, roles, personId links)

### Phase 3: Update Server Functions
- Replace `loginUser()` with `auth.api.signInEmail()`
- Replace `verifySessionToken()` with `auth.api.getSession()`
- Update route protection to use Better Auth
- Remove old auth code

### Phase 4: Update Frontend
- Install Better Auth client
- Update login/logout/register forms
- Update session hooks

### Phase 5: Add Generic OIDC
- Configure `genericOAuth` plugin
- Add environment variables for OIDC configuration
- Test with Authentik/Keycloak
- Remove hardcoded Google/Microsoft/GitHub providers (optional, can keep for convenience)

### Phase 6: Cleanup
- Remove Arctic dependency
- Remove old auth-oidc.ts code
- Update documentation

## References

- [Better Auth Documentation](https://www.better-auth.com/)
- [Better Auth TanStack Start Integration](https://www.better-auth.com/docs/integrations/tanstack)
- [Better Auth Hono Integration](https://www.better-auth.com/docs/integrations/hono)
- [Better Auth Expo Integration](https://www.better-auth.com/docs/integrations/expo)
- [Better Auth Generic OAuth Plugin](https://www.better-auth.com/docs/plugins/generic-oauth)
- [Arctic Documentation](https://arcticjs.dev/) (current implementation)
- Current implementation: `packages/lib/src/server/business/auth.ts`, `auth-oidc.ts`
