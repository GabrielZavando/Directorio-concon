import type { Empresa } from "./empresa.entity";
import type { EmpresaStatus } from "./empresa-status";

/**
 * Data needed to create a new empresa in the repository.
 * Pure domain type — no class-validator, no Swagger decorators.
 */
export interface CreateEmpresaData {
  nombre: string;
  slug: string;
  descripcion: string;
  categoriaId: string;
  barrioId: string;
  direccion: string;
  telefono?: string;
  email?: string;
  sitioWeb?: string;
  redesSociales?: unknown[];
  planId: string;
  horarios?: string;
  servicios?: string[];
  coordenadas?: { lat: number; lng: number };
  logoUrl?: string;
  destacado: boolean;
  verificado: boolean;
  status: EmpresaStatus;
  usuarioId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Filter options for querying empresas.
 */
export interface EmpresaFilter {
  categoriaId?: string;
  barrioId?: string;
  status?: EmpresaStatus;
  q?: string;
}

/**
 * Paginated result wrapper.
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/**
 * Repository interface for empresa persistence.
 *
 * This is the DIP contract: application/ and domain/ layers depend on this
 * interface, never on concrete implementations (Firestore, SQL, in-memory).
 *
 * ISP note: 7 methods — the minimum for full CRUD + slug uniqueness check.
 * Each method has a single, well-defined responsibility.
 */
export interface EmpresaRepository {
  create(data: CreateEmpresaData): Promise<Empresa>;
  findById(id: string): Promise<Empresa | null>;
  findBySlug(slug: string): Promise<Empresa | null>;
  findAll(filter: EmpresaFilter, page: number, limit: number): Promise<PaginatedResult<Empresa>>;
  update(id: string, data: Partial<CreateEmpresaData>): Promise<Empresa>;
  delete(id: string): Promise<void>;
  slugExists(slug: string): Promise<boolean>;
}

/**
 * Injection token for EmpresaRepository.
 * Use with: @Inject(EmpresaRepository) and { provide: EmpresaRepository, useClass: ... }
 */
export const EmpresaRepository = Symbol("EmpresaRepository");
