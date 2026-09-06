# KONITIF ecosystem registry

This repository owns ecosystem membership declarations, not component code or
the website. Repository spelling is `LeMouf/kontif`; the ecosystem is KONITIF.

Starting point: a Core-only **draft**, a strict offline registry validator and
tests. This is not an exhaustive inventory or an official ecosystem release.
Other components, release manifests and website projection remain pending.
The `validate` CI job runs these offline checks on pull requests and main, using
cached Node 24.20.0 and the checkout revision already used by Core. It installs
no npm dependency or runtime and fails if that cached runtime is unavailable.
GitHub still obtains the runner and checkout action; this is not an air-gapped CI.
Branch protection must separately require this check; a workflow does not protect
main by itself. No publication step is present.

With an already installed Node.js 22 or newer, no dependency installation:

```sh
node --test tests/*.test.mjs
node scripts/validate-registry.mjs ecosystem/registry.json
```

Validation reports structural consistency and a deterministic content digest.
It does not verify remote availability, signatures, governance approval or
publication. `--release` deliberately fails: release admission is not implemented.
No network operation or file write is performed by the validator.

See [the registry contract](ecosystem/README.md) and [baseline](BASELINE.md).
Source-available under PolyForm Noncommercial 1.0.0; not OSI open source.
Public access does not grant a separate commercial or partner licence.
