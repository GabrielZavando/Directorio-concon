/**
 * Unit tests for `JwtAuthGuard` (Task 7.3 — replaces the stub).
 *
 * Verifies the per-request contract from `tasks.md` 7.3:
 *
 *  - Header `Authorization: Bearer <token>` válido → adjunta
 *    `request.user = AuthContext`, returns `true`.
 *  - Header ausente / mal formado → `UnauthorizedException` (401).
 *  - `AuthService.buildContext` rejects (verifyIdToken throw on
 *    expired/invalid/revoked token) → `UnauthorizedException` (401).
 *  - `AuthService.buildContext` throws `ForbiddenException`
 *    (orphan user) → propagates as 403.
 *
 * Also covers the `@Public()` forward-compat contract:
 *
 *  - When `Reflector` reports `IS_PUBLIC_KEY === true` on the handler,
 *    the guard short-circuits to `true` WITHOUT touching the Bearer
 *    header. This is the no-op forward-compat carve-out documented in
 *    `public.decorator.ts` (kept final in Task 7.7).
 *
 * Mocks: `AuthService.buildContext` (no real Firebase) + `Reflector`
 * (metadata reads).
 */
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthService } from "./auth.service";
import { IS_PUBLIC_KEY } from "./public.decorator";
import type { AuthContext } from "../domain/auth-context.interface";

// Mock the FirebaseService MODULE so `firebase-admin`'s ESM-only deps
// (jose/jwks-rsa) are never loaded by jest. Matches the pattern used in
// `auth.service.spec.ts` and `usuarios-firestore.adapter.spec.ts`.
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

// ---------------------------------------------------------------------------
// Helpers — minimal mock shapes
// ---------------------------------------------------------------------------

function createMockRequest(
  headers: Record<string, string | undefined> = {},
): Record<string, unknown> {
  return { headers };
}

function createMockContext(
  request: Record<string, unknown>,
  _isPublic: boolean,
): ExecutionContext {
  const ctx = {
    switchToHttp: () => ({ getRequest: () => request }),
    // Reflector reads metadata via `getHandler` + `getClass`; for the
    // unit tests here they only need to be defined objects (not real fn).
    getHandler: () => jest.fn(),
    getClass: () => class {},
  };
  // Spread onto a fresh ExecutionContext stub so NestJS internals are
  // irrelevant; only the methods JwtAuthGuard invokes are wired.
  return ctx as unknown as ExecutionContext;
}

function createMockAuthService() {
  return {
    buildContext: jest.fn(),
  };
}

function createMockReflector(isPublic: boolean): jest.Mocked<Reflector> {
  return {
    getAllAndOverride: jest.fn(() => (isPublic ? true : undefined)),
  } as unknown as jest.Mocked<Reflector>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let mockAuthService: ReturnType<typeof createMockAuthService>;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService = createMockAuthService();
    mockReflector = createMockReflector(false);
    guard = new JwtAuthGuard(
      mockAuthService as unknown as AuthService,
      mockReflector,
    );
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------
  describe("happy path — valid Bearer token", () => {
    it("attaches AuthContext to request.user and returns true", async () => {
      const ctx: AuthContext = {
        uid: "uid-001",
        email: "user@example.com",
        rol: "member",
      };
      mockAuthService.buildContext.mockResolvedValue(ctx);
      const request = createMockRequest({
        authorization: "Bearer valid-token",
      });

      const result = await guard.canActivate(
        createMockContext(request, /* isPublic */ false),
      );

      expect(result).toBe(true);
      expect(request.user).toBe(ctx);
      expect(mockAuthService.buildContext).toHaveBeenCalledWith("valid-token");
    });
  });

  // -------------------------------------------------------------------------
  // Header ausente
  // -------------------------------------------------------------------------
  describe("header missing", () => {
    it("throws UnauthorizedException when Authorization header is absent", async () => {
      const request = createMockRequest({});

      await expect(
        guard.canActivate(createMockContext(request, false)),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.buildContext).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Header mal formado (no "Bearer ")
  // -------------------------------------------------------------------------
  describe("header malformed", () => {
    it.each([
      ["raw token without Bearer prefix", "raw-token"],
      ["empty value", ""],
      ["Basic auth", "Basic abc123"],
      ["Bearer with no token", "Bearer "],
      ["Bearer with whitespace only", "Bearer   "],
    ])("throws UnauthorizedException for '%s'", async (_label, headerValue) => {
      const request = createMockRequest({ authorization: headerValue });

      await expect(
        guard.canActivate(createMockContext(request, false)),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.buildContext).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // verifyIdToken throw → 401 (mapped by guard from any non-Forbidden error)
  // -------------------------------------------------------------------------
  describe("AuthService rejects (verifyIdToken throws)", () => {
    it("translates an arbitrary error into UnauthorizedException (401)", async () => {
      mockAuthService.buildContext.mockRejectedValue(
        new Error("Token expired"),
      );
      const request = createMockRequest({
        authorization: "Bearer expired-or-revoked-token",
      });

      await expect(
        guard.canActivate(createMockContext(request, false)),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // ForbiddenException (orphan) → 403 (propagate, do NOT remap to 401)
  // -------------------------------------------------------------------------
  describe("AuthService throws ForbiddenException (orphan user)", () => {
    it("propagates ForbiddenException (403) untouched", async () => {
      const forbidden = new ForbiddenException(
        "user has not been provisioned in the usuarios collection",
      );
      mockAuthService.buildContext.mockRejectedValue(forbidden);
      const request = createMockRequest({
        authorization: "Bearer orphan-token",
      });

      await expect(
        guard.canActivate(createMockContext(request, false)),
      ).rejects.toThrow(ForbiddenException);
      // Sanity: the rejection must be the SAME instance, not a thrown copy.
      try {
        await guard.canActivate(createMockContext(request, false));
        fail("expected guard to throw");
      } catch (e) {
        expect(e).toBe(forbidden);
      }
    });
  });

  // -------------------------------------------------------------------------
  // @Public() decorator → short-circuit true
  // -------------------------------------------------------------------------
  describe("@Public() forward-compat", () => {
    it("returns true WITHOUT calling buildContext when IS_PUBLIC metadata is set", async () => {
      // Wire a NEW guard with a reflector that reports public=true.
      const publicReflector = createMockReflector(true);
      const publicGuard = new JwtAuthGuard(
        mockAuthService as unknown as AuthService,
        publicReflector,
      );
      const request = createMockRequest({}); // no Authorization header at all

      const result = await publicGuard.canActivate(
        createMockContext(request, /* isPublic */ true),
      );

      expect(result).toBe(true);
      expect(mockAuthService.buildContext).not.toHaveBeenCalled();
      expect(publicReflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        [expect.any(Function), expect.any(Function)],
      );
    });
  });
});

/** Tiny `fail()` shim — Jasmine exposes `fail` globally; this keeps the
 * style explicit for editors that flag bare `fail()`. */
function fail(message: string): never {
  throw new Error(message);
}
