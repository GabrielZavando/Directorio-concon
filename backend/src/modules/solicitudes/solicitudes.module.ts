/**
 * Solicitudes module — Clean Architecture wiring.
 *
 * Provides solicitud lifecycle: creation, approval, rejection.
 * Wires approval handlers for eventos and places (provided by their respective modules).
 *
 * Controller wiring (`auth-usuarios` Task 10):
 *  - mounts `SolicitudesController` (`POST /solicitudes/:id/approve|reject`).
 *  - imports `AuthModule` so `JwtAuthGuard`+`RolesGuard` resolve via DI
 *    (the controller's `@UseGuards(JwtAuthGuard, RolesGuard)` references
 *    the guard classes which live in `AuthModule`).
 *  - `@Roles('admin')` at controller-class level gates both endpoints
 *    admin-only; `revisadoPor` is captured server-side from
 *    `@CurrentUser().uid`.
 */
import { Module } from "@nestjs/common";
import { SolicitudesService } from "./application/solicitudes.service";
import { SolicitudesFirestoreAdapter } from "./infrastructure/solicitudes-firestore.adapter";
import { SolicitudesController } from "./infrastructure/solicitudes.controller";
import { SOLICITUDES_REPOSITORY } from "./domain/solicitudes-repository.token";
import { FirebaseService } from "@/common/services/firebase.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [SolicitudesController],
  providers: [
    SolicitudesService,
    {
      provide: SolicitudesFirestoreAdapter,
      useFactory: (firebase: FirebaseService) =>
        new SolicitudesFirestoreAdapter(firebase),
      inject: [FirebaseService],
    },
    {
      provide: SOLICITUDES_REPOSITORY,
      useExisting: SolicitudesFirestoreAdapter,
    },
  ],
  exports: [SolicitudesService, SOLICITUDES_REPOSITORY],
})
export class SolicitudesModule {}
