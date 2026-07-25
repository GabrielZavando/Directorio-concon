/**
 * Status of a business registration request.
 * 'pendiente' = awaiting admin review
 * 'aprobado'  = approved, publicly visible
 * 'rechazado' = rejected by admin
 */
export type EmpresaStatus = "pendiente" | "aprobado" | "rechazado";
