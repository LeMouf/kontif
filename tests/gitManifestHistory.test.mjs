import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createManifest, manifestBytes, manifestDigest } from '../scripts/releases.mjs';
import { validateGitManifestHistory } from '../scripts/git-manifest-history.mjs';
const registry = JSON.parse(readFileSync(new URL('../ecosystem/registry.json', import.meta.url), 'utf8'));
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'manifest-history-git-'));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q'); mkdirSync(join(root, 'ecosystem/releases'), { recursive: true });
  writeFileSync(join(root, 'ecosystem/registry.json'), JSON.stringify(registry));
  function commit() {
    git('add', '.'); git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Synthetic history fixture');
    return git('rev-parse', 'HEAD');
  }
  const base = commit();
  const m = createManifest(registry, { version: '0.0.1', createdAt: '2026-09-06T00:00:00.000Z', registrySourceCommit: base });
  const dir = join(root, 'ecosystem/releases/0.0.1'); mkdirSync(dir);
  const write = () => {
    writeFileSync(join(dir, 'manifest.json'), manifestBytes(m));
    writeFileSync(join(dir, 'manifest.sha256'), manifestDigest(m) + '\n');
  };
  return { root, base, m, dir, write, commit };
}
test('Git comparison accepts new references, protects prior blobs and allows current registry edits', () => {
  const f = fixture(); f.write(); const recorded = f.commit();
  assert.equal(validateGitManifestHistory(f.root, f.base, recorded).manifests, 1);
  const changed = structuredClone(registry); changed.components[0].role = 'Current description';
  writeFileSync(join(f.root, 'ecosystem/registry.json'), JSON.stringify(changed));
  const head = f.commit();
  assert.equal(validateGitManifestHistory(f.root, recorded, head).protectedFiles, 2);
});
test('Git comparison refuses rewritten manifest even with a recomputed digest', () => {
  const f = fixture(); f.write(); const base = f.commit();
  f.m.createdAt = '2026-09-06T00:00:01.000Z'; f.write(); const head = f.commit();
  assert.throws(() => validateGitManifestHistory(f.root, base, head), /rewritten/);
});
test('Git comparison refuses deleted bundles', () => {
  const f = fixture(); f.write(); const base = f.commit();
  unlinkSync(join(f.dir, 'manifest.json')); unlinkSync(join(f.dir, 'manifest.sha256'));
  assert.throws(() => validateGitManifestHistory(f.root, base, f.commit()), /removed/);
});
test('Git comparison refuses a forged snapshot with internally correct hashes', () => {
  const f = fixture(); f.m.snapshot.components[0].role = 'Forged source'; f.write();
  assert.throws(() => validateGitManifestHistory(f.root, f.base, f.commit()), /does not match/);
});
test('Git comparison fails closed on missing or invalid baseline', () => {
  const f = fixture();
  assert.throws(() => validateGitManifestHistory(f.root, '', f.base), /commits required/);
  assert.throws(() => validateGitManifestHistory(f.root, '0'.repeat(40), f.base));
});
