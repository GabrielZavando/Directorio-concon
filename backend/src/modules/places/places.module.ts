/**
 * Places module — Clean Architecture wiring.
 *
 * - Domain: pure types and interfaces (no imports from infrastructure)
 * - Application: PlacesService + PlaceApprovalHandler (depends on domain interfaces only)
 * - Infrastructure: controller + Firestore adapter (concrete implementations)
 *
 * places-auth-fix (Task 3): `SOLICITUDES_REPOSITORY` resolves to the real
 * `SolicitudesFirestoreAdapter` exported by `SolicitudesModule` (replaces the
 * legacy `StubSolicitudesRepository`).
 *
 * CH-05: `SolicitudesModule` needs `PLACE_APPROVAL_HANDLER` (provided here) and
 * this module needs `SOLICITUDES_REPOSITORY` (exported by SolicitudesModule).
 * The mutual dependency is resolved by importing `SolicitudesModule` through
 * `forwardRef` and exporting `PLACE_APPROVAL_HANDLER`, so the `reclamo-place`
 * approve/reject flow resolves the handler at runtime instead of `undefined`.
 */
import { Module, forwardRef } from "@nestjs/common";
import { PlacesController } from "./infrastructure/places.controller";
import { PlacesService } from "./application/places.service";
import { PlaceFirestoreAdapter } from "./infrastructure/place-firestore.adapter";
import { PLACE_REPOSITORY } from "./domain/place-repository.token";
import { FirebaseService } from "@/common/services/firebase.service";
import { PlaceApprovalHandlerImpl } from "./application/place-approval.handler";
import { PLACE_APPROVAL_HANDLER } from "../solicitudes/application/approval-handlers";
import { AuthModule } from "../auth/auth.module";
// eslint-disable-next-line import/no-cycle -- justified circular DI (NestJS forwardRef): places needs SOLICITUDES_REPOSITORY, solicitudes needs PLACE_APPROVAL_HANDLER.
import { SolicitudesModule } from "../solicitudes/solicitudes.module";
import { CategoriasModule } from "../categorias/categorias.module";

@Module({
  imports: [AuthModule, forwardRef(() => SolicitudesModule), CategoriasModule],
  controllers: [PlacesController],
  providers: [
    PlacesService,
    PlaceApprovalHandlerImpl,
    {
      provide: PlaceFirestoreAdapter,
      useFactory: (firebase: FirebaseService) =>
        new PlaceFirestoreAdapter(firebase),
      inject: [FirebaseService],
    },
    {
      provide: PLACE_REPOSITORY,
      useExisting: PlaceFirestoreAdapter,
    },
    {
      provide: PLACE_APPROVAL_HANDLER,
      useExisting: PlaceApprovalHandlerImpl,
    },
  ],
  exports: [PlacesService, PLACE_APPROVAL_HANDLER],
})
export class PlacesModule {}
