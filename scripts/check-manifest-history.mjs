import { validateGitManifestHistory } from './git-manifest-history.mjs';
try {
  const args = process.argv.slice(2);
  if (args.length !== 2) throw new Error('Usage: node scripts/check-manifest-history.mjs BASE_SHA HEAD_SHA');
  console.log(JSON.stringify(validateGitManifestHistory(process.cwd(), ...args)));
} catch (error) {
  console.error(`Git manifest history refused: ${error.message}`);
  process.exitCode = 1;
}
