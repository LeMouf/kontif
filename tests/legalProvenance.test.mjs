import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { validateRegistry, registryDigest } from '../scripts/registry.mjs';
import { createManifest } from '../scripts/releases.mjs';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const current = read('../ecosystem/registry.json');
const previous = read('./fixtures/pre-first-partner-registry.json');
const fresh = () => structuredClone(current);

test('migration preserves every historical field and declares no reviewed legal evidence', () => {
  validateRegistry(current, previous);
  assert.equal(current.components.length, previous.components.length);
  for (let i=0; i<previous.components.length; i++) {
    const {accessibility, legalProvenance, ...retained} = current.components[i];
    assert.deepEqual(retained, previous.components[i]);
    assert.equal(accessibility, 'public');
    assert.equal(legalProvenance.status, 'declared');
    assert.deepEqual(legalProvenance.evidence, []);
    assert.ok(legalProvenance.unknowns.length);
  }
  assert.deepEqual(current.unknowns, previous.unknowns);
});
test('technical status and accessibility do not change included scope or grant release', () => {
  for (const status of ['draft','active','archived']) for (const access of ['public','authorized-partners','restricted']) {
    const r=fresh();r.status=status;r.components[0].accessibility=access;
    const result=validateRegistry(r,previous);
    assert.equal(result.status,status);assert.deepEqual(result.included,current.components.map(c=>c.id));
    assert.equal(result.releaseAdmitted,false);
  }
});
test('legal schema rejects omissions, unknown states, invalid dates and confidential extensions', () => {
  for (const change of [
    c=>{delete c.legalProvenance;},c=>{delete c.accessibility;},
    c=>{c.legalProvenance.status='approved';},c=>{c.accessibility='private-company';},
    c=>{c.legalProvenance.qualifiedOn='2026-02-30';},
    c=>{c.legalProvenance.partnerName='private';},
    c=>{c.legalProvenance.rightsHolder=' ';},
    c=>{c.legalProvenance.licensingAuthority='';},
    c=>{c.legalProvenance.unknowns=[];},
    c=>{c.legalProvenance.evidence=[{reference:'file:///private/access',claim:'private journal'}];}
  ]) {const r=fresh();change(r.components[0]);assert.throws(()=>validateRegistry(r));}
});
test('verified is a reviewed declaration, never inferred from technical artifact evidence', () => {
  const r=fresh(), legal=r.components[0].legalProvenance;
  legal.status='verified';assert.throws(()=>validateRegistry(r),/reviewed evidence/);
  legal.evidence=[{reference:'https://github.com/example/evidence',claim:'Synthetic test-only rights review'}];
  legal.unknowns=[];assert.throws(()=>validateRegistry(r),/reviewer/);
  legal.qualifiedBy='Synthetic test reviewer';validateRegistry(r);
  assert.notEqual(registryDigest(r),registryDigest(current));
});
test('disputed historical inclusion stays visible but new inclusion or revision is refused', () => {
  const r=fresh();r.components[0].legalProvenance.status='disputed';
  assert.deepEqual(validateRegistry(r,previous).suspended,[r.components[0].id]);
  const old=fresh();old.components[0].membership='experimental';
  assert.throws(()=>validateRegistry(r,old),/new disputed inclusion/);
  const absent=fresh();absent.components.shift();
  assert.throws(()=>validateRegistry(r,absent),/new disputed inclusion/);
  r.components[0].revision.version='0.284.3';
  assert.throws(()=>validateRegistry(r,previous),/exploitable revision/);
});
test('legal exclusion refuses included but retains the historical entry', () => {
  const r=fresh();r.components[0].legalProvenance.status='excluded';
  assert.throws(()=>validateRegistry(r),/excluded/);
  r.components[0].membership='excluded';validateRegistry(r,current);
  r.components.shift();assert.throws(()=>validateRegistry(r,current),/silent removal/);
});
test('schema downgrade and legal qualification date regression are refused', () => {
  assert.throws(()=>validateRegistry(previous,current),/downgrade/);
  const old=fresh();old.components[1].legalProvenance.qualifiedOn='2026-09-08';
  assert.throws(()=>validateRegistry(current,old),/date regressed/);
});
test('legacy canonical bytes remain unchanged and require no legal field injection', () => {
  const encode=value=>Array.isArray(value)?`[${value.map(encode).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${encode(value[key])}`).join(',')}}`:JSON.stringify(value);
  assert.equal(registryDigest(previous),createHash('sha256').update(encode(previous)).digest('hex'));
  assert.equal(previous.components[0].legalProvenance,undefined);
});
test('history CLI validates the working registry against the committed pre-migration baseline', () => {
  const cwd=new URL('..',import.meta.url);
  const base=execFileSync('git',['rev-parse','HEAD'],{cwd,encoding:'utf8'}).trim();
  const output=execFileSync(process.execPath,['scripts/check-registry-history.mjs',base],{cwd,encoding:'utf8'});
  assert.equal(JSON.parse(output).historyChecked,true);
  assert.throws(()=>execFileSync(process.execPath,['scripts/check-registry-history.mjs','main'],{cwd,stdio:'pipe'}));
});
test('optional candidate evidence does not gate the current declared registry', () => {
  const r=fresh();r.unknowns=[];for(const c of r.components)c.unknowns=[];
  validateRegistry(r);
  assert.throws(()=>createManifest(r,{version:'0.0.1',createdAt:'2026-09-07T00:00:00.000Z',registrySourceCommit:'a'.repeat(40),status:'candidate'}),/legal provenance/);
});
