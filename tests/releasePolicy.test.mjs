import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createManifest } from '../scripts/releases.mjs';
const registry = JSON.parse(readFileSync(new URL('../ecosystem/registry.json', import.meta.url), 'utf8'));

test('recorded npm metadata does not erase unresolved candidate evidence', () => {
  const core = registry.components.find(component => component.id === 'konitif:core');
  assert.ok(core.evidence.some(e => e.url === 'https://registry.npmjs.org/@konitif%2fcore/0.284.2'));
  assert.ok(core.unknowns.length > 0);
  assert.throws(() => createManifest(registry, {
    version: '0.0.1', createdAt: '2026-09-06T00:00:00.000Z',
    registrySourceCommit: 'a'.repeat(40), status: 'candidate'
  }), /unknowns/);
});

test('manual approval policy does not enable official publication', () => {
  assert.throws(() => createManifest(registry, {
    version: '0.0.1', createdAt: '2026-09-06T00:00:00.000Z',
    registrySourceCommit: 'a'.repeat(40), status: 'released'
  }), /not implemented/);
});
