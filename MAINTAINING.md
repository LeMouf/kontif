# Maintainer guide

## Continuous integration

The required check is `validate`, provided by GitHub Actions. It runs tests and
validates registry and manifest bundles. Node 24.20.0 must be present in the
runner tool cache; absence causes failure, not a runtime download. No npm install
or publication step is configured. The pinned checkout action and runner are
provided by GitHub, so this is not an air-gapped execution environment.

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

## Public documentation

The README describes the project, supported usage and licence. Keep execution
logs, workstation details, assistant reports and task-by-task progress out of it.
Document lasting technical contracts here or alongside the relevant format.
Track implementation progress separately from public product documentation.
