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
node scripts/validate-manifests.mjs ecosystem/releases
```

Preparation reads the registry from an existing ancestor commit, not the mutable
working tree. It creates a draft only. No tag, commit, network request or publication
is performed. A candidate requires complete declared references and no unknowns;
it still does not mean approved, authentic or released. `released` is refused.

Hash: SHA-256 of compact UTF-8 canonical JSON, sorted envelope keys and the registry's
versioned encoding, no trailing newline. The detached digest has one trailing LF.
The manifest references an earlier input commit, not its own commit or hash, avoiding
circular references. Expected tag convention: `ecosystem-vVERSION`; no tag is created.

Version directories are reserved exclusively. Existing versions cannot be rewritten
by preparation; a partial bundle after interruption is explicitly rejected, not
silently repaired. Review any partial write before manual recovery.

History must be a single increasing version chain with predecessor digests. Compare
against a trusted baseline directory to reject deletion or rewriting of earlier
manifests. Without a trusted baseline, a consistent rewritten history cannot be
detected by its self-declared hashes alone. Git protections and approval remain
necessary. Local validation does not prove the source commit matches a manually
authored snapshot, remote tag existence, signatures or ownership.

Current CI validates stored bundles and tests adversarial history changes. Enforcing
comparison against the PR base and verifying every input commit is a subsequent
Git admission step. No official publication workflow is enabled.
