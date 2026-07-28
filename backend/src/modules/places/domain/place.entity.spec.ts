/**
 * Domain tests for the Place entity interface.
 * Validates that the TypeScript interface compiles correctly
 * and that required/optional fields behave as expected at type level.
 */
import type { Place } from "./place.entity";
import type { PlaceStatus } from "./place-status";

describe("Place entity", () => {
  /**
   * Compile-time test: a valid Place object should satisfy the interface.
   * If this fails to compile, the interface has a structural issue.
   */
  it("compiles a valid Place object", () => {
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
      status: "pendiente",
      verificado: false,
      destacado: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(place.id).toBe("test-id");
    expect(place.nombre).toBe("Test Place");
    expect(place.status).toBe("pendiente");
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
      status: "pendiente",
      verificado: false,
      destacado: false,
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
    expect(place.fechaVerificacion).toBeUndefined();
    expect(place.usuarioId).toBeUndefined();
    expect(place.fechaPublicacion).toBeUndefined();
  });

  it("supports all PlaceStatus values", () => {
    const statuses: PlaceStatus[] = ["pendiente", "aprobado", "rechazado"];
    statuses.forEach((status) => {
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
        status,
        verificado: false,
        destacado: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(place.status).toBe(status);
    });
  });
});
