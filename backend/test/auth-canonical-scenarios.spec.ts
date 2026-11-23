/**
 * E2E canonical scenarios for the `auth-usuarios` change (Task 14).
 *
 * Boots the REAL AppModule — guards, controllers, services and adapters all
 * run with production wiring. Only `FirebaseService` is mocked (module-level
 * `jest.mock`), so `firebase-admin`'s ESM-only deps are never loaded and
 * every Auth/Firestore call is an in-memory stub configured per scenario.
 *
 * The three scenarios close the authentication debts documented in
 * `docs/data-model.md §usuarios` ("Authentication debt — [CLOSED]"):
 *
 *  A. Owner creates evento → `usuarioId === token.uid` (debt #2 closed).
 *     No `x-usuario-id` header is sent; the uid comes from the verified
 *     Firebase idToken.
 *  B. Member attempts `POST /places` → 403 (debt #1 closed — the
 *     `@Roles('owner')` gate rejects non-owners before the service runs).
 *  C. Admin approves a solicitud → `revisadoPor === uid del admin`
 *     (debt #3 closed — `revisadoPor` is captured from `@CurrentUser().uid`,
 *     not from any body/header field).
 */
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { FirebaseService } from "../src/common/services/firebase.service";

// Mock the FirebaseService MODULE so `firebase-admin`'s ESM-only deps
// (jose/jwks-rsa) are never loaded by jest, and every Firestore/Auth
// interaction is an in-memory stub.
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

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

/** The mock surface exposed by the module-level FirebaseService stub. */
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

/** Valid POST /eventos body (passes CreateEventoDto + EventoValidator). */
const validCreateEventoBody = {
  nombre: "Feria Gastronómica E2E",
  descripcionCorta: "Degustación de platos típicos",
  descripcion: "Una feria con más de 30 stands de comida típica de la región.",
  subcategoriaId: "ferias-gastronomicas",
  barrioId: "centro",
  organizador: "Municipalidad de Concón",
  modalidad: "presencial",
  ubicacion: {
    direccion: "Av. Concón 123",
    coordenadas: { lat: -32.92, lng: -71.51 },
  },
  fechaInicio: "2026-08-15T10:00:00.000Z",
  fechaFin: "2026-08-17T22:00:00.000Z",
  precioTipo: "gratis",
  precioValor: 0,
  publicoObjetivo: ["familia"],
  nivelRuido: "medio",
};

/** Valid POST /places body (passes CreatePlaceDto). */
const validCreatePlaceBody = {
  nombre: "Restaurante El Marino",
  descripcionCorta: "Mariscos frescos",
  descripcion: "Restaurante familiar especializado en mariscos",
  categoriaId: "gastronomia",
  barrioId: "higuerillas",
  direccion: "Av. Borgoño 123",
  planId: "gratuito",
};

