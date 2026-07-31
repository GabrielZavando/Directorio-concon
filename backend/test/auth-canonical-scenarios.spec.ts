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
  ubicacionDireccion: "Av. Concón 123",
  coordenadas: { lat: -32.92, lng: -71.51 },
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
      // Persist evento, then its auto-generated solicitud.
      firebase.createDocument
        .mockResolvedValueOnce({ id: "evento-e2e-1" } as never)
        .mockResolvedValueOnce({ id: "sol-e2e-1" } as never);

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
                      tipo: "actualizacion",
                      status: "aprobado",
                      revisadoPor: "admin-uid-e2e",
                      createdAt: { toDate: () => new Date("2026-06-01") },
                      revisadoAt: { toDate: () => new Date("2026-06-01") },
                    }
                  : {
                      placeId: "place-1",
                      usuarioId: "owner-uid-e2e",
                      tipo: "actualizacion",
                      status: "pendiente",
                      createdAt: { toDate: () => new Date("2026-06-01") },
                    },
            });
          }
          return Promise.resolve({ exists: false, id, data: () => null });
        },
      );
      firebase.updateDocument.mockResolvedValue(undefined);

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
    });
  });
});
