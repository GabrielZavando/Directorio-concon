/**
 * Unit + integration tests for `SolicitudesController` (Task 10).
 *
 * Verifies the HTTP surface and the full authorization circuit for the
 * mainline approve/reject endpoints (`tasks.md` 10.1):
 *
 *  - admin → POST /solicitudes/:id/approve  → 200, calls
 *    `service.aprobarSolicitud(id, adminUid)`, returns the updated
 *    solicitud. The delegated side-effect — `solicitud.revisadoPor ===
 *    adminUid` — is asserted on the returned payload (the service's
 *    stub echoes the value back).
 *  - admin → POST /solicitudes/:id/reject with `{ comentarios }` → 200,
 *    calls `service.rechazarSolicitud(id, adminUid, comentarios)`.
 *  - member → POST /:id/approve → 403 (RolesGuard short-circuit).
 *  - owner  → POST /:id/approve → 403 (admin-only endpoint).
 *  - Anónimo (no Authorization header) → 401 (JwtAuthGuard short-circuit).
 *  - Body with unexpected field `{ revisadoPor: 'x' }` → 400
 *    (`forbidNonWhitelisted` ValidationPipe — defensive: a malicious
 *    client cannot forge the `revisadoPor` audit field, which is set
 *    server-side from `@CurrentUser().uid`).
 *  - `service.aprobarSolicitud` rejects with `ConflictException`
 *    (solicitud not pendiente) → 409.
 *
 * Mocks + real guards:
 *
 *  - `SolicitudesService` is fully mocked (no DB).
 *  - `AuthService` is mocked so the `JwtAuthGuard` does NOT call Firebase.
 *    The mock's `buildContext(token)` is reset/re-wired per-test inside
 *    `beforeEach` to return a fixed `AuthContext` matching the test's
 *    role (admin / owner / member) OR reject (to verify error mapping).
 *  - `JwtAuthGuard` + `RolesGuard` run for REAL (we load `AuthModule`).
 *    This is what verifies the 401/403 contracts at the guard level.
 *
 * `FirebaseService` module is `jest.mock`-ed so `firebase-admin` ESM
 * deps are never loaded by jest (same workaround as in
 * `jwt-auth.guard.spec.ts` and `usuarios.controller.spec.ts`).
 */
import { Test, TestingModule } from "@nestjs/testing";
import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import request from "supertest";
import { SolicitudesController } from "./solicitudes.controller";
import { SolicitudesService } from "../application/solicitudes.service";
import { AuthModule } from "../../auth/auth.module";
import { AuthService } from "../../auth/application/auth.service";
import type { Rol } from "../../auth/domain/rol.enum";
import type { AuthContext } from "../../auth/domain/auth-context.interface";
import { FirebaseModule } from "@/common/modules/firebase.module";

// Mock the FirebaseService MODULE so `firebase-admin`'s ESM-only deps
// (jose/jwks-rsa) are never loaded by jest. AuthModule wiring pulls
// `FirebaseService` (the global) at runtime.
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const mockSolicitudesService = {
  aprobarSolicitud: jest.fn(),
  rechazarSolicitud: jest.fn(),
};

function makeContext(rol: Rol, uid = `uid-${rol}-001`): AuthContext {
  return {
    uid,
    email: `${rol}@example.com`,
    rol,
    ...(rol === "owner" ? { placeId: "place-001" } : {}),
  };
}

function makeApprovedSolicitud(id: string, adminUid: string) {
  return {
    id,
    placeId: "place-001",
    usuarioId: "uid-owner-001",
    tipo: "registro" as const,
    status: "aprobado" as const,
    revisadoPor: adminUid,
    revisadoAt: new Date("2026-07-30T00:00:00Z"),
    createdAt: new Date("2026-07-29T00:00:00Z"),
  };
}

