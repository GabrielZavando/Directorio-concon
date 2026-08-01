/**
 * Places module — Clean Architecture wiring.
 *
 * - Domain: pure types and interfaces (no imports from infrastructure)
 * - Application: PlacesService + PlaceApprovalHandler (depends on domain interfaces only)
 * - Infrastructure: controller + Firestore adapter (concrete implementations)
 *
 * places-auth-fix (Task 3): `SOLICITUDES_REPOSITORY` resolves to the real
 * `SolicitudesFirestoreAdapter` exported by `SolicitudesModule` (replaces the
 * legacy `StubSolicitudesRepository`). No `forwardRef` is needed: the module
 * graph has no circular dependency (`SolicitudesModule` does not import
 * `PlacesModule`).
 */
import { Module } from "@nestjs/common";
import { PlacesController } from "./infrastructure/places.controller";
import { PlacesService } from "./application/places.service";
import { PlaceFirestoreAdapter } from "./infrastructure/place-firestore.adapter";
import { PLACE_REPOSITORY } from "./domain/place-repository.token";
import { FirebaseService } from "@/common/services/firebase.service";
import { PlaceApprovalHandlerImpl } from "./application/place-approval.handler";
import { PLACE_APPROVAL_HANDLER } from "../solicitudes/application/approval-handlers";
import { AuthModule } from "../auth/auth.module";
import { SolicitudesModule } from "../solicitudes/solicitudes.module";

@Module({
  imports: [AuthModule, SolicitudesModule],
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
  exports: [PlacesService],
})
export class PlacesModule {}
