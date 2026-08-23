/**
 * Audit script — validates that every `categoriaId`, `subcategoriaId` and
 * `barrioId` referenced by `places` and `eventos` documents resolves to an
 * existing catalog entry (`categorias` / `barrios`).
 *
 * Use before enabling `CATALOG_VALIDATION_ENABLED=true` in staging/prod: the
 * feature flag rejects new/edited docs with dangling references, so this
 * script surfaces the orphans that already exist in the database.
 *
 * Output: JSON `{ validos: number, huerfanos: [{coleccion, docId, campo, valor}] }`.
 * Exit code: `0` when no orphans, `1` when orphans exist.
 *
 * Usage:
 *   npm run audit-refs
 */
import { CategoriaFirestoreAdapter } from "../src/modules/categorias/infrastructure/categoria-firestore.adapter";
import { BarrioFirestoreAdapter } from "../src/modules/barrios/infrastructure/barrio-firestore.adapter";
import { bootstrapFirebase } from "./lib/bootstrap-firebase";

interface Orphan {
  coleccion: string;
  docId: string;
  campo: string;
  valor: string;
}

interface ReferencedDoc {
  docId: string;
  categoriaId?: string;
  subcategoriaId?: string;
  barrioId?: string;
}

async function collectCatalogRefs(
  firebase: Awaited<ReturnType<typeof bootstrapFirebase>>,
): Promise<{
  categorias: Map<string, Set<string>>;
  barrios: Set<string>;
}> {
  const categoriaAdapter = new CategoriaFirestoreAdapter(firebase);
  const barrioAdapter = new BarrioFirestoreAdapter(firebase);

  const categorias = new Map<string, Set<string>>();
  for (const cat of await categoriaAdapter.list()) {
    // Map slug -> set of subcategoria slugs. Empty set = categoria sin subs.
    categorias.set(cat.slug, new Set(cat.subcategorias.map((s) => s.slug)));
  }

  const barrios = new Set<string>();
  for (const barrio of await barrioAdapter.list()) {
    barrios.add(barrio.slug);
  }

  return { categorias, barrios };
}

async function collectDocs(
  firebase: Awaited<ReturnType<typeof bootstrapFirebase>>,
  collection: "places" | "eventos",
): Promise<ReferencedDoc[]> {
  const snapshot = await firebase.getDocuments(collection);
  return snapshot.docs.map((doc) => {
    const data = doc.data() as ReferencedDoc;
    return {
      docId: doc.id,
      categoriaId: data.categoriaId,
      subcategoriaId: data.subcategoriaId,
      barrioId: data.barrioId,
    };
  });
}

function auditDoc(
  doc: ReferencedDoc,
  collection: "places" | "eventos",
  categorias: Map<string, Set<string>>,
  barrios: Set<string>,
): Orphan[] {
  const orphans: Orphan[] = [];

  if (doc.categoriaId && !categorias.has(doc.categoriaId)) {
    orphans.push({
      coleccion: collection,
      docId: doc.docId,
      campo: "categoriaId",
      valor: doc.categoriaId,
    });
  }

  if (doc.subcategoriaId) {
    const subs = doc.categoriaId ? categorias.get(doc.categoriaId) : undefined;
    if (!subs || !subs.has(doc.subcategoriaId)) {
      orphans.push({
        coleccion: collection,
        docId: doc.docId,
        campo: "subcategoriaId",
        valor: doc.subcategoriaId,
      });
    }
  }

  if (doc.barrioId && !barrios.has(doc.barrioId)) {
    orphans.push({
      coleccion: collection,
      docId: doc.docId,
      campo: "barrioId",
      valor: doc.barrioId,
    });
  }

  return orphans;
}

async function main(): Promise<void> {
  const firebase = await bootstrapFirebase();
  const { categorias, barrios } = await collectCatalogRefs(firebase);

  const orphans: Orphan[] = [];
  let validos = 0;

  for (const collection of ["places", "eventos"] as const) {
    const docs = await collectDocs(firebase, collection);
    for (const doc of docs) {
      const docOrphans = auditDoc(doc, collection, categorias, barrios);
      if (docOrphans.length === 0) {
        validos++;
      } else {
        orphans.push(...docOrphans);
      }
    }
  }

  // Deterministic ordering for reproducible CI output.
  orphans.sort((a, b) =>
    `${a.coleccion}/${a.docId}/${a.campo}`.localeCompare(
      `${b.coleccion}/${b.docId}/${b.campo}`,
    ),
  );

  console.log(JSON.stringify({ validos, huerfanos: orphans }, null, 2));

  if (orphans.length > 0) {
    console.error(
      `❌ Audit failed: ${orphans.length} orphan reference(s) found. Fix catalog data before enabling CATALOG_VALIDATION_ENABLED.`,
    );
    process.exit(1);
  }

  console.log("✅ Audit OK: all references resolve to the catalog.");
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Audit script failed:", error);
  process.exit(1);
});
