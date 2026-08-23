import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { CatalogValidator } from "./catalog-validator.service";
import { Categoria } from "../domain/categoria.entity";
import { Subcategoria } from "../domain/subcategoria.vo";
import { Barrio } from "../../barrios/domain/barrio.entity";
import { CATEGORIA_READ_REPOSITORY } from "../domain/categoria-read-repository.interface";
import { BARRIO_READ_REPOSITORY } from "../../barrios/domain/barrio-read-repository.interface";
import { CatalogValidationConfig } from "@/config/catalog-validation.config";

function makeCategoria(
  props: Partial<
    Omit<
      ConstructorParameters<typeof Categoria>[0],
      "id" | "slug" | "nombre" | "icono" | "orden"
    >
  > = {},
) {
  return new Categoria({
    id: "gastronomia",
    nombre: "Gastronomía",
    slug: "gastronomia",
    icono: "utensils",
    orden: 1,
    activo: true,
    subcategorias: [
      new Subcategoria({
        slug: "restaurantes",
        nombre: "Restaurantes",
        activo: true,
      }),
    ],
    ...props,
  });
}

describe("CatalogValidator", () => {
  let validator: CatalogValidator;
  let catRepo: jest.Mocked<{
    findById: jest.Mock;
    existsBySlug: jest.Mock;
  }>;
  let barrioRepo: jest.Mocked<{
    findById: jest.Mock;
  }>;

  beforeEach(async () => {
    catRepo = {
      findById: jest.fn(),
      existsBySlug: jest.fn(),
    };
    barrioRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogValidator,
        { provide: CATEGORIA_READ_REPOSITORY, useValue: catRepo },
        { provide: BARRIO_READ_REPOSITORY, useValue: barrioRepo },
        {
          provide: CatalogValidationConfig.KEY,
          useValue: { enabled: true },
        },
      ],
    }).compile();

    validator = module.get(CatalogValidator);
  });

  describe("enabled flag", () => {
    it("reads enabled from the injected config", () => {
      expect(validator.enabled).toBe(true);
    });
  });

  describe("assertCategoriaActiva", () => {
    it("pasa si categoría existe y está activa", async () => {
      catRepo.findById.mockResolvedValue(makeCategoria());
      await expect(
        validator.assertCategoriaActiva("gastronomia"),
      ).resolves.not.toThrow();
    });

    it("lanza BadRequestException si no existe", async () => {
      catRepo.findById.mockResolvedValue(undefined);
      await expect(
        validator.assertCategoriaActiva("nope"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("lanza BadRequestException si inactiva", async () => {
      catRepo.findById.mockResolvedValue(makeCategoria({ activo: false }));
      await expect(
        validator.assertCategoriaActiva("gastronomia"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("assertSubcategoriaActiva", () => {
    it("pasa si subcategoría existe y está activa", async () => {
      catRepo.findById.mockResolvedValue(makeCategoria());
      await expect(
        validator.assertSubcategoriaActiva("gastronomia", "restaurantes"),
      ).resolves.not.toThrow();
    });

    it("lanza si categoría no existe", async () => {
      catRepo.findById.mockResolvedValue(undefined);
      await expect(
        validator.assertSubcategoriaActiva("nope", "restaurantes"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("lanza si subcategoría no existe", async () => {
      catRepo.findById.mockResolvedValue(makeCategoria());
      await expect(
        validator.assertSubcategoriaActiva("gastronomia", "nope"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("lanza si subcategoría inactiva", async () => {
      catRepo.findById.mockResolvedValue(
        makeCategoria({
          subcategorias: [
            new Subcategoria({
              slug: "restaurantes",
              nombre: "Restaurantes",
              activo: false,
            }),
          ],
        }),
      );
      await expect(
        validator.assertSubcategoriaActiva("gastronomia", "restaurantes"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("assertBarrioActivo", () => {
    it("pasa si barrio existe y está activo", async () => {
      barrioRepo.findById.mockResolvedValue(
        new Barrio({
          id: "higuerillas",
          nombre: "Higuerillas",
          slug: "higuerillas",
          tipo: "urbano",
        }),
      );
      await expect(
        validator.assertBarrioActivo("higuerillas"),
      ).resolves.not.toThrow();
    });

    it("lanza si no existe", async () => {
      barrioRepo.findById.mockResolvedValue(undefined);
      await expect(validator.assertBarrioActivo("nope")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("lanza si inactivo", async () => {
      barrioRepo.findById.mockResolvedValue(
        new Barrio({
          id: "higuerillas",
          nombre: "Higuerillas",
          slug: "higuerillas",
          tipo: "urbano",
          activo: false,
        }),
      );
      await expect(
        validator.assertBarrioActivo("higuerillas"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
