import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('CI validates with read-only permissions and no dependency installation', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /github\.event\.pull_request\.base\.sha/);
  assert.match(workflow, /node scripts\/check-manifest-history\.mjs "\$MANIFEST_BASE_SHA" "\$MANIFEST_HEAD_SHA"/);
  assert.match(workflow, /node --test tests\/\*\.test\.mjs/);
  assert.match(workflow, /node scripts\/validate-registry\.mjs ecosystem\/registry\.json/);
  assert.match(workflow, /node scripts\/check-registry-history\.mjs "\$REGISTRY_BASE_SHA"/);
  assert.doesNotMatch(workflow, /setup-node|npm (?:ci|install|publish)|pnpm|npx|curl|wget/);
});

test('runtime selection refuses an absent cache without downloading', () => {
  const dir = mkdtempSync(join(tmpdir(), 'registry-ci-'));
  const result = spawnSync('bash', [fileURLToPath(new URL('../scripts/select-ci-runtime.sh', import.meta.url))], {
    env: { ...process.env, RUNNER_TOOL_CACHE: dir, GITHUB_PATH: join(dir, 'path') }, encoding: 'utf8'
  });
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
});

test('runtime selector accepts only the expected cached Node version', () => {
  const dir = mkdtempSync(join(tmpdir(), 'registry-ci-version-'));
  const bin = join(dir, 'node', '24.20.0', 'x64', 'bin');
  mkdirSync(bin, { recursive: true });
  symlinkSync(process.execPath, join(bin, 'node'));
  const result = spawnSync('bash', [fileURLToPath(new URL('../scripts/select-ci-runtime.sh', import.meta.url))], {
    env: { ...process.env, RUNNER_TOOL_CACHE: dir, GITHUB_PATH: join(dir, 'path') }, encoding: 'utf8'
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status === 0, process.versions.node === '24.20.0');
});
