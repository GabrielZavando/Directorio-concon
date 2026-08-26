/**
 * Unit tests for UsuariosService.
 *
 * Uses NestJS `Test.createTestingModule` with a mocked
 * `UsuarioRepositoryInterface` (LSP). Verifies business rules:
 *
 * - `getMe`/`findById`/`findAll`: pass-throughs + `NotFoundException` on
 *   self-missing.
 * - `updatePerfil`: refuses `rol` (the DTO contract forbids it; the service
 *   layer is the last-mile defense).
 * - `updateRol`: validates the closed `Rol` enum.
 *
 * Note (change `auth-usuarios-v2`, CH-02): the `create` (admin provisioning)
 * method, the `placeId`↔rol invariant, and the `linkPlaceId` cascade were
 * removed. Provisioning now happens via `POST /auth/registro` (self-
 * registration) and the user→place relation lives only in `places.usuarioId`.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ROL_VALUES, type Rol } from "../../auth/domain/rol.enum";
import { USUARIOS_REPOSITORY } from "../domain/usuario-repository.token";
import type {
  UsuarioRepositoryInterface,
  PaginatedUsuarios,
} from "../domain/usuario-repository.interface";
import type { Usuario } from "../domain/usuario.entity";
import { UsuariosService } from "./usuarios.service";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockRepo: jest.Mocked<UsuarioRepositoryInterface> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  updatePerfil: jest.fn(),
  updateRol: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeUsuario(overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: "uid-owner-001",
    email: "owner@example.com",
    nombre: "Owner One",
    rol: "owner",
    telefono: "+56912345678",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makePaginated(
  overrides: Partial<PaginatedUsuarios> = {},
): PaginatedUsuarios {
  return { data: [], total: 0, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("UsuariosService", () => {
  let service: UsuariosService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: USUARIOS_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(UsuariosService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // getMe / findById / findAll
  // =========================================================================
  describe("getMe", () => {
    it("returns the caller's own usuario", async () => {
      mockRepo.findById.mockResolvedValue(makeUsuario());

      const result = await service.getMe("uid-owner-001");

      expect(result.id).toBe("uid-owner-001");
      expect(mockRepo.findById).toHaveBeenCalledWith("uid-owner-001");
    });

    it("throws NotFoundException when the caller has no usuarios document", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getMe("uid-orphan")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findById", () => {
    it("returns the usuario when found", async () => {
      mockRepo.findById.mockResolvedValue(makeUsuario({ id: "uid-x" }));

      const result = await service.findById("uid-x");
      expect(result.id).toBe("uid-x");
    });

    it("throws NotFoundException when missing", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findById("uid-missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("passes the filter through to the repository", async () => {
      const expected = makePaginated({
        data: [makeUsuario()],
        total: 1,
      });
      mockRepo.findAll.mockResolvedValue(expected);

      const result = await service.findAll({
        rol: "owner",
        page: 1,
        limit: 20,
      });

      expect(mockRepo.findAll).toHaveBeenCalledWith({
        rol: "owner",
        page: 1,
        limit: 20,
      });
      expect(result).toBe(expected);
    });
  });

  // =========================================================================
  // updatePerfil
  // =========================================================================
  describe("updatePerfil", () => {
    it("accepts nombre + telefono only (refuses rol)", async () => {
      mockRepo.findById.mockResolvedValue(makeUsuario());
      mockRepo.updatePerfil.mockResolvedValue(makeUsuario());

      await service.updatePerfil("uid-owner-001", {
        nombre: "New Name",
        telefono: "+56900000000",
      });

      expect(mockRepo.updatePerfil).toHaveBeenCalledWith("uid-owner-001", {
        nombre: "New Name",
        telefono: "+56900000000",
      });
      // Defense-in-depth: the service refuses `rol` even if the controller
      // somehow leaks it past forbidNonWhitelisted.
      const callArg = mockRepo.updatePerfil.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(callArg).not.toHaveProperty("rol");
      expect(callArg).not.toHaveProperty("placeId");
    });

    it("strips unknown keys before passing to the repository", async () => {
      mockRepo.findById.mockResolvedValue(makeUsuario());
      mockRepo.updatePerfil.mockResolvedValue(makeUsuario());

      await service.updatePerfil("uid-owner-001", {
        // Cast through unknown — the service must strip this rogue field.
        nombre: "X",
        telefono: "+5691",
        rol: "admin",
      } as Parameters<UsuariosService["updatePerfil"]>[1]);

      const callArg = mockRepo.updatePerfil.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(callArg).not.toHaveProperty("rol");
    });

    it("throws when the user does not exist", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.updatePerfil("missing", { nombre: "X", telefono: "Y" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // updateRol
  // =========================================================================
  describe("updateRol", () => {
    it("validates the closed Rol enum (rejects 'superuser')", async () => {
      await expect(
        service.updateRol("uid-x", "superuser" as unknown as Rol),
      ).rejects.toThrow(/rol must be one of: admin, owner, member/);
      expect(mockRepo.updateRol).not.toHaveBeenCalled();
    });

    it("propagates every valid rol value", async () => {
      for (const rol of ROL_VALUES) {
        jest.clearAllMocks();
        mockRepo.findById.mockResolvedValue(makeUsuario({ rol }));
        mockRepo.updateRol.mockResolvedValue(makeUsuario({ rol }));

        await expect(service.updateRol("uid-x", rol)).resolves.toEqual(
          expect.objectContaining({ rol }),
        );
      }
    });

    it("throws NotFoundException when the user does not exist", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.updateRol("missing", "admin")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
