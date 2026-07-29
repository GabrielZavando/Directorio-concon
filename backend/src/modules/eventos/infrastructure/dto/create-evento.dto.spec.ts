/**
 * Validation tests for CreateEventoDto using class-validator.
 * TDD RED→GREEN: write tests, then verify decorators work.
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
    ubicacionDireccion: "Av. Borgoño 1234, Concón",
    coordenadas: { lat: -32.998, lng: -71.518 },
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
      ubicacionNombre: "Playa Amarilla",
      capacidadMaxima: 500,
      portada: "https://example.com/portada.jpg",
      accesibilidad: ["acceso-silla-ruedas", "banos-accesibles"],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  // -- nombre --
  it("rejects nombre shorter than 2 chars", async () => {
    const dto = makeValidDto({ nombre: "A" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "nombre")).toBe(true);
  });

  it("rejects nombre longer than 120 chars", async () => {
    const dto = makeValidDto({ nombre: "A".repeat(121) });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "nombre")).toBe(true);
  });

  // -- descripcionCorta --
  it("rejects descripcionCorta empty", async () => {
    const dto = makeValidDto({ descripcionCorta: "" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "descripcionCorta")).toBe(true);
  });

  it("rejects descripcionCorta longer than 140 chars", async () => {
    const dto = makeValidDto({ descripcionCorta: "A".repeat(141) });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "descripcionCorta")).toBe(true);
  });

  // -- descripcion --
  it("rejects descripcion shorter than 10 chars", async () => {
    const dto = makeValidDto({ descripcion: "Short" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "descripcion")).toBe(true);
  });

  it("rejects descripcion longer than 2000 chars", async () => {
    const dto = makeValidDto({ descripcion: "A".repeat(2001) });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "descripcion")).toBe(true);
  });

  // -- coordenadas --
  it("rejects out-of-range lat", async () => {
    const dto = makeValidDto({ coordenadas: { lat: 91, lng: 0 } });
    const errors = await validate(dto);
    const coordErrors = errors.find((e) => e.property === "coordenadas");
    expect(coordErrors).toBeDefined();
  });

  it("rejects out-of-range lng", async () => {
    const dto = makeValidDto({ coordenadas: { lat: 0, lng: 181 } });
    const errors = await validate(dto);
    const coordErrors = errors.find((e) => e.property === "coordenadas");
    expect(coordErrors).toBeDefined();
  });

  // -- fechaInicio / fechaFin --
  it("rejects invalid fechaInicio", async () => {
    const dto = makeValidDto({ fechaInicio: "not-a-date" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "fechaInicio")).toBe(true);
  });

  it("rejects invalid fechaFin", async () => {
    const dto = makeValidDto({ fechaFin: "not-a-date" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "fechaFin")).toBe(true);
  });

  // -- precioTipo --
  it("rejects invalid precioTipo", async () => {
    const dto = makeValidDto({ precioTipo: "gratuito" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "precioTipo")).toBe(true);
  });

  // -- precioMoneda --
  it("rejects invalid precioMoneda", async () => {
    const dto = makeValidDto({ precioMoneda: "EUR" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "precioMoneda")).toBe(true);
  });

  // -- publicoObjetivo --
  it("rejects publicoObjetivo with no elements", async () => {
    const dto = makeValidDto({ publicoObjetivo: [] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "publicoObjetivo")).toBe(true);
  });

  it("rejects invalid publicoObjetivo value", async () => {
    const dto = makeValidDto({ publicoObjetivo: ["extraterrestres"] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "publicoObjetivo")).toBe(true);
  });

  // -- nivelRuido --
  it("rejects invalid nivelRuido", async () => {
    const dto = makeValidDto({ nivelRuido: "extremo" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "nivelRuido")).toBe(true);
  });

  // -- capacidadMaxima --
  it("rejects capacidadMaxima < 1", async () => {
    const dto = makeValidDto({ capacidadMaxima: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "capacidadMaxima")).toBe(true);
  });

  // -- portada --
  it("rejects invalid portada URL", async () => {
    const dto = makeValidDto({ portada: "not-a-url" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "portada")).toBe(true);
  });

  // -- accesibilidad --
  it("rejects invalid accesibilidad value", async () => {
    const dto = makeValidDto({ accesibilidad: ["teleporter"] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "accesibilidad")).toBe(true);
  });

  // -- forbidNonWhitelisted --
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
