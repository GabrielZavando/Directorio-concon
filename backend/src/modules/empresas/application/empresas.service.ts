import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { FirebaseService } from "@/common/services/firebase.service";
import slugify from "slugify";
import { CreateEmpresaDto } from "../dto/create-empresa.dto";
import { UpdateEmpresaDto } from "../dto/update-empresa.dto";
import type { Empresa } from "../domain/empresa.entity";
import type { EmpresaStatus } from "../domain/empresa-status";
import {
  EmpresaRepository,
  type EmpresaFilter,
  type PaginatedResult,
} from "../domain/empresa-repository.interface";

/**
 * Application service for empresa operations.
 *
 * Responsibilities:
 * - Business logic (slug generation, defaults, uniqueness assertion)
 * - Orchestration (create empresa + solicitud)
 * - Exception mapping (repository returns null → service throws NotFoundException)
 *
 * Does NOT:
 * - Access Firestore directly (delegated to EmpresaRepository)
 * - Import firebase-admin types (DIP: depends on interface only)
 */
@Injectable()
export class EmpresasService {
  private readonly logger = new Logger(EmpresasService.name);
  private readonly solicitudesCollection = "solicitudes";

  constructor(
    @Inject(EmpresaRepository)
    private readonly empresaRepo: EmpresaRepository,
    private readonly firebaseService: FirebaseService,
  ) {}

  private buildSlug(nombre: string): string {
    return slugify(nombre, { lower: true, strict: true, locale: "es" });
  }

  async create(dto: CreateEmpresaDto): Promise<Empresa> {
    const slug = this.buildSlug(dto.nombre);

    const exists = await this.empresaRepo.slugExists(slug);
    if (exists) {
      throw new ConflictException(`Slug duplicado: ${slug}`);
    }

    const now = new Date();
    const empresa = await this.empresaRepo.create({
      nombre: dto.nombre,
      slug,
      descripcion: dto.descripcion,
      categoriaId: dto.categoriaId,
      barrioId: dto.barrioId,
      direccion: dto.direccion,
      telefono: dto.telefono,
      email: dto.email,
      sitioWeb: dto.sitioWeb,
      redesSociales: dto.redesSociales,
      planId: dto.planId,
      horarios: dto.horarios,
      servicios: dto.servicios,
      coordenadas: dto.coordenadas,
      logoUrl: dto.logoUrl,
      destacado: false,
      verificado: false,
      status: "pendiente",
      usuarioId: dto.usuarioId,
      createdAt: now,
      updatedAt: now,
    });

    // Cross-aggregate: create solicitud (known coupling, will move to SolicitudesModule)
    await this.createSolicitud(empresa.id);

    this.logger.log(`Empresa creada: ${slug} (${empresa.id})`);
    return empresa;
  }

  /**
   * Creates a registration solicitud for the new empresa.
   * Known coupling: writes directly to 'solicitudes' collection.
   * Will be refactored when SolicitudesModule is implemented.
   */
  private async createSolicitud(empresaId: string): Promise<void> {
    const firestore = this.firebaseService.getFirestore();
    const solicitudRef = firestore
      .collection(this.solicitudesCollection)
      .doc();
    await solicitudRef.set({
      empresaId,
      usuarioId: "",
      tipo: "registro",
      status: "pendiente",
      createdAt: this.firebaseService.getCurrentTimestamp(),
    });
  }

  async findAll(
    filters: EmpresaFilter,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<Empresa>> {
    return this.empresaRepo.findAll(filters, page, limit);
  }

  async findOne(id: string): Promise<Empresa> {
    const empresa = await this.empresaRepo.findById(id);
    if (!empresa) {
      throw new NotFoundException(`Empresa no encontrada: ${id}`);
    }
    return empresa;
  }

  async findBySlug(slug: string): Promise<Empresa> {
    const empresa = await this.empresaRepo.findBySlug(slug);
    if (!empresa) {
      throw new NotFoundException(`Empresa no encontrada: ${slug}`);
    }
    return empresa;
  }

  async update(id: string, dto: UpdateEmpresaDto): Promise<Empresa> {
    const existing = await this.empresaRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Empresa no encontrada: ${id}`);
    }

    const updateData: Record<string, unknown> = { ...dto };
    if (dto.nombre) {
      updateData.slug = this.buildSlug(dto.nombre);
    }

    return this.empresaRepo.update(id, updateData);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.empresaRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Empresa no encontrada: ${id}`);
    }
    await this.empresaRepo.delete(id);
  }
}
