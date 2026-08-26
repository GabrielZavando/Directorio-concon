/**
 * RejectSolicitudDto — body of `POST /solicitudes/:id/reject` (admin-only).
 *
 * `comentarios` is OPTIONAL — admin may include a rejection note that
 * gets persisted on the `solicitud` document for audit purposes
 * (`Solicitud.comentarios`). Maximum 500 chars to keep the audit trail
 * readable and bounded.
 *
 * Defensive: `revisadoPor` is NOT a field of this DTO — it is set
 * server-side from `@CurrentUser().uid` (the `RolesGuard` already
 * verified the caller is `admin`). A client attempting to forge
 * `revisadoPor` receives `400 forbidNonWhitelisted` from the global
 * ValidationPipe.
 *
 * Pure DTO — no business logic, no Firebase, no NestJS runtime deps
 * (only `class-validator` decorators + `class-transformer` design-time).
 */
import { IsOptional, IsString, MaxLength } from "class-validator";

export class RejectSolicitudDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comentarios?: string;
}
