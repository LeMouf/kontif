import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRegistry } from '../scripts/registry.mjs';
const current = JSON.parse(readFileSync(new URL('../ecosystem/registry.json', import.meta.url), 'utf8'));
const widgets = current.components.find(item => item.id === 'konitif:widgets');

test('Widgets admission records published identity without inventing legal verification', () => {
  assert.equal(validateRegistry(current).valid, true);
  assert.equal(widgets.membership, 'included');
  assert.equal(widgets.accessibility, 'public');
  assert.equal(widgets.revision.version, '0.285.0');
  assert.equal(widgets.revision.sourceCommit, 'd9f2b809d7b8b691ec20cb4f6759e7b924c4ff21');
  assert.equal(widgets.revision.artifact.integrity, 'sha512-gQexEiCo8cUIUaa6vOt2qOeGM49vutitY47vcgPULDHQ/Lea5AP+5lxOlfQ3ud0M+4zACAHAZdCj6R3iJ8EfaQ==');
  assert.deepEqual(widgets.dependencies, []);
  assert.equal(widgets.legalProvenance.status, 'declared');
  assert.equal(widgets.legalProvenance.rightsHolder, 'Maxime Mouflard');
  assert.ok(widgets.legalProvenance.unknowns.length > 0);
  assert.equal(validateRegistry(current).releaseAdmitted, false);
});

test('publication and attribution cannot silently verify Widgets ownership', () => {
  const promoted = structuredClone(current);
  promoted.components.find(item => item.id === widgets.id).legalProvenance.status = 'verified';
  assert.throws(() => validateRegistry(promoted), /reviewed evidence|reviewer|unknowns/);
  const declaration = readFileSync(new URL('../ecosystem/konitif-attribution.md', import.meta.url), 'utf8');
  assert.match(declaration, /not automatic admission/);
  assert.match(declaration, /grants no additional licence/);
});
