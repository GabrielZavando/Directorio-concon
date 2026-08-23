/**
 * CategoriasController — HTTP endpoints for categorias.
 * Admin CRUD + public reads. Uses existing JwtAuthGuard + RolesGuard.
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
import { CategoriasService } from "../application/categorias.service";
import { CreateCategoriaDto } from "./dto/create-categoria.dto";
import { CreateSubcategoriaDto } from "./dto/create-subcategoria.dto";
import { UpdateCategoriaBodyDto } from "./dto/update-categoria-body.dto";
import { QueryCategoriaDto } from "./dto/query-categoria.dto";

@ApiTags("categorias")
@Controller("categorias")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriasController {
  constructor(private readonly service: CategoriasService) {}

  @Post()
  @Roles("admin")
  @ApiBearerAuth()
  create(@Body() dto: CreateCategoriaDto) {
    return this.service.create(dto);
  }

  @Get()
  @Public()
  @ApiQuery({ name: "activa", required: false, type: Boolean })
  async list(@Query() query: QueryCategoriaDto) {
    if (query.activa) {
      const cats = await this.service.listPublic();
      // Público no ve flags internos `activo` (ni categoría ni subcategoría).
      return cats.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        slug: c.slug,
        icono: c.icono,
        orden: c.orden,
        descripcion: c.descripcion,
        color: c.color,
        subcategorias: c.subcategorias.map((s) => ({
          slug: s.slug,
          nombre: s.nombre,
        })),
      }));
    }
    // Admin ve todo con flag activo
    return this.service.list({ onlyActive: false });
  }

  @Patch(":id")
  @Roles("admin")
  @ApiBearerAuth()
  updateById(@Param("id") id: string, @Body() dto: UpdateCategoriaBodyDto) {
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

  @Post(":id/subcategorias")
  @Roles("admin")
  @ApiBearerAuth()
  addSubcategoria(@Param("id") id: string, @Body() dto: CreateSubcategoriaDto) {
    return this.service.addSubcategoria(id, {
      slug: dto.slug,
      nombre: dto.nombre,
    });
  }

  @Patch(":id/subcategorias/:subId/desactivar")
  @Roles("admin")
  @ApiBearerAuth()
  deactivateSubcategoria(
    @Param("id") id: string,
    @Param("subId") subId: string,
  ) {
    return this.service.setSubcategoriaActivo(id, subId, false);
  }
}
