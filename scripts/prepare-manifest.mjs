import { execFileSync } from 'node:child_process';
import { createManifest, manifestDigest, readHistory, validateHistory } from './releases.mjs';
import { stageManifest } from './staged-manifests.mjs';
import { fileURLToPath } from 'node:url';

try {
  const [version, createdAt, commit, status = 'draft', ...extra] = process.argv.slice(2);
  if (extra.length || !version || !createdAt || !/^[a-f0-9]{40}$/.test(commit ?? '') || !['draft', 'candidate'].includes(status)) throw new Error('Usage: node scripts/prepare-manifest.mjs VERSION UTC_DATE FULL_REGISTRY_COMMIT [draft|candidate]');
  const cwd = fileURLToPath(new URL('..', import.meta.url));
  const resolved = execFileSync('git', ['rev-parse', `${commit}^{commit}`], { cwd, encoding: 'utf8' }).trim();
  if (resolved !== commit) throw new Error('Input must identify an existing commit');
  execFileSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], { cwd });
  const snapshot = JSON.parse(execFileSync('git', ['show', `${commit}:ecosystem/registry.json`], { cwd, encoding: 'utf8' }));
  const directory = fileURLToPath(new URL('../ecosystem/releases', import.meta.url));
  const history = readHistory(directory);
  const referenced = new Set(history.map(m => m.previousDigest));
  const tip = history.find(m => !referenced.has(manifestDigest(m)));
  const m = createManifest(snapshot, { version, createdAt, registrySourceCommit: commit, previousDigest: tip ? manifestDigest(tip) : null, status });
  validateHistory([...history, m], history);
  console.log(JSON.stringify({ path: stageManifest(m), status, sha256: manifestDigest(m), recorded: false, releaseAdmitted: false }));
} catch (error) {
  console.error(`Manifest preparation refused: ${error.message}`); process.exitCode = 1;
}
