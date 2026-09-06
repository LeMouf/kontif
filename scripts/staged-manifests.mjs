import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalRegistry } from './registry.mjs';
import { validateManifest, manifestBytes, manifestDigest, writeManifest } from './releases.mjs';

export function stageManifest(manifest) {
  validateManifest(manifest);
  const directory = mkdtempSync(join(tmpdir(), 'konitif-manifest-stage-'));
  writeFileSync(join(directory, 'manifest.json'), manifestBytes(manifest), { flag: 'wx' });
  writeFileSync(join(directory, 'manifest.sha256'), `${manifestDigest(manifest)}\n`, { flag: 'wx' });
  return directory;
}

export function recordCandidate(cwd, historyDirectory, stagedDirectory, expectedDigest) {
  if (typeof expectedDigest !== 'string' || !/^[a-f0-9]{64}$/.test(expectedDigest)) throw new Error('Exact expected manifest digest required');
  if (readdirSync(stagedDirectory).sort().join(',') !== 'manifest.json,manifest.sha256') throw new Error('Incomplete or unexpected staged bundle');
  for (const file of ['manifest.json', 'manifest.sha256']) {
    if (!lstatSync(join(stagedDirectory, file)).isFile()) throw new Error('Staged bundle requires regular files');
  }
  const bytes = readFileSync(join(stagedDirectory, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(bytes);
  validateManifest(manifest);
  if (manifest.status !== 'candidate') throw new Error('Only a complete candidate may enter permanent history');
  if (bytes !== manifestBytes(manifest) || manifestDigest(manifest) !== expectedDigest ||
      readFileSync(join(stagedDirectory, 'manifest.sha256'), 'utf8') !== `${expectedDigest}\n`) throw new Error('Staged manifest digest mismatch');
  execFileSync('git', ['merge-base', '--is-ancestor', manifest.registrySourceCommit, 'HEAD'], { cwd });
  const source = JSON.parse(execFileSync('git', ['show', `${manifest.registrySourceCommit}:ecosystem/registry.json`], { cwd, encoding: 'utf8' }));
  if (canonicalRegistry(source) !== canonicalRegistry(manifest.snapshot)) throw new Error('Candidate differs from committed registry source');
  return { path: writeManifest(historyDirectory, manifest), sha256: expectedDigest, status: 'candidate', releaseAdmitted: false };
}
