import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateRegistry, canonicalRegistry } from './registry.mjs';

const versionPattern = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const digestPattern = /^[a-f0-9]{64}$/;
const fields = ['schemaVersion', 'ecosystem', 'version', 'status', 'createdAt', 'registrySourceCommit', 'expectedTag', 'previousDigest', 'snapshot'];
function requireValue(condition, message) { if (!condition) throw new Error(message); }

export function validateManifest(m) {
  requireValue(m !== null && typeof m === 'object' && !Array.isArray(m), 'Manifest must be an object');
  requireValue(Object.keys(m).length === fields.length && fields.every(k => Object.hasOwn(m, k)), 'Unknown or missing manifest fields');
  requireValue(m.schemaVersion === 1 && m.ecosystem === 'KONITIF', 'Unsupported manifest contract');
  requireValue(typeof m.version === 'string' && versionPattern.test(m.version), 'Exact ecosystem version required');
  requireValue(m.status === 'draft' || m.status === 'candidate', 'Official release admission is not implemented');
  requireValue(typeof m.createdAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(m.createdAt) &&
    !Number.isNaN(Date.parse(m.createdAt)) && new Date(m.createdAt).toISOString() === m.createdAt, 'Exact UTC date required');
  requireValue(typeof m.registrySourceCommit === 'string' && /^[a-f0-9]{40}$/.test(m.registrySourceCommit), 'Full input commit required');
  requireValue(m.expectedTag === `ecosystem-v${m.version}`, 'Tag/version mismatch');
  requireValue(m.previousDigest === null || (typeof m.previousDigest === 'string' && digestPattern.test(m.previousDigest)), 'Invalid previous digest');
  validateRegistry(m.snapshot);
  if (m.status === 'candidate') {
    requireValue(m.snapshot.unknowns.length === 0, 'Candidate contains registry unknowns');
    for (const c of m.snapshot.components) {
      if (m.snapshot.schemaVersion === 2) requireValue(c.legalProvenance.status === 'verified' && c.legalProvenance.unknowns.length === 0, 'Candidate requires reviewed legal provenance; current inclusion does not');
      requireValue(c.unknowns.length === 0 && c.evidence.every(e => e.status === 'recorded'), 'Candidate contains component unknowns');
      requireValue(c.revision.sourceCommit !== null, 'Candidate source is incomplete');
      requireValue(c.kind !== 'package' || (c.revision.version !== null && c.revision.artifact !== null), 'Candidate package is incomplete');
    }
  }
  return { valid: true, status: m.status, releaseAdmitted: false,
    unchecked: ['publication', 'tag existence', 'artifact authenticity', 'governance approval'] };
}

export function createManifest(snapshot, { version, createdAt, registrySourceCommit, previousDigest = null, status = 'draft' }) {
  const manifest = { schemaVersion: 1, ecosystem: 'KONITIF', version, status, createdAt,
    registrySourceCommit, expectedTag: `ecosystem-v${version}`, previousDigest, snapshot: structuredClone(snapshot) };
  validateManifest(manifest);
  return manifest;
}

export function manifestBytes(m) {
  validateManifest(m);
  // Closed envelope keys sorted; nested registry has its own versioned encoding.
  return `{${fields.slice().sort().map(k => `${JSON.stringify(k)}:${k === 'snapshot' ? canonicalRegistry(m.snapshot) : JSON.stringify(m[k])}`).join(',')}}`;
}
export function manifestDigest(m) { return createHash('sha256').update(manifestBytes(m), 'utf8').digest('hex'); }

export function validateHistory(manifests, previousManifests = []) {
  const byDigest = new Map(); const byVersion = new Map();
  for (const m of manifests) {
    validateManifest(m);
    requireValue(!byVersion.has(m.version), 'Duplicate ecosystem version');
    byVersion.set(m.version, m); byDigest.set(manifestDigest(m), m);
  }
  requireValue(manifests.filter(m => m.previousDigest === null).length === (manifests.length ? 1 : 0), 'History must have one root');
  const successors = new Set();
  for (const m of manifests) {
    if (m.previousDigest === null) continue;
    const previous = byDigest.get(m.previousDigest);
    requireValue(previous, 'Missing previous manifest');
    requireValue(!successors.has(m.previousDigest), 'Forked manifest history'); successors.add(m.previousDigest);
    const a = m.version.split('.').map(BigInt), b = previous.version.split('.').map(BigInt);
    const different = a.findIndex((n, i) => n !== b[i]);
    requireValue(different >= 0 && a[different] > b[different], 'Version must increase');
    requireValue(m.createdAt >= previous.createdAt, 'Manifest predates predecessor');
    validateRegistry(m.snapshot, previous.snapshot);
  }
  for (const old of previousManifests) {
    const next = byVersion.get(old.version);
    requireValue(next && manifestBytes(next) === manifestBytes(old), 'Historical manifest rewritten or removed');
  }
  return { valid: true, manifests: manifests.length, releaseAdmitted: false };
}

export function readHistory(directory) {
  const manifests = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'README.md' && entry.isFile()) continue;
    requireValue(entry.isDirectory() && versionPattern.test(entry.name), 'Unexpected history entry');
    const folder = join(directory, entry.name);
    requireValue(readdirSync(folder).sort().join(',') === 'manifest.json,manifest.sha256', 'Unexpected or partial manifest bundle');
    for (const file of ['manifest.json', 'manifest.sha256']) requireValue(lstatSync(join(folder, file)).isFile(), 'Manifest files must be regular files');
    const bytes = readFileSync(join(folder, 'manifest.json'), 'utf8');
    const m = JSON.parse(bytes);
    requireValue(m.version === entry.name && bytes === manifestBytes(m), 'Noncanonical manifest or filename mismatch');
    requireValue(readFileSync(join(folder, 'manifest.sha256'), 'utf8') === `${manifestDigest(m)}\n`, 'Digest mismatch');
    manifests.push(m);
  }
  validateHistory(manifests);
  return manifests;
}

export function writeManifest(directory, m) {
  const history = readHistory(directory);
  validateHistory([...history, m], history);
  const target = join(directory, m.version);
  // Exclusive directory reservation: retries and concurrent writers cannot overwrite.
  // An interrupted write leaves a visibly partial bundle, rejected by readHistory.
  mkdirSync(target);
  writeFileSync(join(target, 'manifest.json'), manifestBytes(m), { flag: 'wx' });
  writeFileSync(join(target, 'manifest.sha256'), `${manifestDigest(m)}\n`, { flag: 'wx' });
  return target;
}
