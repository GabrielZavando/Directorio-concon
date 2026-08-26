/**
 * REST controller for the Place aggregate.
 * Routes: /api/v1/places
 *
 * Updated by places-refactor (CH-03): replaced `status` query with
 * `activo`, `estadoVerificacion`, `sinDueno`. Added `POST /:id/reclamar`
 * and `POST /:id/verificar` endpoints. Soft-delete returns { deleted, id, activo }.
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
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PlacesService } from "../application/places.service";

const PLACE_NOT_FOUND = "Place not found";
import { CreatePlaceDto } from "./dto/create-place.dto";
import { UpdatePlaceDto } from "./dto/update-place.dto";
import { QueryPlaceDto } from "./dto/query-place.dto";
import { JwtAuthGuard } from "../../auth/application/jwt-auth.guard";
import { RolesGuard } from "../../auth/application/roles.guard";
import { Roles } from "../../auth/application/roles.decorator";
import { CurrentUser } from "../../auth/application/current-user.decorator";
import type { AuthContext } from "../../auth/domain/auth-context.interface";

@ApiTags("places")
@Controller("places")
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  // -------------------------------------------------------------------------
  // POST /places
  // -------------------------------------------------------------------------
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner")
  @ApiOperation({ summary: "Create a new place (visible immediately)" })
  @ApiResponse({ status: 201, description: "Place created, activo=true" })
  @ApiResponse({ status: 409, description: "Slug duplicado" })
  async create(@Body() dto: CreatePlaceDto, @CurrentUser() user: AuthContext) {
    return this.placesService.createPlace(dto, user.uid);
  }

  // -------------------------------------------------------------------------
  // GET /places
  // -------------------------------------------------------------------------
  @Get()
  @ApiOperation({ summary: "List places with filters and pagination" })
  @ApiResponse({ status: 200, description: "Paginated list of places" })
  async findAll(@Query() query: QueryPlaceDto) {
    return this.placesService.search({
      q: query.q,
      categoriaId: query.categoriaId,
      barrioId: query.barrioId,
      activo: query.activo,
      estadoVerificacion: query.estadoVerificacion,
      sinDueno: query.sinDueno,
      page: query.page,
      limit: query.limit,
    });
  }

  // -------------------------------------------------------------------------
  // GET /places/map-data
  // -------------------------------------------------------------------------
  @Get("map-data")
  @ApiOperation({
    summary: "Lightweight array of active places with coordinates for map",
  })
  @ApiResponse({ status: 200, description: "Array of map markers" })
  async getMapData() {
    return this.placesService.findForMap();
  }

  // -------------------------------------------------------------------------
  // GET /places/slug/:slug
  // -------------------------------------------------------------------------
  @Get("slug/:slug")
  @ApiOperation({ summary: "Get a place by its unique slug" })
  @ApiResponse({ status: 200, description: "Place found" })
  @ApiResponse({ status: 404, description: PLACE_NOT_FOUND })
  async findBySlug(@Param("slug") slug: string) {
    const place = await this.placesService.findBySlug(slug);
    if (!place) {
      throw new NotFoundException(`Place with slug "${slug}" not found`);
    }
    return place;
  }

  // -------------------------------------------------------------------------
  // GET /places/:id
  // -------------------------------------------------------------------------
  @Get(":id")
  @ApiOperation({ summary: "Get a place by ID" })
  @ApiResponse({ status: 200, description: "Place found" })
  @ApiResponse({ status: 404, description: PLACE_NOT_FOUND })
  async findById(@Param("id") id: string) {
    return this.placesService.findById(id);
  }

  // -------------------------------------------------------------------------
  // GET /places/:id/abierto-ahora
  // -------------------------------------------------------------------------
  @Get(":id/abierto-ahora")
  @ApiOperation({
    summary: "Check if place is currently open (America/Santiago)",
  })
  @ApiResponse({
    status: 200,
    description: "{ abierto: boolean, turno?: ... }",
  })
  @ApiResponse({ status: 404, description: PLACE_NOT_FOUND })
  async abiertoAhora(@Param("id") id: string) {
    return this.placesService.abiertoAhora(id);
  }

  // -------------------------------------------------------------------------
  // PUT /places/:id
  // -------------------------------------------------------------------------
  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  @ApiOperation({ summary: "Update a place (partial)" })
  @ApiResponse({ status: 200, description: "Place updated" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Role or ownership forbidden" })
  @ApiResponse({ status: 404, description: PLACE_NOT_FOUND })
  @ApiResponse({ status: 409, description: "Slug duplicado on rename" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePlaceDto,
    @CurrentUser() user: AuthContext,
  ) {
    return this.placesService.update(id, dto, user);
  }

  // -------------------------------------------------------------------------
  // DELETE /places/:id (soft-delete)
  // -------------------------------------------------------------------------
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  @ApiOperation({ summary: "Soft-delete a place (sets activo=false)" })
  @ApiResponse({
    status: 200,
    description: "{ deleted: true, id, activo: false }",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Role or ownership forbidden" })
  @ApiResponse({ status: 404, description: PLACE_NOT_FOUND })
  @ApiResponse({ status: 409, description: "Cannot delete: solicitudes exist" })
  async remove(@Param("id") id: string, @CurrentUser() user: AuthContext) {
    await this.placesService.delete(id, user);
    return { deleted: true, id, activo: false };
  }

  // -------------------------------------------------------------------------
  // POST /places/:id/reclamar (claim ownership)
  // -------------------------------------------------------------------------
  @Post(":id/reclamar")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner")
  @ApiOperation({ summary: "Claim ownership of a place (creates reclamo)" })
  @ApiResponse({ status: 201, description: "Claim solicitud created" })
  @ApiResponse({ status: 404, description: PLACE_NOT_FOUND })
  @ApiResponse({ status: 409, description: "Pending reclamo already exists" })
  async reclamar(
    @Param("id") id: string,
    @CurrentUser() user: AuthContext,
  ) {
    await this.placesService.reclamar(id, user.uid);
    return { claimed: true, placeId: id };
  }

  // -------------------------------------------------------------------------
  // POST /places/:id/verificar (admin verification)
  // -------------------------------------------------------------------------
  @Post(":id/verificar")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Verify or reject a place (admin only)" })
  @ApiResponse({ status: 200, description: "Place verification updated" })
  @ApiResponse({ status: 400, description: "Motivo required when rejecting" })
  @ApiResponse({ status: 404, description: PLACE_NOT_FOUND })
  async verificar(
    @Param("id") id: string,
    @Body() dto: { resultado: "verificado" | "rechazado"; motivo?: string },
  ) {
    return this.placesService.verificar(id, dto);
  }
}
