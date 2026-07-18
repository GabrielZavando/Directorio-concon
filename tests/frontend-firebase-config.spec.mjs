// TDD RED for tasks 2.1-2.3 / 3.1 (frontend Firebase config).
// Runnable without node_modules via the built-in node:test runner.
// It validates that the Angular environment files and app.config.ts wire the
// real Firebase Web SDK config (project directoriconcon) and that no Admin
// secret ever leaks into the frontend.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const FRONTEND = resolve(process.cwd(), "frontend");
const ENV_TS = resolve(FRONTEND, "src/environments/environment.ts");
const ENV_DEV_TS = resolve(FRONTEND, "src/environments/environment.development.ts");

function readTs(path) {
  assert.ok(existsSync(path), `missing file: ${path}`);
  return readFileSync(path, "utf8");
}

// ---- Task 2.1: environment files with real project config ----
test("environment.ts and environment.development.ts exist", () => {
  assert.ok(existsSync(ENV_TS), "src/environments/environment.ts should exist");
  assert.ok(
    existsSync(ENV_DEV_TS),
    "src/environments/environment.development.ts should exist",
  );
});

test("environment.development.ts uses the real Firebase project", () => {
  const src = readTs(ENV_DEV_TS);
  assert.match(
    src,
    /projectId:\s*['"]directorioconcon['"]/,
    "projectId should be 'directorioconcon'",
  );
  assert.match(
    src,
    /storageBucket:\s*['"]directorioconcon\.firebasestorage\.app['"]/,
    "storageBucket should be 'directorioconcon.firebasestorage.app'",
  );
});

test("frontend environment files contain NO Admin private_key", () => {
  for (const path of [ENV_TS, ENV_DEV_TS]) {
    const src = readTs(path);
    assert.doesNotMatch(
      src,
      /private_key/,
      `frontend env must not contain an Admin private_key (${path})`,
    );
  }
});

// ---- Task 2.2: angular.json fileReplacements for environments ----
function readAngularJson() {
  const path = resolve(FRONTEND, "angular.json");
  assert.ok(existsSync(path), "angular.json should exist");
  return JSON.parse(readFileSync(path, "utf8"));
}

test("angular.json development config swaps environment.ts -> environment.development.ts", () => {
  const cfg = readAngularJson();
  const dev = cfg.projects.frontend.architect.build.configurations.development;
  const replacements = dev?.fileReplacements ?? [];
  const hit = replacements.find(
    (r) =>
      r.replace === "src/environments/environment.ts" &&
      r.with === "src/environments/environment.development.ts",
  );
  assert.ok(
    hit,
    "development configuration must replace environment.ts with environment.development.ts",
  );
});

// ---- Task 2.3: app.config.ts wires Firebase providers ----
test("app.config.ts initializes Firebase via @angular/fire providers", () => {
  const path = resolve(FRONTEND, "src/app/app.config.ts");
  const src = readTs(path);
  assert.match(
    src,
    /provideFirebaseApp\(\s*\(\)\s*=>\s*initializeApp\(environment\.firebase\)/,
    "must provideFirebaseApp(() => initializeApp(environment.firebase))",
  );
  assert.match(src, /provideAuth\(/, "must provideAuth");
  assert.match(src, /provideFirestore\(/, "must provideFirestore");
  assert.match(src, /provideStorage\(/, "must provideStorage");
  assert.match(src, /from ['"]@angular\/fire\/app['"]/, "must import @angular/fire/app");
});

// ---- Task 3.1: firebase config unit-test guard (runnable) ----
function loadEnvironmentConfig(path) {
  const src = readTs(path);
  const body = src
    .replace("export const environment =", "return ")
    .replace(/;\s*$/, ";");
  // eslint-disable-next-line no-new-func
  return new Function(body)();
}

test("environment.firebase has the real projectId and all Web SDK keys", () => {
  const env = loadEnvironmentConfig(ENV_DEV_TS);
  assert.equal(env.firebase.projectId, "directorioconcon");
  assert.equal(env.firebase.storageBucket, "directorioconcon.firebasestorage.app");
  for (const key of [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
    "measurementId",
  ]) {
    assert.ok(
      env.firebase[key],
      `firebase.${key} should be present in environment config`,
    );
  }
});
