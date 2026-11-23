/**
 * Pure decision logic for the CH-05 `solicitudes` migration.
 *
 * Kept free of Firebase I/O so it is deterministic and unit-testable.
 * `migrate-solicitudes.ts` applies these actions to Firestore.
 */

/** Deprecated solicitud types removed by CH-05. */
const DEPRECATED_TIPOS = new Set([
  "registro",
  "actualizacion",
  "registro-evento",
  "actualizacion-evento",
]);

/** Removed fields that mark a legacy document for deletion. */
const REMOVED_FIELDS = ["eventoId", "proposal"] as const;

export interface MigrationSolicitudInput {
  tipo?: unknown;
  solicitanteUid?: unknown;
  usuarioId?: unknown;
  [key: string]: unknown;
}

export type MigrationSolicitudAction =
  | { kind: "delete" }
  | { kind: "backfill"; solicitanteUid: string }
  | { kind: "orphan" }
  | { kind: "skip" };

/**
 * Pure classification of a raw legacy `solicitudes` doc into its migration
 * action. DELETE policy: deprecated tipo / removed-field docs are deleted,
 * never converted to `reclamo-place`.
 */
export function classifyMigrationSolicitud(
  data: MigrationSolicitudInput,
): MigrationSolicitudAction {
  const tipo = data.tipo;
  const hasRemovedField = REMOVED_FIELDS.some(
    (field) => data[field] !== undefined && data[field] !== null,
  );
  const isLegacyTipo = typeof tipo === "string" && DEPRECATED_TIPOS.has(tipo);

  if (isLegacyTipo || hasRemovedField) {
    return { kind: "delete" };
  }

  const solicitanteUid = data.solicitanteUid;
  const usuarioId = data.usuarioId;
  const hasSolicitante =
    solicitanteUid !== undefined && solicitanteUid !== null;
  const hasUsuario = usuarioId !== undefined && usuarioId !== null;

  if (!hasSolicitante && !hasUsuario) {
    return { kind: "orphan" };
  }

  if (!hasSolicitante && typeof usuarioId === "string") {
    return { kind: "backfill", solicitanteUid: usuarioId };
  }

  return { kind: "skip" };
}
