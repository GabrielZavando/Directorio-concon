/**
 * UsuariosModule — wires the usuarios feature module.
 *
 * Imports `AuthModule` so the `JwtAuthGuard` + `RolesGuard` classes are
 * available in the DI scope of this module (the controller declares them
 * via `@UseGuards(JwtAuthGuard, RolesGuard)`). The auth module is the
 * single source of those guards — they are not duplicated here.
 *
 * Providers:
 *  - `UsuariosService` (application layer)
 *  - `UsuariosFirestoreAdapter` bound to the `USUARIOS_REPOSITORY` token
 *
 * Exports `UsuariosService` so other modules can inject the contract
 * (the `EventosService` may need it to validate that a `usuarioId` is a
 * known owner — used by `eventos.service.ts` in a future change).
 *
 * The controller is mounted at `/usuarios`.
 */
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsuariosService } from "./application/usuarios.service";
import { UsuariosController } from "./infrastructure/usuarios.controller";
import { UsuariosFirestoreAdapter } from "./infrastructure/usuarios-firestore.adapter";
import { USUARIOS_REPOSITORY } from "./domain/usuario-repository.token";

@Module({
  imports: [AuthModule],
  controllers: [UsuariosController],
  providers: [
    UsuariosService,
    {
      provide: USUARIOS_REPOSITORY,
      useClass: UsuariosFirestoreAdapter,
    },
  ],
  exports: [UsuariosService],
})
export class UsuariosModule {}
