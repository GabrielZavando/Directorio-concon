import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateEmpresaDto } from "./create-empresa.dto";

/**
 * DTO validation tests — Scenario 3 from OpenSpec.
 *
 * Tests class-validator decorators directly (no ValidationPipe, no E2E).
 * Validates that invalid payloads are rejected BEFORE reaching the service.
 */

const VALID_BASE = {
  nombre: "Restaurante El Marino",
  descripcion: "Restaurante de mariscos frescos de la zona.",
  categoriaId: "cat-restaurantes",
  barrioId: "barrio-centro",
  direccion: "Av. Borgoño 123, Concón",
  planId: "gratuito",
};

function toDto(data: Record<string, unknown>): CreateEmpresaDto {
  return plainToInstance(CreateEmpresaDto, data);
}

describe("CreateEmpresaDto — validation (Scenario 3)", () => {
  describe("valid payloads", () => {
    it("accepts a minimal valid payload", async () => {
      const errors = await validate(toDto(VALID_BASE));
      expect(errors.length).toBe(0);
    });

    it("accepts a full payload with all optional fields", async () => {
      const full = {
        ...VALID_BASE,
        telefono: "+56932123456",
        email: "contacto@elmarino.cl",
        sitioWeb: "https://www.elmarino.cl",
        horarios: "Lun-Vie: 9:00-18:00",
        servicios: ["Almuerzos", "Cenas"],
        coordenadas: { lat: -32.9175, lng: -71.5103 },
        logoUrl: "https://storage.googleapis.com/logo.jpg",
        redesSociales: [
          { id: "550e8400-e29b-41d4-a716-446655440000", nombre: "Facebook", icono: "facebook", url: "https://facebook.com/miempresa" },
        ],
      };
      const errors = await validate(toDto(full));
      expect(errors.length).toBe(0);
    });
  });

  describe("required fields", () => {
    it("rejects missing nombre", async () => {
      const { nombre, ...rest } = VALID_BASE;
      const errors = await validate(toDto(rest));
      expect(errors.some((e) => e.property === "nombre")).toBe(true);
    });

    it("rejects missing descripcion", async () => {
      const { descripcion, ...rest } = VALID_BASE;
      const errors = await validate(toDto(rest));
      expect(errors.some((e) => e.property === "descripcion")).toBe(true);
    });

    it("rejects missing categoriaId", async () => {
      const { categoriaId, ...rest } = VALID_BASE;
      const errors = await validate(toDto(rest));
      expect(errors.some((e) => e.property === "categoriaId")).toBe(true);
    });

    it("rejects missing barrioId", async () => {
      const { barrioId, ...rest } = VALID_BASE;
      const errors = await validate(toDto(rest));
      expect(errors.some((e) => e.property === "barrioId")).toBe(true);
    });

    it("rejects missing direccion", async () => {
      const { direccion, ...rest } = VALID_BASE;
      const errors = await validate(toDto(rest));
      expect(errors.some((e) => e.property === "direccion")).toBe(true);
    });

    it("rejects missing planId", async () => {
      const { planId, ...rest } = VALID_BASE;
      const errors = await validate(toDto(rest));
      expect(errors.some((e) => e.property === "planId")).toBe(true);
    });
  });

  describe("field constraints", () => {
    it("rejects nombre shorter than 2 chars", async () => {
      const errors = await validate(toDto({ ...VALID_BASE, nombre: "A" }));
      expect(errors.some((e) => e.property === "nombre")).toBe(true);
    });

    it("rejects descripcion shorter than 10 chars", async () => {
      const errors = await validate(toDto({ ...VALID_BASE, descripcion: "Corto" }));
      expect(errors.some((e) => e.property === "descripcion")).toBe(true);
    });

    it("rejects invalid planId (not in enum)", async () => {
      const errors = await validate(toDto({ ...VALID_BASE, planId: "invalido" }));
      expect(errors.some((e) => e.property === "planId")).toBe(true);
    });

    it("rejects nombre with forbidden characters", async () => {
      const errors = await validate(toDto({ ...VALID_BASE, nombre: "Resto@#$%" }));
      expect(errors.some((e) => e.property === "nombre")).toBe(true);
    });
  });

  describe("optional field validation", () => {
    it("rejects invalid email format", async () => {
      const errors = await validate(toDto({ ...VALID_BASE, email: "not-an-email" }));
      expect(errors.some((e) => e.property === "email")).toBe(true);
    });

    it("rejects invalid phone format", async () => {
      const errors = await validate(toDto({ ...VALID_BASE, telefono: "123" }));
      expect(errors.some((e) => e.property === "telefono")).toBe(true);
    });

    it("accepts valid Chilean phone", async () => {
      const errors = await validate(toDto({ ...VALID_BASE, telefono: "+56932123456" }));
      expect(errors.some((e) => e.property === "telefono")).toBe(false);
    });

    it("rejects invalid sitioWeb URL", async () => {
      const errors = await validate(toDto({ ...VALID_BASE, sitioWeb: "not-a-url" }));
      expect(errors.some((e) => e.property === "sitioWeb")).toBe(true);
    });

    it("rejects redesSociales exceeding max 3", async () => {
      const redes = Array.from({ length: 4 }, (_, i) => ({
        id: `r${i}`,
        nombre: `Red ${i}`,
        icono: "icon",
        url: "https://example.com",
      }));
      const errors = await validate(toDto({ ...VALID_BASE, redesSociales: redes }));
      expect(errors.some((e) => e.property === "redesSociales")).toBe(true);
    });
  });
});
