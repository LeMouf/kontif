# Current registry contract, schema 1

`registry.json` is an authored current draft. It contains no local checkout paths.
`registry.schema.json` defines its closed structural shape; `scripts/registry.mjs`
adds cross-reference, date, URL and history checks. Its small schema evaluator
supports only the keywords used here and rejects new unsupported keywords.
It is not a general JSON Schema library. No schema is fetched from the network.

Component IDs outlive names, versions and repositories. Sort entries by ID;
sort aliases and dependencies lexicographically. Renames preserve former names
as aliases. Removed/replaced components remain tombstones. Validate against the
previous registry to detect silent deletions, lost aliases or tombstone changes:

```sh
node scripts/validate-registry.mjs ecosystem/registry.json previous-registry.json
```

This checks only the supplied baseline; it does not traverse or authenticate Git
history, prove identity against deliberate forgery, or enforce remote immutability.
Historical release support is still deferred. Tests use independent registry
snapshots and must not be interpreted as a completed release workflow.

The component source commit refers to the artifact's revision, not latest main.
Missing package revision data needs explicit unknowns. Evidence is recorded or
unknown, never promoted to cryptographic verification by local validation.
Owner evidence is currently an explicit Core unknown; its richer contract is
deferred. Version 1 supports stable three-part component versions only; prerelease
support requires a deliberate schema update. Repository/evidence URLs currently
allow only HTTPS GitHub and npm registry origins, without credentials or queries.
These checks are not an exhaustive secret scanner; review public content before push.

Digest encoding: sorted object keys, compact JSON, authored array order, UTF-8,
no final newline, SHA-256 of the complete document without an embedded digest.
ID, alias and dependency ordering is checked rather than silently normalized.
Other array reorderings change the digest. This is not a claim of conformance to
an external JSON canonicalization standard. Schema version must change if these
encoding rules change.

Membership is separate from family and from distribution access. Private company
components and dependencies are not automatically included. No licence grant is
created by registry membership. The future site reads this authority; it does
not own it. Releases, detached digest files, Git admission and CI remain the next
tranche; the validator refuses release admission until then.
