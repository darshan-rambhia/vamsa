# Vamsa REST API Documentation

Welcome to the Vamsa REST API. This document provides a comprehensive guide to integrating with the Vamsa family genealogy application.

## Overview

The Vamsa API is a RESTful HTTP API that allows you to:

- Manage person records in your family tree
- Create and update relationships between people
- Handle user authentication and sessions
- Support mobile and web clients

### Base URL

- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://api.vamsa.app/api/v1`

### API Versioning

All endpoints are versioned under `/api/v1`. Future versions will be available at `/api/v2`, etc.

### Interactive Documentation

Visit `/api/v1/docs` for interactive Swagger UI documentation where you can:

- Explore all endpoints
- View detailed parameter and response information
- Try API endpoints directly in your browser

### OpenAPI Specification

The OpenAPI 3.0 specification is available at `/api/v1/openapi.json` for integration with API client generators.

## Authentication

All API endpoints (except `/auth/login` and `/auth/register`) require authentication via session cookie.

### Session Management

Vamsa uses HTTP-only session cookies for authentication:

1. **Login**: Call `POST /auth/login` with email and password
2. **Session Cookie**: The server responds with `Set-Cookie` header
3. **Automatic Handling**: Browsers automatically include the cookie in subsequent requests
4. **Mobile Apps**: Mobile apps should store and include the session token in requests

### Authentication Errors

- `401 Unauthorized`: Invalid, expired, or missing session
- `403 Forbidden`: Insufficient permissions for the requested action

## API Endpoints

### Authentication Endpoints

#### Register a New Account

```
POST /auth/register
```

Create a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "SecurePassword123",
  "confirmPassword": "SecurePassword123"
}
```

**Response (201 Created):**

```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "VIEWER",
    "createdAt": "2026-01-13T10:00:00Z"
  },
  "token": "session_token_here"
}
```

**Errors:**

- `400 Bad Request`: Validation error (invalid email, password too short, etc.)
- `409 Conflict`: Email already registered

#### Login

```
POST /auth/login
```

Authenticate with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200 OK):**

```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "MEMBER",
    "createdAt": "2026-01-10T08:30:00Z"
  },
  "token": "session_token_here"
}
```

**Errors:**

- `401 Unauthorized`: Invalid email or password
- `400 Bad Request`: Account locked after too many failed attempts

#### Logout

```
POST /auth/logout
```

Logout the current user and invalidate the session.

**Response (200 OK):**

```json
{
  "success": true
}
```

**Required Headers:**

- Session cookie (automatically handled by browsers)

### Person Endpoints

#### List Persons

```
GET /persons
```

Retrieve a paginated list of all persons in the family tree.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (starts from 1) |
| `limit` | integer | 50 | Items per page (1-100) |
| `search` | string | - | Search by first or last name |
| `sortBy` | string | "lastName" | Field to sort by: `lastName`, `firstName`, `dateOfBirth`, `createdAt` |
| `sortOrder` | string | "asc" | Sort order: `asc` or `desc` |
| `isLiving` | boolean | - | Filter by living status |

**Example Request:**

```bash
GET /persons?page=1&limit=50&search=John&sortBy=lastName&sortOrder=asc
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "id": "person_123",
      "firstName": "John",
      "lastName": "Doe",
      "maidenName": null,
      "dateOfBirth": "1990-05-15",
      "dateOfPassing": null,
      "birthPlace": "New York, USA",
      "nativePlace": "New York, USA",
      "gender": "MALE",
      "photoUrl": "https://...",
      "bio": "Family historian",
      "email": "john@example.com",
      "phone": "+1-555-0123",
      "profession": "Engineer",
      "employer": "Tech Corp",
      "isLiving": true,
      "createdAt": "2026-01-10T08:30:00Z",
      "updatedAt": "2026-01-12T14:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 127,
    "pages": 3
  }
}
```

**Errors:**

- `401 Unauthorized`: Authentication required
- `400 Bad Request`: Invalid pagination parameters

#### Create Person

```
POST /persons
```

Add a new person to the family tree.

**Request Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "maidenName": "Smith",
  "dateOfBirth": "1985-03-20",
  "dateOfPassing": null,
  "birthPlace": "Los Angeles, USA",
  "nativePlace": "Los Angeles, USA",
  "gender": "FEMALE",
  "bio": "Family genealogist",
  "email": "jane@example.com",
  "phone": "+1-555-0456",
  "profession": "Researcher",
  "employer": "Historical Society",
  "isLiving": true
}
```

