# Scenarios: User Authentication Feature

## Scenario 1: User logs in successfully
```gherkin
Feature: User authentication

Scenario: Successful login
  Given a user exists with email "user@example.com" and password "SecurePass123"
  When the user POSTs to /auth/login with:
    | email    | user@example.com |
    | password | SecurePass123    |
  Then the response status is 200
  And the response contains:
    | access_token  | {jwt_token}  |
    | refresh_token | {refresh_id} |
  And the access_token expires in 1 hour
  And the refresh_token expires in 7 days
```

## Scenario 2: User attempts login with wrong password
```gherkin
Scenario: Invalid credentials
  Given a user exists with email "user@example.com"
  When the user POSTs to /auth/login with:
    | email    | user@example.com |
    | password | WrongPassword    |
  Then the response status is 401
  And the response contains:
    | error   | Invalid credentials |
    | message | Email or password is incorrect |
```

## Scenario 3: User accesses protected route without token
```gherkin
Scenario: Protected route without authentication
  Given a protected route GET /api/profile
  When the user GETs /api/profile without Authorization header
  Then the response status is 403
  And the response contains:
    | error   | Forbidden |
    | message | Authentication required |
```

## Scenario 4: User accesses protected route with valid token
```gherkin
Scenario: Protected route with valid token
  Given a user is logged in with a valid access_token
  And a protected route GET /api/profile
  When the user GETs /api/profile with Authorization: Bearer {access_token}
  Then the response status is 200
  And the response contains the user profile data
```

## Scenario 5: Token refresh
```gherkin
Scenario: Refresh expired access token
  Given a user has a valid refresh_token
  And their access_token has expired
  When the user POSTs to /auth/refresh with:
    | refresh_token | {refresh_token} |
  Then the response status is 200
  And the response contains a new access_token
  And the new access_token expires in 1 hour
```

## Scenario 6: Rate limiting
```gherkin
Scenario: Rate limiting on login
  Given a user has made 5 failed login attempts in the last minute
  When they POST to /auth/login again
  Then the response status is 429
  And the response contains:
    | error   | Too Many Requests |
    | message | Please try again later |
```
