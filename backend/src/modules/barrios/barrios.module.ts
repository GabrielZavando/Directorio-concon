import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BarriosService } from "./application/barrios.service";
import { BarrioFirestoreAdapter } from "./infrastructure/barrio-firestore.adapter";
import { BarriosController } from "./infrastructure/barrios.controller";
import { BARRIO_READ_REPOSITORY } from "./domain/barrio-read-repository.interface";
import { BARRIO_WRITE_REPOSITORY } from "./domain/barrio-write-repository.interface";

/**
 * BarriosModule — wires the barrios feature module.
 *
 * Same guard strategy as CategoriasModule. Public reads via `@Public()`,
 * admin CRUD via `@Roles('admin')`.
 */
@Module({
  imports: [AuthModule],
  controllers: [BarriosController],
  providers: [
    BarriosService,
    {
      provide: BARRIO_READ_REPOSITORY,
      useClass: BarrioFirestoreAdapter,
    },
    {
      provide: BARRIO_WRITE_REPOSITORY,
      useClass: BarrioFirestoreAdapter,
    },
  ],
  exports: [BarriosService, BARRIO_READ_REPOSITORY, BARRIO_WRITE_REPOSITORY],
})
export class BarriosModule {}
