import { fileURLToPath } from 'node:url';
import { recordCandidate } from './staged-manifests.mjs';
try {
  const [directory, digest, ...extra] = process.argv.slice(2);
  if (!directory || !digest || extra.length) throw new Error('Usage: node scripts/record-candidate.mjs STAGED_DIRECTORY EXPECTED_SHA256');
  const cwd = fileURLToPath(new URL('..', import.meta.url));
  console.log(JSON.stringify(recordCandidate(cwd, fileURLToPath(new URL('../ecosystem/releases', import.meta.url)), directory, digest)));
} catch (error) {
  console.error(`Candidate recording refused: ${error.message}`); process.exitCode = 1;
}
