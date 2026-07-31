/**
 * REST controller for the Usuario aggregate.
 *
 * Routes (mounted at `/usuarios`):
 *  - `GET  /usuarios/me`     — self profile (any authenticated role)
 *  - `PUT  /usuarios/me`     — self profile update (any authenticated role)
 *  - `GET  /usuarios`         — admin-only list with optional `rol` filter
 *  - `POST /usuarios`         — admin-only provisioning
 *  - `GET  /usuarios/:uid`    — admin-only lookup
 *  - `PUT  /usuarios/:uid/rol`— admin-only `rol` mutation
 *
 * Guards: `@UseGuards(JwtAuthGuard, RolesGuard)` is applied at the
 * controller level — every endpoint requires authentication. Per-route
 * `@Roles(...)` (or absence thereof) controls which `rol`s are authorised.
 * The guard implementation lives in `modules/auth/application/` (Task 7
 * of the `auth-usuarios` change); this controller consumes them as
 * opaque classes — wiring happens in `UsuariosModule.imports: [AuthModule]`.
 */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UsuariosService } from "../application/usuarios.service";
import { UpdatePerfilDto } from "./dto/update-perfil.dto";
import { UpdateRolDto } from "./dto/update-rol.dto";
import { CreateUsuarioDto } from "./dto/create-usuario.dto";
import { CurrentUser } from "../../auth/application/current-user.decorator";
import type { AuthContext } from "../../auth/domain/auth-context.interface";
import { Roles } from "../../auth/application/roles.decorator";
import { JwtAuthGuard } from "../../auth/application/jwt-auth.guard";
import { RolesGuard } from "../../auth/application/roles.guard";

@ApiTags("usuarios")
@Controller("usuarios")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // ===========================================================================
  // Self service — any authenticated role
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // GET /usuarios/me
  // ---------------------------------------------------------------------------
  @Get("me")
  @ApiOperation({
    summary: "Get the authenticated user's own profile",
  })
  @ApiResponse({ status: 200, description: "Caller’s Usuario document" })
  async getMe(@CurrentUser() user: AuthContext) {
    return this.usuariosService.getMe(user.uid);
  }

  // ---------------------------------------------------------------------------
  // PUT /usuarios/me
  // ---------------------------------------------------------------------------
  @Put("me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update the authenticated user's own profile (self-service)",
  })
  @ApiResponse({ status: 200, description: "Updated Usuario document" })
  @ApiResponse({
    status: 400,
    description: "Validation error (forbidNonWhitelisted)",
  })
  async updatePerfilMe(
    @CurrentUser() user: AuthContext,
    @Body() dto: UpdatePerfilDto,
  ) {
    return this.usuariosService.updatePerfil(user.uid, dto);
  }

  // ===========================================================================
  // Admin operations — @Roles('admin')
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // GET /usuarios
  // ---------------------------------------------------------------------------
  @Get()
  @Roles("admin")
  @ApiOperation({ summary: "List all usuarios (admin-only)" })
  @ApiResponse({ status: 200, description: "Paginated list of usuarios" })
  async findAll() {
    return this.usuariosService.findAll({});
  }

  // ---------------------------------------------------------------------------
  // POST /usuarios
  // ---------------------------------------------------------------------------
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles("admin")
  @ApiOperation({ summary: "Provision a new usuarios document (admin-only)" })
  @ApiResponse({ status: 201, description: "Usuario created" })
  @ApiResponse({
    status: 400,
    description: "Validation error or cross-field invariant violation",
  })
  @ApiResponse({ status: 409, description: "Duplicate email" })
  async create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  // ---------------------------------------------------------------------------
  // GET /usuarios/:uid
  // ---------------------------------------------------------------------------
  @Get(":uid")
  @Roles("admin")
  @ApiOperation({ summary: "Get a usuarios document by UID (admin-only)" })
  @ApiResponse({ status: 200, description: "Usuario document" })
  @ApiResponse({ status: 404, description: "Usuario not found" })
  async findOne(@Param("uid") uid: string) {
    return this.usuariosService.findById(uid);
  }

  // ---------------------------------------------------------------------------
  // PUT /usuarios/:uid/rol
  // ---------------------------------------------------------------------------
  @Put(":uid/rol")
  @HttpCode(HttpStatus.OK)
  @Roles("admin")
  @ApiOperation({
    summary: "Update a user's rol (admin-only, validates closed enum)",
  })
  @ApiResponse({ status: 200, description: "Updated Usuario document" })
  @ApiResponse({
    status: 400,
    description: "Validation error (rol not in [admin, owner, member])",
  })
  @ApiResponse({ status: 404, description: "Usuario not found" })
  async updateRol(@Param("uid") uid: string, @Body() dto: UpdateRolDto) {
    return this.usuariosService.updateRol(uid, dto.rol);
  }
}
