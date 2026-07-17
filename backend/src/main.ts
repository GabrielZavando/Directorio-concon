import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '@/common/interceptors/transform.interceptor';
import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Crear aplicación NestJS
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Obtener configuración
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;
  const nodeEnv = configService.get<string>('app.nodeEnv') || 'development';

  // Configurar CORS
  app.use(
    cors({
      origin: configService.get<string[]>('app.corsOrigins') || [
        'http://localhost:4200',
        'https://directorio-concon.web.app',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }),
  );

  // Seguridad básica
  app.use(helmet());
  app.use(compression());

  // Prefijo global para todas las rutas
  app.setGlobalPrefix('api/v1');

  // Pipes globales - Validación automática
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Transforma automáticamente los DTOs
      whitelist: true, // Elimina propiedades no definidas en DTOs
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas
      transformOptions: {
        enableImplicitConversion: true, // Conversión automática de tipos
      },
    }),
  );

  // Filtros globales - Manejo de errores
  app.useGlobalFilters(new AllExceptionsFilter());

  // Interceptors globales
  app.useGlobalInterceptors(
    new LoggingInterceptor(), // Logging de requests
    new TransformInterceptor(), // Transformación de respuestas
  );

  // Configuración de Swagger - Solo en desarrollo
  if (nodeEnv === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Directorio Concón API')
      .setDescription(
        'API REST para el Directorio de Empresas de Concón. ' +
          'Sistema completo de gestión de empresas locales con funcionalidades premium, ' +
          'IA integrada y sistema de monetización.',
      )
      .setVersion('1.0')
      .setContact(
        'Agencia Digital',
        'https://agencia-digital.cl',
        'desarrollo@agencia-digital.cl',
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Token de Firebase Auth',
          in: 'header',
        },
        'firebase-auth',
      )
      .addTag('auth', 'Autenticación y autorización')
      .addTag('empresas', 'Gestión de empresas')
      .addTag('categorias', 'Gestión de categorías')
      .addTag('barrios', 'Gestión de barrios')
      .addTag('usuarios', 'Gestión de usuarios')
      .addTag('planes', 'Sistema de planes y suscripciones')
      .addTag('premium', 'Funcionalidades premium')
      .addTag('ai', 'Inteligencia Artificial')
      .addTag('analytics', 'Analytics y métricas')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    logger.log(`📖 Documentación Swagger: http://localhost:${port}/api/docs`);
  }

  // Iniciar servidor
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Servidor iniciado en: http://localhost:${port}/api/v1`);
  logger.log(`🌍 Entorno: ${nodeEnv}`);
  logger.log(`🔥 Firebase configurado correctamente`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Error al iniciar el servidor:', error);
  process.exit(1);
});