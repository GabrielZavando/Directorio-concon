/**
 * E2E for the CH-05 `solicitudes-refactor` change (Task 9).
 *
 * Boots the REAL AppModule (guards, controllers, services, adapters all wired
 * for production). Only `FirebaseService` is mocked at module level, so
 * `firebase-admin`'s ESM deps never load and every Auth/Firestore interaction
 * is an in-memory stub.
 *
 * CH-05 wiring note: `SolicitudesModule` imports `PlacesModule` via
 * `forwardRef` (and vice-versa), so `PLACE_APPROVAL_HANDLER` resolves at
 * runtime — the `reclamo-place` approve/reject flow reaches the place handler
 * (place ownership transfer + sibling auto-reject) instead of 500ing.
 *
 * Covers (tasks.md Task 9):
 *  - 9.1 owner reclama place → admin lists queue → approves → place.usuarioId
 *    assigned + other pending reclamos auto-rejected.
 *  - 9.2 owner reclama → admin rejects with `comentarios` → place unmodified,
 *    solicitud `rechazado`.
 *  - 9.3 guards of `GET /solicitudes` — owner 403, anonymous 401, admin 200.
 *  - 9.4 `POST /solicitudes/:id/approve` over an already-reviewed solicitud → 409.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { FirebaseService } from "../src/common/services/firebase.service";

// Mock the FirebaseService MODULE so `firebase-admin`'s ESM-only deps are
// never loaded by jest, and every Firestore/Auth call is an in-memory stub.
jest.mock("../src/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
    getDocument: jest.fn(),
    getDocuments: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    deleteDocument: jest.fn(),
    getFirestore: jest.fn(),
    getCollection: jest.fn(),
    getCurrentTimestamp: jest.fn(() => ({
      toDate: () => new Date("2026-06-01"),
    })),
    dateToTimestamp: jest.fn((d: Date) => ({ toDate: () => d })),
    timestampToDate: jest.fn((t: unknown) => {
      if (t && typeof t === "object" && "toDate" in t) {
        return (t as { toDate: () => Date }).toDate();
      }
      return null;
    }),
    documentExists: jest.fn(),
  })),
}));

type MockFirebase = {
  verifyIdToken: jest.Mock;
  getDocument: jest.Mock;
  getDocuments: jest.Mock;
  createDocument: jest.Mock;
  updateDocument: jest.Mock;
  deleteDocument: jest.Mock;
  getFirestore: jest.Mock;
  getCollection: jest.Mock;
  getCurrentTimestamp: jest.Mock;
  dateToTimestamp: jest.Mock;
  timestampToDate: jest.Mock;
  documentExists: jest.Mock;
};

/** Firestore-style doc payload for a `reclamo-place` solicitud row. */
function solicitudDoc(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    exists: true,
    data: () => ({
      placeId: "place-1",
      usuarioId: null,
      tipo: "reclamo-place",
      status: "pendiente",
      solicitanteUid: "uid-owner-a",
      createdAt: { toDate: () => new Date("2026-06-01") },
      ...overrides,
    }),
  };
}

/** Firestore-style doc payload for a place row. */
function placeDoc(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    exists: true,
    data: () => ({
      nombre: "Restaurante El Marino",
      slug: "restaurante-el-marino",
      descripcionCorta: "Mariscos frescos",
      descripcion: "Restaurante familiar especializado en mariscos",
      categoriaId: "gastronomia",
      barrioId: "higuerillas",
      direccion: "Av. Borgoño 123",
      planId: "gratuito",
      abierto24x7: false,
      estadoVerificacion: "pendiente",
      gestionadoPorAdmin: true,
      destacado: false,
      usuarioId: null,
      activo: true,
      createdAt: { toDate: () => new Date("2026-01-01") },
      updatedAt: { toDate: () => new Date("2026-01-01") },
      ...overrides,
    }),
  };
}

