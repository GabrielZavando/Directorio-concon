/**
 * Idempotent migration — converts `eventos` docs from the old model
 * (`status` + `verificado` + `placeId` + flat `ubicacionNombre` /
 * `ubicacionDireccion` / `coordenadas`) to the new model
 * (`activo` + `estadoVerificacion` + `ubicacion` + `cambios`) introduced by
 * eventos-refactor (CH-04).
 *
 * Safety:
 *   - Checks for the `estadoVerificacion` field before deciding: if it exists
 *     the doc is already migrated and is skipped (idempotent).
 *   - Writes with `set(merge:true)` so untouched fields are preserved.
 *   - Old fields (`status`, `verificado`, `placeId`, `ubicacionNombre`,
 *     `ubicacionDireccion`, `coordenadas`) are explicitly deleted after the new
 *     fields are written.
 *   - `ubicacion` is only synthesized from the legacy flat fields when the doc
 *     does not yet have a structured `ubicacion` object.
 *
 * Usage:
 *   npm run migrate:eventos
 *
 * Requires: FIREBASE_ENABLED=true + valid credentials, or
 *           FIRESTORE_EMULATOR_HOST for local migration.
 */
import "dotenv/config";
import { bootstrapFirebase } from "./lib/bootstrap-firebase";
import { FieldValue } from "firebase-admin/firestore";

/** Firestore batch size limit — stay well under 500. */
const BATCH_SIZE = 400;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface LegacyEventoDoc {
  status?: string;
  verificado?: boolean;
  placeId?: string;
  ubicacionNombre?: string;
  ubicacionDireccion?: string;
  coordenadas?: { lat: number; lng: number };
  ubicacion?: {
    nombreLugar?: string;
    direccion: string;
    coordenadas: { lat: number; lng: number };
  };
  estadoVerificacion?: string;
  [key: string]: unknown;
}

function computeActivo(doc: LegacyEventoDoc): boolean {
  // A rejected evento becomes inactive; everything else stays active.
  return doc.status !== "rechazado";
}

function computeEstadoVerificacion(
  doc: LegacyEventoDoc,
): "pendiente" | "verificado" | "rechazado" {
  if (doc.verificado === true) return "verificado";
  if (doc.status === "rechazado") return "rechazado";
  return "pendiente";
}

function computeUbicacion(doc: LegacyEventoDoc): {
  nombreLugar?: string;
  direccion: string;
  coordenadas?: { lat: number; lng: number };
} {
  if (doc.ubicacion && doc.ubicacion.direccion) {
    return doc.ubicacion;
  }
  const coordenadas = doc.coordenadas ?? undefined;
  return {
    nombreLugar: doc.ubicacionNombre,
    direccion: doc.ubicacionDireccion ?? "",
    // Do NOT inject a null-island {lat:0,lng:0} when coordinates are missing;
    // the map-data endpoint filters eventos without coordinates anyway.
    ...(coordenadas ? { coordenadas } : {}),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function migrateEventos(): Promise<{
  migrated: number;
  skipped: number;
}> {
  const firebase = await bootstrapFirebase();
  const db = firebase.getFirestore();
  const eventosRef = db.collection("eventos");

  let totalMigrated = 0;
  let totalSkipped = 0;
  let lastDoc = undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = eventosRef.orderBy("__name__").limit(BATCH_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let batchOps = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as LegacyEventoDoc;

      // Idempotent: skip if already migrated (has `estadoVerificacion` field)
      if (data.estadoVerificacion !== undefined) {
        totalSkipped++;
        continue;
      }

      const updates: Record<string, unknown> = {
        activo: computeActivo(data),
        estadoVerificacion: computeEstadoVerificacion(data),
        // Migrated eventos are published immediately (visible in the default
        // public list, which filters estado: 'programado').
        estado: "programado",
        ubicacion: computeUbicacion(data),
        cambios: data.cambios ?? [],
        motivoRechazoVerificacion:
          data.motivoRechazoVerificacion !== undefined
            ? data.motivoRechazoVerificacion
            : FieldValue.delete(),
      };

      // Remove old fields
      for (const legacyField of [
        "status",
        "verificado",
        "placeId",
        "ubicacionNombre",
        "ubicacionDireccion",
        "coordenadas",
      ]) {
        if (data[legacyField] !== undefined) {
          updates[legacyField] = FieldValue.delete();
        }
      }

      batch.set(docSnap.ref, updates, { merge: true });
      batchOps++;
      totalMigrated++;
    }

    if (batchOps > 0) {
      await batch.commit();
      console.log(`  Batch committed: ${batchOps} docs migrated.`);
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];

    if (snapshot.size < BATCH_SIZE) break;
  }

  return { migrated: totalMigrated, skipped: totalSkipped };
}

async function main(): Promise<void> {
  console.log("🔄 Migrating eventos to new verification model...");
  const { migrated, skipped } = await migrateEventos();
  console.log(
    `\n✅ Done: ${migrated} migrated, ${skipped} skipped (already migrated).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
