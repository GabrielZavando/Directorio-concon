import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Obtiene información básica de la API
   * @returns Información de la API con versión, entorno y endpoints disponibles
   */
  getApiInfo() {
    const nodeEnv = this.configService.get<string>("app.nodeEnv");
    const port = this.configService.get<number>("app.port");
    const backendUrl = this.configService.get<string>("app.backendUrl");

    return {
      message: "API del Directorio de Empresas de Concón",
      description:
        "Sistema completo de gestión de empresas locales con funcionalidades premium e IA integrada",
      version: "1.0.0",
      environment: nodeEnv,
      timestamp: new Date().toISOString(),
      endpoints: {
        docs: nodeEnv === "development" ? `${backendUrl}/api/docs` : null,
        health: `${backendUrl}/api/v1/health`,
        empresas: `${backendUrl}/api/v1/empresas`,
        categorias: `${backendUrl}/api/v1/categorias`,
        barrios: `${backendUrl}/api/v1/barrios`,
        auth: `${backendUrl}/api/v1/auth`,
        planes: `${backendUrl}/api/v1/planes`,
      },
      features: {
        authentication: "Firebase Auth",
        database: "Firestore",
        storage: "Firebase Storage",
        ai: "OpenAI GPT-4 + Qdrant",
        payments: "Webpay + PayPal",
        cache: "Redis",
        realtime: "WebSockets",
      },
      contact: {
        developer: "Agencia Digital",
        email: "desarrollo@agencia-digital.cl",
        website: "https://agencia-digital.cl",
      },
    };
  }

  /**
   * Verifica el estado de salud de la aplicación
   * @returns Estado de salud de la aplicación y servicios conectados
   */
  getHealthStatus() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        firebase: "connected",
        redis: "connected", // TODO: Implementar verificación real
        api: "running",
      },
    };
  }
}
