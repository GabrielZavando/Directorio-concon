# Ticket Example — AUTH-001: User Registration

> Sample enriched ticket for a user registration feature.
> Use as reference when creating real tickets for `/plan-change`.

## Original Ticket

> Como visitante del sitio, quiero registrarme con email y password, para poder acceder a mi cuenta.

---

## Enriched Version

## User Story: AUTH-001 — User Registration

**As a** visitor to the website
**I want** to register with my email and password
**So that** I can have a personal account to access my data

---

## Context

The project is an e-commerce platform. Visitors can browse products without an account but need to register to:
- Place orders
- View order history
- Save favorites
- Receive promotions (opt-in)

Registration is the first step in the auth flow. Future tickets cover email verification, login, and password reset.

---

## Criterios de Aceptación

### Must Have (MVP)

- [ ] User can register with email, password, and name
- [ ] Email must be valid format and unique
- [ ] Password must meet security requirements (8+ chars, 1 number, 1 uppercase)
- [ ] User receives verification email after registration
- [ ] User cannot login until email is verified
- [ ] Registration endpoint is rate-limited (5 attempts/10 min per IP)

### Should Have (Next Sprint)

- [ ] Resend verification email option
- [ ] Expired token handling with clear error message

### Could Have (Later)

- [ ] Social login (Google, GitHub)
- [ ] Registration with phone number

---

## Edge Cases Identificados

| Escenario | Manejo |
|-----------|--------|
| Email duplicado | Mostrar mensaje "El email ya está registrado" |
| Password débil | Validación en frontend + backend, mostrar requisitos |
| Token expirado | Ofrecer reenvío de email de verificación |
| Rate limit excedido | Mostrar "Intenta de nuevo en X minutos" |
| Email inválido | Validación en tiempo real (blur) |
| Campos vacíos | Errores por campo, no un resumen genérico |
| XSS en nombre | Sanitizar, no rechazar |
| SQL injection | Sanitizar inputs, usar parameterized queries |

---

## Definition of Done

### Código

- [ ] Tests unitarios para validación (覆盖率 > 90%)
- [ ] Tests de integración para `/auth/register`
- [ ] Tests de integración para `/verify-email`
- [ ] Todos los tests pasando
- [ ] No `any` sin justificación
- [ ] No console.log en producción

### Documentación

- [ ] `api-spec.yml` actualizado con nuevos endpoints
- [ ] `data-model.md` actualizado con User entity
- [ ] README del módulo actualizado si existe

### Seguridad

- [ ] Password hashing con bcrypt
- [ ] Rate limiting implementado
- [ ] No datos sensibles en logs
- [ ] CORS configurado
- [ ] HTTPS required en producción

### UX

- [ ] Estados de carga visibles
- [ ] Mensajes de error claros y específicos
- [ ] Validación en tiempo real en frontend
- [ ] Redirección apropiada post-registro

---

## Estimación

- **Complexity:** Medium
- **Estimated:** 5 points (2 days)
- **Dependencies:** None (blocking)
- **Blocked by:** None

---

## Technical Notes

- Use `crypto.randomBytes(32)` for verification token
- Store token hash in DB, not plaintext
- Consider using a UUID v4 for user ID
- Email service: integrate with Resend API (already in stack)
- Rate limiting: use Redis if available, in-memory fallback

---

## Preguntas Pendientes

1. ~~¿Qué email service usar?~~ → Resend (ya está en el stack)
2. ~~¿El link de verificación apunta a frontend o backend?~~ → Frontend, `/verify-email?token=xxx`
3. ¿Debe el usuario estar logueado inmediatamente después de verificar email? → No, debe hacer login separately
4. ¿Se envía email de bienvenida además del de verificación? → No, solo verificación por ahora