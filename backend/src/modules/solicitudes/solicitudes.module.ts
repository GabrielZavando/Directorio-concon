/**
 * Solicitudes module — Clean Architecture wiring.
 *
 * Provides solicitud lifecycle: creation, approval, rejection.
 * Wires approval handlers for eventos and places (provided by their respective modules).
 */
import { Module } from "@nestjs/common";
import { SolicitudesService } from "./application/solicitudes.service";
import { SolicitudesFirestoreAdapter } from "./infrastructure/solicitudes-firestore.adapter";
import { SOLICITUDES_REPOSITORY } from "./domain/solicitudes-repository.token";
import { FirebaseService } from "@/common/services/firebase.service";

@Module({
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
