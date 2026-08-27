/**
 * Domain tests for the Evento entity interface.
 * Validates that the TypeScript interface compiles correctly
 * and that required/optional fields behave as expected at type level.
 */
import type { Evento } from "./evento.entity";
import type { EstadoVerificacion } from "./estado-verificacion";
import type { EventoEstado } from "./evento-estado.enum";
import type { PrecioTipo } from "./precio-tipo.enum";
import type { PrecioMoneda } from "./precio-moneda.enum";
import type { PublicoObjetivoEnum } from "./publico-objetivo.enum";
import type { NivelRuido } from "./nivel-ruido.enum";
import type { Ubicacion } from "./ubicacion.vo";
import type { CambioEvento } from "./cambio-evento.interface";

describe("Evento entity", () => {
  const ubicacion: Ubicacion = {
    nombreLugar: "Playa Amarilla",
    direccion: "Av. Borgoño 1234, Concón",
    coordenadas: { lat: -32.998, lng: -71.518 },
  };

  /**
   * Compile-time test: a valid Evento object with the new model
   * (activo + estadoVerificacion + ubicacion + cambios[]) should satisfy
   * the interface. If this fails to compile, the interface has a structural issue.
   */
  it("compiles a valid Evento object (new model)", () => {
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
      ubicacion,
      fechaInicio: new Date("2026-08-15T10:00:00Z"),
      fechaFin: new Date("2026-08-17T22:00:00Z"),
      precioTipo: "gratis",
      precioValor: 0,
      precioMoneda: "CLP",
      publicoObjetivo: ["familia", "todos"],
      nivelRuido: "alto",
      activo: true,
      estadoVerificacion: "verificado",
      cambios: [],
      estado: "programado",
      destacado: true,
      usuarioId: "auth-uid-123",
      vistasTotales: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      fechaPublicacion: new Date(),
    };

    expect(evento.id).toBe("test-id");
    expect(evento.categoriaId).toBe("eventos");
    expect(evento.precioTipo).toBe("gratis");
    expect(evento.precioValor).toBe(0);
    expect(evento.activo).toBe(true);
    expect(evento.estadoVerificacion).toBe("verificado");
    expect(evento.estado).toBe("programado");
    expect(evento.ubicacion.direccion).toBe("Av. Borgoño 1234, Concón");
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
      ubicacion: {
        direccion: "Calle Falsa 123",
        coordenadas: { lat: -33.0, lng: -71.5 },
      },
      fechaInicio: new Date("2026-09-01T10:00:00Z"),
      fechaFin: new Date("2026-09-01T18:00:00Z"),
      precioTipo: "pago",
      precioValor: 5000,
      precioMoneda: "CLP",
      publicoObjetivo: ["adultos"],
      nivelRuido: "bajo",
      activo: true,
      estadoVerificacion: "pendiente",
      estado: "borrador",
      destacado: false,
      usuarioId: "auth-uid-456",
      vistasTotales: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(evento.organizadorContacto).toBeUndefined();
    expect(evento.organizadorWeb).toBeUndefined();
    expect(evento.capacidadMaxima).toBeUndefined();
    expect(evento.portada).toBeUndefined();
    expect(evento.accesibilidad).toBeUndefined();
    expect(evento.motivoRechazoVerificacion).toBeUndefined();
    expect(evento.cambios).toBeUndefined();
    expect(evento.fechaPublicacion).toBeUndefined();
  });

  it("supports all EstadoVerificacion values", () => {
    const values: EstadoVerificacion[] = [
      "pendiente",
      "verificado",
      "rechazado",
    ];
    values.forEach((estadoVerificacion) => {
      const evento: Evento = {
        id: "id",
        nombre: "Test Evento",
        slug: "test-evento",
        descripcionCorta: "Corta",
        descripcion:
          "Descripción larga del evento para testing de estadoVerificacion.",
        categoriaId: "eventos",
        subcategoriaId: "conciertos-y-shows",
        barrioId: "reñaca-alto",
        organizador: "Org",
        ubicacion: { direccion: "Dir", coordenadas: { lat: 0, lng: 0 } },
        fechaInicio: new Date(),
        fechaFin: new Date(Date.now() + 86400000),
        precioTipo: "donacion",
        precioValor: 0,
        precioMoneda: "CLP",
        publicoObjetivo: ["todos"],
        nivelRuido: "medio",
        activo: true,
        estadoVerificacion,
        estado: "programado",
        destacado: false,
        usuarioId: "uid",
        vistasTotales: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(evento.estadoVerificacion).toBe(estadoVerificacion);
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
        ubicacion: { direccion: "Dir", coordenadas: { lat: 0, lng: 0 } },
        fechaInicio: new Date(),
        fechaFin: new Date(Date.now() + 86400000),
        precioTipo: "invitacion",
        precioValor: 0,
        precioMoneda: "USD",
        publicoObjetivo: ["adultos"],
        nivelRuido: "alto",
        activo: true,
        estadoVerificacion: "pendiente",
        estado,
        destacado: false,
        usuarioId: "uid",
        vistasTotales: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(evento.estado).toBe(estado);
    });
  });

  it("records a CambioEvento entry in cambios[]", () => {
    const cambio: CambioEvento = {
      campo: "ubicacion.direccion",
      valorAnterior: "Dir vieja",
      valorNuevo: "Dir nueva",
      fecha: new Date(),
      usuarioId: "uid-owner-001",
    };
    const evento: Evento = {
      id: "id",
      nombre: "Test",
      slug: "test",
      descripcionCorta: "Corta",
      descripcion: "Descripción del evento para testing de cambios.",
      categoriaId: "eventos",
      subcategoriaId: "festivales-culturales",
      barrioId: "centro",
      organizador: "Org",
      ubicacion: { direccion: "Dir nueva", coordenadas: { lat: 0, lng: 0 } },
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 86400000),
      precioTipo: "gratis",
      precioValor: 0,
      precioMoneda: "CLP",
      publicoObjetivo: ["todos"],
      nivelRuido: "medio",
      activo: true,
      estadoVerificacion: "pendiente",
      cambios: [cambio],
      estado: "programado",
      destacado: false,
      usuarioId: "uid-owner-001",
      vistasTotales: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(evento.cambios?.[0].campo).toBe("ubicacion.direccion");
    expect(evento.cambios?.[0].usuarioId).toBe("uid-owner-001");
  });
});
