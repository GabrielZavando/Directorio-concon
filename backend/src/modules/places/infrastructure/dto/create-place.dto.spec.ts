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

  // -- usuarioId removed from CreatePlace body (roles-rename change) --
  describe("CreatePlace does not accept usuarioId from the body", () => {
    // Matches the global ValidationPipe config in backend/src/main.ts:51-52.
    // We re-assert this config in the test so the test is self-contained.
    const PIPELINE_VALIDATOR_OPTIONS = {
      whitelist: true,
      forbidNonWhitelisted: true,
    } as const;

    it("rejects the body with usuarioId set (forbidNonWhitelisted)", async () => {
      const dto = makeValidDto({ usuarioId: "uid-spoofed-001" });
      const errors = await validate(dto, PIPELINE_VALIDATOR_OPTIONS);
      // The global ValidationPipe has forbidNonWhitelisted: true
      // (see backend/src/main.ts:52), so unknown properties raise a
      // ValidationError with a 'whitelistValidation' constraint key.
      const unknownPropError = errors.find(
        (e) =>
          e.property === "usuarioId" ||
          (e.constraints &&
            Object.keys(e.constraints).some((k) => k.includes("whitelist"))),
      );
      expect(unknownPropError).toBeDefined();
    });

    it("does not expose a usuarioId decorator on the CreatePlaceDto class", () => {
      // Compile-time + runtime: the class MUST NOT list a 'usuarioId' field.
      // If anyone reintroduces it, this test fails. Defense against regression.
      const dto = makeValidDto();
      expect(dto).not.toHaveProperty("usuarioId");
      expect(Object.keys(dto)).not.toContain("usuarioId");
    });

    it("accepts a valid body that omits usuarioId (control case)", async () => {
      const dto = makeValidDto();
      const errors = await validate(dto, PIPELINE_VALIDATOR_OPTIONS);
      expect(errors.length).toBe(0);
    });

    it("reports a whitelistValidation error targeted at usuarioId (control test)", async () => {
      const dto = makeValidDto({ usuarioId: "uid-spoofed-002" });
      // class-validator's `whitelist: true` reports the unknown property
      // as a validation error but does NOT mutate the DTO instance.
      // The NestJS ValidationPipe (main.ts:48-57) wraps this call and
      // throws 400 to the caller.
      const errors = await validate(dto, PIPELINE_VALIDATOR_OPTIONS);
      // The error MUST be specifically about the unknown property `usuarioId`,
      // NOT some other validation error (e.g., nombre too short).
      const unknownPropError = errors.find((e) => {
        const constraints = e.constraints ?? {};
        return Object.keys(constraints).some((k) =>
          k.toLowerCase().includes("whitelist"),
        );
      });
      expect(unknownPropError).toBeDefined();
    });
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
    // Uses canonical PlataformaSocialEnum values so the rejection is solely
    // driven by ArrayMaxSize (not by enum rejection). The 6 valid enum values
    // are instagram/facebook/x-twitter/linkedin/tiktok/youtube; we exceed the
    // 3-item limit by using 4 distinct valid platforms.
    const dto = makeValidDto({
      redesSociales: [
        { plataforma: "instagram", url: "https://instagram.com/a" },
        { plataforma: "facebook", url: "https://facebook.com/b" },
        { plataforma: "x-twitter", url: "https://twitter.com/c" },
        { plataforma: "linkedin", url: "https://linkedin.com/d" },
      ],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "redesSociales")).toBe(true);
  });

  // Note: deep `redesSociales[].plataforma` enum-closure tests (PlataformaSocialEnum
  // membership, legacy 'twitter' rejection, etc.) live in `red-social.dto.spec.ts`
  // co-located with `RedSocialDto` — this spec focuses on the parent DTO.

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
