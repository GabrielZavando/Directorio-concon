# Tasks: User Authentication Feature

## Task 1: Set up JWT infrastructure
**Status**: [ ]
**Domain**: Backend
**Suggested Path**: src/auth/jwt/
**Test Path**: test/auth/jwt/

**Steps**:
1. Install dependencies: `@nestjs/jwt`, `passport-jwt`, `bcrypt`
2. Create `JwtStrategy` class extending `PassportStrategy(Strategy)`
3. Implement `validate()` method to extract user from token payload
4. Create `JwtAuthGuard` extending `AuthGuard('jwt')`
5. Write unit tests for strategy and guard
6. Update `AuthModule` to register JWT strategy

**Acceptance Criteria**:
- JwtStrategy validates token signature and expiration
- JwtAuthGuard returns 403 for invalid tokens
- All tests pass

## Task 2: Implement user registration
**Status**: [ ]
**Domain**: Backend
**Suggested Path**: src/users/
**Test Path**: test/users/

**Steps**:
1. Create `User` entity with fields: id, email, password_hash, created_at
2. Create `CreateUserDto` with validation (email format, password strength)
3. Create `UsersService` with `create()` method
4. Hash password with bcrypt (cost 12) before saving
5. Create `UsersController` with POST /users endpoint
6. Write integration tests for registration flow
7. Add rate limiting (5 requests/minute) to POST /users

**Acceptance Criteria**:
- User can register with valid email/password
- Password is hashed with bcrypt
- Duplicate email returns 409 Conflict
- Rate limiting enforced

## Task 3: Implement login endpoint
**Status**: [ ]
**Domain**: Backend
**Suggested Path**: src/auth/
**Test Path**: test/auth/

**Steps**:
1. Create `LoginDto` with email and password fields
2. Create `AuthService` with `login()` method
3. Validate credentials against database
4. On success: generate access_token (1h) and refresh_token (7d)
5. Create `AuthController` with POST /auth/login endpoint
6. Write integration tests for login flow
7. Add rate limiting (5 attempts/minute) to POST /auth/login

**Acceptance Criteria**:
- Valid credentials return 200 with tokens
- Invalid credentials return 401
- Tokens have correct expiration times
- Rate limiting enforced

## Task 4: Implement token refresh endpoint
**Status**: [ ]
**Domain**: Backend
**Suggested Path**: src/auth/
**Test Path**: test/auth/

**Steps**:
1. Create `RefreshTokenDto` with refresh_token field
2. Create `AuthService.refresh()` method
3. Validate refresh_token signature and expiration
4. Generate new access_token
5. Create POST /auth/refresh endpoint
6. Write integration tests

**Acceptance Criteria**:
- Valid refresh_token returns new access_token
- Invalid refresh_token returns 401
- New access_token expires in 1 hour

## Task 5: Protect routes with JwtAuthGuard
**Status**: [ ]
**Domain**: Backend
**Suggested Path**: src/ (various controllers)
**Test Path**: test/ (various)

**Steps**:
1. Add `@UseGuards(JwtAuthGuard)` to protected controllers/routes
2. Test that routes return 403 without token
3. Test that routes work with valid token
4. Update OpenAPI spec to document authentication requirement

**Acceptance Criteria**:
- Protected routes return 403 without token
- Protected routes work with valid token
- OpenAPI spec updated

## Task 6: Frontend login component
**Status**: [ ]
**Domain**: Frontend
**Suggested Path**: src/app/features/auth/
**Test Path**: src/app/features/auth/

**Steps**:
1. Create `LoginComponent` with email/password form
2. Create `AuthService` with `login()` method calling backend
3. Store tokens in httpOnly cookies
4. Handle success (redirect to dashboard) and error (show message)
5. Write unit tests for component and service
6. Write E2E test for login flow

**Acceptance Criteria**:
- User can enter credentials and submit
- Successful login redirects to dashboard
- Failed login shows error message
- Tokens stored securely

## Task 7: Frontend auth guard
**Status**: [ ]
**Domain**: Frontend
**Suggested Path**: src/app/core/guards/
**Test Path**: src/app/core/guards/

**Steps**:
1. Create `AuthGuard` implementing `CanActivate`
2. Check for valid token in cookies
3. Redirect to login if no token
4. Apply guard to protected routes in routing module
5. Write unit tests

**Acceptance Criteria**:
- Guard redirects to login without token
- Guard allows access with valid token
- Protected routes are secured
