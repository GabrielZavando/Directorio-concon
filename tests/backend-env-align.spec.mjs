// TDD RED for task 4 (backend env alignment) and task 5.2 (no web apiKey in backend).
// Runnable without node_modules via the built-in node:test runner.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BACKEND = resolve(process.cwd(), "backend");
const ENV = resolve(BACKEND, ".env");
const ENV_EXAMPLE = resolve(BACKEND, ".env.example");
const WEB_API_KEY = "AIzaSyApYXJxVgEOPTSMSKjYhxmhFvYv2WGs7vY";

function parseEnv(path) {
  assert.ok(existsSync(path), `missing file: ${path}`);
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

test("backend/.env uses the real Firebase project (kept disabled)", () => {
  const env = parseEnv(ENV);
  assert.equal(env.FIREBASE_PROJECT_ID, "directorioconcon");
  assert.equal(env.FIREBASE_STORAGE_BUCKET, "directorioconcon.firebasestorage.app");
  assert.equal(env.FIREBASE_ENABLED, "false");
});

test("backend/.env.example mirrors the real project (kept disabled)", () => {
  const env = parseEnv(ENV_EXAMPLE);
  assert.equal(env.FIREBASE_PROJECT_ID, "directorioconcon");
  assert.equal(env.FIREBASE_STORAGE_BUCKET, "directorioconcon.firebasestorage.app");
  assert.equal(env.FIREBASE_ENABLED, "false");
});

test("backend .env files never contain the Web SDK apiKey", () => {
  for (const path of [ENV, ENV_EXAMPLE]) {
    const src = readFileSync(path, "utf8");
    assert.doesNotMatch(
      src,
      new RegExp(WEB_API_KEY),
      `web apiKey must not leak into ${path}`,
    );
  }
});
