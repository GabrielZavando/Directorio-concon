/**
 * Unit tests for eventos-service.helpers.
 */
import {
  slugify,
  buildEventoPatch,
  computeChanges,
  type CreateEventoServiceDto,
  type UpdateEventoServiceDto,
} from "./eventos-service.helpers";
import type { Evento } from "../domain/evento.entity";
import { ConflictException } from "@nestjs/common";

function makeEvento(overrides: Partial<Evento> = {}): Evento {
  return {
    id: "evento-1",
    nombre: "Feria Gastronómica",
    slug: "feria-gastronomica",
    descripcionCorta: "Corta",
    descripcion: "Descripción larga para testing de creación de eventos.",
    categoriaId: "eventos",
    subcategoriaId: "ferias-gastronomicas",
    barrioId: "centro",
    organizador: "Org",
    ubicacion: { direccion: "Dir", coordenadas: { lat: -33, lng: -71 } },
    fechaInicio: new Date("2026-08-15T10:00:00Z"),
    fechaFin: new Date("2026-08-17T22:00:00Z"),
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["familia"],
    nivelRuido: "bajo",
    estado: "programado",
    destacado: false,
    estadoVerificacion: "verificado",
    activo: true,
    usuarioId: "uid",
    vistasTotales: 0,
    cambios: [],
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
    ...overrides,
  };
}

describe("eventos-service.helpers", () => {
  describe("slugify", () => {
    it("lowercases and replaces spaces with dashes", () => {
      expect(slugify("Feria Gastronómica de Concón")).toBe(
        "feria-gastronomica-de-concon",
      );
    });

    it("strips accents", () => {
      expect(slugify("Concón")).toBe("concon");
    });

    it("collapses repeated dashes", () => {
      expect(slugify("Feria   Doble")).toBe("feria-doble");
    });
  });

  describe("buildEventoPatch", () => {
    const baseDto: CreateEventoServiceDto = {
      nombre: "Feria Gastronómica",
      descripcionCorta: "Corta",
      descripcion: "Descripción larga para testing de creación de eventos.",
      subcategoriaId: "ferias-gastronomicas",
      barrioId: "centro",
      organizador: "Org",
      ubicacion: { direccion: "Dir", coordenadas: { lat: -33, lng: -71 } },
      fechaInicio: "2026-08-15T10:00:00Z",
      fechaFin: "2026-08-17T22:00:00Z",
      precioTipo: "gratis",
      precioValor: 0,
      publicoObjetivo: ["familia"],
      nivelRuido: "bajo",
    };

    it("sets updatedAt and keeps unchanged fields", async () => {
      const existing = makeEvento();
      const patch = await buildEventoPatch(
        { organizador: "Nuevo" } as UpdateEventoServiceDto,
        existing,
        "evento-1",
        async () => null,
      );
      expect(patch.organizador).toBe("Nuevo");
      expect(patch.updatedAt).toBeInstanceOf(Date);
      expect(patch.slug).toBeUndefined();
    });

    it("regenerates slug when nombre changes", async () => {
      const existing = makeEvento();
      const patch = await buildEventoPatch(
        { nombre: "Otra Feria" } as UpdateEventoServiceDto,
        existing,
        "evento-1",
        async () => null,
      );
      expect(patch.slug).toBe("otra-feria");
    });

    it("throws ConflictException on duplicate slug", async () => {
      const existing = makeEvento();
      const other = makeEvento({ id: "other", slug: "otra-feria" });
      await expect(
        buildEventoPatch(
          { nombre: "Otra Feria" } as UpdateEventoServiceDto,
          existing,
          "evento-1",
          async () => other,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it("converts fechaInicio/fechaFin strings to Date in the patch", async () => {
      const existing = makeEvento();
      const patch = await buildEventoPatch(
        {
          fechaInicio: "2026-08-15T10:00:00Z",
          fechaFin: "2026-08-17T22:00:00Z",
        } as UpdateEventoServiceDto,
        existing,
        "evento-1",
        async () => null,
      );
      expect(patch.fechaInicio).toBeInstanceOf(Date);
      expect(patch.fechaFin).toBeInstanceOf(Date);
      expect((patch.fechaInicio as Date).toISOString()).toBe(
        "2026-08-15T10:00:00.000Z",
      );
    });
  });

  describe("computeChanges", () => {
    it("returns one CambioEvento per changed field", () => {
      const existing = makeEvento({ organizador: "Viejo" });
      const cambios = computeChanges(
        existing,
        { organizador: "Nuevo" } as UpdateEventoServiceDto,
        "user-1",
      );
      expect(cambios).toHaveLength(1);
      expect(cambios[0].campo).toBe("organizador");
      expect(cambios[0].valorAnterior).toBe("Viejo");
      expect(cambios[0].valorNuevo).toBe("Nuevo");
      expect(cambios[0].usuarioId).toBe("user-1");
      expect(cambios[0].fecha).toBeInstanceOf(Date);
    });

    it("ignores unchanged fields", () => {
      const existing = makeEvento({ organizador: "Igual" });
      const cambios = computeChanges(
        existing,
        { organizador: "Igual" } as UpdateEventoServiceDto,
        "user-1",
      );
      expect(cambios).toHaveLength(0);
    });

    it("does not emit spurious cambios when the same date is re-sent as a string", () => {
      const existing = makeEvento({
        fechaInicio: new Date("2026-08-15T10:00:00Z"),
        fechaFin: new Date("2026-08-17T22:00:00Z"),
      });
      const cambios = computeChanges(
        existing,
        {
          fechaInicio: "2026-08-15T10:00:00Z",
          fechaFin: "2026-08-17T22:00:00Z",
        } as UpdateEventoServiceDto,
        "user-1",
      );
      expect(cambios).toHaveLength(0);
    });
  });
});
