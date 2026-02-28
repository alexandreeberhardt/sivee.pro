# API Reference

Base URL: `https://sivee.pro` (production) or `http://localhost:8000` (development)

Interactive documentation (Swagger UI) is available at `/docs`.

## Authentication

The API uses **HTTP-only cookies** for session management, supplemented by a CSRF token for mutation endpoints.

After login, two cookies are set automatically:
- `access_token` — HTTP-only JWT (not accessible from JavaScript)
- `csrf_token` — readable by the frontend, must be sent as `X-CSRF-Token` header on state-changing requests

JWTs are not returned in JSON response bodies. They are only set as `HttpOnly` cookies.

Tokens expire after 30 minutes by default (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`).

## Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user (sends verification email) |
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/logout` | No | Clear auth cookies |
| POST | `/api/auth/guest` | No | Create guest account |
| POST | `/api/auth/upgrade` | Yes (guest) | Upgrade guest to permanent account |
| POST | `/api/auth/change-email` | Yes (unverified) | Change email for unverified accounts |
| POST | `/api/auth/verify-email` | No | Verify email with token from email link |
| POST | `/api/auth/resend-verification` | No | Resend verification email |
| POST | `/api/auth/forgot-password` | No | Request password reset email |
| POST | `/api/auth/reset-password` | No | Reset password with token |
| GET | `/api/auth/google/login` | No | Redirect to Google OAuth |
| GET | `/api/auth/google/callback` | No | Google OAuth callback (internal) |
| POST | `/api/auth/google/exchange` | No | Exchange temporary OAuth code for cookie session |
| GET | `/api/auth/me` | Yes | Get current user info |
| GET | `/api/auth/me/export` | Yes | Export all user data (GDPR) |
| DELETE | `/api/auth/me` | Yes | Delete account and all data (GDPR) |
| POST | `/api/auth/feedback` | Yes | Submit feedback and receive bonus limits |

#### Register

Registration does **not** return a token. A verification email is sent instead. The user must verify their email before they can log in.

```bash
curl -X POST /api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass1!"}'
```

Response:
```json
{"message": "If this email is not registered, a verification email has been sent."}
```

Password requirements: minimum 12 characters, at least one uppercase letter, one lowercase letter, one digit, and one special character (`!@#$%^&*...`).

#### Login

```bash
curl -X POST /api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'username=user@example.com&password=SecurePass1!'
```

Note: The login endpoint uses OAuth2 Password Flow — send `username` (with the email as value) and `password` as form fields.

Response sets `access_token` and `csrf_token` cookies, and returns:
```json
{"message": "Authenticated session established"}
```

Returns `403 email_not_verified` if the account has not been verified yet.

#### Guest account

```bash
curl -X POST /api/auth/guest
```

Creates an anonymous guest account (limited to 1 resume and 1 download/month). The guest can later be upgraded to a permanent account via `/api/auth/upgrade` while keeping all saved resumes.

#### Upgrade guest to permanent account

```bash
curl -X POST /api/auth/upgrade \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass1!"}'
```

A verification email is sent to the new address. The account remains functional during the verification window.

#### Password reset flow

1. Request a reset link:
```bash
curl -X POST /api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

2. Use the token from the email:
```bash
curl -X POST /api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token": "<token-from-email>", "password": "NewSecurePass1!"}'
```

Reset tokens expire after 30 minutes and are single-use (invalidated after first use).

#### Feedback

Submit feedback once per account to earn bonus limits (+3 resumes, +5 downloads):

```bash
curl -X POST /api/auth/feedback \
  -H "Content-Type: application/json" \
  -d '{"ease_rating": 8, "nps": 9, "suggestions": "Great tool!"}'
```

Response:
```json
{"message": "Thank you for your feedback!", "bonus_resumes": 3, "bonus_downloads": 5}
```

#### GDPR data export

`GET /api/auth/me/export` returns a portable JSON payload with:
- `user`: account metadata (`id`, `email`, `auth_method`, guest/verification/premium flags, quota counters, bonus counters, timestamps)
- `resumes`: all saved resumes (`id`, `name`, `json_content`, `s3_url`, `created_at`)
- `feedbacks`: all submitted feedback entries
- `exported_at`: export timestamp (UTC)

### Resume Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/resumes` | Yes | Create new resume |
| GET | `/api/resumes` | Yes | List user's resumes |
| GET | `/api/resumes/{id}` | Yes | Get specific resume |
| PUT | `/api/resumes/{id}` | Yes | Update resume |
| DELETE | `/api/resumes/{id}` | Yes | Delete resume |
| POST | `/api/resumes/{id}/generate` | Yes | Generate PDF from saved resume |

#### Generate PDF from saved resume

```bash
curl -X POST "/api/resumes/42/generate?template_id=harvard&lang=en" \
  --output resume.pdf
```

Query parameters:
- `template_id` — template to use (default: `harvard`)
- `lang` — language for section titles: `fr` or `en` (default: `fr`)

Returns a PDF file (`application/pdf`). Counts against the monthly download quota.

### CV Generation (anonymous)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/default-data` | No | Returns default CV data structure |
| POST | `/generate` | No | Generate PDF from JSON data (no save) |
| POST | `/import` | Yes | Import CV from uploaded PDF (AI extraction) |
| POST | `/import-stream` | Yes | Import CV with SSE streaming progress |
| POST | `/optimal-size` | No | Find optimal font size for single-page fit |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Application health check |
| GET | `/health_db` | Database connectivity check |

## Limits and Quotas

| Resource | Guest | Free | Premium |
|----------|-------|------|---------|
| Max saved resumes | 1 | 3 | 100 |
| Max PDF downloads/month | 1 | 3 | 1000 |
| Resume content size | 100 KB | 100 KB | 100 KB |

Limits are **per account**. The monthly download counter resets at the start of each calendar month.

### Bonus limits

Registered (non-guest) users who submit feedback once receive permanent bonus limits:
- **+3 resumes** added to the account maximum
- **+5 downloads/month** added to the monthly maximum

## Rate Limiting

Auth endpoints are rate-limited per IP address using a Redis sliding window:

| Endpoint | Default limit |
|----------|--------------|
| `/api/auth/register` | 15 requests / hour |
| `/api/auth/login` | 30 requests / minute |
| `/api/auth/forgot-password` | 10 requests / 15 minutes |
| `/api/auth/resend-verification` | 10 requests / 15 minutes |

Limits are configurable via environment variables (see `DEPLOYMENT.md`).

When a limit is exceeded, the API returns `429 Too Many Requests` with a `Retry-After` header.

## Error Responses

The API returns standard HTTP status codes:

| Code | Meaning |
|------|---------|
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (e.g. email not verified: `detail: "email_not_verified"`) |
| 404 | Resource not found |
| 409 | Conflict (e.g. email already in use) |
| 422 | Unprocessable entity (invalid input) |
| 429 | Too many requests (quota or rate limit exceeded) |
| 500 | Internal server error |

Error body format:
```json
{"detail": "Error description"}
```

## Available Templates

Each template is available in three size variants:

| Template | Variants |
|----------|----------|
| `harvard` | `harvard`, `harvard_compact`, `harvard_large` |
| `double` | `double`, `double_compact`, `double_large` |
| `michel` | `michel`, `michel_compact`, `michel_large` |
| `stephane` | `stephane`, `stephane_compact`, `stephane_large` |
| `aurianne` | `aurianne`, `aurianne_compact`, `aurianne_large` |
| `mckinsey` | `mckinsey`, `mckinsey_compact`, `mckinsey_large` |
| `europass` | `europass`, `europass_compact`, `europass_large` |
