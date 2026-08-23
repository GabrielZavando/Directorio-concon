/**
 * Seed script — populates the `categorias` and `barrios` collections in
 * Firestore from the canonical frontend JSON files:
 *
 *   frontend/src/app/shared/data-access/local/data/categorias.json
 *   frontend/src/app/shared/data-access/local/data/barrios.json
 *
 * Idempotent: writes with `set(merge:true)` keyed by slug, so re-running
 * updates existing docs in place without duplicating. All docs are forced
 * `activo: true` and subcategorias are materialized with `activo: true`.
 *
 * Usage:
 *   npm run seed:cat        (only categorias + barrios)
 *   npm run seed            (seed:cat + seed-places)
 *
 * Exit codes: 0 success, 1 failure.
 */
import * as fs from "fs";
import * as path from "path";
import { Categoria } from "../src/modules/categorias/domain/categoria.entity";
import { Subcategoria } from "../src/modules/categorias/domain/subcategoria.vo";
import { Barrio } from "../src/modules/barrios/domain/barrio.entity";
import { CategoriaFirestoreAdapter } from "../src/modules/categorias/infrastructure/categoria-firestore.adapter";
import { BarrioFirestoreAdapter } from "../src/modules/barrios/infrastructure/barrio-firestore.adapter";
import { bootstrapFirebase } from "./lib/bootstrap-firebase";

const DATA_DIR = path.resolve(
  __dirname,
  "../../frontend/src/app/shared/data-access/local/data",
);

interface CategoriaJson {
  id: string;
  nombre: string;
  descripcion?: string;
  icono: string;
  orden: number;
  activa?: boolean;
  subcategorias?: Array<{ slug: string; nombre: string; descripcion?: string }>;
}

interface BarrioJson {
  id: string;
  nombre: string;
  descripcion?: string;
  territorio?: string;
  tipo: "urbano" | "rural";
  coordenadas?: { lat: number; lng: number } | null;
}

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

async function seedCategorias(): Promise<number> {
  const firebase = await bootstrapFirebase();
  const adapter = new CategoriaFirestoreAdapter(firebase);
  const raw = loadJson<{ categorias: CategoriaJson[] }>(
    path.join(DATA_DIR, "categorias.json"),
  );

  const collection = firebase.getFirestore().collection("categorias");
  const now = firebase.getCurrentTimestamp();
  let count = 0;

  for (const cat of raw.categorias) {
    // Build the domain entity first — validates invariants (slug regex, orden)
    // so bad seed data fails loudly instead of corrupting Firestore.
    const entity = new Categoria({
      id: cat.id,
      slug: cat.id,
      nombre: cat.nombre,
      descripcion: cat.descripcion,
      icono: cat.icono,
      orden: cat.orden,
      activo: true,
      subcategorias: (cat.subcategorias ?? []).map(
        (s) =>
          new Subcategoria({ slug: s.slug, nombre: s.nombre, activo: true }),
      ),
    });

    const exists = await adapter.existsBySlug(entity.slug);
    await collection.doc(entity.slug).set(
      {
        nombre: entity.nombre,
        slug: entity.slug,
        icono: entity.icono,
        orden: entity.orden,
        descripcion: entity.descripcion,
        activo: entity.activo,
        subcategorias: entity.subcategorias.map((s) => ({
          slug: s.slug,
          nombre: s.nombre,
          activo: s.activo,
        })),
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
    count++;
    console.log(
      `  ${exists ? "UPDATED" : "CREATED"} categoria "${entity.slug}" (${entity.nombre}, ${entity.subcategorias.length} subcategorias)`,
    );
  }
  return count;
}

async function seedBarrios(): Promise<number> {
  const firebase = await bootstrapFirebase();
  const adapter = new BarrioFirestoreAdapter(firebase);
  const raw = loadJson<BarrioJson[]>(path.join(DATA_DIR, "barrios.json"));

  const collection = firebase.getFirestore().collection("barrios");
  const now = firebase.getCurrentTimestamp();
  let count = 0;

  for (const barrio of raw) {
    const entity = new Barrio({
      id: barrio.id,
      slug: barrio.id,
      nombre: barrio.nombre,
      descripcion: barrio.descripcion,
      territorio: barrio.territorio,
      tipo: barrio.tipo,
      // JSON uses null for "no coordinates"; domain expects undefined.
      coordenadas: barrio.coordenadas ?? undefined,
      activo: true,
    });

    const exists = await adapter.existsBySlug(entity.slug);
    await collection.doc(entity.slug).set(
      {
        nombre: entity.nombre,
        slug: entity.slug,
        tipo: entity.tipo,
        descripcion: entity.descripcion,
        territorio: entity.territorio,
        coordenadas: entity.coordenadas,
        activo: entity.activo,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
    count++;
    console.log(
      `  ${exists ? "UPDATED" : "CREATED"} barrio "${entity.slug}" (${entity.nombre})`,
    );
  }
  return count;
}

async function main(): Promise<void> {
  console.log("🌱 Seeding catalog (categorias + barrios)...");
  const categorias = await seedCategorias();
  const barrios = await seedBarrios();
  console.log(
    `\n✅ Done: ${categorias} categorias, ${barrios} barrios escritas.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
