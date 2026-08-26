/**
 * Unit tests for `AuthService.buildContext` (Task 7.1).
 *
 * Mocks `FirebaseService` (`verifyIdToken`) and `AuthContextRepository`
 * (`getRolByUid`). Verifies the rol-resolution contract from
 * `openspec/changes/auth-usuarios/design.md` Decision 2:
 *
 *  1. custom claim `rol` present and valid  → use it, NO Firestore read.
 *  2. custom claim absent                   → fallback `getRolByUid`.
 *  3. neither resolves a valid rol           → `ForbiddenException`
 *     with canonical message "user has not
 *     been provisioned in the usuarios collection".
 *  4. custom claim with `rol` outside ROL_VALUES → ignore it, fallback.
 *
 * Additionally covers the post-`auth-usuarios-v2` context shape:
 *
 *  - `AuthContext` is exactly `{ uid, email, rol }`. A legacy `placeId`
 *    claim lingering in a token MUST NOT propagate into the context
 *    (the user→place relation lives in `places.usuarioId`, not in the
 *    auth mirror).

 *
 * Uses NestJS `Test.createTestingModule` so DI resolves
 * `@Inject(AUTH_CONTEXT_REPOSITORY)` against the real `AuthService`
 * constructor — this is what the production wiring (`AuthModule`) will
 * also do.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AUTH_CONTEXT_REPOSITORY } from "../domain/auth-context-repository.token";
import { FirebaseService } from "@/common/services/firebase.service";
import type { AuthContext } from "../domain/auth-context.interface";
import { ROL_VALUES } from "../domain/rol.enum";

// Mock the FirebaseService MODULE so `firebase-admin` is never loaded in
// jest (matches the pattern of `usuarios-firestore.adapter.spec.ts`). The
// `FirebaseService` symbol remains referenciable as a DI token below even
// though the class body is replaced with an empty constructor.
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

/** Minimal `Partial<DecodedIdToken>` shape used as the verifyIdToken return. */
type DecodedTokenStub = {
  uid: string;
  email?: string;
  rol?: string;
  placeId?: string;
};

function createMockFirebase() {
  return {
    verifyIdToken: jest.fn(),
  };
}

function createMockAuthContextRepository() {
  return {
    getRolByUid: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AuthService.buildContext", () => {
  let service: AuthService;
  let mockFirebase: ReturnType<typeof createMockFirebase>;
  let mockRolRepo: ReturnType<typeof createMockAuthContextRepository>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFirebase = createMockFirebase();
    mockRolRepo = createMockAuthContextRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AUTH_CONTEXT_REPOSITORY, useValue: mockRolRepo },
        { provide: FirebaseService, useValue: mockFirebase },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // -------------------------------------------------------------------------
  // Case 1 — custom claim presente y válido → usar, NO consulta Firestore
  // -------------------------------------------------------------------------
  describe("Case 1 — custom claim 'rol' present and valid", () => {
    it.each(ROL_VALUES as unknown as string[])(
      "uses the claim '%s' and does NOT query Firestore",
      async (rol) => {
        const token: DecodedTokenStub = {
          uid: "uid-001",
          email: "user@example.com",
          rol,
        };
        mockFirebase.verifyIdToken.mockResolvedValue(token);

        const ctx = await service.buildContext("raw-token");

        expect(ctx.rol).toBe(rol);
        expect(ctx.uid).toBe("uid-001");
        expect(ctx.email).toBe("user@example.com");
        expect(mockRolRepo.getRolByUid).not.toHaveBeenCalled();
      },
    );

    it("does NOT propagate a legacy placeId claim into the context", async () => {
      const token: DecodedTokenStub = {
        uid: "uid-owner-001",
        email: "owner@example.com",
        rol: "owner",
        placeId: "restaurante-el-marino",
      };
      mockFirebase.verifyIdToken.mockResolvedValue(token);

      const ctx: AuthContext = await service.buildContext("raw-token");

      expect(ctx).toEqual({
        uid: "uid-owner-001",
        email: "owner@example.com",
        rol: "owner",
      });
    });
  });

  // -------------------------------------------------------------------------
  // Case 2 — custom claim ausente → fallback a Firestore
  // -------------------------------------------------------------------------
  describe("Case 2 — custom claim absent → Firestore fallback", () => {
    it("falls back to authContextRepository.getRolByUid when the claim is missing", async () => {
      const token: DecodedTokenStub = {
        uid: "uid-001",
        email: "user@example.com",
        // no `rol` claim
      };
      mockFirebase.verifyIdToken.mockResolvedValue(token);
      mockRolRepo.getRolByUid.mockResolvedValue("member");

      const ctx = await service.buildContext("raw-token");

      expect(ctx.rol).toBe("member");
      expect(mockRolRepo.getRolByUid).toHaveBeenCalledWith("uid-001");
    });
  });

  // -------------------------------------------------------------------------
  // Case 3 — ni claim ni Firestore resuelven → ForbiddenException
  // -------------------------------------------------------------------------
  describe("Case 3 — neither claim nor Firestore resolves a rol", () => {
    it("throws ForbiddenException with the canonical message when the usuarios doc is missing", async () => {
      const token: DecodedTokenStub = {
        uid: "uid-orphan",
        email: "orphan@example.com",
      };
      mockFirebase.verifyIdToken.mockResolvedValue(token);
      mockRolRepo.getRolByUid.mockResolvedValue(undefined);

      await expect(service.buildContext("raw-token")).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.buildContext("raw-token")).rejects.toThrow(
        /user has not been provisioned in the usuarios collection/,
      );
    });

    it("passes the verifyIdToken call to FirebaseService exactly once", async () => {
      const token: DecodedTokenStub = {
        uid: "uid-orphan",
        email: "orphan@example.com",
      };
      mockFirebase.verifyIdToken.mockResolvedValue(token);
      mockRolRepo.getRolByUid.mockResolvedValue(undefined);

      await expect(service.buildContext("raw-token")).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockFirebase.verifyIdToken).toHaveBeenCalledTimes(1);
      // Default `checkRevoked = true` is the safe production default.
      expect(mockFirebase.verifyIdToken).toHaveBeenCalledWith(
        "raw-token",
        true,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Case 4 — claim con rol inválido (no en ROL_VALUES) → ignora, fallback
  // -------------------------------------------------------------------------
  describe("Case 4 — custom claim 'rol' is outside ROL_VALUES", () => {
    it("ignores the invalid claim and falls back to Firestore", async () => {
      const token: DecodedTokenStub = {
        uid: "uid-001",
        email: "user@example.com",
        rol: "superadmin", // not a valid Rol
      };
      mockFirebase.verifyIdToken.mockResolvedValue(token);
      mockRolRepo.getRolByUid.mockResolvedValue("member");

      const ctx = await service.buildContext("raw-token");

      expect(ctx.rol).toBe("member"); // resolved from Firestore, NOT the claim
      expect(mockRolRepo.getRolByUid).toHaveBeenCalledWith("uid-001");
    });

    it("throws ForbiddenException if Firestore fallback ALSO returns nothing (claim was invalid + no doc)", async () => {
      const token: DecodedTokenStub = {
        uid: "uid-orphan",
        email: "orphan@example.com",
        rol: "superadmin", // invalid claim
      };
      mockFirebase.verifyIdToken.mockResolvedValue(token);
      mockRolRepo.getRolByUid.mockResolvedValue(undefined); // and no doc

      await expect(service.buildContext("raw-token")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
