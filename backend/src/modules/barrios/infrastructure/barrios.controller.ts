/**
 * BarriosController — HTTP endpoints for barrios.
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/application/jwt-auth.guard";
import { RolesGuard } from "@/modules/auth/application/roles.guard";
import { Roles } from "@/modules/auth/application/roles.decorator";
import { Public } from "@/modules/auth/application/public.decorator";
import { BarriosService } from "../application/barrios.service";
import { CreateBarrioDto } from "./dto/create-barrio.dto";
import { UpdateBarrioDto } from "./dto/update-barrio.dto";
import { QueryBarrioDto } from "./dto/query-barrio.dto";

@ApiTags("barrios")
@Controller("barrios")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BarriosController {
  constructor(private readonly service: BarriosService) {}

  @Post()
  @Roles("admin")
  @ApiBearerAuth()
  create(@Body() dto: CreateBarrioDto) {
    return this.service.create(dto);
  }

  @Get()
  @Public()
  @ApiQuery({ name: "activo", required: false, type: Boolean })
  async list(@Query() query: QueryBarrioDto) {
    if (query.activo) {
      const barrios = await this.service.listPublic();
      // Público no ve flag interno `activo`.
      return barrios.map((b) => ({
        id: b.id,
        nombre: b.nombre,
        slug: b.slug,
        tipo: b.tipo,
        descripcion: b.descripcion,
        territorio: b.territorio,
        codigo: b.codigo,
        coordenadas: b.coordenadas,
      }));
    }
    return this.service.list({ onlyActive: false });
  }

  @Patch(":id")
  @Roles("admin")
  @ApiBearerAuth()
  updateById(@Param("id") id: string, @Body() dto: UpdateBarrioDto) {
    return this.service.updateById(id, dto);
  }

  @Patch(":id/desactivar")
  @Roles("admin")
  @ApiBearerAuth()
  deactivate(@Param("id") id: string) {
    return this.service.deactivate(id);
  }

  @Patch(":id/activar")
  @Roles("admin")
  @ApiBearerAuth()
  activate(@Param("id") id: string) {
    return this.service.activate(id);
  }
}
