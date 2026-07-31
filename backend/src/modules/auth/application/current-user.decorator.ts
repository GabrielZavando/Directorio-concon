/**
 * `@CurrentUser()` param decorator — extracts `request.user` (an
 * `AuthContext`) from the request.
 *
 * Used by handlers to read the verified Firebase Auth UID + `rol`. The
 * `data` parameter is unused for now (reserved for future access-control
 * refinements like `@CurrentUser('rol')`).
 *
 * This is the FINAL implementation; Task 7 does not change it.
 */
import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthContext } from "../domain/auth-context.interface";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthContext }>();
    return request.user;
  },
);
