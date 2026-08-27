/**
 * Seed script — populates `places` and `eventos` collections in Firestore
 * with realistic mock data for Concón (Chile), so the public site has content
 * to render without manual data entry.
 *
 * Depends on the catalog seeded by `seed.ts` (categorias + barrios): every
 * place/evento references a valid `categoriaId`, `subcategoriaId` and
 * `barrioId` from those collections.
 *
 * Idempotent: writes with `set(merge:true)` keyed by slug, so re-running
 * updates existing docs in place without duplicating.
 *
 * Usage:
 *   npm run seed:places
 *
 * Exit codes: 0 success, 1 failure.
 */
import { Place } from "../src/modules/places/domain/place.entity";
import { Evento } from "../src/modules/eventos/domain/evento.entity";
import { bootstrapFirebase } from "./lib/bootstrap-firebase";
import { MOCK_PLACES, type MockPlace } from "./mock-places";
import { MOCK_PLACES_EXTRA } from "./mock-places-extra";
import { MOCK_EVENTOS, type MockEvento } from "./mock-eventos";

/** All mock places: first half (mock-places) + second half (mock-places-extra). */
const ALL_MOCK_PLACES: readonly MockPlace[] = [
  ...MOCK_PLACES,
  ...MOCK_PLACES_EXTRA,
];

/** Placeholder owner UID for mock data — NOT a real Firebase Auth user. */
const MOCK_OWNER_UID = "seed-mock-owner";

/** Concón, Chile — used as base to derive coordinates around the city. */
const CONCON_BASE: Readonly<{ lat: number; lng: number }> = {
  lat: -32.92,
  lng: -71.516,
};

// ---------------------------------------------------------------------------
// Writers (raw Firestore with set(merge:true) — idempotent by slug)
// ---------------------------------------------------------------------------

function buildPlaceDoc(place: MockPlace): Record<string, unknown> {
  const doc: Place = {
    id: place.slug,
    nombre: place.nombre,
    slug: place.slug,
    descripcionCorta: place.descripcionCorta,
    descripcion: place.descripcion,
    categoriaId: place.categoriaId,
    subcategoriaId: place.subcategoriaId,
    barrioId: place.barrioId,
    direccion: place.direccion,
    coordenadas: CONCON_BASE,
    telefono: place.telefono,
    whatsapp: place.whatsapp,
    email: undefined,
    sitioWeb: place.sitioWeb,
    redesSociales: [],
    imagenes: { galeria: [] },
    planId: place.planId,
    abierto24x7: place.abierto24x7,
    servicios: place.servicios ?? [],
    metodosPago: place.metodosPago ?? [],
    vistasTotales: 0,
    activo: true,
    estadoVerificacion: place.estadoVerificacion,
    gestionadoPorAdmin: false,
    destacado: place.destacado,
    usuarioId: MOCK_OWNER_UID,
    fechaPublicacion: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return doc as unknown as Record<string, unknown>;
}

function buildEventoDoc(evento: MockEvento): Record<string, unknown> {
  const doc: Evento = {
    id: evento.slug,
    nombre: evento.nombre,
    slug: evento.slug,
    descripcionCorta: evento.descripcionCorta,
    descripcion: evento.descripcion,
    categoriaId: "eventos",
    subcategoriaId: evento.subcategoriaId,
    barrioId: evento.barrioId,
    organizador: evento.organizador,
    organizadorContacto: evento.organizadorContacto,
    organizadorWeb: evento.organizadorWeb,
    ubicacion: {
      nombreLugar: evento.ubicacionNombre,
      direccion: evento.ubicacionDireccion,
      coordenadas: CONCON_BASE,
    },
    fechaInicio: evento.fechaInicio,
    fechaFin: evento.fechaFin,
    precioTipo: evento.precioTipo,
    precioValor: evento.precioValor,
    precioMoneda: evento.precioMoneda,
    publicoObjetivo: evento.publicoObjetivo,
    nivelRuido: evento.nivelRuido,
    estado: "programado",
    destacado: evento.destacado,
    estadoVerificacion: "verificado",
    activo: true,
    usuarioId: MOCK_OWNER_UID,
    vistasTotales: 0,
    cambios: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    fechaPublicacion: new Date(),
  };
  return doc as unknown as Record<string, unknown>;
}

async function seedPlaces(): Promise<number> {
  const firebase = await bootstrapFirebase();
  const collection = firebase.getFirestore().collection("places");
  const now = firebase.getCurrentTimestamp();
  let count = 0;

  for (const place of ALL_MOCK_PLACES) {
    await collection.doc(place.slug).set(
      {
        ...buildPlaceDoc(place),
        createdAt: now,
        updatedAt: now,
        fechaPublicacion: now,
      },
      { merge: true },
    );
    count++;
    console.log(`  UPSERT place "${place.slug}" (${place.nombre})`);
  }
  return count;
}

async function seedEventos(): Promise<number> {
  const firebase = await bootstrapFirebase();
  const collection = firebase.getFirestore().collection("eventos");
  const now = firebase.getCurrentTimestamp();
  let count = 0;

  for (const evento of MOCK_EVENTOS) {
    await collection.doc(evento.slug).set(
      {
        ...buildEventoDoc(evento),
        createdAt: now,
        updatedAt: now,
        fechaPublicacion: now,
      },
      { merge: true },
    );
    count++;
    console.log(`  UPSERT evento "${evento.slug}" (${evento.nombre})`);
  }
  return count;
}

async function main(): Promise<void> {
  console.log("🌊 Seeding places + eventos...");
  const places = await seedPlaces();
  const eventos = await seedEventos();
  console.log(
    `\n✅ Done: ${places} places, ${eventos} eventos escritos (aprobados, keyed by slug).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Seed places failed:", error);
    process.exit(1);
  });
