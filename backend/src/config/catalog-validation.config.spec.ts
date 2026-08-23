import { CatalogValidationConfig } from "./catalog-validation.config";

describe("CatalogValidationConfig — feature flag CATALOG_VALIDATION_ENABLED", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.CATALOG_VALIDATION_ENABLED;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("defaults to disabled when the env var is unset (safe default)", () => {
    const config = CatalogValidationConfig();
    expect(config.enabled).toBe(false);
  });

  it("enables when CATALOG_VALIDATION_ENABLED=true", () => {
    process.env.CATALOG_VALIDATION_ENABLED = "true";
    const config = CatalogValidationConfig();
    expect(config.enabled).toBe(true);
  });

  it("stays disabled for any non-'true' value (false, 1, empty)", () => {
    process.env.CATALOG_VALIDATION_ENABLED = "false";
    expect(CatalogValidationConfig().enabled).toBe(false);

    process.env.CATALOG_VALIDATION_ENABLED = "1";
    expect(CatalogValidationConfig().enabled).toBe(false);

    process.env.CATALOG_VALIDATION_ENABLED = "";
    expect(CatalogValidationConfig().enabled).toBe(false);
  });
});
