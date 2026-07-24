// templates/ci/.dependency-cruiser.js
//
// dependency-cruiser v16+ config — enforces DIP (Dependency Inversion Principle)
// for the Clean Architecture layout declared in docs/backend-standards.md.
//
// Layout enforced (per feature):
//   backend/src/modules/<feature>/
//   ├── domain/           Pure entities + repository ports. NO infra imports.
//   ├── application/      Use cases / domain-app services. NO infra. Imports domain.
//   └── infrastructure/   Controllers, Firestore/external adapters. Imports domain + application.
//
// Invoked via `make solid-lint` from the repo root:
//   npx dependency-cruiser backend/src --config templates/ci/.dependency-cruiser.js
//
// Reglas DIP:
//   - no-infra-from-domain:               domain/ imports MUST NOT pull firebase-admin, @nestjs/axios, class-validator, class-transformer.
//   - no-orm-or-http-from-domain:         domain/ imports MUST NOT pull ORM/HTTP/SDK libs.
//   - no-application-importing-concrete-repository: application/ imports an interface from domain/, never an infrastructure/ adapter.

/** @type {import('dependency-cruiser').IDependencyRule} */
const forbiddenInfraFromDomain = {
  name: 'no-infra-from-domain',
  comment: 'DIP: domain must not import infrastructure (firebase-admin, nestjs/axios, class-validator, class-transformer)',
  severity: 'error',
  from: {
    path: '^backend/src/modules/[^/]+/domain/',
  },
  to: {
    path: '^(firebase-admin|@nestjs/axios|@nestjs/microservices|class-validator|class-transformer|@google-cloud/)',
  },
};

/** @type {import('dependency-cruiser').IDependencyRule} */
const forbiddenOrmHttpFromDomain = {
  name: 'no-orm-or-http-from-domain',
  comment: 'DIP: domain must not import ORM/HTTP/SDK — only interfaces (ports)',
  severity: 'error',
  from: {
    path: '^backend/src/modules/[^/]+/domain/',
  },
  to: {
    path: '^(typeorm|@prisma/client|mongoose|@nestjs/mongoose|@nestjs/typeorm|@nestjs/prisma|reflect-metadata|rxjs)$',
  },
};

/** @type {import('dependency-cruiser').IDependencyRule} */
const forbiddenApplicationImportingConcreteRepository = {
  name: 'no-application-importing-concrete-repository',
  comment: 'DIP: application must depend on interfaces (domain/repositories/), never concrete adapters in infrastructure/',
  severity: 'error',
  from: {
    path: '^backend/src/modules/[^/]+/application/',
  },
  to: {
    path: '^backend/src/modules/[^/]+/infrastructure/',
  },
};

/** @type {import('dependency-cruiser').IDependencyRule} */
const noCircularDependencies = {
  name: 'no-circular',
  comment: 'No circular dependencies between modules',
  severity: 'error',
  from: {},
  to: {
    circular: true,
  },
};

/** @type {import('dependency-cruiser').IDependencyRule} */
const noOrphanPorts = {
  name: 'no-orphan-domain-files',
  comment: 'Domain files should be imported from application/ or infrastructure/',
  severity: 'warn',
  from: {
    path: '^backend/src/modules/[^/]+/domain/',
    orphan: true,
  },
  to: {},
};

module.exports = {
  $schema: 'https://dependency-cruiser.org/schema/dependency-cruiser-config.json',
  extends: 'dependency-cruiser-config-recommended',
  forbidden: [
    noCircularDependencies,
    forbiddenInfraFromDomain,
    forbiddenOrmHttpFromDomain,
    forbiddenApplicationImportingConcreteRepository,
    noOrphanPorts,
  ],
  options: {
    doNotFollow: {
      path: ['node_modules/', '\\.(spec|test)\\.ts$'],
    },
    tsConfig: {
      fileName: 'backend/tsconfig.json',
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