**Response (201 Created):**

```json
{
  "id": "person_456",
  "firstName": "Jane",
  "lastName": "Doe",
  "maidenName": "Smith",
  "dateOfBirth": "1985-03-20",
  "dateOfPassing": null,
  "birthPlace": "Los Angeles, USA",
  "nativePlace": "Los Angeles, USA",
  "gender": "FEMALE",
  "photoUrl": null,
  "bio": "Family genealogist",
  "email": "jane@example.com",
  "phone": "+1-555-0456",
  "profession": "Researcher",
  "employer": "Historical Society",
  "isLiving": true,
  "createdAt": "2026-01-13T10:00:00Z",
  "updatedAt": "2026-01-13T10:00:00Z"
}
```

**Errors:**

- `401 Unauthorized`: Authentication required
- `400 Bad Request`: Validation error

#### Get Person

```
GET /persons/{id}
```

Retrieve a specific person by ID.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Person ID |

**Response (200 OK):**

```json
{
  "id": "person_123",
  "firstName": "John",
  "lastName": "Doe",
  "maidenName": null,
  "dateOfBirth": "1990-05-15",
  "dateOfPassing": null,
  "birthPlace": "New York, USA",
  "nativePlace": "New York, USA",
  "gender": "MALE",
  "photoUrl": "https://...",
  "bio": "Family historian",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "profession": "Engineer",
  "employer": "Tech Corp",
  "isLiving": true,
  "createdAt": "2026-01-10T08:30:00Z",
  "updatedAt": "2026-01-12T14:15:00Z"
}
```

**Errors:**

- `401 Unauthorized`: Authentication required
- `404 Not Found`: Person not found

#### Update Person

```
PUT /persons/{id}
```

Update information about a person. All fields are optional.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Person ID |

**Request Body:**

```json
{
  "firstName": "Jonathan",
  "profession": "Senior Engineer",
  "bio": "Updated bio text"
}
```

**Response (200 OK):**

```json
{
  "id": "person_123",
  "firstName": "Jonathan",
  "lastName": "Doe",
  "maidenName": null,
  "dateOfBirth": "1990-05-15",
  "dateOfPassing": null,
  "birthPlace": "New York, USA",
  "nativePlace": "New York, USA",
  "gender": "MALE",
  "photoUrl": "https://...",
  "bio": "Updated bio text",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "profession": "Senior Engineer",
  "employer": "Tech Corp",
  "isLiving": true,
  "createdAt": "2026-01-10T08:30:00Z",
  "updatedAt": "2026-01-13T10:30:00Z"
}
```

**Errors:**

- `401 Unauthorized`: Authentication required
- `400 Bad Request`: Validation error
- `404 Not Found`: Person not found

#### Delete Person

```
DELETE /persons/{id}
```

Remove a person from the family tree.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Person ID |

**Response (204 No Content):**
No response body on success.

**Errors:**

- `401 Unauthorized`: Authentication required
- `404 Not Found`: Person not found

### Relationship Endpoints

#### List Relationships

```
GET /relationships
```

Retrieve relationships for a specific person.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `personId` | string | Required: Person ID to get relationships for |
| `type` | string | Optional: Filter by type (PARENT, CHILD, SPOUSE, SIBLING) |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 50) |

**Example Request:**

