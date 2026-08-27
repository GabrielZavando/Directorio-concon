/**
 * REST controller for the Evento aggregate.
 * Routes: /api/v1/eventos
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { EventosService } from "../application/eventos.service";

const MISSING_TOKEN_MSG = "Missing or invalid token";

const EVENTO_NOT_FOUND = "Evento not found";
import { CreateEventoDto } from "./dto/create-evento.dto";
import { UpdateEventoDto } from "./dto/update-evento.dto";
import { QueryEventoDto } from "./dto/query-evento.dto";
import { VerificarEventoDto } from "./dto/verificar-evento.dto";
import { JwtAuthGuard } from "../../auth/application/jwt-auth.guard";
import { RolesGuard } from "../../auth/application/roles.guard";
import { Roles } from "../../auth/application/roles.decorator";
import { CurrentUser } from "../../auth/application/current-user.decorator";
import type { AuthContext } from "../../auth/domain/auth-context.interface";

@ApiTags("eventos")
@Controller("eventos")
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  // -------------------------------------------------------------------------
  // POST /eventos
  // -------------------------------------------------------------------------
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  @ApiOperation({ summary: "Create a new evento (no auto-solicitud)" })
  @ApiResponse({
    status: 201,
    description: "Evento created with estadoVerificacion pendiente",
  })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: MISSING_TOKEN_MSG })
  @ApiResponse({ status: 403, description: "Forbidden (not owner/admin)" })
  @ApiResponse({ status: 409, description: "Slug duplicado" })
  async create(@Body() dto: CreateEventoDto, @CurrentUser() user: AuthContext) {
    return this.eventosService.create(dto, user.uid);
  }

  // -------------------------------------------------------------------------
  // GET /eventos
  // -------------------------------------------------------------------------
  @Get()
  @ApiOperation({
    summary: "List active eventos with filters and pagination",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated list of active eventos (any estadoVerificacion)",
  })
  async findAll(@Query() query: QueryEventoDto) {
    return this.eventosService.findAllPublic({
      q: query.q,
      categoriaId: query.categoriaId,
      subcategoriaId: query.subcategoriaId,
      barrioId: query.barrioId,
      estado: query.estado,
      estadoVerificacion: query.estadoVerificacion,
      activo: query.activo,
      destacado: query.destacado,
      precioTipo: query.precioTipo,
      fechaDesde: query.fechaDesde,
      fechaHasta: query.fechaHasta,
      page: query.page,
      limit: query.limit,
    });
  }

  // -------------------------------------------------------------------------
  // GET /eventos/map-data
  // -------------------------------------------------------------------------
  @Get("map-data")
  @ApiOperation({
    summary: "Lightweight array of active eventos with coordinates for map",
  })
  @ApiResponse({ status: 200, description: "Array of map markers" })
  async getMapData() {
    return this.eventosService.listMapData();
  }

  // -------------------------------------------------------------------------
  // GET /eventos/slug/:slug
  // -------------------------------------------------------------------------
  @Get("slug/:slug")
  @ApiOperation({
    summary: "Get an active evento by its unique slug",
  })
  @ApiResponse({ status: 200, description: "Evento found" })
  @ApiResponse({ status: 404, description: EVENTO_NOT_FOUND })
  async findBySlug(@Param("slug") slug: string) {
    return this.eventosService.findBySlugPublic(slug);
  }

  // -------------------------------------------------------------------------
  // GET /eventos/:id
  // -------------------------------------------------------------------------
  @Get(":id")
  @ApiOperation({ summary: "Get an active evento by ID" })
  @ApiResponse({ status: 200, description: "Evento found" })
  @ApiResponse({ status: 404, description: EVENTO_NOT_FOUND })
  async findById(@Param("id") id: string) {
    return this.eventosService.findOnePublic(id);
  }

  // -------------------------------------------------------------------------
  // PUT /eventos/:id
  // -------------------------------------------------------------------------
  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  @ApiOperation({
    summary:
      "Update an evento (partial). Editing a verified evento reverts it to pendiente.",
  })
  @ApiResponse({ status: 200, description: "Evento updated" })
  @ApiResponse({ status: 401, description: MISSING_TOKEN_MSG })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: EVENTO_NOT_FOUND })
  @ApiResponse({ status: 409, description: "Slug duplicado on rename" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateEventoDto,
    @CurrentUser() user: AuthContext,
  ) {
    return this.eventosService.update(id, dto, user.uid, user.rol);
  }

  // -------------------------------------------------------------------------
  // POST /eventos/:id/verificar  (admin)
  // -------------------------------------------------------------------------
  @Post(":id/verificar")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({
    summary: "Admin verification: set verificado or rechazado",
  })
  @ApiResponse({ status: 200, description: "Evento verification updated" })
  @ApiResponse({
    status: 400,
    description: "Validation error (motivoRechazo required for rechazado)",
  })
  @ApiResponse({ status: 401, description: MISSING_TOKEN_MSG })
  @ApiResponse({ status: 403, description: "Forbidden (not admin)" })
  @ApiResponse({ status: 404, description: EVENTO_NOT_FOUND })
  async verificar(
    @Param("id") id: string,
    @Body() dto: VerificarEventoDto,
    @CurrentUser() user: AuthContext,
  ) {
    return this.eventosService.verificar(
      id,
      dto.resultado,
      user.uid,
      dto.motivo,
    );
  }

  // -------------------------------------------------------------------------
  // DELETE /eventos/:id  (soft delete)
  // -------------------------------------------------------------------------
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  @ApiOperation({ summary: "Soft-delete an evento (activo = false)" })
  @ApiResponse({ status: 200, description: "Evento soft-deleted" })
  @ApiResponse({ status: 401, description: MISSING_TOKEN_MSG })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: EVENTO_NOT_FOUND })
  async remove(@Param("id") id: string, @CurrentUser() user: AuthContext) {
    return this.eventosService.remove(id, user.uid, user.rol);
  }
}
