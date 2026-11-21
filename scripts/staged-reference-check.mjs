// Staged-artifact reference check.
//
// The public staging step copies an explicit allowlist. Three past defects
// (cinematic stylesheet, hero image, slash-command module) shipped because a
// file was referenced by the page but never staged. This module crawls the
// staged directory itself and reports every local reference that does not
// resolve to a staged file, so "referenced but not staged" fails at PR time
// instead of in a later human or browser proof.
//
// Resolution rules mirror the browser:
// - HTML src/href/url() resolve against the HTML file.
// - ES module specifiers (static import/export-from, dynamic import(), and
//   new URL(x, import.meta.url)) resolve against the module file.
// - Classic-script dynamic import() also resolves against the script URL.
// - DOM assignments (el.src = '...', el.href = '...') and HTML markup built
//   inside JS strings resolve against the document (site root index.html).
// - CSS url() resolves against the stylesheet.
// External schemes, protocol-relative URLs, fragments, data: URIs, bare
// module specifiers, and template-interpolated strings are ignored.
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const TEXT_EXTENSIONS = /\.(?:html?|m?js|css)$/i;

function isLocal(ref) {
  if (!ref) return false;
  const value = ref.trim();
  if (!value || value.startsWith('#')) return false;
  if (value.startsWith('//')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false; // http:, https:, data:, mailto:, javascript:, blob:
  if (value.includes('${') || value.includes('{{')) return false; // interpolated
  return true;
}

function isRelativeModuleSpecifier(ref) {
  return ref.startsWith('./') || ref.startsWith('../') || ref.startsWith('/');
}

function stripSuffix(ref) {
  return ref.trim().replace(/[?#].*$/, '');
}

async function walk(dir, prefix = '') {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full, relative));
    else if (entry.isFile()) out.push(relative);
  }
  return out;
}

function collect(pattern, text, group = 1) {
  const found = [];
  for (const match of text.matchAll(pattern)) found.push(match[group]);
  return found;
}

export function extractReferences(file, text) {
  const refs = [];
  const add = (ref, base) => refs.push({ ref, base });
  const ext = path.extname(file).toLowerCase();

  if (ext === '.html' || ext === '.htm') {
    for (const ref of collect(/\s(?:src|href)\s*=\s*"([^"]*)"/gi, text)) add(ref, 'file');
    for (const ref of collect(/\s(?:src|href)\s*=\s*'([^']*)'/gi, text)) add(ref, 'file');
    for (const ref of collect(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi, text)) add(ref, 'file');
    // Inline module scripts resolve specifiers against the document too.
    for (const ref of collect(/\bfrom\s*['"]([^'"]+)['"]/g, text)) if (isRelativeModuleSpecifier(ref)) add(ref, 'file');
    for (const ref of collect(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, text)) if (isRelativeModuleSpecifier(ref)) add(ref, 'file');
  } else if (ext === '.js' || ext === '.mjs') {
    for (const ref of collect(/\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g, text)) if (isRelativeModuleSpecifier(ref)) add(ref, 'file');
    for (const ref of collect(/\bimport\s*['"]([^'"]+)['"]/g, text)) if (isRelativeModuleSpecifier(ref)) add(ref, 'file');
    for (const ref of collect(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, text)) if (isRelativeModuleSpecifier(ref)) add(ref, 'file');
    for (const ref of collect(/new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g, text)) add(ref, 'file');
    for (const ref of collect(/\.(?:src|href)\s*=\s*['"]([^'"]+)['"]/g, text)) if (isRelativeModuleSpecifier(ref)) add(ref, 'document');
  } else if (ext === '.css') {
    for (const ref of collect(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi, text)) add(ref, 'file');
    for (const ref of collect(/@import\s+['"]([^'"]+)['"]/gi, text)) add(ref, 'file');
  }

  return refs.filter(({ ref }) => isLocal(ref));
}

async function exists(full) {
  try {
    return (await stat(full)).isFile();
  } catch {
    return false;
  }
}

export async function findDanglingReferences(rootDir, { documentPath = 'index.html' } = {}) {
  const root = path.resolve(rootDir);
  const files = (await walk(root)).sort();
  const dangling = [];
  let checked = 0;

  for (const file of files) {
    if (!TEXT_EXTENSIONS.test(file)) continue;
    const text = await readFile(path.join(root, file), 'utf8');
    for (const { ref, base } of extractReferences(file, text)) {
      const clean = stripSuffix(ref);
      if (!clean) continue;
      const baseDir = path.posix.dirname(base === 'document' ? documentPath : file);
      const resolved = clean.startsWith('/')
        ? path.posix.normalize(clean.slice(1))
        : path.posix.normalize(path.posix.join(baseDir, clean));
      checked += 1;
      if (resolved.startsWith('..')) {
        dangling.push({ from: file, ref, resolved, reason: 'escapes staged root' });
        continue;
      }
      const target = resolved.endsWith('/') || resolved === '.' ? path.posix.join(resolved, 'index.html') : resolved;
      if (!(await exists(path.join(root, target)))) {
        dangling.push({ from: file, ref, resolved: target, reason: 'not staged' });
      }
    }
  }

  return { checked, dangling };
}
