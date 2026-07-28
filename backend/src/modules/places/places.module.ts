/**
 * Places module — Clean Architecture wiring.
 *
 * - Domain: pure types and interfaces (no imports from infrastructure)
 * - Application: PlacesService (depends on domain interfaces only)
 * - Infrastructure: controller + Firestore adapter (concrete implementations)
 */
import { Module } from "@nestjs/common";
import { PlacesController } from "./infrastructure/places.controller";
import { PlacesService } from "./application/places.service";
import { PlaceFirestoreAdapter } from "./infrastructure/place-firestore.adapter";
import { PLACE_REPOSITORY } from "./domain/place-repository.token";
import { SOLICITUDES_REPOSITORY } from "./domain/solicitudes-repository.token";
import type { SolicitudesRepositoryInterface } from "./domain/solicitudes-repository.interface";
import { FirebaseService } from "@/common/services/firebase.service";

/**
 * Minimal Solicitudes repository stub.
 * The full solicitudes module will replace this provider.
 * For now, it always returns false for existsByPlaceId (allows delete to work).
 */
class StubSolicitudesRepository implements SolicitudesRepositoryInterface {
  async create(input) {
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
  ],
  exports: [PlacesService],
})
export class PlacesModule {}
