# Skill: enrich-us

## Description

Analyzes and enriches a vague user story or ticket into an actionable description with acceptance criteria, technical details, and edge cases.

**Use BEFORE `/plan-change`** to ensure team and AI agent alignment.

## When to Use This Skill

- User story with vague or incomplete description
- Ticket without acceptance criteria
- New idea that needs definition before planning
- Complex feature requiring technical clarification upfront

## Process

### Step 1: Gather Information

Read the ticket or description provided (or fetch via Jira MCP if ticket ID is given):

```bash
# If Jira MCP is configured
jira ticket get TICKET-ID

# Or fetch via API
curl -H "Authorization: Bearer $JIRA_TOKEN" \
  https://your-domain.atlassian.net/rest/api/3/issue/TICKET-ID
```

Identify:
- **Who** is the user/actor?
- **What** do they want to accomplish?
- **Why** is this valuable?
- **When/Where** does this apply?

### Step 2: Analyze and Clarify

Ask these questions internally or to the user:

1. What is the happy path?
2. What are the error scenarios?
3. What are the edge cases?
4. Are there any technical constraints?
5. What does "done" look like?
6. Are there dependencies on other tickets?
7. What is the priority and why?

### Step 3: Draft Enriched Story

Format:

```markdown
## User Story enriched: [TICKET-ID]

**As a** [role/user type]
**I want** [action/feature]
**So that** [benefit/value]
```

### Step 4: Add Acceptance Criteria (Gherkin)

```markdown
### Acceptance Criteria

**Scenario 1: [Happy path]**
- Given [context/precondition]
- When [action performed]
- Then [expected outcome]

**Scenario 2: [Error case]**
- Given [condition]
- When [action]
- Then [error handling]
```

### Step 5: Identify Edge Cases

```markdown
### Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| [Edge case] | [How system handles it] |
```

### Step 6: Add Technical Considerations

```markdown
### Technical Considerations

- [Constraint or technical detail]
- [Database changes needed]
- [API contract changes]
- [Third-party integrations]
```

### Step 7: Define Done (DoD)

```markdown
### Definition of Done

- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code review approved
- [ ] OpenSpec artifacts updated
- [ ] API spec reflects changes
- [ ] Data model reflects changes (if applicable)
```

### Step 8: Confirm with User

Show the enriched story and ask for confirmation before proceeding to `/plan-change`.

---

## Output Template

```markdown
## User Story enriched: [TICKET-ID]

**As a** [role]
**I want** [action]
**So that** [benefit]

### Context

[Background and motivation]

### Acceptance Criteria

**Scenario 1: [description]**
- Given [context]
- When [action]
- Then [result]

**Scenario 2: [description]**
- Given [context]
- When [action]
- Then [result]

### Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| [case] | [behavior] |

### Technical Considerations

- [consideration]
- [consideration]

### Definition of Done

- [ ] [ ] ...
- [ ] [ ] ...

### Questions for Clarification

1. [Pending question]
```

---

## Example: Enriching a Vague Ticket

### Before (Original Ticket)

> "User wants to reset password"

### After (Enriched)

```markdown
## User Story enriched: AUTH-042

**As a** registered user
**I want** to reset my password if I forgot it
**So that** I can regain access to my account

### Context

Users frequently forget passwords. We need a secure, user-friendly password reset flow that:
- Works even if user can't access their email (via support)
- Prevents account takeover via email hijacking
- Completes within reasonable time (< 5 minutes)

### Acceptance Criteria

**Scenario 1: Successful password reset request**
- Given I am on the login page
- When I click "Forgot password" and enter my registered email
- Then I receive an email with a reset link within 2 minutes
- And I see "Check your email for reset instructions" message

**Scenario 2: Password reset with valid token**
- Given I received a reset email with a valid token
- When I visit the reset link and enter a new password
- Then my password is updated
- And I am redirected to login page
- And I can log in with the new password

**Scenario 3: Reset with expired token**
- Given I have a reset token that expired (24 hours)
- When I try to use it
- Then I see "This link has expired"
- And I am offered to request a new one

### Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Email not registered | Show same "email sent" message (don't reveal which emails exist) |
| User already logged in | Redirect to profile, no reset needed |
| Token used twice | Show error "This link has already been used" |
| Password same as old | Reject with "New password must be different" |

### Technical Considerations

- Token: 32 bytes, base64url, hashed in DB
- Token expiry: 24 hours
- Email provider: Resend (already in stack)
- Rate limit: 3 reset requests per email per hour
- Log password reset requests (without new password) for audit

### Definition of Done

- [ ] User can request password reset via email
- [ ] User receives email with reset link
- [ ] User can set new password via link
- [ ] Expired/invalid tokens handled gracefully
- [ ] Rate limiting prevents abuse
- [ ] Audit log entries created
- [ ] `api-spec.yml` updated
- [ ] `data-model.md` updated (if needed)
```

---

## Tips

1. **Don't over-engineer:** Focus on MVP criteria first
2. **Edge cases are features:** List them explicitly, don't assume
3. **Technical constraints matter:** Note DB, API, or third-party limitations upfront
4. **Validation is bidirectional:** Client-side AND server-side
5. **Don't block on perfection:** Get 80% of criteria, refine in review

## Model Required

Execute with the model configured in the plan agent. Check `opencode.json` before starting.