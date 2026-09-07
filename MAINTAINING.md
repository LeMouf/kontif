# Maintainer guide

## Required policy for every future component repository

Register references, never copies of component code. Review a current registry
change independently of whether any ecosystem release is planned. An `included`
entry expresses voluntary inclusion; it does not itself grant commercial rights.

Apply this policy uniformly across partnership types. First Partner is a use
case, not the name or owner of the registry contract. Do not specialize component
membership, legal provenance or accessibility for a particular partner category.
Keep agreement-specific grants and nominative evidence in separate appropriate
supports rather than adding partner fields or duplicating the current registry.

Before adding a component or changing its accessible revision:

- Preserve stable IDs, aliases, dependencies and existing tombstones.
- Set `accessibility` to `public`, `authorized-partners` or `restricted`.
- Record `legalProvenance`: declared holder, licensing authority, status, public
  evidence references, unresolved consolidation actions and qualification date.
- Use `declared` for the licensor's assertion, not `verified` by inference from
  a successful build, npm publication, signature or mature technical status.
- When recording an attribution declaration, state its covered version and source
  commit, link it from `legalProvenance.evidence`, and retain unresolved independent
  rights review questions. Update the qualification date without inventing a
  reviewer. Commit the declaration with its registry reference; a `main` URL only
  becomes available there after merge. Use the exact registry commit for historical
  interpretation, not the future contents of that moving URL.
- Use `verified` only after a human review of sufficient rights and licensing
  authority evidence; identify the reviewer and evidence. The validator checks
  completeness, not truth, legal sufficiency or reviewer authentication.
- A disputed existing inclusion stays recorded and suspended for new exploitable
  revisions. New disputed inclusions are refused against the trusted baseline.
  Resolve the dispute through explicit human qualification before resuming.
- A legally excluded element cannot remain `included`; retain its record and
  historical identifiers. Do not infer changes to existing contractual rights.
- Never put partner names, nominative access proofs, private contract content,
  tokens or private journal locations in the public registry. Keep nominative
  access evidence in a separate private support; public accessibility is only
  a generic declaration, not proof of a particular recipient's access.

Run all checks before review (BASE_SHA is the trusted PR base commit):

```sh
node --test tests/*.test.mjs
node scripts/validate-registry.mjs ecosystem/registry.json
node scripts/check-registry-history.mjs BASE_SHA
node scripts/validate-manifests.mjs ecosystem/releases
node scripts/check-manifest-history.mjs BASE_SHA HEAD_SHA
```

The registry history check also runs in `validate` CI and requires current schema
2. General readers retain schema 1 support solely for historical compatibility.
A standalone shape check cannot establish whether an inclusion is new; review
against a trusted predecessor is mandatory. Git dates are historical evidence,
not a trusted legal timestamp: record the exact applicable commit and verify
any contractual effective-date interpretation separately. No release is required.

## Continuous integration

The required check is `validate`, provided by GitHub Actions. It runs tests and
validates registry and manifest bundles. Node 24.20.0 must be present in the
runner tool cache; absence causes failure, not a runtime download. No npm install
or publication step is configured. The pinned checkout action and runner are
provided by GitHub, so this is not an air-gapped execution environment.

The same `validate` check compares manifest blobs to the PR base and verifies
snapshot source commits. Checkout fetches full history; the validator needs no
network access. On main pushes the baseline is the previous push SHA. Manual
dispatch checks the current commit against itself, not against an earlier release.
Review workflow and validation-code changes explicitly, since these are part of
the enforcement mechanism. No additional required check name is introduced.

## GitHub configuration

In Settings > Branches, add a branch protection rule for `main`:

- Require a pull request before merging.
- Require status checks to pass: select `validate` from GitHub Actions.
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Do not allow bypassing the above settings.
- Keep force pushes and branch deletion disabled.

For a sole maintainer, leave required approvals disabled; enable an independent
review requirement when another reviewer is available. Workflow presence alone
does not establish branch protection. Save and check the rule in repository settings.

See [GitHub's branch protection documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule).

No npm secret or publishing environment is needed for reference validation.
Official release publication and tag protection must be configured as part of a
separate approved release workflow; the current tools cannot admit `released`.
See [release admission policy](RELEASE_POLICY.md) for the confirmed manual approver,
exact approval subject and remaining activation requirements. The proposed
`ecosystem-release` environment is not needed for the existing validation CI.

## Public documentation

The README describes the project, supported usage and licence. Keep execution
logs, workstation details, assistant reports and task-by-task progress out of it.
Document lasting technical contracts here or alongside the relevant format.
Track implementation progress separately from public product documentation.
