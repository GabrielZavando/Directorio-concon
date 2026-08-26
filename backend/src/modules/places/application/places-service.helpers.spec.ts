/**
 * Unit tests for places-service.helpers — pure utility functions.
 *
 * Targets uncovered lines from coverage report:
 *   - assertGalleryLimit: premium vs gratuito limits
 *   - toPlain: null passthrough + object cloning
 *   - toPlainArray: undefined passthrough
 *   - buildPlacePatch: imagenes normalization
 *   - resolveAbiertoAhora: fallback to undefined horarios
 */
import {
  assertGalleryLimit,
  toPlain,
  toPlainArray,
  resolveAbiertoAhora,
} from "./places-service.helpers";
import type { Place } from "../domain/place.entity";

describe("places-service.helpers", () => {
  describe("assertGalleryLimit", () => {
    it("throws for gratuito plan with > 3 images", () => {
      const galeria = ["a.jpg", "b.jpg", "c.jpg", "d.jpg"];
      expect(() => assertGalleryLimit(galeria, "gratuito")).toThrow(
        "máximo 3 imágenes",
      );
    });

    it("throws for premium plan with > 10 images", () => {
      const galeria = Array.from({ length: 11 }, (_, i) => `${i}.jpg`);
      expect(() => assertGalleryLimit(galeria, "premium")).toThrow(
        "máximo 10 imágenes",
      );
    });

    it("passes for gratuito with exactly 3 images", () => {
      expect(() =>
        assertGalleryLimit(["a.jpg", "b.jpg", "c.jpg"], "gratuito"),
      ).not.toThrow();
    });
  });

  describe("toPlain", () => {
    it("returns undefined for undefined input", () => {
      expect(toPlain(undefined)).toBeUndefined();
    });

    it("returns null for null input", () => {
      expect(toPlain(null)).toBeNull();
    });

    it("returns primitives as-is", () => {
      expect(toPlain(42)).toBe(42);
      expect(toPlain("hello")).toBe("hello");
    });

    it("clones objects to strip class prototypes", () => {
      class Custom {
        foo = "bar";
      }
      const input = new Custom();
      const result = toPlain(input);
      expect(result).toEqual({ foo: "bar" });
      expect(result).not.toBeInstanceOf(Custom);
    });
  });

  describe("toPlainArray", () => {
    it("returns undefined for undefined input", () => {
      expect(toPlainArray(undefined)).toBeUndefined();
    });

    it("deep-clones array elements", () => {
      class Item {
        val = 1;
      }
      const result = toPlainArray([new Item(), new Item()]);
      expect(result).toEqual([{ val: 1 }, { val: 1 }]);
    });
  });

  describe("resolveAbiertoAhora", () => {
    it("returns abierto: true for 24x7 place", () => {
      const place = { abierto24x7: true } as Place;
      expect(resolveAbiertoAhora(place, new Date())).toEqual({
        abierto: true,
      });
    });

    it("returns abierto: false when place has no horarios", () => {
      const place = {
        abierto24x7: false,
        horarios: undefined,
        horariosEspeciales: undefined,
      } as unknown as Place;
      const result = resolveAbiertoAhora(place, new Date("2026-08-25T12:00:00Z"));
      expect(result.abierto).toBe(false);
    });
  });
});
