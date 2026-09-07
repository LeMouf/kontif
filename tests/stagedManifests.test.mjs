import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createManifest, manifestDigest, readHistory } from '../scripts/releases.mjs';
import { stageManifest, recordCandidate } from '../scripts/staged-manifests.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'candidate-record-test-'));
  const history = join(root, 'ecosystem/releases'); mkdirSync(history, { recursive: true });
  const registry = JSON.parse(readFileSync(new URL('./fixtures/core-registry.json', import.meta.url), 'utf8'));
  // Synthetic complete declarations for tests; no real evidence is upgraded.
  registry.unknowns = []; registry.components[0].unknowns = [];
  writeFileSync(join(root, 'ecosystem/registry.json'), JSON.stringify(registry));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q'); git('add', '.');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Synthetic source');
  const m = createManifest(registry, { version: '0.0.1', createdAt: '2026-09-06T00:00:00.000Z', registrySourceCommit: git('rev-parse', 'HEAD'), status: 'candidate' });
  return { root, history, m };
}

test('candidate is recorded explicitly with exact digest and never published', () => {
  const f = fixture(); const stage = stageManifest(f.m);
  assert.equal(readHistory(f.history).length, 0);
  const result = recordCandidate(f.root, f.history, stage, manifestDigest(f.m));
  assert.equal(result.releaseAdmitted, false);
  assert.equal(readHistory(f.history)[0].status, 'candidate');
  assert.throws(() => recordCandidate(f.root, f.history, stage, manifestDigest(f.m)), /Duplicate/);
});
test('draft, wrong digest and forged source cannot reserve a version', () => {
  const f = fixture();
  const draft = structuredClone(f.m); draft.status = 'draft';
  assert.throws(() => recordCandidate(f.root, f.history, stageManifest(draft), manifestDigest(draft)), /complete candidate/);
  assert.throws(() => recordCandidate(f.root, f.history, stageManifest(f.m), '0'.repeat(64)), /mismatch/);
  const forged = structuredClone(f.m); forged.snapshot.components[0].role = 'Forged';
  assert.throws(() => recordCandidate(f.root, f.history, stageManifest(forged), manifestDigest(forged)), /differs/);
  assert.equal(readHistory(f.history).length, 0);
});
test('interrupted or altered staging is refused before recording', () => {
  const f = fixture(); const stage = stageManifest(f.m);
  writeFileSync(join(stage, 'manifest.sha256'), '0'.repeat(64) + '\n');
  assert.throws(() => recordCandidate(f.root, f.history, stage, manifestDigest(f.m)), /mismatch/);
  assert.equal(readHistory(f.history).length, 0);
});
