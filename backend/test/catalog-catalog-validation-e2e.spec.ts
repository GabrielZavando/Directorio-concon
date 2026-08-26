/**
 * E2E for the `categorias-barrios-crud` change (Task 13.4) — cross-catalog.
 *
 * Boots the REAL AppModule with `CATALOG_VALIDATION_ENABLED=true` so the
 * cross-catalog gates on places/eventos run with production wiring.
 * `FirebaseService` is mocked at module level (same pattern as
 * `auth-canonical-scenarios.spec.ts`). CRUD coverage for categorias/barrios
 * lives in `catalog-crud-e2e.spec.ts`.
 *
 * Covers:
 *  - POST /places with an invalid categoriaId → 400.
 *  - POST /places with valid catalog references → 201.
 *  - POST /eventos with an invalid barrioId → 400.
 */
import request from "supertest";
import {
  MockFirebase,
  authAs,
  barrioDoc,
  catDoc,
  createCatalogE2eApp,
  validEventoBody,
  validPlaceBody,
} from "./catalog-crud-e2e.spec-helpers";

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
    runTransaction: jest.fn(),
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

describe("Catalog cross-catalog validation (e2e, real AppModule)", () => {
  let app: Awaited<ReturnType<typeof createCatalogE2eApp>>["app"];
  let firebase: MockFirebase;

  beforeAll(async () => {
    const ctx = await createCatalogE2eApp({
      CATALOG_VALIDATION_ENABLED: "true",
    });
    app = ctx.app;
    firebase = ctx.firebase;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Places/Eventos with CATALOG_VALIDATION_ENABLED=true
  // =========================================================================
  describe("Cross-catalog validation ON", () => {
    it("POST /places invalid categoriaId → 400", async () => {
      authAs(firebase, "owner-uid", "owner");
      firebase.getDocument.mockResolvedValue({
        exists: false,
        id: "nope",
        data: () => null,
      } as never);
      firebase.getDocuments.mockResolvedValue({
        empty: true,
        docs: [],
      } as never);
      await request(app.getHttpServer())
        .post("/places")
        .set("Authorization", "Bearer fake-owner")
        .send(validPlaceBody)
        .expect(400);
    });

    it("POST /places valid references → 201", async () => {
      authAs(firebase, "owner-uid", "owner");
      firebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "categorias") {
            return Promise.resolve({
              exists: true,
              id,
              data: () => catDoc(),
            } as never);
          }
          if (collection === "barrios") {
            return Promise.resolve({
              exists: true,
              id,
              data: () => barrioDoc(),
            } as never);
          }
          return Promise.resolve({
            exists: false,
            id,
            data: () => null,
          } as never);
        },
      );
      firebase.getDocuments.mockResolvedValue({
        empty: true,
        docs: [],
      } as never);
      firebase.createDocument.mockResolvedValue({ id: "place-e2e" } as never);
      const res = await request(app.getHttpServer())
        .post("/places")
        .set("Authorization", "Bearer fake-owner")
        .send(validPlaceBody)
        .expect(201);
      expect(res.body.categoriaId).toBe("gastronomia");
    });

    it("POST /eventos invalid barrioId → 400", async () => {
      authAs(firebase, "owner-uid", "owner");
      // EventoValidator (documentExists) passes so the flow reaches the
      // CatalogValidator, which reads barrios via getDocument and fails 400.
      firebase.documentExists.mockResolvedValue(true);
      firebase.getDocument.mockImplementation((collection: string) => {
        if (collection === "barrios") {
          return Promise.resolve({
            exists: false,
            id: "nope",
            data: () => null,
          } as never);
        }
        return Promise.resolve({
          exists: true,
          id: "eventos",
          data: () =>
            catDoc({
              id: "eventos",
              subcategorias: [
                {
                  slug: "ferias-gastronomicas",
                  nombre: "Ferias Gastronómicas",
                  activo: true,
                },
              ],
            }),
        } as never);
      });
      await request(app.getHttpServer())
        .post("/eventos")
        .set("Authorization", "Bearer fake-owner")
        .send(validEventoBody)
        .expect(400);
    });
  });
});
