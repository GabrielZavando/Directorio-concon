/**
 * REST controller for the Place aggregate.
 * Routes: /api/v1/places
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
  ConflictException,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PlacesService } from "../application/places.service";
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
  @ApiOperation({
    summary: "Create a new place (generates solicitud automatically)",
  })
  @ApiResponse({
    status: 201,
    description: "Place created with status pendiente",
  })
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
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
  }

  // -------------------------------------------------------------------------
  // GET /places/map-data
  // -------------------------------------------------------------------------
  @Get("map-data")
  @ApiOperation({
    summary: "Lightweight array of approved places with coordinates for map",
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
  @ApiResponse({ status: 404, description: "Place not found" })
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
  @ApiResponse({ status: 404, description: "Place not found" })
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
  @ApiResponse({ status: 404, description: "Place not found" })
  async abiertoAhora(@Param("id") id: string) {
    return this.placesService.abiertoAhora(id);
  }

  // -------------------------------------------------------------------------
  // PUT /places/:id
  // -------------------------------------------------------------------------
  @Put(":id")
  @ApiOperation({ summary: "Update a place (partial)" })
  @ApiResponse({ status: 200, description: "Place updated" })
  @ApiResponse({ status: 404, description: "Place not found" })
  @ApiResponse({ status: 409, description: "Slug duplicado on rename" })
  async update(@Param("id") id: string, @Body() dto: UpdatePlaceDto) {
    // TODO: extract usuarioId from JWT guard
    const usuarioId = "anonymous";
    return this.placesService.update(id, dto, usuarioId);
  }

  // -------------------------------------------------------------------------
  // DELETE /places/:id
  // -------------------------------------------------------------------------
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a place (blocked if solicitudes exist)" })
  @ApiResponse({ status: 200, description: "Place deleted" })
  @ApiResponse({ status: 404, description: "Place not found" })
  @ApiResponse({ status: 409, description: "Cannot delete: solicitudes exist" })
  async remove(@Param("id") id: string) {
    await this.placesService.delete(id);
    return { deleted: true, id };
  }
}
