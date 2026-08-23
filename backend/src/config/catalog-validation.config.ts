import { registerAs } from "@nestjs/config";

/**
 * Catalog validation feature flag.
 *
 * When `enabled` is true, PlacesService and EventosService validate
 * `categoriaId` / `subcategoriaId` / `barrioId` against the catalogs
 * (categorias + barrios) on create/update. Default is `false` so the
 * flag must be explicitly opted-in (e.g. after `npm run seed` populated
 * the catalogs in the target environment).
 */
export const CatalogValidationConfig = registerAs("catalogValidation", () => ({
  enabled: process.env.CATALOG_VALIDATION_ENABLED === "true",
}));
