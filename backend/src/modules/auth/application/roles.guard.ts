/**
 * RolesGuard — production guard (replaces the Task 4 stub).
 *
 * Reads `@Roles(...)` metadata set by `Roles` decorator and compares with
 * `request.user.rol` (populated by `JwtAuthGuard` upstream in the activation
 * chain). Per `tasks.md` 7.5:
 *
 *  - Sin `@Roles` decorator → pasa (cualquier autenticado).
 *  - Match → pasa. No match → `ForbiddenException` with message
 *    `rol 'X' is not allowed to perform this operation`.
 *  - Method-level @Roles wins over class-level via
 *    `Reflector.getAllAndOverride` (NestJS handles the precedence; this
 *    guard simply consumes the resolved array).
 *
 * Defence-in-depth: if `request.user` is `undefined` (i.e., `JwtAuthGuard`
 * has not run upstream — a wiring misconfig), the guard throws
 * `UnauthorizedException` (401) so the misconfiguration surfaces loudly
 * instead of leaking `undefined.rol`.
 *
 * SRP — pure authorization logic. No Firebase dependency. Reads only the
 * `AuthContext.rol` field placed on `request.user` by `JwtAuthGuard`.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";
import type { AuthContext } from "../domain/auth-context.interface";
import type { Rol } from "../domain/rol.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Sin @Roles decorator → any authenticated caller passes.
    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthContext }>();
    if (!request.user) {
      // Wiring bug: RolesGuard applied without JwtAuthGuard upstream.
      // Surface as 401 (no authenticatable principal) — never run with
      // `undefined.rol`.
      throw new UnauthorizedException(
        "RolesGuard: request.user missing — JwtAuthGuard did not run upstream",
      );
    }

    if (!roles.includes(request.user.rol)) {
      throw new ForbiddenException(
        `rol '${request.user.rol}' is not allowed to perform this operation`,
      );
    }

    return true;
  }
}
