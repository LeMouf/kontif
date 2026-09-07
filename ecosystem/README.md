# Dynamic registry contract, schema 2

`ecosystem/registry.json` is the authored authority for current ecosystem scope.
Git records successive states; an exact commit identifies a historical perimeter.
Neither a site projection nor an optional global release owns current membership.
Git commit dates help locate a state, but do not authenticate a legal effective
date. Use the actual applicable commit and the agreement's temporal rules.

## Independent dimensions

This is the KONITIF ecosystem registry, not a directory of partners. Its common
reference model can support any partnership type. First Partner is one possible
application, not a special membership regime or a prerequisite for the registry.
Each agreement determines its own grants and applicable scope by reference to
the registry where appropriate. No `partnerType` or nominative beneficiary field
belongs in this public component model. Agreement-specific records and private
access proofs remain separate; one partner's agreement grants no rights to others.

| Dimension | Meaning | Does not establish |
| --- | --- | --- |
| `membership: included` | Voluntary ecosystem scope decision | A commercial licence grant |
| Registry `status` | Technical maintenance state | Component ownership or licence rights |
| `accessibility` | Generic distribution access category | Nominative partner access |
| `legalProvenance` | Qualification of declared rights and licensing authority | Technical maturity or an automatic legal guarantee |
| `license` and separate agreements | Applicable notices and actual grants | Rights inferred merely from membership |
| Optional ecosystem release | Evidence and stabilization snapshot | Authority over current registry evolution |

Every `included` entry belongs to the ecosystem perimeter regardless of registry
technical status or availability of an ecosystem release. Private company
components and dependencies are never automatically included. Actual commercial
rights come from an applicable public licence or a separate agreement, not this
registry. No package licence is changed by this format.

Technical statuses are `draft` (inventory or process still being consolidated),
`active` (operationally maintained inventory), and `archived` (retained technical
state, not actively maintained). None changes the scope of `included` entries.
These are declarations, not automatic freeze controls. A new status requires a
reviewed schema, validator, documentation and test change. Component technical
maturity is not inferred from legal qualification or the registry's global state.

## Legal provenance

Each component requires a closed `legalProvenance` object:

- `status`: `declared`, `verified`, `disputed` or `excluded`.
- `rightsHolder`: declared holder, not an inferred owner.
- `licensingAuthority`: stated basis for the power to license.
- `evidence`: public references with `reference` (HTTPS URL) and `claim`.
  An empty list is honest when no reviewed evidence is available.
- A recorded attribution declaration may be referenced here while status remains
  `declared`. A reference is not a finding of verified ownership. For example,
  [Core attribution](core-attribution.md) identifies the exact version and source
  commit covered by the declaration, without clearing independent review unknowns.
- `unknowns`: unresolved questions or consolidation actions.
- `qualifiedOn`: real calendar date in YYYY-MM-DD.
- `qualifiedBy`: optional qualifier; required for `verified`.

`declared` records the licensor's assertion and permits inclusion while evidence
is consolidated. `verified` requires human-reviewed evidence supporting rights
and licensing authority, a named qualifier and no unresolved legal unknowns.
The local validator checks these structural prerequisites only; it cannot judge
legal sufficiency, authenticate the reviewer or verify remote proof. Never mark
an entry verified solely because it has a release, signature, build or npm record.

`disputed` means rights or licensing authority are contested. A trusted-baseline
comparison refuses any new `included` admission in that state. An already
included entry remains historically visible, is reported as `suspended`, and
cannot change revision, repository, licence, dependencies or accessibility while disputed.
This suspension is not a retroactive determination of existing contractual rights.
A human must qualify resolution before a new exploitable revision is admitted.

`excluded` means voluntarily excluded from the licensable perimeter. It cannot
coexist with `membership: included`; update membership explicitly and preserve
the entry, aliases and history. It does not delete earlier records.

## Accessibility and privacy

`accessibility` is `public`, `authorized-partners` or `restricted`. It is
independent of membership and rights provenance. Public access does not imply
commercial permission; an authorized-partners declaration proves no individual's
access. Keep nominative access evidence in a private journal or external private
support, never in the public registry. Do not add partner identities, private
contract content or private journal paths. Omit confidential locators and record
generic unknowns instead. Public references are not checked for actual reachability.

## Identity, validation and historical compatibility

IDs outlive names, versions and repositories. Sort IDs, aliases and dependencies.
Keep former names as aliases; removed/replaced components remain tombstones.
Dependencies and replacement references must resolve without self-reference or
replacement cycles. Unknown revision data needs explicit component unknowns.

`registry.schema.json` defines current schema 2. `registry.v1.schema.json`
preserves the historical schema unchanged. Readers and manifest digests support
both; current CI requires schema 2 and refuses downgrades. Historical manifests
are not rewritten, migrated or newly approved. Adding provenance changes the
current document digest but never an old snapshot's digest.

`scripts/registry.mjs` evaluates the authored subset of JSON Schema offline;
unsupported schema keywords fail closed. Semantic checks enforce dates, URLs,
legal prerequisites, identities and continuity. No library installation is needed.

```sh
node scripts/validate-registry.mjs ecosystem/registry.json previous-registry.json
node scripts/check-registry-history.mjs BASE_SHA
```

The first command supports historical schema 1 input for compatibility. The
second reads the current working registry against the trusted committed baseline
and requires schema 2. CI supplies the PR base or previous push commit. Standalone
validation cannot detect whether an entry is new; its `historyChecked` result
makes this limitation explicit. Neither command traverses all history or proves
that supplied declarations are true.

Repository and proof URLs retain the existing HTTPS GitHub/npm allowlist without
credentials, queries or private local paths. This is not an exhaustive secret or
personal-data scanner: public content requires human review.

Canonical encoding remains sorted object keys, compact JSON, authored array
order, UTF-8 and no trailing newline. SHA-256 covers the whole document; no
embedded digest. No external canonicalization standard is claimed.

## Migration and optional releases

The initial schema-2 migration retained every previous field, reference and
unknown for Core and Composition. That migration is tested on frozen fixtures;
the current registry may subsequently record new evidence and resolve related
unknowns through reviewed changes. Historical snapshots remain unchanged. The
licensor's declaration of personal rights is recorded as `declared`; no evidence
is invented and no element is promoted to `verified`. Accessibility is public,
consistent with their existing public distribution references. The technical
status stays draft, without delaying their existing included scope.

Optional release candidates retain their stronger evidence requirements under
[RELEASE_POLICY.md](../RELEASE_POLICY.md). Those requirements must never gate
ordinary current inclusion. No official release, tag or partner grant is created
by validation or this migration.
