/**
 * Test-only type re-export for the spec helper.
 *
 * The `UsuarioFirestoreDoc` interface is intentionally private to
 * `usuarios-firestore.adapter.ts` (it is a persistence-layer concern). This
 * file re-exports it as a `type` so the spec can type the document body
 * returned by mocked Firestore reads without leaking the interface to
 * production code.
 *
 * This file is test-only: it is NOT a `.spec.ts` but a `.spec-types.ts`
 * that is consumed ONLY by `.spec.ts` files. It is intentionally not
 * referenced from production code.
 */
import type { UsuarioFirestoreDoc } from "./usuarios-firestore.adapter";

export type { UsuarioFirestoreDoc };
