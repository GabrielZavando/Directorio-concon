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
 *
 * CH-05 wiring: `PLACE_APPROVAL_HANDLER` is provided (and exported) by
 * `PlacesModule`. Because `SolicitudesService` consumes that token and the
 * modules depend on each other (places uses `SOLICITUDES_REPOSITORY`),
 * `SolicitudesModule` imports `PlacesModule` via `forwardRef` and `PlacesModule`
 * imports `SolicitudesModule` via `forwardRef` — breaking the circular module
 * reference so the `reclamo-place` approve/reject flow resolves the handler at
 * runtime instead of injecting `undefined`.
 */
import { Module, forwardRef } from "@nestjs/common";
import { SolicitudesService } from "./application/solicitudes.service";
import { SolicitudesFirestoreAdapter } from "./infrastructure/solicitudes-firestore.adapter";
import { SolicitudesController } from "./infrastructure/solicitudes.controller";
import { SOLICITUDES_REPOSITORY } from "./domain/solicitudes-repository.token";
import { FirebaseService } from "@/common/services/firebase.service";
import { AuthModule } from "../auth/auth.module";
// eslint-disable-next-line import/no-cycle -- justified circular DI (NestJS forwardRef): places needs SOLICITUDES_REPOSITORY, solicitudes needs PLACE_APPROVAL_HANDLER.
import { PlacesModule } from "../places/places.module";

@Module({
  imports: [AuthModule, forwardRef(() => PlacesModule)],
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
