import { readFileSync } from 'node:fs';
import { validateRegistry, registryDigest } from './registry.mjs';
try {
  const args = process.argv.slice(2);
  if (args.includes('--release')) throw new Error('Release admission is not implemented; no release can be approved.');
  if (args.length < 1 || args.length > 2 || args.some(a => a.startsWith('--'))) throw new Error('Usage: node scripts/validate-registry.mjs registry.json [previous-registry.json]');
  const [current, previous] = args.map(file => JSON.parse(readFileSync(file, 'utf8')));
  console.log(JSON.stringify({ ...validateRegistry(current, previous ?? null), sha256: registryDigest(current) }, null, 2));
} catch (error) {
  console.error(`Registry validation refused: ${error.message}`);
  process.exitCode = 1;
}
