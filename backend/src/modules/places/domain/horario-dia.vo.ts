/**
 * Value objects for schedule management.
 *
 * - `Turno`: a single opening window (e.g. 12:00–16:00)
 * - `HorarioDia`: schedule for one day of the week
 * - `HorarioEspecial`: override schedule for a specific date
 * - `DiaSemana`: Spanish day names
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DiaSemana =
  | "lunes"
  | "martes"
  | "miercoles"
  | "jueves"
  | "viernes"
  | "sabado"
  | "domingo";

export interface Turno {
  /** Opening time 'HH:mm' — apertura < cierre */
  apertura: string;
  /** Closing time 'HH:mm' */
  cierre: string;
}

export interface HorarioDia {
  dia: DiaSemana;
  abierto: boolean;
  turnos: Turno[];
}

export interface HorarioEspecial {
  /** Date 'YYYY-MM-DD' */
  fecha: string;
  /** Human-readable description, e.g. "Noche de Año Nuevo" */
  descripcion: string;
  /** Empty array means closed that day */
  turnos: Turno[];
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Validates that a single Turno has valid format and apertura < cierre.
 */
export function isValidTurno(turno: unknown): turno is Turno {
  if (typeof turno !== "object" || turno === null) return false;
  const t = turno as Record<string, unknown>;
  if (typeof t.apertura !== "string" || typeof t.cierre !== "string")
    return false;
  if (!isValidTime(t.apertura) || !isValidTime(t.cierre)) return false;
  return timeToMinutes(t.apertura) < timeToMinutes(t.cierre);
}

/**
 * Validates that turnos do not overlap and are within 0..3.
 * Turnos must be sorted by apertura (caller should sort before validating).
 */
export function isValidTurnos(turnos: unknown): turnos is Turno[] {
  if (!Array.isArray(turnos)) return false;
  if (turnos.length > 3) return false;
  return turnos.every(isValidTurno);
}

/**
 * Validates that overlapping turnos don't exist.
 * Assumes turnos are already sorted by apertura.
 */
export function hasNoOverlap(turnos: Turno[]): boolean {
  for (let i = 1; i < turnos.length; i++) {
    const prevEnd = timeToMinutes(turnos[i - 1].cierre);
    const currStart = timeToMinutes(turnos[i].apertura);
    if (prevEnd > currStart) return false;
  }
  return true;
}

/**
 * Validates a HorarioDia object.
 * - If abierto is false, turnos must be empty.
 * - If abierto is true, turnos must be 1..3 non-overlapping.
 */
export function isValidHorarioDia(value: unknown): value is HorarioDia {
  if (typeof value !== "object" || value === null) return false;
  const h = value as Record<string, unknown>;
  if (typeof h.dia !== "string") return false;
  if (typeof h.abierto !== "boolean") return false;
  if (!Array.isArray(h.turnos)) return false;

  if (!h.abierto) {
    return h.turnos.length === 0;
  }
  // abierto === true
  if (h.turnos.length === 0 || h.turnos.length > 3) return false;
  if (!h.turnos.every(isValidTurno)) return false;
  const sorted = [...h.turnos].sort(
    (a, b) => timeToMinutes(a.apertura) - timeToMinutes(b.apertura),
  );
  return hasNoOverlap(sorted);
}

/**
 * Validates a HorarioEspecial object.
 */
export function isValidHorarioEspecial(
  value: unknown,
): value is HorarioEspecial {
  if (typeof value !== "object" || value === null) return false;
  const h = value as Record<string, unknown>;
  if (typeof h.fecha !== "string" || typeof h.descripcion !== "string")
    return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(h.fecha)) return false;
  if (!Array.isArray(h.turnos)) return false;
  return h.turnos.every(isValidTurno);
}
