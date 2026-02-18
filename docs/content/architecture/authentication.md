# Authentication Setup Guide

Vamsa uses [Better Auth](https://better-auth.com) for authentication, providing flexible options from simple email/password to enterprise SSO.

## Overview

### Supported Authentication Methods

| Method | Use Case | Configuration |
|--------|----------|---------------|
| **Email/Password** | Default, always available | Built-in |
| **Google OAuth** | Consumer accounts | `GOOGLE_CLIENT_ID` |
| **Microsoft OAuth** | Enterprise/M365 | `MICROSOFT_CLIENT_ID` |
| **GitHub OAuth** | Developer teams | `GITHUB_CLIENT_ID` |
| **Generic OIDC** | Self-hosted IdPs (Authentik, Authelia, Keycloak) | `OIDC_DISCOVERY_URL` |

### Features

- **Account Linking**: Users can link multiple auth methods to one account (e.g., register with email, later add Google)
- **30-day Sessions**: Sessions last 30 days with automatic daily refresh
- **Profile Claiming**: Family members can claim their profile when registering

---

## Initial Setup

### 1. Generate Secrets

```bash
# Generate Better Auth secret (required)
openssl rand -base64 32
```

### 2. Configure Environment

```bash
# Required
BETTER_AUTH_SECRET="your-generated-secret-here"
BETTER_AUTH_URL="https://your-domain.com"  # or http://localhost:3000 for dev

# App URL for OAuth callbacks
APP_URL="https://your-domain.com"
```

### 3. Initial Admin Account

On first startup, Vamsa needs an admin account. Configure via environment:

```bash
# Required for first run
ADMIN_EMAIL="admin@yourdomain.com"

# Option 1: Set a password
ADMIN_PASSWORD="your-secure-password"

# Option 2: Auto-generate (password printed to logs)
# Leave ADMIN_PASSWORD empty or unset
```

> **Security Note**: Change the admin password after first login, especially if auto-generated.

---

## OAuth Provider Setup

### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client IDs**
5. Configure:
   - **Application type**: Web application
   - **Name**: Vamsa
   - **Authorized redirect URIs**:
     - `https://your-domain.com/api/auth/callback/google`

6. Copy the Client ID and Client Secret

```bash
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### Microsoft / Azure AD

1. Go to [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click **New registration**
3. Configure:
   - **Name**: Vamsa
   - **Supported account types**: Choose based on your needs
     - Single tenant: Your organization only
     - Multi-tenant: Any Azure AD directory
     - Personal accounts: Include Microsoft accounts
   - **Redirect URI**:
     - Platform: Web
     - URL: `https://your-domain.com/api/auth/callback/microsoft`

4. After creation:
   - Copy **Application (client) ID**
   - Go to **Certificates & secrets > New client secret**
   - Copy the secret value immediately (shown only once)

```bash
MICROSOFT_CLIENT_ID="your-application-id"
MICROSOFT_CLIENT_SECRET="your-client-secret"
MICROSOFT_TENANT_ID="common"  # or your specific tenant ID
```

**Tenant ID Options**:
- `common` - Any Microsoft account (personal + work/school)
- `organizations` - Any Azure AD account (work/school only)
- `consumers` - Personal Microsoft accounts only
- `{tenant-id}` - Specific organization only

### GitHub

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Configure:
   - **Application name**: Vamsa
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-domain.com/api/auth/callback/github`

4. After creation, click **Generate a new client secret**

```bash
GITHUB_CLIENT_ID="your-client-id"
GITHUB_CLIENT_SECRET="your-client-secret"
```

---

## Self-Hosted OIDC Providers

For self-hosted identity providers, Vamsa supports any OpenID Connect compliant provider.

### Authentik

[Authentik](https://goauthentik.io/) is a modern, open-source identity provider.

#### 1. Create Application in Authentik

1. Navigate to **Applications > Applications**
2. Click **Create with Provider**
3. Select **OAuth2/OpenID Connect**
4. Configure the provider:
   - **Name**: Vamsa
   - **Authorization flow**: default-provider-authorization-explicit-consent
   - **Client type**: Confidential
   - **Client ID**: (auto-generated or custom)
   - **Client Secret**: (auto-generated or custom)
   - **Redirect URIs**:
     ```
     https://your-domain.com/api/auth/callback/oidc
     ```
   - **Scopes**: openid, email, profile

5. Note the application slug (e.g., `vamsa`)

#### 2. Configure Vamsa

```bash
# Discovery URL format: https://authentik.your-domain.com/application/o/{slug}/.well-known/openid-configuration
OIDC_DISCOVERY_URL="https://authentik.your-domain.com/application/o/vamsa/.well-known/openid-configuration"
OIDC_CLIENT_ID="your-client-id"
OIDC_CLIENT_SECRET="your-client-secret"
```

#### 3. Optional: Auto-Launch

Set the launch URL in Authentik to enable automatic login:
```
https://your-domain.com/login?autoLaunch=oidc
```

### Authelia

[Authelia](https://www.authelia.com/) is a lightweight authentication and authorization server.

#### 1. Add Client to Authelia Configuration

Add to your `configuration.yml`:

```yaml
identity_providers:
  oidc:
    clients:
      - client_id: vamsa
        client_name: Vamsa
        client_secret: '$pbkdf2-sha512$...'  # Use authelia hash-password
        public: false
        authorization_policy: two_factor  # or one_factor
        redirect_uris:
          - https://your-domain.com/api/auth/callback/oidc
        scopes:
          - openid
          - email
          - profile
        userinfo_signed_response_alg: none
        token_endpoint_auth_method: client_secret_basic
```

Generate the hashed secret:
```bash
authelia crypto hash generate pbkdf2 --password 'your-client-secret'
```

#### 2. Configure Vamsa

```bash
OIDC_DISCOVERY_URL="https://authelia.your-domain.com/.well-known/openid-configuration"
OIDC_CLIENT_ID="vamsa"
OIDC_CLIENT_SECRET="your-client-secret"  # Plain text (not hashed)
```

### Keycloak

[Keycloak](https://www.keycloak.org/) is a mature, feature-rich identity provider.

#### 1. Create Client in Keycloak

1. Select your realm (or create one)
2. Go to **Clients > Create client**
3. Configure:
   - **Client type**: OpenID Connect
   - **Client ID**: vamsa
   - **Client authentication**: On
   - **Authorization**: Off (unless needed)

4. In **Settings**:
   - **Valid redirect URIs**: `https://your-domain.com/api/auth/callback/oidc`
   - **Web origins**: `https://your-domain.com`

5. In **Credentials**, copy the client secret

#### 2. Configure Vamsa

```bash
# Replace {realm} with your realm name
OIDC_DISCOVERY_URL="https://keycloak.your-domain.com/realms/{realm}/.well-known/openid-configuration"
OIDC_CLIENT_ID="vamsa"
OIDC_CLIENT_SECRET="your-client-secret"
```

### Generic OIDC Provider

For any OIDC-compliant provider:

#### Requirements

- OpenID Connect Discovery endpoint (`.well-known/openid-configuration`)
- Support for `authorization_code` grant type
- Confidential client support

#### Configuration Steps

1. Register Vamsa as an OIDC client in your provider
2. Configure redirect URI: `https://your-domain.com/api/auth/callback/oidc`
3. Request scopes: `openid email profile`
4. Note the discovery URL, client ID, and client secret

```bash
OIDC_DISCOVERY_URL="https://your-idp.com/.well-known/openid-configuration"
OIDC_CLIENT_ID="your-client-id"
OIDC_CLIENT_SECRET="your-client-secret"
```

---

## Account Linking

When enabled (default), users can sign in with multiple methods:

1. User registers with `user@example.com` + password
2. Later, user signs in with Google using the same email
3. Both auth methods are linked to the same account

**How it works**:
- Only configured providers are trusted for automatic linking
- Email must match exactly
- User can then sign in with either method

---

## Security Considerations

### Production Checklist

- [ ] Use HTTPS for all URLs
- [ ] Generate unique `BETTER_AUTH_SECRET` (32+ characters)
- [ ] Change default admin password after first login
- [ ] Use specific tenant IDs for Microsoft (not `common`) in enterprise
- [ ] Enable two-factor authentication in your OIDC provider when possible
- [ ] Regularly rotate client secrets

### Cookie Security

Better Auth automatically configures secure cookies:
- `HttpOnly`: Prevents JavaScript access
- `Secure`: HTTPS only in production
- `SameSite=Lax`: CSRF protection

### Session Management

- Sessions expire after 30 days of inactivity
- Sessions are refreshed daily on active use
- Users can sign out from all devices (invalidates all sessions)

---

## Troubleshooting

### OAuth Callback Errors

**"Redirect URI mismatch"**
- Ensure the redirect URI in your provider exactly matches: `https://your-domain.com/api/auth/callback/{provider}`
- Check for trailing slashes
- Verify protocol (http vs https)

**"Invalid client"**
- Verify client ID and secret are correct
- Check if the client is enabled in your provider
- Ensure client type is "Confidential" (not public)

### OIDC Discovery Failures

**"Failed to fetch discovery document"**
- Verify the discovery URL is accessible: `curl {OIDC_DISCOVERY_URL}`
- Check for firewall/network issues
- Ensure the IdP is running and healthy

**"Invalid issuer"**
- The issuer in the discovery document must match the base URL
- Some providers require specific configuration for issuer URL

### Account Linking Issues

**"Email already exists"**
- Account linking requires the same email address
- Check if emails are normalized (lowercase) in both systems
- Verify the provider is in the trusted providers list

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `BETTER_AUTH_SECRET` | Yes | 32+ character secret for session encryption |
| `BETTER_AUTH_URL` | Yes | Base URL of your Vamsa instance |
| `APP_URL` | Yes | Public URL for OAuth callbacks |
| `ADMIN_EMAIL` | First run | Email for initial admin account |
| `ADMIN_PASSWORD` | No | Password for admin (auto-generated if empty) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `MICROSOFT_CLIENT_ID` | No | Microsoft OAuth client ID |
| `MICROSOFT_CLIENT_SECRET` | No | Microsoft OAuth client secret |
| `MICROSOFT_TENANT_ID` | No | Azure AD tenant (default: `common`) |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth client secret |
| `OIDC_DISCOVERY_URL` | No | OIDC provider discovery endpoint |
| `OIDC_CLIENT_ID` | No | OIDC client ID |
| `OIDC_CLIENT_SECRET` | No | OIDC client secret |
