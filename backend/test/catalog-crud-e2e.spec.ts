/**
 * E2E for the `categorias-barrios-crud` change (Task 13.4).
 *
 * Boots the REAL AppModule so the catalog endpoints run with production
 * wiring. `FirebaseService` is mocked at module level (same pattern as
 * `auth-canonical-scenarios.spec.ts`). Cross-catalog gates on
 * places/eventos are covered in `catalog-catalog-validation-e2e.spec.ts`.
 *
 * Covers:
 *  - Categorias: admin happy paths + 400/401/403/404/409.
 *  - Barrios: admin happy paths + 400/401/403/404/409.
 */
import request from "supertest";
import { AppModule } from "../src/app.module";
import {
  MockFirebase,
  authAs,
  barrioDoc,
  catDoc,
  createCatalogE2eApp,
  validBarrioBody,
  validCategoriaBody,
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

describe("Catalog CRUD (e2e, real AppModule)", () => {
  let app: Awaited<ReturnType<typeof createCatalogE2eApp>>["app"];
  let firebase: MockFirebase;

  beforeAll(async () => {
    const ctx = await createCatalogE2eApp();
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
  // Categorias
  // =========================================================================
  describe("Categorias", () => {
    it("GET /categorias public → 200 with list", async () => {
      firebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "gastronomia", data: () => catDoc() }],
      } as never);
      const res = await request(app.getHttpServer())
        .get("/categorias")
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /categorias?activa=true public → 200, no internal flags", async () => {
      firebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "gastronomia", data: () => catDoc() }],
      } as never);
      const res = await request(app.getHttpServer())
        .get("/categorias?activa=true")
        .expect(200);
      const first = res.body[0];
      expect(first).toBeDefined();
      expect(first).not.toHaveProperty("activo");
    });

    it("POST /categorias admin → 201", async () => {
      authAs(firebase, "admin-uid", "admin");
      firebase.getDocuments.mockResolvedValue({
        empty: true,
        docs: [],
      } as never);
      firebase.createDocument.mockResolvedValue({ id: "gastronomia" } as never);
      firebase.getDocument.mockResolvedValue({
        exists: true,
        id: "gastronomia",
        data: () => catDoc(),
      } as never);
      const res = await request(app.getHttpServer())
        .post("/categorias")
        .set("Authorization", "Bearer fake-admin")
        .send(validCategoriaBody)
        .expect(201);
      expect(res.body.slug).toBe("gastronomia");
    });

    it("POST /categorias anonymous → 401", async () => {
      await request(app.getHttpServer())
        .post("/categorias")
        .send(validCategoriaBody)
        .expect(401);
    });

    it("POST /categorias member → 403", async () => {
      authAs(firebase, "member-uid", "member");
      await request(app.getHttpServer())
        .post("/categorias")
        .set("Authorization", "Bearer fake-member")
        .send(validCategoriaBody)
        .expect(403);
    });

    it("POST /categorias invalid body → 400", async () => {
      authAs(firebase, "admin-uid", "admin");
      await request(app.getHttpServer())
        .post("/categorias")
        .set("Authorization", "Bearer fake-admin")
        .send({ nombre: "X", slug: "Gastro", icono: "nope", orden: 0 })
        .expect(400);
    });

    it("POST /categorias duplicate slug → 409", async () => {
      authAs(firebase, "admin-uid", "admin");
      firebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "gastronomia", data: () => catDoc() }],
      } as never);
      await request(app.getHttpServer())
        .post("/categorias")
        .set("Authorization", "Bearer fake-admin")
        .send(validCategoriaBody)
        .expect(409);
    });

    it("PATCH /categorias/:id admin → 200", async () => {
      authAs(firebase, "admin-uid", "admin");
      firebase.getDocument
        .mockResolvedValueOnce({
          exists: true,
          id: "gastronomia",
          data: () => catDoc(),
        } as never)
        .mockResolvedValueOnce({
          exists: true,
          id: "gastronomia",
          data: () => catDoc(),
        } as never)
        .mockResolvedValueOnce({
          exists: true,
          id: "gastronomia",
          data: () => catDoc({ nombre: "Gastro" }),
        } as never);
      firebase.getDocuments.mockResolvedValue({
        empty: true,
        docs: [],
      } as never);
      firebase.updateDocument.mockResolvedValue(undefined);
      const res = await request(app.getHttpServer())
        .patch("/categorias/gastronomia")
        .set("Authorization", "Bearer fake-admin")
        .send({ nombre: "Gastro" })
        .expect(200);
      expect(res.body.nombre).toBe("Gastro");
    });

    it("PATCH /categorias/:id missing → 404", async () => {
      authAs(firebase, "admin-uid", "admin");
      firebase.getDocument.mockResolvedValue({
        exists: false,
        id: "nope",
        data: () => null,
      } as never);
      await request(app.getHttpServer())
        .patch("/categorias/nope")
        .set("Authorization", "Bearer fake-admin")
        .send({ nombre: "Nuevo" })
        .expect(404);
    });

    it("PATCH /categorias/:id/activar|desactivar admin → 200", async () => {
      authAs(firebase, "admin-uid", "admin");
      firebase.getDocument.mockResolvedValue({
        exists: true,
        id: "gastronomia",
        data: () => catDoc(),
      } as never);
      firebase.updateDocument.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .patch("/categorias/gastronomia/activar")
        .set("Authorization", "Bearer fake-admin")
        .expect(200);
      await request(app.getHttpServer())
        .patch("/categorias/gastronomia/desactivar")
        .set("Authorization", "Bearer fake-admin")
        .expect(200);
    });

    it("POST /categorias/:id/subcategorias admin → 201", async () => {
      authAs(firebase, "admin-uid", "admin");
      firebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({ id: "gastronomia" }),
        }),
      });
      firebase.runTransaction.mockImplementation(async (fn) =>
        fn({
          get: async () => ({ exists: true, data: () => catDoc() }),
          update: jest.fn(),
        }),
      );
      const res = await request(app.getHttpServer())
        .post("/categorias/gastronomia/subcategorias")
        .set("Authorization", "Bearer fake-admin")
        .send({ slug: "panaderias", nombre: "Panaderías" })
        .expect(201);
      expect(res.body.subcategorias.length).toBeGreaterThan(0);
    });

    it("PATCH /categorias/:id/subcategorias/:subId/desactivar admin → 200", async () => {
      authAs(firebase, "admin-uid", "admin");
      firebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({ id: "gastronomia" }),
        }),
      });
      firebase.runTransaction.mockImplementation(async (fn) =>
        fn({
          get: async () => ({ exists: true, data: () => catDoc() }),
          update: jest.fn(),
        }),
      );
      await request(app.getHttpServer())
        .patch("/categorias/gastronomia/subcategorias/restaurantes/desactivar")
        .set("Authorization", "Bearer fake-admin")
        .expect(200);
    });
  });

  // =========================================================================
  // Barrios
  // =========================================================================
  describe("Barrios", () => {
    it("GET /barrios public → 200", async () => {
      firebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "higuerillas", data: () => barrioDoc() }],
      } as never);
      await request(app.getHttpServer()).get("/barrios").expect(200);
    });

    it("POST /barrios admin → 201", async () => {
      authAs(firebase, "admin-uid", "admin");
      firebase.getDocuments.mockResolvedValue({
        empty: true,
        docs: [],
      } as never);
      firebase.createDocument.mockResolvedValue({ id: "higuerillas" } as never);
      firebase.getDocument.mockResolvedValue({
        exists: true,
        id: "higuerillas",
        data: () => barrioDoc(),
      } as never);
      const res = await request(app.getHttpServer())
        .post("/barrios")
        .set("Authorization", "Bearer fake-admin")
        .send(validBarrioBody)
        .expect(201);
      expect(res.body.slug).toBe("higuerillas");
    });

    it("POST /barrios anonymous → 401", async () => {
      await request(app.getHttpServer())
        .post("/barrios")
        .send(validBarrioBody)
        .expect(401);
    });

    it("POST /barrios owner → 403", async () => {
      authAs(firebase, "owner-uid", "owner");
      await request(app.getHttpServer())
        .post("/barrios")
        .set("Authorization", "Bearer fake-owner")
        .send(validBarrioBody)
        .expect(403);
    });

    it("POST /barrios invalid body → 400", async () => {
      authAs(firebase, "admin-uid", "admin");
      await request(app.getHttpServer())
        .post("/barrios")
        .set("Authorization", "Bearer fake-admin")
        .send({ nombre: "X", slug: "Bad", tipo: "aereo" })
        .expect(400);
    });

    it("POST /barrios duplicate slug → 409", async () => {
      authAs(firebase, "admin-uid", "admin");
      firebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "higuerillas", data: () => barrioDoc() }],
      } as never);
      await request(app.getHttpServer())
        .post("/barrios")
        .set("Authorization", "Bearer fake-admin")
        .send(validBarrioBody)
        .expect(409);
    });

    it("PATCH /barrios/:id/activar|desactivar admin → 200", async () => {
      authAs(firebase, "admin-uid", "admin");
      firebase.getDocument.mockResolvedValue({
        exists: true,
        id: "higuerillas",
        data: () => barrioDoc(),
      } as never);
      firebase.updateDocument.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .patch("/barrios/higuerillas/activar")
        .set("Authorization", "Bearer fake-admin")
        .expect(200);
      await request(app.getHttpServer())
        .patch("/barrios/higuerillas/desactivar")
        .set("Authorization", "Bearer fake-admin")
        .expect(200);
    });

    it("PATCH /barrios/:id missing → 404", async () => {
      authAs(firebase, "admin-uid", "admin");
      firebase.getDocument.mockResolvedValue({
        exists: false,
        id: "nope",
        data: () => null,
      } as never);
      await request(app.getHttpServer())
        .patch("/barrios/nope")
        .set("Authorization", "Bearer fake-admin")
        .send({ nombre: "Nuevo" })
        .expect(404);
    });
  });
});
