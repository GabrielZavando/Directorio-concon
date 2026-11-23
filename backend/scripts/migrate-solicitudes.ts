/**
 * Idempotent migration — enforces the CH-05 `solicitudes-refactor` model on
 * existing Firestore data. Confirmed plan decision uses a DELETE policy for
 * deprecated types (never converts them to `reclamo-place`).
 *
 * Per document:
 *   1. `tipo != 'reclamo-place'` (i.e. `registro`, `actualizacion`,
 *      `registro-evento`, `actualizacion-evento`) OR carrying the removed
 *      `eventoId`/`proposal` field → DELETE (lifecycle legacy).
 *   2. Surviving `reclamo-place` docs missing `solicitanteUid`, with
 *      `usuarioId` present → backfill `solicitanteUid = usuarioId`.
 *   3. Surviving docs missing BOTH `solicitanteUid` and `usuarioId` → report
 *      as orphan (logged with doc ID), left untouched (no destructive action
 *      beyond rule 1).
 *
 * Idempotent: re-running yields no further changes (already-deleted docs are
 * gone; already-processed docs hit the skip/idempotent branches).
 *
 * Safety:
 *   - Deletes are staged in `WriteBatch` (≤ 400 ops/commit).
 *   - Backfills use `set(merge:true)` on the single field.
 *   - Back up the `solicitudes` collection before running against production.
 *
 * Usage:
 *   npm run migrate:solicitudes
 *
 * Requires: FIREBASE_ENABLED=true + valid credentials, or
 *           FIRESTORE_EMULATOR_HOST for local migration.
 */
import "dotenv/config";
import { bootstrapFirebase } from "./lib/bootstrap-firebase";
import {
  classifyMigrationSolicitud,
  type MigrationSolicitudInput,
} from "./lib/solicitudes-migration";

/** Firestore batch size limit — stay well under 500. */
const BATCH_SIZE = 400;

export interface MigrateSolicitudesReport {
  scanned: number;
  deleted: number;
  backfilled: number;
  orphans: number;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function migrateSolicitudes(): Promise<MigrateSolicitudesReport> {
  const firebase = await bootstrapFirebase();
  const db = firebase.getFirestore();
  const solicitudesRef = db.collection("solicitudes");

  const report: MigrateSolicitudesReport = {
    scanned: 0,
    deleted: 0,
    backfilled: 0,
    orphans: 0,
  };

  let lastDoc: unknown;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = solicitudesRef.orderBy("__name__").limit(BATCH_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc as never);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let batchOps = 0;

    for (const docSnap of snapshot.docs) {
      const data = (docSnap.data() ?? {}) as MigrationSolicitudInput;
      report.scanned++;

      const action = classifyMigrationSolicitud(data);
      switch (action.kind) {
        case "delete":
          batch.delete(docSnap.ref);
          report.deleted++;
          batchOps++;
          break;
        case "backfill":
          batch.set(
            docSnap.ref,
            { solicitanteUid: action.solicitanteUid },
            { merge: true },
          );
          report.backfilled++;
          batchOps++;
          break;
        case "orphan":
          report.orphans++;
          console.warn(
            `  orphan: solicitudes/${docSnap.id} — missing both solicitanteUid and usuarioId (left untouched)`,
          );
          break;
        case "skip":
          break;
      }
    }

    if (batchOps > 0) {
      await batch.commit();
      console.log(`  Batch committed: ${batchOps} ops.`);
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < BATCH_SIZE) break;
  }

  return report;
}

async function main(): Promise<void> {
  console.log("🔄 Migrating solicitudes to CH-05 model (DELETE policy)...");
  const report = await migrateSolicitudes();
  console.log(`\n✅ Done: ${JSON.stringify(report)} — re-running is a no-op.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
