import { registerAs } from "@nestjs/config";
import * as Joi from "joi";

export const ValidationConfig = registerAs("validation", () => ({
  // Esquema de validación para variables de entorno
  envSchema: Joi.object({
    // Configuración del servidor
    NODE_ENV: Joi.string()
      .valid("development", "production", "test", "staging")
      .default("development"),
    PORT: Joi.number().port().default(3000),

    // Firebase (opcional: credenciales desde firebase-admin.json o env vars)
    FIREBASE_ENABLED: Joi.boolean().default(false),
    FIREBASE_PROJECT_ID: Joi.string().optional(),
    FIREBASE_PRIVATE_KEY: Joi.string().optional(),
    FIREBASE_PRIVATE_KEY_ID: Joi.string().optional(),
    FIREBASE_CLIENT_EMAIL: Joi.string().email().optional(),
    FIREBASE_CLIENT_ID: Joi.string().optional(),
    FIREBASE_STORAGE_BUCKET: Joi.string().optional(),
    FIREBASE_DATABASE_URL: Joi.string().uri().optional(),
    FIREBASE_ADMIN_CREDENTIALS_PATH: Joi.string().optional(),

    // CORS
    CORS_ORIGINS: Joi.string().default("http://localhost:4200"),

    // Rate limiting
    RATE_LIMIT_TTL: Joi.number().default(60000),
    RATE_LIMIT_MAX: Joi.number().default(100),

    // Cache
    REDIS_URL: Joi.string().default("redis://localhost:6379"),
    REDIS_TTL: Joi.number().default(300),

    // Archivos
    MAX_FILE_SIZE: Joi.number().default(5242880), // 5MB

    // URLs
    FRONTEND_URL: Joi.string().uri().default("http://localhost:4200"),
    BACKEND_URL: Joi.string().uri().default("http://localhost:3000"),
  }),

  /**
   * Validation contract note (roles-rename change audit, 2026-07-29):
   *
   * The legacy `dtoValidation` block (with keys `empresa`, `categoria`,
   * `barrio`, `usuario`, `plan`, `suscripcion`, `pagination`, `search`)
   * was DEAD CONFIG: an audit (`grep -rn "dtoValidation" backend/src/`)
   * confirmed no service, controller, DTO, or pipe ever reads
   * `validation.dtoValidation.*`. The legacy `empresa` key references
   * the pre-`rename-to-places` entity; `usuario.rol.enum` was the only
   * part touched by `roles-rename` Task 2 before the broader dead-config
   * audit.
   *
   * Validation of DTO fields is carried by `class-validator` decorators
   * (`@MinLength`, `@MaxLength`, `@IsEnum`, `@IsUrl`, `@ArrayMaxSize`,
   * etc.) declared on each DTO class — see `create-place.dto.ts`,
   * `create-evento.dto.ts`, etc. The `Rol` enum has its canonical home
   * at `backend/src/modules/auth/domain/rol.enum.ts` (relocated by the
   * `auth-usuarios` change — originally at
   * `backend/src/modules/usuarios/domain/rol.enum.ts` from the
   * `roles-rename` change).
   *
   * If a future change reintroduces a `dtoValidation.*` block (e.g., a
   * future `auth + usuarios` change that needs runtime-configurable
   * user-validation rules), the contract must be captured in a new
   * test case in `validation.config.spec.ts` first.
   */
}));
