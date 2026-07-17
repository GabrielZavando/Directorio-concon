# Scenarios Example — User Registration

> Gherkin-format acceptance scenarios for a user registration feature.
> Use these as templates when creating `.openspec/<ticket>/scenarios.md`.

## Feature: User Registration

### Scenario 1: Successful registration with valid data

**Given** the email "newuser@example.com" does not exist in the system
**And** the password meets security requirements (8+ chars, 1 number, 1 uppercase)
**When** a visitor submits the registration form with:
  | Field | Value |
  |-------|-------|
  | email | newuser@example.com |
  | password | SecurePass123 |
  | name | New User |

**Then** a user account is created with email "newuser@example.com"
**And** the user is redirected to the verification email sent page
**And** a verification email is sent to "newuser@example.com"
**And** the user status is "pending_verification"

---

### Scenario 2: Registration fails with duplicate email

**Given** the email "existing@example.com" already exists in the system
**When** a visitor attempts to register with:
  | Field | Value |
  |-------|-------|
  | email | existing@example.com |
  | password | SecurePass123 |

**Then** the registration form is redisplayed with an error message
**And** the error is "The email address is already registered"
**And** no new user account is created
**And** no verification email is sent

---

### Scenario 3: Registration fails with weak password

**Given** the visitor is on the registration page
**When** they submit the form with:
  | Field | Value |
  |-------|-------|
  | email | valid@example.com |
  | password | weak |

**Then** the form is not submitted
**And** the error "Password must be at least 8 characters, contain a number and an uppercase letter" is shown
**And** no user account is created

---

### Scenario 4: Registration fails with invalid email format

**Given** the visitor is on the registration page
**When** they submit the form with:
  | Field | Value |
  |-------|-------|
  | email | not-an-email |
  | password | SecurePass123 |

**Then** the form is not submitted
**And** the error "Please enter a valid email address" is shown
**And** no user account is created

---

### Scenario 5: Email verification successful

**Given** a user "pending@example.com" exists with status "pending_verification"
**And** the verification token is "abc123validtoken"
**When** the user visits the verification link "/verify-email?token=abc123validtoken"
**Then** the user status is updated to "active"
**And** the verification token is invalidated
**And** the user is redirected to the login page with a success message

---

### Scenario 6: Email verification with expired token

**Given** a user "expired@example.com" exists with status "pending_verification"
**And** the verification token "expiredtoken" was created more than 24 hours ago
**When** the user visits the verification link "/verify-email?token=expiredtoken"
**Then** the user status remains "pending_verification"
**And** the error "This verification link has expired. Please request a new one." is shown
**And** the user is offered a "Resend verification email" option

---

### Scenario 7: Registration rate limiting

**Given** the visitor has attempted to register 5 times in the last 10 minutes
**When** they attempt to register again
**Then** the form is not submitted
**And** the error "Too many registration attempts. Please try again in 10 minutes." is shown
**And** no user account is created

---

## Edge Cases Summary

| Edge Case | Expected Behavior |
|-----------|------------------|
| Duplicate email | Show error, no account created |
| Weak password | Show error with requirements |
| Invalid email format | Show error before submission |
| Expired verification token | Show error, offer resend |
| Rate limiting | Block for 10 minutes |
| Empty required fields | Show field-level errors |
| XSS in name field | Sanitize, do not reject |
| SQL injection attempt | Sanitize, do not reject |

## Definition of Done

- [ ] All scenarios passing
- [ ] Unit tests for validation logic
- [ ] Integration tests for registration endpoint
- [ ] Email service mocked in tests
- [ ] Rate limiting implemented
- [ ] Password requirements enforced client-side and server-side
- [ ] `api-spec.yml` updated with new endpoints
- [ ] `data-model.md` updated with user entity changes