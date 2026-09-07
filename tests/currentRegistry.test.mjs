import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRegistry } from '../scripts/registry.mjs';
import { createManifest } from '../scripts/releases.mjs';
const current = JSON.parse(readFileSync(new URL('../ecosystem/registry.json', import.meta.url), 'utf8'));
const previous = JSON.parse(readFileSync(new URL('./fixtures/core-registry.json', import.meta.url), 'utf8'));

test('Tools is included by immutable distribution reference and resolves its Core dependency', () => {
  const tools = current.components.find(item => item.id === 'konitif:tools');
  assert.equal(tools.name, '@konitif/tools');
  assert.equal(tools.membership, 'included');
  assert.equal(tools.accessibility, 'public');
  assert.equal(tools.repository, 'https://github.com/LeMouf/konitif-tools');
  assert.equal(tools.revision.version, '0.284.2');
  assert.equal(tools.revision.sourceCommit, '10bfcf29447ce8967fbd172121eea5b9fdd13705');
  assert.equal(tools.revision.artifact.url, 'https://registry.npmjs.org/@konitif/tools/-/tools-0.284.2.tgz');
  assert.equal(tools.revision.artifact.integrity, 'sha512-YQj/VCyZ6oE95J2uVRHY46X8QR1a1EuNl7Z3Ycf++OPd3BPAjlTaxQpJGLPU+yTMOzgf3LKEbLC0CNmmHC6SAQ==');
  assert.deepEqual(tools.dependencies, ['konitif:core']);
  assert.equal(current.components.find(item => item.id === tools.dependencies[0]).revision.version, '0.284.2');
  assert.equal(tools.license, 'PolyForm-Noncommercial-1.0.0');
  assert.equal(tools.legalProvenance.status, 'declared');
  assert.deepEqual(tools.legalProvenance.evidence, []);
  assert.ok(tools.legalProvenance.unknowns.length > 0);
  assert.ok(tools.unknowns.some(value => value.includes('signature verification')));
  assert.equal(validateRegistry(current, previous).valid, true);
  assert.equal(validateRegistry(current).releaseAdmitted, false);
});

test('Tools cannot resolve an absent dependency or infer verified rights from publication', () => {
  const missing = structuredClone(current);
  missing.components.find(item => item.id === 'konitif:tools').dependencies = ['konitif:missing'];
  assert.throws(() => validateRegistry(missing));
  const promoted = structuredClone(current);
  promoted.components.find(item => item.id === 'konitif:tools').legalProvenance.status = 'verified';
  assert.throws(() => validateRegistry(promoted), /reviewed evidence/);
});

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
