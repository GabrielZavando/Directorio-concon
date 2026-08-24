/**
 * BarriosService — application layer for barrios.
 */
import {
  Injectable,
  Inject,
  ConflictException,
} from "@nestjs/common";
import { Barrio } from "../domain/barrio.entity";
import type { BarrioReadRepository } from "../domain/barrio-read-repository.interface";
import type { BarrioWriteRepository } from "../domain/barrio-write-repository.interface";
import { assertFound } from "@/common/utils/assertions";
import { BARRIO_READ_REPOSITORY } from "../domain/barrio-read-repository.interface";
import { BARRIO_WRITE_REPOSITORY } from "../domain/barrio-write-repository.interface";

@Injectable()
export class BarriosService {
  constructor(
    @Inject(BARRIO_READ_REPOSITORY)
    private readonly readRepo: BarrioReadRepository,
    @Inject(BARRIO_WRITE_REPOSITORY)
    private readonly writeRepo: BarrioWriteRepository,
  ) {}

  async create(input: {
    nombre: string;
    slug: string;
    tipo: "urbano" | "rural";
    descripcion?: string;
    territorio?: string;
    coordenadas?: string; // "lat,lng"
    codigo?: string;
  }): Promise<Barrio> {
    const coords = input.coordenadas
      ? {
          lat: parseFloat(input.coordenadas.split(",")[0]),
          lng: parseFloat(input.coordenadas.split(",")[1]),
        }
      : undefined;

    const barrio = new Barrio({
      id: input.slug,
      nombre: input.nombre,
      slug: input.slug,
      tipo: input.tipo,
      descripcion: input.descripcion,
      territorio: input.territorio,
      coordenadas: coords,
      codigo: input.codigo,
      activo: true,
    });

    if (await this.readRepo.existsBySlug(barrio.slug)) {
      throw new ConflictException(`Slug duplicado: ${barrio.slug}`);
    }
    return this.writeRepo.create(barrio);
  }

  async updateById(
    id: string,
    patch: Partial<{
      nombre: string;
      descripcion: string;
      territorio: string;
      coordenadas: string | { lat: number; lng: number };
      codigo: string;
    }>,
  ): Promise<Barrio> {
    const existing = await this.readRepo.findById(id);
    assertFound(existing, "Barrio", id);

    const { coordenadas, ...rest } = patch;
    const normalized: Partial<{
      nombre: string;
      descripcion: string;
      territorio: string;
      coordenadas: { lat: number; lng: number };
      codigo: string;
    }> = { ...rest };
    if (coordenadas !== undefined) {
      normalized.coordenadas =
        typeof coordenadas === "string"
          ? (() => {
              const [lat, lng] = coordenadas
                .split(",")
                .map((v) => parseFloat(v));
              return { lat, lng };
            })()
          : coordenadas;
    }
    return this.writeRepo.updateById(id, normalized);
  }

  async activate(id: string): Promise<Barrio> {
    const existing = await this.readRepo.findById(id);
    assertFound(existing, "Barrio", id);
    return this.writeRepo.activate(id);
  }

  async deactivate(id: string): Promise<Barrio> {
    const existing = await this.readRepo.findById(id);
    assertFound(existing, "Barrio", id);
    return this.writeRepo.deactivate(id);
  }

  async list(filter?: { onlyActive?: boolean }): Promise<Barrio[]> {
    return this.readRepo.list(filter);
  }

  async listPublic(): Promise<Barrio[]> {
    const all = await this.readRepo.list({ onlyActive: true });
    return all.filter((b) => b.activo);
  }
}
