/**
 * RegisterUserInput — use-case input port for public self-registration.
 *
 * Owned by the application layer so `AuthService.registerWithRole` never
 * depends on infrastructure DTOs (class-validator) — DIP per
 * `docs/backend-standards.md`. The HTTP layer maps its validated
 * `RegisterDto` onto this shape (structural typing makes the mapping
 * implicit for identical string fields).
 */
export interface RegisterUserInput {
  email: string;
  password: string;
  nombre: string;
  rol: "member" | "owner";
}
