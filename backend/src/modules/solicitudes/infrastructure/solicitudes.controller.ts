/**
 * SolicitudesController — HTTP layer for `solicitudes` approval flow.
 *
 * Two admin-only endpoints (closure of the `revisadoPor` authentication
 * debt documented in `docs/data-model/data-model.md §solicitudes`):
 *
 *  - POST /solicitudes/:id/approve → `service.aprobarSolicitud(id, adminUid)`
 *  - POST /solicitudes/:id/reject  → `service.rechazarSolicitud(id, adminUid, comentarios?)`
 *
 * Authorization (`auth-usuarios` change Decision 4):
 *
 *  - `@UseGuards(JwtAuthGuard, RolesGuard)` on the controller class so
 *    BOTH endpoints are protected by the JWT contract + role gate.
 *  - `@Roles('admin')` at the class level — both approve and reject are
 *    exclusively admin operations (a non-admin caller gets `403` from
 *    `RolesGuard` regardless of the method).
 *  - `revisadoPor` is captured server-side from `@CurrentUser().uid`
 *    (the verified Firebase Auth UID). The body DTO does NOT include a
 *    `revisadoPor` field — the `whitelist + forbidNonWhitelisted`
 *    `ValidationPipe` rejects any attempt to forge it.
 *
 * DIP — depends on `SolicitudesService` which lives in the `application/`
 * layer of this module. The service is injected via the concrete class
 * (matching the existing module wiring in `solicitudes.module.ts`).
 *
 * Path conventions (per `docs/api/api-spec.yml` after this change):
 *
 *  - mount: `/solicitudes` (controller path).
 *  - sub-paths: `:id/approve`, `:id/reject` (action-style, not REST
 *    resource sub-collection — `solicitudes` are an approval flow artefact,
 *    not a CRUD nested resource).
 *
 * SRP — the controller is the presentation boundary: extracts the route
 * param, the verified user, and (for reject) the optional `comentarios`
 * from the body; delegates everything else to the service.
 */
import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { SolicitudesService } from "../application/solicitudes.service";
import { Solicitud } from "../domain/solicitud.entity";
import { JwtAuthGuard } from "../../auth/application/jwt-auth.guard";
import { RolesGuard } from "../../auth/application/roles.guard";
import { Roles } from "../../auth/application/roles.decorator";
import { CurrentUser } from "../../auth/application/current-user.decorator";
import type { AuthContext } from "../../auth/domain/auth-context.interface";
import { RejectSolicitudDto } from "./dto/reject-solicitud.dto";

@Controller("solicitudes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  // -------------------------------------------------------------------------
  // POST /solicitudes/:id/approve
  // -------------------------------------------------------------------------
  /**
   * Approve a pending solicitud. `revisadoPor` is captured from the
   * verified caller (Firebase Auth UID) — the body cannot forge it.
   */
  @Post(":id/approve")
  async approve(
    @Param("id") id: string,
    @CurrentUser() user: AuthContext,
  ): Promise<Solicitud> {
    return this.solicitudesService.aprobarSolicitud(id, user.uid);
  }

  // -------------------------------------------------------------------------
  // POST /solicitudes/:id/reject
  // -------------------------------------------------------------------------
  /**
   * Reject a pending solicitud. `revisadoPor` is captured from the
   * verified caller. `comentarios` is optional and persisted as the
   * rejection note.
   */
  @Post(":id/reject")
  async reject(
    @Param("id") id: string,
    @CurrentUser() user: AuthContext,
    @Body() dto: RejectSolicitudDto,
  ): Promise<Solicitud> {
    return this.solicitudesService.rechazarSolicitud(
      id,
      user.uid,
      dto.comentarios,
    );
  }
}
