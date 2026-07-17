import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AppService } from "@/app.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: "Verificar estado de salud",
    description:
      "Endpoint para verificar que la API está funcionando correctamente y el estado de los servicios conectados",
  })
  @ApiResponse({
    status: 200,
    description: "Estado de salud obtenido exitosamente",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        timestamp: { type: "string", example: "2025-11-06T10:00:00.000Z" },
        uptime: { type: "number", example: 3600.123 },
        memory: {
          type: "object",
          properties: {
            rss: { type: "number" },
            heapTotal: { type: "number" },
            heapUsed: { type: "number" },
            external: { type: "number" },
          },
        },
        services: {
          type: "object",
          properties: {
            firebase: { type: "string", example: "connected" },
            redis: { type: "string", example: "connected" },
            api: { type: "string", example: "running" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description:
      "Servicio no disponible - Uno o más servicios no están funcionando correctamente",
  })
  getHealth() {
    return this.appService.getHealthStatus();
  }
}
