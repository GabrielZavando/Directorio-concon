import { Test, type TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { CategoriasService } from "./categorias.service";
import { Categoria } from "../domain/categoria.entity";
import { Subcategoria } from "../domain/subcategoria.vo";
import { CATEGORIA_READ_REPOSITORY } from "../domain/categoria-read-repository.interface";
import { CATEGORIA_WRITE_REPOSITORY } from "../domain/categoria-write-repository.interface";

describe("CategoriasService", () => {
  let service: CategoriasService;
  let readRepo: jest.Mocked<{
    findById: jest.Mock;
    findBySlug: jest.Mock;
    list: jest.Mock;
    existsBySlug: jest.Mock;
    existsByOrden: jest.Mock;
  }>;
  let writeRepo: jest.Mocked<{
    create: jest.Mock;
    updateById: jest.Mock;
    activate: jest.Mock;
    deactivate: jest.Mock;
    addSubcategoria: jest.Mock;
    setSubcategoriaActivo: jest.Mock;
  }>;

  beforeEach(async () => {
    readRepo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      list: jest.fn(),
      existsBySlug: jest.fn(),
      existsByOrden: jest.fn(),
    };
    writeRepo = {
      create: jest.fn(),
      updateById: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      addSubcategoria: jest.fn(),
      setSubcategoriaActivo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriasService,
        { provide: CATEGORIA_READ_REPOSITORY, useValue: readRepo },
        { provide: CATEGORIA_WRITE_REPOSITORY, useValue: writeRepo },
      ],
    }).compile();

    service = module.get(CategoriasService);
  });

  const makeCat = (
    overrides: Partial<{ activo: boolean; slug: string; id: string }> = {},
  ) =>
    new Categoria({
      id: overrides.id ?? "gastronomia",
      nombre: "Gastronomía",
      slug: overrides.slug ?? "gastronomia",
      icono: "utensils",
      orden: 1,
      activo: overrides.activo ?? true,
    });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe("create", () => {
    it("crea cuando slug y orden son únicos", async () => {
      readRepo.existsBySlug.mockResolvedValue(false);
      readRepo.existsByOrden.mockResolvedValue(false);
      writeRepo.create.mockImplementation(async (c) => c);

      const result = await service.create({
        nombre: "Gastronomía",
        slug: "gastronomia",
        icono: "utensils",
        orden: 1,
      });

      expect(result.id).toBe("gastronomia");
      expect(writeRepo.create).toHaveBeenCalledTimes(1);
    });

    it("lanza ConflictException si slug duplicado", async () => {
      readRepo.existsBySlug.mockResolvedValue(true);

      await expect(
        service.create({
          nombre: "X",
          slug: "gastronomia",
          icono: "utensils",
          orden: 5,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(writeRepo.create).not.toHaveBeenCalled();
    });

    it("lanza ConflictException si orden duplicado", async () => {
      readRepo.existsBySlug.mockResolvedValue(false);
      readRepo.existsByOrden.mockResolvedValue(true);

      await expect(
        service.create({ nombre: "X", slug: "new", icono: "store", orden: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("lanza ConflictException si slug mal formado", async () => {
      await expect(
        service.create({
          nombre: "X",
          slug: "Gastronomia",
          icono: "utensils",
          orden: 1,
        }),
      ).rejects.toThrow(/slug/);
    });
  });

  // ---------------------------------------------------------------------------
  // updateById
  // ---------------------------------------------------------------------------

  describe("updateById", () => {
    it("actualiza campos válidos cuando la categoría existe", async () => {
      readRepo.findById.mockResolvedValue(makeCat());
      readRepo.existsByOrden.mockResolvedValue(false);
      writeRepo.updateById.mockImplementation(async (id, _patch) =>
        makeCat({ id }),
      );

      const result = await service.updateById("gastronomia", {
        nombre: "Gastro",
      });
      expect(result).toBeDefined();
    });

    it("lanza NotFoundException si no existe", async () => {
      readRepo.findById.mockResolvedValue(undefined);
      await expect(
        service.updateById("nope", { nombre: "X" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("lanza ConflictException si el nuevo orden ya está tomado por otra categoría", async () => {
      readRepo.findById.mockResolvedValue(makeCat());
      readRepo.existsByOrden.mockResolvedValue(true);
      await expect(
        service.updateById("gastronomia", { orden: 2 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("no verifica conflicto de orden si el orden no cambia", async () => {
      readRepo.findById.mockResolvedValue(makeCat());
      writeRepo.updateById.mockImplementation(async (id, _patch) =>
        makeCat({ id }),
      );
      await service.updateById("gastronomia", { orden: 1 });
      expect(readRepo.existsByOrden).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // addSubcategoria
  // ---------------------------------------------------------------------------

  describe("addSubcategoria", () => {
    it("agrega subcategoría vía repo", async () => {
      readRepo.findById.mockResolvedValue(makeCat());
      writeRepo.addSubcategoria.mockImplementation(async (id, sub) =>
        makeCat({ id }).addSubcategoria(sub),
      );
      const result = await service.addSubcategoria("gastronomia", {
        slug: "restaurantes",
        nombre: "Restaurantes",
      });
      expect(result.subcategorias.some((s) => s.slug === "restaurantes")).toBe(
        true,
      );
    });

    it("lanza NotFoundException si categoría no existe", async () => {
      readRepo.findById.mockResolvedValue(undefined);
      await expect(
        service.addSubcategoria("nope", { slug: "x", nombre: "X" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // setSubcategoriaActivo
  // ---------------------------------------------------------------------------

  describe("setSubcategoriaActivo", () => {
    it("desactiva una subcategoría existente", async () => {
      const catWithSub = makeCat().addSubcategoria(
        new Subcategoria({ slug: "r", nombre: "R", activo: true }),
      );
      readRepo.findById.mockResolvedValue(catWithSub);
      writeRepo.setSubcategoriaActivo.mockImplementation(async () =>
        catWithSub.findSubcategoriaBySlug("r")
          ? makeCat().addSubcategoria(
              new Subcategoria({ slug: "r", nombre: "R", activo: false }),
            )
          : catWithSub,
      );
      const result = await service.setSubcategoriaActivo(
        "gastronomia",
        "r",
        false,
      );
      expect(result.subcategorias[0].activo).toBe(false);
    });

    it("lanza NotFoundException si categoría no existe", async () => {
      readRepo.findById.mockResolvedValue(undefined);
      await expect(
        service.setSubcategoriaActivo("nope", "r", false),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("lanza NotFoundException si subcategoría no existe", async () => {
      readRepo.findById.mockResolvedValue(makeCat());
      await expect(
        service.setSubcategoriaActivo("gastronomia", "nope", false),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(writeRepo.setSubcategoriaActivo).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // activate / deactivate
  // ---------------------------------------------------------------------------

  describe("activate / deactivate", () => {
    it("activa una categoría existente vía repo", async () => {
      readRepo.findById.mockResolvedValue(makeCat({ activo: false }));
      writeRepo.activate.mockImplementation(async (id) => makeCat({ id }));
      const result = await service.activate("gastronomia");
      expect(writeRepo.activate).toHaveBeenCalledWith("gastronomia");
      expect(result.activo).toBe(true);
    });

    it("desactiva una categoría existente vía repo", async () => {
      readRepo.findById.mockResolvedValue(makeCat());
      writeRepo.deactivate.mockImplementation(async (id) =>
        makeCat({ id, activo: false }),
      );
      const result = await service.deactivate("gastronomia");
      expect(writeRepo.deactivate).toHaveBeenCalledWith("gastronomia");
      expect(result.activo).toBe(false);
    });

    it("lanza NotFoundException en activate si no existe", async () => {
      readRepo.findById.mockResolvedValue(undefined);
      await expect(service.activate("nope")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("lanza NotFoundException en deactivate si no existe", async () => {
      readRepo.findById.mockResolvedValue(undefined);
      await expect(service.deactivate("nope")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // list (with public filter)
  // ---------------------------------------------------------------------------

  describe("list", () => {
    it("pasa el flag onlyActive al read repo", async () => {
      readRepo.list.mockResolvedValue([]);
      await service.list({ onlyActive: true });
      expect(readRepo.list).toHaveBeenCalledWith({ onlyActive: true });
    });

    it("sin filtro pasa soloActive=undefined", async () => {
      readRepo.list.mockResolvedValue([]);
      await service.list();
      expect(readRepo.list).toHaveBeenCalledWith(undefined);
    });

    it("para público: filtra subcategorias inactivas", async () => {
      const cat = makeCat().addSubcategoria(
        new Subcategoria({ slug: "r", nombre: "R", activo: false }),
      );
      readRepo.list.mockResolvedValue([cat]);
      const result = await service.listPublic();
      expect(result[0].subcategorias).toHaveLength(0);
    });

    it("para público: oculta categorías inactivas", async () => {
      const inactive = makeCat({ activo: false });
      readRepo.list.mockResolvedValue([inactive]);
      const result = await service.listPublic();
      expect(result).toHaveLength(0);
    });
  });
});
