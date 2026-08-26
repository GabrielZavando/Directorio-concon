/**
 * Eventos module — Clean Architecture wiring.
 *
 * - Domain: pure types and interfaces (no imports from infrastructure)
 * - Application: EventosService + EventoValidator + EventoApprovalHandler
 * - Infrastructure: controller + Firestore adapter (concrete implementations)
 */
import { Module } from "@nestjs/common";
import { EventosController } from "./infrastructure/eventos.controller";
import { EventosService } from "./application/eventos.service";
import { EventoValidator } from "./application/evento-validator";
import { EventoFirestoreAdapter } from "./infrastructure/evento-firestore.adapter";
import { EVENTO_REPOSITORY } from "./domain/evento-repository.token";
import { FirebaseService } from "@/common/services/firebase.service";
import { SolicitudesModule } from "../solicitudes/solicitudes.module";
import { SolicitudesService } from "../solicitudes/application/solicitudes.service";
import { EventoApprovalHandlerImpl } from "./application/evento-approval.handler";
import { EVENTO_APPROVAL_HANDLER } from "../solicitudes/application/approval-handlers";
import { AuthModule } from "../auth/auth.module";
import { CategoriasModule } from "../categorias/categorias.module";

@Module({
  imports: [SolicitudesModule, AuthModule, CategoriasModule],
  controllers: [EventosController],
  providers: [
    EventosService,
    {
      provide: EventoValidator,
      useFactory: (firebase: FirebaseService) => new EventoValidator(firebase),
      inject: [FirebaseService],
    },
    EventoApprovalHandlerImpl,
    {
      provide: EventoFirestoreAdapter,
      useFactory: (firebase: FirebaseService) =>
        new EventoFirestoreAdapter(firebase),
      inject: [FirebaseService],
    },
    {
      provide: EVENTO_REPOSITORY,
      useExisting: EventoFirestoreAdapter,
    },
    {
      provide: EventosService.SOLICITUDES_SERVICE,
      useExisting: SolicitudesService,
    },
    {
      provide: EVENTO_APPROVAL_HANDLER,
      useExisting: EventoApprovalHandlerImpl,
    },
  ],
  exports: [EventosService],
})
export class EventosModule {}
