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
import { EmpresasService } from "../application/empresas.service";
import { CreateEmpresaDto } from "./dto/create-empresa.dto";
import { UpdateEmpresaDto } from "./dto/update-empresa.dto";
import { QueryEmpresaDto } from "./dto/query-empresa.dto";
import type { Empresa } from "../domain/empresa.entity";
import type { PaginatedResult } from "../domain/empresa-repository.interface";

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
  findAll(@Query() query: QueryEmpresaDto): Promise<PaginatedResult<Empresa>> {
    return this.empresasService.findAll(
      {
        categoriaId: query.categoriaId,
        barrioId: query.barrioId,
        q: query.q,
        status: query.status,
      },
      query.page ?? 1,
      query.limit ?? 20,
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
