import { execFileSync } from 'node:child_process';
import { canonicalRegistry } from './registry.mjs';
import { manifestBytes, manifestDigest, validateHistory } from './releases.mjs';

function check(condition, message) { if (!condition) throw new Error(message); }
export function validateGitManifestHistory(cwd, base, head) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  for (const sha of [base, head]) {
    check(typeof sha === 'string' && /^[0-9a-f]{40}$/.test(sha) && sha !== '0'.repeat(40), 'Full nonzero base and head commits required');
    check(git('rev-parse', `${sha}^{commit}`).trim() === sha, 'Commit unavailable');
  }
  git('merge-base', '--is-ancestor', base, head);
  function tree(sha) {
    const files = new Map();
    const entries = git('ls-tree', '-rz', sha, '--', 'ecosystem/releases').split('\0').filter(Boolean);
    for (const entry of entries) {
      const match = /^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/.exec(entry);
      check(match, 'Invalid tree entry');
      const [, mode, type, oid, path] = match;
      if (path === 'ecosystem/releases/README.md') continue;
      check(mode === '100644' && type === 'blob', 'Manifest bundle must contain regular non-executable files');
      check(/^ecosystem\/releases\/(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\/manifest\.(json|sha256)$/.test(path), 'Unexpected bundle path');
      files.set(path, { oid, bytes: git('cat-file', 'blob', oid) });
    }
    return files;
  }
  function manifests(files) {
    const result = [];
    for (const [path, file] of files) {
      if (!path.endsWith('.json')) continue;
      const m = JSON.parse(file.bytes);
      check(path === `ecosystem/releases/${m.version}/manifest.json`, 'Version/path mismatch');
      check(file.bytes === manifestBytes(m), 'Noncanonical manifest bytes');
      check(files.get(path.replace(/\.json$/, '.sha256'))?.bytes === `${manifestDigest(m)}\n`, 'Missing or incorrect detached digest');
      result.push(m);
    }
    check(files.size === result.length * 2, 'Orphan digest or partial bundle');
    validateHistory(result);
    return result;
  }
  const oldFiles = tree(base), newFiles = tree(head);
  for (const [path, file] of oldFiles) check(newFiles.get(path)?.oid === file.oid, 'Historical manifest file rewritten or removed');
  const previous = manifests(oldFiles), current = manifests(newFiles);
  validateHistory(current, previous);
  for (const m of current) {
    if (!oldFiles.has(`ecosystem/releases/${m.version}/manifest.json`)) check(m.status === 'candidate', 'New permanent manifest must be a complete candidate');
    git('merge-base', '--is-ancestor', m.registrySourceCommit, head);
    const snapshot = JSON.parse(git('show', `${m.registrySourceCommit}:ecosystem/registry.json`));
    check(canonicalRegistry(snapshot) === canonicalRegistry(m.snapshot), 'Snapshot does not match declared registry source commit');
  }
  return { valid: true, base, head, manifests: current.length, protectedFiles: oldFiles.size, releaseAdmitted: false };
}