describe("Solicitudes E2E (real AppModule)", () => {
  let app: INestApplication;
  let firebase: MockFirebase;

  async function bootApp(): Promise<void> {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    firebase = moduleRef.get(FirebaseService) as unknown as MockFirebase;
  }

  /** Stub the Firestore query chain used by findPendingQueue + findPendingReclamosByPlaceId. */
  function stubFirestore(options: {
    queueCount: number;
    queueDocs: ReturnType<typeof solicitudDoc>[];
    siblings: ReturnType<typeof solicitudDoc>[];
  }): void {
    const dataGet = jest.fn().mockResolvedValue({
      empty: options.queueDocs.length === 0,
      docs: options.queueDocs,
    } as never);
    const countGet = jest.fn().mockResolvedValue({
      data: () => ({ count: options.queueCount }),
    } as never);
    const siblingGet = jest.fn().mockResolvedValue({
      empty: options.siblings.length === 0,
      docs: options.siblings,
    } as never);
    const chain = {
      // `where` lets nested `.where()` chain on compound queries (tipo+status+...).
      // Assigned below after `where` is created (satisfies TS circular ref).
      where: null as unknown as jest.Mock,
      count: jest.fn().mockReturnValue({ get: countGet }),
      orderBy: jest.fn().mockReturnValue({
        offset: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ get: dataGet }),
        }),
      }),
      get: siblingGet,
    };
    const where = jest.fn().mockReturnValue(chain);
    chain.where = where;
    firebase.getFirestore.mockReturnValue({
      collection: jest.fn().mockReturnValue({ where }),
    } as never);
  }

  /** Auth as a given rol; optionally reject (unused anonymous path handled by missing header). */
  function authAs(uid: string, rol: "admin" | "owner" | "member"): void {
    firebase.verifyIdToken.mockResolvedValue({
      uid,
      email: `${uid}@e2e.cl`,
      rol,
    } as never);
  }

  beforeAll(async () => {
    await bootApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // 9.1 — owner reclama → admin lista → aprueba → transfer + sibling auto-reject
  // =========================================================================
  describe("9.1 claim → list → approve (transfer + auto-reject siblings)", () => {
    it("owner claims place; admin sees it in the queue; approve transfers usuarioId and auto-rejects the sibling reclamo", async () => {
      authAs("uid-owner-a", "owner");
      // Place exists, unclaimed.
      firebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "places" && id === "place-1") {
            return Promise.resolve(placeDoc("place-1") as never);
          }
          if (collection === "solicitudes") {
            return Promise.resolve(
              solicitudDoc(id, {
                placeId: "place-1",
                solicitanteUid: "uid-owner-a",
              }) as never,
            );
          }
          return Promise.resolve({
            exists: false,
            id,
            data: () => null,
          } as never);
        },
      );
      firebase.createDocument.mockResolvedValue({ id: "sol-a" } as never);

      // Owner A claims the place.
      await request(app.getHttpServer())
        .post("/places/place-1/reclamar")
        .set("Authorization", "Bearer t-owner-a")
        .expect(201);
      expect(firebase.createDocument).toHaveBeenCalledWith(
        "solicitudes",
        expect.objectContaining({
          placeId: "place-1",
          tipo: "reclamo-place",
          status: "pendiente",
          solicitanteUid: "uid-owner-a",
        }),
      );

      // Owner B claims the same place too (second pending reclamo).
      authAs("uid-owner-b", "owner");
      firebase.createDocument.mockResolvedValue({ id: "sol-b" } as never);
      await request(app.getHttpServer())
        .post("/places/place-1/reclamar")
        .set("Authorization", "Bearer t-owner-b")
        .expect(201);

      // Admin lists the pending queue: both reclamos appear.
      authAs("uid-admin", "admin");
      stubFirestore({
        queueCount: 2,
        queueDocs: [
          solicitudDoc("sol-a", {
            placeId: "place-1",
            solicitanteUid: "uid-owner-a",
          }),
          solicitudDoc("sol-b", {
            placeId: "place-1",
            solicitanteUid: "uid-owner-b",
          }),
        ],
        siblings: [],
      });
      const list = await request(app.getHttpServer())
        .get("/solicitudes?status=pendiente")
        .set("Authorization", "Bearer t-admin")
        .expect(200);
      expect(list.body.meta.total).toBe(2);
      expect(list.body.data).toHaveLength(2);
      expect(list.body.data[0].tipo).toBe("reclamo-place");

      // Approve sol-a. The place handler:
      //  - placeRepo.update → getDocument(places) x2 + updateDocument(places)
      //  - findPendingReclamosByPlaceId → siblings [sol-b] → auto-reject sol-b
      //  - repo.update(sol-a) → updateDocument + getDocument
      firebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "places" && id === "place-1") {
            return Promise.resolve(placeDoc("place-1") as never);
          }
          if (collection === "solicitudes" && id === "sol-a") {
            const reviewed = firebase.updateDocument.mock.calls.some(
              ([c, docId]) => c === "solicitudes" && docId === "sol-a",
            );
            return Promise.resolve(
              solicitudDoc("sol-a", {
                status: reviewed ? "aprobado" : "pendiente",
                solicitanteUid: "uid-owner-a",
                revisadoPor: reviewed ? "uid-admin" : undefined,
              }) as never,
            );
          }
          if (collection === "solicitudes" && id === "sol-b") {
            return Promise.resolve(
              solicitudDoc("sol-b", {
                solicitanteUid: "uid-owner-b",
              }) as never,
            );
          }
          return Promise.resolve({
            exists: false,
            id,
            data: () => null,
          } as never);
        },
      );
      firebase.updateDocument.mockResolvedValue(undefined);
      stubFirestore({
        queueCount: 0,
        queueDocs: [],
        siblings: [solicitudDoc("sol-b", { solicitanteUid: "uid-owner-b" })],
      });

      const approved = await request(app.getHttpServer())
        .post("/solicitudes/sol-a/approve")
        .set("Authorization", "Bearer t-admin")
        .expect(201);

      expect(approved.body.revisadoPor).toBe("uid-admin");
      expect(approved.body.tipo).toBe("reclamo-place");
      // Place ownership transferred to the approved claimant + admin management off.
      expect(firebase.updateDocument).toHaveBeenCalledWith(
        "places",
        "place-1",
        expect.objectContaining({
          usuarioId: "uid-owner-a",
          gestionadoPorAdmin: false,
        }),
      );
      // Sibling sol-b was auto-rejected.
      expect(firebase.updateDocument).toHaveBeenCalledWith(
        "solicitudes",
        "sol-b",
        expect.objectContaining({ status: "rechazado" }),
      );
      expect(firebase.updateDocument).toHaveBeenCalledWith(
        "solicitudes",
        "sol-a",
        expect.objectContaining({
          status: "aprobado",
          revisadoPor: "uid-admin",
        }),
      );
    });
  });

  // =========================================================================
  // 9.2 — owner reclama → admin rechaza con comentarios → place sin modificar
  // =========================================================================
  describe("9.2 reject with comentarios → place unmodified, solicitud rechazado", () => {
    it("admin rejects a pending reclamo with a note; the place is left untouched", async () => {
      authAs("uid-owner-a", "owner");
      firebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "places" && id === "place-1") {
            return Promise.resolve(placeDoc("place-1") as never);
          }
          if (collection === "solicitudes" && id === "sol-a") {
            const reviewed = firebase.updateDocument.mock.calls.some(
              ([c, docId]) => c === "solicitudes" && docId === "sol-a",
            );
            return Promise.resolve(
              solicitudDoc("sol-a", {
                status: reviewed ? "rechazado" : "pendiente",
                comentarios: reviewed ? "Documentación incompleta" : undefined,
                solicitanteUid: "uid-owner-a",
                revisadoPor: reviewed ? "uid-admin" : undefined,
              }) as never,
            );
          }
          return Promise.resolve({
            exists: false,
            id,
            data: () => null,
          } as never);
        },
      );
      firebase.createDocument.mockResolvedValue({ id: "sol-a" } as never);
      await request(app.getHttpServer())
        .post("/places/place-1/reclamar")
        .set("Authorization", "Bearer t-owner-a")
        .expect(201);

      // Admin rejects with a note.
      authAs("uid-admin", "admin");
      firebase.updateDocument.mockResolvedValue(undefined);
      stubFirestore({ queueCount: 0, queueDocs: [], siblings: [] });
      const rejected = await request(app.getHttpServer())
        .post("/solicitudes/sol-a/reject")
        .set("Authorization", "Bearer t-admin")
        .send({ comentarios: "Documentación incompleta" })
        .expect(201);

      expect(rejected.body.status).toBe("rechazado");
      expect(rejected.body.comentarios).toBe("Documentación incompleta");
      expect(rejected.body.revisadoPor).toBe("uid-admin");
      // Place was NOT modified (no place update happened).
      expect(firebase.updateDocument).not.toHaveBeenCalledWith(
        "places",
        "place-1",
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // 9.3 — guards of GET /solicitudes (owner 403, anonymous 401, admin 200)
  // =========================================================================
  describe("9.3 GET /solicitudes guards", () => {
    it("owner → 403 (RolesGuard short-circuit, service not reached)", async () => {
      authAs("uid-owner-a", "owner");
      const res = await request(app.getHttpServer())
        .get("/solicitudes")
        .set("Authorization", "Bearer t-owner");
      expect(res.status).toBe(403);
    });

    it("anónimo (no Authorization header) → 401 (JwtAuthGuard)", async () => {
      const res = await request(app.getHttpServer()).get("/solicitudes");
      expect(res.status).toBe(401);
    });

    it("admin → 200 with { data, meta } envelope", async () => {
      authAs("uid-admin", "admin");
      stubFirestore({
        queueCount: 1,
        queueDocs: [solicitudDoc("sol-a", { solicitanteUid: "uid-owner-a" })],
        siblings: [],
      });
      const res = await request(app.getHttpServer())
        .get("/solicitudes?status=pendiente")
        .set("Authorization", "Bearer t-admin");
      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].tipo).toBe("reclamo-place");
    });
  });

  // =========================================================================
  // 9.4 — approve over an already-reviewed solicitud → 409
  // =========================================================================
  describe("9.4 approve already-reviewed → 409", () => {
    it("admin approves a solicitud that is no longer pendiente → 409", async () => {
      authAs("uid-admin", "admin");
      // Solicitud already approved (status != pendiente).
      firebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "solicitudes" && id === "sol-a") {
            return Promise.resolve(
              solicitudDoc("sol-a", {
                status: "aprobado",
                solicitanteUid: "uid-owner-a",
                revisadoPor: "uid-admin",
              }) as never,
            );
          }
          return Promise.resolve({
            exists: false,
            id,
            data: () => null,
          } as never);
        },
      );
      const res = await request(app.getHttpServer())
        .post("/solicitudes/sol-a/approve")
        .set("Authorization", "Bearer t-admin");
      expect(res.status).toBe(409);
    });
  });
});
