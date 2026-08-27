/**
 * Validation tests for CreateEventoDto using class-validator.
 */
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateEventoDto } from "./create-evento.dto";

function makeValidDto(
  overrides: Record<string, unknown> = {},
): CreateEventoDto {
  return plainToInstance(CreateEventoDto, {
    nombre: "Feria Gastronómica de Concón 2026",
    descripcionCorta: "La mejor feria gastronómica del año",
    descripcion:
      "Disfruta de la mejor gastronomía local con más de 50 stands de comida típica, música en vivo y actividades para toda la familia.",
    subcategoriaId: "ferias-gastronomicas",
    barrioId: "centro",
    organizador: "Municipalidad de Concón",
    ubicacion: {
      direccion: "Av. Borgoño 1234, Concón",
      coordenadas: { lat: -32.998, lng: -71.518 },
    },
    fechaInicio: "2026-08-15T10:00:00Z",
    fechaFin: "2026-08-17T22:00:00Z",
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["familia", "todos"],
    nivelRuido: "alto",
    ...overrides,
  });
}

describe("CreateEventoDto validation", () => {
  it("accepts a valid minimal DTO", async () => {
    const dto = makeValidDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("accepts a valid full DTO with all optional fields", async () => {
    const dto = makeValidDto({
      organizadorContacto: "+56912345678",
      organizadorWeb: "https://municipalidadconcon.cl",
      ubicacion: {
        nombreLugar: "Playa Amarilla",
        direccion: "Av. Borgoño 1234, Concón",
        coordenadas: { lat: -32.998, lng: -71.518 },
      },
      capacidadMaxima: 500,
      portada: "https://example.com/portada.jpg",
      accesibilidad: ["acceso-silla-ruedas", "banos-accesibles"],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("rejects nombre shorter than 2 chars", async () => {
    const errors = await validate(makeValidDto({ nombre: "A" }));
    expect(errors.some((e) => e.property === "nombre")).toBe(true);
  });

  it("rejects nombre longer than 120 chars", async () => {
    const errors = await validate(makeValidDto({ nombre: "A".repeat(121) }));
    expect(errors.some((e) => e.property === "nombre")).toBe(true);
  });

  it("rejects descripcionCorta empty", async () => {
    const errors = await validate(makeValidDto({ descripcionCorta: "" }));
    expect(errors.some((e) => e.property === "descripcionCorta")).toBe(true);
  });

  it("rejects descripcionCorta longer than 140 chars", async () => {
    const errors = await validate(
      makeValidDto({ descripcionCorta: "A".repeat(141) }),
    );
    expect(errors.some((e) => e.property === "descripcionCorta")).toBe(true);
  });

  it("rejects descripcion shorter than 10 chars", async () => {
    const errors = await validate(makeValidDto({ descripcion: "Short" }));
    expect(errors.some((e) => e.property === "descripcion")).toBe(true);
  });

  it("rejects descripcion longer than 2000 chars", async () => {
    const errors = await validate(
      makeValidDto({ descripcion: "A".repeat(2001) }),
    );
    expect(errors.some((e) => e.property === "descripcion")).toBe(true);
  });

  // -- ubicacion.coordenadas --
  it("rejects out-of-range lat", async () => {
    const dto = makeValidDto({
      ubicacion: {
        direccion: "X",
        coordenadas: { lat: 91, lng: 0 },
      },
    });
    const errors = await validate(dto);
    const ubicacionErrors = errors.find((e) => e.property === "ubicacion");
    expect(ubicacionErrors).toBeDefined();
  });

  it("rejects out-of-range lng", async () => {
    const dto = makeValidDto({
      ubicacion: {
        direccion: "X",
        coordenadas: { lat: 0, lng: 181 },
      },
    });
    const errors = await validate(dto);
    const ubicacionErrors = errors.find((e) => e.property === "ubicacion");
    expect(ubicacionErrors).toBeDefined();
  });

  it("rejects missing ubicacion.direccion", async () => {
    const dto = makeValidDto({
      ubicacion: { coordenadas: { lat: -32.9, lng: -71.5 } },
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "ubicacion")).toBe(true);
  });

  it("rejects invalid fechaInicio", async () => {
    const errors = await validate(makeValidDto({ fechaInicio: "not-a-date" }));
    expect(errors.some((e) => e.property === "fechaInicio")).toBe(true);
  });

  it("rejects invalid fechaFin", async () => {
    const errors = await validate(makeValidDto({ fechaFin: "not-a-date" }));
    expect(errors.some((e) => e.property === "fechaFin")).toBe(true);
  });

  it("rejects invalid precioTipo", async () => {
    const errors = await validate(makeValidDto({ precioTipo: "gratuito" }));
    expect(errors.some((e) => e.property === "precioTipo")).toBe(true);
  });

  it("rejects invalid precioMoneda", async () => {
    const errors = await validate(makeValidDto({ precioMoneda: "EUR" }));
    expect(errors.some((e) => e.property === "precioMoneda")).toBe(true);
  });

  it("rejects publicoObjetivo with no elements", async () => {
    const errors = await validate(makeValidDto({ publicoObjetivo: [] }));
    expect(errors.some((e) => e.property === "publicoObjetivo")).toBe(true);
  });

  it("rejects invalid publicoObjetivo value", async () => {
    const errors = await validate(
      makeValidDto({ publicoObjetivo: ["extraterrestres"] }),
    );
    expect(errors.some((e) => e.property === "publicoObjetivo")).toBe(true);
  });

  it("rejects invalid nivelRuido", async () => {
    const errors = await validate(makeValidDto({ nivelRuido: "extremo" }));
    expect(errors.some((e) => e.property === "nivelRuido")).toBe(true);
  });

  it("rejects capacidadMaxima < 1", async () => {
    const errors = await validate(makeValidDto({ capacidadMaxima: 0 }));
    expect(errors.some((e) => e.property === "capacidadMaxima")).toBe(true);
  });

  it("rejects invalid portada URL", async () => {
    const errors = await validate(makeValidDto({ portada: "not-a-url" }));
    expect(errors.some((e) => e.property === "portada")).toBe(true);
  });

  it("rejects invalid accesibilidad value", async () => {
    const errors = await validate(
      makeValidDto({ accesibilidad: ["teleporter"] }),
    );
    expect(errors.some((e) => e.property === "accesibilidad")).toBe(true);
  });

  it("rejects fields not in the DTO (categoriaId)", async () => {
    const dto = makeValidDto({ categoriaId: "eventos" } as Record<
      string,
      unknown
    >);
    const errors = await validate(dto, {
      forbidNonWhitelisted: true,
      whitelist: true,
    });
    expect(errors.some((e) => e.property === "categoriaId")).toBe(true);
  });

  it("rejects usuarioId if passed", async () => {
    const dto = makeValidDto({ usuarioId: "uid-123" } as Record<
      string,
      unknown
    >);
    const errors = await validate(dto, {
      forbidNonWhitelisted: true,
      whitelist: true,
    });
    expect(errors.some((e) => e.property === "usuarioId")).toBe(true);
  });
});
