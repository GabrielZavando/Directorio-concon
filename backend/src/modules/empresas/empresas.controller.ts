import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { EmpresasService } from "./empresas.service";
import { CreateEmpresaDto } from "./dto/create-empresa.dto";
import { UpdateEmpresaDto } from "./dto/update-empresa.dto";
import type { Empresa } from "./entities/empresa.entity";
import type { EmpresaStatus } from "./entities/empresa-status";
import { PaginatedEmpresas } from "./empresas.service";

@ApiTags("empresas")
@Controller("empresas")
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Post()
  @ApiOperation({ summary: "Crear una nueva empresa" })
  @ApiResponse({ status: 201, description: "Empresa creada" })
  @ApiResponse({ status: 409, description: "Slug duplicado" })
  @ApiResponse({ status: 400, description: "DTO inválido" })
  create(@Body() dto: CreateEmpresaDto): Promise<Empresa> {
    return this.empresasService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "Listar empresas (filtros + paginación)" })
  findAll(
    @Query("categoriaId") categoriaId?: string,
    @Query("barrioId") barrioId?: string,
    @Query("q") q?: string,
    @Query("status") status?: EmpresaStatus,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<PaginatedEmpresas> {
    return this.empresasService.findAll(
      { categoriaId, barrioId, q, status },
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get("slug/:slug")
  @ApiOperation({ summary: "Obtener empresa por slug" })
  findBySlug(@Param("slug") slug: string): Promise<Empresa> {
    return this.empresasService.findBySlug(slug);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener empresa por id" })
  findOne(@Param("id") id: string): Promise<Empresa> {
    return this.empresasService.findOne(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Actualizar empresa" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateEmpresaDto,
  ): Promise<Empresa> {
    return this.empresasService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar empresa" })
  async remove(
    @Param("id") id: string,
  ): Promise<{ deleted: boolean; id: string }> {
    await this.empresasService.remove(id);
    return { deleted: true, id };
  }
}
