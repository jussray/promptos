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

test("saveCustomPrompt requires server admission before unlocking and writing", () => {
  const body = fnBody("saveCustomPrompt");
  const gate = body.indexOf("window.PromptOSBilling.admit()");
  const unlock = body.indexOf("CUSTOM_PROMPTS_UNLOCKED = true");
  const push = body.indexOf("STATE.custom.push(");
  assert.ok(gate >= 0 && unlock > gate && push > unlock, "server admission must precede unlock and write");
  assert.match(body, /return false;/);
  assert.match(body, /return true;/);
});

test("importState gates custom prompts and only unlocks after admission", () => {
  const body = fnBody("importState");
  assert.match(body, /window\.PromptOSBilling\.admit\(\)/);
  assert.match(body, /if \(CUSTOM_PROMPTS_UNLOCKED && Array\.isArray\(data\.custom\)\)/);
});

test("renderCustomList shows a locked placeholder instead of an empty list", () => {
  const body = fnBody("renderCustomList");
  assert.match(body, /if \(!CUSTOM_PROMPTS_UNLOCKED\)/);
  assert.match(body, /locked/i);
});

test("all three save call sites await server admission", () => {
  const total = (src.match(/saveCustomPrompt\(/g) || []).length;
  assert.equal(total, 4, "one definition plus exactly three call sites");
  const awaits = (src.match(/if \(await saveCustomPrompt\(/g) || []).length;
  assert.equal(awaits, 3, "every save must await the server decision");
});

test("personal prompt state is inaccessible through library and export while locked", () => {
  assert.match(fnBody("allPrompts"), /CUSTOM_PROMPTS_UNLOCKED\s*\?\s*STATE\.custom\s*:\s*\[\]/);
  assert.match(fnBody("serializeState"), /CUSTOM_PROMPTS_UNLOCKED\s*\?\s*STATE\.custom\s*:\s*\[\]/);
});

test("identity transitions lock personal data, invalidate in-flight writes and repaint all surfaces", () => {
  const body = fnBody("lockPersonalSession");
  assert.match(body, /CUSTOM_PROMPTS_UNLOCKED = false/);
  assert.match(body, /personalSessionGeneration\+\+/);
  assert.match(body, /renderAll\(\)/);
  assert.match(src, /\['promptos:authed', 'promptos:guest', 'promptos:signedout'\]/);
  assert.match(fnBody("saveCustomPrompt"), /generation !== personalSessionGeneration/);
  assert.match(fnBody("importState"), /generation !== personalSessionGeneration/);
});

test("workspace stays locked until the server confirms paid admission", () => {
  const auth = readFileSync(new URL("../parts/auth.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /data-continue-as-guest/);
  assert.match(html, /id="appShell"[^>]*inert/);
  assert.match(auth, /async function refreshWorkspace\(/);
  assert.match(auth, /await window\.PromptOSBilling\.refresh\(\)/);
  assert.match(auth, /paid !== true/);
  assert.match(auth, /credential !== verifiedIdToken/);
  assert.match(auth, /window\.addEventListener\('focus', refreshWorkspace\)/);
  assert.doesNotMatch(auth, /function bootAsGuest\(/);
  assert.ok(html.indexOf('id="billingUpgrade"') < html.indexOf('id="appShell"'), "checkout must be reachable outside locked workspace");
});
