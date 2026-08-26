/**
 * JwtAuthGuard — production guard (replaces the Task 4 stub).
 *
 * Per-request contract (`tasks.md` 7.3, `design.md` Decision 2):
 *
 *  1. If `@Public()` metadata is present on the handler, short-circuit to
 *     `true` WITHOUT inspecting the request — forward-compat carve-out
 *     for future `@Public()` routes (no global guard is registered yet;
 *     this guard is opt-in via `@UseGuards(JwtAuthGuard)`).
 *  2. Extract the Bearer token from `Authorization: Bearer <token>`. If
 *     the header is missing or malformed, throw `UnauthorizedException`.
 *  3. Delegates to `AuthService.buildContext(token)` — Firebase verifies
 *     the idToken (with `checkRevoked = true`) and resolves the `AuthContext`
 *     (custom claim `rol` → Firestore fallback → canonical 403 for
 *     orphans).
 *  4. On success, attaches `request.user = AuthContext` and returns `true`.
 *  5. On `AuthService.buildContext` failure: passes `ForbiddenException`
 *     through unchanged (403 — orphan users are a deliberate 403 per the
 *     design). Any other error (token expired/invalid/revoked) is mapped
 *     to `UnauthorizedException` (401) — these are user-recoverable
 *     (refresh the idToken).
 *
 * SRP — the guard only does HTTP extraction + delegation to `AuthService`.
 * Firebase verifyIdToken + `Rol` resolution logic live in `AuthService`.
 *
 * Composition with NestJS guards: applied via
 * `@UseGuards(JwtAuthGuard, RolesGuard)`. The two guards are independent
 * (RolesGuard reads `request.user.rol` populated by this guard).
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "./auth.service";
import { IS_PUBLIC_KEY } from "./public.decorator";
import type { AuthContext } from "../domain/auth-context.interface";

/** Extracts `<token>` from `Authorization: Bearer <token>` or `null`. */
function extractBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue || typeof headerValue !== "string") return null;
  const match = headerValue.trim().match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ---- @Public() short-circuit (forward-compat) ----
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // ---- Bearer extraction ----
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthContext;
    }>();
    const token = extractBearerToken(
      request.headers?.authorization ?? request.headers?.Authorization,
    );
    if (!token) {
      throw new UnauthorizedException(
        "Missing or malformed Authorization header",
      );
    }

    // ---- AuthService.buildContext ----
    try {
      const ctx: AuthContext = await this.authService.buildContext(token);
      request.user = ctx;
      return true;
    } catch (error) {
      // Orphan user → 403 propagates untouched (deliberate fail-closed).
      if (error instanceof ForbiddenException) throw error;
      // Already UnauthorizedException (we threw it earlier for the header).
      if (error instanceof UnauthorizedException) throw error;
      // Anything else (verifyIdToken failure / token expired / network)
      // → 401 — these are user-recoverable (client refreshes the idToken).
      throw new UnauthorizedException(
        "Firebase idToken rejected (expired, invalid, or revoked)",
      );
    }
  }
}
