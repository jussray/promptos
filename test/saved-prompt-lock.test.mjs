import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Source-level guard: parts/app.js is a browser IIFE, so these assertions pin the lock
// structure. Behavioral proof lives in the Playwright check on the exact head.
const src = readFileSync(new URL("../parts/app.js", import.meta.url), "utf8");

function fnBody(name) {
  const start = src.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = src.indexOf("\n}\n", start);
  assert.notEqual(end, -1, `${name} must close`);
  return src.slice(start, end + 3);
}

test("saved custom prompts are locked by default", () => {
  assert.match(src, /var CUSTOM_PROMPTS_UNLOCKED = false;/);
});

test("saveCustomPrompt checks the lock before storing and reports whether it stored", () => {
  const body = fnBody("saveCustomPrompt");
  const gate = body.indexOf("if (!CUSTOM_PROMPTS_UNLOCKED)");
  const push = body.indexOf("STATE.custom.push(");
  assert.notEqual(gate, -1, "lock check must exist");
  assert.notEqual(push, -1, "push must still exist when unlocked");
  assert.ok(gate < push, "lock check must run before any push");
  assert.match(body, /return false;/);
  assert.match(body, /return true;/);
});

test("importState cannot repopulate saved prompts while locked", () => {
  const body = fnBody("importState");
  assert.match(body, /if \(CUSTOM_PROMPTS_UNLOCKED && Array\.isArray\(data\.custom\)\)/);
});

test("renderCustomList shows a locked placeholder instead of an empty list", () => {
  const body = fnBody("renderCustomList");
  assert.match(body, /if \(!CUSTOM_PROMPTS_UNLOCKED\)/);
  assert.match(body, /locked/i);
});

test("all three save call sites are gated on the boolean result", () => {
  const total = (src.match(/saveCustomPrompt\(/g) || []).length;
  assert.equal(total, 4, "one definition plus exactly three call sites");
  const gatedTrue = (src.match(/if \(saveCustomPrompt\(/g) || []).length;
  const gatedFalse = (src.match(/if \(!saveCustomPrompt\(/g) || []).length;
  assert.equal(gatedTrue, 2, "builder and freestyle toast success only when stored");
  assert.equal(gatedFalse, 1, "custom form keeps the draft and returns when locked");
});
