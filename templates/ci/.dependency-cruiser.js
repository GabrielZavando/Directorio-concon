// dependency-cruiser config — NestJS / Node backend
//
// AUTHORITATIVE MECHANICAL ENFORCEMENT OF DIP (Dependency Inversion Principle).
//
// This is the ONLY principle that lint static analysis enforces directly (not
// just signals). It implements the rule declared in:
//   docs/backend-standards.md § "Principios de Diseño — Backend (NestJS)" L55
//
// The rule states:
//   "ningún archivo dentro de `domain/` o `application/` puede importar un
//    paquete de infraestructura (TypeORM, Prisma, Mongoose, @nestjs/axios,
//    clientes HTTP, SDKs externos). Toda dependencia externa se declara como
//    interfaz en `domain/` y se inyecta desde `infrastructure/`."
//
// SOLID coverage in this file:
//   DIP  — `no-infra-from-domain`        (domain / application must not import from infrastructure)
//   DIP  — `no-orm-or-http-from-domain`  (domain / application must not import typeorm / prisma / mongoose / axios / @nestjs/axios)
//   DIP  — `no-application-importing-concrete-repository` (application should depend on domain interfaces, not on infrastructure)
//
// Mechanically enforceable via lint (ESLint configs in templates/ci/):
//   SRP — `max-lines` (≤300 backend / ≤400 frontend) and `max-params` (≤5)
//   enforced in eslintrc.backend.js and eslintrc.frontend.js respectively
//
// Not enforceable mechanically (left to Lente Architect Ticket 3 / agents Ticket 2):
//   OCP, LSP, ISP
//
// How to run from a real project:
//   npx dependency-cruiser --config templates/ci/.dependency-cruiser.js src/
//
// Exit code is non-zero on any violation → CI job fails the merge.
//
// Schema note: this config targets dependency-cruiser v16+. Older field
// names (`tsPreCompilationDeDir`, `enhancedResolveSupport`, scalar `tsConfig`)
// are NOT supported by v16+ and would cause the run to crash with
// "The supplied configuration is not valid". Keep these shapes intact when
// customizing for your project.
module.exports = {
  forbidden: [
    {
      // SOLID: DIP — domain layer must not depend on infrastructure
      name: 'no-infra-from-domain',
      severity: 'error',
      comment: 'SOLID DIP — domain/application cannot import from infrastructure/',
      from: { path: '^(src/)?(domain|application)/' },
      to: { path: '^(src/)?infrastructure/' },
    },
    {
      // SOLID: DIP — domain/application must not import ORM or HTTP client packages.
      // The `to.path` matches the resolved module path under node_modules so it
      // works whether the import specifier is bare ('typeorm') or path-aliased.
      name: 'no-orm-or-http-from-domain',
      severity: 'error',
      comment: 'SOLID DIP — domain/application cannot import typeorm/prisma/mongoose/axios/@nestjs/axios',
      from: { path: '^(src/)?(domain|application)/' },
      to: {
        path: '^node_modules/(typeorm|prisma|@prisma/client|mongoose|axios|@nestjs/axios|@nestjs/microservices|node-fetch|got)',
      },
    },
    {
      // SOLID: DIP — application must not import directly from infrastructure/repository implementations (only from domain interfaces)
      name: 'no-application-importing-concrete-repository',
      severity: 'error',
      comment: 'SOLID DIP — application should depend on domain interfaces, not on infrastructure implementations',
      from: { path: '^(src/)?application/' },
      to: { path: '^(src/)?infrastructure/.*?repository' },
    },
  ],
  options: {
    // v16+: doNotFollow is an object with `path` array, NOT a scalar string.
    doNotFollow: { path: ['node_modules'] },

    // v16+: detect dependencies that only exist before TypeScript-to-JS compilation.
    tsPreCompilationDeps: true,

    // v16+: tsConfig must be an object with a `fileName` key (string).
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
