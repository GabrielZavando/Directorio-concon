import { Test } from "@nestjs/testing";
import { BarriosService } from "./barrios.service";
import { BARRIO_READ_REPOSITORY } from "../domain/barrio-read-repository.interface";
import { BARRIO_WRITE_REPOSITORY } from "../domain/barrio-write-repository.interface";
import type { BarrioReadRepository } from "../domain/barrio-read-repository.interface";
import type { BarrioWriteRepository } from "../domain/barrio-write-repository.interface";
import { Barrio } from "../domain/barrio.entity";

const barrioProps = {
  id: "higuerillas",
  nombre: "Higuerillas",
  slug: "higuerillas",
  tipo: "urbano" as const,
  activo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("BarriosService", () => {
  let service: BarriosService;
  let readRepo: jest.Mocked<BarrioReadRepository>;
  let writeRepo: jest.Mocked<BarrioWriteRepository>;

  beforeEach(async () => {
    readRepo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      list: jest.fn(),
      existsBySlug: jest.fn(),
    };
    writeRepo = {
      create: jest.fn(),
      updateById: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BarriosService,
        { provide: BARRIO_READ_REPOSITORY, useValue: readRepo },
        { provide: BARRIO_WRITE_REPOSITORY, useValue: writeRepo },
      ],
    }).compile();

    service = moduleRef.get(BarriosService);
  });

  it("create: new slug → persist", async () => {
    readRepo.existsBySlug.mockResolvedValue(false);
    writeRepo.create.mockImplementation(async (b) => b);
    const result = await service.create({
      nombre: "Higuerillas",
      slug: "higuerillas",
      tipo: "urbano",
      descripcion: "Zona costera",
      coordenadas: "-33.0,-71.5",
    });
    expect(writeRepo.create).toHaveBeenCalled();
    expect(result.coordenadas).toEqual({ lat: -33, lng: -71.5 });
  });

  it("create: duplicate slug → ConflictException", async () => {
    readRepo.existsBySlug.mockResolvedValue(true);
    await expect(
      service.create({
        nombre: "Higuerillas",
        slug: "higuerillas",
        tipo: "urbano",
      }),
    ).rejects.toThrow("Slug duplicado");
    expect(writeRepo.create).not.toHaveBeenCalled();
  });

  it("create: without coordenadas → undefined coords", async () => {
    readRepo.existsBySlug.mockResolvedValue(false);
    writeRepo.create.mockImplementation(async (b) => b);
    const result = await service.create({
      nombre: "Los Troncos",
      slug: "los-troncos",
      tipo: "rural",
    });
    expect(writeRepo.create).toHaveBeenCalled();
    expect(result.coordenadas).toBeUndefined();
  });

  it("updateById: existing → delegates", async () => {
    readRepo.findById.mockResolvedValue(new Barrio(barrioProps));
    writeRepo.updateById.mockImplementation(
      async (id, patch) => new Barrio({ ...barrioProps, ...patch }),
    );
    const result = await service.updateById("higuerillas", {
      nombre: "Higuerillas Sur",
    });
    expect(writeRepo.updateById).toHaveBeenCalledWith("higuerillas", {
      nombre: "Higuerillas Sur",
    });
    expect(result.nombre).toBe("Higuerillas Sur");
  });

  it("updateById: coordenadas as string → parsed object", async () => {
    readRepo.findById.mockResolvedValue(new Barrio(barrioProps));
    writeRepo.updateById.mockImplementation(
      async (id, patch) => new Barrio({ ...barrioProps, ...patch }),
    );
    await service.updateById("higuerillas", { coordenadas: "-33.01,-71.52" });
    expect(writeRepo.updateById).toHaveBeenCalledWith("higuerillas", {
      coordenadas: { lat: -33.01, lng: -71.52 },
    });
  });

  it("updateById: coordenadas as object → passed through", async () => {
    readRepo.findById.mockResolvedValue(new Barrio(barrioProps));
    writeRepo.updateById.mockImplementation(
      async (id, patch) => new Barrio({ ...barrioProps, ...patch }),
    );
    const coords = { lat: -33.01, lng: -71.52 };
    await service.updateById("higuerillas", { coordenadas: coords });
    expect(writeRepo.updateById).toHaveBeenCalledWith("higuerillas", {
      coordenadas: coords,
    });
  });

  it("updateById: missing → NotFoundException", async () => {
    readRepo.findById.mockResolvedValue(undefined);
    await expect(service.updateById("nope", { nombre: "x" })).rejects.toThrow(
      "Barrio nope no encontrado",
    );
  });

  it("activate/deactivate existing → delegates", async () => {
    readRepo.findById.mockResolvedValue(new Barrio(barrioProps));
    writeRepo.activate.mockImplementation(
      async (_id) => new Barrio({ ...barrioProps, activo: true }),
    );
    writeRepo.deactivate.mockImplementation(
      async (_id) => new Barrio({ ...barrioProps, activo: false }),
    );
    await service.activate("higuerillas");
    expect(writeRepo.activate).toHaveBeenCalledWith("higuerillas");
    await service.deactivate("higuerillas");
    expect(writeRepo.deactivate).toHaveBeenCalledWith("higuerillas");
  });

  it("activate/deactivate missing → NotFoundException", async () => {
    readRepo.findById.mockResolvedValue(undefined);
    await expect(service.activate("nope")).rejects.toThrow(
      "Barrio nope no encontrado",
    );
    await expect(service.deactivate("nope")).rejects.toThrow(
      "Barrio nope no encontrado",
    );
  });

  it("list: returns repo results", async () => {
    readRepo.list.mockResolvedValue([new Barrio(barrioProps)]);
    const result = await service.list({ onlyActive: true });
    expect(readRepo.list).toHaveBeenCalledWith({ onlyActive: true });
    expect(result).toHaveLength(1);
  });

  it("listPublic: filters activo=true from repo onlyActive list", async () => {
    readRepo.list.mockResolvedValue([new Barrio(barrioProps)]);
    const result = await service.listPublic();
    expect(readRepo.list).toHaveBeenCalledWith({ onlyActive: true });
    expect(result).toHaveLength(1);
  });
});
