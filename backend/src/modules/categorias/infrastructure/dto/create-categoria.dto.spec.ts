import { validate } from "class-validator";
import { CreateCategoriaDto, LUCIDE_ICONS } from "./create-categoria.dto";
import { plainToInstance } from "class-transformer";

describe("CreateCategoriaDto validation", () => {
  const validInput = {
    nombre: "Gastronomía",
    slug: "gastronomia",
    icono: "utensils",
    orden: 1,
  };

  const toDto = (input: Record<string, unknown>): CreateCategoriaDto =>
    plainToInstance(CreateCategoriaDto, input);

  it("acepta un input válido completo", async () => {
    const dto = toDto(validInput);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  it("acepta descripcion y color opcionales", async () => {
    const dto = toDto({
      ...validInput,
      descripcion: "Restaurantes, cafeterías",
      color: "#fadeba",
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  it("rechaza si falta nombre", async () => {
    const input = { ...validInput };
    delete input.nombre;
    const dto = toDto(input);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === "nombre")).toBe(true);
  });

  it("rechaza nombre con menos de 2 caracteres", async () => {
    const dto = toDto({ ...validInput, nombre: "X" });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === "nombre")).toBe(true);
  });

  it("rechaza nombre con más de 80 caracteres", async () => {
    const dto = toDto({ ...validInput, nombre: "X".repeat(81) });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === "nombre")).toBe(true);
  });

  it("rechaza slug con mayúsculas", async () => {
    const dto = toDto({ ...validInput, slug: "Gastronomia" });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === "slug")).toBe(true);
  });

  it("rechaza slug con espacios", async () => {
    const dto = toDto({ ...validInput, slug: "gas tron omia" });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === "slug")).toBe(true);
  });

  it("rechaza icono fuera de la lista Lucide", async () => {
    const dto = toDto({ ...validInput, icono: "fork-knife" });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === "icono")).toBe(true);
  });

  it("rechaza orden 0 o negativo", async () => {
    for (const orden of [0, -1, -100]) {
      const dto = toDto({ ...validInput, orden });
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errors.some((e) => e.property === "orden")).toBe(true);
    }
  });

  it("rechaza orden no entero", async () => {
    const dto = toDto({ ...validInput, orden: 1.5 });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === "orden")).toBe(true);
  });

  it("rechaza orden mayor a 99", async () => {
    const dto = toDto({ ...validInput, orden: 100 });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === "orden")).toBe(true);
  });

  it("forbidNonWhitelisted: rechaza campo activo en el body", async () => {
    const dto = toDto({ ...validInput, activo: false });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === "activo")).toBe(true);
  });

  it("forbidNonWhitelisted: rechaza campo id en el body", async () => {
    const dto = toDto({ ...validInput, id: "hacker" });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === "id")).toBe(true);
  });

  it("forbidNonWhitelisted: rechaza subcategorias en el body de create (se gestiona vía endpoint dedicado)", async () => {
    const dto = toDto({
      ...validInput,
      subcategorias: [{ slug: "x", nombre: "X" }],
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === "subcategorias")).toBe(true);
  });

  it("LUCIDE_ICONS contiene los 9 iconos del design system", () => {
    expect(LUCIDE_ICONS).toHaveLength(9);
    expect(LUCIDE_ICONS).toContain("utensils");
    expect(LUCIDE_ICONS).toContain("party-popper");
    expect(LUCIDE_ICONS).toContain("building-2");
  });
});
