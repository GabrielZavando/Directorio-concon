/**
 * Tests for the reusable Rol domain enum.
 *
 * The Rol enum is referenced by the future `auth + usuarios` change's
 * RolesGuard and by any DTO that validates role-typed input. The enum
 * values follow the Family B naming (`admin / owner / member`) — see
 * docs/data-model.md §usuarios and openspec/changes/roles-rename.
 */
import { ROL_VALUES, type Rol } from "./rol.enum";

describe("Rol enum (domain)", () => {
  describe("ROL_VALUES constant", () => {
    it("exposes exactly the three canonical role values in order", () => {
      expect(ROL_VALUES).toEqual(["admin", "owner", "member"]);
    });

    it("is a readonly tuple (compile-time const)", () => {
      // `as const` makes the tuple literal, so each element is the literal type.
      // We assert length to keep the test resilient to refactors.
      expect(ROL_VALUES).toHaveLength(3);
      expect(Array.isArray(ROL_VALUES)).toBe(true);
    });

    it("includes 'admin' as the first value", () => {
      expect(ROL_VALUES[0]).toBe("admin");
    });

    it("includes 'member' as the last value (registration default per spec)", () => {
      expect(ROL_VALUES[ROL_VALUES.length - 1]).toBe("member");
    });
  });

  describe("Rol type (compile-time union)", () => {
    // Compile-time assertion: each canonical value must be assignable to Rol.
    // If the type union drifts, this block fails to compile.
    it("accepts 'admin' as Rol", () => {
      const value: Rol = "admin";
      expect(value).toBe("admin");
    });

    it("accepts 'owner' as Rol", () => {
      const value: Rol = "owner";
      expect(value).toBe("owner");
    });

    it("accepts 'member' as Rol", () => {
      const value: Rol = "member";
      expect(value).toBe("member");
    });

    // Negative compile-time check: 'empresa' was the legacy value and MUST
    // NOT compile against the new Rol type. The `@ts-expect-error` directive
    // below asserts that the rename is breaking-by-design at the type level.
    it("rejects the legacy value 'empresa' (compile-time alias removed)", () => {
      // @ts-expect-error 'empresa' is no longer a valid Rol after roles-rename
      const _value: Rol = "empresa";
      // The line above must fail to compile because 'empresa' is not in the
      // Rol union. If it ever compiles again, the rename regressed.
      void _value;
      expect(true).toBe(true);
    });

    it("rejects the legacy value 'usuario' (compile-time alias removed)", () => {
      // @ts-expect-error 'usuario' is no longer a valid Rol after roles-rename
      const _value: Rol = "usuario";
      void _value;
      expect(true).toBe(true);
    });
  });

  describe("ROL_VALUES is consumable by class-validator @IsEnum", () => {
    it("every string in the tuple is a valid Rol", () => {
      // @IsEnum accepts any readonly array; we verify each element is also a
      // valid domain value via the ROL_VALUES typing (Rol[]).
      ROL_VALUES.forEach((value) => {
        const _: Rol = value;
        expect(_).toBe(value);
      });
    });
  });
});
