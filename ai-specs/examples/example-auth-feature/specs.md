# Specifications: User Authentication Feature

## Functional Requirements

### FR-1: Login
- User submits email and password
- System validates credentials against database
- On success: return JWT access token (1h) and refresh token (7d)
- On failure: return 401 Unauthorized

### FR-2: Token Refresh
- User submits refresh token
- System validates token signature and expiration
- On success: return new access token
- On failure: return 401 Unauthorized

### FR-3: Protected Routes
- Middleware checks Authorization header for Bearer token
- Validate token signature and expiration
- On success: allow request to proceed
- On failure: return 403 Forbidden

## Non-Functional Requirements

### NFR-1: Security
- Passwords hashed with bcrypt (cost factor 12)
- JWT signed with RS256 (asymmetric keys)
- Tokens stored in httpOnly cookies (frontend)
- Rate limiting: 5 login attempts per minute per IP

### NFR-2: Performance
- Login response time < 500ms (p95)
- Token validation < 10ms per request

## Acceptance Criteria

### AC-1: Successful login
Given a user with valid credentials
When they POST to /auth/login
Then they receive a 200 response with access_token and refresh_token

### AC-2: Invalid credentials
Given a user with invalid credentials
When they POST to /auth/login
Then they receive a 401 response with error message

### AC-3: Protected route without token
Given a protected route
When accessed without Authorization header
Then it returns 403 Forbidden

### AC-4: Protected route with valid token
Given a protected route
When accessed with valid Bearer token
Then the request proceeds normally
