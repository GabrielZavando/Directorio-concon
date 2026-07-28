/**
 * Domain tests for value objects.
 * Validates pure validation logic (no framework deps).
 */
import { isValidCoordenadas, type Coordenadas } from "./coordenadas.vo";
import {
  isValidHorarioDia,
  isValidTurno,
  isValidTurnos,
  hasNoOverlap,
  isValidTime,
  timeToMinutes,
  type Turno,
  type HorarioDia,
} from "./horario-dia.vo";
import { isValidImagenes, GALERIA_LIMITS, type Imagenes } from "./imagenes.vo";
import { isValidRedSocial, isValidRedesSociales } from "./red-social.vo";
import { isValidValoracionGoogle } from "./valoracion-google.vo";

// ---------------------------------------------------------------------------
// Coordenadas
// ---------------------------------------------------------------------------
describe("Coordenadas VO", () => {
  it("accepts valid coordinates", () => {
    expect(isValidCoordenadas({ lat: -33.01, lng: -71.54 })).toBe(true);
    expect(isValidCoordenadas({ lat: 0, lng: 0 })).toBe(true);
    expect(isValidCoordenadas({ lat: -90, lng: -180 })).toBe(true);
    expect(isValidCoordenadas({ lat: 90, lng: 180 })).toBe(true);
  });

  it("rejects out-of-range latitude", () => {
    expect(isValidCoordenadas({ lat: -91, lng: 0 })).toBe(false);
    expect(isValidCoordenadas({ lat: 91, lng: 0 })).toBe(false);
  });

  it("rejects out-of-range longitude", () => {
    expect(isValidCoordenadas({ lat: 0, lng: -181 })).toBe(false);
    expect(isValidCoordenadas({ lat: 0, lng: 181 })).toBe(false);
  });

  it("rejects non-numeric values", () => {
    expect(isValidCoordenadas({ lat: "abc", lng: 0 })).toBe(false);
    expect(isValidCoordenadas({ lat: 0, lng: NaN })).toBe(false);
    expect(isValidCoordenadas({ lat: Infinity, lng: 0 })).toBe(false);
  });

  it("rejects null and non-objects", () => {
    expect(isValidCoordenadas(null)).toBe(false);
    expect(isValidCoordenadas("string")).toBe(false);
    expect(isValidCoordenadas(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// HorarioDia / Turno
// ---------------------------------------------------------------------------
describe("HorarioDia VO", () => {
  const validTurno: Turno = { apertura: "12:00", cierre: "16:00" };
  const validTurno2: Turno = { apertura: "19:00", cierre: "23:00" };

  describe("isValidTime", () => {
    it("accepts valid time strings", () => {
      expect(isValidTime("00:00")).toBe(true);
      expect(isValidTime("23:59")).toBe(true);
      expect(isValidTime("12:30")).toBe(true);
    });

    it("rejects invalid time strings", () => {
      expect(isValidTime("24:00")).toBe(false);
      expect(isValidTime("12:60")).toBe(false);
      expect(isValidTime("abc")).toBe(false);
      expect(isValidTime("12:00:00")).toBe(false);
    });
  });

  describe("timeToMinutes", () => {
    it("converts correctly", () => {
      expect(timeToMinutes("00:00")).toBe(0);
      expect(timeToMinutes("01:30")).toBe(90);
      expect(timeToMinutes("12:00")).toBe(720);
      expect(timeToMinutes("23:59")).toBe(1439);
    });
  });

  describe("isValidTurno", () => {
    it("accepts valid turnos (apertura < cierre)", () => {
      expect(isValidTurno(validTurno)).toBe(true);
    });

    it("rejects turnos where apertura >= cierre", () => {
      expect(isValidTurno({ apertura: "16:00", cierre: "12:00" })).toBe(false);
      expect(isValidTurno({ apertura: "12:00", cierre: "12:00" })).toBe(false);
    });

    it("rejects invalid time formats", () => {
      expect(isValidTurno({ apertura: "abc", cierre: "16:00" })).toBe(false);
      expect(isValidTurno({ apertura: "12:00", cierre: "25:00" })).toBe(false);
    });
  });

  describe("isValidTurnos", () => {
    it("accepts 0-3 turnos", () => {
      expect(isValidTurnos([])).toBe(true);
      expect(isValidTurnos([validTurno])).toBe(true);
      expect(isValidTurnos([validTurno, validTurno2])).toBe(true);
    });

    it("rejects more than 3 turnos", () => {
      expect(
        isValidTurnos([
          { apertura: "06:00", cierre: "09:00" },
          { apertura: "10:00", cierre: "13:00" },
          { apertura: "14:00", cierre: "17:00" },
          { apertura: "18:00", cierre: "21:00" },
        ]),
      ).toBe(false);
    });
  });

  describe("hasNoOverlap", () => {
    it("detects overlapping turnos", () => {
      expect(
        hasNoOverlap([
          { apertura: "12:00", cierre: "18:00" },
          { apertura: "16:00", cierre: "22:00" },
        ]),
      ).toBe(false);
    });

    it("accepts non-overlapping turnos", () => {
      expect(hasNoOverlap([validTurno, validTurno2])).toBe(true);
    });
  });

  describe("isValidHorarioDia", () => {
    const baseDay: HorarioDia = {
      dia: "lunes",
      abierto: true,
      turnos: [validTurno],
    };

    it("accepts valid open day with turnos", () => {
      expect(isValidHorarioDia(baseDay)).toBe(true);
    });

    it("accepts closed day with empty turnos", () => {
      expect(
        isValidHorarioDia({ dia: "domingo", abierto: false, turnos: [] }),
      ).toBe(true);
    });

    it("rejects closed day with turnos", () => {
      expect(
        isValidHorarioDia({
          dia: "domingo",
          abierto: false,
          turnos: [validTurno],
        }),
      ).toBe(false);
    });

    it("rejects open day with zero turnos", () => {
      expect(
        isValidHorarioDia({ dia: "lunes", abierto: true, turnos: [] }),
      ).toBe(false);
    });

    it("rejects non-objects", () => {
      expect(isValidHorarioDia(null)).toBe(false);
      expect(isValidHorarioDia("string")).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Imagenes
// ---------------------------------------------------------------------------
describe("Imagenes VO", () => {
  const validImagenes: Imagenes = {
    logo: "https://example.com/logo.png",
    galeria: [],
  };

  it("accepts valid imagenes with no galeria", () => {
    expect(isValidImagenes(validImagenes)).toBe(true);
  });

  it("accepts galeria within free plan limit (≤3)", () => {
    const img: Imagenes = {
      galeria: [
        "https://example.com/1.jpg",
        "https://example.com/2.jpg",
        "https://example.com/3.jpg",
      ],
    };
    expect(isValidImagenes(img, "gratuito")).toBe(true);
  });

  it("rejects galeria exceeding free plan limit (>3)", () => {
    const img: Imagenes = {
      galeria: Array.from(
        { length: 4 },
        (_, i) => `https://example.com/${i}.jpg`,
      ),
    };
    expect(isValidImagenes(img, "gratuito")).toBe(false);
  });

  it("accepts galeria within premium plan limit (≤10)", () => {
    const img: Imagenes = {
      galeria: Array.from(
        { length: 10 },
        (_, i) => `https://example.com/${i}.jpg`,
      ),
    };
    expect(isValidImagenes(img, "premium")).toBe(true);
  });

  it("rejects galeria exceeding premium plan limit (>10)", () => {
    const img: Imagenes = {
      galeria: Array.from(
        { length: 11 },
        (_, i) => `https://example.com/${i}.jpg`,
      ),
    };
    expect(isValidImagenes(img, "premium")).toBe(false);
  });

  it("rejects invalid URLs in galeria", () => {
    const img: Imagenes = { galeria: ["not-a-url"] };
    expect(isValidImagenes(img)).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isValidImagenes(null)).toBe(false);
    expect(isValidImagenes("string")).toBe(false);
  });

  it("exposes correct limit constants", () => {
    expect(GALERIA_LIMITS.gratuito).toBe(3);
    expect(GALERIA_LIMITS.premium).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// RedSocial
// ---------------------------------------------------------------------------
describe("RedSocial VO", () => {
  it("accepts valid red social", () => {
    expect(
      isValidRedSocial({
        plataforma: "instagram",
        url: "https://instagram.com/test",
      }),
    ).toBe(true);
  });

  it("rejects empty plataforma", () => {
    expect(
      isValidRedSocial({ plataforma: "", url: "https://instagram.com/test" }),
    ).toBe(false);
  });

  it("rejects invalid URL", () => {
    expect(
      isValidRedSocial({ plataforma: "instagram", url: "not-a-url" }),
    ).toBe(false);
  });

  describe("isValidRedesSociales", () => {
    it("accepts ≤3 items", () => {
      expect(
        isValidRedesSociales([
          { plataforma: "ig", url: "https://ig.com/a" },
          { plataforma: "fb", url: "https://fb.com/b" },
        ]),
      ).toBe(true);
    });

    it("rejects >3 items", () => {
      expect(
        isValidRedesSociales([
          { plataforma: "a", url: "https://a.com" },
          { plataforma: "b", url: "https://b.com" },
          { plataforma: "c", url: "https://c.com" },
          { plataforma: "d", url: "https://d.com" },
        ]),
      ).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// ValoracionGoogle
// ---------------------------------------------------------------------------
describe("ValoracionGoogle VO", () => {
  it("accepts valid rating", () => {
    expect(
      isValidValoracionGoogle({
        rating: 4.5,
        reviewsCount: 100,
        mapsLink: "https://maps.google.com/test",
      }),
    ).toBe(true);
  });

  it("rejects rating out of range", () => {
    expect(
      isValidValoracionGoogle({
        rating: -1,
        reviewsCount: 0,
        mapsLink: "https://maps.google.com/test",
      }),
    ).toBe(false);
    expect(
      isValidValoracionGoogle({
        rating: 5.1,
        reviewsCount: 0,
        mapsLink: "https://maps.google.com/test",
      }),
    ).toBe(false);
  });

  it("rejects negative reviewsCount", () => {
    expect(
      isValidValoracionGoogle({
        rating: 4,
        reviewsCount: -1,
        mapsLink: "https://maps.google.com/test",
      }),
    ).toBe(false);
  });
});
