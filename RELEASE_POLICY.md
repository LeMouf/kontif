# Ecosystem release admission

## Optional snapshot, not current scope authority

The current `ecosystem/registry.json` defines ecosystem membership independently
of any manifest, tag or global release. Every `included` entry is a voluntary
scope decision even while registry technical status is `draft`. A release is an
optional evidence and stabilization snapshot, not a prerequisite for current
scope, inclusion or registry evolution. Membership itself grants no commercial
rights: actual grants come only from an applicable public licence or a separate
agreement. A partner agreement may refer to the evolving registry without
requiring an ecosystem release.

This separation applies to every partnership type. First Partner is one
application of the common framework; neither that agreement nor any other
partner category defines a separate registry or an implicit release requirement.
Contract-specific grants remain outside ecosystem release admission.

Legal provenance, accessibility and technical maturity are separate dimensions.
The stricter evidence gate below applies only to optional release candidates.
It must not be reused to refuse ordinary `declared` current inclusion. Schema-2
candidates require reviewed legal provenance; legacy schema-1 historical
manifests remain readable byte-for-byte and are not newly approved by migration.

## Authority

LeMouf is the final release approver. Approval is manual and separate from merging
a pull request. A successful validation, merged change, candidate manifest or
existing package publication does not authorize an ecosystem release.

The approval subject is an exact manifest SHA-256, its ecosystem version and the
commit containing that manifest. Changing any of these invalidates the approval.
Approval is not transferable to another version, rerun with different inputs or
replacement artifact. The publication workflow must verify this binding again
immediately before writing a tag or release.

## Admission requirements

Before requesting approval:

- Select an explicit ecosystem version and complete candidate manifest.
- Pass `validate` on the exact main commit containing the candidate.
- Preserve all recorded historical manifest and digest blobs.
- Match each snapshot to its declared source registry commit.
- Provide exact component source and artifact references, with no unresolved
  required evidence or ownership questions.
- Verify artifact integrity and applicable provenance evidence. Metadata exposing
  a digest or attestation URL is not itself cryptographic verification.
- Confirm inclusion scope and applicable licence notices. Registry membership
  does not grant a commercial or partner licence.

For Core, the recorded publication metadata and successful component publication
are evidence inputs. They do not waive missing ownership evidence or provenance
signature verification.

## Immutable manifest, separate publication record

Manifest bytes never change to reflect approval or publication. A candidate stays
a candidate document after publication; its publication is a separate observed
fact. The eventual publication record must bind the manifest digest, manifest
commit, ecosystem version, authenticated approver, approval event, workflow run
and resulting tag. A self-authored `approvedBy` field is not sufficient evidence.

This distinction prevents a circular manifest hash and avoids rewriting a draft
or candidate directory already committed to history. Prepare drafts outside the
permanent version history until their content is ready; existing recorded versions
cannot be reused or promoted by editing them. Preparation writes temporary bundles;
recording requires a complete candidate and its exact digest. This local recording
is not release approval. New permanent drafts are refused by Git validation.

Publication must refuse an existing conflicting tag or release. Retrying a failed
run must first reconcile existing effects and must never silently replace them.

## Activation boundary

Official publication is not enabled. The current validator continues to refuse
the `released` manifest status. The authenticated approval binding,
a protected publishing workflow and publication reconciliation must be
implemented and tested before the first official release.

Planned GitHub environment: `ecosystem-release`, with LeMouf as required reviewer,
administrative bypass disabled and deployment restricted to main. This is a planned
configuration, not evidence that the environment exists. Sole-maintainer approval
requires allowing the initiating maintainer to review the deployment; it remains a
distinct manual action, not an independent second-person review.

No npm credentials are needed: this repository publishes references, not packages.
Do not enable a workflow or create official tags until its permissions, protected
environment and tag rules have been reviewed together.
