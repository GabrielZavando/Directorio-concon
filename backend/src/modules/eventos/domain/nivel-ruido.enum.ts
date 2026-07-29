/**
 * Noise level classification for an event.
 *
 * - `bajo`:  low noise (e.g., workshop, conference)
 * - `medio`: moderate noise (e.g., market, fair)
 * - `alto`:  high noise (e.g., concert, sports event)
 */
export const NIVEL_RUIDO_VALUES = ["bajo", "medio", "alto"] as const;

export type NivelRuido = (typeof NIVEL_RUIDO_VALUES)[number];