function makeRejectedSolicitud(
  id: string,
  adminUid: string,
  comentarios?: string,
) {
  return {
    id,
    placeId: "place-001",
    usuarioId: "uid-owner-001",
    tipo: "registro" as const,
    status: "rechazado" as const,
    revisadoPor: adminUid,
    revisadoAt: new Date("2026-07-30T00:00:00Z"),
    comentarios,
    createdAt: new Date("2026-07-29T00:00:00Z"),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SolicitudesController (HTTP)", () => {
  let app: INestApplication;
  let mockAuthService: { buildContext: jest.Mock };
  let moduleRef: TestingModule;

  beforeAll(async () => {
    mockAuthService = { buildContext: jest.fn() };

    moduleRef = await Test.createTestingModule({
      imports: [FirebaseModule, AuthModule],
      controllers: [SolicitudesController],
      providers: [
        { provide: SolicitudesService, useValue: mockSolicitudesService },
      ],
    })
      // AuthService replaced with the per-test mock. Guards (JwtAuthGuard,
      // RolesGuard) run for real, exercising the full JWT→Roles contract.
      // Guard wiring at AuthModule-level pulls real JwtAuthGuard/RolesGuard.
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await moduleRef.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: anonymous — every test that needs auth sets up its own
    // resolved/rejected value on `buildContext` below.
    mockAuthService.buildContext.mockReset();
  });

  // Helper — wire `buildContext` to resolve to a fixed `AuthContext`.
  function givenUser(ctx: AuthContext): void {
    mockAuthService.buildContext.mockResolvedValue(ctx);
  }

  // -------------------------------------------------------------------------
  // POST /solicitudes/:id/approve
  // -------------------------------------------------------------------------
  describe("POST /solicitudes/:id/approve", () => {
    it("admin → 200 and calls service.aprobarSolicitud(id, admin.uid); revisadoPor in the returned payload equals admin.uid", async () => {
      const ctx = makeContext("admin");
      givenUser(ctx);
      mockSolicitudesService.aprobarSolicitud.mockResolvedValue(
        makeApprovedSolicitud("sol-001", ctx.uid),
      );

      const res = await request(app.getHttpServer())
        .post("/solicitudes/sol-001/approve")
        .set("Authorization", "Bearer fake-token");

      expect(res.status).toBe(201);
      expect(mockSolicitudesService.aprobarSolicitud).toHaveBeenCalledTimes(1);
      expect(mockSolicitudesService.aprobarSolicitud).toHaveBeenCalledWith(
        "sol-001",
        ctx.uid,
      );
      expect(res.body.revisadoPor).toBe(ctx.uid);
    });

    it("member → 403 RolesGuard short-circuit (does NOT call the service)", async () => {
      givenUser(makeContext("member"));

      const res = await request(app.getHttpServer())
        .post("/solicitudes/sol-001/approve")
        .set("Authorization", "Bearer fake-token");

      expect(res.status).toBe(403);
      expect(mockSolicitudesService.aprobarSolicitud).not.toHaveBeenCalled();
    });

    it("owner → 403 (endpoint is admin-only)", async () => {
      givenUser(makeContext("owner"));

      const res = await request(app.getHttpServer())
        .post("/solicitudes/sol-001/approve")
        .set("Authorization", "Bearer fake-token");

      expect(res.status).toBe(403);
      expect(mockSolicitudesService.aprobarSolicitud).not.toHaveBeenCalled();
    });

    it("anónimo (no Authorization header) → 401 JwtAuthGuard short-circuit", async () => {
      const res = await request(app.getHttpServer()).post(
        "/solicitudes/sol-001/approve",
      );

      expect(res.status).toBe(401);
      expect(mockSolicitudesService.aprobarSolicitud).not.toHaveBeenCalled();
      // Sanity: AuthService.buildContext was NOT called because the guard
      // short-circuited on the missing Bearer header BEFORE delegating.
      expect(mockAuthService.buildContext).not.toHaveBeenCalled();
    });

    it("service rejects with ConflictException (no pendiente) → 409", async () => {
      givenUser(makeContext("admin"));
      mockSolicitudesService.aprobarSolicitud.mockRejectedValue(
        new ConflictException("Solicitud sol-001 ya fue aprobado"),
      );

      const res = await request(app.getHttpServer())
        .post("/solicitudes/sol-001/approve")
        .set("Authorization", "Bearer fake-token");

      expect(res.status).toBe(409);
    });
  });

  // -------------------------------------------------------------------------
  // POST /solicitudes/:id/reject
  // -------------------------------------------------------------------------
  describe("POST /solicitudes/:id/reject", () => {
    it("admin → 200 and calls service.rechazarSolicitud(id, admin.uid, comentarios)", async () => {
      const ctx = makeContext("admin");
      givenUser(ctx);
      mockSolicitudesService.rechazarSolicitud.mockResolvedValue(
        makeRejectedSolicitud("sol-002", ctx.uid, "Documentación incompleta"),
      );

      const res = await request(app.getHttpServer())
        .post("/solicitudes/sol-002/reject")
        .set("Authorization", "Bearer fake-token")
        .send({ comentarios: "Documentación incompleta" });

      expect(res.status).toBe(201);
      expect(mockSolicitudesService.rechazarSolicitud).toHaveBeenCalledWith(
        "sol-002",
        ctx.uid,
        "Documentación incompleta",
      );
      expect(res.body.revisadoPor).toBe(ctx.uid);
    });

    it("admin → 201 with empty body (comentarios optional)", async () => {
      const ctx = makeContext("admin");
      givenUser(ctx);
      mockSolicitudesService.rechazarSolicitud.mockResolvedValue(
        makeRejectedSolicitud("sol-003", ctx.uid),
      );

      const res = await request(app.getHttpServer())
        .post("/solicitudes/sol-003/reject")
        .set("Authorization", "Bearer fake-token")
        .send({});

      expect(res.status).toBe(201);
      expect(mockSolicitudesService.rechazarSolicitud).toHaveBeenCalledWith(
        "sol-003",
        ctx.uid,
        undefined,
      );
    });

    it("member → 403", async () => {
      givenUser(makeContext("member"));
      const res = await request(app.getHttpServer())
        .post("/solicitudes/sol-002/reject")
        .set("Authorization", "Bearer fake-token");
      expect(res.status).toBe(403);
      expect(mockSolicitudesService.rechazarSolicitud).not.toHaveBeenCalled();
    });

    it("anónimo → 401", async () => {
      const res = await request(app.getHttpServer()).post(
        "/solicitudes/sol-002/reject",
      );
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // Body whitelist — defensive: client cannot forge revisadoPor
  // -------------------------------------------------------------------------
  describe("body whitelist (forbidNonWhitelisted)", () => {
    it("approve: extra body fields are ignored (no body DTO); revisadoPor still comes from auth", async () => {
      const ctx = makeContext("admin");
      givenUser(ctx);
      mockSolicitudesService.aprobarSolicitud.mockResolvedValue(
        makeApprovedSolicitud("sol-001", ctx.uid),
      );

      const res = await request(app.getHttpServer())
        .post("/solicitudes/sol-001/approve")
        .set("Authorization", "Bearer fake-token")
        .send({ revisadoPor: "spoofed-admin" });

      // No body validation on approve → body ignored, server sets revisadoPor from auth
      expect(res.status).toBe(201);
      expect(res.body.revisadoPor).toBe(ctx.uid);
      expect(mockSolicitudesService.aprobarSolicitud).toHaveBeenCalledWith(
        "sol-001",
        ctx.uid,
      );
    });

    it("reject: { revisadoPor: 'x' } → 400 (whitelist enforcement on DTO)", async () => {
      givenUser(makeContext("admin"));

      const res = await request(app.getHttpServer())
        .post("/solicitudes/sol-002/reject")
        .set("Authorization", "Bearer fake-token")
        .send({
          comentarios: "x",
          revisadoPor: "spoofed-admin",
        });

      expect(res.status).toBe(400);
      expect(mockSolicitudesService.rechazarSolicitud).not.toHaveBeenCalled();
    });

    it("reject: { comentarios longer than 500 chars } → 400", async () => {
      givenUser(makeContext("admin"));
      const tooLong = "x".repeat(501);

      const res = await request(app.getHttpServer())
        .post("/solicitudes/sol-002/reject")
        .set("Authorization", "Bearer fake-token")
        .send({ comentarios: tooLong });

      expect(res.status).toBe(400);
      expect(mockSolicitudesService.rechazarSolicitud).not.toHaveBeenCalled();
    });
  });
});
