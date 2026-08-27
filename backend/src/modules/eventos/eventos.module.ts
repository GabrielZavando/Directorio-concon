/**
 * Eventos module — Clean Architecture wiring.
 *
 * - Domain: pure types and interfaces (no imports from infrastructure)
 * - Application: EventosService + EventoValidator + NotificacionesPort
 * - Infrastructure: controller + Firestore adapter (concrete implementations)
 */
import { Module } from "@nestjs/common";
import { EventosController } from "./infrastructure/eventos.controller";
import { EventosService } from "./application/eventos.service";
import { EventoValidator } from "./application/evento-validator";
import { EventoFirestoreAdapter } from "./infrastructure/evento-firestore.adapter";
import { EVENTO_REPOSITORY } from "./domain/evento-repository.token";
import { NOTIFICACIONES_PORT } from "./application/notificaciones.port";
import { NoopNotificacionesAdapter } from "./infrastructure/notificaciones.noop.adapter";
import { FirebaseService } from "@/common/services/firebase.service";
import { AuthModule } from "../auth/auth.module";
import { CategoriasModule } from "../categorias/categorias.module";

@Module({
  imports: [AuthModule, CategoriasModule],
  controllers: [EventosController],
  providers: [
    EventosService,
    {
      provide: EventoValidator,
      useFactory: (firebase: FirebaseService) => new EventoValidator(firebase),
      inject: [FirebaseService],
    },
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
      // No-op in CH-04; real implementation lands in CH-06 (notificaciones-real)
      provide: NOTIFICACIONES_PORT,
      useClass: NoopNotificacionesAdapter,
    },
  ],
  exports: [EventosService],
})
export class EventosModule {}
