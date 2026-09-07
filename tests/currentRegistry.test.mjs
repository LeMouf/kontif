import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRegistry } from '../scripts/registry.mjs';
import { createManifest } from '../scripts/releases.mjs';
const current = JSON.parse(readFileSync(new URL('../ecosystem/registry.json', import.meta.url), 'utf8'));
const previous = JSON.parse(readFileSync(new URL('./fixtures/core-registry.json', import.meta.url), 'utf8'));

test('current draft adds Composition by reference and preserves the Core baseline', () => {
  assert.equal(validateRegistry(current, previous).valid, true);
  assert.equal(validateRegistry(current).releaseAdmitted, false);
  const composition = current.components.find(item => item.id === 'konitif:composition');
  assert.equal(composition.name, '@konitif/composition');
  assert.equal(composition.revision.version, '0.284.2');
  assert.equal(composition.revision.sourceCommit, '57277dae62e3ba94a1c48f9ccdd75dbba96ff308');
  assert.equal(composition.repository, 'https://github.com/LeMouf/konitif-composition');
  assert.equal(composition.revision.artifact.integrity, 'sha512-SpLg8LSY93xDNwSUBWitc+LUmlVMjEzesKyWovC+gB+qxF1JHoWFbV6h6kSTFoLrU3MUH++v3oDHsKw41OtKCA==');
  assert.deepEqual(composition.dependencies, []);
  assert.equal(current.components.find(item => item.id === 'konitif:core').revision.sourceCommit, previous.components[0].revision.sourceCommit);
});

test('recorded Composition distribution does not clear release-admission unknowns', () => {
  const composition = current.components.find(item => item.id === 'konitif:composition');
  assert.ok(composition.unknowns.length > 0);
  assert.throws(() => createManifest(current, {
    version: '0.0.1', createdAt: '2026-09-07T00:00:00.000Z',
    registrySourceCommit: 'a'.repeat(40), status: 'candidate'
  }), /unknowns/);
});
