# Ejemplo AUTH-042: Reset de Contraseña

## User Story enriched: AUTH-042

**As a** registered user
**I want** to reset my password if I forgot it
**So that** I can regain access to my account

### Context

Users frequently forget passwords. We need a secure, user-friendly password reset flow that:
- Works even if user can't access their email (via support)
- Prevents account takeover via email hijacking
- Completes within reasonable time (< 5 minutes)

### Diseño de Clases/Componentes

- `RequestPasswordResetUseCase`: responsabilidad única = "orquestar la solicitud de reset: valida email, genera token, emite evento de email"
  - Depende de: `IUserRepository`, `IResetTokenGenerator`, `IEmailNotifier`, NO de `TypeOrmUserRepository` o `ResendEmailService`
  - Capa: application
- `ResetToken` (value object): responsabilidad única = "encapsular un token válido (valor, expiry, hash); no sabe nada de DB ni de email"
  - Depende de: ninguna abstracción externa (autocontenido en domain)
  - Capa: domain
- `ResetPasswordController`: responsabilidad única = "recibir HTTP, mapear al UseCase y devolver respuesta"
  - Depende de: `RequestPasswordResetUseCase`, NO de `IUserRepository` directamente
  - Capa: infrastructure

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
- [ ] `docs/api/api-spec.yml` updated
- [ ] `docs/data-model/data-model.md` updated (if needed)

### Tips

1. **Don't over-engineer:** Focus on MVP criteria first
2. **Edge cases are features:** List them explicitly, don't assume
3. **Technical constraints matter:** Note DB, API, or third-party limitations upfront
4. **Validation is bidirectional:** Client-side AND server-side
5. **Don't block on perfection:** Get 80% of criteria, refine in review

---

*Generated from `ai-specs/skills/enrich-us/SKILL.md` - The skill enriches vague tickets into actionable user stories with Gherkin criteria, design declarations, and edge cases.*