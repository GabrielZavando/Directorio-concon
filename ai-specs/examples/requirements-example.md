# Requirements Example — User Registration

> Functional and technical requirements for a user registration feature.
> Use these as templates when creating `.openspec/<ticket>/requirements.md`.

## REQ-001: User Registration Endpoint

### Description

The system must provide a REST API endpoint for user registration.

### Requirements

- **REQ-001.1:** Endpoint accepts POST at `/api/v1/auth/register`
- **REQ-001.2:** Request body must contain: `email`, `password`, `name`
- **REQ-001.3:** All fields are required
- **REQ-001.4:** Response must be JSON with appropriate Content-Type header

### Acceptance Criteria

- [ ] POST `/api/v1/auth/register` returns 201 on success
- [ ] POST `/api/v1/auth/register` returns 400 on validation error
- [ ] POST `/api/v1/auth/register` returns 409 on duplicate email
- [ ] Response time < 500ms for valid requests

---

## REQ-002: Email Validation

### Description

The system must validate email format according to RFC 5322.

### Requirements

- **REQ-002.1:** Email must match standard email format regex
- **REQ-002.2:** Email must be converted to lowercase before storage
- **REQ-002.3:** Email must be unique across all users

### Acceptance Criteria

- [ ] `user@example.com` and `User@Example.COM` are treated as duplicates
- [ ] `not-an-email` is rejected with 400 status
- [ ] Emails are stored in lowercase

---

## REQ-003: Password Requirements

### Description

The system must enforce minimum password security standards.

### Requirements

- **REQ-003.1:** Password must be minimum 8 characters
- **REQ-003.2:** Password must contain at least one number
- **REQ-003.3:** Password must contain at least one uppercase letter
- **REQ-003.4:** Password must not be in the top 1000 most common passwords
- **REQ-003.5:** Password must be hashed using bcrypt with cost factor 12

### Acceptance Criteria

- [ ] `password123` is rejected (no uppercase)
- [ ] `PASS` is rejected (too short)
- [ ] `password` is rejected (in common passwords list)
- [ ] `SecurePass123` is accepted
- [ ] Plain text password is never stored or logged

---

## REQ-004: User Entity

### Description

The system must create and persist a user record upon successful registration.

### Requirements

- **REQ-004.1:** User entity must have: `id` (UUID), `email`, `passwordHash`, `name`, `status`, `createdAt`, `updatedAt`
- **REQ-004.2:** Initial status must be `pending_verification`
- **REQ-004.3:** `id` must be a valid UUID v4
- **REQ-004.4:** `createdAt` and `updatedAt` are automatically set

### Acceptance Criteria

- [ ] User record is created in database on successful registration
- [ ] User status is `pending_verification` initially
- [ ] `createdAt` timestamp matches request time (±1 second)
- [ ] `passwordHash` is never returned in API responses

---

## REQ-005: Email Verification

### Description

The system must send a verification email and validate verification tokens.

### Requirements

- **REQ-005.1:** Verification token must be generated using cryptographically secure random
- **REQ-005.2:** Token must be 32 bytes, base64url encoded
- **REQ-005.3:** Token must expire after 24 hours
- **REQ-005.4:** Verification email must contain a link to `/verify-email?token=<token>`
- **REQ-005.5:** Token can only be used once

### Acceptance Criteria

- [ ] Verification email is sent within 5 seconds of registration
- [ ] Link in email leads to successful verification page
- [ ] Expired tokens return appropriate error
- [ ] Used tokens return "already verified" message

---

## REQ-006: Rate Limiting

### Description

The system must prevent abuse of the registration endpoint.

### Requirements

- **REQ-006.1:** Maximum 5 registration attempts per IP in 10 minutes
- **REQ-006.2:** Rate limit headers must be returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **REQ-006.3:** Blocked requests return 429 status

### Acceptance Criteria

- [ ] 6th attempt within 10 minutes returns 429
- [ ] Rate limit headers are present in all responses
- [ ] Rate limit resets after 10 minutes

---

## REQ-007: Security

### Requirements

- **REQ-007.1:** No SQL injection possible via any input field
- **REQ-007.2:** No XSS possible via name field (sanitize HTML)
- **REQ-007.3:** Password is never logged or returned in responses
- **REQ-007.4:** HTTPS required in production
- **REQ-007.5:** CORS configured to allow only frontend origin

---

## Technical Constraints

| Constraint | Description |
|------------|-------------|
| Database | PostgreSQL 16+ |
| Runtime | Node.js 20+ |
| ORM | Prisma 6+ |
| Testing | Vitest + Supertest |
| Hashing | bcrypt cost factor 12 |

---

## Dependencies

- External email service (SendGrid, Resend, etc.)
- Redis for rate limiting (optional, can use in-memory)

---

## Out of Scope

- Social login (Google, GitHub)
- Password reset flow
- Two-factor authentication
- Session management
- Admin user creation