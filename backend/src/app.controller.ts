import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("app")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: "Obtener información de la API",
    description:
      "Endpoint raíz que retorna información básica sobre la API del Directorio de Concón",
  })
  @ApiResponse({
    status: 200,
    description: "Información de la API obtenida exitosamente",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "API del Directorio de Empresas de Concón",
        },
        version: { type: "string", example: "1.0.0" },
        environment: { type: "string", example: "development" },
        timestamp: { type: "string", example: "2025-11-06T10:00:00.000Z" },
        endpoints: {
          type: "object",
          properties: {
            docs: { type: "string", example: "/api/docs" },
            health: { type: "string", example: "/api/v1/health" },
            empresas: { type: "string", example: "/api/v1/empresas" },
          },
        },
      },
    },
  })
  getRoot() {
    return this.appService.getApiInfo();
  }
}
