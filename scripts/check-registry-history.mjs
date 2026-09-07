import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { validateRegistry } from './registry.mjs';
try {
  const [base, ...extra] = process.argv.slice(2);
  if (extra.length || !/^[a-f0-9]{40}$/.test(base ?? '')) throw Error('Full trusted baseline commit required');
  const previous = JSON.parse(execFileSync('git', ['show', `${base}:ecosystem/registry.json`], { encoding: 'utf8' }));
  const current = JSON.parse(readFileSync('ecosystem/registry.json', 'utf8'));
  if (current.schemaVersion !== 2) throw Error('Current registry requires schema 2');
  console.log(JSON.stringify(validateRegistry(current, previous)));
} catch (error) {
  console.error(`Registry history refused: ${error.message}`);
  process.exitCode = 1;
}
