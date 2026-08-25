/**
 * AuthService — application-layer orchestration of Firebase Auth +
 * the `Rol` resolver (custom claim → Firestore fallback).
 *
 * Pure SRP: this service only does:
 *  1. `verifyIdToken(token, checkRevoked = true)` via `FirebaseService`.
 *  2. resolve `Rol` per `design.md` Decision 2:
 *        (a) `decodedToken.rol` (custom claim) when present AND valid.
 *        (b) else `AuthContextRepository.getRolByUid(uid)`.
 *        (c) else `ForbiddenException("user has not been provisioned
 *            in the usuarios collection")` — the canonical 403 mapping
 *            for an orphan (Firebase Auth user without a `usuarios` doc).
 *  3. assemble an `AuthContext` and return it.
 *
 * The `placeId` field is mirrored from the custom claim when present
 * (owners self-identify via `setCustomUserClaims` post-backfill). For
 * non-owner roles it stays `undefined`; the only handler that needs an
 * owner's placeId reference today is the future `PlacesController`
 * owner-self endpoint (Tasks 11–12), which can re-query the `usuarios`
 * document via `UsuariosService` if needed. Extending
 * `AuthContextRepository` to return the full `Usuario` is a future
 * change concern — kept minimal here (ISP).
 *
 * DIP — depends on `FirebaseService` (concrete — it's an `@Global()`
 * NestJS adapter from `FirebaseModule`, opaque enough) + the abstract
 * `AuthContextRepository` interface bound via `AUTH_CONTEXT_REPOSITORY`.
 *
 * NOT exported by `AuthModule` to avoid leaking the verify pipeline —
 * only `JwtAuthGuard` consumes this service at runtime. Other modules
 * apply the guard via `@UseGuards` + read the resulting `AuthContext`
 * via `@CurrentUser()`.
 */
import { Inject, Injectable, Logger, ForbiddenException } from "@nestjs/common";
import type { DecodedIdToken } from "firebase-admin/auth";
import { FirebaseService } from "@/common/services/firebase.service";
import { AUTH_CONTEXT_REPOSITORY } from "../domain/auth-context-repository.token";
import type { AuthContextRepository } from "../domain/auth-context-repository.interface";
import type { AuthContext } from "../domain/auth-context.interface";
import { ROL_VALUES, type Rol } from "../domain/rol.enum";
import type { RegisterUserInput } from "./register-user.input";

/** Canonical 403 message for an unprovisioned Firebase Auth user. */
export const NOT_PROVISIONED_MESSAGE =
  "user has not been provisioned in the usuarios collection";

/** Closed-set membership check — `ROL_VALUES.includes(value)`. */
function isRol(value: unknown): value is Rol {
  return (
    typeof value === "string" &&
    (ROL_VALUES as readonly string[]).includes(value)
  );
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly firebase: FirebaseService,
    @Inject(AUTH_CONTEXT_REPOSITORY)
    private readonly authContextRepository: AuthContextRepository,
  ) {}

  /**
   * Verify the raw `idToken` and resolve an `AuthContext`.
   *
   * Throws:
   *  - any Firebase `verifyIdToken` rejection propagates (the guard maps
   *    it to `401 Unauthorized`).
   *  - `ForbiddenException` (403) when the user has no valid `Rol`
   *    resolved from EITHER the custom claim NOR Firestore.
   */
  async buildContext(idToken: string): Promise<AuthContext> {
    const decoded = await this.firebase.verifyIdToken(idToken, true);
    return this.assembleAuthContext(decoded);
  }

  /**
   * Register a new user with a selected role (member | owner).
   *
   * Creates a Firebase Auth user and the matching `usuarios/{uid}` Firestore
   * document atomically. If the Firestore write fails after the Auth user was
   * created, a compensating `deleteUser` rollback is performed.
   *
   * The `RegisterUserInput` limits `rol` to `"member" | "owner"` — the `admin`
   * rol is not accepted via the public API (the first admin is provisioned by
   * the `seed-admin` script). The HTTP layer's `RegisterDto` rejects `admin`
   * via class-validator whitelist validation before reaching this point.
   */
  async registerWithRole(
    input: RegisterUserInput,
  ): Promise<{ uid: string; email: string; rol: Rol; nombre: string }> {
    // 1. Create Firebase Auth user (input already validates rol ∈ {member, owner})
    const { uid } = await this.firebase.createUser(
      input.email,
      input.password,
      input.nombre,
    );

    // 2. Write the usuarios doc (compensating rollback if it fails)
    try {
      await this.authContextRepository.createUsuario({
        uid,
        email: input.email,
        nombre: input.nombre,
        rol: input.rol,
      });
    } catch (error) {
      // Compensating rollback: delete the Auth user created in step 1
      await this.firebase.deleteUser(uid);
      throw error; // re-throw original error (likely a Firestore error)
    }

    // 3. Return minimal auth result
    return { uid, email: input.email, rol: input.rol, nombre: input.nombre };
  }

  // -------------------------------------------------------------------------
  // Internal — kept separate so future spec cases can target the assembly
  // step without a full verifyIdToken round-trip (see `auth.service.spec.ts`
  // "Case 1", which proves the claim path WITHOUT a Firestore call).
  // -------------------------------------------------------------------------
  private async assembleAuthContext(
    decoded: DecodedIdToken,
  ): Promise<AuthContext> {
    const uid = decoded.uid;

    const claimRol = decoded.rol;
    let rol: Rol | undefined;
    if (isRol(claimRol)) {
      rol = claimRol;
    } else {
      this.logger.debug(
        `Custom claim 'rol' missing/invalid for uid='${uid}'; falling back to Firestore`,
      );
      rol = await this.authContextRepository.getRolByUid(uid);
    }

    if (!rol) {
      this.logger.warn(
        `Rejecting uid='${uid}' — no Rol resolvable (claim nor Firestore)`,
      );
      throw new ForbiddenException(NOT_PROVISIONED_MESSAGE);
    }

    // NOTE (change auth-usuarios-v2): `placeId` is no longer mirrored from
    // the custom claim — AuthContext carries only { uid, email, rol }.
    return {
      uid,
      email: decoded.email ?? "",
      rol,
    };
  }
}
