# Reference manifest history

No ecosystem version or official release has been selected yet.
Each future `VERSION/` directory contains `manifest.json` and `manifest.sha256`.
It embeds a snapshot of registry references and metadata, never package sources
or artifact bytes. Components retain their independent versions and authorities.

The closed schema-1 envelope is enforced by `scripts/releases.mjs`: ecosystem,
version, draft/candidate status, explicit UTC timestamp, full registry input commit,
expected tag, predecessor digest and registry snapshot. The snapshot uses registry
schema 1. A standalone JSON Schema for the envelope remains to be extracted.

Prepare only after choosing an explicit version and timestamp:

```sh
node scripts/prepare-manifest.mjs VERSION UTC_DATE FULL_REGISTRY_COMMIT
```

Preparation reads the registry from an existing ancestor commit, not the mutable
working tree. It creates a draft in a fresh temporary directory and reports that
directory and its digest. Repeating preparation does not reserve a permanent
version or overwrite prior output. No tag, commit, network request or publication
is performed. A candidate requires complete declared references and no unknowns;
it still does not mean approved, authentic or released. `released` is refused.

To stage a complete candidate and then explicitly record the reviewed bytes:

```sh
node scripts/prepare-manifest.mjs VERSION UTC_DATE FULL_REGISTRY_COMMIT candidate
node scripts/record-candidate.mjs STAGED_DIRECTORY EXPECTED_SHA256
node scripts/validate-manifests.mjs ecosystem/releases
```

Recording rechecks the exact digest, canonical bytes, committed source snapshot
and current history. Only candidates can be recorded; drafts are refused. A
stale predecessor or reused version is rejected. Recording writes local files
for review through a PR; it neither commits them nor approves publication.
Keep a staged directory until review is complete; it is temporary and may be
removed by operating-system cleanup. Preparation prints its exact location.

Hash: SHA-256 of compact UTF-8 canonical JSON, sorted envelope keys and the registry's
versioned encoding, no trailing newline. The detached digest has one trailing LF.
The manifest references an earlier input commit, not its own commit or hash, avoiding
circular references. Expected tag convention: `ecosystem-vVERSION`; no tag is created.

Version directories are reserved exclusively. Existing versions cannot be rewritten
by recording; a partial bundle after interruption is explicitly rejected, not
silently repaired. Review any partial write before manual recovery.

History must be a single increasing version chain with predecessor digests. Compare
against a trusted baseline directory to reject deletion or rewriting of earlier
manifests. Without a trusted baseline, a consistent rewritten history cannot be
detected by its self-declared hashes alone. Git protections and approval remain
necessary. Local validation does not prove the source commit matches a manually
authored snapshot, remote tag existence, signatures or ownership.

CI compares committed bundles against the PR base (or the previous main commit
for a push). Existing blobs must remain identical; every snapshot must match the
registry at its declared ancestor commit. New permanent manifests must be
candidates. Historical drafts, if any, remain
readable and immutable rather than being silently migrated. Full Git history is fetched by checkout;
validation itself does not access the network. A missing baseline fails closed.
Manual workflow dispatch compares HEAD with itself and checks source consistency,
not changes since a prior revision. For an explicit local comparison:

```sh
node scripts/check-manifest-history.mjs BASE_SHA HEAD_SHA
```

Protect the `validate` check and review changes to validation code and workflows:
repository-owned CI is not tamper-proof against a change that disables its own
checks. No official publication workflow is enabled.
