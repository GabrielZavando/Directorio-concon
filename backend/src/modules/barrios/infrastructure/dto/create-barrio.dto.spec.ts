/**
 * Unit tests for CreateBarrioDto (class-validator decorators).
 */
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateBarrioDto } from "./create-barrio.dto";

async function validateDto(body: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(CreateBarrioDto, body);
  const errors = await validate(dto);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe("CreateBarrioDto", () => {
  it("acepta payload válido", async () => {
    const errors = await validateDto({
      nombre: "Higuerillas",
      slug: "higuerillas",
      tipo: "urbano",
      descripcion: "Zona costera",
      territorio: "Costa norte",
      codigo: "UV-01",
      coordenadas: "-33.0,-71.5",
    });
    expect(errors).toEqual([]);
  });

  it("rechaza nombre vacío o muy corto", async () => {
    const errors = await validateDto({
      nombre: "",
      slug: "higuerillas",
      tipo: "urbano",
    });
    expect(errors.some((m) => m.includes("nombre"))).toBe(true);
  });

  it("rechaza slug con mayúsculas o espacios", async () => {
    const errors = await validateDto({
      nombre: "Higuerillas",
      slug: "Higuerillas",
      tipo: "urbano",
    });
    expect(errors.some((m) => m.includes("slug"))).toBe(true);
  });

  it("rechaza tipo fuera de urbano/rural", async () => {
    const errors = await validateDto({
      nombre: "Higuerillas",
      slug: "higuerillas",
      tipo: "industrial",
    });
    expect(errors.some((m) => m.includes("tipo"))).toBe(true);
  });

  it("rechaza coordenadas mal formadas", async () => {
    const errors = await validateDto({
      nombre: "Higuerillas",
      slug: "higuerillas",
      tipo: "urbano",
      coordenadas: "no-es-coordenada",
    });
    expect(errors.some((m) => m.includes("coordenadas"))).toBe(true);
  });

  it("forbidNonWhitelisted: rechaza activo en el body", async () => {
    const dto = plainToInstance(CreateBarrioDto, {
      nombre: "Higuerillas",
      slug: "higuerillas",
      tipo: "urbano",
      activo: true,
    });
    // En runtime el ValidationPipe usa forbidNonWhitelisted; aquí validamos
    // que `activo` no es parte del DTO (decorador no whitelisted).
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    const activoError = errors.some(
      (e) => e.property === "activo" && e.constraints?.whitelistValidation,
    );
    expect(activoError).toBe(true);
  });
});
