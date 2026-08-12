/* PromptOS — versioned state boundary
   Browser-safe runtime validation shared by import, export, and Gist sync.
   This is intentionally dependency-free so the static app and focused Node
   checks use the same contract.
*/
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PromptOSState = api;
}(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  var SCHEMA_VERSION = 1;
  var LIMITS = Object.freeze({
    maxImportBytes: 512 * 1024,
    maxPrompts: 500,
    maxTitleLength: 120,
    maxSubtitleLength: 240,
    maxBodyLength: 20000,
    maxPlatforms: 6,
    maxIdLength: 100,
    maxStarIds: 5000
  });

  var ALLOWED_CATEGORIES = Object.freeze([
    'coding', 'research', 'redteam', 'system', 'design', 'ecom',
    'cloudflare', 'learning', 'growth', 'ops', 'custom'
  ]);
  var ALLOWED_PLATFORMS = Object.freeze([
    'chatgpt', 'claude', 'perplexity', 'figma', 'canva', 'shopify'
  ]);
  var DANGEROUS_KEYS = Object.freeze({
    '__proto__': true,
    'constructor': true,
    'prototype': true
  });

  var SECRET_PATTERNS = Object.freeze([
    { code: 'private-key', label: 'private key', pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i },
    { code: 'jwt', label: 'JWT', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
    { code: 'github-token', label: 'GitHub token', pattern: /\b(?:ghp|gho|ghs|ghr|github_pat)_[A-Za-z0-9_]{16,}\b/ },
    { code: 'openai-token', label: 'OpenAI-style token', pattern: /\bsk-[A-Za-z0-9_-]{16,}\b/ },
    { code: 'perplexity-token', label: 'Perplexity-style token', pattern: /\bpplx[-_][A-Za-z0-9_-]{16,}\b/ },
    { code: 'aws-access-key', label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
    { code: 'google-api-key', label: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{20,}\b/ }
  ]);

  /* Keep assignment detection conservative so placeholders such as
     API_KEY=[PASTE HERE] remain usable in prompt templates. */
  var ASSIGNMENT_PATTERN = /\b(?:[A-Z][A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PRIVATE[_-]?KEY)|API[_-]?KEY|TOKEN|SECRET|PASSWORD|PRIVATE[_-]?KEY|client_secret|refresh_token|access_token)\s*[:=]\s*(?![\[<"']?\s*(?:paste|your|replace|redacted|example|here)\b)[^\s,;]+/i;

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]') return false;
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  function hasDangerousKeys(value, path, errors, seen) {
    if (!value || typeof value !== 'object') return;
    if (seen.indexOf(value) !== -1) {
      errors.push(path + ' contains a circular reference');
      return;
    }
    seen.push(value);
    if (Array.isArray(value)) {
      value.forEach(function (entry, index) {
        hasDangerousKeys(entry, path + '[' + index + ']', errors, seen);
      });
    } else {
      Object.keys(value).forEach(function (key) {
        if (DANGEROUS_KEYS[key]) errors.push(path + '.' + key + ' is not allowed');
        hasDangerousKeys(value[key], path + '.' + key, errors, seen);
      });
    }
    seen.pop();
  }

  function scanText(value) {
    var text = typeof value === 'string' ? value : '';
    var findings = [];
    SECRET_PATTERNS.forEach(function (entry) {
      if (entry.pattern.test(text)) findings.push({ code: entry.code, label: entry.label });
    });
    if (ASSIGNMENT_PATTERN.test(text)) findings.push({ code: 'secret-assignment', label: 'secret-like assignment' });
    return findings;
  }

  function scanState(state) {
    var findings = [];
    (Array.isArray(state && state.custom) ? state.custom : []).forEach(function (prompt, index) {
      ['title', 'sub', 'body'].forEach(function (field) {
        scanText(prompt && prompt[field]).forEach(function (finding) {
          findings.push({
            code: finding.code,
            label: finding.label,
            field: 'custom[' + index + '].' + field
          });
        });
      });
    });
    return findings;
  }

  function normalizePlatforms(value, path, errors) {
    var values = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',') : []);
    var result = [];
    values.forEach(function (platform) {
      if (typeof platform !== 'string') {
        errors.push(path + ' must contain strings');
        return;
      }
      var normalized = platform.trim().toLowerCase();
      if (!normalized) return;
      if (ALLOWED_PLATFORMS.indexOf(normalized) === -1) errors.push(path + ' contains unsupported platform: ' + normalized);
      else if (result.indexOf(normalized) === -1) result.push(normalized);
    });
    if (!result.length) result.push('chatgpt');
    if (result.length > LIMITS.maxPlatforms) errors.push(path + ' exceeds ' + LIMITS.maxPlatforms + ' platforms');
    return result.slice(0, LIMITS.maxPlatforms);
  }

  function validateState(input) {
    var errors = [];
    if (!isPlainObject(input)) return { ok: false, value: null, errors: ['state must be a plain object'], findings: [] };
    hasDangerousKeys(input, 'state', errors, []);

    var version = input.schemaVersion == null ? SCHEMA_VERSION : input.schemaVersion;
    if (version !== SCHEMA_VERSION) errors.push('unsupported schemaVersion: ' + String(version));

    var stars = {};
    if (input.stars != null && !isPlainObject(input.stars)) errors.push('stars must be an object');
    if (isPlainObject(input.stars)) {
      var starIds = Object.keys(input.stars);
      if (starIds.length > LIMITS.maxStarIds) errors.push('stars exceeds ' + LIMITS.maxStarIds + ' entries');
      starIds.slice(0, LIMITS.maxStarIds).forEach(function (id) {
        if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) errors.push('invalid star id');
        else if (input.stars[id] === true) stars[id] = true;
        else if (input.stars[id] !== false) errors.push('star values must be boolean');
      });
    }

    var custom = [];
    var customIds = {};
    if (input.custom != null && !Array.isArray(input.custom)) errors.push('custom must be an array');
    if (Array.isArray(input.custom)) {
      if (input.custom.length > LIMITS.maxPrompts) errors.push('custom exceeds ' + LIMITS.maxPrompts + ' prompts');
      input.custom.slice(0, LIMITS.maxPrompts).forEach(function (prompt, index) {
        var path = 'custom[' + index + ']';
        if (!isPlainObject(prompt)) {
          errors.push(path + ' must be an object');
          return;
        }
        var id = typeof prompt.id === 'string' ? prompt.id : '';
        var title = typeof prompt.title === 'string' ? prompt.title.trim() : '';
        var sub = typeof prompt.sub === 'string' ? prompt.sub.trim() : '';
        var body = typeof prompt.body === 'string' ? prompt.body : '';
        if (!/^c_[A-Za-z0-9_-]+$/.test(id) || id.length > LIMITS.maxIdLength) errors.push(path + '.id is invalid');
        if (customIds[id]) errors.push(path + '.id is duplicated');
        customIds[id] = true;
        if (!title || title.length > LIMITS.maxTitleLength) errors.push(path + '.title is required and must be <= ' + LIMITS.maxTitleLength + ' characters');
        if (sub.length > LIMITS.maxSubtitleLength) errors.push(path + '.sub exceeds ' + LIMITS.maxSubtitleLength + ' characters');
        if (!body || body.length > LIMITS.maxBodyLength) errors.push(path + '.body is required and must be <= ' + LIMITS.maxBodyLength + ' characters');
        var cat = typeof prompt.cat === 'string' ? prompt.cat.trim().toLowerCase() : 'custom';
        if (ALLOWED_CATEGORIES.indexOf(cat) === -1) errors.push(path + '.cat is unsupported');
        var platforms = normalizePlatforms(prompt.platforms, path + '.platforms', errors);
        custom.push({
          id: id,
          emoji: typeof prompt.emoji === 'string' && prompt.emoji.length <= 8 ? prompt.emoji : '✨',
          title: title,
          sub: sub,
          cat: cat,
          platforms: platforms,
          body: body,
          ts: Number.isFinite(prompt.ts) ? prompt.ts : undefined
        });
      });
    }

    var theme = input.theme == null ? 'dark' : input.theme;
    if (theme !== 'dark' && theme !== 'light') errors.push('theme must be dark or light');

    var value = {
      schemaVersion: SCHEMA_VERSION,
      stars: stars,
      custom: custom,
      theme: theme === 'light' ? 'light' : 'dark'
    };
    var findings = scanState(value);
    return { ok: errors.length === 0, value: value, errors: errors, findings: findings };
  }

  function serializeState(state) {
    var result = validateState(state);
    if (!result.ok) throw new Error('State validation failed');
    if (result.findings.length) throw new Error('Sensitive-looking material detected; remove it before syncing or exporting.');
    return JSON.stringify(result.value, null, 2);
  }

  function summarizeImport(incoming, current) {
    var existing = {};
    (Array.isArray(current && current.custom) ? current.custom : []).forEach(function (prompt) {
      existing[prompt.id] = prompt;
    });
    var additions = 0;
    var updates = 0;
    var unchanged = 0;
    (Array.isArray(incoming && incoming.custom) ? incoming.custom : []).forEach(function (prompt) {
      if (!existing[prompt.id]) additions++;
      else if (JSON.stringify(existing[prompt.id]) === JSON.stringify(prompt)) unchanged++;
      else updates++;
    });
    return {
      additions: additions,
      updates: updates,
      unchanged: unchanged,
      conflicts: updates,
      rejected: 0
    };
  }

  return Object.freeze({
    SCHEMA_VERSION: SCHEMA_VERSION,
    LIMITS: LIMITS,
    ALLOWED_CATEGORIES: ALLOWED_CATEGORIES,
    ALLOWED_PLATFORMS: ALLOWED_PLATFORMS,
    scanText: scanText,
    scanState: scanState,
    validateState: validateState,
    serializeState: serializeState,
    summarizeImport: summarizeImport
  });
}));
