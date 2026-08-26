/**
 * Firestore adapter for `AuthContextRepository`.
 *
 * Returns the `Rol` stored on `usuarios/{uid}` or `undefined` when the
 * document is missing / has no valid `rol` field. The `AuthService`
 * (Task 7) maps a missing provisioning into the canonical
 * `ForbiddenException` (`user has not been provisioned in the
 * usuarios collection`) at the application layer — the adapter is the
 * persistence boundary and stays free of HTTP/Nest exception types.
 *
 * DIP — this class is the concrete implementation of the
 * `AuthContextRepository` interface declared in `domain/`. It is bound
 * via the `AUTH_CONTEXT_REPOSITORY` token at module wiring time
 * (`AuthModule`), so the application layer (`AuthService`) depends on
 * the abstract interface and is decoupled from Firestore.
 *
 * SRP — this adapter does ONLY the read. Cross-doc validation
 * (`AuthContext` assembly, custom-claim precedence, 403 mapping) lives
 * in `AuthService` (Task 7), NOT here.
 *
 * Error propagation contract: Firestore call failures bubble up to the
 * caller. The adapter MUST NOT swallow them and return a falsy
 * `undefined` — that would mask a real Firestore outage as
 * "user not provisioned", defeating the fallback semantics of
 * `AuthService.buildContext` (which would then try to fail closed / 403
 * for a transient infra reason). See `usuarios-rol-lookup.adapter.spec.ts`
 * "Firestore error" describe block for the codified contract.
 *
 * Pure SRP: this adapter does ONLY persistence. Validation, business rules,
 * conflict detection and the `ForbiddenException` mapping all live in the
 * `AuthService` (Task 7).
 */
import { Injectable, Logger } from "@nestjs/common";
import { FirebaseService } from "@/common/services/firebase.service";
import type { AuthContextRepository } from "../domain/auth-context-repository.interface";
import { ROL_VALUES, type Rol } from "../domain/rol.enum";

const COLLECTION = "usuarios";

/** Closed-set membership check — `ROL_VALUES.includes(value)`. */
function isRol(value: unknown): value is Rol {
  return (
    typeof value === "string" &&
    (ROL_VALUES as readonly string[]).includes(value)
  );
}

@Injectable()
export class UsuariosRolLookupAdapter implements AuthContextRepository {
  private readonly logger = new Logger(UsuariosRolLookupAdapter.name);

  constructor(private readonly firebase: FirebaseService) {}

  async getRolByUid(uid: string): Promise<Rol | undefined> {
    // NOTE: any Firestore error intentionally propagates (see file header).
    const doc = await this.firebase.getDocument(COLLECTION, uid);
    if (!doc.exists) return undefined;

    const data = doc.data() as { rol?: unknown } | undefined;
    const stored = data?.rol;
    if (!isRol(stored)) {
      // Defensive: a corrupt/legacy doc with an unknown 'rol' value is
      // treated as "not provisioned" — AuthService emits the canonical 403.
      this.logger.warn(
        `Usuario ${doc.id} has a rol value outside ROL_VALUES (${JSON.stringify(
          stored,
        )}); returning undefined`,
      );
      return undefined;
    }
    return stored;
  }

  async createUsuario(data: {
    uid: string;
    email: string;
    nombre: string;
    rol: Rol;
  }): Promise<void> {
    await this.firebase.createDocument(
      COLLECTION,
      {
        uid: data.uid,
        email: data.email,
        nombre: data.nombre,
        rol: data.rol,
      },
      data.uid,
    );
  }
}