// ---------------------------------------------------------------------------
// E2E suite
// ---------------------------------------------------------------------------
describe("Auth canonical scenarios (e2e, real AppModule)", () => {
  let app: INestApplication;
  let firebase: MockFirebase;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    // Singleton provider — all modules share this instance.
    firebase = moduleRef.get(FirebaseService) as unknown as MockFirebase;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Scenario A — owner creates evento → usuarioId === token.uid (debt #2)
  // =========================================================================
  describe("A. Owner creates evento → usuarioId === token.uid", () => {
    it("POST /eventos with owner Bearer → 201, evento persisted with token uid", async () => {
      // The verified idToken resolves to an owner WITHOUT any legacy header.
      firebase.verifyIdToken.mockResolvedValue({
        uid: "owner-uid-e2e",
        email: "owner@example.com",
        rol: "owner",
      } as never);

      // EventoValidator: barrio 'centro' exists.
      firebase.documentExists.mockResolvedValue(true);
      // Slug uniqueness check: no existing evento with that slug.
      firebase.getDocuments.mockResolvedValue({
        empty: true,
        docs: [],
      } as never);
      // Default document read → not found (falls back to created payloads).
      firebase.getDocument.mockImplementation(
        (collection: string, id: string) =>
          Promise.resolve({ exists: false, id, data: () => null }),
      );
      // Persist the evento only — visible immediately, no auto solicitud.
      firebase.createDocument.mockResolvedValueOnce({
        id: "evento-e2e-1",
      } as never);

      const response = await request(app.getHttpServer())
        .post("/eventos")
        .set("Authorization", "Bearer fake-idToken-owner")
        .send(validCreateEventoBody)
        .expect(201);

      // The created evento carries the uid from the verified token.
      expect(response.body.usuarioId).toBe("owner-uid-e2e");
      // The evento document was persisted with that uid (no header spoofing).
      expect(firebase.createDocument).toHaveBeenNthCalledWith(
        1,
        "eventos",
        expect.objectContaining({ usuarioId: "owner-uid-e2e" }),
      );
      // The guard verified the raw token with revocation check enabled.
      expect(firebase.verifyIdToken).toHaveBeenCalledWith(
        "fake-idToken-owner",
        true,
      );
    });
  });

  // =========================================================================
  // Scenario B — member cannot create places → 403 (debt #1)
  // =========================================================================
  describe("B. Member cannot create places → 403", () => {
    it("POST /places with member Bearer → 403 before PlacesService runs", async () => {
      firebase.verifyIdToken.mockResolvedValue({
        uid: "member-uid-e2e",
        email: "member@example.com",
        rol: "member",
      } as never);

      const response = await request(app.getHttpServer())
        .post("/places")
        .set("Authorization", "Bearer fake-idToken-member")
        .send(validCreatePlaceBody)
        .expect(403);

      // RolesGuard rejects the member explicitly.
      expect(response.body.message).toContain("member");
      // The place was never persisted (guard short-circuits the service).
      expect(firebase.createDocument).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Scenario C — admin approves solicitud → revisadoPor === admin uid (debt #3)
  // =========================================================================
  describe("C. Admin approves solicitud → revisadoPor === admin uid", () => {
    it("POST /solicitudes/:id/approve with admin Bearer → 201, revisadoPor from token", async () => {
      firebase.verifyIdToken.mockResolvedValue({
        uid: "admin-uid-e2e",
        email: "admin@example.com",
        rol: "admin",
      } as never);

      // Stateful solicitud read: pendiente until the approval update is
      // written, then aprobado + revisadoPor (mirrors the real adapter).
      // CH-05: solicitudes are `reclamo-place` only (the adapter forces the
      // tipo on read, so a legacy `actualizacion` doc is read back as
      // `reclamo-place`).
      firebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "solicitudes" && id === "sol-e2e-1") {
            const alreadyUpdated = firebase.updateDocument.mock.calls.some(
              ([c, docId]) => c === "solicitudes" && docId === "sol-e2e-1",
            );
            return Promise.resolve({
              exists: true,
              id: "sol-e2e-1",
              data: () =>
                alreadyUpdated
                  ? {
                      placeId: "place-1",
                      usuarioId: "owner-uid-e2e",
                      tipo: "reclamo-place",
                      status: "aprobado",
                      solicitanteUid: "owner-uid-e2e",
                      revisadoPor: "admin-uid-e2e",
                      createdAt: { toDate: () => new Date("2026-06-01") },
                      revisadoAt: { toDate: () => new Date("2026-06-01") },
                    }
                  : {
                      placeId: "place-1",
                      usuarioId: "owner-uid-e2e",
                      tipo: "reclamo-place",
                      status: "pendiente",
                      solicitanteUid: "owner-uid-e2e",
                      createdAt: { toDate: () => new Date("2026-06-01") },
                    },
            });
          }
          // Place read(s) for `placeRepo.update`'s findById (ownership transfer).
          if (collection === "places" && id === "place-1") {
            return Promise.resolve({
              exists: true,
              id: "place-1",
              data: () => ({
                nombre: "Restaurante El Marino",
                slug: "restaurante-el-marino",
                descripcionCorta: "Mariscos frescos",
                descripcion: "Restaurante familiar especializado en mariscos",
                categoriaId: "gastronomia",
                barrioId: "centro",
                direccion: "Av. Borgoño 123",
                planId: "gratuito",
                abierto24x7: false,
                estadoVerificacion: "pendiente",
                gestionadoPorAdmin: true,
                destacado: false,
                usuarioId: null,
                activo: true,
                createdAt: { toDate: () => new Date("2026-06-01") },
                updatedAt: { toDate: () => new Date("2026-06-01") },
              }),
            });
          }
          return Promise.resolve({ exists: false, id, data: () => null });
        },
      );
      firebase.updateDocument.mockResolvedValue(undefined);
      // findPendingReclamosByPlaceId → no other pending reclamos for the place
      // (the handler auto-rejects only the siblings, not the one approved).
      firebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                get: jest
                  .fn()
                  .mockResolvedValue({ empty: true, docs: [] } as never),
              }),
            }),
          }),
        }),
      } as never);

      const response = await request(app.getHttpServer())
        .post("/solicitudes/sol-e2e-1/approve")
        .set("Authorization", "Bearer fake-idToken-admin")
        .expect(201);

      // revisadoPor comes from the verified admin uid, not from the body.
      expect(response.body.revisadoPor).toBe("admin-uid-e2e");
      expect(firebase.updateDocument).toHaveBeenCalledWith(
        "solicitudes",
        "sol-e2e-1",
        expect.objectContaining({
          revisadoPor: "admin-uid-e2e",
          status: "aprobado",
        }),
      );
      // The handler transferred ownership (place.usuarioId = solicitud.solicitanteUid)
      // and disabled admin management on the place.
      expect(firebase.updateDocument).toHaveBeenCalledWith(
        "places",
        "place-1",
        expect.objectContaining({
          usuarioId: "owner-uid-e2e",
          gestionadoPorAdmin: false,
        }),
      );
    });
  });

  // =========================================================================
  // Scenario D — F-01: member cannot update a place → 403 (RolesGuard)
  // =========================================================================
  describe("D. F-01 — member cannot update places → 403", () => {
    it("PUT /places/:id with member Bearer → 403 before PlacesService.update", async () => {
      firebase.verifyIdToken.mockResolvedValue({
        uid: "member-uid-e2e",
        email: "member@example.com",
        rol: "member",
      } as never);

      const response = await request(app.getHttpServer())
        .put("/places/place-e2e-1")
        .set("Authorization", "Bearer fake-idToken-member")
        .send({ descripcionCorta: "Mariscos frescos y ceviche" })
        .expect(403);

      // RolesGuard rejects the member explicitly before the handler runs.
      expect(response.body.message).toContain("member");
      expect(firebase.updateDocument).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Scenario E — F-01: anonymous cannot delete a place → 401 (JwtAuthGuard)
  // =========================================================================
  describe("E. F-01 — anonymous cannot delete places → 401", () => {
    it("DELETE /places/:id without Authorization → 401 before RolesGuard", async () => {
      const response = await request(app.getHttpServer())
        .delete("/places/place-e2e-1")
        .expect(401);

      expect(response.body.message).toBeDefined();
      expect(firebase.deleteDocument).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Scenario F — F-01 ownership: owner cannot update a foreign place → 403
  // =========================================================================
  describe("F. F-01 ownership — owner cannot update a foreign place → 403", () => {
    it("PUT /places/:id with foreign owner Bearer → 403 from service, nothing persisted", async () => {
      firebase.verifyIdToken.mockResolvedValue({
        uid: "foreign-owner-uid-e2e",
        email: "foreign@example.com",
        rol: "owner",
      } as never);

      // The place belongs to a DIFFERENT owner (owner-uid-e2e).
      firebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "places" && id === "place-e2e-1") {
            return Promise.resolve({
              exists: true,
              id,
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
                status: "aprobado",
                verificado: false,
                destacado: false,
                usuarioId: "owner-uid-e2e",
                createdAt: { toDate: () => new Date("2026-01-01") },
                updatedAt: { toDate: () => new Date("2026-01-01") },
              }),
            });
          }
          return Promise.resolve({ exists: false, id, data: () => null });
        },
      );

      const response = await request(app.getHttpServer())
        .put("/places/place-e2e-1")
        .set("Authorization", "Bearer fake-idToken-foreign-owner")
        .send({ descripcionCorta: "Mariscos frescos y ceviche" })
        .expect(403);

      expect(response.body.message).toBe(
        "No tienes permiso para modificar este lugar",
      );
      expect(firebase.updateDocument).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Scenario G — F-02: owner claims a place → reclamo-place solicitud
  // persisted via the real repo (not stub). CH-05: claiming (not place
  // creation) is what creates a solicitud, and it is always `reclamo-place`.
  // =========================================================================
  describe("G. F-02 — owner claims place → reclamo-place solicitud persisted", () => {
    it("POST /places/:id/reclamar with owner Bearer → 201, reclamo-place solicitud created with real id", async () => {
      firebase.verifyIdToken.mockResolvedValue({
        uid: "owner-uid-e2e",
        email: "owner@example.com",
        rol: "owner",
      } as never);

      // The target place exists and is currently unclaimed (admin-managed).
      firebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "places" && id === "place-e2e-1") {
            return Promise.resolve({
              exists: true,
              id,
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
              }),
            });
          }
          // Solicitud read-back after creation.
          if (collection === "solicitudes") {
            return Promise.resolve({
              exists: true,
              id,
              data: () => ({
                placeId: "place-e2e-1",
                usuarioId: null,
                tipo: "reclamo-place",
                status: "pendiente",
                solicitanteUid: "owner-uid-e2e",
                createdAt: { toDate: () => new Date("2026-06-01") },
              }),
            });
          }
          return Promise.resolve({ exists: false, id, data: () => null });
        },
      );
      // createDocument → the created solicitud (real repo, not stub).
      firebase.createDocument.mockResolvedValueOnce({
        id: "sol-e2e-1",
      } as never);

      const response = await request(app.getHttpServer())
        .post("/places/place-e2e-1/reclamar")
        .set("Authorization", "Bearer fake-idToken-owner")
        .expect(201);

      expect(response.body).toEqual({ claimed: true, placeId: "place-e2e-1" });
      // The solicitud is persisted via the real repo on 'solicitudes' with
      // solicitanteUid = the verified owner uid (no StubSolicitudesRepository).
      expect(firebase.createDocument).toHaveBeenCalledWith(
        "solicitudes",
        expect.objectContaining({
          placeId: "place-e2e-1",
          tipo: "reclamo-place",
          status: "pendiente",
          solicitanteUid: "owner-uid-e2e",
        }),
      );
    });
  });
});
