/**
 * Validation tests for CreatePlaceDto using class-validator.
 * TDD RED→GREEN: write tests, then verify decorators work.
 */
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreatePlaceDto } from "./create-place.dto";

function makeValidDto(overrides: Record<string, unknown> = {}): CreatePlaceDto {
  return plainToInstance(CreatePlaceDto, {
    nombre: "Restaurante El Marino",
    descripcionCorta: "Mariscos frescos",
    descripcion: "Restaurante familiar especializado en mariscos y pescados",
    categoriaId: "gastronomia",
    barrioId: "higuerillas",
    direccion: "Av. Borgoño 123",
    planId: "gratuito",
    ...overrides,
  });
}

describe("CreatePlaceDto validation", () => {
  it("accepts a valid minimal DTO", async () => {
    const dto = makeValidDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("accepts a valid full DTO with all optional fields", async () => {
    const dto = makeValidDto({
      subcategoriaId: "restaurantes",
      coordenadas: { lat: -33.01, lng: -71.54 },
      telefono: "+56912345678",
      whatsapp: "+56912345678",
      email: "test@example.com",
      sitioWeb: "https://example.com",
      redesSociales: [
        { plataforma: "instagram", url: "https://instagram.com/test" },
      ],
      imagenes: { logo: "https://example.com/logo.png", galeria: [] },
      horarios: [
        {
          dia: "lunes",
          abierto: true,
          turnos: [{ apertura: "12:00", cierre: "16:00" }],
        },
      ],
      horariosEspeciales: [
        { fecha: "2025-12-31", descripcion: "Año Nuevo", turnos: [] },
      ],
      abierto24x7: false,
      servicios: ["wifi", "estacionamiento"],
      metodosPago: ["efectivo", "credito"],
      idiomas: ["español"],
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

  it("rejects nombre longer than 100 chars", async () => {
    const dto = makeValidDto({ nombre: "A".repeat(101) });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "nombre")).toBe(true);
  });

  // -- descripcionCorta --
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

  // -- planId --
  it("rejects invalid planId", async () => {
    const dto = makeValidDto({ planId: "enterprise" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "planId")).toBe(true);
  });

  // -- email --
  it("rejects malformed email", async () => {
    const dto = makeValidDto({ email: "not-an-email" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "email")).toBe(true);
  });

  // -- servicios enum --
  it("rejects invalid servicio value", async () => {
    const dto = makeValidDto({ servicios: ["wifi", "invalid-service"] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "servicios")).toBe(true);
  });

  it("accepts valid servicio values", async () => {
    const dto = makeValidDto({ servicios: ["wifi", "terraza", "delivery"] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "servicios")).toBe(false);
  });

  // -- metodosPago enum --
  it("rejects invalid metodoPago value", async () => {
    const dto = makeValidDto({ metodosPago: ["efectivo", "bitcoin"] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "metodosPago")).toBe(true);
  });

  // -- redesSociales --
  it("rejects more than 3 redesSociales", async () => {
    const dto = makeValidDto({
      redesSociales: [
        { plataforma: "a", url: "https://a.com" },
        { plataforma: "b", url: "https://b.com" },
        { plataforma: "c", url: "https://c.com" },
        { plataforma: "d", url: "https://d.com" },
      ],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "redesSociales")).toBe(true);
  });

  // -- coordenadas --
  it("rejects out-of-range lat", async () => {
    const dto = makeValidDto({ coordenadas: { lat: 91, lng: 0 } });
    const errors = await validate(dto);
    const coordErrors = errors.find((e) => e.property === "coordenadas");
    expect(coordErrors).toBeDefined();
  });

  // -- horarios nested --
  it("rejects horario with invalid dia", async () => {
    const dto = makeValidDto({
      horarios: [
        {
          dia: "festivo",
          abierto: true,
          turnos: [{ apertura: "12:00", cierre: "16:00" }],
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "horarios")).toBe(true);
  });

  it("accepts turno with valid HH:mm format (range validated at service layer)", async () => {
    // DTO validates format only; apertura < cierre is a business rule checked by PlacesService
    const dto = makeValidDto({
      horarios: [
        {
          dia: "lunes",
          abierto: true,
          turnos: [{ apertura: "16:00", cierre: "12:00" }],
        },
      ],
    });
    const errors = await validate(dto);
    // Format is valid, so no errors from DTO decorators
    expect(errors.some((e) => e.property === "horarios")).toBe(false);
  });
});
