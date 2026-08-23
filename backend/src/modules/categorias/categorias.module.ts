import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "@/modules/auth/auth.module";
import { BarriosModule } from "@/modules/barrios/barrios.module";
import { CatalogValidationConfig } from "@/config/catalog-validation.config";
import { CategoriasService } from "./application/categorias.service";
import { CatalogValidator } from "./application/catalog-validator.service";
import { CategoriasController } from "./infrastructure/categorias.controller";
import { CategoriaFirestoreAdapter } from "./infrastructure/categoria-firestore.adapter";
import { CATEGORIA_READ_REPOSITORY } from "./domain/categoria-read-repository.interface";
import { CATEGORIA_WRITE_REPOSITORY } from "./domain/categoria-write-repository.interface";

/**
 * CategoriasModule — wires the categorias feature module.
 * Provides CategoriasService, CatalogValidator (shared with Places/Eventos),
 * and the Firestore adapter bound to repository interfaces.
 * Imports BarriosModule so CatalogValidator can resolve BARRIO_READ_REPOSITORY.
 * Uses `ConfigModule.forFeature` so the `catalogValidation` namespace is
 * resolvable even when the module is compiled standalone in tests.
 */
@Module({
  imports: [
    ConfigModule.forFeature(CatalogValidationConfig),
    AuthModule,
    BarriosModule,
  ],
  controllers: [CategoriasController],
  providers: [
    CategoriasService,
    CatalogValidator,
    {
      provide: CATEGORIA_READ_REPOSITORY,
      useClass: CategoriaFirestoreAdapter,
    },
    {
      provide: CATEGORIA_WRITE_REPOSITORY,
      useClass: CategoriaFirestoreAdapter,
    },
  ],
  exports: [CategoriasService, CatalogValidator],
})
export class CategoriasModule {}
