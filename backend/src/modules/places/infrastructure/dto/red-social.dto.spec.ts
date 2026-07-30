/**
 * Validation tests for `RedSocialDto` (the nested DTO inside
 * `CreatePlaceDto.redesSociales[].plataforma`).
 *
 * Moved from `create-place.dto.spec.ts` in the `roles-rename` change
 * audit (adversarial review) so that the enum-closure tests sit
 * co-located with the DTO they validate (`red-social.dto.ts`), and
 * the parent spec stays within the backend `max-lines 300` SOLID
 * threshold.
 *
 * The `plataforma` field is now a closed enum
 * (`PlataformaSocialEnum` = `instagram | facebook | x-twitter |
 * linkedin | tiktok | youtube`) — see
 * `backend/src/modules/places/domain/plataforma-social.enum.ts`.
 * The legacy `'twitter'` value was renamed to `'x-twitter'`
 * (platform's 2023 rebrand).
 */
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { RedSocialDto } from "./red-social.dto";

function makeValidDto(overrides: Record<string, unknown> = {}): RedSocialDto {
  // `overrides` is typed as `Record<string, unknown>` deliberately so tests
  // can pass invalid plataforma/url values (e.g. 'whatsapp', 'twitter', '')
  // without TypeScript blocking them at compile time — these are precisely
  // the values the validation layer must reject at runtime.
  return plainToInstance(RedSocialDto, {
    plataforma: "instagram",
    url: "https://example.com/test",
    ...overrides,
  });
}

describe("RedSocialDto validation", () => {
  const validPlatforms = [
    "instagram",
    "facebook",
    "x-twitter",
    "linkedin",
    "tiktok",
    "youtube",
  ];

  describe("accepts the 6 canonical PlataformaSocialEnum values", () => {
    validPlatforms.forEach((plataforma) => {
      it(`accepts '${plataforma}' as a valid plataforma`, async () => {
        const dto = makeValidDto({ plataforma });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe("rejects platforms outside the closed enum", () => {
    it("rejects 'whatsapp' (not in PlataformaSocialEnum)", async () => {
      const dto = makeValidDto({ plataforma: "whatsapp" });
      const errors = await validate(dto);
      expect(
        errors.some(
          (e) =>
            e.property === "plataforma" &&
            e.constraints?.isEnum?.includes("must be one of"),
        ),
      ).toBe(true);
    });

    it("rejects legacy 'twitter' value (renamed to 'x-twitter')", async () => {
      const dto = makeValidDto({ plataforma: "twitter" });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === "plataforma")).toBe(true);
    });

    it("rejects empty string plataforma (enum rejection, not just length)", async () => {
      const dto = makeValidDto({ plataforma: "" });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === "plataforma")).toBe(true);
    });
  });

  describe("URL validation", () => {
    it("accepts a valid https URL", async () => {
      const dto = makeValidDto({ url: "https://instagram.com/test" });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("rejects a non-URL string", async () => {
      const dto = makeValidDto({ url: "not-a-url" });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === "url")).toBe(true);
    });

    it("rejects an empty URL", async () => {
      const dto = makeValidDto({ url: "" });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === "url")).toBe(true);
    });
  });
});
