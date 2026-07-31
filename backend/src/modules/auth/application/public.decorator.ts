/**
 * `@Public()` decorator — marks an endpoint as exempt from the global
 * `JwtAuthGuard`. Currently a no-op (no global guard is registered), kept
 * for forward-compatibility (a future change may register `JwtAuthGuard`
 * globally, and per-route `@Public()` will skip the guard).
 *
 * This is the FINAL implementation.
 */
import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
