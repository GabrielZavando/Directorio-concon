/**
 * CatalogValidator — shared validation service for cross-catalog checks.
 * Used by PlacesService and EventosService to validate categoriaId,
 * subcategoriaId, and barrioId before create/update.
 *
 * The `enabled` flag comes from `CATALOG_VALIDATION_ENABLED` (see
 * `src/config/catalog-validation.config.ts`). Consumers gate their
 * `assert*` calls on `validator.enabled` — when disabled, no repository
 * reads are made and legacy/seed-less environments keep working.
 */
import { Injectable, Inject, BadRequestException } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { CatalogValidationConfig } from "@/config/catalog-validation.config";
import type { CategoriaReadRepository } from "../domain/categoria-read-repository.interface";
import type { BarrioReadRepository } from "../../barrios/domain/barrio-read-repository.interface";
import { CATEGORIA_READ_REPOSITORY } from "../domain/categoria-read-repository.interface";
import { BARRIO_READ_REPOSITORY } from "../../barrios/domain/barrio-read-repository.interface";

@Injectable()
export class CatalogValidator {
  constructor(
    @Inject(CATEGORIA_READ_REPOSITORY)
    private readonly catRepo: CategoriaReadRepository,
    @Inject(BARRIO_READ_REPOSITORY)
    private readonly barrioRepo: BarrioReadRepository,
    @Inject(CatalogValidationConfig.KEY)
    private readonly config: ConfigType<typeof CatalogValidationConfig>,
  ) {}

  /** Whether cross-catalog validation is enabled for the running process. */
  get enabled(): boolean {
    return this.config.enabled;
  }

  async assertCategoriaActiva(categoriaId: string): Promise<void> {
    const cat = await this.catRepo.findById(categoriaId);
    if (!cat || !cat.activo) {
      throw new BadRequestException("Categoría inválida o inactiva");
    }
  }

  async assertSubcategoriaActiva(
    categoriaId: string,
    subcategoriaId: string,
  ): Promise<void> {
    const cat = await this.catRepo.findById(categoriaId);
    if (!cat || !cat.activo) {
      throw new BadRequestException("Categoría inválida o inactiva");
    }
    const sub = cat.findSubcategoriaBySlug(subcategoriaId, true);
    if (!sub) {
      throw new BadRequestException("Subcategoría inválida o inactiva");
    }
  }

  async assertBarrioActivo(barrioId: string): Promise<void> {
    const barrio = await this.barrioRepo.findById(barrioId);
    if (!barrio || !barrio.activo) {
      throw new BadRequestException("Barrio inválido o inactivo");
    }
  }
}
