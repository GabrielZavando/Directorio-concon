/**
 * Unit tests for `RolesGuard` (Task 7.5 — replaces the stub).
 *
 * Verifies the role-based authorization contract from `tasks.md` 7.5:
 *
 *  - Sin `@Roles` decorator → pasa (cualquier autenticado).
 *  - `@Roles('admin')` + `request.user.rol === 'admin'` → pasa.
 *  - `@Roles('admin')` + `request.user.rol === 'owner'` → `ForbiddenException`
 *    with message `rol 'owner' is not allowed to perform this operation`.
 *  - `@Roles('owner','admin')` method-level + `@Roles('member')` class-level
 *    → method-level gana (member → 403, owner → 200).
 *
 * Additionally covers defence-in-depth:
 *
 *  - `request.user` missing entirely → `UnauthorizedException` (401).
 *    This is the case when this guard was applied WITHOUT a preceding
 *    `JwtAuthGuard` (or `@Public()` was active) — the application should
 *    catch the misconfiguration early with a clear 401, not run with
 *    `undefined.rol`.
 *
 * Mocks: `Reflector` (metadata reads). The guard does NOT depend on
 * `AuthService` — it only reads `request.user.rol` (populated by
 * `JwtAuthGuard` upstream in the activation chain).
 */
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";
import { ROLES_KEY } from "./roles.decorator";
import type { AuthContext } from "../domain/auth-context.interface";
import type { Rol } from "../domain/rol.enum";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(rol: Rol): AuthContext {
  return { uid: "uid-001", email: "u@example.com", rol };
}

function makeExecutionContext(user: AuthContext | undefined): ExecutionContext {
  const request = user === undefined ? {} : { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => jest.fn(),
    getClass: () => class Handler {},
  } as unknown as ExecutionContext;
}

function makeReflector(roles: Rol[] | undefined): jest.Mocked<Reflector> {
  return {
    getAllAndOverride: jest.fn(() => roles),
  } as unknown as jest.Mocked<Reflector>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RolesGuard", () => {
  let guard: RolesGuard;

  // -------------------------------------------------------------------------
  // Case 1 — no @Roles decorator → pasa
  // -------------------------------------------------------------------------
  describe("no @Roles metadata", () => {
    it("passes when there is no @Roles decorator (any authenticated)", () => {
      const reflector = makeReflector(undefined);
      guard = new RolesGuard(reflector);
      const user = makeContext("member");

      const result = guard.canActivate(makeExecutionContext(user));

      expect(result).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Case 2 — @Roles('admin') + rol === 'admin' → pasa
  // -------------------------------------------------------------------------
  describe("@Roles('admin') with matching rol", () => {
    it("returns true when user.rol === 'admin'", () => {
      const reflector = makeReflector(["admin"]);
      guard = new RolesGuard(reflector);
      const user = makeContext("admin");

      const result = guard.canActivate(makeExecutionContext(user));

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        expect.any(Function),
        expect.any(Function),
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Case 3 — @Roles('admin') + rol === 'owner' → 403
  // -------------------------------------------------------------------------
  describe("@Roles('admin') with non-matching rol", () => {
    it("throws ForbiddenException with message 'rol 'owner' is not allowed...'", () => {
      const reflector = makeReflector(["admin"]);
      guard = new RolesGuard(reflector);
      const user = makeContext("owner");

      expect(() => guard.canActivate(makeExecutionContext(user))).toThrow(
        ForbiddenException,
      );
      expect(() => guard.canActivate(makeExecutionContext(user))).toThrow(
        /rol 'owner' is not allowed to perform this operation/,
      );
    });

    it("throws ForbiddenException for member when only 'admin' is allowed", () => {
      const reflector = makeReflector(["admin"]);
      guard = new RolesGuard(reflector);
      const user = makeContext("member");

      expect(() => guard.canActivate(makeExecutionContext(user))).toThrow(
        ForbiddenException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Case 4 — method-level overrides class-level via Reflector.getAllAndOverride
  // -------------------------------------------------------------------------
  describe("method-level @Roles overrides class-level", () => {
    /**
     * The Reflector mock here returns `["owner", "admin"]` REGARDLESS of
     * which level is queried — we trust `Reflector.getAllAndOverride`
     * (unit-tested by NestJS) to apply method-level precedence. Our
     * contract is "whatever roles value we receive wins".
     *
     * - member user  → 403 (member not in [owner, admin])
     * - owner user   → 200 (owner in [owner, admin])
     */
    it("member → 403 when method-level is [owner, admin]", () => {
      const reflector = makeReflector(["owner", "admin"]);
      guard = new RolesGuard(reflector);
      const user = makeContext("member");

      expect(() => guard.canActivate(makeExecutionContext(user))).toThrow(
        ForbiddenException,
      );
    });

    it("owner → passes when method-level is [owner, admin]", () => {
      const reflector = makeReflector(["owner", "admin"]);
      guard = new RolesGuard(reflector);
      const user = makeContext("owner");

      const result = guard.canActivate(makeExecutionContext(user));

      expect(result).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Defence-in-depth — request.user missing
  // -------------------------------------------------------------------------
  describe("defence-in-depth — request.user missing", () => {
    it("throws UnauthorizedException (401) when request.user is undefined", () => {
      const reflector = makeReflector(["admin"]);
      guard = new RolesGuard(reflector);

      expect(() => guard.canActivate(makeExecutionContext(undefined))).toThrow(
        UnauthorizedException,
      );
    });
  });
});
