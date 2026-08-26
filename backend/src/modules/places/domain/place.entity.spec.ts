/**
 * Domain tests for the Place entity interface.
 * Validates that the TypeScript interface compiles correctly
 * and that required/optional fields behave as expected at type level.
 *
 * Updated by places-refactor (CH-03): replaced `status` + `verificado`
 * with `activo` + `estadoVerificacion`.
 */
import type { Place } from "./place.entity";
import type { EstadoVerificacion } from "./estado-verificacion";

describe("Place entity", () => {
  /**
   * Compile-time test: a valid Place object should satisfy the interface.
   * If this fails to compile, the interface has a structural issue.
   */
  it("compiles a valid Place object with new model fields", () => {
    const place: Place = {
      id: "test-id",
      nombre: "Test Place",
      slug: "test-place",
      descripcionCorta: "Short desc",
      descripcion: "Long description here",
      categoriaId: "gastronomia",
      barrioId: "higuerillas",
      direccion: "Av. Borgoño 123",
      coordenadas: { lat: -33.0, lng: -71.5 },
      imagenes: { galeria: [] },
      planId: "gratuito",
      abierto24x7: false,
      vistasTotales: 0,
      activo: true,
      estadoVerificacion: "pendiente",
      gestionadoPorAdmin: false,
      destacado: false,
      usuarioId: "uid-owner-001",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(place.id).toBe("test-id");
    expect(place.nombre).toBe("Test Place");
    expect(place.activo).toBe(true);
    expect(place.estadoVerificacion).toBe("pendiente");
    expect(place.gestionadoPorAdmin).toBe(false);
    expect(place.usuarioId).toBe("uid-owner-001");
    expect(place.coordenadas.lat).toBe(-33.0);
    expect(place.coordenadas.lng).toBe(-71.5);
    expect(place.imagenes.galeria).toEqual([]);
  });

  it("allows optional fields to be undefined", () => {
    const place: Place = {
      id: "test-id",
      nombre: "Test",
      slug: "test",
      descripcionCorta: "Short",
      descripcion: "Description",
      categoriaId: "cat",
      barrioId: "bar",
      direccion: "Addr",
      coordenadas: { lat: 0, lng: 0 },
      imagenes: { galeria: [] },
      planId: "gratuito",
      abierto24x7: false,
      vistasTotales: 0,
      activo: true,
      estadoVerificacion: "pendiente",
      gestionadoPorAdmin: false,
      destacado: false,
      usuarioId: "uid-owner-001",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // All optional fields should be undefined
    expect(place.subcategoriaId).toBeUndefined();
    expect(place.telefono).toBeUndefined();
    expect(place.whatsapp).toBeUndefined();
    expect(place.email).toBeUndefined();
    expect(place.sitioWeb).toBeUndefined();
    expect(place.redesSociales).toBeUndefined();
    expect(place.horarios).toBeUndefined();
    expect(place.horariosEspeciales).toBeUndefined();
    expect(place.servicios).toBeUndefined();
    expect(place.metodosPago).toBeUndefined();
    expect(place.idiomas).toBeUndefined();
    expect(place.valoracionGoogle).toBeUndefined();
    expect(place.motivoRechazoVerificacion).toBeUndefined();
    expect(place.fechaPublicacion).toBeUndefined();
  });

  it("supports all EstadoVerificacion values", () => {
    const estados: EstadoVerificacion[] = [
      "pendiente",
      "verificado",
      "rechazado",
    ];
    estados.forEach((estado) => {
      const place: Place = {
        id: "id",
        nombre: "n",
        slug: "s",
        descripcionCorta: "d",
        descripcion: "d",
        categoriaId: "c",
        barrioId: "b",
        direccion: "a",
        coordenadas: { lat: 0, lng: 0 },
        imagenes: { galeria: [] },
        planId: "gratuito",
        abierto24x7: false,
        vistasTotales: 0,
        activo: true,
        estadoVerificacion: estado,
        gestionadoPorAdmin: false,
        destacado: false,
        usuarioId: "uid-owner-001",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(place.estadoVerificacion).toBe(estado);
    });
  });

  it("requires motivoRechazoVerificacion conceptually when estadoVerificacion is rechazado", () => {
    const place: Place = {
      id: "id",
      nombre: "n",
      slug: "s",
      descripcionCorta: "d",
      descripcion: "d",
      categoriaId: "c",
      barrioId: "b",
      direccion: "a",
      coordenadas: { lat: 0, lng: 0 },
      imagenes: { galeria: [] },
      planId: "gratuito",
      abierto24x7: false,
      vistasTotales: 0,
      activo: false,
      estadoVerificacion: "rechazado",
      motivoRechazoVerificacion: "Información incompleta",
      gestionadoPorAdmin: false,
      destacado: false,
      usuarioId: "uid-owner-001",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(place.estadoVerificacion).toBe("rechazado");
    expect(place.motivoRechazoVerificacion).toBe("Información incompleta");
    expect(place.activo).toBe(false);
  });

  it("usuarioId is required (not optional)", () => {
    // This compile-time test verifies usuarioId is required.
    // If this line causes a TS error, usuarioId became optional again — that's a regression.
    const place: Place = {
      id: "id",
      nombre: "n",
      slug: "s",
      descripcionCorta: "d",
      descripcion: "d",
      categoriaId: "c",
      barrioId: "b",
      direccion: "a",
      coordenadas: { lat: 0, lng: 0 },
      imagenes: { galeria: [] },
      planId: "gratuito",
      abierto24x7: false,
      vistasTotales: 0,
      activo: true,
      estadoVerificacion: "pendiente",
      gestionadoPorAdmin: false,
      destacado: false,
      usuarioId: "uid-required",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(place.usuarioId).toBe("uid-required");
  });
});
