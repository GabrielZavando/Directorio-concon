/**
 * Idempotent migration — converts `places` docs from the old model
 * (`status` + `verificado` + `fechaVerificacion`) to the new model
 * (`activo` + `estadoVerificacion` + `gestionadoPorAdmin`) introduced
 * by places-refactor (CH-03).
 *
 * Safety:
 *   - Checks for the `activo` field before deciding: if it exists the doc
 *     is already migrated and is skipped (idempotent).
 *   - Writes with `set(merge:true)` so non-place fields are untouched.
 *   - Old fields (`status`, `verificado`, `fechaVerificacion`) are explicitly
 *     set to `FieldValue.delete()` after the new fields are written.
 *
 * Usage:
 *   npm run migrate:places
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

interface LegacyPlaceDoc {
  status?: string;
  verificado?: boolean;
  fechaVerificacion?: unknown;
  activo?: boolean;
  [key: string]: unknown;
}

function computeActivo(doc: LegacyPlaceDoc): boolean {
  return doc.status === "aprobado";
}

function computeEstadoVerificacion(
  doc: LegacyPlaceDoc,
): "pendiente" | "verificado" | "rechazado" {
  if (doc.verificado === true) return "verificado";
  return "pendiente";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function migratePlaces(): Promise<{ migrated: number; skipped: number }> {
  const firebase = await bootstrapFirebase();
  const db = firebase.getFirestore();
  const placesRef = db.collection("places");

  // Stream all docs — Firestore has no count without aggregation query,
  // so we process in batches of BATCH_SIZE.
  let totalMigrated = 0;
  let totalSkipped = 0;
  let lastDoc = undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = placesRef.orderBy("__name__").limit(BATCH_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let batchOps = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as LegacyPlaceDoc;

      // Idempotent: skip if already migrated (has `activo` field)
      if (data.activo !== undefined) {
        totalSkipped++;
        continue;
      }

      const updates: Record<string, unknown> = {
        activo: computeActivo(data),
        estadoVerificacion: computeEstadoVerificacion(data),
        gestionadoPorAdmin: false,
        motivoRechazoVerificacion: FieldValue.delete(),
      };

      // Remove old fields
      if (data.status !== undefined) {
        updates.status = FieldValue.delete();
      }
      if (data.verificado !== undefined) {
        updates.verificado = FieldValue.delete();
      }
      if (data.fechaVerificacion !== undefined) {
        updates.fechaVerificacion = FieldValue.delete();
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

    // If fewer than BATCH_SIZE docs returned, we're done
    if (snapshot.size < BATCH_SIZE) break;
  }

  return { migrated: totalMigrated, skipped: totalSkipped };
}

async function main(): Promise<void> {
  console.log("🔄 Migrating places to new verification model...");
  const { migrated, skipped } = await migratePlaces();
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
