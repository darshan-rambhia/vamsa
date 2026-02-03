# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities through GitHub's [Private Vulnerability Reporting](https://github.com/darshan-rambhia/vamsa/security/advisories/new).

This ensures the issue remains private until a fix is available.

## What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

## Response Timeline

As this is a personal project maintained in spare time:

- **Acknowledgment**: Within 7 days
- **Initial assessment**: Within 14 days
- **Fix timeline**: Depends on severity

## Scope

This policy applies to the latest version of Vamsa on the `main` branch.

## Supported Versions

| Version  | Supported          |
| -------- | ------------------ |
| Latest   | :white_check_mark: |
| < Latest | :x:                |

## Security Measures

### Authentication & Authorization

- Secure session management with encrypted cookies
- Passwords hashed using industry-standard algorithms
- Session tokens rotated on authentication state changes

### Data Protection

- All data in transit uses TLS 1.2+
- Database connections use secure credentials
- Soft deletes preserve data integrity with audit logging

### Input Validation

- All user inputs validated with Zod schemas
- SQL injection prevention through Drizzle ORM parameterized queries
- XSS prevention through React's built-in escaping

### Rate Limiting

- API endpoints rate-limited to prevent abuse
- Authentication endpoints have stricter limits

## Security Best Practices for Contributors

1. **No hardcoded secrets**: Never commit API keys, passwords, or tokens
2. **Input validation**: Always validate with Zod schemas
3. **Parameterized queries**: Use Drizzle ORM, never raw SQL
4. **Dependency updates**: Keep dependencies current
5. **Environment variables**: Use `.env.local` for secrets (never commit)
