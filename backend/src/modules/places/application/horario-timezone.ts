/**
 * Timezone helpers for "abierto ahora" derivation (America/Santiago).
 *
 * Extracted from PlacesService to keep the application service within the
 * SOLID `max-lines` threshold. Pure TS — no framework imports (DIP).
 */
import { timeToMinutes } from "../domain/horario-dia.vo";
import type { Turno } from "../domain/horario-dia.vo";

const SANTIAGO_TZ = "America/Santiago";

export interface SantiagoDateParts {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  hour: number;
  minute: number;
}

export function getSantiagoDateParts(date: Date): SantiagoDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: SANTIAGO_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    dayOfWeek: weekdayToNumber(get("weekday")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function weekdayToNumber(weekday: string): number {
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

const DIA_SEMANA_MAP: Record<number, string> = {
  0: "domingo",
  1: "lunes",
  2: "martes",
  3: "miercoles",
  4: "jueves",
  5: "viernes",
  6: "sabado",
};

export function getDiaSemana(dayOfWeek: number): string {
  return DIA_SEMANA_MAP[dayOfWeek] ?? "lunes";
}

export function findMatchingTurno(
  turnos: Turno[],
  currentTime: string,
): Turno | undefined {
  const currentMin = timeToMinutes(currentTime);
  return turnos.find((t) => {
    const start = timeToMinutes(t.apertura);
    const end = timeToMinutes(t.cierre);
    return currentMin >= start && currentMin < end;
  });
}
