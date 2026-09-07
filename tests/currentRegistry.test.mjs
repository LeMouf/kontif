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

test('Core attribution is a scoped declaration, separate from technical evidence', () => {
  const core = current.components.find(item => item.id === 'konitif:core');
  const legal = core.legalProvenance;
  const attribution = readFileSync(new URL('../ecosystem/core-attribution.md', import.meta.url), 'utf8');
  assert.equal(legal.status, 'declared');
  assert.equal(legal.rightsHolder, 'Maxime Mouflard');
  assert.equal(legal.qualifiedBy, undefined);
  assert.ok(legal.unknowns.some(value => value.includes('Independent ownership verification')));
  assert.ok(legal.unknowns.some(value => value.includes('licensing authority')));
  assert.ok(core.unknowns.some(value => value.includes('third-party contribution review')));
  const reference = legal.evidence.find(item => item.reference.endsWith('/ecosystem/core-attribution.md'));
  assert.equal(reference.reference, 'https://github.com/LeMouf/kontif/blob/main/ecosystem/core-attribution.md');
  assert.match(reference.claim, /not an independent legal verification/);
  assert.ok(attribution.includes(core.revision.version));
  assert.ok(attribution.includes(core.revision.sourceCommit));
  assert.match(attribution, /grants no additional licence or partner rights/);
  assert.ok(core.evidence.every(item => !item.url.endsWith('/core-attribution.md')));
  assert.equal(validateRegistry(current, previous).valid, true);
});

test('recording Core attribution alone cannot promote legal provenance to verified', () => {
  const changed = structuredClone(current);
  changed.components.find(item => item.id === 'konitif:core').legalProvenance.status = 'verified';
  assert.throws(() => validateRegistry(changed), /reviewed evidence|reviewer|unknowns/);
});
