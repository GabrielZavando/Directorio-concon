/**
 * Injection token for the Evento repository.
 * Used by EventosService to depend on the abstraction, not a concrete impl.
 *
 * Binds to the combined read+write interface.
 */
export const EVENTO_REPOSITORY = "EventoRepositoryInterface";

/** Injection token for the read-only repository (ISP segregation). */
export const EVENTO_READ_REPOSITORY = "EventoReadRepositoryInterface";

/** Injection token for the write-only repository (ISP segregation). */
export const EVENTO_WRITE_REPOSITORY = "EventoWriteRepositoryInterface";
