import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateSubcategoriaDto } from "./create-subcategoria.dto";

describe("CreateSubcategoriaDto", () => {
  it("accepts valid slug, nombre and default activo", async () => {
    const dto = new CreateSubcategoriaDto();
    dto.slug = "restaurantes";
    dto.nombre = "Restaurantes";

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("transforms explicit activo value", () => {
    const dto = plainToInstance(CreateSubcategoriaDto, {
      slug: "restaurantes",
      nombre: "Restaurantes",
      activo: false,
    });
    expect(dto.activo).toBe(false);
  });

  it("accepts explicit activo value", async () => {
    const dto = new CreateSubcategoriaDto();
    dto.slug = "cafeterias";
    dto.nombre = "Cafeterías";
    dto.activo = true;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("rejects uppercase slug", async () => {
    const dto = new CreateSubcategoriaDto();
    dto.slug = "Restaurantes";
    dto.nombre = "Restaurantes";

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("slug");
  });

  it("rejects short slug", async () => {
    const dto = new CreateSubcategoriaDto();
    dto.slug = "r";
    dto.nombre = "Restaurantes";

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("slug");
  });
});