```bash
GET /relationships?personId=person_123&type=SPOUSE
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "id": "rel_789",
      "personId": "person_123",
      "relatedPersonId": "person_456",
      "type": "SPOUSE",
      "isActive": true,
      "marriageDate": "2015-06-20",
      "divorceDate": null,
      "relatedPerson": {
        "id": "person_456",
        "firstName": "Jane",
        "lastName": "Doe"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

**Errors:**

- `401 Unauthorized`: Authentication required
- `400 Bad Request`: Invalid pagination

#### Create Relationship

```
POST /relationships
```

Create a new relationship between two people.

**Request Body:**

```json
{
  "personId": "person_123",
  "relatedPersonId": "person_456",
  "type": "SPOUSE",
  "marriageDate": "2015-06-20",
  "divorceDate": null
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `personId` | string | Yes | ID of the first person |
| `relatedPersonId` | string | Yes | ID of the related person |
| `type` | string | Yes | Relationship type: PARENT, CHILD, SPOUSE, SIBLING |
| `marriageDate` | date | No | Date of marriage (for SPOUSE) |
| `divorceDate` | date | No | Date of divorce (for SPOUSE) |

**Response (201 Created):**

```json
{
  "id": "rel_789"
}
```

**Errors:**

- `401 Unauthorized`: Authentication required
- `400 Bad Request`: Invalid input or relationship already exists
- `400 Bad Request`: Cannot create relationship with self

#### Update Relationship

```
PUT /relationships/{id}
```

Update a relationship's dates.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Relationship ID |

**Request Body:**

```json
{
  "marriageDate": "2015-06-20",
  "divorceDate": "2020-12-15"
}
```

**Response (200 OK):**

```json
{
  "id": "rel_789",
  "personId": "person_123",
  "relatedPersonId": "person_456",
  "type": "SPOUSE",
  "isActive": false,
  "marriageDate": "2015-06-20",
  "divorceDate": "2020-12-15",
  "relatedPerson": {
    "id": "person_456",
    "firstName": "Jane",
    "lastName": "Doe"
  }
}
```

**Errors:**

- `401 Unauthorized`: Authentication required
- `404 Not Found`: Relationship not found

#### Delete Relationship

```
DELETE /relationships/{id}
```

Remove a relationship between two people.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Relationship ID |

**Response (204 No Content):**
No response body on success.

**Errors:**

- `401 Unauthorized`: Authentication required
- `404 Not Found`: Relationship not found

## Error Handling

All error responses follow a consistent format:

```json
{
  "error": "Error type or message",
  "details": "Optional detailed information"
}
```

### Common HTTP Status Codes

| Status | Meaning                                              |
| ------ | ---------------------------------------------------- |
| 200    | OK - Request succeeded                               |
| 201    | Created - Resource created successfully              |
| 204    | No Content - Request succeeded with no response body |
| 400    | Bad Request - Validation or client error             |
| 401    | Unauthorized - Authentication required               |
| 403    | Forbidden - Insufficient permissions                 |
| 404    | Not Found - Resource not found                       |
| 409    | Conflict - Resource already exists                   |
| 429    | Too Many Requests - Rate limited                     |
| 500    | Internal Server Error - Server error                 |

## Rate Limiting

The API implements comprehensive rate limiting to protect against abuse and ensure fair usage.

### Rate Limited Endpoints

| Endpoint | Default Limit | Default Window | Notes |
|----------|---------------|----------------|-------|
| `POST /api/auth/sign-in/*` | 5 attempts | 60 seconds | Per IP address |
| `POST /api/auth/sign-up/*` | 3 attempts | 1 hour | Per IP address |
| `POST /api/auth/forget-password/*` | 3 attempts | 1 hour | Per IP address |
| `GET /api/v1/*` (search) | 30 requests | 60 seconds | Per user/IP |
| `GET /api/v1/*` (general) | 100 requests | 60 seconds | Per user/IP |
| All `/api/v1/*` routes | 100 requests | 60 seconds | Per authenticated user or IP |

### Per-User vs. Per-IP Rate Limiting

The `/api/v1/*` routes use smart rate limiting:

- **Authenticated requests**: Rate limited by user ID, allowing authenticated users higher quotas
- **Unauthenticated requests**: Rate limited by IP address

This provides better protection against distributed attacks while allowing legitimate users more generous limits.

### Rate Limit Headers

All rate-limited responses include these headers:

- `X-RateLimit-Limit`: Total requests allowed in the window
- `X-RateLimit-Remaining`: Remaining requests in the current window
- `X-RateLimit-Reset`: Unix timestamp when the limit resets

### Rate Limit Exceeded Response

When a client exceeds the rate limit, the API returns:

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1673625600
Retry-After: 45
```

```json
{
  "error": "Too Many Requests",
  "message": "Too many requests. Please try again in 45 seconds.",
  "retryAfter": 45
}
```

### Customizing Rate Limits

All rate limits are configurable via environment variables:

**Pattern**: `RATE_LIMIT_{ACTION}_{MAX|WINDOW}`

Example configuration in `.env`:

```bash
# Login: 10 attempts per 2 minutes
RATE_LIMIT_LOGIN_MAX=10
RATE_LIMIT_LOGIN_WINDOW=120

# API: 200 requests per minute for authenticated users
RATE_LIMIT_API_MAX=200
RATE_LIMIT_API_WINDOW=60
```

Available rate limit variables:

- `RATE_LIMIT_LOGIN_MAX` / `RATE_LIMIT_LOGIN_WINDOW`
- `RATE_LIMIT_REGISTER_MAX` / `RATE_LIMIT_REGISTER_WINDOW`
- `RATE_LIMIT_CLAIM_PROFILE_MAX` / `RATE_LIMIT_CLAIM_PROFILE_WINDOW`
- `RATE_LIMIT_PASSWORD_RESET_MAX` / `RATE_LIMIT_PASSWORD_RESET_WINDOW`
- `RATE_LIMIT_SEARCH_MAX` / `RATE_LIMIT_SEARCH_WINDOW`
- `RATE_LIMIT_API_MAX` / `RATE_LIMIT_API_WINDOW`

See `.env.example` for default values and detailed documentation.

## Best Practices

### 1. Use Pagination

Always use pagination for list endpoints:

```bash
GET /persons?page=1&limit=50
```

Don't request all items at once, as this will be slow and may hit timeouts.

### 2. Handle Errors Gracefully

Check response status codes and error messages:

```javascript
const response = await fetch("/api/v1/persons", {
  /* ... */
});
if (!response.ok) {
  const error = await response.json();
  console.error("API Error:", error.error);
}
```

### 3. Cache Responses

Use appropriate cache headers for GET requests to improve performance.

### 4. Use Filters

Instead of fetching all records and filtering client-side, use query parameters:

```bash
GET /persons?search=John&isLiving=true
```

### 5. Validate Input

Validate user input before sending to the API. The server will validate again for security.

### 6. Handle Timeouts

Implement reasonable timeouts for API requests (15-30 seconds):

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 15000);
fetch("/api/v1/persons", { signal: controller.signal });
```

## Webhooks (Future)

Webhooks for real-time notifications are planned for future API versions.

## SDK Libraries

Official SDKs for popular languages coming soon:

- JavaScript/TypeScript
- Python
- iOS (Swift)
- Android (Kotlin)

## Support

For API support and questions:

- GitHub Issues: https://github.com/your-repo/vamsa/issues
- Documentation: https://vamsa.app/docs
- Email: support@vamsa.app

## Changelog

### Version 1.0.0 (Current)

- Initial REST API implementation
- Person CRUD endpoints
- Relationship management endpoints
- Authentication endpoints
- Swagger/OpenAPI documentation

## Troubleshooting

### Common Errors

#### 401 Unauthorized on all requests

**Cause**: Session cookie is missing or expired.

**Fix**: Re-authenticate via `POST /auth/login`. For mobile clients, ensure the session token is stored and included in subsequent requests. Sessions expire after 30 days of inactivity.

#### 403 Forbidden after successful login

**Cause**: The authenticated user does not have the required role for the endpoint. Vamsa uses role-based access control (VIEWER, MEMBER, ADMIN).

**Fix**: Contact an administrator to upgrade your role. New accounts default to VIEWER.

#### 429 Too Many Requests

**Cause**: Rate limit exceeded on authentication endpoints.

**Fix**: Wait for the period indicated in the `X-RateLimit-Reset` header. Login allows 5 attempts per minute; registration allows 3 per hour. If you are behind a shared IP (VPN, office NAT), contact your administrator to adjust rate limits or allowlist your IP.

#### 400 Bad Request with validation errors

**Cause**: Request body or query parameters failed Zod schema validation.

**Fix**: Check the `details` field in the error response for specific field-level errors. Common issues:
- Missing required fields (`firstName`, `lastName` for persons)
- Invalid date formats (use `YYYY-MM-DD`)
- `limit` outside allowed range (1-100)
- Invalid `sortBy` or `sortOrder` values

#### 500 Internal Server Error

**Cause**: Unhandled server error. The response includes a `requestId` field in non-production environments.

**Fix**: If you have server access, search logs for the `requestId`:

```bash
# systemd
journalctl -u vamsa | grep "request-id-here"

# Docker
docker logs vamsa-app | grep "request-id-here"
```

Common causes:
- Database connection pool exhausted (check `GET /health` for pool stats)
- Migration not applied after an upgrade (`bun run db:migrate`)
- Missing environment variable (check server startup logs)

#### CORS errors in browser console

**Cause**: The browser's origin does not match the `APP_URL` environment variable.

**Fix**: Ensure `APP_URL` in your `.env` exactly matches the origin you are accessing the app from (including protocol and port). In production, CORS uses exact origin matching -- prefix matches like `https://vamsa.app.evil.com` are rejected.

#### Empty response from `/api/v1/docs`

**Cause**: API documentation is disabled in production by default.

**Fix**: Set `ENABLE_API_DOCS=true` in your `.env` file and restart the server. In development, docs are always available.

---

Last Updated: February 16, 2026
