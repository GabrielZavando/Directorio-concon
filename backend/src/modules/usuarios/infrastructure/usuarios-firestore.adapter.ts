/**
 * Firestore adapter for UsuarioRepositoryInterface.
 *
 * Converts between domain types (`Usuario` with `Date`) and Firestore types
 * (Timestamp + string fields). Implements the repository interface declared
 * in `domain/usuario-repository.interface.ts`. DIP: the application layer
 * (`UsuariosService`) depends on the interface; the adapter lives in
 * `infrastructure/` and is bound via `USUARIOS_REPOSITORY` at module
 * wiring time.
 *
 * Field-mapping (PERSISTENCE boundary):
 *
 * - `id` (PK) = Firebase Auth UID. Stored as the document id in Firestore,
 *   NOT duplicated as a field in the document body.
 * - `email` is logically UNIQUE. Uniqueness is enforced at the application
 *   layer (`UsuariosService.create` calls `findByEmail` before `create`),
 *   NOT at the persistence layer — Firestore single-field queries are
 *   automatic; the index lives in `firestore.indexes.json` (Task 1.5).
 * - `createdAt` / `updatedAt` are stamped by the adapter on every write
 *   (the caller never supplies them).
 *
 * Pure SRP: this adapter does ONLY persistence. Validation, business rules,
 * conflict detection and the `ConflictException` mapping all live in the
 * `UsuariosService`.
 */
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { FirebaseService } from "@/common/services/firebase.service";
import type {
  UsuarioRepositoryInterface,
  UsuarioSearchFilters,
  PaginatedUsuarios,
} from "../domain/usuario-repository.interface";
import type { Usuario } from "../domain/usuario.entity";

const COLLECTION = "usuarios";

// ---------------------------------------------------------------------------
// Firestore document shape (timestamps are Firestore Timestamps at rest)
// ---------------------------------------------------------------------------
export interface UsuarioFirestoreDoc {
  email: string;
  nombre: string;
  rol: Usuario["rol"];
  placeId?: string | null;
  telefono?: string | null;
  createdAt: unknown;
  updatedAt: unknown;
}

@Injectable()
export class UsuariosFirestoreAdapter implements UsuarioRepositoryInterface {
  private readonly logger = new Logger(UsuariosFirestoreAdapter.name);

  constructor(private readonly firebase: FirebaseService) {}

  // -------------------------------------------------------------------------
  // Read methods
  // -------------------------------------------------------------------------

  async findById(uid: string): Promise<Usuario | null> {
    const doc = await this.firebase.getDocument(COLLECTION, uid);
    if (!doc.exists) return null;
    return this.toDomain(doc.id, doc.data() as UsuarioFirestoreDoc);
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    const snapshot = await this.firebase.getDocuments(
      COLLECTION,
      [{ field: "email", operator: "==", value: email }],
      undefined,
      1,
    );
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return this.toDomain(doc.id, doc.data() as UsuarioFirestoreDoc);
  }

  async findAll(filters: UsuarioSearchFilters): Promise<PaginatedUsuarios> {
    const { rol, page = 1, limit = 20 } = filters;

    let query = this.firebase.getFirestore().collection(COLLECTION);

    if (rol) {
      query = query.where("rol", "==", rol) as typeof query;
    }

    query = query.orderBy("rol", "asc") as typeof query;
    query = query.limit(limit + 1) as typeof query;

    const snapshot = await query.get();
    const hasNextPage = snapshot.docs.length > limit;
    const docs = snapshot.docs.slice(0, limit);

    const data = docs.map((doc) =>
      this.toDomain(doc.id, doc.data() as UsuarioFirestoreDoc),
    );

    return {
      data,
      nextCursor: hasNextPage ? String(page + 1) : undefined,
      total: data.length,
    };
  }

  // -------------------------------------------------------------------------
  // Write methods
  // -------------------------------------------------------------------------

  async create(
    usuario: Omit<Usuario, "createdAt" | "updatedAt">,
  ): Promise<Usuario> {
    const data: Record<string, unknown> = {
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      ...(usuario.placeId !== undefined ? { placeId: usuario.placeId } : {}),
      ...(usuario.telefono !== undefined ? { telefono: usuario.telefono } : {}),
    };

    // `createDocument` echoes back the generated id; when `usuario.id` is
    // provided the doc already exists at that id, so the result is unused.
    await this.firebase.createDocument(COLLECTION, data, usuario.id);

    const now = this.firebase.getCurrentTimestamp();
    return {
      ...usuario,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    };
  }

  async updatePerfil(
    uid: string,
    patch: Pick<Usuario, "nombre" | "telefono">,
  ): Promise<Usuario> {
    await this.ensureExists(uid);
    await this.firebase.updateDocument(COLLECTION, uid, {
      nombre: patch.nombre,
      telefono: patch.telefono,
    });
    return this.refetch(uid);
  }

  async updateRol(uid: string, rol: Usuario["rol"]): Promise<Usuario> {
    await this.ensureExists(uid);
    await this.firebase.updateDocument(COLLECTION, uid, { rol });
    return this.refetch(uid);
  }

  async linkPlaceId(uid: string, placeId: string | null): Promise<Usuario> {
    await this.ensureExists(uid);
    await this.firebase.updateDocument(COLLECTION, uid, { placeId });
    return this.refetch(uid);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** Throws `NotFoundException` when the document is missing. */
  private async ensureExists(uid: string): Promise<void> {
    const doc = await this.firebase.getDocument(COLLECTION, uid);
    if (!doc.exists) {
      throw new NotFoundException(`Usuario ${uid} not found`);
    }
  }

  /**
   * Re-fetches the document after a write and returns the mapped domain
   * entity. Throws `NotFoundException` if the document is missing after the
   * write (race; the write succeeded but a subsequent read was immediately
   * after — Firestore eventual consistency).
   *
   * `createdAt` / `updatedAt` are stamped by `FirebaseService.createDocument`
   * / `FirebaseService.updateDocument` — the adapter does NOT stamp them
   * itself to avoid timestamp duplication.
   */
  private async refetch(uid: string): Promise<Usuario> {
    const doc = await this.firebase.getDocument(COLLECTION, uid);
    if (!doc.exists) {
      throw new NotFoundException(`Usuario ${uid} not found after update`);
    }
    return this.toDomain(doc.id, doc.data() as UsuarioFirestoreDoc);
  }

  private toDomain(id: string, doc: UsuarioFirestoreDoc): Usuario {
    return {
      id,
      email: doc.email,
      nombre: doc.nombre,
      rol: doc.rol,
      placeId: doc.placeId ?? null,
      telefono: doc.telefono ?? null,
      createdAt: this.firebase.timestampToDate(
        doc.createdAt as Parameters<FirebaseService["timestampToDate"]>[0],
      ) as Date,
      updatedAt: this.firebase.timestampToDate(
        doc.updatedAt as Parameters<FirebaseService["timestampToDate"]>[0],
      ) as Date,
    };
  }
}
