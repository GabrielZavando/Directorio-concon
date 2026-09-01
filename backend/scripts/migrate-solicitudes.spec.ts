/**
 * Unit tests for the pure migration decision logic of the CH-05
 * `solicitudes-refactor` migration (see `lib/solicitudes-migration.ts`).
 *
 * The Firebase I/O lives in `migrate-solicitudes.ts`'s main loop; the
 * per-document action is a pure `classifyMigrationSolicitud` so it is
 * deterministic and unit-testable without an emulator.
 *
 * Mirrors Task 8.3's emulator scenarios at the decision level:
 *  - Deprecated tipos (`registro`, `actualizacion`, `registro-evento`,
 *    `actualizacion-evento`) and docs carrying removed `eventoId`/`proposal`
 *    → DELETE (never converted to `reclamo-place`).
 *  - `reclamo-place` with missing `solicitanteUid` + `usuarioId` present →
 *    backfill `solicitanteUid = usuarioId`.
 *  - Missing both UIDs → orphan (reported, not destroyed).
 *  - Fully formed `reclamo-place` → skip (idempotency).
 */
import {
  classifyMigrationSolicitud,
  type MigrationSolicitudInput,
} from "./lib/solicitudes-migration";

describe("classifyMigrationSolicitud (solicitudes migration)", () => {
  it("deletes deprecated registro docs (DELETE policy, never converts)", () => {
    expect(
      classifyMigrationSolicitud({ tipo: "registro", usuarioId: "u1" }),
    ).toEqual({ kind: "delete" });
    expect(
      classifyMigrationSolicitud({ tipo: "actualizacion", usuarioId: "u1" }),
    ).toEqual({ kind: "delete" });
  });

  it("deletes deprecated evento tipos", () => {
    expect(
      classifyMigrationSolicitud({ tipo: "registro-evento", usuarioId: "u1" }),
    ).toEqual({ kind: "delete" });
    expect(
      classifyMigrationSolicitud({
        tipo: "actualizacion-evento",
        usuarioId: "u1",
      }),
    ).toEqual({ kind: "delete" });
  });

  it("deletes docs still carrying the removed eventoId/proposal fields", () => {
    expect(
      classifyMigrationSolicitud({
        tipo: "reclamo-place",
        eventoId: "evento-1",
        solicitanteUid: "s1",
      }),
    ).toEqual({ kind: "delete" });
    expect(
      classifyMigrationSolicitud({
        tipo: "reclamo-place",
        proposal: { nombre: "x" },
        solicitanteUid: "s1",
      }),
    ).toEqual({ kind: "delete" });
  });

  it("backfills solicitanteUid from usuarioId for a reclamo-place doc missing it", () => {
    expect(
      classifyMigrationSolicitud({
        tipo: "reclamo-place",
        usuarioId: "uid-owner-001",
      }),
    ).toEqual({ kind: "backfill", solicitanteUid: "uid-owner-001" });
  });

  it("reports an orphan when both UIDs are missing (no destructive action)", () => {
    expect(classifyMigrationSolicitud({ tipo: "reclamo-place" })).toEqual({
      kind: "orphan",
    });
  });

  it("skips a fully formed reclamo-place doc (idempotent)", () => {
    expect(
      classifyMigrationSolicitud({
        tipo: "reclamo-place",
        solicitanteUid: "s1",
        usuarioId: "u1",
      }),
    ).toEqual({ kind: "skip" });
  });

  it("re-running on the already-skipped doc is a skip (idempotency)", () => {
    const doc: MigrationSolicitudInput = {
      tipo: "reclamo-place",
      solicitanteUid: "s1",
      usuarioId: "u1",
    };
    expect(classifyMigrationSolicitud(doc)).toEqual({ kind: "skip" });
    expect(classifyMigrationSolicitud(doc)).toEqual({ kind: "skip" });
  });
});
