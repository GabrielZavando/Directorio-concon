/**
 * Injection token for the Solicitudes repository.
 * Used by PlacesService to depend on the abstraction, not a concrete impl.
 *
 * NestJS 11 InjectionToken is a type alias (string | symbol | Type | Abstract),
 * not a class — so we export a plain string token and use @Inject() in consumers.
 */
export const SOLICITUDES_REPOSITORY = "SolicitudesRepository";
