import { registerAs } from "@nestjs/config";

function num(key: string, fallback: number): number {
  return parseInt(process.env[key] ?? "", 10) || fallback;
}

export const AppConfig = registerAs("app", () => ({
  // Configuración del servidor
  port: num("PORT", 3000),
  nodeEnv: process.env.NODE_ENV || "development",

  // URLs y dominios permitidos
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:4200", "https://directorio-concon.web.app"],

  // Rate limiting
  rateLimitTtl: num("RATE_LIMIT_TTL", 60000), // 1 minuto
  rateLimitMax: num("RATE_LIMIT_MAX", 100), // 100 requests

  // JWT y seguridad
  jwtSecret: process.env.JWT_SECRET || "directorio-concon-secret-key",
  bcryptRounds: num("BCRYPT_ROUNDS", 10),

  // Cache y Redis
  cacheStore: process.env.CACHE_STORE || "memory",
  redisTtl: num("REDIS_TTL", 300), // 5 minutos
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  // Configuración de aplicación específica
  defaultPageSize: num("DEFAULT_PAGE_SIZE", 20),
  maxPageSize: num("MAX_PAGE_SIZE", 100),

  // URLs externas
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:4200",
  backendUrl: process.env.BACKEND_URL || "http://localhost:3000",

  // Configuración de archivos
  maxFileSize: num("MAX_FILE_SIZE", 5242880), // 5MB
  allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],
  allowedVideoTypes: ["video/mp4", "video/webm"],

  // Configuración de logging
  logLevel: process.env.LOG_LEVEL || "info",
  enableLogging: process.env.ENABLE_LOGGING !== "false",
}));
