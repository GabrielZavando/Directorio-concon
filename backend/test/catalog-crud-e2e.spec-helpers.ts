/**
 * Shared fixtures and app bootstrap for the catalog e2e specs
 * (`catalog-crud-e2e.spec.ts` and `catalog-catalog-validation-e2e.spec.ts`).
 *
 * The `FirebaseService` mock factory must be defined inline in each spec
 * (Jest hoists `jest.mock` before module imports, so the factory cannot
 * reference imports from this file). Only pure data fixtures, the mock
 * type and the app bootstrap live here.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { FirebaseService } from "../src/common/services/firebase.service";

/** Shape of the mocked FirebaseService as captured from the module mock. */
export type MockFirebase = {
  verifyIdToken: jest.Mock;
  getDocument: jest.Mock;
  getDocuments: jest.Mock;
  createDocument: jest.Mock;
  updateDocument: jest.Mock;
  deleteDocument: jest.Mock;
  getFirestore: jest.Mock;
  getCollection: jest.Mock;
  runTransaction: jest.Mock;
  getCurrentTimestamp: jest.Mock;
  documentExists: jest.Mock;
};

/**
 * Boots the real AppModule with the global ValidationPipe used in main.ts
 * and returns the app plus the mocked FirebaseService instance.
 */
export async function createCatalogE2eApp(
  env: Record<string, string> = {},
): Promise<{ app: INestApplication; firebase: MockFirebase }> {
  Object.assign(process.env, env);
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.init();
  const firebase = moduleRef.get(FirebaseService) as unknown as MockFirebase;
  return { app, firebase };
}

/** Sets the mocked verifyIdToken to answer for a given uid + rol. */
export function authAs(
  firebase: MockFirebase,
  uid: string,
  rol: "admin" | "owner" | "member",
): void {
  firebase.verifyIdToken.mockResolvedValue({
    uid,
    rol,
    email: `${uid}@e2e.cl`,
  } as never);
}

/** Firestore-style doc payload for a categorias row. */
export const catDoc = (overrides: Record<string, unknown> = {}) => ({
  id: "gastronomia",
  nombre: "Gastronomía",
  slug: "gastronomia",
  icono: "utensils",
  orden: 1,
  activo: true,
  subcategorias: [
    { slug: "restaurantes", nombre: "Restaurantes", activo: true },
  ],
  createdAt: { toDate: () => new Date("2026-01-01") },
  updatedAt: { toDate: () => new Date("2026-01-01") },
  ...overrides,
});

/** Firestore-style doc payload for a barrios row. */
export const barrioDoc = (overrides: Record<string, unknown> = {}) => ({
  id: "higuerillas",
  nombre: "Higuerillas",
  slug: "higuerillas",
  tipo: "urbano",
  activo: true,
  createdAt: { toDate: () => new Date("2026-01-01") },
  updatedAt: { toDate: () => new Date("2026-01-01") },
  ...overrides,
});

export const validCategoriaBody = {
  nombre: "Gastronomía",
  slug: "gastronomia",
  icono: "utensils",
  orden: 1,
};

export const validBarrioBody = {
  nombre: "Higuerillas",
  slug: "higuerillas",
  tipo: "urbano",
};

export const validPlaceBody = {
  nombre: "Restaurante El Marino",
  descripcionCorta: "Mariscos frescos",
  descripcion: "Restaurante familiar especializado en mariscos",
  categoriaId: "gastronomia",
  subcategoriaId: "restaurantes",
  barrioId: "higuerillas",
  direccion: "Av. Borgoño 123",
  planId: "gratuito",
};

export const validEventoBody = {
  nombre: "Feria Gastronómica E2E",
  descripcionCorta: "Degustación de platos típicos",
  descripcion: "Una feria con más de 30 stands de comida típica de la región.",
  subcategoriaId: "ferias-gastronomicas",
  barrioId: "higuerillas",
  organizador: "Municipalidad de Concón",
  ubicacionDireccion: "Av. Concón 123",
  fechaInicio: "2026-08-15T10:00:00.000Z",
  fechaFin: "2026-08-17T22:00:00.000Z",
  precioTipo: "gratis",
  precioValor: 0,
  publicoObjetivo: ["familia"],
  nivelRuido: "medio",
};
