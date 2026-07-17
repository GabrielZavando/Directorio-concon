import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const ValidationConfig = registerAs('validation', () => ({
  // Esquema de validación para variables de entorno
  envSchema: Joi.object({
    // Configuración del servidor
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test', 'staging')
      .default('development'),
    PORT: Joi.number().port().default(3000),
    
    // Firebase
    FIREBASE_PROJECT_ID: Joi.string().required(),
    FIREBASE_PRIVATE_KEY: Joi.string().required(),
    FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),
    FIREBASE_STORAGE_BUCKET: Joi.string().required(),
    
    // CORS
    CORS_ORIGINS: Joi.string().default('http://localhost:4200'),
    
    // Rate limiting
    RATE_LIMIT_TTL: Joi.number().default(60000),
    RATE_LIMIT_MAX: Joi.number().default(100),
    
    // Cache
    REDIS_URL: Joi.string().default('redis://localhost:6379'),
    REDIS_TTL: Joi.number().default(300),
    
    // Archivos
    MAX_FILE_SIZE: Joi.number().default(5242880), // 5MB
    
    // URLs
    FRONTEND_URL: Joi.string().uri().default('http://localhost:4200'),
    BACKEND_URL: Joi.string().uri().default('http://localhost:3000'),
  }),
  
  // Configuraciones de validación para DTOs
  dtoValidation: {
    // Empresa
    empresa: {
      nombre: {
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-\.&0-9]+$/,
      },
      descripcion: {
        minLength: 10,
        maxLength: 1000,
      },
      telefono: {
        pattern: /^(\+56)?[2-9]\d{7,8}$/, // Formato chileno
      },
      email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      sitioWeb: {
        pattern: /^https?:\/\/.+\..+/,
      },
      redesSociales: {
        maxItems: 3,
        nombre: {
          minLength: 2,
          maxLength: 50,
        },
        url: {
          pattern: /^https?:\/\/.+/,
        },
      },
    },
    
    // Categoría
    categoria: {
      nombre: {
        minLength: 3,
        maxLength: 100,
      },
      descripcion: {
        minLength: 10,
        maxLength: 500,
      },
      icono: {
        pattern: /^[a-z-]+$/, // Nombres de iconos Lucide en kebab-case
      },
      color: {
        pattern: /^#[0-9A-F]{6}$/i, // Color hexadecimal
      },
    },
    
    // Barrio
    barrio: {
      nombre: {
        minLength: 3,
        maxLength: 100,
      },
      codigo: {
        pattern: /^[A-Z0-9_]+$/,
      },
      tipo: {
        enum: ['urbano', 'rural'],
      },
    },
    
    // Usuario
    usuario: {
      nombre: {
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-\.]+$/,
      },
      email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      telefono: {
        pattern: /^(\+56)?[2-9]\d{7,8}$/,
      },
      rol: {
        enum: ['admin', 'empresa', 'usuario'],
      },
    },
    
    // Plan
    plan: {
      nombre: {
        minLength: 3,
        maxLength: 100,
      },
      precio: {
        min: 0,
        max: 999999, // 999,999 CLP máximo
      },
      duracion: {
        min: 0, // 0 = ilimitado
        max: 365, // 1 año máximo
      },
    },
    
    // Suscripción
    suscripcion: {
      status: {
        enum: ['activa', 'cancelada', 'expirada', 'suspendida'],
      },
      metodoPago: {
        enum: ['transferencia', 'webpay', 'paypal'],
      },
      monto: {
        min: 0,
        max: 999999,
      },
    },
    
    // Paginación
    pagination: {
      page: {
        min: 1,
        max: 1000,
        default: 1,
      },
      limit: {
        min: 1,
        max: 100,
        default: 20,
      },
    },
    
    // Búsqueda
    search: {
      query: {
        minLength: 2,
        maxLength: 100,
      },
      filters: {
        maxItems: 10, // Máximo 10 filtros simultáneos
      },
    },
  },
}));