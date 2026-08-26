/**
 * BarrioReadRepository — Lectura sobre barrios.
 */
import { Barrio } from "../domain/barrio.entity";

export const BARRIO_READ_REPOSITORY = Symbol("BARRIO_READ_REPOSITORY");

export interface BarrioReadRepository {
  findById(id: string): Promise<Barrio | undefined>;
  findBySlug(slug: string): Promise<Barrio | undefined>;
  list(filter?: { onlyActive?: boolean }): Promise<Barrio[]>;
  existsBySlug(slug: string): Promise<boolean>;
}
