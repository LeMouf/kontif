import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateRegistry, canonicalRegistry, registryDigest } from '../scripts/registry.mjs';
const source = JSON.parse(readFileSync(new URL('./fixtures/core-registry.json', import.meta.url), 'utf8'));
const fresh = () => structuredClone(source);

test('Core draft validates without implying release admission', () => {
  assert.equal(validateRegistry(source).valid, true);
  assert.equal(validateRegistry(source).releaseAdmitted, false);
  assert.equal(source.components[0].revision.sourceCommit, '4ef38c97e7ce9d79587987b7e86a59017c777666');
});
test('closed schema rejects invalid types, fields, status and ambiguous revisions', () => {
  for (const mutate of [
    r => { r.status = 'released'; }, r => { r.components[0].extra = true; },
    r => { r.components[0].revision.version = '^0.284.2'; },
    r => { r.components[0].revision.sourceCommit = 'main'; },
    r => { r.components[0].introducedOn = '2026-02-30'; },
    r => { r.components = null; }, r => { delete r.unknowns; }
  ]) { const r = fresh(); mutate(r); assert.throws(() => validateRegistry(r)); }
});
test('duplicate IDs, aliases and unresolved dependencies are refused', () => {
  const r = fresh(); r.components.push(structuredClone(r.components[0]));
  assert.throws(() => validateRegistry(r), /sorted and unique/);
  const alias = fresh(); alias.components[0].aliases.push(alias.components[0].name);
  assert.throws(() => validateRegistry(alias), /collision/);
  const missing = fresh(); missing.components[0].dependencies = ['konitif:missing'];
  assert.throws(() => validateRegistry(missing), /unresolved/);
});
test('replacement cycle is refused', () => {
  const r = fresh(); const a = r.components[0]; const b = structuredClone(a);
  b.id = 'konitif:other'; b.name = 'Other'; r.components.push(b);
  for (const c of [a, b]) { c.membership = 'replaced'; c.retiredOn = c.introducedOn; }
  a.replacedBy = b.id; b.replacedBy = a.id;
  assert.throws(() => validateRegistry(r), /cycle/);
});
test('rename retains ID and alias; old snapshot remains byte-stable', () => {
  const before = canonicalRegistry(source); const r = fresh();
  r.components[0].name = 'Renamed Core';
  assert.throws(() => validateRegistry(r, source), /rename/);
  r.components[0].aliases = ['@konitif/core']; validateRegistry(r, source);
  assert.equal(canonicalRegistry(source), before);
});
test('history requires tombstones and prevents resurrection', () => {
  const r = fresh(); r.components[0].id = 'konitif:other';
  assert.throws(() => validateRegistry(r, source), /silent removal/);
  const retired = fresh(); retired.components[0].membership = 'removed';
  retired.components[0].retiredOn = '2026-09-06'; validateRegistry(retired, source);
  assert.throws(() => validateRegistry(source, retired), /tombstone/);
});
test('digest is independent of object insertion order, but binds values', () => {
  const reversed = Object.fromEntries(Object.entries(source).reverse());
  assert.equal(registryDigest(source), registryDigest(reversed));
  const r = fresh(); r.components[0].role = 'Changed';
  assert.notEqual(registryDigest(source), registryDigest(r));
  assert.match(registryDigest(source), /^[a-f0-9]{64}$/);
});
test('unknowns required when package artifact evidence is absent', () => {
  const r = fresh(); r.components[0].revision.artifact = null; r.components[0].unknowns = [];
  assert.throws(() => validateRegistry(r), /explicit unknown/);
});
test('local paths, credentials and unsupported URL origins are refused', () => {
  for (const url of ['file:///private/data', 'https://github.com/a/b?token=secret', 'https://user:secret@github.com/a/b', 'http://127.0.0.1/test', 'https://example.com/a']) {
    const r = fresh(); r.components[0].evidence[0].url = url; assert.throws(() => validateRegistry(r));
  }
  const r = fresh(); r.components[0].role = '/mnt/c/private';
  assert.throws(() => validateRegistry(r), /non-portable/);
});
test('external consumer validates without site, Core or checkout dependencies', () => {
  const root = mkdtempSync(join(tmpdir(), 'konitif-ecosystem-test-'));
  for (const dir of ['scripts', 'ecosystem']) cpSync(new URL(`../${dir}`, import.meta.url), join(root, dir), { recursive: true });
  const result = spawnSync(process.execPath, ['scripts/validate-registry.mjs', 'ecosystem/registry.json'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr);
  const current = JSON.parse(readFileSync(new URL('../ecosystem/registry.json', import.meta.url), 'utf8'));
  assert.equal(JSON.parse(result.stdout).sha256, registryDigest(current));
  const refused = spawnSync(process.execPath, ['scripts/validate-registry.mjs', 'ecosystem/registry.json', '--release'], { cwd: root, encoding: 'utf8' });
  assert.equal(refused.status, 1); assert.match(refused.stderr, /not implemented/);
});
