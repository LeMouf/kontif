import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const schema = JSON.parse(readFileSync(new URL('../ecosystem/registry.schema.json', import.meta.url), 'utf8'));
const legacySchema = JSON.parse(readFileSync(new URL('../ecosystem/registry.v1.schema.json', import.meta.url), 'utf8'));
const keywords = new Set(['$schema', 'title', 'type', 'const', 'enum', 'additionalProperties', 'required', 'properties', 'items', 'minItems', 'uniqueItems', 'minLength', 'pattern']);
const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
// Restricted evaluator for this authored schema, not a general JSON Schema library.
function checkSchema(s) {
  for (const key of Object.keys(s)) if (!keywords.has(key)) fail('schema', `unsupported keyword ${key}`);
  for (const child of Object.values(s.properties ?? {})) checkSchema(child);
  if (s.items) checkSchema(s.items);
}
checkSchema(schema);
checkSchema(legacySchema);
function shape(value, s, path = '$') {
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (s.type && ![s.type].flat().includes(type)) fail(path, 'wrong type');
  if ('const' in s && value !== s.const) fail(path, 'unexpected constant');
  if (s.enum && !s.enum.includes(value)) fail(path, 'unknown value');
  if (type === 'string') {
    if ([...value].length < (s.minLength ?? 0) || !value.trim()) fail(path, 'empty string');
    if (s.pattern && !new RegExp(s.pattern, 'u').test(value)) fail(path, 'invalid format');
    if (/\u2019|(?:(?:^|\s)[A-Za-z]:[\\/]|\/mnt\/|\/home\/|file:\/\/|https?:\/\/[^\s/]+@|\bnpm_[A-Za-z0-9]+|\bgh[pousr]_[A-Za-z0-9]+)/u.test(value)) fail(path, 'unsafe or non-portable text');
  }
  if (type === 'object') {
    for (const key of s.required ?? []) if (!Object.hasOwn(value, key)) fail(path, `missing ${key}`);
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(s.properties ?? {}, key)) fail(path, `unknown field ${key}`);
      shape(value[key], s.properties[key], `${path}.${key}`);
    }
  }
  if (type === 'array') {
    if (value.length < (s.minItems ?? 0)) fail(path, 'too few items');
    if (s.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) fail(path, 'duplicate item');
    value.forEach((v, i) => shape(v, s.items, `${path}[${i}]`));
  }
}
function publicUrl(value, path) {
  let url;
  try { url = new URL(value); } catch { fail(path, 'invalid URL'); }
  if (url.protocol !== 'https:' || !['github.com', 'registry.npmjs.org'].includes(url.hostname) ||
      url.username || url.password || url.port || url.search || url.hash) fail(path, 'unsupported public URL');
}
function sortedUnique(values, path) {
  if (values.some((v, i) => i && values[i - 1] >= v)) fail(path, 'must be sorted and unique');
}
function date(value, path) {
  if (value !== null && (Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) fail(path, 'invalid date');
}
export function validateRegistry(registry, previous = null) {
  shape(registry, registry?.schemaVersion === 1 ? legacySchema : schema);
  if (previous?.schemaVersion === 2 && registry.schemaVersion !== 2) fail('$', 'schema downgrade refused');
  const entries = registry.components;
  sortedUnique(entries.map(c => c.id), 'components');
  const ids = new Map(entries.map(c => [c.id, c]));
  const names = new Set();
  for (const c of entries) {
    sortedUnique(c.aliases, `${c.id}.aliases`);
    sortedUnique(c.dependencies, `${c.id}.dependencies`);
    for (const name of [c.name, ...c.aliases]) {
      if (names.has(name)) fail(c.id, 'name or alias collision');
      names.add(name);
    }
    date(c.introducedOn, c.id); date(c.retiredOn, c.id);
    if (registry.schemaVersion === 2) {
      const legal = c.legalProvenance;
      date(legal.qualifiedOn, `${c.id}.legalProvenance.qualifiedOn`);
      if (legal.qualifiedOn < c.introducedOn) fail(c.id, 'qualification predates introduction');
      for (const evidence of legal.evidence) publicUrl(evidence.reference, c.id);
      if (legal.status === 'verified' && (!legal.evidence.length || legal.unknowns.length || !legal.qualifiedBy)) fail(c.id, 'verified requires reviewed evidence, reviewer and no legal unknowns');
      if (['declared', 'disputed'].includes(legal.status) && !legal.unknowns.length) fail(c.id, 'unconsolidated legal status requires explicit unknowns');
      if (legal.status === 'excluded' && c.membership === 'included') fail(c.id, 'legally excluded component cannot be included');
    }
    if (['removed', 'replaced'].includes(c.membership) !== (c.retiredOn !== null)) fail(c.id, 'retirement date/status mismatch');
    if (c.retiredOn && c.retiredOn < c.introducedOn) fail(c.id, 'retired before introduction');
    if ((c.membership === 'replaced') !== (c.replacedBy !== null)) fail(c.id, 'replacement/status mismatch');
    for (const target of [...c.dependencies, ...(c.replacedBy ? [c.replacedBy] : [])]) {
      if (target === c.id || !ids.has(target)) fail(c.id, 'unresolved or self reference');
    }
    const visited = new Set([c.id]);
    let cursor = c;
    while (cursor.replacedBy) {
      if (visited.has(cursor.replacedBy)) fail(c.id, 'replacement cycle');
      visited.add(cursor.replacedBy);
      cursor = ids.get(cursor.replacedBy);
      if (!cursor) fail(c.id, 'unresolved replacement');
    }
    if ((!c.revision.sourceCommit || (c.kind === 'package' && (!c.revision.version || !c.revision.artifact))) && !c.unknowns.length) fail(c.id, 'missing revision requires explicit unknown');
    publicUrl(c.repository, c.id);
    c.evidence.forEach(e => publicUrl(e.url, c.id));
    if (c.revision.artifact) publicUrl(c.revision.artifact.url, c.id);
  }
  if (previous !== null) {
    validateRegistry(previous);
    if (registry.schemaVersion === 2) {
      for (const next of entries.filter(c => c.legalProvenance.status === 'disputed' && c.membership === 'included')) {
        const old = previous.components.find(c => c.id === next.id);
        if (!old || old.membership !== 'included') fail(next.id, 'new disputed inclusion refused');
        if (encode([next.revision, next.repository, next.license, next.dependencies, next.accessibility]) !== encode([old.revision, old.repository, old.license, old.dependencies, old.accessibility ?? next.accessibility])) fail(next.id, 'disputed inclusion cannot expand or change exploitable revision');
      }
    }
    for (const old of previous.components) {
      const next = ids.get(old.id);
      if (!next) fail(old.id, 'silent removal: retain tombstone');
      if (next.introducedOn !== old.introducedOn || next.kind !== old.kind || next.family !== old.family) fail(old.id, 'identity continuity changed');
      if (old.name !== next.name && !next.aliases.includes(old.name)) fail(old.id, 'rename must retain old name as alias');
      if (old.aliases.some(a => !next.aliases.includes(a) && a !== next.name)) fail(old.id, 'historical alias lost');
      if (old.legalProvenance && next.legalProvenance.qualifiedOn < old.legalProvenance.qualifiedOn) fail(old.id, 'legal qualification date regressed');
      if (['removed', 'replaced'].includes(old.membership) &&
          (next.membership !== old.membership || next.retiredOn !== old.retiredOn || next.replacedBy !== old.replacedBy)) fail(old.id, 'tombstone changed');
    }
  }
  return { valid: true, status: registry.status, releaseAdmitted: false,
    included: entries.filter(c => c.membership === 'included').map(c => c.id),
    suspended: entries.filter(c => c.membership === 'included' && c.legalProvenance?.status === 'disputed').map(c => c.id),
    historyChecked: previous !== null,
    unchecked: ['remote availability', 'artifact bytes and signatures', 'ownership and governance approval'] };
}
function encode(value) {
  if (Array.isArray(value)) return `[${value.map(encode).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${encode(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function canonicalRegistry(registry) {
  validateRegistry(registry);
  return encode(registry);
}
export function registryDigest(registry) {
  return createHash('sha256').update(canonicalRegistry(registry), 'utf8').digest('hex');
}
