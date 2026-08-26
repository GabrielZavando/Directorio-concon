/**
 * Domain tests for the Evento entity interface.
 * Validates that the TypeScript interface compiles correctly
 * and that required/optional fields behave as expected at type level.
 */
import type { Evento } from "./evento.entity";
import type { EventoStatus } from "./evento-status.enum";
import type { EventoEstado } from "./evento-estado.enum";
import type { PrecioTipo } from "./precio-tipo.enum";
import type { PrecioMoneda } from "./precio-moneda.enum";
import type { PublicoObjetivoEnum } from "./publico-objetivo.enum";
import type { NivelRuido } from "./nivel-ruido.enum";

describe("Evento entity", () => {
  /**
   * Compile-time test: a valid Evento object should satisfy the interface.
   * If this fails to compile, the interface has a structural issue.
   */
  it("compiles a valid Evento object", () => {
    const evento: Evento = {
      id: "test-id",
      nombre: "Feria Gastronómica de Concón",
      slug: "feria-gastronomica-de-concon",
      descripcionCorta: "La mejor feria gastronómica del año",
      descripcion:
        "Disfruta de la mejor gastronomía local con más de 50 stands de comida típica.",
      categoriaId: "eventos",
      subcategoriaId: "ferias-gastronomicas",
      barrioId: "centro",
      organizador: "Municipalidad de Concón",
      organizadorContacto: "+56912345678",
      ubicacionDireccion: "Av. Borgoño 1234, Concón",
      coordenadas: { lat: -32.998, lng: -71.518 },
      fechaInicio: new Date("2026-08-15T10:00:00Z"),
      fechaFin: new Date("2026-08-17T22:00:00Z"),
      precioTipo: "gratis",
      precioValor: 0,
      precioMoneda: "CLP",
      publicoObjetivo: ["familia", "todos"],
      nivelRuido: "alto",
      status: "aprobado",
      estado: "programado",
      destacado: true,
      verificado: true,
      usuarioId: "auth-uid-123",
      vistasTotales: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      fechaPublicacion: new Date(),
    };

    expect(evento.id).toBe("test-id");
    expect(evento.nombre).toBe("Feria Gastronómica de Concón");
    expect(evento.categoriaId).toBe("eventos");
    expect(evento.precioTipo).toBe("gratis");
    expect(evento.precioValor).toBe(0);
    expect(evento.status).toBe("aprobado");
    expect(evento.estado).toBe("programado");
  });

  it("allows optional fields to be undefined", () => {
    const evento: Evento = {
      id: "test-id",
      nombre: "Evento Básico",
      slug: "evento-basico",
      descripcionCorta: "Un evento simple",
      descripcion: "Descripción detallada del evento básico para testing.",
      categoriaId: "eventos",
      subcategoriaId: "talleres-y-clases-abiertas",
      barrioId: "bosques",
      organizador: "Organizador Test",
      ubicacionDireccion: "Calle Falsa 123",
      coordenadas: { lat: -33.0, lng: -71.5 },
      fechaInicio: new Date("2026-09-01T10:00:00Z"),
      fechaFin: new Date("2026-09-01T18:00:00Z"),
      precioTipo: "pago",
      precioValor: 5000,
      precioMoneda: "CLP",
      publicoObjetivo: ["adultos"],
      nivelRuido: "bajo",
      status: "pendiente",
      estado: "borrador",
      destacado: false,
      verificado: false,
      usuarioId: "auth-uid-456",
      vistasTotales: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // All optional fields should be undefined
    expect(evento.organizadorContacto).toBeUndefined();
    expect(evento.organizadorWeb).toBeUndefined();
    expect(evento.ubicacionNombre).toBeUndefined();
    expect(evento.capacidadMaxima).toBeUndefined();
    expect(evento.portada).toBeUndefined();
    expect(evento.accesibilidad).toBeUndefined();
    expect(evento.placeId).toBeUndefined();
    expect(evento.fechaPublicacion).toBeUndefined();
  });

  it("supports all EventoStatus values", () => {
    const statuses: EventoStatus[] = ["pendiente", "aprobado", "rechazado"];
    statuses.forEach((status) => {
      const evento: Evento = {
        id: "id",
        nombre: "Test Evento",
        slug: "test-evento",
        descripcionCorta: "Corta",
        descripcion: "Descripción larga del evento para testing de status.",
        categoriaId: "eventos",
        subcategoriaId: "conciertos-y-shows",
        barrioId: "reñaca-alto",
        organizador: "Org",
        ubicacionDireccion: "Dir",
        coordenadas: { lat: 0, lng: 0 },
        fechaInicio: new Date(),
        fechaFin: new Date(Date.now() + 86400000),
        precioTipo: "donacion",
        precioValor: 0,
        precioMoneda: "CLP",
        publicoObjetivo: ["todos"],
        nivelRuido: "medio",
        status,
        estado: "programado",
        destacado: false,
        verificado: false,
        usuarioId: "uid",
        vistasTotales: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(evento.status).toBe(status);
    });
  });

  it("supports all EventoEstado values", () => {
    const estados: EventoEstado[] = [
      "borrador",
      "programado",
      "en_curso",
      "finalizado",
      "cancelado",
      "suspendido",
    ];
    estados.forEach((estado) => {
      const evento: Evento = {
        id: "id",
        nombre: "Test",
        slug: "test",
        descripcionCorta: "Corta",
        descripcion: "Descripción larga del evento para testing de estado.",
        categoriaId: "eventos",
        subcategoriaId: "deportes-y-competencias",
        barrioId: "la-boca",
        organizador: "Org",
        ubicacionDireccion: "Dir",
        coordenadas: { lat: 0, lng: 0 },
        fechaInicio: new Date(),
        fechaFin: new Date(Date.now() + 86400000),
        precioTipo: "invitacion",
        precioValor: 0,
        precioMoneda: "USD",
        publicoObjetivo: ["adultos"],
        nivelRuido: "alto",
        status: "aprobado",
        estado,
        destacado: false,
        verificado: false,
        usuarioId: "uid",
        vistasTotales: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(evento.estado).toBe(estado);
    });
  });
});
