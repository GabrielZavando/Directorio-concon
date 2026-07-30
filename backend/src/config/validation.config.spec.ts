import { ValidationConfig } from "./validation.config";

describe("ValidationConfig — envSchema + dead config audit", () => {
  /**
   * This file documents the architectural decision (taken in the `roles-rename`
   * change) that the legacy `dtoValidation.*` block — never consumed by any
   * DTO/controller/service in the codebase — has been removed from
   * `validation.config.ts`. The `envSchema` (Joi schema for env-var parsing)
   * remains; NestJS `@nestjs/config` validates the env against it at boot.
   *
   * If a future change needs to add `dtoValidation.*` configs back (e.g., when
   * `auth + usuarios` introduces a `UsuariosService` that reads
   * `validation.dtoValidation.usuario` for runtime overrides), this test must
   * be updated FIRST to capture the new contract.
   */
  it("exposes the envSchema (consumed by @nestjs/config at boot)", () => {
    const configFactory = ValidationConfig as unknown as () => {
      envSchema: unknown;
    };
    const config = configFactory();
    expect(config.envSchema).toBeDefined();
    expect(typeof config.envSchema).toBe("object");
  });

  it("does NOT expose the legacy dtoValidation block (dead config audit)", () => {
    /**
     * Audit on 2026-07-29: a `grep -rn "dtoValidation" backend/src/` shows the
     * identifier is referenced only inside `validation.config.ts` itself — no
     * service, controller, DTO, or pipe reads `validation.dtoValidation.*`.
     * The `class-validator` decorators on each DTO (@MinLength, @MaxLength,
     * @IsEnum, @IsUrl, @ArrayMaxSize, ...) carry the validation contract; the
     * config block was legacy from the pre-`rename-to-places` era when a
     * hypothetical "dynamic DTO" was planned but never built.
     */
    const configFactory = ValidationConfig as unknown as () => Record<
      string,
      unknown
    >;
    const config = configFactory();
    expect(config).not.toHaveProperty("dtoValidation");
  });

  it("does NOT contain the legacy entity key 'empresa' (rename to 'place' audit)", () => {
    /**
     * Audit on 2026-07-29: the legacy key `dtoValidation.empresa` referenced a
     * pre-`rename-to-places` entity. After `roles-rename` it should not exist
     * anywhere in the runtime config. The new entity name is `places` (plural)
     * and validation is declared on DTOs via `class-validator`, not in config.
     */
    const configFactory = ValidationConfig as unknown as () => Record<
      string,
      unknown
    >;
    const config = configFactory();
    const json = JSON.stringify(config);
    expect(json).not.toContain("empresa");
  });

  it("does NOT contain the legacy rol key 'empresa' or 'usuario' (roles-rename audit)", () => {
    /**
     * Audit on 2026-07-29: the `dtoValidation.usuario.rol.enum` block was
     * updated in Task 2 of `roles-rename` to `['admin', 'owner', 'member']`.
     * After the dead-config cleanup, no `dtoValidation.usuario` block remains.
     * The Rol enum is the canonical source (rol.enum.ts).
     */
    const configFactory = ValidationConfig as unknown as () => Record<
      string,
      unknown
    >;
    const config = configFactory();
    const json = JSON.stringify(config);
    expect(json).not.toContain('"usuario"');
    expect(json).not.toContain('"empresa"');
  });
});
