import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { EmpresasController } from "./empresas.controller";
import { EmpresasService } from "./empresas.service";
import { CreateEmpresaDto } from "./dto/create-empresa.dto";

describe("EmpresasController", () => {
  let controller: EmpresasController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    findBySlug: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const empresa = {
    id: "e1",
    nombre: "Restaurante El Marino",
    slug: "restaurante-el-marino",
    status: "pendiente",
  } as any;

  const baseDto: CreateEmpresaDto = {
    nombre: "Restaurante El Marino",
    descripcion: "Restaurante de mariscos frescos.",
    categoriaId: "cat-restaurantes",
    barrioId: "barrio-centro",
    direccion: "Av. Borgoño 123",
    planId: "gratuito",
  } as CreateEmpresaDto;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findBySlug: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmpresasController],
      providers: [{ provide: EmpresasService, useValue: service }],
    }).compile();

    controller = module.get<EmpresasController>(EmpresasController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST /empresas", () => {
    it("returns 201 with the created empresa", async () => {
      service.create.mockResolvedValue(empresa);
      const result = await controller.create(baseDto);
      expect(result).toEqual(empresa);
      expect(service.create).toHaveBeenCalledWith(baseDto);
    });

    it("propagates ConflictException (409) on duplicate slug", async () => {
      service.create.mockRejectedValue(new ConflictException("Slug duplicado"));
      await expect(controller.create(baseDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe("GET /empresas", () => {
    it("returns data and meta", async () => {
      service.findAll.mockResolvedValue({
        data: [empresa],
        meta: { total: 1, page: 1, limit: 20 },
      });
      const result = await controller.findAll(
        "cat",
        "bar",
        "q",
        undefined,
        "1",
        "20",
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe("GET /empresas/:id", () => {
    it("returns the empresa", async () => {
      service.findOne.mockResolvedValue(empresa);
      expect(await controller.findOne("e1")).toEqual(empresa);
    });

    it("propagates NotFoundException (404)", async () => {
      service.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne("x")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("GET /empresas/slug/:slug", () => {
    it("returns the empresa by slug", async () => {
      service.findBySlug.mockResolvedValue(empresa);
      expect(await controller.findBySlug("restaurante-el-marino")).toEqual(
        empresa,
      );
    });

    it("propagates NotFoundException (404)", async () => {
      service.findBySlug.mockRejectedValue(new NotFoundException());
      await expect(controller.findBySlug("x")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("PUT /empresas/:id", () => {
    it("returns the updated empresa", async () => {
      service.update.mockResolvedValue({ ...empresa, telefono: "+569" });
      const result = await controller.update("e1", { telefono: "+569" } as any);
      expect(result.telefono).toBe("+569");
    });

    it("propagates NotFoundException (404)", async () => {
      service.update.mockRejectedValue(new NotFoundException());
      await expect(controller.update("x", {} as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("DELETE /empresas/:id", () => {
    it("returns success message", async () => {
      service.remove.mockResolvedValue(undefined);
      const result = await controller.remove("e1");
      expect(result).toEqual({ deleted: true, id: "e1" });
    });

    it("propagates NotFoundException (404)", async () => {
      service.remove.mockRejectedValue(new NotFoundException());
      await expect(controller.remove("x")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
