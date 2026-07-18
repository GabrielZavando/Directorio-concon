// TDD RED: this test must FAIL until the Angular 17+ workspace is scaffolded.
// It asserts the structure required by tasks 1.1 (standalone bootstrap files)
// without requiring node_modules, so it runs with the built-in node:test runner.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const FRONTEND = resolve(process.cwd(), "frontend");

test("frontend/ workspace directory exists", () => {
  assert.ok(existsSync(FRONTEND), "frontend/ directory should exist");
});

test("package.json declares Angular 17+", () => {
  const pkgPath = resolve(FRONTEND, "package.json");
  assert.ok(existsSync(pkgPath), "frontend/package.json should exist");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const core = pkg.dependencies?.["@angular/core"] ?? "";
  const major = parseInt(
    core.replace(/[\^~>=<\s]/g, "").split(".")[0],
    10,
  );
  assert.ok(major >= 17, `Angular core should be >=17 (found "${core}")`);
});

test("standalone bootstrap files exist", () => {
  for (const file of [
    "src/main.ts",
    "src/app/app.component.ts",
    "src/app/app.config.ts",
  ]) {
    assert.ok(
      existsSync(resolve(FRONTEND, file)),
      `missing required file: ${file}`,
    );
  }
});

test("main.ts bootstraps the standalone app", () => {
  const main = readFileSync(resolve(FRONTEND, "src/main.ts"), "utf8");
  assert.match(
    main,
    /bootstrapApplication/,
    "main.ts should call bootstrapApplication (standalone API)",
  );
});

// TDD RED for task 1.2: firebase deps must be declared in frontend/package.json.
function readFrontendPkg() {
  const pkgPath = resolve(FRONTEND, "package.json");
  assert.ok(existsSync(pkgPath), "frontend/package.json should exist");
  return JSON.parse(readFileSync(pkgPath, "utf8"));
}

test("package.json includes @angular/fire", () => {
  const pkg = readFrontendPkg();
  assert.ok(
    pkg.dependencies?.["@angular/fire"],
    "@angular/fire should be in dependencies",
  );
});

test("package.json includes firebase", () => {
  const pkg = readFrontendPkg();
  assert.ok(pkg.dependencies?.["firebase"], "firebase should be in dependencies");
});
