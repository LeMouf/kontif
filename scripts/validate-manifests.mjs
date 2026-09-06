import { readHistory, validateHistory } from './releases.mjs';
try {
  const [directory, previousDirectory, ...extra] = process.argv.slice(2);
  if (!directory || extra.length) throw new Error('Usage: node scripts/validate-manifests.mjs DIRECTORY [BASELINE_DIRECTORY]');
  console.log(JSON.stringify(validateHistory(readHistory(directory), previousDirectory ? readHistory(previousDirectory) : [])));
} catch (error) {
  console.error(`Manifest validation refused: ${error.message}`); process.exitCode = 1;
}
