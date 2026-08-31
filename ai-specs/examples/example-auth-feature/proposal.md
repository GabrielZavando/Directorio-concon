# Proposal: User Authentication Feature

## Problem Statement
Users need a secure way to log in and access protected resources. Currently, there is no authentication mechanism.

## Proposed Solution
Implement JWT-based authentication with:
- Login endpoint (POST /auth/login)
- Token refresh endpoint (POST /auth/refresh)
- Protected route middleware

## Scope
- Backend: NestJS controllers, services, JWT middleware
- Frontend: Angular login component, auth guard, token storage
- Database: users table with bcrypt-hashed passwords

## Out of Scope
- Social login (Google, Facebook)
- Two-factor authentication
- Password reset flow (separate feature)

## Success Criteria
- Users can log in with email/password
- Invalid credentials return 401
- Protected routes return 403 without valid token
- Tokens expire after 1 hour
- Refresh tokens extend session by 7 days
