import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, cpSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createManifest, validateManifest, manifestBytes, manifestDigest, validateHistory, readHistory, writeManifest } from '../scripts/releases.mjs';
const registry = JSON.parse(readFileSync(new URL('./fixtures/core-registry.json', import.meta.url), 'utf8'));
const options = { version: '0.0.1', createdAt: '2026-09-06T00:00:00.000Z', registrySourceCommit: 'a'.repeat(40) };
// Synthetic fixture versions/commits, never official ecosystem releases.
const first = () => createManifest(registry, options);

test('reference snapshot survives registry mutation and round trips independently', () => {
  const input = structuredClone(registry); const m = createManifest(input, options);
  const bytes = manifestBytes(m); input.components[0].name = 'Changed';
  assert.equal(manifestBytes(m), bytes);
  assert.equal(validateManifest(JSON.parse(bytes)).releaseAdmitted, false);
  assert.equal(m.snapshot.components[0].revision.version, '0.284.2');
});
test('exact version, UTC date, source and tag required; no embedded code or released claim', () => {
  for (const mutate of [
    m => { m.version = '../escape'; }, m => { m.expectedTag = 'latest'; },
    m => { m.createdAt = '2026-02-30T00:00:00.000Z'; }, m => { m.registrySourceCommit = 'main'; },
    m => { m.status = 'released'; }, m => { m.sourceFiles = {}; },
    m => { m.snapshot.components[0].contents = 'copied code'; }, m => { m.previousDigest = ''; }
  ]) { const m = first(); mutate(m); assert.throws(() => validateManifest(m)); }
});
test('incomplete candidate refused without weakening draft validation', () => {
  const m = first(); m.status = 'candidate';
  assert.throws(() => validateManifest(m), /unknowns/);
  m.snapshot.unknowns = []; m.snapshot.components[0].unknowns = [];
  assert.equal(validateManifest(m).releaseAdmitted, false);
  m.snapshot.components[0].revision.artifact = null;
  assert.throws(() => validateManifest(m));
});
test('deterministic detached digest binds every manifest field', () => {
  const m = first(); const reversed = Object.fromEntries(Object.entries(m).reverse());
  assert.equal(manifestDigest(m), manifestDigest(reversed));
  reversed.createdAt = '2026-09-06T00:00:01.000Z';
  assert.notEqual(manifestDigest(m), manifestDigest(reversed));
  assert.equal(manifestBytes(m).endsWith('\n'), false);
});
test('history preserves rename identity and tombstones without rewriting old snapshot', () => {
  const a = first(); const snapshot = structuredClone(registry);
  snapshot.components[0].name = 'Core renamed'; snapshot.components[0].aliases = ['@konitif/core'];
  const b = createManifest(snapshot, { ...options, version: '0.0.2', previousDigest: manifestDigest(a) });
  validateHistory([a, b], [a]);
  snapshot.components[0].membership = 'removed'; snapshot.components[0].retiredOn = '2026-09-06';
  const c = createManifest(snapshot, { ...options, version: '0.0.3', previousDigest: manifestDigest(b) });
  validateHistory([c, a, b], [a, b]);
  assert.equal(a.snapshot.components[0].name, '@konitif/core');
  const rewrite = structuredClone(a); rewrite.createdAt = '2026-09-06T00:00:01.000Z';
  assert.throws(() => validateHistory([rewrite], [a]), /rewritten/);
  assert.throws(() => validateHistory([], [a]), /removed/);
});
test('missing parent, forks, duplicate versions and backwards versions are rejected', () => {
  const a = first();
  const b = createManifest(registry, { ...options, version: '0.0.2', previousDigest: manifestDigest(a) });
  const c = createManifest(registry, { ...options, version: '0.0.3', previousDigest: manifestDigest(a) });
  assert.throws(() => validateHistory([b]));
  assert.throws(() => validateHistory([a, b, c]), /Forked/);
  assert.throws(() => validateHistory([a, a]), /Duplicate/);
  b.version = '0.0.0'; b.expectedTag = 'ecosystem-v0.0.0';
  assert.throws(() => validateHistory([a, b]), /increase/);
});
test('exclusive writer rejects reuse; changed digest and partial bundles rejected', () => {
  const dir = mkdtempSync(join(tmpdir(), 'manifest-bundles-')); const m = first();
  const target = writeManifest(dir, m);
  assert.equal(readHistory(dir).length, 1);
  assert.throws(() => writeManifest(dir, m));
  writeFileSync(join(target, 'manifest.sha256'), '0'.repeat(64) + '\n');
  assert.throws(() => readHistory(dir), /Digest mismatch/);
  const partial = mkdtempSync(join(tmpdir(), 'manifest-partial-'));
  mkdirSync(join(partial, '0.0.1')); assert.throws(() => readHistory(partial), /partial/);
});
test('external consumer reads archived references without current registry', () => {
  const root = mkdtempSync(join(tmpdir(), 'manifest-consumer-'));
  cpSync(new URL('../scripts', import.meta.url), join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'ecosystem'));
  cpSync(new URL('../ecosystem/registry.schema.json', import.meta.url), join(root, 'ecosystem/registry.schema.json'));
  cpSync(new URL('../ecosystem/registry.v1.schema.json', import.meta.url), join(root, 'ecosystem/registry.v1.schema.json'));
  const bundles = join(root, 'bundles'); mkdirSync(bundles); writeManifest(bundles, first());
  const result = spawnSync(process.execPath, ['scripts/validate-manifests.mjs', 'bundles'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).manifests, 1);
});

test('preparation reads committed registry and stages repeatable drafts outside permanent history', () => {
  const root = mkdtempSync(join(tmpdir(), 'manifest-git-input-'));
  for (const dir of ['scripts', 'ecosystem']) cpSync(new URL(`../${dir}`, import.meta.url), join(root, dir), { recursive: true });
  writeFileSync(join(root, 'ecosystem/registry.json'), JSON.stringify(registry));
  const run = (command, args) => {
    const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
  };
  run('git', ['init']); run('git', ['add', 'ecosystem/registry.json']);
  run('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Synthetic registry fixture']);
  const commit = run('git', ['rev-parse', 'HEAD']);
  const changed = structuredClone(registry); changed.components[0].name = 'Uncommitted name';
  writeFileSync(join(root, 'ecosystem/registry.json'), JSON.stringify(changed));
  const args = ['scripts/prepare-manifest.mjs', '0.0.1', options.createdAt, commit];
  const result = JSON.parse(run(process.execPath, args)); assert.equal(result.releaseAdmitted, false);
  const staged = JSON.parse(readFileSync(join(result.path, 'manifest.json'), 'utf8'));
  assert.equal(staged.snapshot.components[0].name, '@konitif/core');
  assert.equal(staged.registrySourceCommit, commit);
  assert.equal(readHistory(join(root, 'ecosystem/releases')).length, 0);
  const again = JSON.parse(run(process.execPath, args));
  assert.notEqual(again.path, result.path);
  assert.equal(again.sha256, result.sha256);
});
