import { validate } from "class-validator";
import { UpdateCategoriaDto } from "./update-categoria.dto";

describe("UpdateCategoriaDto", () => {
  it("allows partial valid fields", async () => {
    const dto = new UpdateCategoriaDto();
    dto.nombre = "Gastronomía";
    dto.icono = "utensils";
    dto.orden = 3;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("rejects invalid orden", async () => {
    const dto = new UpdateCategoriaDto();
    dto.orden = -1;

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("orden");
  });

  it("allows empty body (all fields optional)", async () => {
    const dto = new UpdateCategoriaDto();
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
