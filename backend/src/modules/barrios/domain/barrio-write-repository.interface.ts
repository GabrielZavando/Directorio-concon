/**
 * BarrioWriteRepository — Mutación sobre barrios.
 */
import { Barrio } from "../domain/barrio.entity";

export const BARRIO_WRITE_REPOSITORY = Symbol("BARRIO_WRITE_REPOSITORY");

export interface BarrioWriteRepository {
  create(barrio: Barrio): Promise<Barrio>;
  updateById(
    id: string,
    patch: Partial<
      Pick<
        Barrio,
        "nombre" | "descripcion" | "territorio" | "coordenadas" | "codigo"
      >
    >,
  ): Promise<Barrio>;
  activate(id: string): Promise<Barrio>;
  deactivate(id: string): Promise<Barrio>;
}
