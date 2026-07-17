import { registerAs } from '@nestjs/config';

export const AppConfig = registerAs('app', () => ({
  // Configuración del servidor
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // URLs y dominios permitidos
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:4200', 'https://directorio-concon.web.app'],
  
  // Rate limiting
  rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60000, // 1 minuto
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // 100 requests
  
  // JWT y seguridad
  jwtSecret: process.env.JWT_SECRET || 'directorio-concon-secret-key',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
  
  // Cache y Redis
  cacheStore: process.env.CACHE_STORE || 'memory',
  redisTtl: parseInt(process.env.REDIS_TTL, 10) || 300, // 5 minutos
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Configuración de aplicación específica
  defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 20,
  maxPageSize: parseInt(process.env.MAX_PAGE_SIZE, 10) || 100,
  
  // URLs externas
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  
  // Configuración de archivos
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedVideoTypes: ['video/mp4', 'video/webm'],
  
  // Configuración de logging
  logLevel: process.env.LOG_LEVEL || 'info',
  enableLogging: process.env.ENABLE_LOGGING !== 'false',
}));