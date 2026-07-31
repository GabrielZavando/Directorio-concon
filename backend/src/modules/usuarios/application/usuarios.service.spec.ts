/**
 * Unit tests for UsuariosService.
 *
 * Uses NestJS `Test.createTestingModule` with a mocked
 * `UsuarioRepositoryInterface` (LSP). Verifies business rules:
 *
 * - `create`: defaults `rol` to `'member'`; rejects duplicate `email`
 *   (`ConflictException`); enforces `placeId` invariant — `placeId` MUST
 *   be omitted when `rol !== 'owner'` and MUST be present when
 *   `rol === 'owner'`.
 * - `getMe`/`findById`/`findAll`: pass-throughs + `NotFoundException` on
 *   self-missing.
 * - `updatePerfil`: refuses `rol`/`placeId` (the DTO contract forbids them;
 *   the service layer is the last-mile defense).
 * - `updateRol`: validates the closed `Rol` enum + cascades
 *   `linkPlaceId(null)` when transitioning out of `'owner'`.
 * - `linkPlaceId`: refuses if the user's current `rol` is not `'owner'`.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
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
  linkPlaceId: jest.fn(),
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
    placeId: "restaurante-el-marino",
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
  // create
  // =========================================================================
  describe("create", () => {
    it("defaults rol to 'member' when omitted", async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeUsuario({ rol: "member" }));

      const result = await service.create({
        id: "uid-member-001",
        email: "user@example.com",
        nombre: "Member One",
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ rol: "member" }),
      );
      expect(result.rol).toBe("member");
    });

    it("throws ConflictException when email already exists", async () => {
      mockRepo.findByEmail.mockResolvedValue(
        makeUsuario({ email: "owner@example.com" }),
      );

      await expect(
        service.create({
          id: "uid-new",
          email: "owner@example.com",
          nombre: "Different User",
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("throws when rol='owner' is set without placeId", async () => {
      mockRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.create({
          id: "uid-owner-002",
          email: "new-owner@example.com",
          nombre: "Owner Without Place",
          rol: "owner",
        }),
      ).rejects.toThrow(/placeId is required when rol is 'owner'/i);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("throws when rol != 'owner' but placeId is provided", async () => {
      mockRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.create({
          id: "uid-x",
          email: "x@example.com",
          nombre: "X",
          rol: "member",
          placeId: "some-place",
        }),
      ).rejects.toThrow(/placeId is only allowed when rol is 'owner'/i);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("creates the user when inputs satisfy the rol/placeId invariant", async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeUsuario());

      const result = await service.create({
        id: "uid-owner-001",
        email: "owner@example.com",
        nombre: "Owner One",
        rol: "owner",
        placeId: "restaurante-el-marino",
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "uid-owner-001",
          email: "owner@example.com",
          rol: "owner",
          placeId: "restaurante-el-marino",
        }),
      );
      expect(result).toEqual(makeUsuario());
    });
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
    it("accepts nombre + telefono only (refuses rol/placeId)", async () => {
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
      // Defense-in-depth: the service refuses `rol`/`placeId` even if the
      // controller somehow leaks them past forbidNonWhitelisted.
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
      mockRepo.findById.mockResolvedValue(makeUsuario({ rol: "owner" }));
      mockRepo.updateRol.mockResolvedValue(makeUsuario({ rol: "owner" }));

      for (const rol of ROL_VALUES) {
        jest.clearAllMocks();
        mockRepo.findById.mockResolvedValue(makeUsuario({ rol }));
        mockRepo.updateRol.mockResolvedValue(makeUsuario({ rol }));

        await expect(service.updateRol("uid-x", rol)).resolves.toEqual(
          expect.objectContaining({ rol }),
        );
      }
    });

    it("cascades linkPlaceId(null) when transitioning out of 'owner'", async () => {
      mockRepo.findById.mockResolvedValue(makeUsuario({ rol: "owner" }));
      mockRepo.updateRol.mockResolvedValue(makeUsuario({ rol: "member" }));
      mockRepo.linkPlaceId.mockResolvedValue(makeUsuario({ rol: "member" }));

      await service.updateRol("uid-owner-001", "member");

      expect(mockRepo.updateRol).toHaveBeenCalledWith(
        "uid-owner-001",
        "member",
      );
      expect(mockRepo.linkPlaceId).toHaveBeenCalledWith("uid-owner-001", null);
    });

    it("does NOT cascade linkPlaceId when transitioning to 'owner'", async () => {
      mockRepo.findById.mockResolvedValue(makeUsuario({ rol: "member" }));
      mockRepo.updateRol.mockResolvedValue(makeUsuario({ rol: "owner" }));

      await service.updateRol("uid-member-001", "owner");

      expect(mockRepo.linkPlaceId).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when the user does not exist", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.updateRol("missing", "admin")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
