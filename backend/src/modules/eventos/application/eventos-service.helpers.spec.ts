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
import { BadRequestException, ConflictException } from "@nestjs/common";

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
    modalidad: "presencial",
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
      modalidad: "presencial",
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

    it("throws BadRequestException when a partial PUT adds ubicacion to an online evento", async () => {
      const existing = makeEvento({
        modalidad: "online",
        usuarioId: "user-1",
        ubicacion: undefined,
      });
      await expect(
        buildEventoPatch(
          {
            ubicacion: { coordenadas: { lat: -32.9, lng: -71.5 } },
          } as UpdateEventoServiceDto,
          existing,
          "evento-1",
          async () => null,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("clears ubicacion in the patch when transitioning to online", async () => {
      const existing = makeEvento({
        modalidad: "presencial",
        usuarioId: "user-1",
        ubicacion: {
          nombreLugar: "Plaza",
          direccion: "Av. 1",
          coordenadas: { lat: -32.9, lng: -71.5 },
        },
      });
      const patch = await buildEventoPatch(
        { modalidad: "online" } as UpdateEventoServiceDto,
        existing,
        "evento-1",
        async () => null,
      );
      expect((patch as Record<string, unknown>).ubicacion).toBeNull();
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

    it("records a ubicacion cambio when the patch clears it (online transition)", () => {
      const existing = makeEvento({
        modalidad: "presencial",
        ubicacion: {
          nombreLugar: "Plaza",
          direccion: "Av. 1",
          coordenadas: { lat: -32.9, lng: -71.5 },
        },
      });
      const cambios = computeChanges(
        existing,
        { modalidad: "online", ubicacion: null } as Record<string, unknown>,
        "user-1",
      );
      const ubicacionCambio = cambios.find((c) => c.campo === "ubicacion");
      expect(ubicacionCambio).toBeDefined();
      expect(ubicacionCambio?.valorNuevo).toBeNull();
    });

    it("does not emit a ubicacion cambio for an equal venue (order-insensitive)", () => {
      const existing = makeEvento({
        ubicacion: {
          direccion: "Av. 1",
          coordenadas: { lat: -32.9, lng: -71.5 },
        },
      });
      const cambios = computeChanges(
        existing,
        // Same venue, keys reordered / extra field — must be treated as equal.
        {
          ubicacion: {
            coordenadas: { lng: -71.5, lat: -32.9 },
            direccion: "Av. 1",
          },
        } as Record<string, unknown>,
        "user-1",
      );
      expect(cambios.find((c) => c.campo === "ubicacion")).toBeUndefined();
    });
  });
});
