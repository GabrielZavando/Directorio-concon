import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";

// Configuración
import { AppConfig } from "@/config/app.config";
import { FirebaseConfig } from "@/config/firebase.config";
import { ValidationConfig } from "@/config/validation.config";

// Módulos principales
import { PlacesModule } from "@/modules/places/places.module";
// import { CategoriasModule } from '@/modules/categorias/categorias.module';
// import { BarriosModule } from '@/modules/barrios/barrios.module';
// import { UsuariosModule } from '@/modules/usuarios/usuarios.module';
// import { SolicitudesModule } from '@/modules/solicitudes/solicitudes.module';

// Módulos de autenticación
// import { AuthModule } from '@/modules/auth/auth.module';

// Módulos de monetización
// import { PlanesModule } from '@/modules/planes/planes.module';
// import { SuscripcionesModule } from '@/modules/suscripciones/suscripciones.module';
// import { PagosModule } from '@/modules/pagos/pagos.module';

// Módulos premium
// import { RecursosDigitalesModule } from '@/modules/recursos-digitales/recursos-digitales.module';
// import { ChatEmpresarialModule } from '@/modules/chat-empresarial/chat-empresarial.module';

// Módulos de reviews
// import { ReviewsModule } from '@/modules/reviews/reviews.module';

// Módulos de IA
// import { AiModule } from '@/modules/ai/ai.module';

// Módulos de analytics
// import { AnalyticsModule } from '@/modules/analytics/analytics.module';

// Controladores globales
import { AppController } from "./app.controller";
import { HealthController } from "@/common/controllers/health.controller";

// Servicios globales
import { FirebaseModule } from "@/common/modules/firebase.module";
import { AppService } from "./app.service";

@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfig, FirebaseConfig, ValidationConfig],
      envFilePath: [".env.local", ".env"],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000, // 1 segundo
        limit: 3, // 3 requests por segundo
      },
      {
        name: "medium",
        ttl: 10000, // 10 segundos
        limit: 20, // 20 requests por 10 segundos
      },
      {
        name: "long",
        ttl: 60000, // 1 minuto
        limit: 100, // 100 requests por minuto
      },
    ]),

    // Cache con Redis
    CacheModule.register({
      isGlobal: true,
      ttl: 300, // 5 minutos por defecto
    }),

    // Firebase (global — provides FirebaseService everywhere)
    FirebaseModule,

    // Módulos principales (TODO: Descomentar cuando estén implementados)
    PlacesModule,
    // CategoriasModule,
    // BarriosModule,
    // UsuariosModule,
    // SolicitudesModule,

    // Autenticación
    // AuthModule,

    // Monetización
    // PlanesModule,
    // SuscripcionesModule,
    // PagosModule,

    // Funcionalidades premium
    // RecursosDigitalesModule,
    // ChatEmpresarialModule,

    // Reviews y feedback
    // ReviewsModule,

    // Inteligencia Artificial
    // AiModule,

    // Analytics
    // AnalyticsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
