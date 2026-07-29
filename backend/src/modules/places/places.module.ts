/**
 * Places module — Clean Architecture wiring.
 *
 * - Domain: pure types and interfaces (no imports from infrastructure)
 * - Application: PlacesService + PlaceApprovalHandler (depends on domain interfaces only)
 * - Infrastructure: controller + Firestore adapter (concrete implementations)
 */
import { Module } from "@nestjs/common";
import { PlacesController } from "./infrastructure/places.controller";
import { PlacesService } from "./application/places.service";
import { PlaceFirestoreAdapter } from "./infrastructure/place-firestore.adapter";
import { PLACE_REPOSITORY } from "./domain/place-repository.token";
import { SOLICITUDES_REPOSITORY } from "./domain/solicitudes-repository.token";
import type {
  SolicitudesRepositoryInterface,
  CreateSolicitudInput,
} from "./domain/solicitudes-repository.interface";
import { FirebaseService } from "@/common/services/firebase.service";
import { PlaceApprovalHandlerImpl } from "./application/place-approval.handler";
import { PLACE_APPROVAL_HANDLER } from "../solicitudes/application/approval-handlers";

/**
 * Minimal Solicitudes repository stub.
 * The full solicitudes module wiring will replace this in a future refactor.
 */
class StubSolicitudesRepository implements SolicitudesRepositoryInterface {
  async create(input: CreateSolicitudInput) {
    return {
      id: "stub",
      ...input,
    };
  }
  async existsByPlaceId(_placeId: string): Promise<boolean> {
    return false;
  }
}

@Module({
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
      provide: SOLICITUDES_REPOSITORY,
      useClass: StubSolicitudesRepository,
    },
    {
      provide: PLACE_APPROVAL_HANDLER,
      useExisting: PlaceApprovalHandlerImpl,
    },
  ],
  exports: [PlacesService],
})
export class PlacesModule {}
